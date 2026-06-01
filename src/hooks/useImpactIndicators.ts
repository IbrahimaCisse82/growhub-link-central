import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ImpactIndicator {
  id: string;
  program_id: string | null;
  project_id: string | null;
  sdg_number: number;
  indicator_name: string;
  unit: string | null;
  target_value: number | null;
  actual_value: number | null;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const SDG_LABELS: Record<number, string> = {
  1: "Pas de pauvreté",
  2: "Faim « zéro »",
  3: "Bonne santé et bien-être",
  4: "Éducation de qualité",
  5: "Égalité entre les sexes",
  6: "Eau propre et assainissement",
  7: "Énergie propre et abordable",
  8: "Travail décent et croissance",
  9: "Industrie, innovation, infrastructure",
  10: "Inégalités réduites",
  11: "Villes et communautés durables",
  12: "Consommation et production responsables",
  13: "Mesures contre les changements climatiques",
  14: "Vie aquatique",
  15: "Vie terrestre",
  16: "Paix, justice et institutions efficaces",
  17: "Partenariats pour la réalisation des objectifs",
};

interface UseImpactFilters {
  program_id?: string | null;
  project_id?: string | null;
}

export function useImpactIndicators(filters: UseImpactFilters = {}) {
  const qc = useQueryClient();

  const { data: indicators = [], isLoading } = useQuery({
    queryKey: ["impact_indicators", filters],
    queryFn: async () => {
      let q = supabase.from("impact_indicators" as any).select("*").order("sdg_number");
      if (filters.program_id) q = q.eq("program_id", filters.program_id);
      if (filters.project_id) q = q.eq("project_id", filters.project_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ImpactIndicator[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (i: Partial<ImpactIndicator>) => {
      const payload: any = { ...i };
      if (i.id) {
        const { error } = await supabase.from("impact_indicators" as any).update(payload).eq("id", i.id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        payload.created_by = user?.id ?? null;
        const { error } = await supabase.from("impact_indicators" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["impact_indicators"] });
      toast.success("Indicateur enregistré");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("impact_indicators" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["impact_indicators"] });
      toast.success("Supprimé");
    },
    onError: (e: any) => toast.error(e.message ?? "Suppression impossible"),
  });

  return { indicators, isLoading, upsert, remove };
}
