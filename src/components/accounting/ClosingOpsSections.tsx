import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, CheckCircle2, AlertTriangle, Upload, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { tr } from "@/lib/phrases";

type T = Database["public"]["Tables"];
const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n) || 0) + " XOF";
const input = "bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-primary";
const th = "text-start font-mono text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border";
const td = "px-3 py-2 text-[12px] border-b border-border/50";
const today = () => new Date().toISOString().slice(0, 10);
const err = (e: unknown) => toast.error(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));

function useList<K extends keyof T>(table: K, order: string, asc = false) {
  return useQuery({
    queryKey: ["acc-ops", table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order(order, { ascending: asc });
      if (error) throw error;
      return (data ?? []) as unknown as T[K]["Row"][];
    },
  });
}
function useInvalidate() {
  const qc = useQueryClient();
  return (...t: string[]) => t.forEach((x) => qc.invalidateQueries({ queryKey: ["acc-ops", x] }));
}
function useFys() { return useList("accounting_fiscal_years", "start_date"); }
function useTreasuryAccounts() { return useList("treasury_accounts", "name", true); }

/* ---------------- Clôture ---------------- */
export function ClosingSection() {
  const { isAdmin } = useAuth();
  const { data: fys = [] } = useFys();
  const [fy, setFy] = useState("");
  const cur = fys.find((f) => f.id === fy) ?? fys.find((f) => f.status !== "closed") ?? fys[0];
  const next = fys.find((f) => cur && f.start_date > cur.end_date);
  const checks = useQuery({
    queryKey: ["acc-ops", "close-checks", cur?.id],
    enabled: !!cur,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("acc_close_checks", { _fy: cur!.id });
      if (error) throw error;
      return (data ?? {}) as Record<string, number | boolean>;
    },
  });
  const qc = useQueryClient();
  const run = useMutation({
    mutationFn: async (fn: () => PromiseLike<{ error: unknown }>) => { const { error } = await fn(); if (error) throw error; },
    onSuccess: () => { toast.success(tr("Opération effectuée — écritures en brouillon")); qc.invalidateQueries({ queryKey: ["acc-ops"] }); },
    onError: err,
  });
  const [alloc, setAlloc] = useState({ legal: 0, other: 0, div: 0 });
  const c = checks.data ?? {};
  const result = Number(c.result ?? 0);
  const retained = result - alloc.legal - alloc.other - alloc.div;
  const items: [string, boolean, string][] = [
    [tr("Aucune écriture en brouillon"), Number(c.drafts ?? 0) === 0, `${c.drafts ?? 0}`],
    [tr("Balance équilibrée"), Math.abs(Number(c.debit ?? 0) - Number(c.credit ?? 0)) < 1, `${fmt(Number(c.debit ?? 0))} / ${fmt(Number(c.credit ?? 0))}`],
    [tr("Comptes d'attente 47 soldés"), Math.abs(Number(c.suspense ?? 0)) < 1, fmt(Number(c.suspense ?? 0))],
    [tr("Dotations aux amortissements passées"), !!c.depreciation_done, ""],
    [tr("Mouvements de trésorerie rapprochés"), Number(c.unreconciled ?? 0) === 0, `${c.unreconciled ?? 0}`],
    [tr("Déclarations de TVA établies"), Number(c.vat_missing ?? 0) === 0, `${c.vat_missing ?? 0}`],
  ];
  return (
    <div className="space-y-4">
      <GhCard title="" className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[12px] text-muted-foreground">{tr("Exercice")}</span>
          <select className={input} value={cur?.id ?? ""} onChange={(e) => setFy(e.target.value)}>
            {fys.map((f) => <option key={f.id} value={f.id}>{f.label} {f.status === "closed" ? "(clôturé)" : ""}</option>)}
          </select>
        </div>
        <h3 className="font-semibold text-[13px] mb-2">{tr("1. Contrôles avant clôture")}</h3>
        <ul className="space-y-1.5">
          {items.map(([l, ok, v]) => (
            <li key={l} className="flex items-center gap-2 text-[12px]">
              {ok ? <CheckCircle2 size={14} className="text-primary" /> : <AlertTriangle size={14} className="text-destructive" />}
              <span>{l}</span><span className="ml-auto font-mono text-muted-foreground">{v}</span>
            </li>
          ))}
        </ul>
      </GhCard>
      {isAdmin && cur && (
        <GhCard title="" className="p-4 space-y-3">
          <h3 className="font-semibold text-[13px]">{tr("2. Écritures d'inventaire")}</h3>
          <div className="flex flex-wrap gap-2">
            <GhButton onClick={() => run.mutate(() => supabase.rpc("acc_generate_depreciation", { _fy: cur.id }))}>{tr("Générer les dotations")}</GhButton>
            <GhButton onClick={() => run.mutate(() => supabase.rpc("acc_stock_variation", { _date: cur.end_date }))}>{tr("Variation de stock")}</GhButton>
            {next && <GhButton onClick={() => run.mutate(() => supabase.rpc("acc_reverse_accruals", { _next_fy: next.id }))}>{tr("Extourner les régularisations sur")} {next.label}</GhButton>}
          </div>
          <h3 className="font-semibold text-[13px] pt-2">{tr("3. Résultat et affectation")}</h3>
          <p className="text-[12px]">{tr("Résultat de l'exercice")} : <b className={result >= 0 ? "text-primary" : "text-destructive"}>{fmt(result)}</b></p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <label>{tr("Réserve légale (111)")}<input type="number" className={input + " w-full"} value={alloc.legal} onChange={(e) => setAlloc({ ...alloc, legal: +e.target.value })} /></label>
            <label>{tr("Autres réserves (118)")}<input type="number" className={input + " w-full"} value={alloc.other} onChange={(e) => setAlloc({ ...alloc, other: +e.target.value })} /></label>
            <label>{tr("Dividendes (465)")}<input type="number" className={input + " w-full"} value={alloc.div} onChange={(e) => setAlloc({ ...alloc, div: +e.target.value })} /></label>
            <label>{tr("Report à nouveau (12)")}<input disabled className={input + " w-full"} value={fmt(retained)} /></label>
          </div>
          <GhButton disabled={!next} onClick={() => run.mutate(() => supabase.rpc("acc_allocate_result", { _date: next!.start_date, _result: result, _legal_reserve: alloc.legal, _other_reserves: alloc.other, _dividends: alloc.div, _retained: retained }))}>
            {tr("Passer l'affectation")}
          </GhButton>
          {!next && <p className="text-[11px] text-muted-foreground">{tr("Ouvrez l'exercice suivant pour passer l'affectation et les à-nouveaux.")}</p>}
          <p className="text-[11px] text-muted-foreground">{tr("4. Clôture et à-nouveaux : depuis le menu Exercices.")}</p>
        </GhCard>
      )}
    </div>
  );
}

/* ---------------- Emprunts ---------------- */
export function LoansSection() {
  const { isAdmin } = useAuth();
  const inv = useInvalidate();
  const { data: loans = [] } = useList("acc_loans", "start_date");
  const { data: sched = [] } = useList("acc_loan_schedule", "due_no", true);
  const { data: tas = [] } = useTreasuryAccounts();
  const [open, setOpen] = useState<string | null>(null);
  const [f, setF] = useState({ label: "", lender: "", treasury_account_id: "", principal: 0, annual_rate: 8, start_date: today(), duration_months: 36 });
  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("acc_loans").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success(tr("Emprunt créé, échéancier calculé")); inv("acc_loans", "acc_loan_schedule"); }, onError: err,
  });
  const pay = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc("acc_pay_loan_installment", { _id: id, _date: today() }); if (error) throw error; },
    onSuccess: () => { toast.success(tr("Échéance payée — écriture en brouillon")); inv("acc_loan_schedule"); }, onError: err,
  });
  return (
    <GhCard title="" className="p-4">
      {isAdmin && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4 items-end text-[11px]">
        <input className={input} placeholder={tr("Libellé")} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        <input className={input} placeholder={tr("Prêteur")} value={f.lender} onChange={(e) => setF({ ...f, lender: e.target.value })} />
        <select className={input} value={f.treasury_account_id} onChange={(e) => setF({ ...f, treasury_account_id: e.target.value })}>
          <option value="">{tr("Compte de trésorerie")}</option>{tas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <label>{tr("Capital")}<input type="number" className={input + " w-28 block"} value={f.principal} onChange={(e) => setF({ ...f, principal: +e.target.value })} /></label>
        <label>{tr("Taux %")}<input type="number" className={input + " w-16 block"} value={f.annual_rate} onChange={(e) => setF({ ...f, annual_rate: +e.target.value })} /></label>
        <label>{tr("Mois")}<input type="number" className={input + " w-16 block"} value={f.duration_months} onChange={(e) => setF({ ...f, duration_months: +e.target.value })} /></label>
        <input type="date" className={input} value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
        <GhButton disabled={!f.label || !f.lender || !f.treasury_account_id || f.principal <= 0} onClick={() => add.mutate()}><Plus size={13} /> {tr("Ajouter")}</GhButton>
      </div>}
      <table className="w-full"><thead><tr><th className={th}>{tr("Emprunt")}</th><th className={th}>{tr("Prêteur")}</th><th className={th}>{tr("Capital")}</th><th className={th}>{tr("Taux")}</th><th className={th}>{tr("Restant dû")}</th><th className={th}></th></tr></thead>
        <tbody>{loans.map((l) => {
          const rows = sched.filter((s) => s.loan_id === l.id);
          const unpaid = rows.filter((s) => !s.paid_at);
          const remaining = unpaid.reduce((a, s) => a + Number(s.principal), 0);
          return [
            <tr key={l.id} className="cursor-pointer hover:bg-surface-2" onClick={() => setOpen(open === l.id ? null : l.id)}>
              <td className={td}>{l.label}</td><td className={td}>{l.lender}</td><td className={td}>{fmt(Number(l.principal))}</td><td className={td}>{l.annual_rate} %</td><td className={td}>{fmt(remaining)}</td>
              <td className={td}>{isAdmin && unpaid[0] && <button className="text-primary text-[11px]" onClick={(e) => { e.stopPropagation(); pay.mutate(unpaid[0].id); }}>{tr("Payer l'échéance")} {unpaid[0].due_no}</button>}</td>
            </tr>,
            open === l.id && <tr key={l.id + "s"}><td colSpan={6} className="p-2 bg-surface-2/40">
              <table className="w-full"><thead><tr><th className={th}>N°</th><th className={th}>{tr("Échéance")}</th><th className={th}>{tr("Capital")}</th><th className={th}>{tr("Intérêts")}</th><th className={th}>{tr("Restant")}</th><th className={th}>{tr("Payée le")}</th></tr></thead>
                <tbody>{rows.map((s) => <tr key={s.id}><td className={td}>{s.due_no}</td><td className={td}>{s.due_date}</td><td className={td}>{fmt(Number(s.principal))}</td><td className={td}>{fmt(Number(s.interest))}</td><td className={td}>{fmt(Number(s.remaining))}</td><td className={td}>{s.paid_at ?? "—"}</td></tr>)}</tbody></table>
            </td></tr>,
          ];
        })}</tbody></table>
      {!loans.length && <p className="text-[12px] text-muted-foreground p-3">{tr("Aucun emprunt.")}</p>}
    </GhCard>
  );
}

/* ---------------- Régularisations & provisions ---------------- */
const ACCRUAL_KINDS: Record<string, [string, string]> = {
  cca: ["Charge constatée d'avance (476)", "6"], pca: ["Produit constaté d'avance (477)", "7"],
  fnp: ["Facture non parvenue (408)", "6"], fae: ["Facture à établir (418)", "7"],
};
const PROV_DEFAULTS: Record<string, [string, string, string]> = {
  client: ["Clients douteux", "4911", "6594"], stock: ["Stocks", "3911", "6593"], risque: ["Risques", "1911", "6911"], autre: ["Autre", "1981", "6911"],
};
export function AccrualsSection() {
  const { isAdmin } = useAuth();
  const inv = useInvalidate();
  const { data: acc = [] } = useList("acc_accruals", "entry_date");
  const { data: prov = [] } = useList("acc_provisions", "entry_date");
  const [a, setA] = useState({ kind: "cca", label: "", amount: 0, account_code: "", entry_date: today() });
  const [p, setP] = useState({ kind: "client", movement: "dotation", label: "", amount: 0, provision_account: "4911", pl_account: "6594", entry_date: today() });
  const addA = useMutation({ mutationFn: async () => { const { error } = await supabase.from("acc_accruals").insert(a); if (error) throw error; }, onSuccess: () => { toast.success(tr("Régularisation créée — écriture en brouillon")); inv("acc_accruals"); }, onError: err });
  const addP = useMutation({ mutationFn: async () => { const { error } = await supabase.from("acc_provisions").insert(p); if (error) throw error; }, onSuccess: () => { toast.success(tr("Provision créée — écriture en brouillon")); inv("acc_provisions"); }, onError: err });
  const setKind = (k: string) => { const d = PROV_DEFAULTS[k]; setP({ ...p, kind: k, provision_account: d[1], pl_account: p.movement === "dotation" ? d[2] : d[2].replace(/^6/, "7") }); };
  const setMove = (m: string) => { const d = PROV_DEFAULTS[p.kind]; setP({ ...p, movement: m, pl_account: m === "dotation" ? d[2] : d[2].replace(/^6/, "7") }); };
  return (
    <div className="space-y-4">
      <GhCard title="" className="p-4">
        <h3 className="font-semibold text-[13px] mb-2">{tr("Régularisations (extournées au 1er jour de l'exercice suivant)")}</h3>
        {isAdmin && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          <select className={input} value={a.kind} onChange={(e) => setA({ ...a, kind: e.target.value })}>{Object.entries(ACCRUAL_KINDS).map(([k, v]) => <option key={k} value={k}>{tr(v[0])}</option>)}</select>
          <input className={input} placeholder={tr("Libellé")} value={a.label} onChange={(e) => setA({ ...a, label: e.target.value })} />
          <input className={input + " w-28"} placeholder={`${tr("Compte")} ${ACCRUAL_KINDS[a.kind][1]}…`} value={a.account_code} onChange={(e) => setA({ ...a, account_code: e.target.value })} />
          <input type="number" className={input + " w-28"} value={a.amount} onChange={(e) => setA({ ...a, amount: +e.target.value })} />
          <input type="date" className={input} value={a.entry_date} onChange={(e) => setA({ ...a, entry_date: e.target.value })} />
          <GhButton disabled={!a.label || !a.account_code || a.amount <= 0} onClick={() => addA.mutate()}><Plus size={13} /> {tr("Ajouter")}</GhButton>
        </div>}
        <table className="w-full"><thead><tr><th className={th}>{tr("Date")}</th><th className={th}>{tr("Type")}</th><th className={th}>{tr("Libellé")}</th><th className={th}>{tr("Compte")}</th><th className={th}>{tr("Montant")}</th><th className={th}>{tr("Extournée")}</th></tr></thead>
          <tbody>{acc.map((r) => <tr key={r.id}><td className={td}>{r.entry_date}</td><td className={td}>{r.kind.toUpperCase()}</td><td className={td}>{r.label}</td><td className={td}>{r.account_code}</td><td className={td}>{fmt(Number(r.amount))}</td><td className={td}>{r.reversal_entry_id ? tr("Oui") : "—"}</td></tr>)}</tbody></table>
      </GhCard>
      <GhCard title="" className="p-4">
        <h3 className="font-semibold text-[13px] mb-2">{tr("Provisions et dépréciations")}</h3>
        {isAdmin && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          <select className={input} value={p.kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(PROV_DEFAULTS).map(([k, v]) => <option key={k} value={k}>{tr(v[0])}</option>)}</select>
          <select className={input} value={p.movement} onChange={(e) => setMove(e.target.value)}><option value="dotation">{tr("Dotation")}</option><option value="reprise">{tr("Reprise")}</option></select>
          <input className={input} placeholder={tr("Libellé")} value={p.label} onChange={(e) => setP({ ...p, label: e.target.value })} />
          <input className={input + " w-20"} value={p.provision_account} onChange={(e) => setP({ ...p, provision_account: e.target.value })} />
          <input className={input + " w-20"} value={p.pl_account} onChange={(e) => setP({ ...p, pl_account: e.target.value })} />
          <input type="number" className={input + " w-28"} value={p.amount} onChange={(e) => setP({ ...p, amount: +e.target.value })} />
          <input type="date" className={input} value={p.entry_date} onChange={(e) => setP({ ...p, entry_date: e.target.value })} />
          <GhButton disabled={!p.label || p.amount <= 0} onClick={() => addP.mutate()}><Plus size={13} /> {tr("Ajouter")}</GhButton>
        </div>}
        <table className="w-full"><thead><tr><th className={th}>{tr("Date")}</th><th className={th}>{tr("Type")}</th><th className={th}>{tr("Mouvement")}</th><th className={th}>{tr("Libellé")}</th><th className={th}>{tr("Comptes")}</th><th className={th}>{tr("Montant")}</th></tr></thead>
          <tbody>{prov.map((r) => <tr key={r.id}><td className={td}>{r.entry_date}</td><td className={td}>{r.kind}</td><td className={td}>{r.movement}</td><td className={td}>{r.label}</td><td className={td}>{r.provision_account} / {r.pl_account}</td><td className={td}>{fmt(Number(r.amount))}</td></tr>)}</tbody></table>
      </GhCard>
    </div>
  );
}

/* ---------------- Stocks ---------------- */
export function StocksSection() {
  const { isAdmin } = useAuth();
  const inv = useInvalidate();
  const { data: items = [] } = useList("stock_items", "code", true);
  const { data: moves = [] } = useList("stock_moves", "move_date", true);
  const [it, setIt] = useState({ code: "", label: "", unit: "u", stock_account: "3111", variation_account: "6031" });
  const [mv, setMv] = useState({ item_id: "", kind: "entree", quantity: 0, unit_cost: 0, move_date: today(), reference: "" });
  const addIt = useMutation({ mutationFn: async () => { const { error } = await supabase.from("stock_items").insert(it); if (error) throw error; }, onSuccess: () => { inv("stock_items"); setIt({ ...it, code: "", label: "" }); }, onError: err });
  const addMv = useMutation({ mutationFn: async () => { const { error } = await supabase.from("stock_moves").insert(mv); if (error) throw error; }, onSuccess: () => { toast.success(tr("Mouvement enregistré")); inv("stock_moves"); }, onError: err });
  // CMUP
  const val = new Map<string, { q: number; v: number }>();
  for (const m of moves) {
    const s = val.get(m.item_id) ?? { q: 0, v: 0 };
    const q = Number(m.quantity), c = Number(m.unit_cost ?? 0);
    if (m.kind === "entree") { s.q += q; s.v += q * c; }
    else if (m.kind === "sortie") { const cmup = s.q ? s.v / s.q : 0; s.q -= q; s.v -= q * cmup; }
    else { const cmup = s.q ? s.v / s.q : c; s.q = q; s.v = q * cmup; }
    val.set(m.item_id, s);
  }
  const total = [...val.values()].reduce((a, s) => a + s.v, 0);
  return (
    <div className="space-y-4">
      {isAdmin && <GhCard title="" className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <input className={input + " w-24"} placeholder={tr("Code")} value={it.code} onChange={(e) => setIt({ ...it, code: e.target.value })} />
        <input className={input} placeholder={tr("Article")} value={it.label} onChange={(e) => setIt({ ...it, label: e.target.value })} />
        <input className={input + " w-16"} value={it.unit} onChange={(e) => setIt({ ...it, unit: e.target.value })} />
        <input className={input + " w-20"} value={it.stock_account} onChange={(e) => setIt({ ...it, stock_account: e.target.value })} />
        <input className={input + " w-20"} value={it.variation_account} onChange={(e) => setIt({ ...it, variation_account: e.target.value })} />
        <GhButton disabled={!it.code || !it.label} onClick={() => addIt.mutate()}><Plus size={13} /> {tr("Article")}</GhButton>
        <span className="hidden lg:block lg:col-span-4" />
        <select className={input} value={mv.item_id} onChange={(e) => setMv({ ...mv, item_id: e.target.value })}><option value="">{tr("Article")}</option>{items.map((i) => <option key={i.id} value={i.id}>{i.code} — {i.label}</option>)}</select>
        <select className={input} value={mv.kind} onChange={(e) => setMv({ ...mv, kind: e.target.value })}><option value="entree">{tr("Entrée")}</option><option value="sortie">{tr("Sortie")}</option><option value="inventaire">{tr("Inventaire")}</option></select>
        <input type="number" className={input + " w-20"} placeholder={tr("Qté")} value={mv.quantity} onChange={(e) => setMv({ ...mv, quantity: +e.target.value })} />
        {mv.kind === "entree" && <input type="number" className={input + " w-24"} placeholder={tr("Coût unitaire")} value={mv.unit_cost} onChange={(e) => setMv({ ...mv, unit_cost: +e.target.value })} />}
        <input type="date" className={input} value={mv.move_date} onChange={(e) => setMv({ ...mv, move_date: e.target.value })} />
        <input className={input} placeholder={tr("Référence")} value={mv.reference} onChange={(e) => setMv({ ...mv, reference: e.target.value })} />
        <GhButton disabled={!mv.item_id || mv.quantity < 0} onClick={() => addMv.mutate()}><Plus size={13} /> {tr("Mouvement")}</GhButton>
      </GhCard>}
      <GhCard title="" className="p-4">
        <p className="text-[12px] mb-2">{tr("Valeur totale du stock (CMUP)")} : <b>{fmt(total)}</b></p>
        <table className="w-full"><thead><tr><th className={th}>{tr("Code")}</th><th className={th}>{tr("Article")}</th><th className={th}>{tr("Quantité")}</th><th className={th}>{tr("CMUP")}</th><th className={th}>{tr("Valeur")}</th></tr></thead>
          <tbody>{items.map((i) => { const s = val.get(i.id) ?? { q: 0, v: 0 }; return <tr key={i.id}><td className={td}>{i.code}</td><td className={td}>{i.label}</td><td className={td}>{s.q} {i.unit}</td><td className={td}>{fmt(s.q ? s.v / s.q : 0)}</td><td className={td}>{fmt(s.v)}</td></tr>; })}</tbody></table>
      </GhCard>
    </div>
  );
}

/* ---------------- TVA ---------------- */
export function VatSection() {
  const { isAdmin } = useAuth();
  const inv = useInvalidate();
  const { data: rows = [] } = useList("vat_returns", "period");
  const [period, setPeriod] = useState(today().slice(0, 7));
  const compute = useMutation({ mutationFn: async () => { const { error } = await supabase.rpc("acc_vat_compute", { _period: period + "-01" }); if (error) throw error; }, onSuccess: () => { toast.success(tr("Déclaration calculée")); inv("vat_returns"); }, onError: err });
  const post = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.rpc("acc_vat_post", { _id: id }); if (error) throw error; }, onSuccess: () => { toast.success(tr("Écriture de TVA créée en brouillon")); inv("vat_returns"); }, onError: err });
  return (
    <GhCard title="" className="p-4">
      {isAdmin && <div className="flex gap-2 mb-3"><input type="month" className={input} value={period} onChange={(e) => setPeriod(e.target.value)} /><GhButton onClick={() => compute.mutate()}>{tr("Calculer la déclaration")}</GhButton></div>}
      <table className="w-full"><thead><tr><th className={th}>{tr("Période")}</th><th className={th}>{tr("TVA collectée")}</th><th className={th}>{tr("TVA déductible")}</th><th className={th}>{tr("Crédit antérieur")}</th><th className={th}>{tr("TVA due (4441)")}</th><th className={th}>{tr("Crédit à reporter")}</th><th className={th}>{tr("Statut")}</th><th className={th}></th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td className={td}>{r.period.slice(0, 7)}</td><td className={td}>{fmt(Number(r.collected))}</td><td className={td}>{fmt(Number(r.deductible))}</td><td className={td}>{fmt(Number(r.credit_previous))}</td><td className={td}><b>{fmt(Number(r.due))}</b></td><td className={td}>{fmt(Number(r.credit_next))}</td><td className={td}>{r.status}</td>
          <td className={td}>{isAdmin && !r.entry_id && <button className="text-primary text-[11px]" onClick={() => post.mutate(r.id)}>{tr("Comptabiliser")}</button>}</td></tr>)}</tbody></table>
      {!rows.length && <p className="text-[12px] text-muted-foreground p-3">{tr("Aucune déclaration.")}</p>}
    </GhCard>
  );
}

/* ---------------- Actionnaires ---------------- */
export function ShareholdersSection() {
  const { isAdmin } = useAuth();
  const inv = useInvalidate();
  const { data: rows = [] } = useList("shareholders", "shares");
  const [f, setF] = useState({ name: "", kind: "personne_physique", shares: 0, nominal: 10000, paid_amount: 0, is_related_party: false });
  const add = useMutation({ mutationFn: async () => { const { error } = await supabase.from("shareholders").insert(f); if (error) throw error; }, onSuccess: () => { inv("shareholders"); setF({ ...f, name: "" }); }, onError: err });
  const del = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("shareholders").delete().eq("id", id); if (error) throw error; }, onSuccess: () => inv("shareholders"), onError: err });
  const totalShares = rows.reduce((a, r) => a + Number(r.shares ?? 0), 0);
  const capital = rows.reduce((a, r) => a + Number(r.shares ?? 0) * Number(r.nominal ?? 0), 0);
  const paid = rows.reduce((a, r) => a + Number(r.paid_amount ?? 0), 0);
  return (
    <GhCard title="" className="p-4">
      <div className="flex flex-wrap gap-4 text-[12px] mb-3"><span>{tr("Capital social (101)")} : <b>{fmt(capital)}</b></span><span>{tr("Libéré")} : <b>{fmt(paid)}</b></span><span>{tr("Non appelé / non versé (109)")} : <b>{fmt(capital - paid)}</b></span></div>
      {isAdmin && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3 items-center">
        <input className={input} placeholder={tr("Nom")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <select className={input} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="personne_physique">{tr("Personne physique")}</option><option value="personne_morale">{tr("Personne morale")}</option></select>
        <input type="number" className={input + " w-24"} placeholder={tr("Actions")} value={f.shares} onChange={(e) => setF({ ...f, shares: +e.target.value })} />
        <input type="number" className={input + " w-24"} placeholder={tr("Nominal")} value={f.nominal} onChange={(e) => setF({ ...f, nominal: +e.target.value })} />
        <input type="number" className={input + " w-28"} placeholder={tr("Libéré")} value={f.paid_amount} onChange={(e) => setF({ ...f, paid_amount: +e.target.value })} />
        <label className="text-[11px] flex items-center gap-1"><input type="checkbox" checked={f.is_related_party} onChange={(e) => setF({ ...f, is_related_party: e.target.checked })} /> {tr("Partie liée")}</label>
        <GhButton disabled={!f.name} onClick={() => add.mutate()}><Plus size={13} /> {tr("Ajouter")}</GhButton>
      </div>}
      <table className="w-full"><thead><tr><th className={th}>{tr("Actionnaire")}</th><th className={th}>{tr("Actions")}</th><th className={th}>%</th><th className={th}>{tr("Capital")}</th><th className={th}>{tr("Libéré")}</th><th className={th}>{tr("Partie liée")}</th><th className={th}></th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td className={td}>{r.name}</td><td className={td}>{r.shares}</td><td className={td}>{totalShares ? ((Number(r.shares) / totalShares) * 100).toFixed(2) : "0"} %</td><td className={td}>{fmt(Number(r.shares) * Number(r.nominal))}</td><td className={td}>{fmt(Number(r.paid_amount))}</td><td className={td}>{r.is_related_party ? tr("Oui") : "—"}</td>
          <td className={td}>{isAdmin && <button className="text-destructive" onClick={() => confirm(tr("Supprimer ?")) && del.mutate(r.id)}><Trash2 size={13} /></button>}</td></tr>)}</tbody></table>
    </GhCard>
  );
}

/* ---------------- Rapprochement bancaire ---------------- */
export function ReconciliationSection() {
  const { isAdmin } = useAuth();
  const inv = useInvalidate();
  const { data: tas = [] } = useTreasuryAccounts();
  const [ta, setTa] = useState("");
  const acct = ta || tas[0]?.id || "";
  const { data: lines = [] } = useList("bank_statement_lines", "line_date");
  const { data: moves = [] } = useList("treasury_movements", "movement_date");
  const myLines = lines.filter((l) => l.treasury_account_id === acct);
  const myMoves = moves.filter((m) => m.treasury_account_id === acct);
  const [csv, setCsv] = useState("");
  const imp = useMutation({
    mutationFn: async () => {
      const rows = csv.split(/\r?\n/).map((l) => l.split(/[;\t]/)).filter((c) => c.length >= 3 && /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/.test(c[0]));
      const payload = rows.map((c) => {
        const d = c[0].includes("/") ? c[0].split("/").reverse().join("-") : c[0];
        return { treasury_account_id: acct, line_date: d.trim(), label: c[1].trim(), amount: Number(c[2].replace(/\s/g, "").replace(",", ".")), reference: c[3]?.trim() || null };
      }).filter((r) => !isNaN(r.amount));
      if (!payload.length) throw new Error(tr("Aucune ligne valide (format : date;libellé;montant;référence)"));
      const { error } = await supabase.from("bank_statement_lines").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (n) => { toast.success(`${n} ${tr("lignes importées")}`); setCsv(""); inv("bank_statement_lines"); }, onError: err,
  });
  const auto = useMutation({
    mutationFn: async () => {
      const used = new Set(myLines.map((l) => l.matched_movement_id).filter(Boolean));
      let n = 0;
      for (const l of myLines.filter((x) => !x.matched_movement_id)) {
        const cand = myMoves.find((m) => {
          if (used.has(m.id)) return false;
          const signed = m.direction === "encaissement" ? Number(m.amount) : -Number(m.amount);
          if (Math.abs(signed - Number(l.amount)) > 0.5) return false;
          if (l.reference && m.reference && l.reference === m.reference) return true;
          return Math.abs(new Date(m.movement_date).getTime() - new Date(l.line_date).getTime()) <= 5 * 864e5;
        });
        if (!cand) continue;
        used.add(cand.id);
        const { error } = await supabase.from("bank_statement_lines").update({ matched_movement_id: cand.id }).eq("id", l.id);
        if (error) throw error;
        await supabase.from("treasury_movements").update({ reconciled: true }).eq("id", cand.id);
        n++;
      }
      return n;
    },
    onSuccess: (n) => { toast.success(`${n} ${tr("lignes rapprochées")}`); inv("bank_statement_lines", "treasury_movements"); }, onError: err,
  });
  const bankBal = myLines.reduce((a, l) => a + Number(l.amount), 0);
  const bookBal = myMoves.reduce((a, m) => a + (m.direction === "encaissement" ? 1 : m.direction === "decaissement" ? -1 : 0) * Number(m.amount), 0);
  const unmatchedLines = myLines.filter((l) => !l.matched_movement_id);
  const matchedIds = new Set(myLines.map((l) => l.matched_movement_id));
  const unmatchedMoves = myMoves.filter((m) => !matchedIds.has(m.id) && !m.reconciled);
  return (
    <div className="space-y-4">
      <GhCard title="" className="p-4 space-y-2">
        <div className="flex gap-2 items-center">
          <select className={input} value={acct} onChange={(e) => setTa(e.target.value)}>{tas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          {isAdmin && <GhButton onClick={() => auto.mutate()}><Link2 size={13} /> {tr("Rapprocher automatiquement")}</GhButton>}
        </div>
        {isAdmin && <>
          <textarea className={input + " w-full h-24 font-mono"} placeholder={"2026-10-01;VIR CLIENT X;1180000;FAC-2026-0002\n2026-10-02;FRAIS BANCAIRES;-5000;"} value={csv} onChange={(e) => setCsv(e.target.value)} />
          <div className="flex gap-2 items-center">
            <input type="file" accept=".csv,.txt" className="text-[11px]" onChange={async (e) => { const fl = e.target.files?.[0]; if (fl) setCsv(await fl.text()); }} />
            <GhButton disabled={!csv || !acct} onClick={() => imp.mutate()}><Upload size={13} /> {tr("Importer le relevé")}</GhButton>
          </div>
        </>}
      </GhCard>
      <GhCard title="" className="p-4">
        <h3 className="font-semibold text-[13px] mb-2">{tr("État de rapprochement")}</h3>
        <div className="grid grid-cols-3 gap-3 text-[12px] mb-3">
          <div>{tr("Solde relevé")} : <b>{fmt(bankBal)}</b></div><div>{tr("Solde comptable")} : <b>{fmt(bookBal)}</b></div>
          <div>{tr("Écart")} : <b className={Math.abs(bankBal - bookBal) < 1 ? "text-primary" : "text-destructive"}>{fmt(bankBal - bookBal)}</b></div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><p className="text-[11px] text-muted-foreground mb-1">{tr("Lignes du relevé non rapprochées")} ({unmatchedLines.length})</p>
            <table className="w-full"><tbody>{unmatchedLines.map((l) => <tr key={l.id}><td className={td}>{l.line_date}</td><td className={td}>{l.label}</td><td className={td}>{fmt(Number(l.amount))}</td></tr>)}</tbody></table></div>
          <div><p className="text-[11px] text-muted-foreground mb-1">{tr("Mouvements comptables non rapprochés")} ({unmatchedMoves.length})</p>
            <table className="w-full"><tbody>{unmatchedMoves.map((m) => <tr key={m.id}><td className={td}>{m.movement_date}</td><td className={td}>{m.label}</td><td className={td}>{fmt((m.direction === "encaissement" ? 1 : m.direction === "decaissement" ? -1 : 0) * Number(m.amount))}</td></tr>)}</tbody></table></div>
        </div>
      </GhCard>
    </div>
  );
}
