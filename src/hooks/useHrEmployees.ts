import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HrEmployee } from "@/lib/payroll";

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
