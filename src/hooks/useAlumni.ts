import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AlumniStatus = "active" | "growing" | "paused" | "closed" | "acquired";

export interface AlumniRecord {
  id: string;
  startup_id: string | null;
  program_id: string | null;
  cohort_id: string | null;
  graduation_date: string;
  status: AlumniStatus;
  impact_summary: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  startup?: { id: string; name: string; sector: string | null; city: string | null; country: string | null } | null;
  program?: { id: string; name: string } | null;
  cohort?: { id: string; name: string } | null;
}

export interface AlumniKpi {
  id?: string;
  alumni_id: string;
  recorded_at: string;
  revenue_xof?: number;
  jobs_total?: number;
  jobs_women?: number;
  jobs_youth?: number;
  funding_raised_xof?: number;
  exports_xof?: number;
  customers_count?: number;
  notes?: string | null;
}

export const ALUMNI_STATUS_LABEL: Record<AlumniStatus, string> = {
  active: "Actif",
  growing: "En croissance",
  paused: "En pause",
  closed: "Fermé",
  acquired: "Racheté",
};

// Legacy compat — entreprises marquées comme alumni
export function useAlumni() {
  return useQuery({
    queryKey: ["alumni"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startups")
        .select("*, cohorts(name, projects(name, programs(name)))")
        .eq("is_alumni", true)
        .order("alumni_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useToggleAlumni() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_alumni, alumni_date, alumni_notes }: { id: string; is_alumni: boolean; alumni_date?: string; alumni_notes?: string }) => {
      const { error } = await supabase.from("startups").update({ is_alumni, alumni_date, alumni_notes } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alumni"] });
      qc.invalidateQueries({ queryKey: ["startups"] });
      toast.success("Statut alumni mis à jour");
    },
    onError: () => toast.error("Erreur"),
  });
}

// ===== Records =====
export function useAlumniRecords() {
  const qc = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["alumni_records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alumni_records" as any)
        .select("*, startup:startups(id,name,sector,city,country), program:programs(id,name), cohort:cohorts(id,name)")
        .order("graduation_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AlumniRecord[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (r: Partial<AlumniRecord>) => {
      const payload: any = { ...r };
      if (r.id) {
        const { error } = await supabase.from("alumni_records" as any).update(payload).eq("id", r.id);
        if (error) throw error;
        return r.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        payload.created_by = user?.id ?? null;
        const { data, error } = await supabase.from("alumni_records" as any).insert(payload).select("id").single();
        if (error) throw error;
        return (data as any).id as string;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alumni_records"] }); toast.success("Alumni enregistré"); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alumni_records" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alumni_records"] }); toast.success("Alumni supprimé"); },
    onError: (e: any) => toast.error(e.message ?? "Suppression impossible"),
  });

  return { records, isLoading, upsert, remove };
}

// ===== KPIs =====
export function useAlumniKpis(alumni_id?: string) {
  const qc = useQueryClient();

  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ["alumni_kpis", alumni_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alumni_kpis" as any)
        .select("*")
        .eq("alumni_id", alumni_id!)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AlumniKpi[];
    },
    enabled: !!alumni_id,
  });

  const insert = useMutation({
    mutationFn: async (k: Partial<AlumniKpi>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = { ...k, created_by: user?.id ?? null };
      const { error } = await supabase.from("alumni_kpis" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alumni_kpis", alumni_id] }); toast.success("KPI enregistré"); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alumni_kpis" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alumni_kpis", alumni_id] }); },
    onError: (e: any) => toast.error(e.message ?? "Suppression impossible"),
  });

  return { kpis, isLoading, insert, remove };
}
