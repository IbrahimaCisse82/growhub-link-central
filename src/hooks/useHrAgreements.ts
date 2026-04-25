import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HrAgreement {
  id?: string;
  code: string;
  nom: string;
  secteur?: string | null;
  date_signature?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export interface HrSalaryCategory {
  id?: string;
  agreement_id: string;
  code: string;
  libelle: string;
  statut: string;
  salaire_minima: number;
  sort_order?: number;
}

export function useHrAgreements() {
  const qc = useQueryClient();

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ["hr_agreements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_collective_agreements" as any)
        .select("*")
        .order("nom");
      if (error) throw error;
      return (data ?? []) as unknown as HrAgreement[];
    },
  });

  const upsertAgreement = useMutation({
    mutationFn: async (a: Partial<HrAgreement>) => {
      if (a.id) {
        const { error } = await supabase.from("hr_collective_agreements" as any).update(a as any).eq("id", a.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hr_collective_agreements" as any).insert(a as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr_agreements"] }),
  });

  const removeAgreement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_collective_agreements" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr_agreements"] });
      qc.invalidateQueries({ queryKey: ["hr_salary_categories"] });
    },
  });

  return { agreements, isLoading, upsertAgreement, removeAgreement };
}

export function useHrSalaryCategories(agreement_id?: string) {
  const qc = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["hr_salary_categories", agreement_id],
    queryFn: async () => {
      let q = supabase.from("hr_salary_categories" as any).select("*").order("sort_order").order("code");
      if (agreement_id) q = q.eq("agreement_id", agreement_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as HrSalaryCategory[];
    },
    enabled: agreement_id !== undefined,
  });

  const upsertCategory = useMutation({
    mutationFn: async (c: Partial<HrSalaryCategory>) => {
      if (c.id) {
        const { error } = await supabase.from("hr_salary_categories" as any).update(c as any).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hr_salary_categories" as any).insert(c as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr_salary_categories"] }),
  });

  const removeCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_salary_categories" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr_salary_categories"] }),
  });

  return { categories, isLoading, upsertCategory, removeCategory };
}
