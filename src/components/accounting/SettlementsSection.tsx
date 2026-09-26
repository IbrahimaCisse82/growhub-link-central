import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CheckCircle2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TAccount = Database["public"]["Tables"]["treasury_accounts"]["Row"];
type Movement = Database["public"]["Tables"]["treasury_movements"]["Row"];
type Direction = "encaissement" | "decaissement" | "virement";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n) || 0) + " XOF";
const input = "bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-primary w-full";
const th = "text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border";
const td = "px-3 py-2 text-[12px] border-b border-border/50";

/** Catégories de règlement et compte de contrepartie SYSCOHADA proposé. */
const CATEGORIES: Record<Direction, { key: string; label: string; account: string; invoice?: "emise" | "recue" }[]> = {
  encaissement: [
    { key: "facture_client", label: "Règlement facture client", account: "4111", invoice: "emise" },
    { key: "client", label: "Encaissement client (sans facture)", account: "4111" },
    { key: "subvention", label: "Subvention / fonds bailleur reçus", account: "4581" },
    { key: "emprunt", label: "Emprunt reçu", account: "162" },
    { key: "avance_remb", label: "Remboursement d'avance au personnel", account: "4211" },
    { key: "divers_enc", label: "Autre encaissement", account: "4712" },
  ],
  decaissement: [
    { key: "facture_fournisseur", label: "Règlement facture fournisseur", account: "4011", invoice: "recue" },
    { key: "fournisseur", label: "Paiement fournisseur (sans facture)", account: "4011" },
    { key: "salaire", label: "Paiement des salaires", account: "422" },
    { key: "avance", label: "Avance / acompte au personnel", account: "4211" },
    { key: "social", label: "Cotisations sociales (IPRES, CSS)", account: "4311" },
    { key: "tva", label: "TVA reversée", account: "4441" },
    { key: "impot", label: "Impôt sur salaires / IR", account: "4471" },
    { key: "frais_bancaires", label: "Frais bancaires", account: "6318" },
    { key: "emprunt_remb", label: "Remboursement d'emprunt", account: "162" },
    { key: "divers_dec", label: "Autre décaissement", account: "4712" },
  ],
  virement: [{ key: "virement_interne", label: "Virement entre comptes (banque, caisse, mobile money)", account: "585" }],
};
const METHODS = [["virement", "Virement"], ["especes", "Espèces"], ["cheque", "Chèque"], ["mobile_money", "Mobile money"], ["carte", "Carte"], ["prelevement", "Prélèvement"], ["autre", "Autre"]] as const;
const KINDS = [["banque", "Banque"], ["caisse", "Caisse"], ["mobile_money", "Mobile money"], ["autre", "Autre"]] as const;
const today = () => new Date().toISOString().slice(0, 10);

export default function SettlementsSection() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [accOpen, setAccOpen] = useState(false);
  const [filter, setFilter] = useState<string>("");
  const [f, setF] = useState({ direction: "encaissement" as Direction, category: "facture_client", label: "", amount: "", method: "virement", movement_date: today(), treasury_account_id: "", target_account_id: "", counterpart_account: "4111", third_party_id: "", invoice_id: "", project_id: "", reference: "" });
  const [a, setA] = useState({ name: "", kind: "banque", account_code: "5211", bank_name: "", iban: "" });

  const { data: taccs = [] } = useQuery({ queryKey: ["tr-accounts"], queryFn: async () => {
    const { data, error } = await supabase.from("treasury_accounts").select("*").order("name"); if (error) throw error; return (data ?? []) as TAccount[];
  } });
  const { data: moves = [] } = useQuery({ queryKey: ["tr-moves"], queryFn: async () => {
    const { data, error } = await supabase.from("treasury_movements").select("*").order("movement_date", { ascending: false }).limit(500); if (error) throw error; return (data ?? []) as Movement[];
  } });
  const { data: parties = [] } = useQuery({ queryKey: ["tr-parties"], queryFn: async () => {
    const { data, error } = await supabase.from("crm_contreparties").select("id,name").order("name"); if (error) throw error; return data ?? [];
  } });
  const { data: invoices = [] } = useQuery({ queryKey: ["tr-invoices"], queryFn: async () => {
    const { data, error } = await supabase.from("crm_invoices").select("id,invoice_number,direction,total_ttc,amount_paid,contrepartie_id,status").neq("status", "payee"); if (error) throw error; return data ?? [];
  } });
  const { data: projects = [] } = useQuery({ queryKey: ["tr-projects"], queryFn: async () => {
    const { data, error } = await supabase.from("projects").select("id,name").order("name"); if (error) throw error; return data ?? [];
  } });

  const cat = CATEGORIES[f.direction].find((c) => c.key === f.category);
  const partyName = useMemo(() => new Map(parties.map((p) => [p.id, p.name])), [parties]);
  const accName = useMemo(() => new Map(taccs.map((t) => [t.id, t.name])), [taccs]);

  const balances = useMemo(() => {
    const m = new Map<string, number>();
    moves.forEach((mv) => {
      const amt = Number(mv.amount);
      if (mv.direction === "encaissement") m.set(mv.treasury_account_id, (m.get(mv.treasury_account_id) ?? 0) + amt);
      else m.set(mv.treasury_account_id, (m.get(mv.treasury_account_id) ?? 0) - amt);
      if (mv.direction === "virement" && mv.target_account_id) m.set(mv.target_account_id, (m.get(mv.target_account_id) ?? 0) + amt);
    });
    return m;
  }, [moves]);
  const totIn = moves.filter((m) => m.direction === "encaissement").reduce((s, m) => s + Number(m.amount), 0);
  const totOut = moves.filter((m) => m.direction === "decaissement").reduce((s, m) => s + Number(m.amount), 0);
  const refresh = () => ["tr-moves", "tr-invoices", "acc-entries", "acc-balance"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const setDir = (d: Direction) => { const c = CATEGORIES[d][0]; setF({ ...f, direction: d, category: c.key, counterpart_account: c.account, invoice_id: "" }); };
  const setCat = (k: string) => { const c = CATEGORIES[f.direction].find((x) => x.key === k); setF({ ...f, category: k, counterpart_account: c?.account ?? "", invoice_id: "" }); };
  const pickInvoice = (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    setF({ ...f, invoice_id: id, third_party_id: inv?.contrepartie_id ?? "", amount: inv ? String(Number(inv.total_ttc) - Number(inv.amount_paid ?? 0)) : f.amount, label: inv ? `Règlement ${inv.invoice_number}` : f.label, reference: inv?.invoice_number ?? f.reference });
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!f.treasury_account_id) throw new Error("Choisissez le compte de trésorerie");
      if (!(Number(f.amount) > 0)) throw new Error("Montant invalide");
      if (cat?.invoice && !f.invoice_id) throw new Error("Choisissez la facture réglée");
      if (f.direction === "virement" && (!f.target_account_id || f.target_account_id === f.treasury_account_id)) throw new Error("Choisissez un compte destinataire différent");
      if (f.direction !== "virement" && !cat?.invoice) {
        const { data } = await supabase.from("accounting_accounts").select("code").eq("code", f.counterpart_account).eq("is_detail", true).maybeSingle();
        if (!data) throw new Error(`Compte ${f.counterpart_account} inexistant ou non mouvementable`);
      }
      const { error } = await supabase.from("treasury_movements").insert({
        direction: f.direction, category: f.category, label: f.label || cat?.label || "Règlement", amount: Number(f.amount), method: f.method,
        movement_date: f.movement_date, treasury_account_id: f.treasury_account_id, target_account_id: f.direction === "virement" ? f.target_account_id : null,
        counterpart_account: f.direction === "virement" ? null : f.counterpart_account, third_party_id: f.third_party_id || null,
        invoice_id: f.invoice_id || null, project_id: f.project_id || null, reference: f.reference || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Règlement enregistré — écriture créée en brouillon"); setOpen(false); setF({ ...f, label: "", amount: "", invoice_id: "", reference: "" }); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const reconcile = useMutation({
    mutationFn: async (m: Movement) => {
      const { error } = await supabase.from("treasury_movements").update({ reconciled: !m.reconciled, reconciled_at: m.reconciled ? null : new Date().toISOString() }).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: refresh, onError: (e: Error) => toast.error(e.message),
  });
  const createAcc = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.from("accounting_accounts").select("code").eq("code", a.account_code).eq("is_detail", true).maybeSingle();
      if (!data) throw new Error(`Compte ${a.account_code} inexistant ou non mouvementable`);
      const { error } = await supabase.from("treasury_accounts").insert({ name: a.name, kind: a.kind, account_code: a.account_code, bank_name: a.bank_name || null, iban: a.iban || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Compte ajouté"); setAccOpen(false); qc.invalidateQueries({ queryKey: ["tr-accounts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const shown = filter ? moves.filter((m) => m.treasury_account_id === filter || m.target_account_id === filter) : moves;
  const invChoices = invoices.filter((i) => i.direction === cat?.invoice);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {taccs.map((t) => (
          <button key={t.id} onClick={() => setFilter(filter === t.id ? "" : t.id)} className={`text-left rounded-xl border p-3 bg-surface-1 ${filter === t.id ? "border-primary" : "border-border"}`}>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Wallet className="w-3.5 h-3.5" />{t.name} · {t.account_code}</div>
            <div className="font-display text-[16px] mt-1">{fmt(balances.get(t.id) ?? 0)}</div>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[12px]">
        <span className="text-primary">Encaissements : {fmt(totIn)}</span>
        <span className="text-destructive">Décaissements : {fmt(totOut)}</span>
        <div className="ml-auto flex gap-2">
          {isAdmin && <GhButton variant="secondary" onClick={() => setAccOpen(true)}><Plus className="w-3.5 h-3.5" /> Compte</GhButton>}
          {isAdmin && <GhButton onClick={() => { setF({ ...f, treasury_account_id: f.treasury_account_id || taccs[0]?.id || "" }); setOpen(true); }}><Plus className="w-3.5 h-3.5" /> Nouveau règlement</GhButton>}
        </div>
      </div>
      <GhCard>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className={th}>Date</th><th className={th}>Sens</th><th className={th}>Libellé</th><th className={th}>Compte</th><th className={th}>Tiers</th><th className={th}>Mode</th><th className={`${th} text-right`}>Montant</th><th className={th}>Écriture</th><th className={th}>Rapproché</th></tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td className={td} colSpan={9}>Aucun règlement enregistré.</td></tr>}
              {shown.map((m) => (
                <tr key={m.id}>
                  <td className={td}>{m.movement_date}</td>
                  <td className={td}>{m.direction === "encaissement" ? <ArrowDownLeft className="w-4 h-4 text-primary" /> : m.direction === "decaissement" ? <ArrowUpRight className="w-4 h-4 text-destructive" /> : <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />}</td>
                  <td className={td}>{m.label}<div className="text-[10px] text-muted-foreground">{m.reference}</div></td>
                  <td className={td}>{accName.get(m.treasury_account_id)}{m.target_account_id && ` → ${accName.get(m.target_account_id)}`}</td>
                  <td className={td}>{m.third_party_id ? partyName.get(m.third_party_id) : "—"}</td>
                  <td className={td}>{METHODS.find((x) => x[0] === m.method)?.[1]}</td>
                  <td className={`${td} text-right font-mono`}>{fmt(Number(m.amount))}</td>
                  <td className={td}>{m.entry_id ? "Brouillon créé" : "—"}</td>
                  <td className={td}>
                    <button disabled={!isAdmin} onClick={() => reconcile.mutate(m)} title="Rapprochement bancaire" className={m.reconciled ? "text-primary" : "text-muted-foreground"}><CheckCircle2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GhCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Nouveau règlement</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div className="col-span-2 flex gap-2">
              {(["encaissement", "decaissement", "virement"] as Direction[]).map((d) => (
                <GhButton key={d} variant={f.direction === d ? "primary" : "secondary"} onClick={() => setDir(d)}>{d === "encaissement" ? "Encaissement" : d === "decaissement" ? "Décaissement" : "Virement interne"}</GhButton>
              ))}
            </div>
            <label className="col-span-2">Type de règlement<select className={input} value={f.category} onChange={(e) => setCat(e.target.value)}>{CATEGORIES[f.direction].map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
            {cat?.invoice && (
              <label className="col-span-2">Facture réglée<select className={input} value={f.invoice_id} onChange={(e) => pickInvoice(e.target.value)}>
                <option value="">—</option>{invChoices.map((i) => <option key={i.id} value={i.id}>{i.invoice_number} · reste {fmt(Number(i.total_ttc) - Number(i.amount_paid ?? 0))}</option>)}
              </select></label>
            )}
            <label>{f.direction === "virement" ? "Compte source" : "Compte de trésorerie"}<select className={input} value={f.treasury_account_id} onChange={(e) => setF({ ...f, treasury_account_id: e.target.value })}>{taccs.filter((t) => t.is_active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            {f.direction === "virement"
              ? <label>Compte destinataire<select className={input} value={f.target_account_id} onChange={(e) => setF({ ...f, target_account_id: e.target.value })}><option value="">—</option>{taccs.filter((t) => t.id !== f.treasury_account_id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
              : <label>Compte de contrepartie<input className={input} value={f.counterpart_account} disabled={!!cat?.invoice} onChange={(e) => setF({ ...f, counterpart_account: e.target.value })} /></label>}
            <label>Date<input type="date" className={input} value={f.movement_date} onChange={(e) => setF({ ...f, movement_date: e.target.value })} /></label>
            <label>Montant (XOF)<input type="number" className={input} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
            <label>Mode<select className={input} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label>Référence (n° chèque, transaction…)<input className={input} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></label>
            {f.direction !== "virement" && !cat?.invoice && (
              <label>Tiers<select className={input} value={f.third_party_id} onChange={(e) => setF({ ...f, third_party_id: e.target.value })}><option value="">—</option>{parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            )}
            <label>Projet<select className={input} value={f.project_id} onChange={(e) => setF({ ...f, project_id: e.target.value })}><option value="">—</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="col-span-2">Libellé<input className={input} value={f.label} placeholder={cat?.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></label>
          </div>
          <p className="text-[11px] text-muted-foreground">L'écriture comptable est créée en brouillon dans le journal Banque ou Caisse, à valider dans « Saisie d'écritures ».</p>
          <div className="flex justify-end"><GhButton onClick={() => create.mutate()} disabled={create.isPending}>Enregistrer</GhButton></div>
        </DialogContent>
      </Dialog>

      <Dialog open={accOpen} onOpenChange={setAccOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau compte de trésorerie</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <label className="col-span-2">Nom<input className={input} value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} /></label>
            <label>Type<select className={input} value={a.kind} onChange={(e) => { const k = e.target.value; setA({ ...a, kind: k, account_code: k === "caisse" ? "5711" : k === "mobile_money" ? "552" : "5211" }); }}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label>Compte comptable<input className={input} value={a.account_code} onChange={(e) => setA({ ...a, account_code: e.target.value })} /></label>
            <label>Banque / opérateur<input className={input} value={a.bank_name} onChange={(e) => setA({ ...a, bank_name: e.target.value })} /></label>
            <label>IBAN / numéro<input className={input} value={a.iban} onChange={(e) => setA({ ...a, iban: e.target.value })} /></label>
          </div>
          <div className="flex justify-end"><GhButton onClick={() => createAcc.mutate()} disabled={!a.name}>Ajouter</GhButton></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
