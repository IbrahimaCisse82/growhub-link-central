import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type GrantTransaction = Tables["grant_transactions"]["Row"];
export type GrantActivity = Tables["grant_activities"]["Row"];
export type GrantDisbursement = Tables["grant_disbursements"]["Row"];
export type GrantIndicator = Tables["grant_indicators"]["Row"];
export type GrantReport = Tables["grant_reports"]["Row"];
export type GrantDocument = Tables["grant_documents"]["Row"];
export type GrantChange = Tables["grant_changes"]["Row"] & { user_name?: string };
export type Grant = Tables["grants"]["Row"];
export type GrantStatus = Database["public"]["Enums"]["grant_status"];

// ─── Grant Detail ────────────────────────────────────────────────
export function useGrantDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["grant_detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("grants").select("*, programs(name, code)").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Transactions ────────────────────────────────────────────────
export function useGrantTransactions(grantId: string | undefined) {
  return useQuery({
    queryKey: ["grant_transactions", grantId],
    enabled: !!grantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grant_transactions")
        .select("*")
        .eq("grant_id", grantId!)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTransaction(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Tables["grant_transactions"]["Insert"]) => {
      const { error } = await supabase.from("grant_transactions").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_transactions", grantId] }); toast({ title: "Transaction créée" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateTransaction(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Tables["grant_transactions"]["Update"] & { id: string }) => {
      const { error } = await supabase.from("grant_transactions").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_transactions", grantId] }); toast({ title: "Transaction modifiée" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteTransaction(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (txId: string) => {
      const { error } = await supabase.from("grant_transactions").delete().eq("id", txId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_transactions", grantId] }); toast({ title: "Transaction supprimée" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

// ─── Activities ──────────────────────────────────────────────────
export function useGrantActivities(grantId: string | undefined) {
  return useQuery({
    queryKey: ["grant_activities", grantId],
    enabled: !!grantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grant_activities")
        .select("*")
        .eq("grant_id", grantId!)
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveActivity(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Tables["grant_activities"]["Insert"] & { id?: string }) => {
      if (id) {
        const { error } = await supabase.from("grant_activities").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("grant_activities").insert({ ...payload, grant_id: grantId });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_activities", grantId] }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteActivity(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grant_activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_activities", grantId] }); toast({ title: "Activité supprimée" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

// ─── Disbursements ───────────────────────────────────────────────
export function useGrantDisbursements(grantId: string | undefined) {
  return useQuery({
    queryKey: ["grant_disbursements", grantId],
    enabled: !!grantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grant_disbursements")
        .select("*")
        .eq("grant_id", grantId!)
        .order("tranche_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveDisbursement(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Tables["grant_disbursements"]["Insert"] & { id?: string }) => {
      if (id) {
        const { error } = await supabase.from("grant_disbursements").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("grant_disbursements").insert({ ...payload, grant_id: grantId });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_disbursements", grantId] }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useApproveDisbursement(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, userId }: { id: string; amount: number; userId?: string }) => {
      const { error } = await supabase.from("grant_disbursements").update({
        status: "approved", amount_approved: amount, approved_by: userId ?? null, approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_disbursements", grantId] }); toast({ title: "Décaissement approuvé" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useReceiveDisbursement(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase.from("grant_disbursements").update({
        status: "received", amount_received: amount, received_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_disbursements", grantId] }); toast({ title: "Réception confirmée" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteDisbursement(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grant_disbursements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_disbursements", grantId] }); toast({ title: "Décaissement supprimé" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

// ─── Indicators ──────────────────────────────────────────────────
export function useGrantIndicators(grantId: string | undefined) {
  return useQuery({
    queryKey: ["grant_indicators", grantId],
    enabled: !!grantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grant_indicators")
        .select("*")
        .eq("grant_id", grantId!)
        .order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveIndicator(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Tables["grant_indicators"]["Insert"] & { id?: string }) => {
      if (id) {
        const { error } = await supabase.from("grant_indicators").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("grant_indicators").insert({ ...payload, grant_id: grantId });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_indicators", grantId] }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteIndicator(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grant_indicators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_indicators", grantId] }); toast({ title: "Indicateur supprimé" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

// ─── Reports ─────────────────────────────────────────────────────
export function useGrantReports(grantId: string | undefined) {
  return useQuery({
    queryKey: ["grant_reports", grantId],
    enabled: !!grantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grant_reports")
        .select("*")
        .eq("grant_id", grantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveReport(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Tables["grant_reports"]["Insert"] & { id?: string }) => {
      if (id) {
        const { error } = await supabase.from("grant_reports").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("grant_reports").insert({ ...payload, grant_id: grantId });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_reports", grantId] }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteReport(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grant_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_reports", grantId] }); toast({ title: "Rapport supprimé" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

// ─── Documents ───────────────────────────────────────────────────
export function useGrantDocuments(grantId: string | undefined) {
  return useQuery({
    queryKey: ["grant_documents", grantId],
    enabled: !!grantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grant_documents")
        .select("*")
        .eq("grant_id", grantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDocument(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Tables["grant_documents"]["Insert"]) => {
      const { error } = await supabase.from("grant_documents").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_documents", grantId] }); toast({ title: "Document ajouté" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteDocument(grantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grant_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_documents", grantId] }); toast({ title: "Document supprimé" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

// ─── Changes / History ───────────────────────────────────────────
export function useGrantChanges(grantId: string | undefined) {
  return useQuery({
    queryKey: ["grant_changes", grantId],
    enabled: !!grantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("grant_changes").select("*").eq("grant_id", grantId!).order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((data ?? []).map(c => c.user_id).filter(Boolean))] as string[];
      let profiles: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: pData } = await supabase.from("profiles_safe").select("user_id, full_name").in("user_id", userIds);
        profiles = Object.fromEntries((pData ?? []).map(p => [p.user_id, p.full_name]));
      }
      return (data ?? []).map(c => ({ ...c, user_name: profiles[c.user_id ?? ""] ?? "Système" })) as GrantChange[];
    },
  });
}

// ─── Budget lines ────────────────────────────────────────────────
export function useGrantBudgetLines(grantId: string | undefined) {
  return useQuery({
    queryKey: ["grant_budget_lines", grantId],
    enabled: !!grantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*, projects(name)")
        .eq("grant_id", grantId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useGrantProjectBudgetLines(grantId: string | undefined) {
  return useQuery({
    queryKey: ["grant_project_budget_lines", grantId],
    enabled: !!grantId,
    queryFn: async () => {
      const { data: budgetData } = await supabase.from("budgets").select("project_id").eq("grant_id", grantId!);
      const projectIds = [...new Set((budgetData ?? []).map(b => b.project_id).filter(Boolean))] as string[];
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase.from("project_budget_lines").select("*, projects(name)").in("project_id", projectIds).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
