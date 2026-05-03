import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ProjectArchiveDialog from "@/components/projects/ProjectArchiveDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppBreadcrumb from "@/components/shared/AppBreadcrumb";
import Pill from "@/components/shared/Pill";
import GhButton from "@/components/shared/GhButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import WorkPackageCard from "@/components/projects/WorkPackageCard";
import InlineEditField from "@/components/projects/InlineEditField";
import { buildWorkPackages } from "@/lib/workPackageUtils";
import EntityDocumentsTab from "@/components/shared/EntityDocumentsTab";
import ProjectCostBreakdownPanel from "@/components/projects/ProjectCostBreakdownPanel";
import EntityCommentsPanel from "@/components/shared/EntityCommentsPanel";
import AISuggestPanel from "@/components/ai/AISuggestPanel";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useAssignableUsers";
import { EditProjectDialog } from "@/components/dialogs/EditEntityDialogs";
import ValidateEntityDialog from "@/components/dialogs/ValidateEntityDialog";
import { exportProjectPdf } from "@/lib/projectPdfExport";
import { exportProjectWord } from "@/lib/projectWordExport";
import { exportBudgetToExcel } from "@/lib/budgetExcelExport";
import { toast } from "sonner";

const statusMap: Record<string, { label: string; color: "green" | "blue" | "amber" | "gray" }> = {
  active: { label: "Actif", color: "green" },
  draft: { label: "Brouillon", color: "gray" },
  paused: { label: "En pause", color: "amber" },
  completed: { label: "Terminé", color: "blue" },
  cancelled: { label: "Annulé", color: "gray" },
};

const validationMap: Record<string, { label: string; color: "green" | "blue" | "amber" | "gray" }> = {
  draft: { label: "Brouillon", color: "gray" },
  pending_review: { label: "En attente de validation", color: "amber" },
  validated: { label: "Validé", color: "green" },
  rejected: { label: "Rejeté", color: "gray" },
};

function useProjectDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, programs(name, code), startups(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

function useProjectLogFrame(id: string | undefined) {
  return useQuery({
    queryKey: ["project-logframe", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("logical_frameworks").select("*").eq("project_id", id!).maybeSingle();
      return data;
    },
  });
}

function useProjectTheoryOfChange(id: string | undefined) {
  return useQuery({
    queryKey: ["project-toc", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("theory_of_change").select("*").eq("project_id", id!).maybeSingle();
      return data;
    },
  });
}

function useProjectIndicators(id: string | undefined) {
  return useQuery({
    queryKey: ["project-indicators", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("project_indicators").select("*").eq("project_id", id!).order("created_at");
      return data ?? [];
    },
  });
}

function useProjectBudgetLines(id: string | undefined) {
  return useQuery({
    queryKey: ["project-budget-lines", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("project_budget_lines").select("*").eq("project_id", id!).order("created_at");
      return data ?? [];
    },
  });
}

function useProjectBudgetDetails(id: string | undefined) {
  return useQuery({
    queryKey: ["project-budget-details", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("project_budget_details").select("*").eq("project_id", id!).order("sort_order");
      return data ?? [];
    },
  });
}

function useProjectRisks(id: string | undefined) {
  return useQuery({
    queryKey: ["project-risks", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("risks").select("*").eq("project_id", id!).order("created_at");
      return data ?? [];
    },
  });
}

function useProjectPartners(projectProgramId: string | undefined) {
  return useQuery({
    queryKey: ["project-partners", projectProgramId],
    enabled: !!projectProgramId,
    queryFn: async () => {
      const { data } = await supabase.from("partners").select("*").eq("program_id", projectProgramId!).order("name");
      return data ?? [];
    },
  });
}

function useProjectGrants(id: string | undefined) {
  return useQuery({
    queryKey: ["project-grants", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("grants").select("*").eq("project_id", id!).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

function useProjectMilestones(id: string | undefined) {
  return useQuery({
    queryKey: ["project-milestones", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("milestones").select("*").eq("project_id", id!).order("due_date");
      return data ?? [];
    },
  });
}

export default function ProjetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: project, isLoading } = useProjectDetail(id);
  const { data: logFrame } = useProjectLogFrame(id);
  const { data: toc } = useProjectTheoryOfChange(id);
  const { data: indicators } = useProjectIndicators(id);
  const { data: budgetLines } = useProjectBudgetLines(id);
  const { data: budgetDetails } = useProjectBudgetDetails(id);
  const { data: milestones } = useProjectMilestones(id);
  const { data: projectGrants } = useProjectGrants(id);
  const { data: projectRisks } = useProjectRisks(id);
  const { data: projectPartners } = useProjectPartners(project?.program_id);
  const { data: projectManager } = useUserProfile(project?.owner_id);
  const [descExpanded, setDescExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-10 w-96" />
      <div className="grid grid-cols-4 gap-3.5"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /></div>
      <Skeleton className="h-[300px] rounded-xl" />
    </div>
  );
  if (!project) return <div className="text-center py-12 text-muted-foreground">Projet introuvable</div>;

  const st = statusMap[project.status] ?? statusMap.draft;
  const vs = validationMap[project.validation_status ?? "draft"] ?? validationMap.draft;
  const totalBudget = budgetLines?.reduce((s, l) => s + (Number(l.total_cost) || 0), 0) ?? 0;
  const progress = Number(project.progress) || 0;
  const description = project.description ?? "";
  const isLongDesc = description.length > 300;

  // Build Work Packages from logframe + indicators + milestones
  const workPackages = buildWorkPackages(logFrame, indicators ?? [], milestones ?? []);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Breadcrumb */}
      <AppBreadcrumb items={[{ label: "Projets", href: "/app/projets" }, { label: project.name }]} />

      {/* Header card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-accent" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {project.code && <span className="font-mono text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">{project.code}</span>}
                <Pill color={st.color}>● {st.label}</Pill>
                <Pill color={vs.color}>{vs.label}</Pill>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-extrabold text-foreground leading-tight">{project.name}</h1>
              {project.programs?.name && (
                <p className="text-xs text-muted-foreground">Programme : <span className="text-foreground font-medium">{project.programs.name}</span></p>
              )}
              {projectManager && (
                <p className="text-xs text-muted-foreground">Chef de projet : <span className="text-foreground font-medium">{projectManager.full_name}</span></p>
              )}
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <GhButton size="sm" variant="ghost" onClick={() => exportProjectPdf({ project, logFrame: logFrame ?? null, toc: toc ?? null, indicators: indicators ?? [], budgetLines: budgetLines ?? [], budgetDetails: budgetDetails ?? [], risks: projectRisks ?? [], milestones: milestones ?? [], partners: projectPartners ?? [] })}>
                📄 PDF
              </GhButton>
              <GhButton size="sm" variant="ghost" onClick={async () => {
                try {
                  await exportProjectWord({ project, logFrame: logFrame ?? null, toc: toc ?? null, indicators: indicators ?? [], budgetLines: budgetLines ?? [], budgetDetails: budgetDetails ?? [], risks: projectRisks ?? [], milestones: milestones ?? [], partners: projectPartners ?? [] });
                  toast.success("Document Word généré");
                } catch (e) { toast.error("Erreur export Word"); console.error(e); }
              }}>
                📝 Word
              </GhButton>
              <GhButton size="sm" variant="ghost" onClick={async () => {
                try {
                  await exportBudgetToExcel({ projectId: project.id, projectName: project.code || project.name || "PAERID", currency: "USD" });
                  toast.success("Budget Excel généré");
                } catch (e) { toast.error("Erreur export Excel"); console.error(e); }
              }}>
                💰 Budget Excel
              </GhButton>
              {isAdmin && (
                <>
                  <GhButton size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                    Modifier ✏️
                  </GhButton>
                  {project.validation_status !== "validated" && (
                    <GhButton size="sm" variant="primary" onClick={() => setValidateOpen(true)}>
                      Valider ✓
                    </GhButton>
                  )}
                  {!project.is_archived && (
                    <GhButton size="sm" variant="ghost" onClick={() => setArchiveOpen(true)}>
                      Clôturer
                    </GhButton>
                  )}
                </>
              )}
              {project.is_archived && (
                <Pill color="gray">Archivé</Pill>
              )}
              {(project.validation_status === "draft" || project.validation_status === "pending_review") && (
                <GhButton size="sm" variant="ghost" onClick={() => navigate(`/app/projets/nouveau?id=${project.id}`)}>
                  Wizard ↗
                </GhButton>
              )}
            </div>
          </div>

          {progress > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Progression</span>
                <span className="text-xs font-mono font-semibold text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox icon="📅" label="Début" value={project.start_date ? new Date(project.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
        <StatBox icon="🏁" label="Fin" value={project.end_date ? new Date(project.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
        <StatBox icon="💰" label="Budget" value={totalBudget ? `${totalBudget.toLocaleString("fr-FR")} XOF` : (project.budget ? `${Number(project.budget).toLocaleString("fr-FR")} XOF` : "—")} />
        <StatBox icon="📦" label="Work Packages" value={String(workPackages.length)} />
      </div>

      {/* Description collapsible */}
      {description && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Description du projet</h3>
            {isLongDesc && (
              <button onClick={() => setDescExpanded(!descExpanded)} className="text-[11px] text-primary hover:underline font-medium cursor-pointer">
                {descExpanded ? "Réduire ↑" : "Lire la suite ↓"}
              </button>
            )}
          </div>
          <p className={`text-[13px] text-foreground/85 leading-relaxed whitespace-pre-line ${!descExpanded && isLongDesc ? "line-clamp-4" : ""}`}>
            {description}
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="introduction" className="w-full">
        <TabsList className="bg-secondary border border-border flex-wrap">
          <TabsTrigger value="introduction">1. Introduction</TabsTrigger>
          <TabsTrigger value="contexte">2. Contexte & Justification</TabsTrigger>
          <TabsTrigger value="objectifs">3. Objectifs ({workPackages.length})</TabsTrigger>
          <TabsTrigger value="resultats">4. Résultats attendus</TabsTrigger>
          <TabsTrigger value="toc">Théorie du changement</TabsTrigger>
          <TabsTrigger value="budget">Budget ({budgetLines?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="bailleurs">Bailleurs ({projectGrants?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="couts">Coûts consolidés</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="discussion">💬 Discussion & IA</TabsTrigger>
        </TabsList>

        <TabsContent value="discussion" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <EntityCommentsPanel entityType="project" entityId={id!} />
          </div>
          <div className="space-y-3">
            <AISuggestPanel mode="risk_analysis" context={{ name: project?.name, status: project?.status, progress: project?.progress, description: project?.description }} />
            <AISuggestPanel mode="next_actions" context={{ name: project?.name, status: project?.status, progress: project?.progress }} />
            <AISuggestPanel mode="summary" context={{ name: project?.name, description: project?.description, status: project?.status, progress: project?.progress }} />
          </div>
        </TabsContent>

        {/* 1. Introduction */}
        <TabsContent value="introduction" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">1. Introduction</h2>
              <p className="text-xs text-muted-foreground">Présentation générale du projet et de son contexte d'intervention.</p>
            </div>
            {description && <InlineEditField projectId={project.id} fieldKey="description" label="Description du projet" value={description} isAdmin={isAdmin} />}
            {(project.metadata as Record<string, unknown> | null)?.introduction && (
              <InlineEditField projectId={project.id} fieldKey="metadata.introduction" label="Introduction" value={(project.metadata as Record<string, unknown>).introduction as string} isAdmin={isAdmin} />
            )}
            {project.country && <Field label="Pays" value={project.country} />}
            {project.locations && (project.locations as string[]).length > 0 && (
              <JsonList label="Lieux d'implémentation" items={project.locations} />
            )}
            {project.duration_months && <Field label="Durée" value={`${project.duration_months} mois`} />}
            {project.start_date && <Field label="Date de début" value={new Date(project.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} />}
            {project.end_date && <Field label="Date de fin" value={new Date(project.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} />}
            {!description && !(project.metadata as Record<string, unknown> | null)?.introduction && !project.country && !project.start_date && (
              <Empty text="Aucune information d'introduction renseignée" />
            )}
          </div>
        </TabsContent>

        {/* 2. Contexte & Justification */}
        <TabsContent value="contexte" className="mt-4">
          <ContexteJustificationTab metadata={project.metadata as Record<string, unknown> | null} projectId={project.id} isAdmin={isAdmin} />
        </TabsContent>

        {/* 3. Objectifs */}
        <TabsContent value="objectifs" className="mt-4">
          <ObjectifsTab logFrame={logFrame} workPackages={workPackages} />
        </TabsContent>

        {/* 4. Résultats attendus */}
        <TabsContent value="resultats" className="mt-4">
          <ResultatsAttendusTab logFrame={logFrame} indicators={indicators ?? []} />
        </TabsContent>

        {/* Theory of Change tab */}
        <TabsContent value="toc" className="mt-4">
          {toc ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-5">
              {toc.impact && <Field label="Impact" value={toc.impact} />}
              {toc.outcomes && <JsonList label="Outcomes" items={toc.outcomes as string[]} />}
              {toc.outputs && <JsonList label="Outputs" items={toc.outputs as string[]} />}
              {toc.activities && <JsonList label="Activités" items={toc.activities as string[]} />}
              {toc.inputs && <JsonList label="Inputs" items={toc.inputs as string[]} />}
              {toc.assumptions && <JsonList label="Hypothèses" items={toc.assumptions as string[]} />}
              {toc.risks && <JsonList label="Risques" items={toc.risks as string[]} />}
            </div>
          ) : <Empty text="Théorie du changement non renseignée" />}
        </TabsContent>

        {/* Budget tab */}
        <TabsContent value="budget" className="mt-4">
          {budgetLines && budgetLines.length > 0 ? (
            <BudgetTab budgetLines={budgetLines} totalBudget={totalBudget} currency={(project.metadata as any)?.currency || "USD"} startYear={project.start_date ? parseInt(project.start_date.split("-")[0]) : 2026} contingencyPct={(project.metadata as any)?.contingency_pct ?? 7} projectId={project.id} isAdmin={isAdmin} />
          ) : <Empty text="Aucune ligne budgétaire" />}
        </TabsContent>

        {/* Bailleurs tab */}
        <TabsContent value="bailleurs" className="mt-4">
          {projectGrants && projectGrants.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBox icon="🏦" label="Bailleurs" value={String(projectGrants.length)} />
                <StatBox icon="💰" label="Total financé" value={`${projectGrants.reduce((s, g) => s + (g.amount_total ?? 0), 0).toLocaleString("fr-FR")} XOF`} />
                <StatBox icon="📤" label="Total décaissé" value={`${projectGrants.reduce((s, g) => s + (g.amount_disbursed ?? 0), 0).toLocaleString("fr-FR")} XOF`} />
                <StatBox icon="📊" label="Taux décaissement" value={`${projectGrants.reduce((s, g) => s + (g.amount_total ?? 0), 0) > 0 ? Math.round((projectGrants.reduce((s, g) => s + (g.amount_disbursed ?? 0), 0) / projectGrants.reduce((s, g) => s + (g.amount_total ?? 0), 0)) * 100) : 0}%`} />
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary">
                      <Th>Code</Th><Th>Bailleur / Organisation</Th><Th>Montant</Th><Th>Décaissé</Th><Th>Statut</Th><Th>Période</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectGrants.map(g => {
                      const pct = g.amount_total > 0 ? Math.round(((g.amount_disbursed ?? 0) / g.amount_total) * 100) : 0;
                      return (
                        <tr key={g.id} className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => navigate(`/app/grants/${g.id}`)}>
                          <td className="px-4 py-3">
                            <span className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">{g.code}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-foreground font-semibold text-xs">{g.name}</div>
                            <div className="text-[10px] text-muted-foreground">{g.organization ?? "—"}</div>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono font-semibold text-foreground">{g.amount_total.toLocaleString("fr-FR")} {g.currency ?? "XOF"}</td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-mono text-foreground">{(g.amount_disbursed ?? 0).toLocaleString("fr-FR")}</div>
                            <div className="text-[10px] text-muted-foreground">{pct}%</div>
                          </td>
                          <td className="px-4 py-3">
                            <Pill color={g.status === "active" ? "green" : g.status === "disbursing" ? "blue" : g.status === "closing" ? "amber" : "gray"}>
                              {g.status === "active" ? "Active" : g.status === "disbursing" ? "Décaissement" : g.status === "draft" ? "Brouillon" : g.status === "closing" ? "Clôture" : "Clôturé"}
                            </Pill>
                          </td>
                          <td className="px-4 py-3 text-[10px] font-mono text-muted-foreground">{g.start_date ?? "—"} → {g.end_date ?? "—"}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-secondary/80">
                      <td colSpan={2} className="px-4 py-3 text-xs font-bold text-foreground uppercase">Total multi-bailleurs</td>
                      <td className="px-4 py-3 text-sm font-mono font-extrabold text-primary">{projectGrants.reduce((s, g) => s + (g.amount_total ?? 0), 0).toLocaleString("fr-FR")} XOF</td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-foreground">{projectGrants.reduce((s, g) => s + (g.amount_disbursed ?? 0), 0).toLocaleString("fr-FR")}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <div className="text-3xl mb-2">🏦</div>
              <div className="text-sm font-semibold text-foreground mb-1">Aucun bailleur rattaché</div>
              <div className="text-xs text-muted-foreground mb-4">Créez un grant dans le GTS et rattachez-le à ce projet</div>
              <GhButton size="sm" onClick={() => navigate("/app/grants")}>Aller au GTS →</GhButton>
            </div>
          )}
          <EntityDocumentsTab entityType="project" entityId={project.id} label="Documents du projet" />
        </TabsContent>

        <TabsContent value="couts" className="mt-4">
          <ProjectCostBreakdownPanel projectId={project.id} />
        </TabsContent>
      </Tabs>

      <EditProjectDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      <ValidateEntityDialog open={validateOpen} onOpenChange={setValidateOpen} entityType="projects" entityId={project.id} entityName={project.name} />
      <ProjectArchiveDialog projectId={project.id} projectName={project.name} open={archiveOpen} onOpenChange={setArchiveOpen} />
    </motion.div>
  );
}

function StatBox({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <span className="text-lg">{icon}</span>
      <div className="min-w-0">
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-foreground font-semibold text-sm mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-muted-foreground">{children}</th>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 border border-border rounded-lg p-4">
      <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <p className="text-[13px] text-foreground/85 leading-relaxed whitespace-pre-line">{value}</p>
    </div>
  );
}

function JsonList({ label, items }: { label: string; items: unknown }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return null;
  return (
    <div className="border-l-2 border-accent/20 pl-4">
      <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <ul className="space-y-1.5">
        {list.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-foreground/85">
            <span className="text-primary mt-0.5 shrink-0">›</span>
            <span>{typeof item === "string" ? item : JSON.stringify(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-12">
      <span className="text-3xl mb-2">📋</span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function ContexteJustificationTab({ metadata, projectId, isAdmin }: { metadata: Record<string, unknown> | null; projectId: string; isAdmin: boolean }) {
  const meta = metadata ?? {};
  const contexteJustification = meta.contexte_justification as string | undefined;
  const contexte = meta.contexte_territorial as string | undefined;
  const contraintes = meta.contraintes_vulnerabilites as string | undefined;
  const alignement = meta.alignement_strategique as string | undefined;
  const justification = meta.justification as string | undefined;

  const hasContent = contexteJustification || contexte || contraintes || alignement || justification;

  if (!hasContent) return <Empty text="Contexte et justification non renseignés — complétez via le Wizard" />;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">2. Contexte et justification du projet</h2>
        <p className="text-xs text-muted-foreground">Contexte dans lequel s'inscrit le projet, contraintes identifiées et justification de l'intervention.</p>
      </div>
      {contexteJustification && <InlineEditField projectId={projectId} fieldKey="metadata.contexte_justification" label="2. Contexte et justification du projet" value={contexteJustification} isAdmin={isAdmin} />}
      {contexte && <InlineEditField projectId={projectId} fieldKey="metadata.contexte_territorial" label="2.1. Contexte territorial" value={contexte} isAdmin={isAdmin} />}
      {contraintes && <InlineEditField projectId={projectId} fieldKey="metadata.contraintes_vulnerabilites" label="2.2. Contraintes structurelles et vulnérabilités" value={contraintes} isAdmin={isAdmin} />}
      {alignement && <InlineEditField projectId={projectId} fieldKey="metadata.alignement_strategique" label="2.3. Alignement avec les orientations stratégiques" value={alignement} isAdmin={isAdmin} />}
      {justification && <InlineEditField projectId={projectId} fieldKey="metadata.justification" label="2.4. Justification de l'intervention" value={justification} isAdmin={isAdmin} />}
    </div>
  );
}

function ObjectifsTab({ logFrame, workPackages }: { logFrame: any; workPackages: any[] }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">3. Objectif général et spécifiques du projet</h2>
        <p className="text-xs text-muted-foreground">Objectifs poursuivis par le projet.</p>
      </div>
      {logFrame?.overall_objective ? (
        <Field label="3.1. Objectif général du projet" value={logFrame.overall_objective} />
      ) : (
        <Empty text="Objectif général non renseigné" />
      )}
      {logFrame?.specific_objectives && Array.isArray(logFrame.specific_objectives) && logFrame.specific_objectives.length > 0 ? (
        <div className="border-l-2 border-accent/20 pl-4">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">3.2. Objectifs spécifiques</div>
          <ul className="space-y-1.5">
            {(logFrame.specific_objectives as string[]).map((obj: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-foreground/85">
                <span className="text-primary mt-0.5 shrink-0">OS{i + 1}.</span>
                <span>{typeof obj === "string" ? obj : JSON.stringify(obj)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Empty text="Aucun objectif spécifique renseigné" />
      )}
      {workPackages.length > 0 && (
        <div className="space-y-4 mt-4">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Work Packages associés</div>
          {workPackages.map((wp) => (
            <WorkPackageCard key={wp.number} wp={wp} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultatsAttendusTab({ logFrame, indicators }: { logFrame: any; indicators: any[] }) {
  const results = logFrame?.expected_results;
  const hasResults = results && Array.isArray(results) && results.length > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">4. Résultats attendus</h2>
        <p className="text-xs text-muted-foreground">Résultats concrets attendus du projet et indicateurs associés.</p>
      </div>
      {hasResults ? (
        <div className="border-l-2 border-accent/20 pl-4">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Résultats attendus</div>
          <ul className="space-y-1.5">
            {(results as string[]).map((r: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-foreground/85">
                <span className="text-primary mt-0.5 shrink-0">R{i + 1}.</span>
                <span>{typeof r === "string" ? r : JSON.stringify(r)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Empty text="Aucun résultat attendu renseigné" />
      )}
      {indicators.length > 0 && (
        <div className="border-l-2 border-primary/20 pl-4">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Indicateurs ({indicators.length})</div>
          <ul className="space-y-2">
            {indicators.map((ind) => (
              <li key={ind.id} className="text-[13px] text-foreground/85">
                <span className="font-medium">{ind.name}</span>
                {ind.target_value != null && <span className="text-muted-foreground"> — Cible : {ind.target_value} {ind.unit ?? ""}</span>}
                {ind.current_value != null && <span className="text-primary ml-1">(Actuel : {ind.current_value})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BudgetTab({ budgetLines, totalBudget, currency, startYear, contingencyPct, projectId, isAdmin }: { budgetLines: any[]; totalBudget: number; currency: string; startYear: number; contingencyPct: number; projectId: string; isAdmin: boolean }) {
  const navigate = useNavigate();
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
  const sections = ["WP1", "WP2", "WP3", "WP4", "GC", "SE"];
  const sectionLabels: Record<string, string> = {
    WP1: "WP1 — Renforcement des compétences & structuration",
    WP2: "WP2 — Accès aux marchés & développement commercial",
    WP3: "WP3 — Accès au financement & investissement productif",
    WP4: "WP4 — Innovation, durabilité & écosystème entrepreneurial",
    GC: "Gouvernance, Coordination & Gestion",
    SE: "Suivi, Évaluation & Communication",
  };
  const activeSections = sections.filter(s => budgetLines.some(l => l.section === s));
  const yearKey = (y: number) => `year${y}` as const;
  const lineTotal = (l: any) => (Number(l.year1)||0) + (Number(l.year2)||0) + (Number(l.year3)||0) + (Number(l.year4)||0) + (Number(l.year5)||0);
  const sectionTotal = (s: string) => budgetLines.filter(l => l.section === s).reduce((a, l) => a + lineTotal(l), 0);
  const sectionYearTotal = (s: string, y: number) => budgetLines.filter(l => l.section === s).reduce((a, l) => a + (Number((l as any)[`year${y}`]) || 0), 0);
  const grandTotal = activeSections.reduce((a, s) => a + sectionTotal(s), 0);
  const yearGrandTotal = (y: number) => activeSections.reduce((a, s) => a + sectionYearTotal(s, y), 0);
  const contingency = Math.round(grandTotal * (contingencyPct / 100));
  const totalGeneral = grandTotal + contingency;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Budget prévisionnel</h2>
          <p className="text-xs text-muted-foreground">Ventilation par composante et par année — Montants en {currency}</p>
        </div>
        {isAdmin && (
          <GhButton size="sm" variant="secondary" onClick={() => navigate(`/app/projets/nouveau?id=${projectId}`)}>
            Modifier le budget ✏️
          </GhButton>
        )}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary">
              <Th>Code</Th><Th>Poste budgétaire</Th><Th>Catégorie</Th>
              {[1,2,3,4,5].map(y => <Th key={y}>A{y} ({startYear + y - 1})</Th>)}
              <Th>Total 5 ans</Th><Th>%</Th><Th>Genre</Th><Th>Climat</Th>
            </tr>
          </thead>
          <tbody>
            {activeSections.map(sec => (
              <>
                <tr key={`h-${sec}`} className="bg-primary/5 border-b border-border">
                  <td colSpan={13} className="px-4 py-2.5 text-xs font-bold text-foreground uppercase tracking-wide">
                    {sectionLabels[sec] || sec}
                  </td>
                </tr>
                {budgetLines.filter(l => l.section === sec).map(line => {
                  const lt = lineTotal(line);
                  const pct = grandTotal > 0 ? ((lt / grandTotal) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={line.id} className="border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-2 text-[10px] font-mono text-primary font-semibold">{line.code}</td>
                      <td className="px-3 py-2">
                        <div className="text-foreground font-medium text-xs">{line.label}</div>
                        {(line as any).notes && <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{(line as any).notes}</div>}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground">{(line as any).budget_category || line.category}</td>
                      {[1,2,3,4,5].map(y => (
                        <td key={y} className="px-3 py-2 text-xs font-mono text-foreground text-right">{fmt(Number((line as any)[`year${y}`]) || 0)}</td>
                      ))}
                      <td className="px-3 py-2 text-xs font-mono font-semibold text-foreground text-right">{fmt(lt)}</td>
                      <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground text-right">{pct}%</td>
                      <td className="px-3 py-2 text-center text-xs">{(line as any).marker_gender || "○"}</td>
                      <td className="px-3 py-2 text-center text-xs">{(line as any).marker_climate || "○"}</td>
                    </tr>
                  );
                })}
                <tr key={`st-${sec}`} className="bg-secondary/60 border-b border-border">
                  <td colSpan={3} className="px-3 py-2 text-xs font-bold text-foreground">Sous-total {sec}</td>
                  {[1,2,3,4,5].map(y => (
                    <td key={y} className="px-3 py-2 text-xs font-mono font-semibold text-foreground text-right">{fmt(sectionYearTotal(sec, y))}</td>
                  ))}
                  <td className="px-3 py-2 text-xs font-mono font-bold text-primary text-right">{fmt(sectionTotal(sec))}</td>
                  <td className="px-3 py-2 text-[10px] font-mono text-muted-foreground text-right">{grandTotal > 0 ? ((sectionTotal(sec) / grandTotal) * 100).toFixed(1) : "0.0"}%</td>
                  <td colSpan={2}></td>
                </tr>
              </>
            ))}
            <tr className="bg-secondary/80 border-b border-border">
              <td colSpan={3} className="px-3 py-2.5 text-xs font-bold text-foreground uppercase">Sous-total coûts directs</td>
              {[1,2,3,4,5].map(y => (
                <td key={y} className="px-3 py-2.5 text-xs font-mono font-bold text-foreground text-right">{fmt(yearGrandTotal(y))}</td>
              ))}
              <td className="px-3 py-2.5 text-sm font-mono font-extrabold text-primary text-right">{fmt(grandTotal)}</td>
              <td colSpan={3}></td>
            </tr>
            <tr className="border-b border-border">
              <td colSpan={3} className="px-3 py-2 text-xs text-foreground">Imprévus & contingences ({contingencyPct}%)</td>
              {[1,2,3,4,5].map(y => (
                <td key={y} className="px-3 py-2 text-xs font-mono text-muted-foreground text-right">{fmt(Math.round(yearGrandTotal(y) * contingencyPct / 100))}</td>
              ))}
              <td className="px-3 py-2 text-xs font-mono font-semibold text-foreground text-right">{fmt(contingency)}</td>
              <td colSpan={3}></td>
            </tr>
            <tr className="bg-primary/10">
              <td colSpan={3} className="px-3 py-3 text-sm font-bold text-foreground uppercase">Total général projet (5 ans)</td>
              {[1,2,3,4,5].map(y => {
                const yt = yearGrandTotal(y);
                return <td key={y} className="px-3 py-3 text-xs font-mono font-bold text-foreground text-right">{fmt(Math.round(yt * (1 + contingencyPct / 100)))}</td>;
              })}
              <td className="px-3 py-3 text-sm font-mono font-extrabold text-primary text-right">{fmt(totalGeneral)}</td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <p>✓✓ = Contribution principale | ✓ = Contribution significative | ○ = Non applicable</p>
        <p>Marqueur Genre (OCDE-DAC) · Marqueur Climat (OCDE-DAC)</p>
      </div>
    </div>
  );
}
