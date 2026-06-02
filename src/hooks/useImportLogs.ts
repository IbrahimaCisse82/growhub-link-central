import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ImportType = "startups" | "employees" | "budgets" | "crm";

export interface ImportLog {
  id: string;
  import_type: ImportType;
  file_name: string;
  total_rows: number;
  success_rows: number;
  error_rows: number;
  errors: string[] | null;
  mapping: Record<string, unknown> | null;
  status: "completed" | "partial" | "failed";
  imported_by: string | null;
  created_at: string;
}

export function useImportLogs() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["import_logs"],
    queryFn: async (): Promise<ImportLog[]> => {
      const { data, error } = await supabase
        .from("import_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as ImportLog[];
    },
  });

  const log = useMutation({
    mutationFn: async (payload: {
      import_type: ImportType;
      file_name: string;
      total: number;
      success: number;
      errors: string[];
      mapping?: Record<string, unknown>;
    }) => {
      const status: ImportLog["status"] =
        payload.errors.length === 0 ? "completed" : payload.success === 0 ? "failed" : "partial";
      const { error } = await supabase.from("import_logs").insert({
        import_type: payload.import_type,
        file_name: payload.file_name,
        total_rows: payload.total,
        success_rows: payload.success,
        error_rows: payload.errors.length,
        errors: payload.errors as any,
        mapping: (payload.mapping ?? {}) as any,
        status,
        imported_by: user?.id ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["import_logs"] }),
  });

  return { logs: query.data ?? [], isLoading: query.isLoading, log: log.mutate };
}
