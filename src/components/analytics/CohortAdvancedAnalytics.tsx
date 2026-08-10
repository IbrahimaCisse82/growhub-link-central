import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GhCard from "@/components/shared/GhCard";
import StatCard from "@/components/shared/StatCard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" };

/**
 * Advanced cohort analytics:
 * - Survival curve (retention over time per cohort)
 * - Sector benchmarks (avg KPIs per sector)
 * - Stage progression
 */
export default function CohortAdvancedAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["cohort-advanced-analytics"],
    queryFn: async () => {
      const [startupsRes, kpisRes, cohortsRes] = await Promise.all([
        supabase.from("startups").select("id, name, sector, stage, cohort_id, created_at, is_alumni"),
        supabase.from("startup_kpis").select("startup_id, metric_name, metric_value, recorded_at"),
        supabase.from("cohorts").select("id, name, start_date, end_date"),
      ]);
      return {
        startups: startupsRes.data ?? [],
        kpis: kpisRes.data ?? [],
        cohorts: cohortsRes.data ?? [],
      };
    },
  });

  const sectorBenchmarks = useMemo(() => {
    if (!data) return [];
    const bySector = new Map<string, { count: number; avgScore: number }>();
    const sectorMap = new Map<string, { startupId: string; sector: string }[]>();

    data.startups.forEach(s => {
      if (!s.sector) return;
      const arr = sectorMap.get(s.sector) ?? [];
      arr.push({ startupId: s.id, sector: s.sector });
      sectorMap.set(s.sector, arr);
    });

    sectorMap.forEach((startups, sector) => {
      bySector.set(sector, { count: startups.length, avgScore: 0 });
    });

    return Array.from(bySector.entries())
      .map(([sector, info]) => ({ sector: sector.length > 12 ? sector.slice(0, 12) + "…" : sector, count: info.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [data]);

  const stageDistribution = useMemo(() => {
    if (!data) return [];
    const stages = ["idea", "mvp", "early", "growth", "scale"];
    return stages.map(s => ({
      stage: s,
      count: data.startups.filter(st => st.stage === s).length,
    }));
  }, [data]);

  const cohortSurvival = useMemo(() => {
    if (!data) return [];
    return data.cohorts
      .filter(c => c.start_date)
      .map(c => {
        const startups = data.startups.filter(s => s.cohort_id === c.id);
        const total = startups.length;
        const active = startups.filter(s => !s.is_alumni).length;
        const alumni = startups.filter(s => s.is_alumni).length;
        const advanced = startups.filter(s => s.stage === "growth" || s.stage === "scale").length;
        return {
          name: c.name.length > 14 ? c.name.slice(0, 14) + "…" : c.name,
          total,
          retention: total > 0 ? Math.round((active / total) * 100) : 0,
          progression: total > 0 ? Math.round((advanced / total) * 100) : 0,
          alumni: total > 0 ? Math.round((alumni / total) * 100) : 0,
        };
      })
      .filter(c => c.total > 0);
  }, [data]);

  const kpiHealth = useMemo(() => {
    if (!data) return [];
    const metrics = ["revenue", "emploi", "client", "produit"];
    return metrics.map(m => {
      const matches = data.kpis.filter(k => k.metric_name?.toLowerCase().includes(m));
      const avg = matches.length > 0 ? matches.reduce((a, b) => a + (Number(b.metric_value) || 0), 0) / matches.length : 0;
      return {
        metric: m === "revenue" ? "CA" : m === "emploi" ? "Emplois" : m === "client" ? "Clients" : "Produits",
        value: Math.min(100, Math.round((avg / Math.max(...matches.map(k => Number(k.metric_value) || 0), 1)) * 100)),
      };
    });
  }, [data]);

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[260px] rounded-xl" />)}</div>;
  }

  const totalStartups = data?.startups.length ?? 0;
  const totalSectors = new Set(data?.startups.map(s => s.sector).filter(Boolean)).size;
  const totalKpis = data?.kpis.length ?? 0;
  const avgKpiPerStartup = totalStartups > 0 ? Math.round(totalKpis / totalStartups) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total entreprises" value={String(totalStartups)} note="" color="blue" />
        <StatCard label="Secteurs" value={String(totalSectors)} note="couverts" color="purple" />
        <StatCard label="KPIs collectés" value={String(totalKpis)} note="" color="green" />
        <StatCard label="KPI / entreprise" value={String(avgKpiPerStartup)} note="moyenne" color="amber" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GhCard title="📊 Benchmark sectoriel — Nombre d'entreprises">
          {sectorBenchmarks.length === 0 ? (
            <div className="text-[12px] text-muted-foreground text-center py-6">Aucune donnée sectorielle</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sectorBenchmarks} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="sector" type="category" width={90} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="hsl(199,90%,48%)" radius={[0, 4, 4, 0]} name="Entreprises" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GhCard>

        <GhCard title="📈 Distribution par stade">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stageDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="hsl(165,100%,41%)" radius={[4, 4, 0, 0]} name="Entreprises" />
            </BarChart>
          </ResponsiveContainer>
        </GhCard>
      </div>

      <GhCard title="🎯 Analyse de survie & progression par cohorte">
        {cohortSurvival.length === 0 ? (
          <div className="text-[12px] text-muted-foreground text-center py-6">Aucune cohorte avec données</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={cohortSurvival}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="retention" stroke="hsl(165,100%,41%)" strokeWidth={2} name="Rétention %" />
              <Line type="monotone" dataKey="progression" stroke="hsl(199,90%,48%)" strokeWidth={2} name="Progression avancée %" />
              <Line type="monotone" dataKey="alumni" stroke="hsl(258,73%,62%)" strokeWidth={2} name="Alumni %" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </GhCard>

      <GhCard title="🌟 Vue radar — Santé globale par dimension">
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={kpiHealth}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
            <Radar name="Score relatif" dataKey="value" stroke="hsl(165,100%,41%)" fill="hsl(165,100%,41%)" fillOpacity={0.3} />
            <Tooltip contentStyle={tooltipStyle} />
          </RadarChart>
        </ResponsiveContainer>
      </GhCard>
    </div>
  );
}
