import { useQuery, useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LogParams {
  entity_type: string;
  entity_id?: string;
  fields?: string[];
  purpose?: string;
}

export function useLogPiiAccess() {
  const { user } = useAuth();
  return useCallback(async (params: LogParams) => {
    if (!user) return;
    await supabase.from("pii_access_log").insert({
      user_id: user.id,
      accessed_entity_type: params.entity_type,
      accessed_entity_id: params.entity_id ?? null,
      accessed_fields: params.fields ?? [],
      purpose: params.purpose ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
    });
  }, [user]);
}

export interface PiiLogFilters {
  user_id?: string;
  entity_type?: string;
  from?: string;
  to?: string;
}

export function usePiiAccessLogs(filters: PiiLogFilters = {}) {
  return useQuery({
    queryKey: ["pii_access_log", filters],
    queryFn: async () => {
      let q = supabase.from("pii_access_log").select("*, profiles!inner(full_name, email)").order("accessed_at", { ascending: false }).limit(500);
      if (filters.user_id) q = q.eq("user_id", filters.user_id);
      if (filters.entity_type) q = q.eq("accessed_entity_type", filters.entity_type);
      if (filters.from) q = q.gte("accessed_at", filters.from);
      if (filters.to) q = q.lte("accessed_at", filters.to);
      const { data, error } = await q;
      if (error) {
        // fallback without join (foreign key may not exist)
        const { data: d2 } = await supabase.from("pii_access_log").select("*").order("accessed_at", { ascending: false }).limit(500);
        return d2 ?? [];
      }
      return data;
    },
  });
}
