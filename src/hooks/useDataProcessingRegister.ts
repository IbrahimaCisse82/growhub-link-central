import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ProcessingRecord = Database["public"]["Tables"]["data_processing_register"]["Row"];
export type ProcessingInsert = Database["public"]["Tables"]["data_processing_register"]["Insert"];

export function useDataProcessingRegister() {
  return useQuery({
    queryKey: ["data_processing_register"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_processing_register")
        .select("*")
        .order("treatment_name");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertProcessing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: ProcessingInsert & { id?: string }) => {
      const { data, error } = record.id
        ? await supabase.from("data_processing_register").update(record).eq("id", record.id).select().single()
        : await supabase.from("data_processing_register").insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data_processing_register"] }),
  });
}

export function useDeleteProcessing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("data_processing_register").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data_processing_register"] }),
  });
}
