-- Semaine 3 — comptabilité : numéro d'écriture attribué à la validation, continu et sans trou.
--
-- Référence : Acte uniforme OHADA relatif au droit comptable et à l'information financière
-- (AUDCIF), art. 20 (livres tenus « sans blanc ni altération ») et art. 22 (comptabilité
-- informatisée : ordre chronologique, irréversibilité des traitements après validation).
--
-- Avant : piece_seq était attribué à la création du brouillon (BEFORE INSERT). Chaque
-- brouillon supprimé laissait un trou, et l'ordre des numéros ne suivait pas l'ordre
-- des validations.
--
-- Après :
--   * un brouillon n'a jamais de numéro ;
--   * le numéro est attribué au passage en « validee », par journal et par exercice,
--     sous verrou de ligne sur le compteur (les validations concurrentes d'un même
--     journal sont sérialisées ; une validation annulée annule aussi l'incrément) ;
--   * une fois attribué, le numéro ne peut plus changer ;
--   * une écriture ne peut être validée sans journal ni exercice ;
--   * un journal ou un exercice qui porte des écritures ne peut plus être supprimé.
--
-- Le trigger garde le nom trg_acc_piece_seq : les triggers BEFORE s'exécutent par ordre
-- alphabétique, il passe donc après tous les contrôles (équilibre, période, comptes).

CREATE OR REPLACE FUNCTION public.acc_assign_piece_seq()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Écriture déjà validée : le numéro est figé.
  IF TG_OP = 'UPDATE' AND OLD.status = 'validee' THEN
    IF NEW.piece_seq IS DISTINCT FROM OLD.piece_seq THEN
      RAISE EXCEPTION 'Écriture validée : numéro d''écriture non modifiable';
    END IF;
    RETURN NEW;
  END IF;

  -- Passage en « validee » : attribution du numéro suivant du journal pour l'exercice.
  IF NEW.status = 'validee' THEN
    IF NEW.journal_id IS NULL OR NEW.fiscal_year_id IS NULL THEN
      RAISE EXCEPTION 'Validation impossible : journal et exercice obligatoires';
    END IF;
    INSERT INTO public.acc_piece_counters (journal_id, fiscal_year_id, last_seq)
    VALUES (NEW.journal_id, NEW.fiscal_year_id, 1)
    ON CONFLICT (journal_id, fiscal_year_id)
    DO UPDATE SET last_seq = public.acc_piece_counters.last_seq + 1
    RETURNING last_seq INTO NEW.piece_seq;
    RETURN NEW;
  END IF;

  -- Brouillon (ou autre statut non validé) : jamais de numéro.
  NEW.piece_seq := NULL;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acc_assign_piece_seq() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_acc_piece_seq ON public.accounting_entries;
CREATE TRIGGER trg_acc_piece_seq
BEFORE INSERT OR UPDATE ON public.accounting_entries
FOR EACH ROW EXECUTE FUNCTION public.acc_assign_piece_seq();

-- Reprise de l'existant : les brouillons perdent leur numéro provisoire, les compteurs
-- repartent du dernier numéro validé. Les écritures validées ne sont pas modifiées.
-- (Les triggers BEFORE UPDATE de garde s'appliquent ; un brouillon reste modifiable.)
UPDATE public.accounting_entries SET piece_seq = NULL
WHERE status <> 'validee' AND piece_seq IS NOT NULL;

DELETE FROM public.acc_piece_counters c
WHERE NOT EXISTS (
  SELECT 1 FROM public.accounting_entries e
  WHERE e.journal_id = c.journal_id AND e.fiscal_year_id = c.fiscal_year_id
    AND e.status = 'validee' AND e.piece_seq IS NOT NULL
);
UPDATE public.acc_piece_counters c
SET last_seq = m.max_seq
FROM (
  SELECT journal_id, fiscal_year_id, max(piece_seq) AS max_seq
  FROM public.accounting_entries
  WHERE status = 'validee' AND piece_seq IS NOT NULL
  GROUP BY journal_id, fiscal_year_id
) m
WHERE m.journal_id = c.journal_id AND m.fiscal_year_id = c.fiscal_year_id;

-- Un numéro n'existe qu'une fois par journal et par exercice.
CREATE UNIQUE INDEX IF NOT EXISTS accounting_entries_piece_seq_uniq
  ON public.accounting_entries (journal_id, fiscal_year_id, piece_seq)
  WHERE piece_seq IS NOT NULL;

-- Un journal ou un exercice portant des écritures ne peut plus être supprimé
-- (avant : ON DELETE SET NULL rendait les écritures orphelines sans erreur).
ALTER TABLE public.accounting_entries DROP CONSTRAINT IF EXISTS accounting_entries_journal_id_fkey;
ALTER TABLE public.accounting_entries
  ADD CONSTRAINT accounting_entries_journal_id_fkey
  FOREIGN KEY (journal_id) REFERENCES public.accounting_journals(id) ON DELETE RESTRICT;

ALTER TABLE public.accounting_entries DROP CONSTRAINT IF EXISTS accounting_entries_fiscal_year_id_fkey;
ALTER TABLE public.accounting_entries
  ADD CONSTRAINT accounting_entries_fiscal_year_id_fkey
  FOREIGN KEY (fiscal_year_id) REFERENCES public.accounting_fiscal_years(id) ON DELETE RESTRICT;
