import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FolderKanban, Flag, AlertTriangle, CheckSquare, Wallet, Users, ArrowRight } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import SectionHeader from "@/components/shared/SectionHeader";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useMilestones } from "@/hooks/useMilestones";
import { useTasks } from "@/hooks/useTasks";
import { useRisks } from "@/hooks/useRisks";
import { useAccessibleProjectIds } from "@/hooks/useAccessibleProjects";

const statusColor: Record<string, "green" | "blue" | "amber" | "gray"> = {
  active: "green", draft: "gray", paused: "amber", completed: "blue", cancelled: "gray",
};

/** Dashboard contextuel pour un Chef de projet (project_manager). */
export default function ProjectManagerDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: projects } = useProjects();
  const { data: milestones } = useMilestones();
  const { data: tasks } = useTasks();
  const { data: risks } = useRisks();
  const { data: accessibleIds } = useAccessibleProjectIds();

  // Scope : owner direct + projets accessibles via role_assignments (PM scopé sur projet)
  const myProjects = useMemo(
    () => (projects ?? []).filter((p) => p.owner_id === profile?.user_id || accessibleIds?.has(p.id)),
    [projects, profile?.user_id, accessibleIds]
  );
  const myProjectIds = new Set(myProjects.map((p) => p.id));

  const myMilestones = (milestones ?? []).filter((m) => myProjectIds.has(m.project_id));
  const myTasks = (tasks ?? []).filter((t) => t.assignee_id === profile?.user_id);
  const myRisks = (risks ?? []).filter((r) => myProjectIds.has(r.project_id));

  const overdueMs = myMilestones.filter(
    (m) => m.due_date && new Date(m.due_date) < new Date() && m.status !== "completed"
  ).length;
  const openTasks = myTasks.filter((t) => t.status !== "done").length;
  const criticalRisks = myRisks.filter((r) => r.level === "critical" || r.level === "high").length;
  const totalBudget = myProjects.reduce((sum, p) => sum + Number(p.budget ?? 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <SectionHeader
        title={`Bonjour ${profile?.full_name?.split(" ")[0] ?? ""}`}
        subtitle="Vue Chef de projet — vos projets, jalons et risques"
        actions={<GhButton variant="primary" onClick={() => navigate("/app/projets")}>+ Nouveau projet</GhButton>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        <div onClick={() => navigate("/app/projets")} className="cursor-pointer">
          <StatCard label="Mes projets" value={String(myProjects.length)} note="" icon={<FolderKanban size={20} />} color="blue" />
        </div>
        <div onClick={() => navigate("/app/jalons")} className="cursor-pointer">
          <StatCard label="Jalons en retard" value={String(overdueMs)} note="" icon={<Flag size={20} />} color={overdueMs > 0 ? "amber" : "green"} />
        </div>
        <div onClick={() => navigate("/app/taches")} className="cursor-pointer">
          <StatCard label="Mes tâches ouvertes" value={String(openTasks)} note="" icon={<CheckSquare size={20} />} color="purple" />
        </div>
        <div onClick={() => navigate("/app/risques")} className="cursor-pointer">
          <StatCard label="Risques critiques" value={String(criticalRisks)} note="" icon={<AlertTriangle size={20} />} color={criticalRisks > 0 ? "rose" : "green"} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <GhCard
          title="Mes projets"
          badge={String(myProjects.length)}
          action={<GhButton variant="ghost" onClick={() => navigate("/app/projets")}>Voir tout</GhButton>}
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-secondary">
                  {["Projet", "Programme", "Statut", "Avancement"].map((h) => (
                    <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myProjects.length === 0 ? (
                  <tr><td colSpan={4} className="px-3.5 py-8 text-center text-muted-foreground text-sm">Aucun projet assigné</td></tr>
                ) : (
                  myProjects.slice(0, 8).map((p) => (
                    <tr key={p.id} className="hover:bg-secondary cursor-pointer" onClick={() => navigate(`/app/projets/${p.id}`)}>
                      <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">{p.name}</td>
                      <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground text-[11px]">{p.programs?.name ?? "—"}</td>
                      <td className="px-3.5 py-2.5 border-b border-border"><Pill color={statusColor[p.status] ?? "gray"}>{p.status}</Pill></td>
                      <td className="px-3.5 py-2.5 border-b border-border">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${p.progress ?? 0}%` }} />
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

        <div className="flex flex-col gap-4">
          <GhCard title="Budget consolidé" action={<GhButton variant="ghost" onClick={() => navigate("/app/budgets")}>Détail</GhButton>}>
            <div className="flex items-baseline gap-2">
              <Wallet size={18} className="text-primary" />
              <div className="font-mono text-2xl font-bold text-foreground">
                {new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(totalBudget)}
              </div>
              <div className="text-[10px] text-muted-foreground">FCFA</div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">{myProjects.length} projets cumulés</div>
          </GhCard>

          <GhCard title="Risques actifs" badge={String(myRisks.length)} action={<GhButton variant="ghost" onClick={() => navigate("/app/risques")}>Voir tout</GhButton>}>
            {myRisks.length === 0 ? (
              <div className="text-[11.5px] text-muted-foreground text-center py-4">Aucun risque</div>
            ) : (
              <div className="flex flex-col gap-2">
                {myRisks.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0">
                    <div className="text-[11.5px] font-medium text-foreground truncate flex-1 min-w-0">{r.title}</div>
                    <Pill color={r.level === "critical" ? "rose" : r.level === "high" ? "amber" : "gray"}>{r.level}</Pill>
                  </div>
                ))}
              </div>
            )}
          </GhCard>

          <GhCard title="Accès rapide">
            <div className="flex flex-col gap-1">
              {[
                { label: "Gantt", path: "/app/gantt", icon: FolderKanban },
                { label: "Équipe", path: "/app/utilisateurs", icon: Users },
                { label: "Rapports", path: "/app/rapports", icon: ArrowRight },
              ].map((it) => (
                <button key={it.path} onClick={() => navigate(it.path)} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-secondary text-left">
                  <it.icon size={14} className="text-muted-foreground" />
                  <span className="text-[12.5px] font-medium text-foreground">{it.label}</span>
                </button>
              ))}
            </div>
          </GhCard>
        </div>
      </div>
    </motion.div>
  );
}
