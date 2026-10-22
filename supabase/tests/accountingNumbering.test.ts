// @vitest-environment node
/**
 * Tests SQL de la numérotation des écritures (migration 20261022100000).
 *
 * Exécutés dans un vrai moteur Postgres en mémoire (PGlite). Le schéma comptable est
 * réduit aux colonnes utiles ; la fonction de garde acc_guard_entry est la copie de
 * celle en production ; la migration testée est chargée telle quelle depuis le dépôt.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  path.resolve(__dirname, "../migrations/20261022100000_number_entries_at_validation.sql"),
  "utf8",
);

const BASE_SCHEMA = `
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

CREATE TABLE public.accounting_journals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL);
CREATE TABLE public.accounting_fiscal_years (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), label text NOT NULL, status text NOT NULL DEFAULT 'open');
CREATE TABLE public.accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id uuid REFERENCES public.accounting_fiscal_years(id) ON DELETE SET NULL,
  journal_id uuid REFERENCES public.accounting_journals(id) ON DELETE SET NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  piece_ref text, label text NOT NULL DEFAULT 'test',
  status text NOT NULL DEFAULT 'brouillon',
  currency text NOT NULL DEFAULT 'XOF',
  total_debit numeric NOT NULL DEFAULT 0, total_credit numeric NOT NULL DEFAULT 0,
  validated_at timestamptz, validated_by uuid, updated_at timestamptz,
  piece_seq bigint
);
CREATE TABLE public.acc_piece_counters (
  journal_id uuid NOT NULL REFERENCES public.accounting_journals(id) ON DELETE CASCADE,
  fiscal_year_id uuid NOT NULL REFERENCES public.accounting_fiscal_years(id) ON DELETE CASCADE,
  last_seq bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (journal_id, fiscal_year_id)
);

-- Garde en production (copie de pg_get_functiondef du 22/10/2026).
CREATE OR REPLACE FUNCTION public.acc_guard_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'validee' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Écriture validée : retour en brouillon interdit (utilisez la contre-passation)';
    END IF;
    IF NEW.label IS DISTINCT FROM OLD.label OR NEW.entry_date IS DISTINCT FROM OLD.entry_date
       OR NEW.journal_id IS DISTINCT FROM OLD.journal_id OR NEW.piece_ref IS DISTINCT FROM OLD.piece_ref
       OR NEW.fiscal_year_id IS DISTINCT FROM OLD.fiscal_year_id OR NEW.currency IS DISTINCT FROM OLD.currency
       OR ROUND(COALESCE(NEW.total_debit,0),2) IS DISTINCT FROM ROUND(COALESCE(OLD.total_debit,0),2)
       OR ROUND(COALESCE(NEW.total_credit,0),2) IS DISTINCT FROM ROUND(COALESCE(OLD.total_credit,0),2) THEN
      RAISE EXCEPTION 'Écriture validée : modification interdite';
    END IF;
  END IF;
  IF NEW.status = 'validee' AND (TG_OP = 'INSERT' OR OLD.status <> 'validee') THEN
    IF ROUND(COALESCE(NEW.total_debit,0),2) <> ROUND(COALESCE(NEW.total_credit,0),2)
       OR COALESCE(NEW.total_debit,0) = 0 THEN
      RAISE EXCEPTION 'Écriture déséquilibrée : débit % <> crédit %', NEW.total_debit, NEW.total_credit;
    END IF;
    NEW.validated_at := now();
    NEW.validated_by := auth.uid();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $function$;
CREATE TRIGGER tg_acc_guard_entry BEFORE INSERT OR UPDATE ON public.accounting_entries
FOR EACH ROW EXECUTE FUNCTION public.acc_guard_entry();

-- Ancien mécanisme (avant migration) : numéro attribué à la création.
CREATE OR REPLACE FUNCTION public.acc_assign_piece_seq()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.piece_seq IS NULL AND NEW.journal_id IS NOT NULL AND NEW.fiscal_year_id IS NOT NULL THEN
    INSERT INTO public.acc_piece_counters (journal_id, fiscal_year_id, last_seq)
    VALUES (NEW.journal_id, NEW.fiscal_year_id, 1)
    ON CONFLICT (journal_id, fiscal_year_id)
    DO UPDATE SET last_seq = public.acc_piece_counters.last_seq + 1
    RETURNING last_seq INTO NEW.piece_seq;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_acc_piece_seq BEFORE INSERT ON public.accounting_entries
FOR EACH ROW EXECUTE FUNCTION public.acc_assign_piece_seq();

INSERT INTO public.accounting_journals (id, code) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'VT'), ('00000000-0000-0000-0000-0000000000a2', 'AC');
INSERT INTO public.accounting_fiscal_years (id, label) VALUES
  ('00000000-0000-0000-0000-0000000000f1', '2026'), ('00000000-0000-0000-0000-0000000000f2', '2027');
`;

const VT = "00000000-0000-0000-0000-0000000000a1";
const AC = "00000000-0000-0000-0000-0000000000a2";
const FY26 = "00000000-0000-0000-0000-0000000000f1";
const FY27 = "00000000-0000-0000-0000-0000000000f2";

let db: PGlite;

async function draft(journal = VT, fy = FY26, amount = 1000): Promise<string> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO accounting_entries (journal_id, fiscal_year_id, total_debit, total_credit)
     VALUES ($1, $2, $3, $3) RETURNING id`, [journal, fy, amount]);
  return r.rows[0].id;
}
async function validate(id: string): Promise<number> {
  const r = await db.query<{ piece_seq: string }>(
    `UPDATE accounting_entries SET status = 'validee' WHERE id = $1 RETURNING piece_seq`, [id]);
  return Number(r.rows[0].piece_seq);
}
async function seqOf(id: string): Promise<number | null> {
  const r = await db.query<{ piece_seq: string | null }>(`SELECT piece_seq FROM accounting_entries WHERE id = $1`, [id]);
  return r.rows[0].piece_seq === null ? null : Number(r.rows[0].piece_seq);
}

describe("numérotation des écritures à la validation", () => {
  // Une seule base pour le bloc (démarrer PGlite coûte ~2 s) ; remise à zéro entre tests.
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(BASE_SCHEMA);
    await db.exec(MIGRATION);
  }, 60_000);
  beforeEach(async () => {
    await db.exec(`ALTER TABLE accounting_entries ENABLE TRIGGER trg_acc_piece_seq;
      TRUNCATE accounting_entries, acc_piece_counters;`);
  });
  afterAll(async () => { await db.close(); });

  it("ne numérote pas les brouillons", async () => {
    const id = await draft();
    expect(await seqOf(id)).toBeNull();
  });

  it("numérote 1, 2, 3 par journal et par exercice", async () => {
    expect(await validate(await draft(VT))).toBe(1);
    expect(await validate(await draft(VT))).toBe(2);
    expect(await validate(await draft(AC))).toBe(1);
    expect(await validate(await draft(VT, FY27))).toBe(1);
    expect(await validate(await draft(VT))).toBe(3);
  });

  it("ne laisse aucun trou quand un brouillon est supprimé", async () => {
    const a = await draft(); const b = await draft(); const c = await draft();
    await db.query(`DELETE FROM accounting_entries WHERE id = $1`, [b]);
    expect(await validate(a)).toBe(1);
    expect(await validate(c)).toBe(2);
  });

  it("suit l'ordre de validation, pas l'ordre de création", async () => {
    const first = await draft(); const second = await draft();
    expect(await validate(second)).toBe(1);
    expect(await validate(first)).toBe(2);
  });

  it("ne consomme pas de numéro quand la validation échoue", async () => {
    const r = await db.query<{ id: string }>(
      `INSERT INTO accounting_entries (journal_id, fiscal_year_id, total_debit, total_credit)
       VALUES ($1, $2, 1000, 900) RETURNING id`, [VT, FY26]);
    await expect(validate(r.rows[0].id)).rejects.toThrow(/déséquilibrée/);
    expect(await validate(await draft())).toBe(1);
  });

  it("valide directement à la création (à-nouveaux) avec un numéro", async () => {
    const r = await db.query<{ piece_seq: string }>(
      `INSERT INTO accounting_entries (journal_id, fiscal_year_id, status, total_debit, total_credit)
       VALUES ($1, $2, 'validee', 500, 500) RETURNING piece_seq`, [VT, FY26]);
    expect(Number(r.rows[0].piece_seq)).toBe(1);
  });

  it("ignore un numéro fourni par le client", async () => {
    const r = await db.query<{ id: string; piece_seq: string | null }>(
      `INSERT INTO accounting_entries (journal_id, fiscal_year_id, total_debit, total_credit, piece_seq)
       VALUES ($1, $2, 100, 100, 99) RETURNING id, piece_seq`, [VT, FY26]);
    expect(r.rows[0].piece_seq).toBeNull();
    const v = await db.query<{ piece_seq: string }>(
      `UPDATE accounting_entries SET status = 'validee', piece_seq = 42 WHERE id = $1 RETURNING piece_seq`, [r.rows[0].id]);
    expect(Number(v.rows[0].piece_seq)).toBe(1);
  });

  it("fige le numéro d'une écriture validée", async () => {
    const id = await draft(); await validate(id);
    await expect(db.query(`UPDATE accounting_entries SET piece_seq = 7 WHERE id = $1`, [id]))
      .rejects.toThrow(/non modifiable/);
    await expect(db.query(`UPDATE accounting_entries SET piece_seq = NULL WHERE id = $1`, [id]))
      .rejects.toThrow(/non modifiable/);
  });

  it("refuse la validation sans journal", async () => {
    const r = await db.query<{ id: string }>(
      `INSERT INTO accounting_entries (fiscal_year_id, total_debit, total_credit) VALUES ($1, 10, 10) RETURNING id`, [FY26]);
    await expect(validate(r.rows[0].id)).rejects.toThrow(/journal et exercice obligatoires/);
  });

  it("refuse le doublon de numéro dans un journal", async () => {
    const a = await draft(); await validate(a);
    await db.query(`ALTER TABLE accounting_entries DISABLE TRIGGER trg_acc_piece_seq`);
    await expect(db.query(
      `INSERT INTO accounting_entries (journal_id, fiscal_year_id, status, total_debit, total_credit, piece_seq)
       VALUES ($1, $2, 'validee', 10, 10, 1)`, [VT, FY26])).rejects.toThrow(/duplicate key|unique/i);
  });

  it("interdit de supprimer un journal ou un exercice qui porte des écritures", async () => {
    await draft(VT, FY26);
    await expect(db.query(`DELETE FROM accounting_journals WHERE id = $1`, [VT])).rejects.toThrow(/foreign key/i);
    await expect(db.query(`DELETE FROM accounting_fiscal_years WHERE id = $1`, [FY26])).rejects.toThrow(/foreign key/i);
  });

  it("peut être rejouée sans erreur", async () => {
    await db.exec(MIGRATION);
    expect(await validate(await draft())).toBe(1);
  });
});

describe("reprise de l'existant par la migration", () => {
  it("retire les numéros provisoires des brouillons et recale les compteurs", { timeout: 60_000 }, async () => {
    db = new PGlite();
    await db.exec(BASE_SCHEMA);
    // Ancien mécanisme : 3 brouillons numérotés 1, 2, 3 ; on valide le 2.
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await db.query<{ id: string }>(
        `INSERT INTO accounting_entries (journal_id, fiscal_year_id, total_debit, total_credit) VALUES ($1, $2, 10, 10) RETURNING id`, [VT, FY26]);
      ids.push(r.rows[0].id);
    }
    await db.query(`UPDATE accounting_entries SET status = 'validee' WHERE id = $1`, [ids[1]]);

    await db.exec(MIGRATION);

    expect(await seqOf(ids[0])).toBeNull();
    expect(await seqOf(ids[1])).toBe(2);
    expect(await seqOf(ids[2])).toBeNull();
    const c = await db.query<{ last_seq: string }>(`SELECT last_seq FROM acc_piece_counters WHERE journal_id = $1`, [VT]);
    expect(Number(c.rows[0].last_seq)).toBe(2);
    expect(await validate(ids[0])).toBe(3);
    await db.close();
  });
});
