import { useMemo, useState } from "react";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import StatCard from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Send, Check, X, FileText, Trash2, Pencil, Upload, Eye, Receipt, CheckCircle2, AlertCircle, Wallet, FileX, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { useHrExpenseReports, useHrExpenseLines, uploadExpenseReceipt, getReceiptSignedUrl, EXPENSE_CATEGORIES, type HrExpenseReport, type HrExpenseStatus } from "@/hooks/useHrExpenses";
import { useHrEmployees } from "@/hooks/useHrEmployees";
import { fmtXOF, MOIS } from "@/lib/payroll";

interface Props {
  /** Si défini, l'utilisateur ne voit/édite que les notes de cet employé */
  restrictedEmployeeId?: string | null;
  canManageHr: boolean;
}

const STATUS_VARIANT: Record<HrExpenseStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  submitted: "secondary",
  approved: "default",
  rejected: "destructive",
  reimbursed: "default",
};

const STATUS_LABEL: Record<HrExpenseStatus, string> = {
  draft: "Brouillon",
  submitted: "Soumise",
  approved: "Approuvée",
  rejected: "Rejetée",
  reimbursed: "Remboursée",
};

const EMPTY_REPORT: Partial<HrExpenseReport> = {
  title: "", period_start: "", period_end: "", currency: "XOF", status: "draft", notes: "",
};

export default function HrExpensesPanel({ restrictedEmployeeId, canManageHr }: Props) {
  const { employees } = useHrEmployees();
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<HrExpenseStatus | "all">("all");

  const filters = useMemo(() => ({
    employee_id: restrictedEmployeeId ?? undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    year: yearFilter,
  }), [restrictedEmployeeId, statusFilter, yearFilter]);

  const { reports, isLoading, upsertReport, submitReport, approveReport, rejectReport, markReimbursed, removeReport } = useHrExpenseReports(filters);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<HrExpenseReport>>(EMPTY_REPORT);
  const [rejectOpen, setRejectOpen] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reimburseOpen, setReimburseOpen] = useState<{ id: string } | null>(null);
  const [reimburseMois, setReimburseMois] = useState(new Date().getMonth() + 1);
  const [reimburseAnnee, setReimburseAnnee] = useState(new Date().getFullYear());
  const [linesOpen, setLinesOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // KPIs
  const kpis = useMemo(() => {
    const draft = reports.filter((r: any) => r.status === "draft").length;
    const submitted = reports.filter((r: any) => r.status === "submitted").length;
    const approved = reports.filter((r: any) => r.status === "approved").length;
    const reimbursed = reports.filter((r: any) => r.status === "reimbursed").length;
    const totalApproved = reports
      .filter((r: any) => r.status === "approved" || r.status === "reimbursed")
      .reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
    const pending = reports
      .filter((r: any) => r.status === "approved")
      .reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
    return { draft, submitted, approved, reimbursed, totalApproved, pending };
  }, [reports]);

  const openCreate = () => {
    setEditing({
      ...EMPTY_REPORT,
      employee_id: restrictedEmployeeId ?? undefined,
      period_start: new Date().toISOString().slice(0, 10),
      period_end: new Date().toISOString().slice(0, 10),
    });
    setEditorOpen(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editing.title || !editing.period_start || !editing.period_end) {
      toast.error("Titre et période obligatoires");
      return;
    }
    if (!editing.employee_id) {
      toast.error("Employé requis");
      return;
    }
    if (new Date(editing.period_end) < new Date(editing.period_start)) {
      toast.error("La date de fin doit être ≥ date de début");
      return;
    }
    const newId = await upsertReport.mutateAsync(editing);
    setEditorOpen(false);
    if (!editing.id && newId) setLinesOpen(newId);
  };

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Brouillons" value={String(kpis.draft)} note="à compléter" color="blue" icon={<FileText size={14} />} />
        <StatCard label="En attente" value={String(kpis.submitted)} note="à valider" color="amber" icon={<AlertCircle size={14} />} />
        <StatCard label="Approuvées" value={String(kpis.approved)} note="prêtes au paiement" color="green" icon={<CheckCircle2 size={14} />} />
        <StatCard label="À rembourser" value={fmtXOF(kpis.pending)} note="approuvées non payées" color="purple" icon={<Wallet size={14} />} />
      </div>

      <GhCard
        title={`Notes de frais (${reports.length})`}
        action={
          <div className="flex items-center gap-2">
            <Select value={String(yearFilter)} onValueChange={(v) => setYearFilter(Number(v))}>
              <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {(Object.keys(STATUS_LABEL) as HrExpenseStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <GhButton size="sm" onClick={openCreate}><Plus size={14} className="mr-1" />Nouvelle note</GhButton>
          </div>
        }
      >
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : reports.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            <Receipt className="mx-auto mb-2 text-muted-foreground/50" size={28} />
            Aucune note de frais sur cette période
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 px-3">Titre</th>
                  {!restrictedEmployeeId && <th className="py-2 px-3">Employé</th>}
                  <th className="py-2 px-3">Période</th>
                  <th className="py-2 px-3 text-right">Montant</th>
                  <th className="py-2 px-3">Statut</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r: any) => {
                  const editable = r.status === "draft" || r.status === "rejected";
                  const isMine = !canManageHr;
                  return (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">
                        {r.title}
                        {r.rejection_reason && (
                          <div className="text-[10px] text-destructive mt-0.5">⚠ {r.rejection_reason}</div>
                        )}
                      </td>
                      {!restrictedEmployeeId && (
                        <td className="py-2 px-3 text-muted-foreground">
                          {r.employee?.prenom} {r.employee?.nom}
                          <div className="text-[10px] font-mono opacity-60">{r.employee?.matricule}</div>
                        </td>
                      )}
                      <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.period_start).toLocaleDateString("fr-FR")} → {new Date(r.period_end).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">{fmtXOF(r.total_amount)}</td>
                      <td className="py-2 px-3">
                        <Badge variant={STATUS_VARIANT[r.status as HrExpenseStatus]} className="text-[10px]">
                          {STATUS_LABEL[r.status as HrExpenseStatus]}
                        </Badge>
                        {r.reimbursement_mois && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Paie {MOIS[r.reimbursement_mois]} {r.reimbursement_annee}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <GhButton size="sm" variant="ghost" onClick={() => setLinesOpen(r.id)} title="Voir lignes">
                            <Eye size={12} />
                          </GhButton>
                          {editable && (
                            <GhButton size="sm" variant="ghost" onClick={() => openEdit(r)} title="Modifier">
                              <Pencil size={12} />
                            </GhButton>
                          )}
                          {editable && r.total_amount > 0 && (
                            <GhButton size="sm" variant="ghost" onClick={() => submitReport.mutate(r.id)} title="Soumettre">
                              <Send size={12} className="text-primary" />
                            </GhButton>
                          )}
                          {canManageHr && r.status === "submitted" && (
                            <>
                              <GhButton size="sm" variant="ghost" onClick={() => approveReport.mutate(r.id)} title="Approuver">
                                <Check size={12} className="text-primary" />
                              </GhButton>
                              <GhButton size="sm" variant="ghost" onClick={() => { setRejectReason(""); setRejectOpen({ id: r.id }); }} title="Rejeter">
                                <X size={12} className="text-destructive" />
                              </GhButton>
                            </>
                          )}
                          {canManageHr && r.status === "approved" && (
                            <GhButton size="sm" variant="ghost" onClick={() => setReimburseOpen({ id: r.id })} title="Marquer remboursée">
                              <Wallet size={12} className="text-primary" />
                            </GhButton>
                          )}
                          {(canManageHr || (isMine && editable)) && (
                            <GhButton size="sm" variant="ghost" onClick={() => setConfirmDelete(r.id)} title="Supprimer">
                              <Trash2 size={12} className="text-destructive" />
                            </GhButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GhCard>

      {/* Editor */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Modifier la note de frais" : "Nouvelle note de frais"}</DialogTitle>
            <DialogDescription>Renseignez l'en-tête, puis ajoutez les lignes de dépenses.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!restrictedEmployeeId && (
              <div>
                <Label className="text-xs">Employé *</Label>
                <Select
                  value={editing.employee_id ?? ""}
                  onValueChange={(v) => setEditing({ ...editing, employee_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.is_active).map(e => (
                      <SelectItem key={e.id} value={e.id!}>{e.prenom} {e.nom} — {e.matricule}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">Titre *</Label>
              <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Ex. Mission Dakar — Octobre" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Période — début *</Label>
                <Input type="date" value={editing.period_start ?? ""} onChange={(e) => setEditing({ ...editing, period_start: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Période — fin *</Label>
                <Input type="date" value={editing.period_end ?? ""} onChange={(e) => setEditing({ ...editing, period_end: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Optionnel" />
            </div>
          </div>
          <DialogFooter>
            <GhButton variant="ghost" onClick={() => setEditorOpen(false)}>Annuler</GhButton>
            <GhButton onClick={handleSave}>Enregistrer</GhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lignes (drawer-like dialog) */}
      {linesOpen && (
        <ExpenseLinesDialog
          reportId={linesOpen}
          report={reports.find((r: any) => r.id === linesOpen)}
          onClose={() => setLinesOpen(null)}
        />
      )}

      {/* Reject */}
      <AlertDialog open={!!rejectOpen} onOpenChange={(o) => !o && setRejectOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeter la note de frais ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'employé pourra modifier sa note et la soumettre à nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <Label className="text-xs">Motif du rejet *</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Justificatifs manquants…" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!rejectReason.trim()) { toast.error("Motif requis"); return; }
                rejectOpen && rejectReport.mutate({ id: rejectOpen.id, reason: rejectReason.trim() });
                setRejectOpen(null);
              }}
            >Rejeter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reimburse */}
      <AlertDialog open={!!reimburseOpen} onOpenChange={(o) => !o && setReimburseOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marquer comme remboursée</AlertDialogTitle>
            <AlertDialogDescription>
              Affecte cette note à une période de paie. Le montant sera intégré comme remboursement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Mois</Label>
              <Select value={String(reimburseMois)} onValueChange={(v) => setReimburseMois(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MOIS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Année</Label>
              <Input type="number" value={reimburseAnnee} onChange={(e) => setReimburseAnnee(Number(e.target.value))} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                reimburseOpen && markReimbursed.mutate({ id: reimburseOpen.id, mois: reimburseMois, annee: reimburseAnnee });
                setReimburseOpen(null);
              }}
            >Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette note ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive et supprimera également les lignes et les justificatifs liés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { confirmDelete && removeReport.mutate(confirmDelete); setConfirmDelete(null); }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ─────────────── Lignes dialog ─────────────── */
function ExpenseLinesDialog({ reportId, report, onClose }: { reportId: string; report: any; onClose: () => void }) {
  const { lines, isLoading, upsertLine, removeLine } = useHrExpenseLines(reportId);
  const editable = report?.status === "draft" || report?.status === "rejected";
  const [newLine, setNewLine] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    category: EXPENSE_CATEGORIES[0],
    description: "",
    amount: 0,
    currency: "XOF",
    receipt_url: null as string | null,
  });
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = await uploadExpenseReceipt(reportId, file);
      setNewLine({ ...newLine, receipt_url: path });
      toast.success("Justificatif joint");
    } catch (e: any) {
      toast.error(e.message ?? "Upload impossible");
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async () => {
    if (!newLine.description || newLine.amount <= 0) {
      toast.error("Description et montant requis");
      return;
    }
    await upsertLine.mutateAsync({ ...newLine, report_id: reportId });
    setNewLine({
      expense_date: new Date().toISOString().slice(0, 10),
      category: EXPENSE_CATEGORIES[0],
      description: "",
      amount: 0,
      currency: "XOF",
      receipt_url: null,
    });
  };

  const viewReceipt = async (path: string) => {
    try {
      const url = await getReceiptSignedUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e.message ?? "Lien indisponible");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{report?.title ?? "Note de frais"}</DialogTitle>
          <DialogDescription>
            {STATUS_LABEL[report?.status as HrExpenseStatus]} · Total : <strong>{fmtXOF(report?.total_amount)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : lines.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              <FileX className="mx-auto mb-2 text-muted-foreground/50" size={24} />
              Aucune ligne pour le moment
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 px-2">Date</th>
                    <th className="py-2 px-2">Catégorie</th>
                    <th className="py-2 px-2">Description</th>
                    <th className="py-2 px-2 text-right">Montant</th>
                    <th className="py-2 px-2">Justif.</th>
                    {editable && <th className="py-2 px-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b border-border/50">
                      <td className="py-1.5 px-2">{new Date(l.expense_date).toLocaleDateString("fr-FR")}</td>
                      <td className="py-1.5 px-2"><Badge variant="outline" className="text-[10px]">{l.category}</Badge></td>
                      <td className="py-1.5 px-2">{l.description}</td>
                      <td className="py-1.5 px-2 text-right font-medium">{fmtXOF(l.amount)}</td>
                      <td className="py-1.5 px-2">
                        {l.receipt_url ? (
                          <button onClick={() => viewReceipt(l.receipt_url!)} className="text-primary hover:underline inline-flex items-center gap-1">
                            <Paperclip size={11} />Voir
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {editable && (
                        <td className="py-1.5 px-2 text-right">
                          <GhButton size="sm" variant="ghost" onClick={() => l.id && removeLine.mutate(l.id)}>
                            <Trash2 size={12} className="text-destructive" />
                          </GhButton>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editable && (
            <div className="border-t border-border pt-3">
              <div className="text-[11px] font-semibold text-muted-foreground mb-2">Ajouter une ligne</div>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <Label className="text-[10px]">Date</Label>
                  <Input type="date" value={newLine.expense_date} onChange={(e) => setNewLine({ ...newLine, expense_date: e.target.value })} className="h-8" />
                </div>
                <div className="col-span-3">
                  <Label className="text-[10px]">Catégorie</Label>
                  <Select value={newLine.category} onValueChange={(v) => setNewLine({ ...newLine, category: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Label className="text-[10px]">Description</Label>
                  <Input value={newLine.description} onChange={(e) => setNewLine({ ...newLine, description: e.target.value })} className="h-8" placeholder="Taxi, repas…" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Montant XOF</Label>
                  <Input type="number" min={0} value={newLine.amount} onChange={(e) => setNewLine({ ...newLine, amount: Number(e.target.value) })} className="h-8 text-right" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                <label className="inline-flex items-center gap-2 text-[11px] cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                  />
                  <Upload size={12} />
                  {uploading ? "Envoi…" : newLine.receipt_url ? "Justificatif prêt ✓" : "Joindre justificatif"}
                </label>
                <GhButton size="sm" onClick={handleAdd}><Plus size={12} className="mr-1" />Ajouter</GhButton>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <GhButton variant="ghost" onClick={onClose}>Fermer</GhButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
