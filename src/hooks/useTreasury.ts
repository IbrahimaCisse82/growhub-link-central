import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TreasuryRow {
  source: string;
  source_id: string;
  project_id: string | null;
  program_id: string | null;
  direction: "in" | "out";
  amount_xof: number;
  occurred_on: string;
  label: string;
  status: string;
}

export interface CashflowMonth {
  month_start: string;
  inflow_xof: number;
  outflow_xof: number;
  net_xof: number;
  cumulative_xof: number;
}

export function useTreasuryRows(opts?: { from?: string; to?: string; direction?: "in" | "out"; source?: string }) {
  return useQuery({
    queryKey: ["treasury_consolidated", opts],
    queryFn: async () => {
      let q = supabase.from("treasury_consolidated" as any).select("*").order("occurred_on", { ascending: false }).limit(500);
      if (opts?.from) q = q.gte("occurred_on", opts.from);
      if (opts?.to) q = q.lte("occurred_on", opts.to);
      if (opts?.direction) q = q.eq("direction", opts.direction);
      if (opts?.source) q = q.eq("source", opts.source);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TreasuryRow[];
    },
  });
}

export function useCashflowSummary(from?: string, to?: string) {
  return useQuery({
    queryKey: ["cashflow_summary", from, to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cashflow_summary" as any, {
        _from: from ?? undefined,
        _to: to ?? undefined,
      });
      if (error) throw error;
      return (data ?? []) as unknown as CashflowMonth[];
    },
  });
}
