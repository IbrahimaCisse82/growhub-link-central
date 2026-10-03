import { tr } from "@/lib/phrases";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { useMemo, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, CheckCircle2, Lock, Search, AlertTriangle, RotateCcw, Pencil } from "lucide-react";
import AccountGuidePanel from "@/components/accounting/AccountGuide";
import LetteringSection from "@/components/accounting/LetteringSection";
import FixedAssetsSection from "@/components/accounting/FixedAssetsSection";
import SettlementsSection from "@/components/accounting/SettlementsSection";
import { ClosingSection, LoansSection, AccrualsSection, StocksSection, VatSection, ShareholdersSection, ReconciliationSection } from "@/components/accounting/ClosingOpsSections";
import SubledgerSection from "@/components/accounting/SubledgerSection";
import { MappingView, PlaquetteView } from "@/components/accounting/PlaquetteSection";
import { normalSide, bilanActif, bilanPassif, compteResultat, fluxTresorerie, type BalLine, type StatementLine } from "@/lib/syscohada";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Account = Database["public"]["Tables"]["accounting_accounts"]["Row"];
type Journal = Database["public"]["Tables"]["accounting_journals"]["Row"];
type Entry = Database["public"]["Tables"]["accounting_entries"]["Row"];
type Line = Database["public"]["Tables"]["accounting_entry_lines"]["Row"];
type FiscalYear = Database["public"]["Tables"]["accounting_fiscal_years"]["Row"];
type BalanceRow = Database["public"]["Views"]["accounting_balance"]["Row"];

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n) || 0) + " XOF";
const input = "bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-primary";
const th = "text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border";
const td = "px-3 py-2 text-[12px] border-b border-border/50";

export const ACCOUNTING_SECTIONS = [
  { key: "plan", label: "Plan comptable" },
  { key: "journaux", label: "Journaux" },
  { key: "ecritures", label: "Saisie d'écritures" },
  { key: "grand-livre", label: "Grand livre" },
  { key: "balance", label: "Balance" },
  { key: "lettrage", label: "Lettrage" },
  { key: "auxiliaires", label: "Auxiliaires clients & fournisseurs" },
  { key: "immobilisations", label: "Immobilisations" },
  { key: "reglements", label: "Trésorerie & règlements" },
  { key: "rapprochement", label: "Rapprochement bancaire" },
  { key: "emprunts", label: "Emprunts" },
  { key: "regularisations", label: "Régularisations & provisions" },
  { key: "stocks", label: "Stocks" },
  { key: "tva", label: "Déclaration de TVA" },
  { key: "actionnaires", label: "Actionnaires" },
  { key: "cloture", label: "Assistant de clôture" },
  { key: "etats", label: "États financiers" },
  { key: "exercices", label: "Exercices & clôture" },
] as const;

function useAccounts() {
  return useQuery({
    queryKey: ["acc-accounts"],
    queryFn: async () => {
      const all: Account[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("accounting_accounts").select("*").order("code").range(from, from + 999);
        if (error) throw error;
        all.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });
}
function useJournals() {
  return useQuery({ queryKey: ["acc-journals"], queryFn: async () => {
    const { data, error } = await supabase.from("accounting_journals").select("*").order("code");
    if (error) throw error; return data ?? [];
  } });
}
function useFiscalYears() {
  return useQuery({ queryKey: ["acc-fy"], queryFn: async () => {
    const { data, error } = await supabase.from("accounting_fiscal_years").select("*").order("start_date", { ascending: false });
    if (error) throw error; return data ?? [];
  } });
}
function useBalance(fyId: string | undefined) {
  return useQuery({ queryKey: ["acc-balance", fyId], enabled: !!fyId, queryFn: async () => {
    const { data, error } = await supabase.from("accounting_balance").select("*").eq("fiscal_year_id", fyId!).order("account_code");
    if (error) throw error; return (data ?? []) as BalanceRow[];
  } });
}

function FySelect({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const { data: fys = [] } = useFiscalYears();
  return (
    <select className={input} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      {fys.map((f) => <option key={f.id} value={f.id}>{f.label} {f.status === "closed" ? "(clos)" : ""}</option>)}
    </select>
  );
}
function useDefaultFy() {
  const { data: fys = [] } = useFiscalYears();
  const [fy, setFy] = useState<string>();
  return [fy ?? fys.find((f) => f.status === "open")?.id ?? fys[0]?.id, setFy] as const;
}

/* ---------------- Plan comptable ---------------- */
function PlanSection() {
  const { data = [], isLoading } = useAccounts();
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("");
  const [guide, setGuide] = useState<string | null>(null);
  const rows = useMemo(() => data.filter((a) =>
    (!cls || String(a.account_class) === cls) &&
    (!q || a.code.startsWith(q) || a.label.toLowerCase().includes(q.toLowerCase()))).slice(0, 400), [data, q, cls]);
  return (
    <GhCard title={tr("Plan comptable SYSCOHADA révisé")} badge={`${data.length} comptes`} noPadding
      action={<div className="flex gap-2">
        <div className="relative"><Search size={12} className="absolute left-2 top-2.5 text-muted-foreground" />
          <input className={`${input} pl-6`} placeholder={tr("Code ou libellé")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className={input} value={cls} onChange={(e) => setCls(e.target.value)}>
          <option value="">{tr("Toutes classes")}</option>
          {[1,2,3,4,5,6,7,8,9].map((c) => <option key={c} value={c}>Classe {c}</option>)}
        </select></div>}>
      {isLoading ? <p className="p-5 text-sm text-muted-foreground">{tr("Chargement…")}</p> : (
        <div className="max-h-[65vh] overflow-auto"><table className="w-full">
          <thead className="sticky top-0 bg-card"><tr><th className={th}>{tr("Code")}</th><th className={th}>{tr("Libellé")}</th><th className={th}>{tr("Classe")}</th><th className={th}>{tr("Nature")}</th></tr></thead>
          <tbody>{rows.map((a) => (
            <tr key={a.id} className="hover:bg-surface-2/50 cursor-pointer" onClick={() => setGuide(a.code)} title={tr("Voir le fonctionnement du compte")}>
              <td className={`${td} font-mono`} style={{ paddingLeft: 12 + (a.level - 1) * 12 }}>{a.code}</td>
              <td className={`${td} ${a.level <= 2 ? "font-semibold" : ""}`}>{a.label}</td>
              <td className={td}>{a.account_class}</td>
              <td className={`${td} text-muted-foreground`}>{a.nature}</td>
            </tr>))}</tbody>
        </table>
        <Dialog open={!!guide} onOpenChange={(o) => !o && setGuide(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
            <DialogHeader><DialogTitle>Fonctionnement du compte {guide}</DialogTitle></DialogHeader>
            {guide && <AccountGuidePanel code={guide} />}
          </DialogContent>
        </Dialog>{rows.length === 400 && <p className="p-3 text-[11px] text-muted-foreground">{tr("Affinez la recherche pour voir plus de comptes.")}</p>}</div>
      )}
    </GhCard>
  );
}

/* ---------------- Journaux ---------------- */
function JournalsSection() {
  const { data = [] } = useJournals();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({ code: "", label: "", journal_type: "od", counterpart_account: "" });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("accounting_journals").insert({ ...f, code: f.code.toUpperCase(), counterpart_account: f.counterpart_account || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Journal créé"); setF({ code: "", label: "", journal_type: "od", counterpart_account: "" }); qc.invalidateQueries({ queryKey: ["acc-journals"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <GhCard title={tr("Journaux comptables")} badge={String(data.length)} noPadding>
      {isAdmin && <div className="flex flex-wrap gap-2 p-3 border-b border-border">
        <input className={`${input} w-20`} placeholder={tr("Code")} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        <input className={`${input} flex-1`} placeholder={tr("Libellé")} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        <select className={input} value={f.journal_type} onChange={(e) => setF({ ...f, journal_type: e.target.value })}>
          {["achats","ventes","banque","caisse","paie","od"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <input className={`${input} w-32`} placeholder={tr("Compte contrepartie")} value={f.counterpart_account} onChange={(e) => setF({ ...f, counterpart_account: e.target.value })} />
        <GhButton onClick={() => f.code && f.label && add.mutate()}><Plus size={13} /> {tr("Ajouter")}</GhButton>
      </div>}
      <table className="w-full"><thead><tr><th className={th}>{tr("Code")}</th><th className={th}>{tr("Libellé")}</th><th className={th}>{tr("Type")}</th><th className={th}>{tr("Contrepartie")}</th></tr></thead>
        <tbody>{data.map((j) => <tr key={j.id}><td className={`${td} font-mono`}>{j.code}</td><td className={td}>{j.label}</td><td className={td}>{j.journal_type}</td><td className={`${td} font-mono`}>{j.counterpart_account ?? "—"}</td></tr>)}</tbody></table>
    </GhCard>
  );
}

/* ---------------- Écritures ---------------- */
interface DraftLine { account_code: string; label: string; debit: string; credit: string }

interface EntryInitial { id?: string; head: { journal_id: string; entry_date: string; piece_ref: string; label: string }; lines: DraftLine[] }

function EntryDialog({ open, onClose, fyId, initial }: { open: boolean; onClose: () => void; fyId?: string; initial?: EntryInitial }) {
  const { data: journals = [] } = useJournals();
  const { data: accounts = [] } = useAccounts();
  const qc = useQueryClient();
  const { user } = useAuth();
  const detail = useMemo(() => accounts.filter((a) => a.is_detail), [accounts]);
  const [head, setHead] = useState(initial?.head ?? { journal_id: "", entry_date: new Date().toISOString().slice(0, 10), piece_ref: "", label: "" });
  const [lines, setLines] = useState<DraftLine[]>(initial?.lines ?? [{ account_code: "", label: "", debit: "", credit: "" }, { account_code: "", label: "", debit: "", credit: "" }]);
  const [focus, setFocus] = useState(0);
  const journal = journals.find((j) => j.id === head.journal_id);
  const warnings = lines.flatMap((l, i) => {
    if (!l.account_code) return [];
    const w: string[] = [];
    const acc = accounts.find((a) => a.code === l.account_code);
    if (!acc) w.push(`Ligne ${i + 1} : compte ${l.account_code} absent du plan SYSCOHADA`);
    else if (!acc.is_detail) w.push(`Ligne ${i + 1} : ${l.account_code} est un compte de regroupement, utilisez un sous-compte`);
    if (journal?.allowed_prefixes?.length && !journal.allowed_prefixes.some((p) => l.account_code.startsWith(p)))
      w.push(`Ligne ${i + 1} : compte ${l.account_code} non autorisé dans le journal ${journal.code}`);
    const side = normalSide(l.account_code);
    if (side === "debit" && Number(l.credit) > 0 && /^[67]/.test(l.account_code)) w.push(`Ligne ${i + 1} : une charge (classe 6) au crédit est inhabituelle — s'agit-il d'une annulation ?`);
    if (side === "credit" && Number(l.debit) > 0 && /^7/.test(l.account_code)) w.push(`Ligne ${i + 1} : un produit (classe 7) au débit est inhabituel — s'agit-il d'une annulation ?`);
    if (Number(l.debit) > 0 && Number(l.credit) > 0) w.push(`Ligne ${i + 1} : une ligne ne peut être à la fois au débit et au crédit`);
    return w;
  });
  const tD = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const tC = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const blocking = warnings.some((w) => w.includes("absent") || w.includes("regroupement") || w.includes("non autorisé") || w.includes("à la fois"));
  const balanced = tD > 0 && Math.abs(tD - tC) < 0.01;
  const save = useMutation({
    mutationFn: async (validate: boolean) => {
      const valid = lines.filter((l) => l.account_code && (Number(l.debit) || Number(l.credit)));
      if (!valid.length) throw new Error("Ajoutez au moins une ligne");
      let entryId = initial?.id;
      if (entryId) {
        const { error } = await supabase.from("accounting_entries").update({
          journal_id: head.journal_id || null, entry_date: head.entry_date, piece_ref: head.piece_ref || null, label: head.label,
        }).eq("id", entryId);
        if (error) throw error;
        const { error: de } = await supabase.from("accounting_entry_lines").delete().eq("entry_id", entryId);
        if (de) throw de;
      } else {
        const { data: e, error } = await supabase.from("accounting_entries").insert({
          journal_id: head.journal_id || null, entry_date: head.entry_date, piece_ref: head.piece_ref || null,
          label: head.label, fiscal_year_id: fyId ?? null, created_by: user?.id ?? null,
        }).select("id").single();
        if (error) throw error;
        entryId = e.id;
      }
      const { error: le } = await supabase.from("accounting_entry_lines").insert(valid.map((l, i) => ({
        entry_id: entryId!, line_no: i + 1, account_code: l.account_code, label: l.label || null,
        debit: Number(l.debit) || 0, credit: Number(l.credit) || 0,
      })));
      if (le) throw le;
      if (validate) {
        const { error: ve } = await supabase.from("accounting_entries").update({ status: "validee", validated_at: new Date().toISOString(), validated_by: user?.id ?? null }).eq("id", entryId!);
        if (ve) throw ve;
      }
    },
    onSuccess: () => { toast.success("Écriture enregistrée"); qc.invalidateQueries({ queryKey: ["acc-entries"] }); qc.invalidateQueries({ queryKey: ["acc-lines"] }); qc.invalidateQueries({ queryKey: ["acc-balance"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const upd = (i: number, k: keyof DraftLine, v: string) => setLines(lines.map((l, j) => j === i ? { ...l, [k]: v } : l));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader><DialogTitle>{initial?.id ? tr("Modifier l'écriture") : initial ? tr("Écriture de correction") : tr("Nouvelle écriture")}</DialogTitle></DialogHeader>
        <datalist id="acc-codes">{detail.map((a) => <option key={a.id} value={a.code}>{a.label}</option>)}</datalist>
        <div className="grid grid-cols-4 gap-2">
          <select className={input} value={head.journal_id} onChange={(e) => setHead({ ...head, journal_id: e.target.value })}>
            <option value="">{tr("Journal…")}</option>{journals.map((j) => <option key={j.id} value={j.id}>{j.code} — {j.label}</option>)}
          </select>
          <input type="date" className={input} value={head.entry_date} onChange={(e) => setHead({ ...head, entry_date: e.target.value })} />
          <input className={input} placeholder={tr("N° pièce")} value={head.piece_ref} onChange={(e) => setHead({ ...head, piece_ref: e.target.value })} />
          <input className={input} placeholder={tr("Libellé de l'écriture")} value={head.label} onChange={(e) => setHead({ ...head, label: e.target.value })} />
        </div>
        <table className="w-full mt-2"><thead><tr><th className={th}>{tr("Compte")}</th><th className={th}>{tr("Libellé")}</th><th className={th}>{tr("Débit")}</th><th className={th}>{tr("Crédit")}</th><th className={th}></th></tr></thead>
          <tbody>{lines.map((l, i) => (
            <tr key={i}>
              <td className="p-1"><input list="acc-codes" className={`${input} w-full font-mono`} value={l.account_code} onFocus={() => setFocus(i)} onChange={(e) => { setFocus(i); upd(i, "account_code", e.target.value); }} />
                <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">{accounts.find((a) => a.code === l.account_code)?.label}</div></td>
              <td className="p-1"><input className={`${input} w-full`} value={l.label} onChange={(e) => upd(i, "label", e.target.value)} /></td>
              <td className="p-1"><input type="number" className={`${input} w-full`} value={l.debit} onChange={(e) => upd(i, "debit", e.target.value)} /></td>
              <td className="p-1"><input type="number" className={`${input} w-full`} value={l.credit} onChange={(e) => upd(i, "credit", e.target.value)} /></td>
              <td className="p-1"><button aria-label={tr("Supprimer la ligne")} onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button></td>
            </tr>))}
            <tr><td colSpan={2} className="p-2"><button onClick={() => setLines([...lines, { account_code: "", label: "", debit: "", credit: "" }])} className="text-[12px] text-primary flex items-center gap-1"><Plus size={12} /> {tr("Ligne")}</button></td>
              <td className="p-2 font-mono text-[12px]">{fmt(tD)}</td><td className="p-2 font-mono text-[12px]">{fmt(tC)}</td><td /></tr>
          </tbody></table>
        {warnings.length > 0 && <div className="mt-2 space-y-0.5">{warnings.map((w) => (
          <p key={w} className="flex items-center gap-1.5 text-[11.5px] text-destructive"><AlertTriangle size={12} /> {w}</p>))}</div>}
        <div className="mt-2 rounded-lg border border-border bg-surface-2/40 p-3">
          <AccountGuidePanel code={lines[focus]?.account_code ?? ""} compact />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className={`text-[12px] ${balanced ? "text-primary" : "text-destructive"}`}>{balanced ? "Écriture équilibrée" : `Écart : ${fmt(tD - tC)}`}</span>
          <div className="flex gap-2">
            <GhButton variant="ghost" onClick={() => head.label && save.mutate(false)}>{tr("Enregistrer en brouillon")}</GhButton>
            <GhButton onClick={() => head.label && balanced && !blocking && save.mutate(true)}><CheckCircle2 size={13} /> {tr("Valider")}</GhButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EntriesSection() {
  const [fy, setFy] = useDefaultFy();
  const { isAdmin, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const qc = useQueryClient();
  const { data: journals = [] } = useJournals();
  const { data: entries = [] } = useQuery({ queryKey: ["acc-entries", fy], enabled: !!fy, queryFn: async () => {
    const { data, error } = await supabase.from("accounting_entries").select("*").eq("fiscal_year_id", fy!).order("entry_date", { ascending: false }).limit(500);
    if (error) throw error; return (data ?? []) as Entry[];
  } });
  const { data: lines = [] } = useQuery({ queryKey: ["acc-lines", expanded], enabled: !!expanded, queryFn: async () => {
    const { data, error } = await supabase.from("accounting_entry_lines").select("*").eq("entry_id", expanded!).order("line_no");
    if (error) throw error; return (data ?? []) as Line[];
  } });
  const validate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounting_entries").update({ status: "validee", validated_at: new Date().toISOString(), validated_by: user?.id ?? null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Écriture validée"); qc.invalidateQueries({ queryKey: ["acc-entries"] }); qc.invalidateQueries({ queryKey: ["acc-balance"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const [editing, setEditing] = useState<EntryInitial | null>(null);
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["acc-entries"] }); qc.invalidateQueries({ queryKey: ["acc-balance"] }); qc.invalidateQueries({ queryKey: ["acc-ledger"] }); };
  const fetchLines = async (id: string) => {
    const { data, error } = await supabase.from("accounting_entry_lines").select("*").eq("entry_id", id).order("line_no");
    if (error) throw error; return (data ?? []) as Line[];
  };
  /** Contre-passation : écriture inverse validée, seule annulation admise pour une écriture validée (SYSCOHADA, intangibilité). */
  const reverse = async (e: Entry) => {
    const ls = await fetchLines(e.id);
    const { data: r, error } = await supabase.from("accounting_entries").insert({
      journal_id: e.journal_id, entry_date: new Date().toISOString().slice(0, 10), fiscal_year_id: e.fiscal_year_id,
      piece_ref: e.piece_ref, label: `Contre-passation — ${e.label}`, project_id: e.project_id, grant_id: e.grant_id,
      source_type: "reversal", source_id: e.id, created_by: user?.id ?? null,
    }).select("id").single();
    if (error) throw error;
    const { error: le } = await supabase.from("accounting_entry_lines").insert(ls.map((l, i) => ({
      entry_id: r.id, line_no: i + 1, account_code: l.account_code, label: l.label, debit: Number(l.credit), credit: Number(l.debit),
    })));
    if (le) throw le;
    const { error: ve } = await supabase.from("accounting_entries").update({ status: "validee" }).eq("id", r.id);
    if (ve) throw ve;
    return ls;
  };
  const remove = useMutation({
    mutationFn: async (e: Entry) => {
      if (e.status === "validee") { await reverse(e); return "reversed"; }
      const { error: le } = await supabase.from("accounting_entry_lines").delete().eq("entry_id", e.id);
      if (le) throw le;
      const { error } = await supabase.from("accounting_entries").delete().eq("id", e.id);
      if (error) throw error;
      return "deleted";
    },
    onSuccess: (r) => { toast.success(r === "reversed" ? "Écriture validée annulée par contre-passation" : "Écriture supprimée"); invalidate(); },
    onError: (err: Error) => toast.error(err.message),
  });
  const edit = useMutation({
    mutationFn: async (e: Entry) => {
      const validated = e.status === "validee";
      const ls = validated ? await reverse(e) : await fetchLines(e.id);
      return { id: validated ? undefined : e.id, head: { journal_id: e.journal_id ?? "", entry_date: validated ? new Date().toISOString().slice(0, 10) : e.entry_date, piece_ref: e.piece_ref ?? "", label: e.label },
        lines: ls.map((l) => ({ account_code: l.account_code, label: l.label ?? "", debit: Number(l.debit) ? String(l.debit) : "", credit: Number(l.credit) ? String(l.credit) : "" })) } as EntryInitial;
    },
    onSuccess: (init) => { if (!init.id) { toast.info("Écriture validée contre-passée : saisissez la version corrigée"); invalidate(); } setEditing(init); },
    onError: (err: Error) => toast.error(err.message),
  });
  const askEdit = (e: Entry) => { if (e.status !== "validee" || confirm(tr("Cette écriture est validée : elle sera annulée par une contre-passation, puis une écriture corrigée vous sera proposée. Continuer ?"))) edit.mutate(e); };
  const askDelete = (e: Entry) => { if (confirm(e.status === "validee" ? tr("Écriture validée : elle ne peut pas être effacée. Une contre-passation (écriture inverse) va l'annuler. Continuer ?") : tr("Supprimer définitivement ce brouillon ?"))) remove.mutate(e); };
  const jname = (id: string | null) => journals.find((j) => j.id === id)?.code ?? "—";
  return (
    <>
      <GhCard title={tr("Écritures comptables")} badge={String(entries.length)} noPadding
        action={<div className="flex gap-2"><FySelect value={fy} onChange={setFy} />{isAdmin && <GhButton onClick={() => setOpen(true)}><Plus size={13} /> {tr("Nouvelle écriture")}</GhButton>}</div>}>
        {entries.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{tr("Aucune écriture sur cet exercice.")}</p> : (
          <table className="w-full"><thead><tr><th className={th}>{tr("Date")}</th><th className={th}>{tr("Journal")}</th><th className={th}>{tr("Pièce")}</th><th className={th}>{tr("Libellé")}</th><th className={th}>{tr("Débit")}</th><th className={th}>{tr("Crédit")}</th><th className={th}>{tr("Statut")}</th><th className={th}></th></tr></thead>
            <tbody>{entries.map((e) => (<>
              <tr key={e.id} className="hover:bg-surface-2/50 cursor-pointer" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                <td className={td}>{e.entry_date}</td><td className={`${td} font-mono`}>{jname(e.journal_id)}</td><td className={td}>{e.piece_ref ?? "—"}</td>
                <td className={td}>{e.label}</td><td className={`${td} font-mono`}>{fmt(Number(e.total_debit))}</td><td className={`${td} font-mono`}>{fmt(Number(e.total_credit))}</td>
                <td className={td}>{e.status === "validee" ? <span className="text-primary flex items-center gap-1"><Lock size={11} /> {tr("Validée")}</span> : <span className="text-muted-foreground">{tr("Brouillon")}</span>}</td>
                <td className={td}>{isAdmin && <div className="flex items-center gap-2" onClick={(ev) => ev.stopPropagation()}>
                  {e.status !== "validee" && <button className="text-primary text-[11px]" onClick={() => validate.mutate(e.id)}>{tr("Valider")}</button>}
                  <button aria-label={tr("Modifier")} title={tr("Modifier")} className="text-muted-foreground hover:text-primary" onClick={() => askEdit(e)}><Pencil size={13} /></button>
                  <button aria-label={tr("Supprimer")} title={tr("Supprimer")} className="text-muted-foreground hover:text-destructive" onClick={() => askDelete(e)}><Trash2 size={13} /></button>
                </div>}</td>
              </tr>
              {expanded === e.id && lines.map((l) => (
                <tr key={l.id} className="bg-surface-2/30"><td /><td colSpan={2} className={`${td} font-mono`}>{l.account_code}</td><td className={td}>{l.label}</td>
                  <td className={`${td} font-mono`}>{Number(l.debit) ? fmt(Number(l.debit)) : ""}</td><td className={`${td} font-mono`}>{Number(l.credit) ? fmt(Number(l.credit)) : ""}</td><td colSpan={2} /></tr>))}
            </>))}</tbody></table>)}
      </GhCard>
      {open && <EntryDialog open={open} onClose={() => setOpen(false)} fyId={fy} />}
      {editing && <EntryDialog open onClose={() => setEditing(null)} fyId={fy} initial={editing} />}
    </>
  );
}

/* ---------------- Grand livre ---------------- */
function LedgerSection() {
  const [fy, setFy] = useDefaultFy();
  const [code, setCode] = useState("");
  const { data: accounts = [] } = useAccounts();
  const { data = [] } = useQuery({ queryKey: ["acc-ledger", fy, code], enabled: !!fy && code.length >= 2, queryFn: async () => {
    const { data, error } = await supabase.from("accounting_entry_lines")
      .select("id, account_code, label, debit, credit, accounting_entries!inner(entry_date, label, piece_ref, status, fiscal_year_id)")
      .like("account_code", `${code}%`).eq("accounting_entries.fiscal_year_id", fy!).eq("accounting_entries.status", "validee").limit(1000);
    if (error) throw error;
    return (data ?? []).sort((a, b) => a.accounting_entries.entry_date.localeCompare(b.accounting_entries.entry_date));
  } });
  let run = 0;
  return (
    <GhCard title={tr("Grand livre")} noPadding action={<div className="flex gap-2"><FySelect value={fy} onChange={setFy} />
      <input list="acc-ledger-codes" className={`${input} font-mono`} placeholder={tr("Compte (ex. 521)")} value={code} onChange={(e) => setCode(e.target.value)} />
      <datalist id="acc-ledger-codes">{accounts.slice(0, 1200).map((a) => <option key={a.id} value={a.code}>{a.label}</option>)}</datalist></div>}>
      {code.length < 2 ? <p className="p-5 text-sm text-muted-foreground">{tr("Saisissez un compte ou une racine de compte (2 chiffres minimum).")}</p> :
        data.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{tr("Aucun mouvement validé.")}</p> : (
        <table className="w-full"><thead><tr><th className={th}>{tr("Date")}</th><th className={th}>{tr("Compte")}</th><th className={th}>{tr("Pièce")}</th><th className={th}>{tr("Libellé")}</th><th className={th}>{tr("Débit")}</th><th className={th}>{tr("Crédit")}</th><th className={th}>{tr("Solde")}</th></tr></thead>
          <tbody>{data.map((l) => { run += Number(l.debit) - Number(l.credit); return (
            <tr key={l.id}><td className={td}>{l.accounting_entries.entry_date}</td><td className={`${td} font-mono`}>{l.account_code}</td><td className={td}>{l.accounting_entries.piece_ref ?? "—"}</td>
              <td className={td}>{l.label ?? l.accounting_entries.label}</td><td className={`${td} font-mono`}>{Number(l.debit) ? fmt(Number(l.debit)) : ""}</td>
              <td className={`${td} font-mono`}>{Number(l.credit) ? fmt(Number(l.credit)) : ""}</td><td className={`${td} font-mono font-semibold`}>{fmt(run)}</td></tr>); })}</tbody></table>)}
    </GhCard>
  );
}

/* ---------------- Balance ---------------- */
function BalanceSection() {
  const [fy, setFy] = useDefaultFy();
  const { data = [] } = useBalance(fy);
  const tD = data.reduce((s, r) => s + Number(r.total_debit ?? 0), 0);
  const tC = data.reduce((s, r) => s + Number(r.total_credit ?? 0), 0);
  return (
    <GhCard title={tr("Balance générale")} badge={`${data.length} comptes mouvementés`} noPadding action={<div className="flex items-center gap-2"><GhButton variant="ghost" onClick={() => exportToCSV(data.map((r) => ({ ...r })), "balance-generale")}>{tr("Exporter CSV")}</GhButton><FySelect value={fy} onChange={setFy} /></div>}>
      <table className="w-full"><thead><tr><th className={th}>{tr("Compte")}</th><th className={th}>{tr("Libellé")}</th><th className={th}>{tr("Débit")}</th><th className={th}>{tr("Crédit")}</th><th className={th}>{tr("Solde débiteur")}</th><th className={th}>{tr("Solde créditeur")}</th></tr></thead>
        <tbody>{data.map((r) => { const s = Number(r.solde ?? 0); return (
          <tr key={r.account_code}><td className={`${td} font-mono`}>{r.account_code}</td><td className={td}>{r.account_label}</td>
            <td className={`${td} font-mono`}>{fmt(Number(r.total_debit ?? 0))}</td><td className={`${td} font-mono`}>{fmt(Number(r.total_credit ?? 0))}</td>
            <td className={`${td} font-mono`}>{s > 0 ? fmt(s) : ""}</td><td className={`${td} font-mono`}>{s < 0 ? fmt(-s) : ""}</td></tr>); })}
          <tr className="font-semibold"><td className={td} colSpan={2}>{tr("Totaux")}</td><td className={`${td} font-mono`}>{fmt(tD)}</td><td className={`${td} font-mono`}>{fmt(tC)}</td><td className={td} colSpan={2}>{Math.abs(tD - tC) < 0.01 ? "Balance équilibrée" : `Écart ${fmt(tD - tC)}`}</td></tr>
        </tbody></table>
    </GhCard>
  );
}

/* ---------------- États financiers ---------------- */
function useOpening(fyId: string | undefined) {
  return useQuery({ queryKey: ["acc-opening", fyId], enabled: !!fyId, queryFn: async () => {
    const { data, error } = await supabase.from("accounting_entry_lines")
      .select("account_code, debit, credit, accounting_entries!inner(fiscal_year_id, is_opening, status)")
      .eq("accounting_entries.fiscal_year_id", fyId!).eq("accounting_entries.is_opening", true).eq("accounting_entries.status", "validee");
    if (error) throw error;
    const m = new Map<string, number>();
    for (const l of data ?? []) m.set(l.account_code, (m.get(l.account_code) ?? 0) + Number(l.debit) - Number(l.credit));
    return [...m].map(([code, solde]) => ({ code, solde })) as BalLine[];
  } });
}

function StatementTable({ title, lines, withBrut }: { title: string; lines: StatementLine[]; withBrut?: boolean }) {
  return (
    <GhCard title={title} noPadding>
      <table className="w-full"><thead><tr><th className={th}>Réf.</th><th className={th}>{tr("Poste")}</th>
        {withBrut && <><th className={th}>{tr("Brut")}</th><th className={th}>{tr("Amort./Dépr.")}</th></>}<th className={th}>{withBrut ? "Net" : "Montant"}</th></tr></thead>
        <tbody>{lines.map((l) => (
          <tr key={l.ref} className={l.total ? "bg-surface-2/50 font-semibold" : ""}>
            <td className={`${td} font-mono`}>{l.ref}</td><td className={td}>{tr(l.label)}</td>
            {withBrut && <><td className={`${td} font-mono whitespace-nowrap`}>{l.brut !== undefined ? fmt(l.brut) : ""}</td><td className={`${td} font-mono whitespace-nowrap`}>{l.amort !== undefined ? fmt(l.amort) : ""}</td></>}
            <td className={`${td} font-mono whitespace-nowrap`}>{fmt(l.value)}</td></tr>))}</tbody></table>
    </GhCard>
  );
}

function StatementsSection() {
  const [fy, setFy] = useDefaultFy();
  const { data = [] } = useBalance(fy);
  const { data: opening = [] } = useOpening(fy);
  const [tab, setTab] = useState<"bilan" | "resultat" | "flux" | "plaquette" | "mappage">("bilan");
  const bal: BalLine[] = data.map((r) => ({ code: r.account_code ?? "", solde: Number(r.solde ?? 0) }));
  const cr = compteResultat(bal);
  const resultat = cr[cr.length - 1].value;
  const actif = bilanActif(bal);
  const passif = bilanPassif(bal, resultat);
  const flux = fluxTresorerie(bal, opening, resultat);
  const ecart = actif[actif.length - 1].value - passif[passif.length - 1].value;
  const tabs = [["bilan", tr("Bilan")], ["resultat", tr("Compte de résultat")], ["flux", tr("Tableau des flux de trésorerie")], ["plaquette", tr("Plaquette (57)")], ["mappage", tr("Mappage des comptes")]] as const;
  const balRows = data.map((r) => ({ code: r.account_code ?? "", label: r.account_label ?? "", solde: Number(r.solde ?? 0) }));
  const exportStatements = (kind: "csv" | "pdf") => {
    const rows = (tab === "bilan"
      ? [...actif.map((l) => ({ ...l, part: "Actif" })), ...passif.map((l) => ({ ...l, part: "Passif" }))]
      : (tab === "resultat" ? cr : flux).map((l) => ({ ...l, part: "" })))
      .map((l) => ({ partie: l.part, ref: l.ref, libelle: l.label, brut: l.brut ?? "", amort: l.amort ?? "", montant: Math.round(l.value) }));
    const cols = [{ key: "partie", label: "Partie" }, { key: "ref", label: "Réf." }, { key: "libelle", label: "Libellé" },
      { key: "brut", label: "Brut (XOF)" }, { key: "amort", label: "Amort./Dépréc. (XOF)" }, { key: "montant", label: "Net (XOF)" }];
    const title = tabs.find(([k]) => k === tab)?.[1] ?? "Etats";
    if (kind === "csv") exportToCSV(rows, `syscohada-${tab}`, cols); else exportToPDF(`${title} — SYSCOHADA révisé (XOF)`, rows, cols);
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {tabs.map(([k, l]) => <GhButton key={k} variant={tab === k ? "primary" : "ghost"} onClick={() => setTab(k)}>{l}</GhButton>)}
        <div className="ml-auto flex items-center gap-2">
          <GhButton variant="ghost" onClick={() => exportStatements("csv")}>{tr("Exporter CSV")}</GhButton>
          <GhButton variant="ghost" onClick={() => exportStatements("pdf")}>{tr("Exporter PDF")}</GhButton>
          <FySelect value={fy} onChange={setFy} />
        </div>
      </div>
      {tab === "bilan" && <>
        <p className={`text-[12px] mb-2 ${Math.abs(ecart) < 1 ? "text-primary" : "text-destructive"}`}>
          {Math.abs(ecart) < 1 ? tr("Bilan équilibré (actif = passif).") : `${tr("Écart actif − passif")} : ${fmt(ecart)} — ${tr("vérifiez les écritures en attente ou les comptes hors bilan.")}`}</p>
        <div className="grid xl:grid-cols-2 gap-4"><StatementTable title={tr("Bilan — Actif")} lines={actif} withBrut /><StatementTable title={tr("Bilan — Passif")} lines={passif} /></div></>}
      {tab === "resultat" && <StatementTable title={tr("Compte de résultat (avec soldes intermédiaires de gestion)")} lines={cr} />}
      {tab === "mappage" && <MappingView rows={balRows} />}
      {tab === "plaquette" && <PlaquetteView rows={balRows} onOpenState={setTab} />}
      {tab === "flux" && <>
        {opening.length === 0 && <p className="text-[12px] text-muted-foreground mb-2">{tr("Aucun à-nouveau sur cet exercice : la trésorerie d'ouverture est considérée comme nulle.")}</p>}
        <StatementTable title={tr("Tableau des flux de trésorerie")} lines={flux} /></>}
      <p className="text-[11px] text-muted-foreground mt-3">{tr("Modèles du système normal SYSCOHADA révisé, établis à partir des seules écritures validées.")}</p>
    </>
  );
}

/* ---------------- Exercices ---------------- */
function FiscalYearsSection() {
  const { data = [] } = useFiscalYears();
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const y = new Date().getFullYear() + 1;
  const [f, setF] = useState({ label: `Exercice ${y}`, start_date: `${y}-01-01`, end_date: `${y}-12-31` });
  const inv = () => qc.invalidateQueries({ queryKey: ["acc-fy"] });
  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("accounting_fiscal_years").insert({ ...f, created_by: user?.id ?? null }); if (error) throw error; },
    onSuccess: () => { toast.success("Exercice créé"); inv(); }, onError: (e: Error) => toast.error(e.message),
  });
  const close = useMutation({
    mutationFn: async (fy: FiscalYear) => {
      const { count } = await supabase.from("accounting_entries").select("id", { count: "exact", head: true }).eq("fiscal_year_id", fy.id).neq("status", "validee");
      if (count) throw new Error(`${count} écriture(s) en brouillon : validez-les ou supprimez-les avant la clôture.`);
      const { error } = await supabase.from("accounting_fiscal_years").update({ status: "closed", closed_at: new Date().toISOString(), closed_by: user?.id ?? null }).eq("id", fy.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Exercice clôturé"); inv(); }, onError: (e: Error) => toast.error(e.message),
  });
  const reopen = useMutation({
    mutationFn: async (fy: FiscalYear) => {
      const next = data.filter((f) => f.status !== "closed" && f.start_date > fy.end_date).sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
      if (!next) throw new Error("Ouvrez d'abord l'exercice suivant.");
      const { data: an } = await supabase.from("accounting_journals").select("id").eq("code", "AN").maybeSingle();
      const { count } = await supabase.from("accounting_entries").select("id", { count: "exact", head: true }).eq("fiscal_year_id", next.id).eq("is_opening", true);
      if (count) throw new Error(`Les à-nouveaux de ${next.label} existent déjà.`);
      const { data: bal, error } = await supabase.from("accounting_balance").select("account_code, account_class, solde").eq("fiscal_year_id", fy.id);
      if (error) throw error;
      const rows = (bal ?? []).filter((r) => Math.abs(Number(r.solde)) >= 0.01);
      const res = rows.filter((r) => (r.account_class ?? 0) >= 6).reduce((s, r) => s - Number(r.solde), 0);
      const lines = rows.filter((r) => (r.account_class ?? 0) <= 5).map((r) => ({ code: r.account_code!, solde: Number(r.solde) }));
      if (Math.abs(res) >= 0.01) lines.push({ code: res >= 0 ? "131" : "139", solde: -res });
      if (!lines.length) throw new Error("Aucun solde à reporter.");
      const { data: e, error: ee } = await supabase.from("accounting_entries").insert({
        journal_id: an?.id ?? null, entry_date: next.start_date, piece_ref: `AN-${fy.label}`, label: `À-nouveaux issus de ${fy.label}`,
        fiscal_year_id: next.id, created_by: user?.id ?? null, is_opening: true,
      }).select("id").single();
      if (ee) throw ee;
      const { error: le } = await supabase.from("accounting_entry_lines").insert(lines.map((l, i) => ({
        entry_id: e.id, line_no: i + 1, account_code: l.code, label: "Report à nouveau",
        debit: l.solde > 0 ? l.solde : 0, credit: l.solde < 0 ? -l.solde : 0,
      })));
      if (le) throw le;
      const { error: ve } = await supabase.from("accounting_entries").update({ status: "validee" }).eq("id", e.id);
      if (ve) throw ve;
      return next.label;
    },
    onSuccess: (l) => { toast.success(`À-nouveaux générés dans ${l}`); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <GhCard title={tr("Exercices comptables")} noPadding>
      {isAdmin && <div className="flex flex-wrap gap-2 p-3 border-b border-border">
        <input className={input} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        <input type="date" className={input} value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
        <input type="date" className={input} value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} />
        <GhButton onClick={() => add.mutate()}><Plus size={13} /> {tr("Ouvrir un exercice")}</GhButton></div>}
      <table className="w-full"><thead><tr><th className={th}>{tr("Exercice")}</th><th className={th}>{tr("Début")}</th><th className={th}>{tr("Fin")}</th><th className={th}>{tr("Statut")}</th><th className={th}></th></tr></thead>
        <tbody>{data.map((fy) => <tr key={fy.id}><td className={td}>{fy.label}</td><td className={td}>{fy.start_date}</td><td className={td}>{fy.end_date}</td>
          <td className={td}>{fy.status === "closed" ? <span className="flex items-center gap-1"><Lock size={11} /> {tr("Clôturé")}</span> : <span className="text-primary">{tr("Ouvert")}</span>}</td>
          <td className={td}>{isAdmin && fy.status !== "closed" && <button className="text-destructive text-[11px]" onClick={() => confirm(`${tr("Clôturer")} ${fy.label} ? ${tr("Cette action est définitive.")}`) && close.mutate(fy)}>{tr("Clôturer")}</button>}
            {isAdmin && fy.status === "closed" && <button className="text-primary text-[11px] flex items-center gap-1" onClick={() => reopen.mutate(fy)}><RotateCcw size={11} /> {tr("Générer les à-nouveaux")}</button>}</td></tr>)}</tbody></table>
    </GhCard>
  );
}

const SECTIONS: Record<string, () => JSX.Element> = {
  plan: PlanSection, journaux: JournalsSection, ecritures: EntriesSection, "grand-livre": LedgerSection,
  balance: BalanceSection, lettrage: LetteringSection, auxiliaires: SubledgerSection, immobilisations: FixedAssetsSection, reglements: SettlementsSection, rapprochement: ReconciliationSection, emprunts: LoansSection, regularisations: AccrualsSection, stocks: StocksSection, tva: VatSection, actionnaires: ShareholdersSection, cloture: ClosingSection, etats: StatementsSection, exercices: FiscalYearsSection,
};

export default function AccountingPage() {
  const { section = "ecritures" } = useParams();
  const Comp = SECTIONS[section];
  if (!Comp) return <Navigate to="/app/comptabilite/ecritures" replace />;
  const label = ACCOUNTING_SECTIONS.find((s) => s.key === section)?.label ?? "";
  return (
    <div>
      <SectionHeader title={`${tr("Comptabilité")} — ${tr(label)}`} subtitle={tr("SYSCOHADA révisé · montants en Franc CFA (XOF)")} />
      <Comp />
    </div>
  );
}
