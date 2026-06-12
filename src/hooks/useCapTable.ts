import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CapTableEntry {
  id: string;
  startup_id: string;
  investment_id: string | null;
  holder_type: "founder" | "investor" | "employee" | "esop" | "advisor" | "other";
  holder_name: string;
  holder_email: string | null;
  shares: number;
  share_class: string;
  ownership_pct: number | null;
  vesting_start: string | null;
  vesting_months: number | null;
  cliff_months: number | null;
  notes: string | null;
}

export interface Investment {
  id: string;
  startup_id: string;
  round_type: string;
  round_name: string | null;
  amount_xof: number;
  pre_money_valuation_xof: number | null;
  post_money_valuation_xof: number | null;
  closed_at: string;
  lead_investor: string | null;
  investors: any;
  status: string;
  notes: string | null;
}

export interface TermSheet {
  id: string;
  startup_id: string;
  investor_name: string;
  amount_xof: number;
  valuation_xof: number | null;
  status: string;
  terms: any;
  sent_at: string | null;
  expires_at: string | null;
  signed_at: string | null;
  notes: string | null;
}

export function useCapTable(startupId?: string) {
  return useQuery({
    queryKey: ["cap_table", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cap_table_entries" as any)
        .select("*")
        .eq("startup_id", startupId!)
        .order("shares", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CapTableEntry[];
    },
  });
}

export function useUpsertCapEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Partial<CapTableEntry> & { startup_id: string; holder_name: string; holder_type: string; shares: number }) => {
      const { data, error } = entry.id
        ? await supabase.from("cap_table_entries" as any).update(entry).eq("id", entry.id).select().single()
        : await supabase.from("cap_table_entries" as any).insert(entry).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["cap_table", v.startup_id] }),
  });
}

export function useDeleteCapEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; startup_id: string }) => {
      const { error } = await supabase.from("cap_table_entries" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["cap_table", v.startup_id] }),
  });
}

export function useInvestments(startupId?: string) {
  return useQuery({
    queryKey: ["startup_investments", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startup_investments" as any)
        .select("*")
        .eq("startup_id", startupId!)
        .order("closed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Investment[];
    },
  });
}

export function useUpsertInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inv: Partial<Investment> & { startup_id: string; round_type: string; amount_xof: number }) => {
      const { data, error } = inv.id
        ? await supabase.from("startup_investments" as any).update(inv).eq("id", inv.id).select().single()
        : await supabase.from("startup_investments" as any).insert(inv).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["startup_investments", v.startup_id] }),
  });
}

export function useTermSheets(startupId?: string) {
  return useQuery({
    queryKey: ["term_sheets", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("term_sheets" as any)
        .select("*")
        .eq("startup_id", startupId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TermSheet[];
    },
  });
}
