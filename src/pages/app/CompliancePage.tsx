import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, FileText } from "lucide-react";
import SectionHeader from "@/components/shared/SectionHeader";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { useDataProcessingRegister, useUpsertProcessing, useDeleteProcessing, type ProcessingRecord } from "@/hooks/useDataProcessingRegister";
import { toast } from "@/hooks/use-toast";

const LEGAL_BASIS_LABELS: Record<string, string> = {
  consent: "Consentement",
  contract: "Contrat",
  legal_obligation: "Obligation légale",
  vital_interests: "Intérêts vitaux",
  public_task: "Mission de service public",
  legitimate_interests: "Intérêt légitime",
};

const inputCls = "flex h-10 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground";

export default function CompliancePage() {
  const { data: records = [], isLoading } = useDataProcessingRegister();
  const upsert = useUpsertProcessing();
  const del = useDeleteProcessing();
  const [editing, setEditing] = useState<Partial<ProcessingRecord> | null>(null);

  const exportCsv = () => {
    const headers = ["treatment_name", "purpose", "legal_basis", "data_categories", "retention_period_days", "cross_border_transfer"];
    const rows = records.map((r) => [r.treatment_name, r.purpose, r.legal_basis, (r.data_categories ?? []).join("|"), r.retention_period_days ?? "", r.cross_border_transfer]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `registre-traitements-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const save = async () => {
    if (!editing?.treatment_name || !editing.purpose || !editing.legal_basis) {
      toast({ title: "Nom, finalité et base légale requis", variant: "destructive" });
      return;
    }
    try {
      await upsert.mutateAsync(editing as ProcessingRecord);
      toast({ title: "✓ Enregistré" });
      setEditing(null);
    } catch (e) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionHeader title="Registre des traitements" subtitle="Article 30 RGPD — Loi sénégalaise n°2008-12" />
        <div className="flex gap-2">
          <GhButton onClick={exportCsv} variant="secondary" size="sm"><FileText size={14} /> Exporter CSV</GhButton>
          <GhButton onClick={() => setEditing({ legal_basis: "legitimate_interests", data_categories: [], recipients: [], cross_border_transfer: false, is_active: true })} variant="primary" size="sm">
            <Plus size={14} /> Nouveau traitement
          </GhButton>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : (
        <div className="grid gap-3">
          {records.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-display font-bold text-foreground">{r.treatment_name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{r.purpose}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Pill color="blue">{LEGAL_BASIS_LABELS[r.legal_basis] ?? r.legal_basis}</Pill>
                    {r.retention_period_days && <Pill color="green">Conservation: {Math.round(r.retention_period_days / 30)} mois</Pill>}
                    {r.cross_border_transfer && <Pill color="rose">Transfert hors UE/Sénégal</Pill>}
                  </div>
                  {r.data_categories && r.data_categories.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-mono uppercase">Catégories :</span> {r.data_categories.join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(r)} className="p-2 rounded-lg hover:bg-surface-2 text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm("Supprimer ce traitement ?")) del.mutate(r.id); }} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-2xl w-full space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-foreground">{editing.id ? "Modifier" : "Nouveau"} traitement</h3>
            <input className={inputCls} placeholder="Nom du traitement *" value={editing.treatment_name ?? ""} onChange={(e) => setEditing({ ...editing, treatment_name: e.target.value })} />
            <textarea className={inputCls + " h-20"} placeholder="Finalité *" value={editing.purpose ?? ""} onChange={(e) => setEditing({ ...editing, purpose: e.target.value })} />
            <select className={inputCls} value={editing.legal_basis ?? ""} onChange={(e) => setEditing({ ...editing, legal_basis: e.target.value })}>
              {Object.entries(LEGAL_BASIS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className={inputCls} placeholder="Catégories de données (séparées par ,)" value={(editing.data_categories ?? []).join(", ")} onChange={(e) => setEditing({ ...editing, data_categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            <input className={inputCls} placeholder="Destinataires (séparés par ,)" value={(editing.recipients ?? []).join(", ")} onChange={(e) => setEditing({ ...editing, recipients: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            <input type="number" className={inputCls} placeholder="Durée de conservation (jours)" value={editing.retention_period_days ?? ""} onChange={(e) => setEditing({ ...editing, retention_period_days: e.target.value ? Number(e.target.value) : null })} />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={!!editing.cross_border_transfer} onChange={(e) => setEditing({ ...editing, cross_border_transfer: e.target.checked })} />
              Transfert transfrontalier (hors UE / hors Sénégal)
            </label>
            <textarea className={inputCls + " h-16"} placeholder="Mesures de sécurité" value={editing.security_measures ?? ""} onChange={(e) => setEditing({ ...editing, security_measures: e.target.value })} />
            <div className="flex gap-2 justify-end">
              <GhButton onClick={() => setEditing(null)} variant="secondary" size="sm">Annuler</GhButton>
              <GhButton onClick={save} variant="primary" size="sm" disabled={upsert.isPending}>Enregistrer</GhButton>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
