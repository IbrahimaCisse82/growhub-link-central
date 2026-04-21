import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, Clock, Users, Globe } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];
const fmt = (n: number, cur = "XOF") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);

export default function CrmAnalyticsTab() {
  const { data: invoices } = useQuery({
    queryKey: ["crm-analytics-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_invoices")
        .select("id, direction, status, total, amount_paid, currency, issue_date, due_date, paid_at, contrepartie:crm_contreparties(name)");
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    if (!invoices) return null;
    const emises = invoices.filter((i: any) => i.direction === "emise");

    // Monthly revenue (last 12 months)
    const now = new Date();
    const monthsArr: { key: string; label: string; ca: number; encaisse: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsArr.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        ca: 0,
        encaisse: 0,
      });
    }
    const monthIdx: Record<string, number> = {};
    monthsArr.forEach((m, i) => (monthIdx[m.key] = i));
    emises.forEach((i: any) => {
      const k = i.issue_date?.slice(0, 7);
      if (k && monthIdx[k] !== undefined) {
        monthsArr[monthIdx[k]].ca += Number(i.total || 0);
        monthsArr[monthIdx[k]].encaisse += Number(i.amount_paid || 0);
      }
    });

    // Top clients
    const byClient: Record<string, { name: string; total: number; count: number }> = {};
    emises.forEach((i: any) => {
      const name = (i.contrepartie as any)?.name || "—";
      if (!byClient[name]) byClient[name] = { name, total: 0, count: 0 };
      byClient[name].total += Number(i.total || 0);
      byClient[name].count += 1;
    });
    const topClients = Object.values(byClient).sort((a, b) => b.total - a.total).slice(0, 5);

    // Currency split
    const byCurrency: Record<string, number> = {};
    invoices.forEach((i: any) => {
      byCurrency[i.currency] = (byCurrency[i.currency] || 0) + Number(i.total || 0);
    });
    const currencyData = Object.entries(byCurrency).map(([name, value]) => ({ name, value }));

    // DSO: avg days between issue_date and paid_at for paid invoices
    const paid = emises.filter((i: any) => i.status === "payee" && i.paid_at);
    const dso = paid.length
      ? Math.round(
          paid.reduce((s: number, i: any) => {
            const days = (new Date(i.paid_at).getTime() - new Date(i.issue_date).getTime()) / 86400000;
            return s + days;
          }, 0) / paid.length
        )
      : 0;

    const totalCA = emises.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
    const collectionRate = totalCA > 0
      ? Math.round((emises.reduce((s: number, i: any) => s + Number(i.amount_paid || 0), 0) / totalCA) * 100)
      : 0;

    return { monthsArr, topClients, currencyData, dso, totalCA, collectionRate, paidCount: paid.length };
  }, [invoices]);

  if (!stats) return <div className="text-sm text-muted-foreground p-8 text-center">Chargement…</div>;

  return (
    <div className="space-y-4">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp size={14} /> CA total (émis)</div>
          <div className="text-xl font-bold mt-1">{fmt(stats.totalCA)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock size={14} /> DSO moyen</div>
          <div className="text-xl font-bold mt-1">{stats.dso} <span className="text-sm text-muted-foreground font-normal">jours</span></div>
          <div className="text-[10px] text-muted-foreground mt-0.5">sur {stats.paidCount} factures payées</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users size={14} /> Taux d'encaissement</div>
          <div className="text-xl font-bold mt-1">{stats.collectionRate}%</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Globe size={14} /> Devises actives</div>
          <div className="text-xl font-bold mt-1">{stats.currencyData.length}</div>
        </Card>
      </div>

      {/* Monthly revenue */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Chiffre d'affaires & encaissements (12 derniers mois)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={stats.monthsArr}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" fontSize={11} />
            <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="ca" name="CA facturé" stroke="hsl(var(--primary))" strokeWidth={2} />
            <Line type="monotone" dataKey="encaisse" name="Encaissé" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top clients */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Top 5 clients (par CA)</h3>
          {stats.topClients.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.topClients} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" fontSize={11} width={120} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Currency split */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Répartition par devise</h3>
          {stats.currencyData.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={stats.currencyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                  {stats.currencyData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => fmt(v, n)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
