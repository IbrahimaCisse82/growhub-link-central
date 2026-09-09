import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useProjectPlanTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project_plan_tasks", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_plan_tasks")
        .select("*")
        .eq("project_id", projectId!)
        .order("wbs", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useProjectPlanMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project_plan_milestones", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_plan_milestones")
        .select("*")
        .eq("project_id", projectId!)
        .order("target_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useProjectActivities(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project_activities", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_activities")
        .select("*")
        .eq("project_id", projectId!)
        .order("code", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function usePartnerOutreach(projectId: string | undefined) {
  return useQuery({
    queryKey: ["partner_outreach", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_outreach")
        .select("*")
        .eq("project_id", projectId!)
        .order("num", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdatePlanTask(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, progress }: { id: string; status: string; progress: number }) => {
      const { error } = await supabase
        .from("project_plan_tasks")
        .update({ status, progress })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project_plan_tasks", projectId] });
      toast.success("Tâche mise à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}

export function useUpdatePartnerOutreach(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, next_step, followup_date }: { id: string; status: string; next_step?: string | null; followup_date?: string | null }) => {
      const { error } = await supabase
        .from("partner_outreach")
        .update({ status, next_step: next_step ?? null, followup_date: followup_date ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner_outreach", projectId] });
      toast.success("Partenaire mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}
