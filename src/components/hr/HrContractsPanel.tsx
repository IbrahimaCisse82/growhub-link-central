import { useMemo, useState } from "react";
import { useHrEmployees } from "@/hooks/useHrEmployees";
import { useHrContracts, useHrContractAlerts, type HrContract, type HrContractType } from "@/hooks/useHrLeaves";
import GhButton from "@/components/shared/GhButton";

function MiniStat({ label, value, icon, accent }: { label: string; value: number | string; icon: React.ReactNode; accent?: "emerald" | "amber" }) {
  const cls = accent === "emerald" ? "text-emerald-600" : accent === "amber" ? "text-amber-600" : "text-primary";
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cls}>{icon}</span>
      </div>
      <div className="text-xl font-bold text-foreground">{value}</div>
    </div>
  );
}
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card border border-border rounded-lg ${className}`}>{children}</div>;
}
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, FileSignature, AlertTriangle, Trash2, Pencil, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fmtXOF } from "@/lib/payroll";

interface Props {
  canManage: boolean;
  restrictedEmployeeId?: string | null;
}

const TYPE_LABELS: Record<HrContractType, string> = {
  CDI: "CDI", CDD: "CDD", stage: "Stage", consultance: "Consultance", apprentissage: "Apprentissage", autre: "Autre",
};

const ALERT_CONFIG: Record<string, { label: string; cls: string }> = {
  expired: { label: "Expiré", cls: "bg-destructive/15 text-destructive border-destructive/40" },
  critical: { label: "≤ 30 j", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  warning: { label: "≤ 60 j", cls: "bg-amber-500/15 text-amber-700 border-amber-500/40" },
  trial_ending: { label: "Fin essai", cls: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
};

const EMPTY: Partial<HrContract> = {
  contract_type: "CDI", start_date: "", salaire_base: 0, sursalaire: 0, is_active: true,
};

export default function HrContractsPanel({ canManage, restrictedEmployeeId }: Props) {
  const { employees } = useHrEmployees();
  const { contracts, upsert, remove } = useHrContracts(restrictedEmployeeId ?? undefined);
  const { alerts } = useHrContractAlerts();
  const [dlgOpen, setDlgOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<HrContract>>({ ...EMPTY, employee_id: restrictedEmployeeId ?? "" });

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const visibleEmployees = useMemo(
    () => restrictedEmployeeId ? employees.filter(e => e.id === restrictedEmployeeId) : employees,
    [employees, restrictedEmployeeId]
  );

  const stats = useMemo(() => {
    const active = contracts.filter(c => c.is_active).length;
    const cdi = contracts.filter(c => c.is_active && c.contract_type === "CDI").length;
    const cdd = contracts.filter(c => c.is_active && c.contract_type === "CDD").length;
    return { active, cdi, cdd, alerts: alerts.length };
  }, [contracts, alerts]);

  const openCreate = () => {
    setDraft({ ...EMPTY, employee_id: restrictedEmployeeId ?? "", start_date: new Date().toISOString().slice(0, 10) });
    setDlgOpen(true);
  };

  const openEdit = (c: HrContract) => {
    setDraft(c);
    setDlgOpen(true);
  };

  const handleSave = async () => {
    if (!draft.employee_id || !draft.start_date) {
      toast.error("Employé et date de début requis");
      return;
    }
    if ((draft.contract_type === "CDD" || draft.contract_type === "stage") && !draft.end_date) {
      toast.error("Date de fin obligatoire pour ce type de contrat");
      return;
    }
    try {
      await upsert.mutateAsync(draft);
      toast.success(draft.id ? "Contrat mis à jour" : "Contrat créé");
      setDlgOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Contrats actifs" value={stats.active} icon={<FileSignature size={16} />} accent="emerald" />
        <MiniStat label="CDI" value={stats.cdi} icon={<CheckCircle2 size={16} />} />
        <MiniStat label="CDD" value={stats.cdd} icon={<FileSignature size={16} />} />
        <MiniStat label="Alertes" value={stats.alerts} icon={<AlertTriangle size={16} />} accent="amber" />
      </div>

      {canManage && alerts.length > 0 && (
        <Panel className="p-3 border-amber-500/40 bg-amber-500/5">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            Alertes contrats ({alerts.length})
          </h3>
          <div className="space-y-1.5">
            {alerts.slice(0, 8).map(a => {
              const cfg = ALERT_CONFIG[a.alert_level] ?? { label: a.alert_level, cls: "" };
              return (
                <div key={a.contract_id} className="flex items-center justify-between text-xs bg-background rounded p-2 border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>
                    <span className="font-medium">{a.prenom} {a.nom}</span>
                    <span className="text-muted-foreground">· {TYPE_LABELS[a.contract_type]}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {a.end_date && <>Fin : {new Date(a.end_date).toLocaleDateString("fr-FR")} ({a.days_remaining} j)</>}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <div className="flex justify-end">
        {canManage && (
          <GhButton onClick={openCreate} className="gap-1"><Plus size={14} /> Nouveau contrat</GhButton>
        )}
      </div>

      <Panel className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left p-2.5">Employé</th>
              <th className="text-left p-2.5">Type</th>
              <th className="text-left p-2.5">Référence</th>
              <th className="text-left p-2.5">Période</th>
              <th className="text-left p-2.5">Essai</th>
              <th className="text-right p-2.5">Salaire base</th>
              <th className="text-left p-2.5">Statut</th>
              <th className="text-right p-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Aucun contrat</td></tr>
            ) : contracts.map(c => {
              const e = empMap.get(c.employee_id);
              return (
                <tr key={c.id} className="border-t hover:bg-muted/20">
                  <td className="p-2.5">{e ? `${e.prenom} ${e.nom}` : "—"}</td>
                  <td className="p-2.5"><Badge variant="outline">{TYPE_LABELS[c.contract_type]}</Badge></td>
                  <td className="p-2.5 text-xs font-mono">{c.reference ?? "—"}</td>
                  <td className="p-2.5 text-xs">
                    {new Date(c.start_date).toLocaleDateString("fr-FR")}
                    {c.end_date && <> → {new Date(c.end_date).toLocaleDateString("fr-FR")}</>}
                  </td>
                  <td className="p-2.5 text-xs">{c.trial_end_date ? new Date(c.trial_end_date).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className="p-2.5 text-right">{fmtXOF(c.salaire_base)}</td>
                  <td className="p-2.5">
                    {c.is_active ? <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30" variant="outline">Actif</Badge>
                      : <Badge variant="outline" className="text-muted-foreground">Clôturé</Badge>}
                  </td>
                  <td className="p-2.5 text-right space-x-1">
                    {canManage && (
                      <>
                        <GhButton variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil size={14} /></GhButton>
                        <GhButton variant="ghost" size="sm" onClick={() => { if (confirm("Supprimer ?")) remove.mutate(c.id!); }}><Trash2 size={14} /></GhButton>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{draft.id ? "Modifier" : "Nouveau"} contrat</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Employé *</Label>
              <Select value={draft.employee_id} onValueChange={v => setDraft(d => ({ ...d, employee_id: v }))} disabled={!!restrictedEmployeeId || !!draft.id}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {visibleEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id!}>{e.prenom} {e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Type *</Label>
              <Select value={draft.contract_type} onValueChange={v => setDraft(d => ({ ...d, contract_type: v as HrContractType }))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Référence</Label>
              <Input className="h-8" value={draft.reference ?? ""} onChange={e => setDraft(d => ({ ...d, reference: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Date début *</Label>
              <Input type="date" className="h-8" value={draft.start_date ?? ""} onChange={e => setDraft(d => ({ ...d, start_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Date fin</Label>
              <Input type="date" className="h-8" value={draft.end_date ?? ""} onChange={e => setDraft(d => ({ ...d, end_date: e.target.value || null }))} />
            </div>
            <div>
              <Label className="text-xs">Fin période d'essai</Label>
              <Input type="date" className="h-8" value={draft.trial_end_date ?? ""} onChange={e => setDraft(d => ({ ...d, trial_end_date: e.target.value || null }))} />
            </div>
            <div>
              <Label className="text-xs">Date de signature</Label>
              <Input type="date" className="h-8" value={draft.signed_at ?? ""} onChange={e => setDraft(d => ({ ...d, signed_at: e.target.value || null }))} />
            </div>
            <div>
              <Label className="text-xs">Fonction</Label>
              <Input className="h-8" value={draft.fonction ?? ""} onChange={e => setDraft(d => ({ ...d, fonction: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Statut</Label>
              <Select value={draft.is_active ? "1" : "0"} onValueChange={v => setDraft(d => ({ ...d, is_active: v === "1" }))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Actif</SelectItem>
                  <SelectItem value="0">Clôturé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Salaire de base (FCFA)</Label>
              <Input type="number" className="h-8" value={draft.salaire_base ?? 0} onChange={e => setDraft(d => ({ ...d, salaire_base: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Sursalaire (FCFA)</Label>
              <Input type="number" className="h-8" value={draft.sursalaire ?? 0} onChange={e => setDraft(d => ({ ...d, sursalaire: Number(e.target.value) }))} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">URL document signé</Label>
              <Input className="h-8" placeholder="https://..." value={draft.document_url ?? ""} onChange={e => setDraft(d => ({ ...d, document_url: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={draft.notes ?? ""} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <GhButton variant="ghost" onClick={() => setDlgOpen(false)}>Annuler</GhButton>
            <GhButton onClick={handleSave}>Enregistrer</GhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
