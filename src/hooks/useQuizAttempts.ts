import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface QuizAttempt {
  id: string;
  module_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  answers: unknown[];
  duration_seconds: number | null;
  created_at: string;
}

export function useQuizAttempts(moduleId?: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["quiz_attempts", moduleId, user?.id],
    enabled: !!moduleId && !!user?.id,
    queryFn: async (): Promise<QuizAttempt[]> => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("module_id", moduleId!)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as QuizAttempt[];
    },
  });

  const submit = useMutation({
    mutationFn: async (payload: {
      module_id: string;
      score: number;
      total_questions: number;
      passed: boolean;
      answers: unknown[];
      duration_seconds: number;
    }) => {
      const percentage = payload.total_questions > 0
        ? Number(((payload.score / payload.total_questions) * 100).toFixed(2))
        : 0;
      const { data, error } = await supabase.from("quiz_attempts").insert({
        module_id: payload.module_id,
        user_id: user!.id,
        score: payload.score,
        total_questions: payload.total_questions,
        percentage,
        passed: payload.passed,
        answers: payload.answers as any,
        duration_seconds: payload.duration_seconds,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quiz_attempts", moduleId] }),
  });

  return {
    attempts: query.data ?? [],
    isLoading: query.isLoading,
    submit: submit.mutateAsync,
    bestScore: (query.data ?? []).reduce((m, a) => Math.max(m, a.percentage), 0),
    attemptCount: (query.data ?? []).length,
  };
}
