import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileText, Calculator, PenLine, Download, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { useAuth } from "@/hooks/useAuth";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/i18n";
import { tr } from "@/lib/phrases";
import { STATEMENT_MAP, PLAQUETTE, matches, unmapped, type PlaquetteDoc } from "@/lib/plaquette";
import { exportPlaquettePdf, type PlaquettePdfSection } from "@/lib/plaquettePdfExport";
import type { BalLine } from "@/lib/syscohada";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n) || 0) + " XOF";
const th = "text-start font-mono text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border";
const td = "px-3 py-2 text-[12px] border-b border-border/50";

export interface BalRow extends BalLine { label: string }
type AnnexRow = { id: string; document_code: string; item_type: string; label: string; description: string | null; amount: number | null; start_date: string | null; end_date: string | null; sort_order: number };
type DraftAnnex = Omit<AnnexRow, "id" | "document_code" | "sort_order">;
const input = "h-8 rounded border border-border bg-surface-2 px-2 text-[12px] text-foreground";

export function MappingView({ rows }: { rows: BalRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const orphans = unmapped(rows.map((r) => r.code));
  return (
    <>
      {orphans.length > 0
        ? <p className="text-[12px] text-destructive mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{orphans.length} {tr("compte(s) mouvementé(s) repris par aucune ligne")} : {orphans.join(", ")}</p>
        : <p className="text-[12px] text-primary mb-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />{tr("Tous les comptes mouvementés sont repris dans une ligne des états.")}</p>}
      <GhCard title={tr("Mappage des comptes SYSCOHADA vers les lignes des états")} badge={`${STATEMENT_MAP.length} lignes`} noPadding>
        <table className="w-full"><thead><tr><th className={th}>{tr("État")}</th><th className={th}>{tr("Réf.")}</th><th className={th}>{tr("Poste")}</th><th className={th}>{tr("Comptes repris")}</th><th className={th}>{tr("Comptes mouvementés")}</th></tr></thead>
          <tbody>{STATEMENT_MAP.map((m) => {
            const hit = rows.filter((r) => matches(r.code, m));
            const key = m.statement + m.ref;
            return (<Fragment key={key}>
              <tr className="cursor-pointer hover:bg-surface-2/40" onClick={() => setOpen(open === key ? null : key)}>
                <td className={td}>{m.statement}</td><td className={`${td} font-mono`}>{m.ref}</td><td className={td}>{tr(m.label)}</td>
                <td className={`${td} font-mono text-[11px]`}>{m.prefixes.join(", ")}{m.exclude ? ` (${tr("sauf")} ${m.exclude.join(", ")})` : ""}{m.amort ? ` · ${tr("amort./dépr.")} ${m.amort.join(", ")}` : ""}</td>
                <td className={`${td} font-mono`}>{hit.length}</td></tr>
              {open === key && hit.map((r) => (
                <tr key={key + r.code} className="bg-surface-2/30"><td className={td} /><td className={`${td} font-mono`}>{r.code}</td><td className={td} colSpan={2}>{r.label}</td><td className={`${td} font-mono whitespace-nowrap`}>{fmt(r.solde)}</td></tr>))}
            </Fragment>);
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

function useAnnexes() {
  return useQuery({
    queryKey: ["accounting_annex_data"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounting_annex_data").select("id,document_code,item_type,label,description,amount,start_date,end_date,sort_order").order("document_code").order("sort_order");
      if (error) throw error;
      return data as AnnexRow[];
    },
  });
}

function useAutomaticAnnexRows(doc: PlaquetteDoc) {
  const { data: org } = useOrgSettings();
  const shareholders = useQuery({ queryKey: ["shareholders", "annex"], queryFn: async () => { const { data, error } = await supabase.from("shareholders").select("name,kind,shares,nominal,paid_amount,is_related_party").order("name"); if (error) throw error; return data; } });
  const employees = useQuery({ queryKey: ["hr_employees", "annex"], queryFn: async () => { const { data, error } = await supabase.from("hr_employees").select("sexe,salaire_base,is_active").eq("is_active", true); if (error) throw error; return data; } });
  const payroll = useQuery({ queryKey: ["hr_payroll_runs", "annex"], queryFn: async () => { const { data, error } = await supabase.from("hr_payroll_runs").select("annee,mois,nb_employes,total_brut,total_charges,total_masse,total_net,status").order("annee").order("mois"); if (error) throw error; return data; } });
  return useMemo(() => {
    if (doc.source === "organisation" && org) return [
      { label: tr("Dénomination"), value: org.company_name }, { label: tr("Forme juridique"), value: org.legal_form ?? "—" },
      { label: "NINEA", value: org.ninea ?? "—" }, { label: "RCCM", value: org.rccm ?? "—" },
      { label: tr("Adresse"), value: [org.address, org.city, org.country].filter(Boolean).join(", ") || "—" },
      { label: tr("Activité"), value: org.legal_mentions ?? "—" },
    ];
    if (doc.source === "governance") return (shareholders.data ?? []).map((s) => ({ label: s.name, value: `${s.kind} · ${s.shares} parts · ${fmt(Number(s.paid_amount))}${s.is_related_party ? ` · ${tr("Partie liée")}` : ""}` }));
    if (doc.source === "workforce") {
      const staff = employees.data ?? [];
      const runs = payroll.data ?? [];
      return [
        { label: tr("Effectif actif"), value: String(staff.length) },
        { label: tr("Femmes"), value: String(staff.filter((e) => e.sexe?.toLowerCase().startsWith("f")).length) },
        { label: tr("Hommes"), value: String(staff.filter((e) => e.sexe?.toLowerCase().startsWith("m")).length) },
        { label: tr("Masse salariale"), value: fmt(runs.reduce((sum, r) => sum + Number(r.total_masse), 0)) },
        { label: tr("Charges sociales"), value: fmt(runs.reduce((sum, r) => sum + Number(r.total_charges), 0)) },
      ];
    }
    return [];
  }, [doc.source, org, shareholders.data, employees.data, payroll.data]);
}

function AnnexEditor({ doc, savedRows }: { doc: PlaquetteDoc; savedRows: AnnexRow[] }) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const automatic = useAutomaticAnnexRows(doc);
  const [draft, setDraft] = useState<DraftAnnex>({ item_type: "information", label: "", description: "", amount: null, start_date: null, end_date: null });
  const save = useMutation({
    mutationFn: async () => {
      if (!draft.label.trim()) throw new Error(tr("Le libellé est obligatoire."));
      const { error } = await supabase.from("accounting_annex_data").insert({ ...draft, label: draft.label.trim(), document_code: doc.code, sort_order: savedRows.length });
      if (error) throw error;
    },
    onSuccess: () => { setDraft({ item_type: "information", label: "", description: "", amount: null, start_date: null, end_date: null }); qc.invalidateQueries({ queryKey: ["accounting_annex_data"] }); toast.success(tr("Information enregistrée")); },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("accounting_annex_data").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounting_annex_data"] }),
    onError: (error: Error) => toast.error(error.message),
  });
  return <GhCard title={`${doc.code} — ${tr(doc.title)}`} badge={`${automatic.length + savedRows.length} ${tr("rubriques")}`}>
    {automatic.length > 0 && <div className="mb-4"><p className="text-[11px] uppercase text-muted-foreground mb-2">{tr("Données reprises automatiquement")}</p>
      <div className="grid sm:grid-cols-2 gap-2">{automatic.map((row) => <div key={row.label} className="border-b border-border/50 pb-2"><span className="block text-[11px] text-muted-foreground">{row.label}</span><span className="text-[12px]">{row.value}</span></div>)}</div></div>}
    {savedRows.length > 0 && <table className="w-full mb-4"><thead><tr><th className={th}>{tr("Rubrique")}</th><th className={th}>{tr("Description")}</th><th className={th}>{tr("Montant")}</th>{isAdmin && <th className={th} />}</tr></thead><tbody>
      {savedRows.map((row) => <tr key={row.id}><td className={td}>{row.label}</td><td className={td}>{row.description || "—"}</td><td className={`${td} font-mono`}>{row.amount === null ? "—" : fmt(row.amount)}</td>{isAdmin && <td className={td}><button aria-label={tr("Supprimer")} className="text-destructive" onClick={() => remove.mutate(row.id)}><Trash2 size={13} /></button></td>}</tr>)}
    </tbody></table>}
    {automatic.length === 0 && savedRows.length === 0 && <p className="text-[12px] text-muted-foreground mb-3">{tr("Aucune information enregistrée pour ce document.")}</p>}
    {isAdmin && <div className="border-t border-border pt-3 grid md:grid-cols-[1fr_1.5fr_150px_auto] gap-2 items-end">
      <label className="text-[11px] text-muted-foreground">{tr("Rubrique")}<input className={`${input} mt-1 w-full`} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} /></label>
      <label className="text-[11px] text-muted-foreground">{tr("Description")}<input className={`${input} mt-1 w-full`} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
      <label className="text-[11px] text-muted-foreground">{tr("Montant XOF")}<input type="number" className={`${input} mt-1 w-full`} value={draft.amount ?? ""} onChange={(e) => setDraft({ ...draft, amount: e.target.value === "" ? null : Number(e.target.value) })} /></label>
      <GhButton onClick={() => save.mutate()} disabled={save.isPending}><Save size={13} />{tr("Enregistrer")}</GhButton>
    </div>}
  </GhCard>;
}

export function PlaquetteView({ rows, onOpenState }: { rows: BalRow[]; onOpenState: (v: "bilan" | "resultat" | "flux") => void }) {
  const { locale } = useTranslation();
  const { data: org } = useOrgSettings();
  const { data: annexes = [] } = useAnnexes();
  const [sel, setSel] = useState<string>("Note03A");
  const doc = PLAQUETTE.find((d) => d.file === sel) ?? PLAQUETTE[0];
  const counts = useMemo(() => ({ etat: PLAQUETTE.filter((d) => d.kind === "etat").length, auto: PLAQUETTE.filter((d) => d.kind === "auto").length, manuel: PLAQUETTE.filter((d) => d.kind === "manuel").length }), []);
  const icon = (d: PlaquetteDoc) => d.kind === "etat" ? <FileText className="w-3.5 h-3.5 text-primary" /> : d.kind === "auto" ? <Calculator className="w-3.5 h-3.5 text-primary" /> : <PenLine className="w-3.5 h-3.5 text-muted-foreground" />;
  const download = async () => {
    const [shareholdersResult, employeesResult, payrollResult] = await Promise.all([
      supabase.from("shareholders").select("name,kind,shares,paid_amount,is_related_party").order("name"),
      supabase.from("hr_employees").select("sexe,is_active").eq("is_active", true),
      supabase.from("hr_payroll_runs").select("total_charges,total_masse"),
    ]);
    const shareholders = shareholdersResult.data ?? [];
    const employees = employeesResult.data ?? [];
    const payroll = payrollResult.data ?? [];
    const organisationRows = [
      { label: tr("Dénomination"), value: org?.company_name ?? "—" }, { label: tr("Forme juridique"), value: org?.legal_form ?? "—" },
      { label: "NINEA", value: org?.ninea ?? "—" }, { label: "RCCM", value: org?.rccm ?? "—" },
      { label: tr("Adresse"), value: [org?.address, org?.city, org?.country].filter(Boolean).join(", ") || "—" },
    ];
    const governanceRows = shareholders.map((row) => ({ label: row.name, value: `${row.kind} · ${row.shares} ${tr("parts")} · ${fmt(Number(row.paid_amount))}${row.is_related_party ? ` · ${tr("Partie liée")}` : ""}` }));
    const workforceRows = [
      { label: tr("Effectif actif"), value: String(employees.length) },
      { label: tr("Femmes"), value: String(employees.filter((row) => row.sexe?.toLowerCase().startsWith("f")).length) },
      { label: tr("Hommes"), value: String(employees.filter((row) => row.sexe?.toLowerCase().startsWith("m")).length) },
      { label: tr("Masse salariale"), value: fmt(payroll.reduce((sum, row) => sum + Number(row.total_masse), 0)) },
      { label: tr("Charges sociales"), value: fmt(payroll.reduce((sum, row) => sum + Number(row.total_charges), 0)) },
    ];
    const sections: PlaquettePdfSection[] = PLAQUETTE.map((item) => {
      const financial = item.prefixes ? rows.filter((row) => item.prefixes?.some((prefix) => row.code.startsWith(prefix))).map((row) => ({ label: `${row.code} — ${row.label}`, value: fmt(row.solde) })) : [];
      const manual = annexes.filter((row) => row.document_code === item.code).map((row) => ({ label: row.label, value: [row.description, row.amount === null ? null : fmt(row.amount)].filter(Boolean).join(" · ") || "—" }));
      const derived = item.view === "garde" || item.source === "organisation" ? organisationRows
        : item.source === "governance" ? governanceRows
        : item.source === "workforce" ? workforceRows
        : item.kind === "etat" ? rows.map((row) => ({ label: `${row.code} — ${row.label}`, value: fmt(row.solde) })) : [];
      return { code: item.code, title: tr(item.title), rows: financial.length > 0 ? financial : manual.length > 0 ? manual : derived };
    });
    try { await exportPlaquettePdf(sections, org?.company_name ?? tr("Organisation"), locale); toast.success(tr("Plaquette PDF téléchargée")); }
    catch (error) { toast.error(error instanceof Error ? error.message : tr("Erreur pendant l'export PDF")); }
  };
  return (
    <div>
      <div className="flex justify-end mb-3"><GhButton onClick={download}><Download size={13} />{tr("Télécharger la plaquette PDF")}</GhButton></div>
      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
      <GhCard title={tr("Plaquette SYSCOHADA")} badge={`${PLAQUETTE.length} documents`} noPadding>
        <p className="px-3 py-2 text-[11px] text-muted-foreground">{counts.etat} {tr("états")} · {counts.auto} {tr("notes calculées")} · {counts.manuel} {tr("annexes structurées")}</p>
        <div className="max-h-[640px] overflow-y-auto">{PLAQUETTE.map((d) => (
          <button key={d.file} onClick={() => setSel(d.file)} className={`w-full text-start px-3 py-1.5 text-[12px] flex items-center gap-2 border-b border-border/40 ${sel === d.file ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:bg-surface-2/50"}`}>
            {icon(d)}<span className="font-mono w-20 shrink-0">{d.code}</span><span className="truncate">{tr(d.title)}</span></button>))}</div>
      </GhCard>
      <div>
        {doc.kind === "auto" && <NoteTable doc={doc} rows={rows} />}
        {doc.kind === "etat" && <GhCard title={`${doc.code} — ${doc.title}`}>
          <p className="text-[12px] text-muted-foreground mb-3">{tr("Cet état est calculé automatiquement à partir des écritures validées.")}</p>
          {doc.view && doc.view !== "garde" && <GhButton onClick={() => onOpenState(doc.view === "actif" || doc.view === "passif" ? "bilan" : doc.view as "bilan" | "resultat" | "flux")}>{tr("Afficher l'état")}</GhButton>}
          {doc.view === "garde" && <p className="text-[12px]">{tr("Dénomination, exercice et identifiants sont repris des paramètres de l'organisation.")}</p>}
        </GhCard>}
        {doc.kind === "manuel" && <AnnexEditor doc={doc} savedRows={annexes.filter((row) => row.document_code === doc.code)} />}
      </div>
      </div>
    </div>
  );
}
