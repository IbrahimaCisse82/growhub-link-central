import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  is_approved: boolean;
  is_suspended: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
  last_active_at: string | null;
  created_at: string;
  roles: string[];
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, is_approved, is_suspended, suspended_at, suspension_reason, last_active_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesError) throw rolesError;

      const roleMap = new Map<string, string[]>();
      allRoles?.forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });

      return (profiles ?? []).map((p) => ({
        ...p,
        roles: roleMap.get(p.user_id) ?? [],
      })) as UserWithRole[];
    },
  });
}

export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ is_approved: true }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useRevokeUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({ is_approved: false }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const { error } = await supabase.from("profiles").update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspension_reason: reason ?? null,
      }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").update({
        is_suspended: false,
        suspended_at: null,
        suspension_reason: null,
      }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error: insError } = await supabase.from("user_roles").upsert(
        { user_id: userId, role: newRole as AppRole },
        { onConflict: "user_id,role" }
      );
      if (insError) throw insError;
      const { error: delError } = await supabase
        .from("user_roles").delete().eq("user_id", userId).neq("role", newRole as AppRole);
      if (delError) throw delError;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useInvitations() {
  return useQuery({
    queryKey: ["admin-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useInvitationReminders(invitationId?: string) {
  return useQuery({
    queryKey: ["invitation-reminders", invitationId],
    queryFn: async () => {
      if (!invitationId) return [];
      const { data, error } = await supabase
        .from("invitation_reminders")
        .select("*")
        .eq("invitation_id", invitationId)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!invitationId,
  });
}

export function useResendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invitationId, extendExpiry }: { invitationId: string; extendExpiry?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("resend-invitation", {
        body: { invitationId, extendExpiry: extendExpiry ?? false },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-invitations"] });
      qc.invalidateQueries({ queryKey: ["invitation-reminders"] });
    },
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("invitations").update({ status: "revoked" }).eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-invitations"] }),
  });
}
