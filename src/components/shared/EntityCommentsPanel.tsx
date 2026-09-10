import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GhButton from "@/components/shared/GhButton";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquare, Trash2, Edit2, Send } from "lucide-react";

interface CommentRow {
  id: string;
  entity_type: string;
  entity_id: string;
  author_id: string;
  content: string;
  parent_id: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export default function EntityCommentsPanel({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["entity-comments", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_comments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const userIds = [...new Set((data ?? []).map(c => c.author_id))];
      const { data: profiles } = await supabase.from("profiles_safe").select("user_id, full_name").in("user_id", userIds);
      return (data ?? []).map(c => ({
        ...c,
        author_name: profiles?.find(p => p.user_id === c.author_id)?.full_name ?? "Utilisateur",
      })) as CommentRow[];
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("entity_comments").insert({
        entity_type: entityType,
        entity_id: entityId,
        author_id: user!.id,
        content: draft.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity-comments", entityType, entityId] });
      setDraft("");
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from("entity_comments").update({ content, is_edited: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity-comments", entityType, entityId] });
      setEditingId(null);
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entity_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entity-comments", entityType, entityId] });
      toast({ title: "✓ Commentaire supprimé" });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
        <MessageSquare size={14} />
        Commentaires {comments && `(${comments.length})`}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : !comments || comments.length === 0 ? (
        <div className="text-center text-[12px] text-muted-foreground py-6 bg-surface-2 rounded-lg border border-border">
          Aucun commentaire — sois le premier à commenter
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {comments.map(c => (
            <div key={c.id} className="bg-surface-2 border border-border rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-semibold text-foreground">{c.author_name}</div>
                  <div className="text-[10px] text-muted-foreground" title={format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}>
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                    {c.is_edited && " · modifié"}
                  </div>
                </div>
                {c.author_id === user?.id && (
                  <div className="flex items-center gap-1">
                    {editingId !== c.id && (
                      <button
                        onClick={() => { setEditingId(c.id); setEditContent(c.content); }}
                        className="text-muted-foreground hover:text-primary p-1 rounded"
                        title="Modifier"
                      >
                        <Edit2 size={11} />
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm("Supprimer ce commentaire ?")) deleteComment.mutate(c.id); }}
                      className="text-muted-foreground hover:text-gh-rose p-1 rounded"
                      title="Supprimer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
              {editingId === c.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-2 text-[12px] text-foreground h-20 resize-none"
                  />
                  <div className="flex gap-1">
                    <GhButton size="sm" variant="ghost" onClick={() => setEditingId(null)}>Annuler</GhButton>
                    <GhButton
                      size="sm"
                      onClick={() => updateComment.mutate({ id: c.id, content: editContent.trim() })}
                      disabled={!editContent.trim() || updateComment.isPending}
                    >
                      Enregistrer
                    </GhButton>
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-foreground whitespace-pre-wrap">{c.content}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Écris un commentaire…"
          className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-[12px] text-foreground h-16 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim()) {
              e.preventDefault();
              addComment.mutate();
            }
          }}
        />
        <GhButton onClick={() => addComment.mutate()} disabled={!draft.trim() || addComment.isPending}>
          <Send size={12} className="mr-1" />Envoyer
        </GhButton>
      </div>
      <div className="text-[10px] text-muted-foreground">⌘+Enter pour envoyer rapidement</div>
    </div>
  );
}
