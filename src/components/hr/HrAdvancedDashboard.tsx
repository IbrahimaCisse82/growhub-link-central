import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useHrEmployees } from "@/hooks/useHrEmployees";
import { useHrLeaves } from "@/hooks/useHrLeaves";
import { useHrContracts } from "@/hooks/useHrContracts";
import {
  Users,
  TrendingDown,
  Cake,
  Briefcase,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(210, 80%, 60%)", "hsl(40, 90%, 55%)", "hsl(280, 60%, 60%)"];

interface KpiTileProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Users;
  tone?: "default" | "warning" | "danger";
}
function KpiTile({ label, value, hint, icon: Icon, tone = "default" }: KpiTileProps) {
  const toneClasses =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-600"
        : "text-primary";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={`text-2xl font-bold mt-1 ${toneClasses}`}>{value}</div>
          {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
        </div>
        <Icon className={`h-5 w-5 ${toneClasses}`} />
      </div>
    </Card>
  );
}

function ageFromDate(d?: string | null): number | null {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function tenureYears(d?: string | null): number | null {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return (Date.now() - date.getTime()) / (365.25 * 24 * 3600 * 1000);
}

export default function HrAdvancedDashboard() {
  const { employees } = useHrEmployees();
  const { leaves } = useHrLeaves();
  const { contracts } = useHrContracts();

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.is_active);
    const total = active.length;
    const sexCount = active.reduce(
      (acc, e) => {
        if (e.sexe === "F") acc.f += 1;
        else acc.m += 1;
        return acc;
      },
      { m: 0, f: 0 },
    );

    // Pyramide des âges
    const ageBuckets = ["18-25", "26-35", "36-45", "46-55", "56+"].map((label) => ({
      label,
      Hommes: 0,
      Femmes: 0,
    }));
    for (const e of active) {
      const age = ageFromDate(e.date_naissance);
      if (age == null) continue;
      const idx = age <= 25 ? 0 : age <= 35 ? 1 : age <= 45 ? 2 : age <= 55 ? 3 : 4;
      const key = e.sexe === "F" ? "Femmes" : "Hommes";
      ageBuckets[idx][key] += 1;
    }

    // Ancienneté moyenne
    const tenures = active.map((e) => tenureYears(e.date_entree)).filter((t): t is number => t != null);
    const avgTenure = tenures.length > 0 ? tenures.reduce((s, t) => s + t, 0) / tenures.length : 0;

    // Statuts
    const statutMap = new Map<string, number>();
    for (const e of active) {
      const s = e.statut || "Non défini";
      statutMap.set(s, (statutMap.get(s) ?? 0) + 1);
    }
    const statuts = Array.from(statutMap.entries()).map(([name, value]) => ({ name, value }));

    // Type de contrat
    const contratMap = new Map<string, number>();
    for (const e of active) {
      const c = e.contrat || "Non défini";
      contratMap.set(c, (contratMap.get(c) ?? 0) + 1);
    }
    const contrats = Array.from(contratMap.entries()).map(([name, value]) => ({ name, value }));

    // Turnover (12 derniers mois) : nb d'employés archivés / effectif moyen
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const departed = employees.filter(
      (e) => e.archived_at && new Date(e.archived_at) >= oneYearAgo,
    ).length;
    const turnoverPct = total > 0 ? (departed / (total + departed)) * 100 : 0;

    // Absentéisme (jours d'absence sur 12 mois / jours ouvrés théoriques)
    const recentLeaves = leaves.filter((l) => {
      if (l.status !== "approved") return false;
      const end = new Date(l.end_date);
      return end >= oneYearAgo;
    });
    const absenceDays = recentLeaves.reduce((s, l) => s + Number(l.days_count ?? 0), 0);
    const workingDaysYear = total * 220; // approximation jours ouvrés
    const absenteismPct = workingDaysYear > 0 ? (absenceDays / workingDaysYear) * 100 : 0;

    // Contrats expirant dans les 60 jours
    const in60days = new Date();
    in60days.setDate(in60days.getDate() + 60);
    const expiringContracts = (contracts ?? []).filter((c) => {
      if (!c.end_date || !c.is_active) return false;
      const end = new Date(c.end_date);
      return end >= new Date() && end <= in60days;
    }).length;

    // Anniversaires du mois
    const today = new Date();
    const birthdaysThisMonth = active.filter((e) => {
      if (!e.date_naissance) return false;
      const d = new Date(e.date_naissance);
      return d.getMonth() === today.getMonth();
    }).length;

    // Anniversaires de service du mois
    const workAnniversariesThisMonth = active.filter((e) => {
      if (!e.date_entree) return false;
      const d = new Date(e.date_entree);
      return d.getMonth() === today.getMonth() && d.getFullYear() < today.getFullYear();
    }).length;

    return {
      total,
      sexCount,
      ageBuckets,
      avgTenure,
      statuts,
      contrats,
      turnoverPct,
      absenteismPct,
      expiringContracts,
      birthdaysThisMonth,
      workAnniversariesThisMonth,
      departed,
      absenceDays,
    };
  }, [employees, leaves, contracts]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile
          label="Effectif actif"
          value={stats.total}
          hint={`${stats.sexCount.m} H · ${stats.sexCount.f} F`}
          icon={Users}
        />
        <KpiTile
          label="Turnover 12 mois"
          value={`${stats.turnoverPct.toFixed(1)}%`}
          hint={`${stats.departed} départ(s)`}
          icon={TrendingDown}
          tone={stats.turnoverPct > 15 ? "danger" : stats.turnoverPct > 10 ? "warning" : "default"}
        />
        <KpiTile
          label="Absentéisme 12 mois"
          value={`${stats.absenteismPct.toFixed(1)}%`}
          hint={`${stats.absenceDays.toFixed(0)} jours absences`}
          icon={CalendarClock}
          tone={stats.absenteismPct > 8 ? "danger" : stats.absenteismPct > 5 ? "warning" : "default"}
        />
        <KpiTile
          label="Ancienneté moyenne"
          value={`${stats.avgTenure.toFixed(1)} ans`}
          icon={Briefcase}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiTile
          label="Contrats à renouveler (60j)"
          value={stats.expiringContracts}
          icon={AlertTriangle}
          tone={stats.expiringContracts > 0 ? "warning" : "default"}
        />
        <KpiTile
          label="Anniversaires ce mois"
          value={stats.birthdaysThisMonth}
          icon={Cake}
        />
        <KpiTile
          label="Anniversaires de service"
          value={stats.workAnniversariesThisMonth}
          hint="ce mois-ci"
          icon={Briefcase}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="font-semibold mb-3">Pyramide des âges</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.ageBuckets} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis type="category" dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Hommes" fill="hsl(210, 80%, 55%)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Femmes" fill="hsl(330, 70%, 60%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <div className="font-semibold mb-3">Répartition par statut</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={stats.statuts}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(e) => `${e.name} (${e.value})`}
                labelLine={false}
                fontSize={11}
              >
                {stats.statuts.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <div className="font-semibold mb-3">Répartition par type de contrat</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.contrats}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
