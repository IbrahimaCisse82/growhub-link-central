import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type EntityDocument = {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useEntityDocuments(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ["entity_documents", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_documents" as any)
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as EntityDocument[];
    },
  });
}

export function useCreateEntityDocument(entityType: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: {
      title: string;
      description?: string;
      category: string;
      file_url?: string;
      file_name?: string;
      file_size?: number;
      uploaded_by?: string;
    }) => {
      const { error } = await supabase.from("entity_documents" as any).insert({
        entity_type: entityType,
        entity_id: entityId,
        ...doc,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity_documents", entityType, entityId] });
      toast({ title: "✓ Document ajouté" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteEntityDocument(entityType: string, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("entity_documents" as any).delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity_documents", entityType, entityId] });
      toast({ title: "Document supprimé" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
}

export async function uploadEntityFile(entityType: string, entityId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `${entityType}/${entityId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("entity-documents").upload(path, file, { upsert: false });
  if (error) throw error;
  // Bucket privé : on stocke le path, l'URL est signée à l'ouverture
  return { url: path, name: file.name, size: file.size };
}
