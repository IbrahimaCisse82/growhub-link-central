import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MentorBlacklist {
  id: string;
  mentor_id: string;
  startup_id: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export function useMentorBlacklists(startupId?: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["mentor_blacklists", startupId],
    queryFn: async (): Promise<MentorBlacklist[]> => {
      let req = supabase.from("mentor_blacklists").select("*");
      if (startupId) req = req.eq("startup_id", startupId);
      const { data, error } = await req.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MentorBlacklist[];
    },
  });

  const add = useMutation({
    mutationFn: async (payload: { mentor_id: string; startup_id: string; reason?: string }) => {
      const { error } = await supabase.from("mentor_blacklists").insert({
        mentor_id: payload.mentor_id,
        startup_id: payload.startup_id,
        reason: payload.reason ?? null,
        created_by: user?.id ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mentor_blacklists"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mentor_blacklists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mentor_blacklists"] }),
  });

  return {
    blacklist: query.data ?? [],
    isLoading: query.isLoading,
    isBlacklisted: (mentorId: string) =>
      (query.data ?? []).some(b => b.mentor_id === mentorId),
    add: add.mutateAsync,
    remove: remove.mutateAsync,
  };
}
