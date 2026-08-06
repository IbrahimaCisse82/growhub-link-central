import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type ProjectPmo = Tables["project_pmo"]["Row"];
export type PmoMember = Tables["pmo_members"]["Row"];
export type PmoRaci = Tables["pmo_raci"]["Row"];
export type PmoDecision = Tables["pmo_decisions"]["Row"];
export type PmoStakeholder = Tables["pmo_stakeholders"]["Row"];
export type PmoMeeting = Tables["pmo_meetings"]["Row"];
export type PmoReport = Tables["pmo_report_schedule"]["Row"];
export type DataroomFolder = Tables["dataroom_folders"]["Row"];
export type DataroomChecklistItem = Tables["dataroom_checklist"]["Row"];

/** Charte / manuel de gouvernance du PMO */
export function useProjectPmo(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project_pmo", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_pmo")
        .select("*")
        .eq("project_id", projectId!)
        .maybeSingle();
      if (error) throw error;
      return data as ProjectPmo | null;
    },
  });
}

export function useUpdateProjectPmo(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Tables["project_pmo"]["Update"]) => {
      const { error } = await supabase
        .from("project_pmo")
        .upsert({ project_id: projectId, ...patch }, { onConflict: "project_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project_pmo", projectId] });
      toast.success("Charte PMO mise à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

type PmoTable =
  | "pmo_members"
  | "pmo_raci"
  | "pmo_decisions"
  | "pmo_stakeholders"
  | "pmo_meetings"
  | "pmo_report_schedule"
  | "dataroom_folders"
  | "dataroom_checklist";

const ORDER: Record<PmoTable, { column: string; ascending: boolean }> = {
  pmo_members: { column: "sort_order", ascending: true },
  pmo_raci: { column: "sort_order", ascending: true },
  pmo_decisions: { column: "decision_date", ascending: false },
  pmo_stakeholders: { column: "sort_order", ascending: true },
  pmo_meetings: { column: "scheduled_at", ascending: true },
  pmo_report_schedule: { column: "sort_order", ascending: true },
  dataroom_folders: { column: "sort_order", ascending: true },
  dataroom_checklist: { column: "sort_order", ascending: true },
};

export function usePmoList<T>(table: PmoTable, projectId: string | undefined) {
  return useQuery({
    queryKey: [table, projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const ord = ORDER[table];
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("project_id", projectId!)
        .order(ord.column, { ascending: ord.ascending, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function usePmoMutations(table: PmoTable, projectId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [table, projectId] });

  const create = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = await supabase
        .from(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ ...row, project_id: projectId } as any);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Enregistré"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from(table).update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Supprimé"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { create, update, remove };
}
