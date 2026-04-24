import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HrEmployee } from "@/lib/payroll";

export interface HrPayrollVariable {
  id?: string;
  employee_id: string;
  mois: number;
  annee: number;
  hs_115: number;
  hs_140: number;
  hs_160: number;
  hs_200: number;
  heures_absence: number;
  heures_abs_maladie: number;
  taux_maladie: number;
  nb_paniers: number;
  avance_tabaski: number;
  avance_caisse: number;
  avance_financiere: number;
  ret_cooperative: number;
  frais_medicaux: number;
  ind_kilometrique: number;
  primes_exceptionnelles: number;
  notes?: string | null;
  validated_at?: string | null;
}

export const EMPTY_PAYROLL_VARIABLE = {
  hs_115: 0, hs_140: 0, hs_160: 0, hs_200: 0, heures_absence: 0, heures_abs_maladie: 0,
  taux_maladie: 0, nb_paniers: 0, avance_tabaski: 0, avance_caisse: 0, avance_financiere: 0,
  ret_cooperative: 0, frais_medicaux: 0, ind_kilometrique: 0, primes_exceptionnelles: 0, notes: "",
};

export function useHrEmployees() {
  const qc = useQueryClient();
  const key = ["hr_employees"];

  const { data: employees = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_employees")
        .select("*")
        .is("archived_at", null)
        .order("nom", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as HrEmployee[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (emp: Partial<HrEmployee>) => {
      if (emp.id) {
        const { error } = await supabase.from("hr_employees").update(emp as any).eq("id", emp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hr_employees").insert(emp as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_employees").update({ is_active: false, archived_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { employees, isLoading, upsert, remove };
}

export function useMyHrEmployees(enabled = true) {
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["my_hr_employees"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_employees").select("*").is("archived_at", null).order("nom", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as HrEmployee[];
    },
  });
  return { employees, isLoading };
}

export function useHrPayrollHistory() {
  const qc = useQueryClient();
  const key = ["hr_payroll_history"];

  const { data: history = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_payroll_history")
        .select("*")
        .order("annee", { ascending: false })
        .order("mois", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveSnapshot = useMutation({
    mutationFn: async (snap: { mois: number; annee: number; total_brut: number; total_net: number; total_charges: number; total_masse: number; nb_employes: number }) => {
      const { error } = await supabase.from("hr_payroll_history").upsert(snap as any, { onConflict: "mois,annee" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { history, isLoading, saveSnapshot };
}

export function useHrPayrollSettings(enabled = true) {
  const qc = useQueryClient();
  const key = ["hr_payroll_settings"];
  const { data: setting, isLoading } = useQuery({
    queryKey: key,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_payroll_settings").select("*").eq("is_active", true).order("effective_from", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const save = useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      const payload = { name: "Paramètres paie Sénégal", effective_from: new Date().toISOString().slice(0, 10), settings, is_active: true };
      const { error } = setting?.id
        ? await supabase.from("hr_payroll_settings").update(payload as any).eq("id", setting.id)
        : await supabase.from("hr_payroll_settings").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return { setting, isLoading, save };
}

export function useHrPayrollVariables(mois: number, annee: number, enabled = true) {
  const qc = useQueryClient();
  const key = ["hr_payroll_variables", mois, annee];
  const { data: variables = [], isLoading } = useQuery({
    queryKey: key,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_payroll_variables").select("*").eq("mois", mois).eq("annee", annee);
      if (error) throw error;
      return (data ?? []) as unknown as HrPayrollVariable[];
    },
  });
  const saveVariable = useMutation({
    mutationFn: async (variable: Partial<HrPayrollVariable> & { employee_id: string }) => {
      const { error } = await supabase.from("hr_payroll_variables").upsert({ ...EMPTY_PAYROLL_VARIABLE, ...variable, mois, annee } as any, { onConflict: "employee_id,mois,annee" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return { variables, isLoading, saveVariable };
}

export function useHrPayrollRuns(enabled = true) {
  const qc = useQueryClient();
  const key = ["hr_payroll_runs"];
  const { data: runs = [], isLoading } = useQuery({
    queryKey: key,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_payroll_runs").select("*, hr_payslips(*)").order("annee", { ascending: false }).order("mois", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const upsertRun = useMutation({
    mutationFn: async (run: Record<string, unknown>) => {
      const { data, error } = await supabase.from("hr_payroll_runs").upsert(run as any, { onConflict: "mois,annee" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  const savePayslips = useMutation({
    mutationFn: async (rows: Record<string, unknown>[]) => {
      const { error } = await supabase.from("hr_payslips").upsert(rows as any, { onConflict: "payroll_run_id,employee_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  const updateRunStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "calculated" | "validated" | "closed" | "cancelled" }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "closed") patch.closed_at = new Date().toISOString();
      if (status === "validated") patch.validated_at = new Date().toISOString();
      const { error } = await supabase.from("hr_payroll_runs").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  return { runs, isLoading, upsertRun, savePayslips, updateRunStatus };
}
