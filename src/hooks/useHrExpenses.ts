import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type HrExpenseStatus = "draft" | "submitted" | "approved" | "rejected" | "reimbursed";

export interface HrExpenseLine {
  id?: string;
  report_id?: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  currency?: string;
  tax_rate?: number;
  receipt_url?: string | null;
  sort_order?: number;
  project_id?: string | null;
}

export interface HrExpenseReport {
  id?: string;
  employee_id: string;
  reference?: string | null;
  title: string;
  period_start: string;
  period_end: string;
  total_amount?: number;
  currency?: string;
  status?: HrExpenseStatus;
  notes?: string | null;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  reimbursed_at?: string | null;
  reimbursement_mois?: number | null;
  reimbursement_annee?: number | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const EXPENSE_CATEGORIES = [
  "Transport",
  "Hébergement",
  "Restauration",
  "Carburant",
  "Fournitures",
  "Communication",
  "Formation",
  "Équipement",
  "Autre",
];

export function useHrExpenseReports(filters?: { employee_id?: string; status?: HrExpenseStatus; year?: number }) {
  const qc = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["hr_expense_reports", filters],
    queryFn: async () => {
      let q = supabase
        .from("hr_expense_reports" as any)
        .select("*, employee:hr_employees(id, matricule, prenom, nom, fonction)")
        .order("created_at", { ascending: false });
      if (filters?.employee_id) q = q.eq("employee_id", filters.employee_id);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.year) {
        q = q.gte("period_start", `${filters.year}-01-01`).lte("period_start", `${filters.year}-12-31`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const upsertReport = useMutation({
    mutationFn: async (r: Partial<HrExpenseReport>) => {
      if (r.id) {
        const { error } = await supabase.from("hr_expense_reports" as any).update(r as any).eq("id", r.id);
        if (error) throw error;
        return r.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const payload = { ...r, created_by: user?.id ?? null };
        const { data, error } = await supabase.from("hr_expense_reports" as any).insert(payload as any).select("id").single();
        if (error) throw error;
        return (data as any).id as string;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr_expense_reports"] });
      toast.success("Note de frais enregistrée");
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur d'enregistrement"),
  });

  const submitReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hr_expense_reports" as any)
        .update({ status: "submitted", submitted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr_expense_reports"] });
      toast.success("Note soumise pour approbation");
    },
    onError: (e: any) => toast.error(e.message ?? "Soumission impossible"),
  });

  const approveReport = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("hr_expense_reports" as any)
        .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null, rejection_reason: null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr_expense_reports"] });
      toast.success("Note approuvée");
    },
    onError: (e: any) => toast.error(e.message ?? "Approbation impossible"),
  });

  const rejectReport = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("hr_expense_reports" as any)
        .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null, rejection_reason: reason } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr_expense_reports"] });
      toast.success("Note rejetée");
    },
    onError: (e: any) => toast.error(e.message ?? "Rejet impossible"),
  });

  const markReimbursed = useMutation({
    mutationFn: async ({ id, mois, annee }: { id: string; mois: number; annee: number }) => {
      const { error } = await supabase
        .from("hr_expense_reports" as any)
        .update({ status: "reimbursed", reimbursed_at: new Date().toISOString(), reimbursement_mois: mois, reimbursement_annee: annee } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr_expense_reports"] });
      toast.success("Note marquée comme remboursée");
    },
    onError: (e: any) => toast.error(e.message ?? "Action impossible"),
  });

  const removeReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_expense_reports" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr_expense_reports"] });
      toast.success("Note supprimée");
    },
    onError: (e: any) => toast.error(e.message ?? "Suppression impossible"),
  });

  return { reports, isLoading, upsertReport, submitReport, approveReport, rejectReport, markReimbursed, removeReport };
}

export function useHrExpenseLines(report_id?: string) {
  const qc = useQueryClient();

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ["hr_expense_lines", report_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_expense_lines" as any)
        .select("*")
        .eq("report_id", report_id!)
        .order("sort_order")
        .order("expense_date");
      if (error) throw error;
      return (data ?? []) as unknown as HrExpenseLine[];
    },
    enabled: !!report_id,
  });

  const upsertLine = useMutation({
    mutationFn: async (line: Partial<HrExpenseLine>) => {
      if (line.id) {
        const { error } = await supabase.from("hr_expense_lines" as any).update(line as any).eq("id", line.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hr_expense_lines" as any).insert(line as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr_expense_lines", report_id] }),
    onError: (e: any) => toast.error(e.message ?? "Erreur ligne"),
  });

  const removeLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_expense_lines" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr_expense_lines", report_id] }),
    onError: (e: any) => toast.error(e.message ?? "Suppression impossible"),
  });

  return { lines, isLoading, upsertLine, removeLine };
}

/**
 * Upload d'un justificatif (chemin: {user_id}/{report_id}/{filename})
 * Retourne le chemin (pas l'URL signée) — à signer à la lecture.
 */
export async function uploadExpenseReceipt(report_id: string, file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ext = file.name.split(".").pop() || "bin";
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${user.id}/${report_id}/${safe}`;
  const { error } = await supabase.storage.from("hr-expense-receipts").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function getReceiptSignedUrl(path: string, expiresIn = 60 * 10): Promise<string> {
  const { data, error } = await supabase.storage.from("hr-expense-receipts").createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
