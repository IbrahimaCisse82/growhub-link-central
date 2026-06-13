import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MePhase = "baseline" | "midline" | "endline" | "adhoc";

export interface MeMeasurement {
  id: string;
  project_indicator_id: string | null;
  grant_indicator_id: string | null;
  project_id: string | null;
  grant_id: string | null;
  phase: MePhase;
  measured_value: number;
  measured_at: string;
  sample_size: number | null;
  methodology: string | null;
  evidence_doc_url: string | null;
  validated_by: string | null;
  validated_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeIndicatorProgress {
  indicator_id: string;
  source: "project" | "grant";
  project_id: string | null;
  grant_id: string | null;
  name: string;
  unit: string | null;
  baseline_value: number | null;
  target_value: number | null;
  current_value: number | null;
  baseline_measured: number | null;
  midline_measured: number | null;
  endline_measured: number | null;
  endline_date: string | null;
  measurement_count: number;
  achievement_pct: number | null;
  variation_vs_baseline_pct: number | null;
}

interface Filters {
  project_id?: string | null;
  grant_id?: string | null;
  project_indicator_id?: string | null;
  grant_indicator_id?: string | null;
}

export function useMeMeasurements(filters: Filters = {}) {
  const qc = useQueryClient();

  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ["me_measurements", filters],
    queryFn: async () => {
      let q = supabase.from("me_measurements" as never).select("*").order("measured_at", { ascending: false });
      if (filters.project_id) q = (q as never as { eq: (c: string, v: string) => typeof q }).eq("project_id", filters.project_id);
      if (filters.grant_id) q = (q as never as { eq: (c: string, v: string) => typeof q }).eq("grant_id", filters.grant_id);
      if (filters.project_indicator_id) q = (q as never as { eq: (c: string, v: string) => typeof q }).eq("project_indicator_id", filters.project_indicator_id);
      if (filters.grant_indicator_id) q = (q as never as { eq: (c: string, v: string) => typeof q }).eq("grant_indicator_id", filters.grant_indicator_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as MeMeasurement[];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["me_indicator_progress", filters.project_id, filters.grant_id],
    queryFn: async () => {
      let q = supabase.from("me_indicator_progress" as never).select("*");
      if (filters.project_id) q = (q as never as { eq: (c: string, v: string) => typeof q }).eq("project_id", filters.project_id);
      if (filters.grant_id) q = (q as never as { eq: (c: string, v: string) => typeof q }).eq("grant_id", filters.grant_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as MeIndicatorProgress[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (m: Partial<MeMeasurement>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...m, created_by: m.created_by ?? user?.id ?? null };
      if (m.id) {
        const { error } = await supabase.from("me_measurements" as never).update(payload as never).eq("id", m.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("me_measurements" as never).insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me_measurements"] });
      qc.invalidateQueries({ queryKey: ["me_indicator_progress"] });
      toast.success("Mesure enregistrée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("me_measurements" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me_measurements"] });
      qc.invalidateQueries({ queryKey: ["me_indicator_progress"] });
      toast.success("Mesure supprimée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const validate = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("me_measurements" as never).update({
        validated_by: user?.id,
        validated_at: new Date().toISOString(),
      } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me_measurements"] });
      toast.success("Mesure validée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { measurements, progress, isLoading, upsert, remove, validate };
}
