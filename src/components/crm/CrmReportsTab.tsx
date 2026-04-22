import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, AreaChart, Area,
} from "recharts";
import { FileDown, TrendingUp, Wallet, AlertCircle, Calendar } from "lucide-react";
import { exportCrmReportPdf } from "@/lib/crmReportPdf";

const fmt = (n: number, cur = "XOF") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);

export default function CrmReportsTab() {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(todayStr);

  const { data: invoices } = useQuery({
    queryKey: ["crm-report-invoices", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_invoices")
        .select("id, direction, status, total, amount_paid, currency, issue_date, due_date, paid_at, contrepartie:crm_contreparties(name)")
        .gte("issue_date", from)
        .lte("issue_date", to);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const list = invoices ?? [];
    const emises = list.filter((i: any) => i.direction === "emise");

    const totalCA = emises.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
    const totalEncaisse = emises.reduce((s: number, i: any) => s + Number(i.amount_paid || 0), 0);
    const totalImpaye = emises
      .filter((i: any) => i.status !== "annulee")
      .reduce((s: number, i: any) => s + (Number(i.total) - Number(i.amount_paid || 0)), 0);

    const collectionRate = totalCA > 0 ? Math.round((totalEncaisse / totalCA) * 100) : 0;

    const paid = emises.filter((i: any) => i.status === "payee" && i.paid_at);
    const dso = paid.length
      ? Math.round(
          paid.reduce((s: number, i: any) => {
            return s + (new Date(i.paid_at).getTime() - new Date(i.issue_date).getTime()) / 86400000;
          }, 0) / paid.length,
        )
      : 0;

    // Top clients
    const byClient: Record<string, { name: string; total: number; count: number }> = {};
    emises.forEach((i: any) => {
      const name = (i.contrepartie as any)?.name || "—";
      if (!byClient[name]) byClient[name] = { name, total: 0, count: 0 };
      byClient[name].total += Number(i.total || 0);
      byClient[name].count += 1;
    });
    const topClients = Object.values(byClient).sort((a, b) => b.total - a.total).slice(0, 10);

    // Monthly
    const fromD = new Date(from);
    const toD = new Date(to);
    const months: { key: string; label: string; ca: number; encaisse: number }[] = [];
    const cursor = new Date(fromD.getFullYear(), fromD.getMonth(), 1);
    while (cursor <= toD) {
      months.push({
        key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
        label: cursor.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        ca: 0,
        encaisse: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const idx: Record<string, number> = {};
    months.forEach((m, i) => (idx[m.key] = i));
    emises.forEach((i: any) => {
      const k = i.issue_date?.slice(0, 7);
      if (k && idx[k] !== undefined) {
        months[idx[k]].ca += Number(i.total || 0);
        months[idx[k]].encaisse += Number(i.amount_paid || 0);
      }
    });

    // Cash forecast: factures impayées groupées par échéance future
    const buckets: Record<string, number> = {
      "Échu (à recouvrer)": 0,
      "0-30 j": 0,
      "31-60 j": 0,
      "61-90 j": 0,
      "> 90 j": 0,
    };
    const now = Date.now();
    emises.forEach((i: any) => {
      if (i.status === "payee" || i.status === "annulee") return;
      const remaining = Number(i.total) - Number(i.amount_paid || 0);
      if (remaining <= 0) return;
      if (!i.due_date) {
        buckets["0-30 j"] += remaining;
        return;
      }
      const days = Math.floor((new Date(i.due_date).getTime() - now) / 86400000);
      if (days < 0) buckets["Échu (à recouvrer)"] += remaining;
      else if (days <= 30) buckets["0-30 j"] += remaining;
      else if (days <= 60) buckets["31-60 j"] += remaining;
      else if (days <= 90) buckets["61-90 j"] += remaining;
      else buckets["> 90 j"] += remaining;
    });
    const cashForecast = Object.entries(buckets).map(([label, expected]) => ({ label, expected }));

    return { totalCA, totalEncaisse, totalImpaye, collectionRate, dso, topClients, months, cashForecast };
  }, [invoices, from, to]);

  const handleExportPdf = () => {
    exportCrmReportPdf({
      periodLabel: `${new Date(from).toLocaleDateString("fr-FR")} → ${new Date(to).toLocaleDateString("fr-FR")}`,
      totalCA: stats.totalCA,
      totalEncaisse: stats.totalEncaisse,
      totalImpaye: stats.totalImpaye,
      collectionRate: stats.collectionRate,
      dso: stats.dso,
      topClients: stats.topClients,
      monthly: stats.months,
      cashForecast: stats.cashForecast,
    });
  };

  return (
    <div className="space-y-4">
      {/* Filtres période */}
      <Card className="p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label className="text-xs">Du</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <Label className="text-xs">Au</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => { setFrom(yearStart); setTo(todayStr); }}>
              <Calendar size={12} className="mr-1" /> Année en cours
            </Button>
            <Button onClick={handleExportPdf}>
              <FileDown size={14} className="mr-1" /> Export PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp size={14} /> CA facturé</div>
          <div className="text-xl font-bold mt-1">{fmt(stats.totalCA)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet size={14} /> Encaissé</div>
          <div className="text-xl font-bold mt-1 text-emerald-600">{fmt(stats.totalEncaisse)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertCircle size={14} /> Impayé</div>
          <div className="text-xl font-bold mt-1 text-red-600">{fmt(stats.totalImpaye)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">Taux d'encaissement</div>
          <div className="text-xl font-bold mt-1">{stats.collectionRate}% <span className="text-xs text-muted-foreground font-normal">DSO {stats.dso}j</span></div>
        </Card>
      </div>

      {/* Évolution mensuelle */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Évolution mensuelle</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={stats.months}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" fontSize={11} />
            <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="ca" name="CA facturé" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
            <Area type="monotone" dataKey="encaisse" name="Encaissé" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top clients */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Top 10 clients (CA sur la période)</h3>
          {stats.topClients.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">Aucune donnée</div>
          ) : (
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
              {stats.topClients.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground w-5">#{i + 1}</span>
                    <span className="truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground">({c.count} fact.)</span>
                  </div>
                  <span className="font-mono font-semibold">{fmt(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Cash forecast */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Trésorerie prévisionnelle (impayés à recouvrer)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.cashForecast}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" fontSize={10} />
              <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Bar dataKey="expected" name="Montant attendu" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
