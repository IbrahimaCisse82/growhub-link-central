import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import SectionHeader from "@/components/shared/SectionHeader";
import Pill from "@/components/shared/Pill";
import GhButton from "@/components/shared/GhButton";
import StatCard from "@/components/shared/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStartup, useStartupMembers, useStartupProjects, useStartupSessions, useStartupRisks } from "@/hooks/useStartupDetail";
import StartupKpiTab from "@/components/startups/StartupKpiTab";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import EntityCommentsPanel from "@/components/shared/EntityCommentsPanel";
import AISuggestPanel from "@/components/ai/AISuggestPanel";
import StartupBillingTab from "@/components/crm/StartupBillingTab";
import { useStartupHealthScore } from "@/hooks/useStartupKpis";

const riskColor: Record<string, "green" | "amber" | "rose" | "gray"> = { low: "green", medium: "amber", high: "rose", critical: "rose" };
const sessionColor: Record<string, "green" | "amber" | "blue" | "gray"> = { planned: "amber", confirmed: "blue", completed: "green", cancelled: "gray", in_progress: "blue" };

function StartupHealthBanner({ startupId }: { startupId: string }) {
  const { data: score, isLoading } = useStartupHealthScore(startupId);
  if (isLoading || score === undefined) return null;
  const color = score >= 70 ? "text-green-600 bg-green-500/10" : score >= 40 ? "text-amber-600 bg-amber-500/10" : "text-destructive bg-destructive/10";
  const label = score >= 70 ? "Santé excellente" : score >= 40 ? "Santé moyenne" : "Attention requise";
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-4 ${color}`}>
      <span className="text-lg font-bold font-mono">{score}/100</span>
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-[10px] ml-auto opacity-70">Score calculé à partir des KPIs (couverture, fraîcheur, tendances)</span>
    </div>
  );
}

export default function StartupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: startup, isLoading } = useStartup(id);
  const { data: members } = useStartupMembers(id);
  const { data: projects } = useStartupProjects(id);
  const { data: sessions } = useStartupSessions(id);
  const { data: risks } = useStartupRisks(id);

  if (isLoading) return <div className="p-8"><Skeleton className="h-8 w-64 mb-4" /><Skeleton className="h-[300px] rounded-xl" /></div>;
  if (!startup) return <div className="text-center py-12 text-muted-foreground">Entreprise introuvable</div>;

  const cohort = startup.cohorts;
  const project = cohort?.projects;
  const program = project?.programs;
  const portfolio = program?.portfolios;

  const crumbs = [
    { label: "Portefeuilles", href: "/app/portefeuilles" },
    ...(portfolio ? [{ label: portfolio.name, href: `/app/portefeuilles/${portfolio.id}` }] : []),
    ...(program ? [{ label: program.name, href: `/app/programmes/${program.id}` }] : []),
    ...(project ? [{ label: project.name, href: `/app/projets/${project.id}` }] : []),
    ...(cohort ? [{ label: cohort.name, href: `/app/cohortes/${cohort.id}` }] : []),
    { label: startup.name },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <AppBreadcrumb items={crumbs} />
      <SectionHeader
        title={startup.name}
        subtitle={`${startup.sector ?? ""} · ${startup.city ?? ""}, ${startup.country ?? ""}`}
        actions={<Pill color={startup.stage === "croissance" || startup.stage === "scale" ? "green" : "amber"}>{startup.stage ?? "—"}</Pill>}
      />

      <StartupHealthBanner startupId={id!} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <StatCard label="Score" value={startup.score != null ? `${startup.score}/100` : "—"} note="" color="green" />
        <StatCard label="Équipe" value={String(startup.team_size ?? 1)} note="membres" color="blue" />
        <StatCard label="Revenu mensuel" value={startup.revenue_monthly ? new Intl.NumberFormat("fr-FR").format(startup.revenue_monthly) : "—"} note="XOF" color="amber" />
        <StatCard label="Cohorte" value={cohort?.name ?? "—"} note="" color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Informations */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Informations</div>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between"><span className="text-muted-foreground">Secteur</span><span className="text-foreground font-medium">{startup.sector ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pays</span><span className="text-foreground font-medium">{startup.country ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ville</span><span className="text-foreground font-medium">{startup.city ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fondée le</span><span className="text-foreground font-medium">{startup.founded_date ? new Date(startup.founded_date).toLocaleDateString("fr-FR") : "—"}</span></div>
            {startup.website && (
              <div className="flex justify-between"><span className="text-muted-foreground">Site web</span><a href={startup.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{startup.website}</a></div>
            )}
          </div>
        </div>

        {/* Équipe */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Équipe ({members?.length ?? 0})</div>
          {members?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun membre enregistré</p>
          ) : (
            <div className="space-y-2">
              {members?.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-[13px]">
                  <div>
                    <span className="text-foreground font-medium">{m.full_name}</span>
                    {m.email && <span className="text-muted-foreground ml-2 text-[11px]">{m.email}</span>}
                  </div>
                  {m.role && <Pill color="blue">{m.role}</Pill>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {startup.description && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Description</div>
          <p className="text-[13px] text-foreground whitespace-pre-line">{startup.description}</p>
        </div>
      )}

      {/* Tabs for KPIs, Projects, Sessions, Risks */}
      <Tabs defaultValue="kpis" className="w-full">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="kpis">📊 KPIs</TabsTrigger>
          <TabsTrigger value="projects">Projets ({projects?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="sessions">Coaching ({sessions?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="billing">💼 Facturation</TabsTrigger>
          <TabsTrigger value="documents">📁 Documents</TabsTrigger>
          {risks && risks.length > 0 && <TabsTrigger value="risks">Risques ({risks.length})</TabsTrigger>}
          <TabsTrigger value="discussion">💬 Discussion & IA</TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="mt-4">
          <StartupBillingTab startupId={startup.id} startupName={startup.name} />
        </TabsContent>

        <TabsContent value="discussion" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <EntityCommentsPanel entityType="startup" entityId={id!} />
          </div>
          <div className="space-y-3">
            <AISuggestPanel mode="mentor_match" context={{ name: startup.name, sector: startup.sector, stage: startup.stage, country: startup.country }} />
            <AISuggestPanel mode="summary" context={{ name: startup.name, sector: startup.sector, stage: startup.stage, team_size: startup.team_size, revenue_monthly: startup.revenue_monthly }} />
            <AISuggestPanel mode="next_actions" context={{ name: startup.name, stage: startup.stage, sector: startup.sector }} />
          </div>
        </TabsContent>

        <TabsContent value="kpis" className="mt-4">
          <StartupKpiTab startupId={startup.id} />
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold text-foreground">Projets ({projects?.length ?? 0})</h3>
            <GhButton variant="ghost" onClick={() => navigate("/app/projets")}>Voir tout →</GhButton>
          </div>
          {!projects || projects.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">Aucun projet associé</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map(p => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-4 hover:border-border/80 hover:-translate-y-0.5 transition-all cursor-pointer" onClick={() => navigate(`/app/projets/${p.id}`)}>
                  <div className="text-[13px] font-bold text-foreground">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{p.code ?? "—"}</div>
                  <div className="flex items-center justify-between mt-3">
                    <Pill color={p.status === "active" ? "green" : p.status === "completed" ? "blue" : "gray"}>{p.status}</Pill>
                    <span className="font-mono text-[11px] text-primary">{p.progress ?? 0}%</span>
                  </div>
                  {(p.progress ?? 0) > 0 && (
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold text-foreground">Sessions coaching ({sessions?.length ?? 0})</h3>
            <GhButton variant="ghost" onClick={() => navigate("/app/coaching")}>Voir tout →</GhButton>
          </div>
          {!sessions || sessions.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">Aucune session de coaching</div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full border-collapse text-[12.5px]">
                <thead><tr className="bg-secondary">
                  {["Session", "Date", "Durée", "Statut"].map(h => <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left">{h}</th>)}
                </tr></thead>
                <tbody>
                  {sessions.slice(0, 5).map(s => (
                    <tr key={s.id} className="hover:bg-secondary transition-colors cursor-pointer" onClick={() => navigate("/app/coaching")}>
                      <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">{s.title}</td>
                      <td className="px-3.5 py-2.5 border-b border-border font-mono text-foreground">{new Date(s.scheduled_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground">{s.duration_minutes ?? 60} min</td>
                      <td className="px-3.5 py-2.5 border-b border-border"><Pill color={sessionColor[s.status] ?? "gray"}>{s.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {risks && risks.length > 0 && (
          <TabsContent value="risks" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-bold text-foreground">Risques ({risks.length})</h3>
              <GhButton variant="ghost" onClick={() => navigate("/app/risques")}>Voir tout →</GhButton>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full border-collapse text-[12.5px]">
                <thead><tr className="bg-secondary">
                  {["Risque", "Niveau", "Statut"].map(h => <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left">{h}</th>)}
                </tr></thead>
                <tbody>
                  {risks.map(r => (
                    <tr key={r.id} className="hover:bg-secondary transition-colors">
                      <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">{r.title}</td>
                      <td className="px-3.5 py-2.5 border-b border-border"><Pill color={riskColor[r.level] ?? "gray"}>{r.level}</Pill></td>
                      <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground">{r.status ?? "open"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}

        <TabsContent value="documents" className="mt-4">
          <EntityDocumentsTab entityType="startup" entityId={startup.id} label="Documents de l'entreprise" />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
