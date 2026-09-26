import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import GhButton from "@/components/shared/GhButton";
import { toast } from "sonner";

type TableName = keyof Database["public"]["Tables"];

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "select" | "email";
  options?: { value: string; label: string }[];
  required?: boolean;
}

type Primitive = string | number | boolean | null | undefined;

interface Props {
  table: TableName;
  id: string;
  record: Record<string, unknown>;
  fields: FieldDef[];
  queryKeys: string[];
  entityLabel: string;
  canDelete?: boolean;
  canEdit?: boolean;
}

function toInput(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : v;
  return String(v);
}

export default function RecordActions({ table, id, record, fields, queryKeys, entityLabel, canDelete = true, canEdit = true }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const start = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValues(Object.fromEntries(fields.map((f) => [f.key, toInput(record[f.key])])));
    setOpen(true);
  };

  const refresh = () => queryKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const save = async () => {
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) { toast.error(`${f.label} est obligatoire`); return; }
    }
    const payload: Record<string, Primitive> = {};
    for (const f of fields) {
      const raw = (values[f.key] ?? "").trim();
      payload[f.key] = raw === "" ? null : f.type === "number" ? Number(raw) : raw.slice(0, 5000);
    }
    setBusy(true);
    const { error } = await supabase.from(table).update(payload as never).eq("id" as never, id as never);
    setBusy(false);
    if (error) { toast.error("Modification impossible : " + error.message); return; }
    toast.success(`${entityLabel} modifié(e)`);
    setOpen(false);
    refresh();
  };

  const remove = async () => {
    setBusy(true);
    const { error } = await supabase.from(table).delete().eq("id" as never, id as never);
    setBusy(false);
    if (error) { toast.error("Suppression impossible : " + error.message); return; }
    toast.success(`${entityLabel} supprimé(e)`);
    setConfirm(false);
    refresh();
  };

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {canEdit && (
      <button type="button" aria-label="Modifier" onClick={start}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      )}
      {canDelete && (
        <button type="button" aria-label="Supprimer" onClick={(e) => { e.stopPropagation(); setConfirm(true); }}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifier — {entityLabel}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label>{f.label}{f.required ? " *" : ""}</Label>
                {f.type === "textarea" ? (
                  <Textarea value={values[f.key] ?? ""} maxLength={5000}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                ) : f.type === "select" ? (
                  <select value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <Input type={f.type ?? "text"} value={values[f.key] ?? ""} maxLength={500}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <GhButton variant="ghost" onClick={() => setOpen(false)}>Annuler</GhButton>
            <GhButton onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</GhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet élément ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive. Les éléments rattachés peuvent être affectés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={busy}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const STATUS_OPTIONS = [
  { value: "draft", label: "Brouillon" }, { value: "active", label: "Actif" },
  { value: "paused", label: "En pause" }, { value: "completed", label: "Terminé" },
  { value: "cancelled", label: "Annulé" },
];
