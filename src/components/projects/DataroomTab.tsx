import { useMemo, useState } from "react";
import { FolderOpen, CheckCircle2, Clock, AlertTriangle, Plus, Trash2, FolderPlus } from "lucide-react";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { Skeleton } from "@/components/ui/skeleton";
import { usePmoList, usePmoMutations, type DataroomFolder, type DataroomChecklistItem } from "@/hooks/usePmo";
import { useEntityDocuments } from "@/hooks/useEntityDocuments";

const inputCls = "flex h-9 w-full rounded-lg border border-input bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";

const statusLabel: Record<string, string> = { missing: "Manquant", received: "Reçu", validated: "Validé", na: "Non applicable" };
const statusColor: Record<string, "green" | "blue" | "amber" | "gray"> = { missing: "amber", received: "blue", validated: "green", na: "gray" };

export default function DataroomTab({ projectId }: { projectId: string }) {
  const { data: folders, isLoading } = usePmoList<DataroomFolder>("dataroom_folders", projectId);
  const { data: items } = usePmoList<DataroomChecklistItem>("dataroom_checklist", projectId);
  const { data: documents } = useEntityDocuments("project", projectId);
  const folderMut = usePmoMutations("dataroom_folders", projectId);
  const itemMut = usePmoMutations("dataroom_checklist", projectId);
  const [openFolder, setOpenFolder] = useState<string | null>("01");

  const stats = useMemo(() => {
    const req = (items ?? []).filter(i => i.is_required && i.status !== "na");
    const ok = req.filter(i => i.status === "validated").length;
    const received = req.filter(i => i.status === "received").length;
    const missing = req.filter(i => i.status === "missing").length;
    return { total: req.length, ok, received, missing, pct: req.length ? Math.round((ok / req.length) * 100) : 0 };
  }, [items]);

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  const byFolder = (code: string) => (items ?? []).filter(i => i.folder_code === code);

  return (
    <div className="space-y-4">
      {/* Complétude */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Complétude de la dataroom</h3>
            <p className="text-xs text-muted-foreground">{stats.ok} pièce(s) validée(s) sur {stats.total} obligatoires · {documents?.length ?? 0} document(s) déposé(s)</p>
          </div>
          <div className="flex gap-2">
            <Pill color="green"><CheckCircle2 className="w-3 h-3 inline mr-1" />{stats.ok} validées</Pill>
            <Pill color="blue"><Clock className="w-3 h-3 inline mr-1" />{stats.received} reçues</Pill>
            <Pill color="amber"><AlertTriangle className="w-3 h-3 inline mr-1" />{stats.missing} manquantes</Pill>
          </div>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${stats.pct}%` }} />
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-1">{stats.pct}%</p>
      </div>

      <div className="flex justify-end">
        <GhButton size="sm" variant="secondary" onClick={() => {
          const next = String((folders?.length ?? 0) + 1).padStart(2, "0");
          folderMut.create.mutate({ code: next, name: `${next} — Nouveau dossier`, sort_order: (folders?.length ?? 0) + 1 });
        }}>
          <FolderPlus className="w-3.5 h-3.5 mr-1" /> Dossier
        </GhButton>
      </div>

      {/* Arborescence */}
      <div className="space-y-3">
        {(folders ?? []).map(f => {
          const list = byFolder(f.code);
          const validated = list.filter(i => i.status === "validated").length;
          const open = openFolder === f.code;
          return (
            <div key={f.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <button onClick={() => setOpenFolder(open ? null : f.code)} className="w-full flex items-center gap-3 px-4 py-3 bg-secondary hover:bg-secondary/70 transition-colors text-left">
                <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm font-semibold text-foreground">{f.name}</div>
                  {f.description && <div className="text-[11px] text-muted-foreground truncate">{f.description}</div>}
                </div>
                <Pill color={validated === list.length && list.length > 0 ? "green" : "amber"}>{validated}/{list.length}</Pill>
              </button>

              {open && (
                <div className="divide-y divide-border">
                  {list.map(i => (
                    <div key={i.id} className="px-4 py-3 flex flex-wrap items-center gap-2">
                      <input
                        className={inputCls + " flex-1 min-w-[220px]"}
                        defaultValue={i.item}
                        onBlur={e => e.target.value !== i.item && itemMut.update.mutate({ id: i.id, patch: { item: e.target.value } })}
                      />
                      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <input type="checkbox" className="w-3.5 h-3.5 accent-[hsl(var(--primary))]" defaultChecked={i.is_required} onChange={e => itemMut.update.mutate({ id: i.id, patch: { is_required: e.target.checked } })} />
                        Obligatoire
                      </label>
                      <input type="date" className={inputCls + " w-40"} defaultValue={i.due_date ?? ""} onChange={e => itemMut.update.mutate({ id: i.id, patch: { due_date: e.target.value || null } })} />
                      <Pill color={statusColor[i.status] ?? "gray"}>{statusLabel[i.status] ?? i.status}</Pill>
                      <select className={inputCls + " w-40"} defaultValue={i.status} onChange={e => itemMut.update.mutate({ id: i.id, patch: { status: e.target.value } })}>
                        {Object.entries(statusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                      <button onClick={() => itemMut.remove.mutate(i.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <div className="px-4 py-3 flex items-center gap-2">
                    <GhButton size="sm" variant="ghost" onClick={() => itemMut.create.mutate({ folder_code: f.code, item: "Nouvelle pièce", sort_order: (items?.length ?? 0) + 1 })}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Pièce
                    </GhButton>
                    <button onClick={() => folderMut.remove.mutate(f.id)} className="ml-auto text-[11px] text-muted-foreground hover:text-destructive transition-colors">Supprimer le dossier</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Les fichiers se déposent depuis l'onglet « Documents » du projet ; la checklist ci-dessus assure le suivi des pièces exigées par les bailleurs.
      </p>
    </div>
  );
}
