import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calculator, LogOut, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { useAuth } from "@/hooks/useAuth";
import { tr } from "@/lib/phrases";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Asset = Database["public"]["Tables"]["accounting_fixed_assets"]["Row"];
type Dep = Database["public"]["Tables"]["accounting_depreciations"]["Row"];

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n) || 0) + " XOF";
const input = "bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-primary w-full";
const th = "text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border";
const td = "px-3 py-2 text-[12px] border-b border-border/50";

/** Compte d'amortissement SYSCOHADA : 2441 → 2844, 2111 → 2811. */
const amortFor = (code: string) => "28" + code.slice(1, 3);
const dotFor = (code: string) => (code.startsWith("21") ? "6812" : "6813");

const empty = { code: "", label: "", asset_account: "2441", amort_account: "2844", dotation_account: "6813", acquisition_date: new Date().toISOString().slice(0, 10), service_date: new Date().toISOString().slice(0, 10), cost: "", residual_value: "0", duration_years: "5", method: "lineaire" };

export default function FixedAssetsSection() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  const [fy, setFy] = useState<string>("");
  const [dispose, setDispose] = useState<Asset | null>(null);
  const [disp, setDisp] = useState({ date: new Date().toISOString().slice(0, 10), price: "0" });

  const { data: assets = [] } = useQuery({ queryKey: ["acc-assets"], queryFn: async () => {
    const { data, error } = await supabase.from("accounting_fixed_assets").select("*").order("code"); if (error) throw error; return data ?? [];
  } });
  const { data: deps = [] } = useQuery({ queryKey: ["acc-deps"], queryFn: async () => {
    const { data, error } = await supabase.from("accounting_depreciations").select("*"); if (error) throw error; return (data ?? []) as Dep[];
  } });
  const { data: fys = [] } = useQuery({ queryKey: ["acc-fy"], queryFn: async () => {
    const { data, error } = await supabase.from("accounting_fiscal_years").select("*").order("start_date", { ascending: false }); if (error) throw error; return data ?? [];
  } });
  const { data: accounts = [] } = useQuery({ queryKey: ["acc-assets-accounts"], queryFn: async () => {
    const { data, error } = await supabase.from("accounting_accounts").select("code,label").eq("is_detail", true).like("code", "2%").order("code"); if (error) throw error; return data ?? [];
  } });
  const fyId = fy || fys.find((x) => x.status !== "closed")?.id || "";
  const accLabel = useMemo(() => new Map(accounts.map((a) => [a.code, a.label])), [accounts]);
  const cum = (id: string) => deps.filter((d) => d.asset_id === id).reduce((s, d) => s + Number(d.amount), 0);
  const refresh = () => ["acc-assets", "acc-deps", "acc-entries", "acc-balance"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const create = useMutation({
    mutationFn: async () => {
      if (!accLabel.has(f.amort_account)) throw new Error(`Compte d'amortissement ${f.amort_account} inexistant ou non mouvementable`);
      const { error } = await supabase.from("accounting_fixed_assets").insert({
        code: f.code || `IMM-${String(assets.length + 1).padStart(4, "0")}`, label: f.label, asset_account: f.asset_account, amort_account: f.amort_account,
        dotation_account: f.dotation_account, acquisition_date: f.acquisition_date, service_date: f.service_date, cost: Number(f.cost),
        residual_value: Number(f.residual_value || 0), duration_years: Number(f.duration_years), method: f.method,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Immobilisation enregistrée — écriture d'acquisition créée en brouillon"); setOpen(false); setF(empty); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const generate = useMutation({
    mutationFn: async () => { const { data, error } = await supabase.rpc("acc_generate_depreciation", { _fy: fyId }); if (error) throw error; return data; },
    onSuccess: (n) => { toast.success(n ? `${n} dotation(s) générée(s) — écriture en brouillon dans le journal OD` : "Aucune nouvelle dotation pour cet exercice"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const out = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc("acc_dispose_asset", { _id: dispose!.id, _date: disp.date, _price: Number(disp.price || 0) }); if (error) throw error; },
    onSuccess: () => { toast.success("Sortie enregistrée — écriture de cession créée en brouillon"); setDispose(null); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (a: Asset) => {
      if (deps.some((d) => d.asset_id === a.id)) throw new Error("Des dotations existent déjà : utilisez « Sortie » plutôt que la suppression");
      if (a.acquisition_entry_id) await supabase.from("accounting_entries").delete().eq("id", a.acquisition_entry_id).eq("status", "draft");
      const { error } = await supabase.from("accounting_fixed_assets").delete().eq("id", a.id); if (error) throw error;
    },
    onSuccess: () => { toast.success("Immobilisation supprimée"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totals = assets.reduce((s, a) => { const c = cum(a.id); return { cost: s.cost + (a.status === "actif" ? Number(a.cost) : 0), cum: s.cum + (a.status === "actif" ? c : 0) }; }, { cost: 0, cum: 0 });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {isAdmin && <GhButton onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />{tr("Nouvelle immobilisation")}</GhButton>}
        <div className="ml-auto flex items-center gap-2">
          <select className={input + " !w-auto"} value={fyId} onChange={(e) => setFy(e.target.value)}>{fys.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
          {isAdmin && <GhButton variant="ghost" onClick={() => generate.mutate()} disabled={!fyId || generate.isPending}><Calculator className="w-3.5 h-3.5" />{tr("Générer les dotations de l'exercice")}</GhButton>}
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mb-3">
        <GhCard title={tr("Valeur brute")}><p className="font-mono text-lg">{fmt(totals.cost)}</p></GhCard>
        <GhCard title={tr("Amortissements cumulés")}><p className="font-mono text-lg">{fmt(totals.cum)}</p></GhCard>
        <GhCard title={tr("Valeur nette comptable")}><p className="font-mono text-lg">{fmt(totals.cost - totals.cum)}</p></GhCard>
      </div>
      <GhCard title={tr("Registre des immobilisations")} badge={`${assets.length} biens`} noPadding>
        <table className="w-full"><thead><tr>
          <th className={th}>Code</th><th className={th}>{tr("Libellé")}</th><th className={th}>{tr("Compte")}</th><th className={th}>{tr("Mise en service")}</th>
          <th className={th}>{tr("Durée")}</th><th className={th}>{tr("Coût")}</th><th className={th}>{tr("Amort. cumulés")}</th><th className={th}>VNC</th><th className={th}>{tr("Statut")}</th><th className={th} /></tr></thead>
          <tbody>{assets.length === 0 && <tr><td className={td} colSpan={10}>{tr("Aucune immobilisation enregistrée.")}</td></tr>}
            {assets.map((a) => { const c = cum(a.id); return (
              <tr key={a.id}><td className={`${td} font-mono`}>{a.code}</td><td className={td}>{a.label}</td>
                <td className={`${td} font-mono text-[11px]`}>{a.asset_account} / {a.amort_account} / {a.dotation_account}</td>
                <td className={td}>{a.service_date}</td><td className={td}>{a.method === "lineaire" ? `${a.duration_years} ans` : "Non amort."}</td>
                <td className={`${td} font-mono whitespace-nowrap`}>{fmt(Number(a.cost))}</td><td className={`${td} font-mono whitespace-nowrap`}>{fmt(c)}</td>
                <td className={`${td} font-mono whitespace-nowrap`}>{fmt(Number(a.cost) - c)}</td>
                <td className={td}>{a.status === "actif" ? "En service" : a.status === "cede" ? `Cédée le ${a.disposal_date}` : `Rebut le ${a.disposal_date}`}</td>
                <td className={td}>{isAdmin && a.status === "actif" && <div className="flex gap-1">
                  <button title="Sortie (cession ou rebut)" onClick={() => setDispose(a)} className="p-1 text-muted-foreground hover:text-foreground"><LogOut className="w-3.5 h-3.5" /></button>
                  <button title="Supprimer" onClick={() => confirm(tr("Supprimer cette immobilisation ?")) && remove.mutate(a)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></div>}</td></tr>); })}
          </tbody></table>
      </GhCard>
      <p className="text-[11px] text-muted-foreground mt-3">{tr("Chaque acquisition, dotation et sortie crée une écriture en brouillon (journal OD) à valider dans « Saisie d'écritures ». Amortissement linéaire au prorata temporis. Les montants validés alimentent la balance, le bilan (AD, AI) et les notes 3A, 3C et 3D.")}</p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{tr("Nouvelle immobilisation")}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <label className="col-span-2">{tr("Libellé")}<input className={input} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></label>
            <label>{tr("Code (facultatif)")}<input className={input} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="IMM-0001" /></label>
            <label>{tr("Compte d'immobilisation")}<select className={input} value={f.asset_account} onChange={(e) => { const c = e.target.value; setF({ ...f, asset_account: c, amort_account: amortFor(c), dotation_account: dotFor(c) }); }}>
              {accounts.filter((a) => /^2[1-4]/.test(a.code) && !a.code.startsWith("28")).map((a) => <option key={a.code} value={a.code}>{a.code} — {a.label}</option>)}</select></label>
            <label>{tr("Compte d'amortissement")}<select className={input} value={f.amort_account} onChange={(e) => setF({ ...f, amort_account: e.target.value })}>
              {accounts.filter((a) => a.code.startsWith("28")).map((a) => <option key={a.code} value={a.code}>{a.code} — {a.label}</option>)}</select></label>
            <label>{tr("Compte de dotation")}<select className={input} value={f.dotation_account} onChange={(e) => setF({ ...f, dotation_account: e.target.value })}><option value="6812">6812 — Incorporelles</option><option value="6813">6813 — Corporelles</option></select></label>
            <label>{tr("Date d'acquisition")}<input type="date" className={input} value={f.acquisition_date} onChange={(e) => setF({ ...f, acquisition_date: e.target.value })} /></label>
            <label>{tr("Mise en service")}<input type="date" className={input} value={f.service_date} onChange={(e) => setF({ ...f, service_date: e.target.value })} /></label>
            <label>{tr("Coût (XOF HT)")}<input type="number" className={input} value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></label>
            <label>{tr("Valeur résiduelle")}<input type="number" className={input} value={f.residual_value} onChange={(e) => setF({ ...f, residual_value: e.target.value })} /></label>
            <label>{tr("Mode")}<select className={input} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><option value="lineaire">Linéaire</option><option value="non_amortissable">Non amortissable (terrain…)</option></select></label>
            <label>{tr("Durée (années)")}<input type="number" className={input} value={f.duration_years} onChange={(e) => setF({ ...f, duration_years: e.target.value })} /></label>
          </div>
          <div className="flex justify-end mt-3"><GhButton onClick={() => create.mutate()} disabled={!f.label || !Number(f.cost) || create.isPending}>{tr("Enregistrer")}</GhButton></div>
        </DialogContent></Dialog>

      <Dialog open={!!dispose} onOpenChange={(o) => !o && setDispose(null)}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{tr("Sortie d'immobilisation")} — {dispose?.label}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <label>{tr("Date de sortie")}<input type="date" className={input} value={disp.date} onChange={(e) => setDisp({ ...disp, date: e.target.value })} /></label>
            <label>{tr("Prix de cession (0 = rebut)")}<input type="number" className={input} value={disp.price} onChange={(e) => setDisp({ ...disp, price: e.target.value })} /></label>
          </div>
          <div className="flex justify-end mt-3"><GhButton onClick={() => out.mutate()} disabled={out.isPending}>{tr("Enregistrer la sortie")}</GhButton></div>
        </DialogContent></Dialog>
    </>
  );
}
