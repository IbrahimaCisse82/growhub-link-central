import type { Database } from "@/integrations/supabase/types";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import GhButton from "@/components/shared/GhButton";

interface InlineEditFieldProps {
  projectId: string;
  fieldKey: string; // dot notation for metadata fields e.g. "metadata.introduction"
  label: string;
  value: string;
  isAdmin: boolean;
}

export default function InlineEditField({ projectId, fieldKey, label, value, isAdmin }: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      if (fieldKey.startsWith("metadata.")) {
        const metaKey = fieldKey.replace("metadata.", "");
        // Fetch current metadata first
        const { data: current } = await supabase.from("projects").select("metadata").eq("id", projectId).single();
        const meta = (current?.metadata ?? {}) as Record<string, unknown>;
        meta[metaKey] = draft;
        const { error } = await supabase.from("projects").update({ metadata: meta as any }).eq("id", projectId);
        if (error) throw error;
      } else if (fieldKey === "logframe.overall_objective") {
        const { data: existing } = await supabase.from("logical_frameworks").select("id").eq("project_id", projectId).maybeSingle();
        if (existing) {
          const { error } = await supabase.from("logical_frameworks").update({ overall_objective: draft }).eq("project_id", projectId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("logical_frameworks").insert({ project_id: projectId, overall_objective: draft });
          if (error) throw error;
        }
      } else {
        const patch: Database["public"]["Tables"]["projects"]["Update"] = { [fieldKey]: draft };
        const { error } = await supabase.from("projects").update(patch).eq("id", projectId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["project-logframe", projectId] });
      setEditing(false);
      toast.success("Enregistré !");
    },
    onError: () => toast.error("Erreur de sauvegarde"),
  });

  if (!isAdmin) {
    return (
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
        <p className="text-[13px] text-foreground/85 leading-relaxed whitespace-pre-line">{value || "—"}</p>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-muted/30 border-2 border-primary/30 rounded-lg p-4 space-y-3">
        <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={6}
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors resize-y"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <GhButton size="sm" variant="ghost" onClick={() => { setDraft(value); setEditing(false); }}>Annuler</GhButton>
          <GhButton size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Sauvegarde…" : "Enregistrer"}
          </GhButton>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-4 group relative">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <button
          onClick={() => { setDraft(value); setEditing(true); }}
          className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium hover:underline cursor-pointer"
        >
          ✏️ Modifier
        </button>
      </div>
      <p className="text-[13px] text-foreground/85 leading-relaxed whitespace-pre-line">{value || "—"}</p>
    </div>
  );
}
