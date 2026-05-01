import { useProjectCostBreakdown } from "@/hooks/useProjectCostBreakdown";
import GhCard from "@/components/shared/GhCard";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const SOURCE_LABELS: Record<string, string> = {
  payroll: "Paie",
  expense: "Notes de frais",
  purchase_order: "Bons de commande",
  invoice: "Factures fournisseurs",
};
const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(210, 80%, 60%)", "hsl(40, 90%, 55%)"];
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

export default function ProjectCostBreakdownPanel({ projectId }: { projectId: string }) {
  const { data, isLoading } = useProjectCostBreakdown(projectId);
  const total = (data ?? []).reduce((s, r) => s + Number(r.total_amount), 0);

  return (
    <GhCard title="Coûts consolidés (imputation analytique)" badge={fmt(total)}>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : !data || data.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          Aucun coût imputé à ce projet. Affectez paie, notes de frais, bons de commande ou factures pour voir la répartition.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="h-[220px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey="total_amount" nameKey="source" innerRadius={50} outerRadius={80}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend formatter={(v) => SOURCE_LABELS[v] ?? v} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {data.map((r, i) => (
              <div key={r.source} className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-[12.5px] text-foreground">{SOURCE_LABELS[r.source] ?? r.source}</span>
                  <span className="text-[10px] text-muted-foreground">({r.line_count} lignes)</span>
                </div>
                <span className="font-mono text-[12px] font-semibold text-foreground">{fmt(Number(r.total_amount))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </GhCard>
  );
}
