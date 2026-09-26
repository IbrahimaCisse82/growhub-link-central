import { motion } from "framer-motion";
import RecordActions, { STATUS_OPTIONS } from "@/components/shared/RecordActions";
import SectionHeader from "@/components/shared/SectionHeader";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjects } from "@/hooks/useProjects";
import { useMilestones } from "@/hooks/useMilestones";

const statusColor: Record<string, "green" | "blue" | "amber" | "gray"> = {
  active: "green", draft: "gray", paused: "amber", completed: "blue", cancelled: "gray",
};

export default function GanttPage() {
  const { data: projects, isLoading: lp } = useProjects();
  const { data: milestones, isLoading: lm } = useMilestones();
  const loading = lp || lm;

  // Calculate timeline range
  const allDates = projects?.flatMap(p => [p.start_date, p.end_date].filter(Boolean).map(d => new Date(d!).getTime())) ?? [];
  const minDate = allDates.length > 0 ? Math.min(...allDates) : Date.now();
  const maxDate = allDates.length > 0 ? Math.max(...allDates) : Date.now() + 90 * 86400000;
  const range = Math.max(maxDate - minDate, 1);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader title="Gantt — Timeline" subtitle="Vue chronologique des projets et jalons" />
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : (!projects || projects.length === 0) ? (
        <EmptyState icon="📅" title="Aucun projet" description="Créez des projets avec des dates pour les voir ici" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Timeline header */}
          <div className="px-4 py-2 bg-secondary border-b border-border flex">
            <div className="w-[200px] flex-shrink-0 text-[10px] font-mono text-muted-foreground uppercase">Projet</div>
            <div className="flex-1 relative h-6">
              {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                const d = new Date(minDate + range * pct);
                return <span key={pct} className="absolute text-[9px] font-mono text-muted-foreground" style={{ left: `${pct * 100}%`, transform: "translateX(-50%)" }}>{d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })}</span>;
              })}
            </div>
          </div>
          {projects.map(p => {
            const pMilestones = milestones?.filter(m => m.project_id === p.id) ?? [];
            const startPct = p.start_date ? ((new Date(p.start_date).getTime() - minDate) / range) * 100 : 0;
            const endPct = p.end_date ? ((new Date(p.end_date).getTime() - minDate) / range) * 100 : startPct + 10;
            const barWidth = Math.max(endPct - startPct, 2);

            return (
              <div key={p.id} className="flex items-center border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
                <div className="w-[200px] flex-shrink-0 px-4 py-3">
                  <div className="flex items-center justify-between gap-1"><div className="text-xs font-bold text-foreground truncate">{p.name}</div><RecordActions canDelete={false} table="projects" id={p.id} record={p} entityLabel="Planning du projet" queryKeys={["projects"]} fields={[{key:"start_date",label:"Début",type:"date"},{key:"end_date",label:"Fin",type:"date"},{key:"status",label:"Statut",type:"select",options:STATUS_OPTIONS}]} /></div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Pill color={statusColor[p.status] ?? "gray"}>{p.status}</Pill>
                    <span className="font-mono text-[9px] text-muted-foreground">{p.progress ?? 0}%</span>
                  </div>
                </div>
                <div className="flex-1 relative h-12 py-2">
                  {Date.now() >= minDate && Date.now() <= maxDate && <div className="absolute top-0 bottom-0 w-px bg-destructive/60" style={{ left: `${((Date.now() - minDate) / range) * 100}%` }} title="Aujourd'hui" />}
                  {/* Project bar */}
                  <div className="absolute h-5 rounded-md bg-primary/20 border border-primary/30" style={{ left: `${startPct}%`, width: `${barWidth}%` }}>
                    <div className="h-full rounded-md bg-primary/60" style={{ width: `${p.progress ?? 0}%` }} />
                  </div>
                  {/* Milestones */}
                  {pMilestones.map(m => {
                    if (!m.due_date) return null;
                    const mPct = ((new Date(m.due_date).getTime() - minDate) / range) * 100;
                    return <div key={m.id} className={`absolute w-2.5 h-2.5 rounded-full border-2 top-1/2 -translate-y-1/2 -translate-x-1/2 ${m.status === "completed" ? "bg-primary border-primary" : "bg-card border-gh-amber"}`} style={{ left: `${mPct}%` }} title={`${m.title} — ${new Date(m.due_date).toLocaleDateString("fr-FR")}`} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
