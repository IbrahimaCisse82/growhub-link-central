import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MonitoringPlan {
  id: string;
  project_id: string | null;
  grant_id: string | null;
  project_indicator_id: string | null;
  grant_indicator_id: string | null;
  data_source: string;
  collection_method: string | null;
  collection_frequency: string;
  responsible_user_id: string | null;
  target_phases: string[];
  disaggregation: Record<string, unknown> | null;
  quality_assurance: string | null;
  next_measurement_due: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useMonitoringPlans(filters: { project_id?: string | null; grant_id?: string | null } = {}) {
  const qc = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["me_monitoring_plans", filters],
    queryFn: async () => {
      let q = supabase.from("me_monitoring_plans" as never).select("*").order("created_at", { ascending: false });
      if (filters.project_id) q = (q as never as { eq: (c: string, v: string) => typeof q }).eq("project_id", filters.project_id);
      if (filters.grant_id) q = (q as never as { eq: (c: string, v: string) => typeof q }).eq("grant_id", filters.grant_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as MonitoringPlan[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (p: Partial<MonitoringPlan>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...p, created_by: p.created_by ?? user?.id ?? null };
      if (p.id) {
        const { error } = await supabase.from("me_monitoring_plans" as never).update(payload as never).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("me_monitoring_plans" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me_monitoring_plans"] });
      toast.success("Plan de suivi enregistré");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("me_monitoring_plans" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me_monitoring_plans"] });
      toast.success("Supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { plans, isLoading, upsert, remove };
}
