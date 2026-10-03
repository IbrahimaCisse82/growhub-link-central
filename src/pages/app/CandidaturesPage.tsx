import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import SectionHeader from "@/components/shared/SectionHeader";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useApplications, useApplicationsPipeline } from "@/hooks/useApplications";
import { useProjects } from "@/hooks/useProjects";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { Inbox, Search, Mic, BarChart3 as BarChartIcon, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const pipelineLabels: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "submitted", label: "Reçues", Icon: Inbox },
  { key: "screening", label: "Examen", Icon: Search },
  { key: "interview", label: "Entretien", Icon: Mic },
  { key: "due_diligence", label: "Due Diligence", Icon: BarChartIcon },
  { key: "accepted", label: "Acceptées", Icon: CheckCircle2 },
  { key: "rejected", label: "Refusées", Icon: XCircle },
];

const stepColor: Record<string, "blue" | "amber" | "purple" | "green" | "rose" | "gray"> = {
  submitted: "gray", screening: "amber", interview: "blue",
  due_diligence: "purple", accepted: "green", rejected: "rose",
};

const nextStatus: Record<string, string> = {
  submitted: "screening", screening: "interview", interview: "due_diligence", due_diligence: "accepted",
};

// ── Hooks for rounds & evaluations ──
function useRounds(projectId?: string | null) {
  return useQuery({
    queryKey: ["application-rounds", projectId],
    queryFn: async () => {
      let q = supabase.from("application_rounds").select("*").order("round_number");
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

function useEvaluationCriteria(roundId?: string) {
  return useQuery({
    queryKey: ["evaluation-criteria", roundId],
    enabled: !!roundId,
    queryFn: async () => {
      const { data, error } = await supabase.from("evaluation_criteria").select("*").eq("round_id", roundId!).order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

function useEvaluations(applicationId?: string, roundId?: string) {
  return useQuery({
    queryKey: ["application-evaluations", applicationId, roundId],
    enabled: !!applicationId && !!roundId,
    queryFn: async () => {
      const { data, error } = await supabase.from("application_evaluations").select("*").eq("application_id", applicationId!).eq("round_id", roundId!);
      if (error) throw error;
      return data;
    },
  });
}

// ── Evaluation Dialog ──
function EvaluationDialog({ application, rounds }: { application: any; rounds: any[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedRound, setSelectedRound] = useState(rounds[0]?.id ?? "");
  const { data: criteria } = useEvaluationCriteria(selectedRound);
  const { data: evaluations } = useEvaluations(application.id, selectedRound);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [recommendation, setRecommendation] = useState("hold");

  const myEval = evaluations?.find(e => e.evaluator_id === user?.id);

  const submitEval = useMutation({
    mutationFn: async () => {
      const totalScore = criteria?.reduce((sum, c) => {
        const score = scores[c.id] ?? 0;
        return sum + (score * Number(c.weight));
      }, 0) ?? 0;
      const { error } = await supabase.from("application_evaluations").upsert({
        application_id: application.id,
        round_id: selectedRound,
        evaluator_id: user!.id,
        scores,
        notes,
        recommendation,
        total_score: totalScore,
        submitted_at: new Date().toISOString(),
      }, { onConflict: "application_id,round_id,evaluator_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-evaluations"] });
      toast({ title: "✓ Évaluation soumise" });
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <GhButton variant="secondary" size="sm">📝 Évaluer</GhButton>
      </DialogTrigger>
      <DialogContent className="max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Évaluation — {application.startups?.name ?? "Candidature"}</DialogTitle>
        </DialogHeader>
        {rounds.length > 1 && (
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {rounds.map(r => (
              <button key={r.id} onClick={() => setSelectedRound(r.id)}
                className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${selectedRound === r.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>
                R{r.round_number}: {r.name}
              </button>
            ))}
          </div>
        )}

        {/* Existing evaluations summary */}
        {evaluations && evaluations.length > 0 && (
          <div className="bg-secondary rounded-lg p-3 mb-3">
            <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Évaluations existantes ({evaluations.length})</div>
            <div className="flex gap-3 flex-wrap">
              {evaluations.map(ev => (
                <div key={ev.id} className="text-[11px] text-foreground">
                  Score: <span className="font-mono text-primary font-bold">{Number(ev.total_score).toFixed(1)}</span>
                  <Pill color={ev.recommendation === "advance" ? "green" : ev.recommendation === "reject" ? "rose" : "amber"}>
                    {ev.recommendation === "advance" ? "Avancer" : ev.recommendation === "reject" ? "Refuser" : "En attente"}
                  </Pill>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scoring form */}
        {criteria && criteria.length > 0 ? (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {criteria.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-secondary">
                <div className="flex-1">
                  <div className="text-[12px] font-semibold text-foreground">{c.name}</div>
                  {c.description && <div className="text-[10px] text-muted-foreground">{c.description}</div>}
                  <div className="text-[9px] font-mono text-muted-foreground">Poids: {Number(c.weight).toFixed(1)}x · Max: {c.max_score}</div>
                </div>
                <input
                  type="number" min={0} max={c.max_score}
                  value={scores[c.id] ?? myEval?.scores?.[c.id as keyof typeof myEval.scores] ?? ""}
                  onChange={e => setScores(prev => ({ ...prev, [c.id]: Number(e.target.value) }))}
                  className="w-16 bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-center font-mono text-sm text-foreground"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-sm py-6">
            Aucun critère défini pour ce round. Configurez les critères dans les paramètres du round.
          </div>
        )}

        <textarea
          placeholder="Notes d'évaluation…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full bg-surface-2 border border-border rounded-lg p-3 text-[12px] text-foreground resize-none h-20 mt-2"
        />

        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-muted-foreground">Recommandation :</span>
          {(["advance", "hold", "reject"] as const).map(r => (
            <button key={r} onClick={() => setRecommendation(r)}
              className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${recommendation === r
                ? r === "advance" ? "bg-gh-green/15 text-gh-green font-medium"
                  : r === "reject" ? "bg-gh-rose/15 text-gh-rose font-medium"
                    : "bg-gh-amber/15 text-gh-amber font-medium"
                : "text-muted-foreground hover:bg-secondary"}`}>
              {r === "advance" ? "✓ Avancer" : r === "reject" ? "✗ Refuser" : "⏸ En attente"}
            </button>
          ))}
        </div>

        <div className="flex justify-end mt-3">
          <GhButton onClick={() => submitEval.mutate()} disabled={submitEval.isPending}>
            Soumettre l'évaluation
          </GhButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Round Config Dialog ──
function RoundConfigDialog({ projectId }: { projectId?: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [roundType, setRoundType] = useState("evaluation");
  const [open, setOpen] = useState(false);

  const createRound = useMutation({
    mutationFn: async () => {
      // Get next round number
      const { data: existing } = await supabase.from("application_rounds").select("round_number").eq("project_id", projectId ?? "").order("round_number", { ascending: false }).limit(1);
      const nextNum = (existing?.[0]?.round_number ?? 0) + 1;
      const { error } = await supabase.from("application_rounds").insert({
        project_id: projectId ?? null,
        round_number: nextNum,
        name,
        round_type: roundType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-rounds"] });
      toast({ title: "✓ Round créé" });
      setName("");
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <GhButton variant="secondary">⚙ Rounds & Évaluation</GhButton>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Configurer les rounds de sélection</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            placeholder="Nom du round (ex: Pré-sélection)"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-[12.5px] text-foreground"
          />
          <div className="flex gap-2">
            {["evaluation", "interview", "committee"].map(t => (
              <button key={t} onClick={() => setRoundType(t)}
                className={`text-[11px] px-3 py-1.5 rounded-lg ${roundType === t ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>
                {t === "evaluation" ? "📋 Évaluation" : t === "interview" ? "🎤 Entretien" : "👥 Comité"}
              </button>
            ))}
          </div>
          <GhButton onClick={() => createRound.mutate()} disabled={!name || createRound.isPending}>
            + Ajouter le round
          </GhButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──
export default function CandidaturesPage() {
  const { data: apps, isLoading } = useApplications();
  const { data: pipeline } = useApplicationsPipeline();
  const { data: projects } = useProjects();
  const { data: rounds } = useRounds();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(searchParams.get("project"));
  const [viewMode, setViewMode] = useState<"table" | "kanban" | "builder">("table");
  const qc = useQueryClient();
  const [newRoundName, setNewRoundName] = useState("");
  const [newRoundType, setNewRoundType] = useState("evaluation");

  const advance = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("applications").update({ status: status as ApplicationStatus, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["applications"] }); qc.invalidateQueries({ queryKey: ["applications-pipeline"] }); toast({ title: "✓ Candidature mise à jour" }); },
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("applications").update({ status: "rejected" as ApplicationStatus, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["applications"] }); qc.invalidateQueries({ queryKey: ["applications-pipeline"] }); toast({ title: "Candidature refusée" }); },
  });

  const saveRound = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Database["public"]["Tables"]["application_rounds"]["Update"] }) => {
      const { error } = await supabase.from("application_rounds").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-rounds"] });
      toast({ title: "✓ Round mis à jour" });
    },
  });

  const createRound = useMutation({
    mutationFn: async () => {
      const maxRound = (rounds ?? []).reduce((max, r) => Math.max(max, r.round_number), 0);
      const { error } = await supabase.from("application_rounds").insert({
        project_id: projectFilter ?? null,
        round_number: maxRound + 1,
        name: newRoundName,
        round_type: newRoundType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-rounds"] });
      setNewRoundName("");
      setNewRoundType("evaluation");
      toast({ title: "✓ Round ajouté" });
    },
  });

  const removeRound = useMutation({
    mutationFn: async (roundId: string) => {
      const { error } = await supabase.from("application_rounds").delete().eq("id", roundId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-rounds"] });
      toast({ title: "✓ Round supprimé" });
    },
  });

  const moveRound = useMutation({
    mutationFn: async ({ roundId, dir }: { roundId: string; dir: -1 | 1 }) => {
      const ordered = [...(rounds ?? [])].sort((a, b) => a.round_number - b.round_number);
      const idx = ordered.findIndex(r => r.id === roundId);
      const nextIdx = idx + dir;
      if (idx < 0 || nextIdx < 0 || nextIdx >= ordered.length) return;
      const copy = [...ordered];
      [copy[idx], copy[nextIdx]] = [copy[nextIdx], copy[idx]];
      await Promise.all(copy.map((r, i) =>
        supabase.from("application_rounds").update({ round_number: i + 1 }).eq("id", r.id)
      ));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["application-rounds"] });
    },
  });

  const projectsWithApps = projects?.filter(p => p.applications_open) ?? [];
  let filtered = filter ? apps?.filter(a => a.status === filter) : apps;
  if (projectFilter) filtered = filtered?.filter(a => (a as any).project_id === projectFilter);

  const total = apps?.length ?? 0;
  const accepted = pipeline?.accepted ?? 0;
  const conversionRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader
        title="Candidatures"
        subtitle="Processus de sélection multi-rounds avec évaluation et scoring"
        actions={<>
          <RoundConfigDialog projectId={projectFilter ?? undefined} />
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("table")} className={`px-2.5 py-1.5 text-[11px] ${viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>▤ Table</button>
            <button onClick={() => setViewMode("kanban")} className={`px-2.5 py-1.5 text-[11px] ${viewMode === "kanban" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>◫ Kanban</button>
            <button onClick={() => setViewMode("builder")} className={`px-2.5 py-1.5 text-[11px] ${viewMode === "builder" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}>⚙ Builder</button>
          </div>
        </>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Total candidatures" value={String(total)} note="" color="blue" />
        <StatCard label="En cours d'évaluation" value={String((pipeline?.screening ?? 0) + (pipeline?.interview ?? 0) + (pipeline?.due_diligence ?? 0))} note="" color="amber" />
        <StatCard label="Acceptées" value={String(accepted)} note="" color="green" />
        <StatCard label="Taux de conversion" value={`${conversionRate}%`} note="" color="purple" />
      </div>

      {/* Pipeline funnel */}
      <div className="flex flex-wrap ui-panel overflow-hidden mb-4">
        {pipelineLabels.map((step, idx) => (
          <div key={step.key} onClick={() => setFilter(filter === step.key ? null : step.key)}
            className={`flex-1 min-w-[100px] py-4 text-center border-r border-border last:border-r-0 relative hover:bg-secondary cursor-pointer transition-colors ${filter === step.key ? "ui-highlight" : ""}`}>
            {filter === step.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            {/* Funnel connector */}
            {idx > 0 && <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 text-muted-foreground text-[10px]">→</span>}
            <div className="flex justify-center mb-0.5"><step.Icon size={18} className="text-muted-foreground" /></div>
            <div className="font-mono text-2xl font-semibold text-foreground">
              {pipeline ? pipeline[step.key as keyof typeof pipeline] ?? 0 : "—"}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">{step.label}</div>
          </div>
        ))}
      </div>

      {/* Rounds overview */}
      {rounds && rounds.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap ui-panel p-2">
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Rounds :</span>
          {rounds.map(r => (
            <div key={r.id} className="flex items-center gap-1.5 bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-[11px]">
              <span className="text-primary font-mono font-bold">R{r.round_number}</span>
              <span className="text-foreground">{r.name}</span>
              <Pill color={r.round_type === "evaluation" ? "blue" : r.round_type === "interview" ? "amber" : "purple"}>
                {r.round_type === "evaluation" ? "Éval." : r.round_type === "interview" ? "Entretien" : "Comité"}
              </Pill>
            </div>
          ))}
        </div>
      )}

      {/* Project filter */}
      {projectsWithApps.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap ui-panel p-2">
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Projet :</span>
          <button onClick={() => setProjectFilter(null)} className={`text-[11px] px-2.5 py-1 rounded-lg ${!projectFilter ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>Tous</button>
          {projectsWithApps.map(p => (
            <button key={p.id} onClick={() => setProjectFilter(projectFilter === p.id ? null : p.id)} className={`text-[11px] px-2.5 py-1 rounded-lg ${projectFilter === p.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>{p.name}</button>
          ))}
        </div>
      )}

      {viewMode === "builder" ? (
        <GhCard title="Workflow Builder — Rounds" badge={String(rounds?.length ?? 0)}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
              <input
                value={newRoundName}
                onChange={(e) => setNewRoundName(e.target.value)}
                placeholder="Nom du round (ex: Pré-sélection)"
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-[12px] text-foreground"
              />
              <select
                value={newRoundType}
                onChange={(e) => setNewRoundType(e.target.value)}
                className="bg-card border border-border rounded-lg px-3 py-2 text-[12px] text-foreground"
              >
                <option value="evaluation">Évaluation</option>
                <option value="interview">Entretien</option>
                <option value="committee">Comité</option>
              </select>
              <GhButton
                onClick={() => createRound.mutate()}
                disabled={!newRoundName.trim() || createRound.isPending}
              >
                + Ajouter
              </GhButton>
            </div>

            {(rounds ?? []).length === 0 ? (
              <EmptyState icon="⚙" title="Aucun round" description="Créez votre premier round de sélection" />
            ) : (
              <div className="space-y-2">
                {[...(rounds ?? [])].sort((a, b) => a.round_number - b.round_number).map((r, idx, arr) => (
                  <div key={r.id} className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-2 items-center ui-soft-card p-2.5">
                    <span className="font-mono text-[11px] text-primary font-bold">R{r.round_number}</span>
                    <input
                      defaultValue={r.name}
                      onBlur={(e) => {
                        const next = e.target.value.trim();
                        if (next && next !== r.name) saveRound.mutate({ id: r.id, patch: { name: next } });
                      }}
                      className="bg-card border border-border rounded-lg px-2 py-1.5 text-[12px] text-foreground"
                    />
                    <select
                      value={r.round_type}
                      onChange={(e) => saveRound.mutate({ id: r.id, patch: { round_type: e.target.value } })}
                      className="bg-card border border-border rounded-lg px-2 py-1.5 text-[12px] text-foreground"
                    >
                      <option value="evaluation">Évaluation</option>
                      <option value="interview">Entretien</option>
                      <option value="committee">Comité</option>
                    </select>
                    <button
                      onClick={() => saveRound.mutate({ id: r.id, patch: { is_active: !r.is_active } })}
                      className={`text-[11px] px-2 py-1 rounded-lg ${r.is_active ? "bg-gh-green/15 text-gh-green" : "bg-muted text-muted-foreground"}`}
                    >
                      {r.is_active ? "Actif" : "Inactif"}
                    </button>
                    <div className="flex gap-1">
                      <GhButton variant="ghost" size="sm" onClick={() => moveRound.mutate({ roundId: r.id, dir: -1 })} disabled={idx === 0}>↑</GhButton>
                      <GhButton variant="ghost" size="sm" onClick={() => moveRound.mutate({ roundId: r.id, dir: 1 })} disabled={idx === arr.length - 1}>↓</GhButton>
                    </div>
                    <GhButton variant="ghost" size="sm" onClick={() => removeRound.mutate(r.id)}>Supprimer</GhButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GhCard>
      ) : viewMode === "kanban" ? (
        /* ── Kanban View ── */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {pipelineLabels.filter(s => s.key !== "rejected").map(step => {
            const colApps = filtered?.filter(a => a.status === step.key) ?? [];
            return (
              <div key={step.key} className="min-w-[260px] flex-shrink-0 ui-panel p-2.5">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <step.Icon size={14} className="text-muted-foreground" />
                  <span className="text-[11px] uppercase tracking-wide font-bold text-foreground">{step.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-px rounded-full ml-auto">{colApps.length}</span>
                </div>
                <div className="space-y-2">
                  {colApps.map(c => (
                    <div key={c.id} className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors shadow-sm">
                      <div className="text-[12px] font-semibold text-foreground mb-1 line-clamp-1">{c.startups?.name ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground mb-2 line-clamp-1">{(c as any).projects?.name ?? "—"}</div>
                      {c.score != null && <div className="font-mono text-[11px] text-primary mb-2 bg-primary/10 inline-block px-1.5 py-0.5 rounded">{c.score}/100</div>}
                      <div className="flex gap-1">
                        {nextStatus[c.status] && <GhButton variant="primary" size="sm" onClick={() => advance.mutate({ id: c.id, status: nextStatus[c.status] })}>→</GhButton>}
                        {rounds && rounds.length > 0 && <EvaluationDialog application={c} rounds={rounds} />}
                      </div>
                    </div>
                  ))}
                  {colApps.length === 0 && <div className="text-center text-muted-foreground text-[11px] py-6 bg-surface-2 rounded-lg border border-dashed border-border">Vide</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table View ── */
        <GhCard title={filter ? `Candidatures — ${pipelineLabels.find(p => p.key === filter)?.label}` : "Toutes les candidatures"} badge={String(filtered?.length ?? 0)} noPadding>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-secondary/70">
                  {["Entreprise", "Projet", "Round", "Score", "Étape", "Date", "Actions"].map(h => (
                    <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-3.5 py-2.5 border-b border-border"><Skeleton className="h-4 w-20" /></td>)}</tr>
                  ))
                ) : !filtered || filtered.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon="📋" title="Aucune candidature" description="Les candidatures apparaîtront ici" /></td></tr>
                ) : (
                  filtered.map(c => {
                    const appRound = rounds?.find(r => r.id === (c as any).current_round_id);
                    return (
                      <tr key={c.id} className="hover:bg-secondary transition-colors">
                        <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">
                          {c.startup_id ? (
                            <button onClick={() => navigate(`/app/entreprises/${c.startup_id}`)} className="hover:text-primary transition-colors text-left">{c.startups?.name ?? "—"}</button>
                          ) : (c.startups?.name ?? "—")}
                        </td>
                        <td className="px-3.5 py-2.5 border-b border-border text-foreground">{(c as any).projects?.name ?? "—"}</td>
                        <td className="px-3.5 py-2.5 border-b border-border">
                          {appRound ? (
                            <Pill color="blue">R{appRound.round_number}</Pill>
                          ) : <span className="text-muted-foreground text-[10px]">—</span>}
                        </td>
                        <td className="px-3.5 py-2.5 border-b border-border font-mono text-primary">{c.score != null ? `${c.score}/100` : "—"}</td>
                        <td className="px-3.5 py-2.5 border-b border-border"><Pill color={stepColor[c.status] ?? "gray"}>{c.status}</Pill></td>
                        <td className="px-3.5 py-2.5 border-b border-border font-mono text-foreground">{new Date(c.submitted_at).toLocaleDateString("fr-FR")}</td>
                        <td className="px-3.5 py-2.5 border-b border-border">
                          <div className="flex gap-1">
                            {rounds && rounds.length > 0 && <EvaluationDialog application={c} rounds={rounds} />}
                            {nextStatus[c.status] && (
                              <GhButton variant="primary" disabled={advance.isPending} onClick={() => advance.mutate({ id: c.id, status: nextStatus[c.status] })}>
                                Avancer →
                              </GhButton>
                            )}
                            {c.status !== "rejected" && c.status !== "accepted" && (
                              <GhButton variant="ghost" disabled={reject.isPending} onClick={() => reject.mutate(c.id)}>Refuser</GhButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </GhCard>
      )}
    </motion.div>
  );
}
