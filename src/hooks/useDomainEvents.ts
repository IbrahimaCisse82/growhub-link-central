import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DomainEvent {
  id: string;
  event_name: string;
  aggregate_type: string;
  aggregate_id: string | null;
  payload: Record<string, unknown>;
  actor_user_id: string | null;
  occurred_at: string;
  processed_at: string | null;
  webhook_dispatched_at: string | null;
}

export function useDomainEvents(filter?: { eventName?: string; limit?: number }) {
  return useQuery({
    queryKey: ["domain_events", filter?.eventName, filter?.limit],
    queryFn: async (): Promise<DomainEvent[]> => {
      let q = supabase
        .from("domain_events")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(filter?.limit ?? 200);
      if (filter?.eventName) q = q.eq("event_name", filter.eventName);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DomainEvent[];
    },
  });
}
