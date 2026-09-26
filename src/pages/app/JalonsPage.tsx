import { useState } from "react";
import { motion } from "framer-motion";
import RecordActions, { STATUS_OPTIONS } from "@/components/shared/RecordActions";
import SectionHeader from "@/components/shared/SectionHeader";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useMilestones } from "@/hooks/useMilestones";

const statusColor: Record<string, "green" | "blue" | "amber" | "gray"> = {
  completed: "green", pending: "amber", in_progress: "blue", cancelled: "gray",
};

function TimelineView({ milestones }: { milestones: any[] }) {
  const sorted = [...milestones].sort((a, b) => {
    const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    return da - db;
  });

  return (
    <div className="relative pl-8 space-y-0">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-border" />
      {sorted.map((m, i) => {
        const isComplete = m.status === "completed";
        const isOverdue = !isComplete && m.due_date && new Date(m.due_date) < new Date();
        return (
          <div key={m.id} className="relative pb-6 last:pb-0">
            {/* Dot */}
            <div className={`absolute -left-[18px] top-1 w-3 h-3 rounded-full border-2 ${
              isComplete ? "bg-primary border-primary" : isOverdue ? "bg-destructive border-destructive" : "bg-card border-border"
            }`} />
            <div className="bg-card border border-border rounded-lg p-4 hover:border-border/80 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">{m.title}</div>
                  {m.description && <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[300px]">{m.description}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {m.projects?.name ?? "—"}
                    {m.depends_on && <span className="ml-2 text-primary">↳ dépend d'un autre jalon</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Pill color={statusColor[m.status ?? "pending"] ?? "gray"}>{m.status ?? "pending"}</Pill>
                  {m.due_date && (
                    <span className={`text-[10px] font-mono ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {new Date(m.due_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function JalonsPage() {
  const { data: milestones, isLoading } = useMilestones();
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <SectionHeader
        title="Jalons"
        subtitle="Jalons rattachés aux projets"
        actions={
          <div className="flex bg-surface-2 border border-border rounded-lg p-0.5">
            <button onClick={() => setViewMode("table")} className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${viewMode === "table" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              ☰ Tableau
            </button>
            <button onClick={() => setViewMode("timeline")} className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${viewMode === "timeline" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              ⏳ Timeline
            </button>
          </div>
        }
      />
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : !milestones || milestones.length === 0 ? (
        <EmptyState icon="🏁" title="Aucun jalon" description="Les jalons apparaîtront ici une fois créés dans les projets" />
      ) : viewMode === "timeline" ? (
        <TimelineView milestones={milestones} />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary">
                <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-muted-foreground">Jalon</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-muted-foreground">Projet</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-muted-foreground">Statut</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-muted-foreground">Échéance</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-muted-foreground">Terminé le</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {milestones.map(m => (
                <tr key={m.id} className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground text-xs">{m.title}</div>
                    {m.description && <div className="text-[10px] text-muted-foreground truncate max-w-[250px]">{m.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.projects?.name ?? "—"}</td>
                  <td className="px-4 py-3"><Pill color={statusColor[m.status ?? "pending"] ?? "gray"}>{m.status ?? "pending"}</Pill></td>
                  <td className="px-4 py-3 text-[10px] font-mono text-muted-foreground">{m.due_date ? new Date(m.due_date).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="px-4 py-3 text-[10px] font-mono text-muted-foreground">{m.completed_at ? new Date(m.completed_at).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="px-4 py-3"><RecordActions table="milestones" id={m.id} record={m} entityLabel="Jalon" queryKeys={["milestones"]} fields={[{key:"title",label:"Titre",required:true},{key:"due_date",label:"Échéance",type:"date"},{key:"status",label:"Statut",type:"select",options:[{value:"pending",label:"En attente"},{value:"in_progress",label:"En cours"},{value:"completed",label:"Terminé"},{value:"delayed",label:"En retard"}]},{key:"description",label:"Description",type:"textarea"}]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
