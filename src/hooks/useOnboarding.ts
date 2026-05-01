import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useOnboarding() {
  const { user, profile, refetchProfile } = useAuth();
  const qc = useQueryClient();

  const isCompleted = !!profile?.onboarding_completed_at;
  const stepsDone = (profile?.onboarding_steps_done as string[] | null) ?? [];

  const markStep = useMutation({
    mutationFn: async (stepKey: string) => {
      if (!user) return;
      const next = Array.from(new Set([...(stepsDone ?? []), stepKey]));
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_steps_done: next })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchProfile();
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    },
  });

  const complete = useMutation({
    mutationFn: async (persona: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_completed_at: new Date().toISOString(),
          onboarding_persona: persona,
        })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchProfile();
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    },
  });

  return { isCompleted, stepsDone, markStep, complete };
}
