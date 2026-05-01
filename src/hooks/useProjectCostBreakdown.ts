import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CostBreakdownRow {
  source: "payroll" | "expense" | "purchase_order" | "invoice";
  total_amount: number;
  line_count: number;
}

export function useProjectCostBreakdown(projectId: string | undefined, from?: string, to?: string) {
  return useQuery({
    queryKey: ["project_cost_breakdown", projectId, from, to],
    enabled: !!projectId,
    queryFn: async (): Promise<CostBreakdownRow[]> => {
      const { data, error } = await supabase.rpc("get_project_cost_breakdown", {
        _project_id: projectId!,
        _from: from ?? null,
        _to: to ?? null,
      });
      if (error) throw error;
      return ((data ?? []) as unknown) as CostBreakdownRow[];
    },
  });
}
