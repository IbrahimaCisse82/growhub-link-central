import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import StatCard from "@/components/shared/StatCard";
import { Triangle, DollarSign, FolderKanban, CircleDot, Headphones, Users, CheckSquare, BookOpen, Target, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { PipelineBarChart, StatusPieChart, TrendLineChart } from "@/components/dashboard/DashboardCharts";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { Skeleton } from "@/components/ui/skeleton";
import { useStartupsCount, useStartups } from "@/hooks/useStartups";
import { useProjects } from "@/hooks/useProjects";
import { useGrants } from "@/hooks/useGrants";
import { useApplicationsPipeline } from "@/hooks/useApplications";
import { useCohorts } from "@/hooks/useCohorts";
import { useCoachingSessions } from "@/hooks/useCoachingSessions";
import { useCourses } from "@/hooks/useCourses";
import { useEvents } from "@/hooks/useEvents";
import { useActivities } from "@/hooks/useActivities";
import { usePrograms } from "@/hooks/usePrograms";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { useStartupKpis } from "@/hooks/useStartupKpis";
import { exportToCSV } from "@/lib/exportUtils";
import { useMilestones } from "@/hooks/useMilestones";
import DashboardAlerts from "@/components/dashboard/DashboardAlerts";
import { useHrEmployees } from "@/hooks/useHrEmployees";
import { useHrContracts, useHrLeaveRequests } from "@/hooks/useHrLeaves";
import { Briefcase, AlertTriangle as AlertTriangleIcon, CalendarClock } from "lucide-react";

const statusColor: Record<string, "green" | "blue" | "amber" | "gray"> = {
  active: "green", draft: "gray", paused: "amber", completed: "blue", cancelled: "gray",
};

/* ── Period comparison helper ── */
function usePeriodComparison(items: any[] | undefined, dateField: string) {
  return useMemo(() => {
    if (!items) return { current: 0, previous: 0, pct: 0 };
    const now = new Date();
    const startCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const current = items.filter(i => new Date(i[dateField]) >= startCurrent).length;
    const previous = items.filter(i => {
      const d = new Date(i[dateField]);
      return d >= startPrev && d < startCurrent;
    }).length;
    const pct = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
    return { current, previous, pct };
  }, [items, dateField]);
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { roles, isAdmin, profile } = useAuth();
  const { t } = useTranslation();
  const isMentor = roles.includes("mentor");
  const isEntrepreneur = roles.includes("entrepreneur");

  const { data: startupsCount, isLoading: loadingStartups } = useStartupsCount();
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: grants, isLoading: loadingGrants } = useGrants();
  const { data: pipeline } = useApplicationsPipeline();
  const { data: cohorts } = useCohorts();
  const { data: sessions } = useCoachingSessions();
  const { data: courses } = useCourses();
  const { data: startups } = useStartups();
  const { data: events } = useEvents();
  const { data: activities } = useActivities();
  const { data: programs } = usePrograms();
  const { data: milestones } = useMilestones();

  const activeGrants = grants?.filter((g) => g.status === "active" || g.status === "disbursing") ?? [];
  const totalFunding = activeGrants.reduce((a, g) => a + g.amount_total, 0);
  const activeCohorts = cohorts?.filter((c) => c.status === "active").length ?? 0;
  const upcomingEvents = events?.filter(e => new Date(e.start_at) >= new Date()).slice(0, 4) ?? [];

  // Period N vs N-1 comparisons
  const projectTrend = usePeriodComparison(projects, "created_at");
  const grantTrend = usePeriodComparison(grants, "created_at");
  const sessionTrend = usePeriodComparison(sessions, "created_at");

  const pipelineSteps = [
    { key: "submitted", label: t("pipeline.received") },
    { key: "screening", label: t("pipeline.screening") },
    { key: "interview", label: t("pipeline.interview") },
    { key: "due_diligence", label: t("pipeline.dueDiligence") },
    { key: "accepted", label: t("pipeline.accepted") },
  ];

  // Mentor-specific data
  const mySessions = sessions?.filter(s => s.mentor_id === profile?.user_id) ?? [];
  const upcomingSessions = mySessions.filter(s => s.status === "planned" || s.status === "confirmed");

  // Entrepreneur-specific data
  const myStartup = startups?.find(s => s.founder_id === profile?.user_id);
  const myCoachingSessions = sessions?.filter(s => s.startup_id === myStartup?.id) ?? [];
  const myUpcomingSessions = myCoachingSessions.filter(s => s.status === "planned" || s.status === "confirmed");
  const { data: myKpis } = useStartupKpis(myStartup?.id);

  const TrendBadge = ({ pct }: { pct: number }) => {
    if (pct === 0) return null;
    const isUp = pct > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono ${isUp ? "text-green-600" : "text-destructive"}`}>
        {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {isUp ? "+" : ""}{pct}%
      </span>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <SectionHeader
        title={`${t("dash.welcome")}${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        subtitle={isAdmin ? t("dash.adminView") : isMentor ? t("dash.mentorView") : isEntrepreneur ? t("dash.entrepreneurView") : "Grow Hub Management System"}
        actions={
          <>
            <GhButton variant="secondary" onClick={() => {
              if (projects) exportToCSV(projects, "dashboard-projets", [
                { key: "name", label: t("table.project") }, { key: "status", label: t("table.status") }, { key: "progress", label: "%" },
              ]);
            }}>⤓ {t("dash.export")}</GhButton>
            <GhButton variant="primary" onClick={() => navigate("/app/entreprises")}>+ {t("dash.create")}</GhButton>
          </>
        }
      />

      {/* Alerts — all roles */}
      <DashboardAlerts milestones={milestones as any} grants={grants as any} sessions={sessions as any} events={events as any} />

      {/* KPI Stats — role-adapted */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        {isAdmin ? (
          <>
            <div onClick={() => navigate("/app/entreprises")} className="cursor-pointer"><StatCard label={t("dash.activeStartups")} value={loadingStartups ? "…" : String(startupsCount)} note="" icon={<Triangle size={20} />} color="green" sparkData={[2,4,3,6,5,8,7]} /></div>
            <div onClick={() => navigate("/app/grants")} className="cursor-pointer"><StatCard label={t("dash.funding")} value={loadingGrants ? "…" : new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(totalFunding)} note={<span className="flex items-center gap-1">{activeGrants.length} grants actifs <TrendBadge pct={grantTrend.pct} /></span>} icon={<DollarSign size={20} />} color="blue" sparkData={[10,15,12,18,22,20,25]} /></div>
            <div onClick={() => navigate("/app/projets")} className="cursor-pointer"><StatCard label={t("dash.projects")} value={loadingProjects ? "…" : String(projects?.length ?? 0)} note={<TrendBadge pct={projectTrend.pct} />} icon={<FolderKanban size={20} />} color="amber" sparkData={[3,5,4,7,6,8,9]} /></div>
            <div onClick={() => navigate("/app/cohortes")} className="cursor-pointer"><StatCard label={t("dash.activeCohorts")} value={String(activeCohorts)} note="" icon={<CircleDot size={20} />} color="purple" sparkData={[1,2,2,3,3,4,4]} /></div>
          </>
        ) : isMentor ? (
          <>
            <StatCard label={t("dash.mySessions")} value={String(mySessions.length)} note={<span className="flex items-center gap-1">{upcomingSessions.length} {t("dash.upcoming")} <TrendBadge pct={sessionTrend.pct} /></span>} icon={<Headphones size={20} />} color="blue" sparkData={[1,3,2,4,5,3,6]} />
            <StatCard label={t("dash.followedStartups")} value={String(new Set(mySessions.map(s => s.startup_id)).size)} note="" icon={<Users size={20} />} color="green" />
            <StatCard label={t("dash.completedSessions")} value={String(mySessions.filter(s => s.status === "completed").length)} note="" icon={<CheckSquare size={20} />} color="amber" />
            <StatCard label={t("dash.availableCourses")} value={String(courses?.filter(c => c.is_published).length ?? 0)} note="" icon={<BookOpen size={20} />} color="purple" />
          </>
        ) : (
          <>
            <StatCard label={t("dash.myStartup")} value={myStartup?.name ?? "—"} note={myStartup?.stage ?? ""} icon={<Triangle size={20} />} color="green" />
            <StatCard label={t("dash.score")} value={myStartup?.score != null ? `${myStartup.score}/100` : "—"} note="" icon={<Target size={20} />} color="blue" />
            <StatCard label={t("dash.projects")} value={String(projects?.filter(p => p.startup_id === myStartup?.id).length ?? 0)} note="" icon={<FolderKanban size={20} />} color="amber" />
            <StatCard label={t("dash.availableCourses")} value={String(courses?.filter(c => c.is_published).length ?? 0)} note="" icon={<BookOpen size={20} />} color="purple" />
          </>
        )}
      </div>

      {/* Period comparison card — admin only */}
      {isAdmin && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Projets ce mois", current: projectTrend.current, previous: projectTrend.previous, pct: projectTrend.pct },
            { label: "Grants ce mois", current: grantTrend.current, previous: grantTrend.previous, pct: grantTrend.pct },
            { label: "Sessions ce mois", current: sessionTrend.current, previous: sessionTrend.previous, pct: sessionTrend.pct },
          ].map(item => (
            <div key={item.label} className="bg-card border border-border rounded-xl p-3">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{item.label}</div>
              <div className="flex items-end justify-between mt-1">
                <div className="font-mono text-lg font-bold text-foreground">{item.current}</div>
                <div className="flex flex-col items-end">
                  <TrendBadge pct={item.pct} />
                  <span className="text-[9px] text-muted-foreground">vs {item.previous} mois préc.</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HR KPIs — admin only */}
      {isAdmin && <HrKpiBlock />}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        {/* Main content — role-adapted */}
        {isMentor && !isAdmin ? (
          <GhCard title={t("entrepreneur.myCoaching")} badge={String(upcomingSessions.length)} action={<GhButton variant="ghost" onClick={() => navigate("/app/coaching")}>{t("dash.viewAll")}</GhButton>} noPadding>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead><tr className="bg-secondary">
                  {[t("table.session"), t("common.date"), t("table.status")].map(h => <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>
                  {upcomingSessions.length === 0 ? (
                    <tr><td colSpan={3} className="px-3.5 py-8 text-center text-muted-foreground text-sm">{t("dash.noSessions")}</td></tr>
                  ) : upcomingSessions.slice(0, 6).map(s => (
                    <tr key={s.id} className="hover:bg-secondary transition-colors">
                      <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">{s.title}</td>
                      <td className="px-3.5 py-2.5 border-b border-border font-mono text-foreground">{new Date(s.scheduled_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-3.5 py-2.5 border-b border-border"><Pill color={s.status === "confirmed" ? "green" : "amber"}>{s.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GhCard>
        ) : isEntrepreneur && !isAdmin ? (
          <div className="flex flex-col gap-4">
            <GhCard title={t("dash.activeProjects")} badge={String(projects?.filter(p => p.startup_id === myStartup?.id).length ?? 0)} action={<GhButton variant="ghost" onClick={() => navigate("/app/projets")}>{t("dash.viewAll")}</GhButton>} noPadding>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead><tr className="bg-secondary">
                    {[t("table.project"), t("table.program"), t("table.status"), t("table.progress")].map(h => <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left whitespace-nowrap">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {(projects?.filter(p => p.startup_id === myStartup?.id) ?? []).length === 0 ? (
                      <tr><td colSpan={4} className="px-3.5 py-8 text-center text-muted-foreground text-sm">{t("dash.noProjects")}</td></tr>
                    ) : (projects?.filter(p => p.startup_id === myStartup?.id) ?? []).slice(0, 5).map(p => (
                      <tr key={p.id} className="hover:bg-secondary transition-colors cursor-pointer" onClick={() => navigate(`/app/projets/${p.id}`)}>
                        <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">{p.name}</td>
                        <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground text-[11px]">{p.programs?.name ?? "—"}</td>
                        <td className="px-3.5 py-2.5 border-b border-border"><Pill color={statusColor[p.status] ?? "gray"}>{p.status}</Pill></td>
                        <td className="px-3.5 py-2.5 border-b border-border">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all duration-600" style={{ width: `${p.progress ?? 0}%` }} />
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground w-7 text-right">{p.progress ?? 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GhCard>
            <GhCard title={t("entrepreneur.myCoaching")} badge={String(myUpcomingSessions.length)} action={<GhButton variant="ghost" onClick={() => navigate("/app/coaching")}>{t("dash.viewAll")}</GhButton>}>
              {myUpcomingSessions.length === 0 ? (
                <div className="text-[11.5px] text-muted-foreground text-center py-4">{t("entrepreneur.noCoaching")}</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {myUpcomingSessions.slice(0, 4).map(s => {
                    const d = new Date(s.scheduled_at);
                    return (
                      <div key={s.id} className="flex items-center gap-2.5 py-1.5 border-b border-border last:border-b-0">
                        <div className="text-center flex-shrink-0 w-[36px] bg-secondary rounded-md py-1.5 px-1 border border-border">
                          <div className="font-mono text-sm font-bold text-foreground leading-none">{d.getDate()}</div>
                          <div className="font-mono text-[8px] text-muted-foreground uppercase mt-0.5">{d.toLocaleDateString("fr-FR", { month: "short" })}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-foreground truncate">{s.title}</div>
                          <div className="text-[10px] text-muted-foreground">{d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                        <Pill color={s.status === "confirmed" ? "green" : "amber"}>{s.status}</Pill>
                      </div>
                    );
                  })}
                </div>
              )}
            </GhCard>
          </div>
        ) : (
          <GhCard title={t("dash.activeProjects")} badge={String(projects?.length ?? 0)} action={<GhButton variant="ghost" onClick={() => navigate("/app/projets")}>{t("dash.viewAll")}</GhButton>} noPadding>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="bg-secondary">
                    {[t("table.project"), t("table.startup"), t("table.program"), t("table.status"), t("table.progress")].map((h) => (
                      <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingProjects ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-3.5 py-2.5 border-b border-border"><Skeleton className="h-4 w-20" /></td>)}</tr>
                    ))
                  ) : projects?.length === 0 ? (
                    <tr><td colSpan={5} className="px-3.5 py-8 text-center text-muted-foreground text-sm">{t("dash.noProjects")}</td></tr>
                  ) : (
                    projects?.slice(0, 6).map((p) => (
                      <tr key={p.id} className="hover:bg-secondary transition-colors cursor-pointer" onClick={() => navigate(`/app/projets/${p.id}`)}>
                        <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">{p.name}</td>
                        <td className="px-3.5 py-2.5 border-b border-border text-foreground">{p.startups?.name ?? "—"}</td>
                        <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground text-[11px]">{p.programs?.name ?? "—"}</td>
                        <td className="px-3.5 py-2.5 border-b border-border"><Pill color={statusColor[p.status] ?? "gray"}>{p.status}</Pill></td>
                        <td className="px-3.5 py-2.5 border-b border-border">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all duration-600" style={{ width: `${p.progress ?? 0}%` }} />
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground w-7 text-right">{p.progress ?? 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GhCard>
        )}

        {/* Sidebar — Pipeline + Quick Access */}
        <div className="flex flex-col gap-4">
          {isAdmin ? (
            <>
              <GhCard title={t("dash.pipeline")} action={<GhButton variant="ghost" onClick={() => navigate("/app/candidatures")}>{t("dash.viewAll")}</GhButton>}>
                {pipeline ? (
                  <PipelineBarChart data={pipelineSteps.map(step => ({ label: step.label, value: Number(pipeline[step.key as keyof typeof pipeline] ?? 0) }))} />
                ) : (
                  <div className="flex flex-col gap-2">
                    {pipelineSteps.map((step) => (
                      <div key={step.key} className="flex justify-between items-center py-1.5 border-b border-border last:border-b-0">
                        <span className="text-[11.5px] text-muted-foreground">{step.label}</span>
                        <span className="font-mono text-sm font-semibold text-foreground">—</span>
                      </div>
                    ))}
                  </div>
                )}
              </GhCard>
              {projects && projects.length > 0 && (
                <GhCard title={t("dash.projectDistribution") || "Répartition projets"}>
                  <StatusPieChart data={[
                    { name: "Actif", value: projects.filter(p => p.status === "active").length },
                    { name: "Brouillon", value: projects.filter(p => p.status === "draft").length },
                    { name: "En pause", value: projects.filter(p => p.status === "paused").length },
                    { name: "Terminé", value: projects.filter(p => p.status === "completed").length },
                  ]} />
                  <div className="flex flex-wrap gap-2 mt-2 justify-center">
                    {[
                      { label: "Actif", color: "bg-primary" },
                      { label: "Brouillon", color: "bg-accent" },
                      { label: "En pause", color: "bg-[hsl(142,71%,45%)]" },
                      { label: "Terminé", color: "bg-[hsl(38,92%,50%)]" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span className="text-[10px] text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </GhCard>
              )}
            </>
          ) : isEntrepreneur && !isMentor ? (
            <GhCard title={t("entrepreneur.myKpis")} action={<GhButton variant="ghost" onClick={() => myStartup && navigate(`/app/entreprises/${myStartup.id}`)}>{t("dash.viewAll")}</GhButton>}>
              {!myKpis || myKpis.length === 0 ? (
                <div className="text-[11.5px] text-muted-foreground text-center py-4">{t("entrepreneur.noKpis")}</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {myKpis.slice(0, 5).map(kpi => (
                    <div key={kpi.id} className="flex justify-between items-center py-1.5 border-b border-border last:border-b-0">
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-medium text-foreground truncate">{kpi.metric_name}</div>
                        <div className="text-[9px] text-muted-foreground font-mono">{kpi.period} · {kpi.unit ?? ""}</div>
                      </div>
                      <span className="font-mono text-sm font-bold text-primary">{Number(kpi.metric_value).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </GhCard>
          ) : (
            <GhCard title={t("dash.quickAccess")}>
              <div className="flex flex-col gap-2">
                {[
                  { label: t("common.myCourses"), path: "/app/lms", icon: "📚" },
                  { label: t("nav.events"), path: "/app/evenements", icon: "📅" },
                  { label: t("nav.resources"), path: "/app/ressources", icon: "📁" },
                  { label: t("common.myProfile"), path: "/app/profil", icon: "👤" },
                ].map(item => (
                  <div key={item.path} onClick={() => navigate(item.path)} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-secondary cursor-pointer transition-colors">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[12.5px] font-medium text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </GhCard>
          )}

          {isEntrepreneur && !isAdmin && (
            <GhCard title={t("dash.quickAccess")}>
              <div className="flex flex-col gap-2">
                {[
                  { label: t("common.myCourses"), path: "/app/lms", icon: "📚" },
                  { label: t("nav.scheduling"), path: "/app/rdv", icon: "📅" },
                  { label: t("nav.resources"), path: "/app/ressources", icon: "📁" },
                  { label: t("nav.messaging"), path: "/app/messagerie", icon: "💬" },
                  { label: t("common.myProfile"), path: "/app/profil", icon: "👤" },
                ].map(item => (
                  <div key={item.path} onClick={() => navigate(item.path)} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-secondary cursor-pointer transition-colors">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[12.5px] font-medium text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </GhCard>
          )}

          {upcomingEvents.length > 0 && (
            <GhCard title={t("dash.upcomingEvents")} action={<GhButton variant="ghost" onClick={() => navigate("/app/evenements")}>{t("dash.viewAll")}</GhButton>}>
              <div className="flex flex-col gap-2">
                {upcomingEvents.map(e => {
                  const d = new Date(e.start_at);
                  return (
                    <div key={e.id} className="flex items-center gap-2.5 py-1.5">
                      <div className="text-center flex-shrink-0 w-[36px] bg-secondary rounded-md py-1.5 px-1 border border-border">
                        <div className="font-mono text-sm font-bold text-foreground leading-none">{d.getDate()}</div>
                        <div className="font-mono text-[8px] text-muted-foreground uppercase mt-0.5">{d.toLocaleDateString("fr-FR", { month: "short" })}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-foreground truncate">{e.title}</div>
                        <div className="text-[10px] text-muted-foreground">{e.location ?? (e.is_online ? "En ligne" : "—")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GhCard>
          )}
        </div>
      </div>

      {/* Bottom row — admin only */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <GhCard title={t("dash.activeFunding")} action={<GhButton variant="ghost" onClick={() => navigate("/app/grants")}>{t("dash.viewAll")}</GhButton>}>
            {loadingGrants ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 rounded" />)
            ) : activeGrants.length === 0 ? (
              <div className="text-[11.5px] text-muted-foreground text-center py-4">{t("dash.noFunding")}</div>
            ) : (
              <>
                <TrendLineChart
                  data={activeGrants.slice(0, 6).map(g => ({
                    label: g.code || g.name.substring(0, 8),
                    value: g.amount_total > 0 ? Math.round(((g.amount_disbursed ?? 0) / g.amount_total) * 100) : 0,
                  }))}
                  color="hsl(var(--accent))"
                />
                <div className="mt-3 flex flex-col gap-2">
                  {activeGrants.slice(0, 4).map((g) => {
                    const pct = g.amount_total > 0 ? Math.round(((g.amount_disbursed ?? 0) / g.amount_total) * 100) : 0;
                    return (
                      <div key={g.id} className="cursor-pointer hover:bg-secondary/50 rounded-lg p-1.5 -mx-1.5 transition-colors" onClick={() => navigate(`/app/grants/${g.id}`)}>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">{g.name}</span>
                          <span className="font-mono">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-accent transition-all duration-600" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </GhCard>

          <GhCard title={t("dash.recentActivity")} action={<GhButton variant="ghost" onClick={() => navigate("/app/activites")}>{t("dash.viewAll")}</GhButton>}>
            <div className="flex flex-col gap-1.5">
              {!activities || activities.length === 0 ? (
                <div className="text-[11.5px] text-muted-foreground text-center py-4">{t("dash.noActivity")}</div>
              ) : (
                activities.slice(0, 6).map((a) => {
                  const meta = a.metadata as Record<string, string> | null;
                  return (
                    <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-b-0">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${a.action === "create" ? "bg-primary" : a.action === "delete" ? "bg-destructive" : "bg-accent"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11.5px] text-foreground">
                          <span className="font-medium">{t(`action.${a.action}`) || a.action}</span>
                          {" "}
                          <span className="text-muted-foreground">{t(`entity.${a.entity_type}`) || a.entity_type}</span>
                          {meta?.name && <span className="font-medium"> · {meta.name}</span>}
                        </div>
                        <div className="text-[9px] text-muted-foreground font-mono mt-0.5">
                          {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GhCard>

          {programs && programs.length > 0 && (
            <GhCard title={t("nav.programs")} action={<GhButton variant="ghost" onClick={() => navigate("/app/programmes")}>{t("dash.viewAll")}</GhButton>}>
              <div className="flex flex-col gap-2">
                {programs.slice(0, 5).map(p => (
                  <div key={p.id} onClick={() => navigate(`/app/programmes/${p.id}`)} className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0 cursor-pointer hover:bg-secondary/50 rounded px-1 -mx-1 transition-colors">
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-foreground truncate">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">{p.code} {p.funder ? `· ${p.funder}` : ""}</div>
                    </div>
                    <Pill color={statusColor[p.status] ?? "gray"}>{p.status}</Pill>
                  </div>
                ))}
              </div>
            </GhCard>
          )}

          {cohorts && cohorts.length > 0 && (
            <GhCard title={t("nav.cohorts")} action={<GhButton variant="ghost" onClick={() => navigate("/app/cohortes")}>{t("dash.viewAll")}</GhButton>}>
              <div className="flex flex-col gap-2">
                {cohorts.slice(0, 5).map(c => (
                  <div key={c.id} onClick={() => navigate(`/app/cohortes/${c.id}`)} className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0 cursor-pointer hover:bg-secondary/50 rounded px-1 -mx-1 transition-colors">
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-foreground truncate">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground">Max {c.max_startups ?? "—"} startups</div>
                    </div>
                    <Pill color={statusColor[c.status] ?? "gray"}>{c.status}</Pill>
                  </div>
                ))}
              </div>
            </GhCard>
          )}
        </div>
      )}
    </motion.div>
  );
}
