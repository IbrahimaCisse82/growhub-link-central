import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HealthOverview {
  total_users: number;
  active_users_24h: number;
  total_projects: number;
  domain_events_24h: number;
  domain_events_1h: number;
  errors_24h: number;
  critical_errors_24h: number;
  emails_sent_24h: number;
  activity_24h: number;
  generated_at: string;
}

export function useSystemHealthOverview() {
  return useQuery({
    queryKey: ["system_health_overview"],
    queryFn: async (): Promise<HealthOverview | null> => {
      const { data, error } = await supabase
        .from("system_health_overview" as never)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as HealthOverview | null;
    },
    refetchInterval: 30_000,
  });
}

export interface ClientError {
  id: string;
  user_id: string | null;
  message: string;
  stack: string | null;
  url: string | null;
  route: string | null;
  user_agent: string | null;
  severity: "info" | "warning" | "error" | "fatal";
  context: Record<string, unknown>;
  created_at: string;
}

export function useClientErrors(limit = 100) {
  return useQuery({
    queryKey: ["client_error_log", limit],
    queryFn: async (): Promise<ClientError[]> => {
      const { data, error } = await supabase
        .from("client_error_log" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as ClientError[];
    },
  });
}

export function useHealthSnapshots(limit = 48) {
  return useQuery({
    queryKey: ["system_health_snapshots", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_health_snapshots" as never)
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        captured_at: string;
        active_users_24h: number;
        domain_events_24h: number;
        errors_24h: number;
        emails_sent_24h: number;
        webhook_failures_24h: number;
      }>;
    },
  });
}

export function useCaptureHealthSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: overview } = await supabase
        .from("system_health_overview" as never)
        .select("*")
        .maybeSingle();
      const o = (overview ?? {}) as Partial<HealthOverview>;
      const { error } = await supabase.from("system_health_snapshots" as never).insert({
        active_users_24h: o.active_users_24h ?? 0,
        domain_events_24h: o.domain_events_24h ?? 0,
        errors_24h: o.errors_24h ?? 0,
        emails_sent_24h: o.emails_sent_24h ?? 0,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system_health_snapshots"] });
    },
  });
}

export async function logClientError(input: {
  message: string;
  stack?: string;
  severity?: "info" | "warning" | "error" | "fatal";
  context?: Record<string, unknown>;
}) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("client_error_log" as never).insert({
      user_id: auth.user?.id ?? null,
      message: input.message.slice(0, 2000),
      stack: input.stack?.slice(0, 6000) ?? null,
      severity: input.severity ?? "error",
      url: typeof window !== "undefined" ? window.location.href : null,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      context: input.context ?? {},
    } as never);
  } catch {
    // swallow — never break the app for observability
  }
}
