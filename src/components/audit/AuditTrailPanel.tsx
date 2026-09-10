import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import Pill from "@/components/shared/Pill";
import { History } from "lucide-react";

const actionLabels: Record<string, { label: string; color: "green" | "blue" | "rose" | "amber" }> = {
  create: { label: "Création", color: "green" },
  update: { label: "Modification", color: "blue" },
  delete: { label: "Suppression", color: "rose" },
};

const entityLabels: Record<string, string> = {
  projects: "Projet",
  startups: "Entreprise",
  cohorts: "Cohorte",
  programs: "Programme",
  grants: "Grant",
  events: "Événement",
  coaching_sessions: "Session coaching",
  applications: "Candidature",
  tasks: "Tâche",
  milestones: "Jalon",
  budgets: "Budget",
  risks: "Risque",
};

interface AuditTrailPanelProps {
  entityType?: string;
  entityId?: string;
  limit?: number;
}

export default function AuditTrailPanel({ entityType, entityId, limit = 20 }: AuditTrailPanelProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-trail", entityType, entityId],
    queryFn: async () => {
      let query = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (entityType) query = query.eq("entity_type", entityType);
      if (entityId) query = query.eq("entity_id", entityId);

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user names
      const userIds = [...new Set(data.filter(d => d.user_id).map(d => d.user_id!))];
      const { data: profiles } = await supabase
        .from("profiles_safe")
        .select("user_id, full_name")
        .in("user_id", userIds);

      return data.map(log => ({
        ...log,
        user_name: profiles?.find(p => p.user_id === log.user_id)?.full_name ?? "Système",
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History size={24} className="mx-auto mb-2 opacity-50" />
        <div className="text-sm">Aucune activité enregistrée</div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map((log, idx) => {
        const meta = log.metadata as Record<string, any> | null;
        const action = actionLabels[log.action] ?? { label: log.action, color: "amber" as const };
        const entity = entityLabels[log.entity_type ?? ""] ?? log.entity_type ?? "";

        return (
          <div key={log.id} className="relative pl-6">
            {/* Timeline line */}
            {idx < logs.length - 1 && (
              <div className="absolute left-[9px] top-6 bottom-0 w-px bg-border" />
            )}
            {/* Dot */}
            <div className={`absolute left-0 top-2 w-[18px] h-[18px] rounded-full border-2 border-card flex items-center justify-center ${
              action.color === "green" ? "bg-gh-green" :
              action.color === "blue" ? "bg-primary" :
              action.color === "rose" ? "bg-destructive" : "bg-gh-amber"
            }`}>
              <div className="w-1.5 h-1.5 rounded-full bg-card" />
            </div>

            <div className="bg-surface-2 rounded-lg px-3 py-2.5 mb-2 ml-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-foreground">{log.user_name}</span>
                <Pill color={action.color}>{action.label}</Pill>
                {entity && <span className="text-[10px] text-muted-foreground">{entity}</span>}
                {meta?.name && <span className="text-[10px] font-medium text-foreground">"{meta.name}"</span>}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground mt-1">
                {format(new Date(log.created_at), "dd MMM yyyy · HH:mm", { locale: fr })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
