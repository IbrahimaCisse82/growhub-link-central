import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import { tr } from "@/lib/phrases";
import { exportToCSV } from "@/lib/exportUtils";
import { Download, ArrowLeft } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n) || 0) + " XOF";
const th = "text-start font-mono text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border";
const td = "px-3 py-2 text-[12px] border-b border-border/50";
const BUCKETS = ["Non échu", "1-30 j", "31-60 j", "61-90 j", "> 90 j"] as const;

type Dir = "emise" | "recue";

function bucketOf(due: string | null, asOf: Date): number {
  if (!due) return 0;
  const days = Math.floor((asOf.getTime() - new Date(due).getTime()) / 86400000);
  if (days <= 0) return 0;
  if (days <= 30) return 1;
  if (days <= 60) return 2;
  if (days <= 90) return 3;
  return 4;
}

export default function SubledgerSection() {
  const [dir, setDir] = useState<Dir>("emise");
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [party, setParty] = useState<string | null>(null);

  const { data: invoices = [] } = useQuery({
    queryKey: ["subledger_invoices", dir],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_invoices")
        .select("id, invoice_number, issue_date, due_date, total, amount_paid, status, contrepartie_id, crm_contreparties(name)")
        .eq("direction", dir).neq("status", "brouillon").neq("status", "annulee").order("issue_date");
      if (error) throw error;
      return data;
    },
  });
  const ids = invoices.map((i) => i.id);
  const { data: payments = [] } = useQuery({
    queryKey: ["subledger_payments", dir, ids.length],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_payments").select("id, invoice_id, amount, payment_date, reference, payment_method").in("invoice_id", ids);
      if (error) throw error;
      return data;
    },
  });

  const asOfDate = new Date(asOf);
  const aged = useMemo(() => {
    const m = new Map<string, { name: string; b: number[]; total: number }>();
    for (const i of invoices) {
      if (i.issue_date > asOf) continue;
      const paid = payments.filter((p) => p.invoice_id === i.id && p.payment_date <= asOf).reduce((a, p) => a + Number(p.amount), 0);
      const rest = Number(i.total) - paid;
      if (rest <= 0.5) continue;
      const key = i.contrepartie_id ?? "—";
      const row = m.get(key) ?? { name: i.crm_contreparties?.name ?? "—", b: [0, 0, 0, 0, 0], total: 0 };
      row.b[bucketOf(i.due_date, asOfDate)] += rest;
      row.total += rest;
      m.set(key, row);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [invoices, payments, asOf]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = aged.reduce((t, [, r]) => r.b.map((v, k) => v + t[k]), [0, 0, 0, 0, 0]);
  const grand = totals.reduce((a, b) => a + b, 0);
  const label = dir === "emise" ? tr("Client") : tr("Fournisseur");

  const exportAged = () => exportToCSV(
    aged.map(([, r]) => ({ [label]: r.name, ...Object.fromEntries(BUCKETS.map((b, k) => [b, Math.round(r.b[k])])), Total: Math.round(r.total) })),
    `balance-agee-${dir === "emise" ? "clients" : "fournisseurs"}-${asOf}`,
  );

  if (party) {
    const inv = invoices.filter((i) => (i.contrepartie_id ?? "—") === party && i.issue_date <= asOf);
    const name = inv[0]?.crm_contreparties?.name ?? "—";
    const rows = [
      ...inv.map((i) => ({ date: i.issue_date, piece: i.invoice_number ?? "", label: tr("Facture"), debit: Number(i.total), credit: 0 })),
      ...payments.filter((p) => inv.some((i) => i.id === p.invoice_id) && p.payment_date <= asOf).map((p) => ({
        date: p.payment_date, piece: p.reference ?? "", label: `${tr("Règlement")} ${inv.find((i) => i.id === p.invoice_id)?.invoice_number ?? ""}`, debit: 0, credit: Number(p.amount),
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    // Client : facture au débit, règlement au crédit. Fournisseur : l'inverse.
    const lines = rows.map((r) => dir === "emise" ? r : { ...r, debit: r.credit, credit: r.debit });
    let run = 0;
    const withBal = lines.map((r) => { run += dir === "emise" ? r.debit - r.credit : r.credit - r.debit; return { ...r, solde: run }; });
    return (
      <GhCard title="" className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <GhButton variant="ghost" onClick={() => setParty(null)}><ArrowLeft size={13} /> {tr("Retour")}</GhButton>
          <h3 className="text-sm font-semibold">{tr("Relevé de compte")} — {name}</h3>
          <span className="text-[11px] text-muted-foreground">{tr("au")} {asOf}</span>
          <GhButton variant="ghost" className="ml-auto" onClick={() => exportToCSV(withBal.map((r) => ({ Date: r.date, Pièce: r.piece, Libellé: r.label, Débit: r.debit, Crédit: r.credit, Solde: Math.round(r.solde) })), `releve-${name}-${asOf}`)}><Download size={13} /> CSV</GhButton>
        </div>
        <table className="w-full"><thead><tr><th className={th}>Date</th><th className={th}>{tr("Pièce")}</th><th className={th}>{tr("Libellé")}</th><th className={th}>{tr("Débit")}</th><th className={th}>{tr("Crédit")}</th><th className={th}>{tr("Solde")}</th></tr></thead>
          <tbody>{withBal.map((r, k) => <tr key={k}><td className={td}>{r.date}</td><td className={td}>{r.piece}</td><td className={td}>{r.label}</td><td className={td}>{r.debit ? fmt(r.debit) : ""}</td><td className={td}>{r.credit ? fmt(r.credit) : ""}</td><td className={td + " font-semibold"}>{fmt(r.solde)}</td></tr>)}</tbody>
        </table>
        {!withBal.length && <p className="text-[12px] text-muted-foreground p-3">{tr("Aucun mouvement.")}</p>}
      </GhCard>
    );
  }

  return (
    <GhCard title="" className="p-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <GhButton variant={dir === "emise" ? "primary" : "ghost"} onClick={() => setDir("emise")}>{tr("Clients (411)")}</GhButton>
        <GhButton variant={dir === "recue" ? "primary" : "ghost"} onClick={() => setDir("recue")}>{tr("Fournisseurs (401)")}</GhButton>
        <label className="text-[11px] text-muted-foreground ml-2">{tr("Au")}{" "}
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-[12px] text-foreground" />
        </label>
        <GhButton variant="ghost" className="ml-auto" onClick={exportAged}><Download size={13} /> CSV</GhButton>
      </div>
      <h3 className="text-sm font-semibold mb-2">{tr("Balance âgée")}</h3>
      <table className="w-full"><thead><tr><th className={th}>{label}</th>{BUCKETS.map((b) => <th key={b} className={th}>{tr(b)}</th>)}<th className={th}>Total</th></tr></thead>
        <tbody>
          {aged.map(([id, r]) => <tr key={id} className="cursor-pointer hover:bg-surface-2" onClick={() => setParty(id)} title={tr("Voir le relevé de compte")}>
            <td className={td + " text-primary"}>{r.name}</td>{r.b.map((v, k) => <td key={k} className={td + (k >= 3 && v > 0 ? " text-destructive" : "")}>{v ? fmt(v) : "—"}</td>)}<td className={td + " font-semibold"}>{fmt(r.total)}</td>
          </tr>)}
          {aged.length > 0 && <tr className="font-semibold"><td className={td}>Total</td>{totals.map((v, k) => <td key={k} className={td}>{fmt(v)}</td>)}<td className={td}>{fmt(grand)}</td></tr>}
        </tbody>
      </table>
      {!aged.length && <p className="text-[12px] text-muted-foreground p-3">{tr("Aucun solde ouvert à cette date.")}</p>}
      <p className="text-[11px] text-muted-foreground mt-3">{tr("Cliquez sur un tiers pour afficher son relevé de compte.")}</p>
    </GhCard>
  );
}
