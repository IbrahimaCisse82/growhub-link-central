import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useGdprExportRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["gdpr_export_requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_export_requests")
        .select("*")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRequestGdprExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("gdpr-export");
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gdpr_export_requests"] }),
  });
}

export function useAccountDeletionRequest() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["account_deletion_request", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_deletion_requests")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useRequestAccountDeletion() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (reason: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("account_deletion_requests")
        .upsert(
          { user_id: user.id, reason, status: "scheduled", scheduled_for: new Date(Date.now() + 30 * 86400000).toISOString() },
          { onConflict: "user_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account_deletion_request"] }),
  });
}

export function useCancelAccountDeletion() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("account_deletion_requests")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account_deletion_request"] }),
  });
}
