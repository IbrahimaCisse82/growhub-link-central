import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Calculator, PenLine } from "lucide-react";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { tr } from "@/lib/phrases";
import { STATEMENT_MAP, PLAQUETTE, matches, unmapped, type PlaquetteDoc } from "@/lib/plaquette";
import type { BalLine } from "@/lib/syscohada";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n) || 0) + " XOF";
const th = "text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border";
const td = "px-3 py-2 text-[12px] border-b border-border/50";

export interface BalRow extends BalLine { label: string }

export function MappingView({ rows }: { rows: BalRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const orphans = unmapped(rows.map((r) => r.code));
  return (
    <>
      {orphans.length > 0
        ? <p className="text-[12px] text-destructive mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{orphans.length} compte(s) mouvementé(s) repris par aucune ligne : {orphans.join(", ")}</p>
        : <p className="text-[12px] text-primary mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />{tr("Tous les comptes mouvementés sont repris dans une ligne des états.")}</p>}
      <GhCard title={tr("Mappage des comptes SYSCOHADA vers les lignes des états")} badge={`${STATEMENT_MAP.length} lignes`} noPadding>
        <table className="w-full"><thead><tr><th className={th}>État</th><th className={th}>Réf.</th><th className={th}>{tr("Poste")}</th><th className={th}>{tr("Comptes repris")}</th><th className={th}>{tr("Comptes mouvementés")}</th></tr></thead>
          <tbody>{STATEMENT_MAP.map((m) => {
            const hit = rows.filter((r) => matches(r.code, m));
            const key = m.statement + m.ref;
            return (<>
              <tr key={key} className="cursor-pointer hover:bg-surface-2/40" onClick={() => setOpen(open === key ? null : key)}>
                <td className={td}>{m.statement}</td><td className={`${td} font-mono`}>{m.ref}</td><td className={td}>{m.label}</td>
                <td className={`${td} font-mono text-[11px]`}>{m.prefixes.join(", ")}{m.exclude ? ` (sauf ${m.exclude.join(", ")})` : ""}{m.amort ? ` · amort./dépr. ${m.amort.join(", ")}` : ""}</td>
                <td className={`${td} font-mono`}>{hit.length}</td></tr>
              {open === key && hit.map((r) => (
                <tr key={key + r.code} className="bg-surface-2/30"><td className={td} /><td className={`${td} font-mono`}>{r.code}</td><td className={td} colSpan={2}>{r.label}</td><td className={`${td} font-mono whitespace-nowrap`}>{fmt(r.solde)}</td></tr>))}
            </>);
          })}</tbody></table>
      </GhCard>
    </>
  );
}

function NoteTable({ doc, rows }: { doc: PlaquetteDoc; rows: BalRow[] }) {
  const hit = rows.filter((r) => doc.prefixes!.some((p) => r.code.startsWith(p)));
  const total = hit.reduce((s, r) => s + r.solde, 0);
  return (
    <GhCard title={`${doc.code} — ${doc.title}`} badge={`Comptes ${doc.prefixes!.join(", ")}`} noPadding>
      {hit.length === 0 ? <p className="p-4 text-[12px] text-muted-foreground">{tr("Aucun mouvement sur ces comptes pour l'exercice.")}</p> :
        <table className="w-full"><thead><tr><th className={th}>{tr("Compte")}</th><th className={th}>{tr("Libellé")}</th><th className={th}>{tr("Solde débiteur")}</th><th className={th}>{tr("Solde créditeur")}</th></tr></thead>
          <tbody>{hit.map((r) => (<tr key={r.code}><td className={`${td} font-mono`}>{r.code}</td><td className={td}>{r.label}</td>
            <td className={`${td} font-mono`}>{r.solde > 0 ? fmt(r.solde) : ""}</td><td className={`${td} font-mono`}>{r.solde < 0 ? fmt(-r.solde) : ""}</td></tr>))}
            <tr className="font-semibold"><td className={td} colSpan={2}>{tr("Solde net")}</td><td className={`${td} font-mono`} colSpan={2}>{fmt(total)}</td></tr></tbody></table>}
    </GhCard>
  );
}

export function PlaquetteView({ rows, onOpenState }: { rows: BalRow[]; onOpenState: (v: "bilan" | "resultat" | "flux") => void }) {
  const [sel, setSel] = useState<string>("Note03A");
  const doc = PLAQUETTE.find((d) => d.file === sel)!;
  const counts = useMemo(() => ({ etat: PLAQUETTE.filter((d) => d.kind === "etat").length, auto: PLAQUETTE.filter((d) => d.kind === "auto").length, manuel: PLAQUETTE.filter((d) => d.kind === "manuel").length }), []);
  const icon = (d: PlaquetteDoc) => d.kind === "etat" ? <FileText className="w-3.5 h-3.5 text-primary" /> : d.kind === "auto" ? <Calculator className="w-3.5 h-3.5 text-primary" /> : <PenLine className="w-3.5 h-3.5 text-muted-foreground" />;
  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-4">
      <GhCard title={tr("Plaquette SYSCOHADA")} badge={`${PLAQUETTE.length} documents`} noPadding>
        <p className="px-3 py-2 text-[11px] text-muted-foreground">{counts.etat} états · {counts.auto} notes calculées · {counts.manuel} à compléter</p>
        <div className="max-h-[640px] overflow-y-auto">{PLAQUETTE.map((d) => (
          <button key={d.file} onClick={() => setSel(d.file)} className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 border-b border-border/40 ${sel === d.file ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:bg-surface-2/50"}`}>
            {icon(d)}<span className="font-mono w-20 shrink-0">{d.code}</span><span className="truncate">{d.title}</span></button>))}</div>
      </GhCard>
      <div>
        {doc.kind === "auto" && <NoteTable doc={doc} rows={rows} />}
        {doc.kind === "etat" && <GhCard title={`${doc.code} — ${doc.title}`}>
          <p className="text-[12px] text-muted-foreground mb-3">{tr("Cet état est calculé automatiquement à partir des écritures validées.")}</p>
          {doc.view && doc.view !== "garde" && <GhButton onClick={() => onOpenState(doc.view === "actif" || doc.view === "passif" ? "bilan" : doc.view as "bilan" | "resultat" | "flux")}>{tr("Afficher l'état")}</GhButton>}
          {doc.view === "garde" && <p className="text-[12px]">{tr("Dénomination, exercice et identifiants sont repris des paramètres de l'organisation.")}</p>}
        </GhCard>}
        {doc.kind === "manuel" && <GhCard title={`${doc.code} — ${doc.title}`}>
          <p className="text-[12px] text-muted-foreground">{tr("Ce document contient des informations qui ne figurent pas dans les écritures comptables (renseignements, engagements, effectifs…). Il se complète à la main lors de la production de la liasse.")}</p>
        </GhCard>}
      </div>
    </div>
  );
}
