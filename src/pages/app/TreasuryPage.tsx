import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, CartesianGrid } from "recharts";
import SectionHeader from "@/components/shared/SectionHeader";
import Pill from "@/components/shared/Pill";
import GhButton from "@/components/shared/GhButton";
import { useTreasuryRows, useCashflowSummary, type TreasuryRow } from "@/hooks/useTreasury";

const fmtXof = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " XOF";
const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + " Md";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + " M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + " K";
  return String(n);
};

const SOURCE_LABELS: Record<string, string> = {
  grant_disbursement: "Subvention",
  invoice_in: "Facture émise",
  invoice_out: "Facture fournisseur",
  payroll: "Paie",
  purchase_order: "Bon de commande",
  expense: "Note de frais",
};

export default function TreasuryPage() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() - 6, 1).toISOString().slice(0, 10);
  const to = new Date(today.getFullYear(), today.getMonth() + 6, 0).toISOString().slice(0, 10);
  const { data: rows = [], isLoading } = useTreasuryRows({ from, to });
  const { data: summary = [] } = useCashflowSummary(from, to);
  const [sourceFilter, setSourceFilter] = useState<string>("");

  const kpis = useMemo(() => {
    const inflow = rows.filter((r) => r.direction === "in").reduce((s, r) => s + Number(r.amount_xof), 0);
    const outflow = rows.filter((r) => r.direction === "out").reduce((s, r) => s + Number(r.amount_xof), 0);
    const realized = rows.filter((r) => r.status === "realized").reduce((s, r) => s + (r.direction === "in" ? Number(r.amount_xof) : -Number(r.amount_xof)), 0);
    return { inflow, outflow, net: inflow - outflow, realized };
  }, [rows]);

  const chartData = summary.map((s) => ({
    month: new Date(s.month_start).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
    Entrées: Number(s.inflow_xof),
    Sorties: Number(s.outflow_xof),
    Solde: Number(s.cumulative_xof),
  }));

  const filtered = sourceFilter ? rows.filter((r) => r.source === sourceFilter) : rows;

  const exportCsv = () => {
    const headers = ["date", "source", "direction", "montant_xof", "libelle", "statut"];
    const csv = [
      headers.join(","),
      ...filtered.map((r) => [r.occurred_on, r.source, r.direction, r.amount_xof, `"${r.label.replace(/"/g, '""')}"`, r.status].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tresorerie-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionHeader title="Trésorerie consolidée" subtitle="Cashflow agrégé : subventions, factures, paies, BC, notes de frais" />
        <GhButton onClick={exportCsv} variant="secondary" size="sm"><Download size={14} /> Exporter CSV</GhButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard icon={ArrowUpRight} label="Entrées (12 mois)" value={fmtXof(kpis.inflow)} color="green" />
        <KpiCard icon={ArrowDownRight} label="Sorties (12 mois)" value={fmtXof(kpis.outflow)} color="rose" />
        <KpiCard icon={Wallet} label="Solde net période" value={fmtXof(kpis.net)} color={kpis.net >= 0 ? "blue" : "rose"} />
        <KpiCard icon={kpis.realized >= 0 ? TrendingUp : TrendingDown} label="Réalisé" value={fmtXof(kpis.realized)} color={kpis.realized >= 0 ? "green" : "rose"} />
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-display font-bold text-foreground mb-4">Cashflow mensuel (entrées vs sorties)</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={fmtCompact} />
              <Tooltip formatter={(v: number) => fmtXof(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Bar dataKey="Entrées" fill="hsl(var(--gh-green))" />
              <Bar dataKey="Sorties" fill="hsl(var(--gh-rose))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-display font-bold text-foreground mb-4">Solde cumulé prévisionnel</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={fmtCompact} />
              <Tooltip formatter={(v: number) => fmtXof(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="Solde" stroke="hsl(var(--gh-blue))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-display font-bold text-foreground">Détail des flux ({filtered.length})</h3>
          <select className="h-9 rounded-lg border border-input bg-secondary px-3 text-sm" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">Toutes sources</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {isLoading ? <div className="text-sm text-muted-foreground">Chargement…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase font-mono">
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-left py-2 pr-4">Source</th>
                  <th className="text-left py-2 pr-4">Libellé</th>
                  <th className="text-right py-2 pr-4">Montant</th>
                  <th className="text-left py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((r: TreasuryRow) => (
                  <tr key={`${r.source}-${r.source_id}`} className="border-b border-border/40 hover:bg-surface-2">
                    <td className="py-2 pr-4 text-muted-foreground">{r.occurred_on}</td>
                    <td className="py-2 pr-4"><Pill color="blue">{SOURCE_LABELS[r.source] ?? r.source}</Pill></td>
                    <td className="py-2 pr-4 text-foreground">{r.label}</td>
                    <td className={`py-2 pr-4 text-right font-mono font-medium ${r.direction === "in" ? "text-gh-green" : "text-gh-rose"}`}>
                      {r.direction === "in" ? "+" : "−"} {fmtXof(Number(r.amount_xof))}
                    </td>
                    <td className="py-2"><Pill color={r.status === "realized" ? "green" : r.status === "partial" ? "blue" : "gray"}>{r.status}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 100 && <div className="text-xs text-muted-foreground mt-3">Affichage limité à 100 lignes. Exporter en CSV pour le détail complet.</div>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: "green" | "rose" | "blue" }) {
  const colorCls = { green: "text-gh-green", rose: "text-gh-rose", blue: "text-gh-blue" }[color];
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-mono uppercase">{label}</span>
        <Icon className={colorCls} size={18} />
      </div>
      <div className={`text-xl font-display font-bold ${colorCls}`}>{value}</div>
    </div>
  );
}
