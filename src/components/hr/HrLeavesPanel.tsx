import { useMemo, useState } from "react";
import { useHrEmployees } from "@/hooks/useHrEmployees";
import { useHrLeaveRequests, useHrLeaveBalances, calcLeaveDays, LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, type HrLeaveRequest, type HrLeaveType, type HrLeaveStatus } from "@/hooks/useHrLeaves";
import GhCard from "@/components/shared/GhCard";
import GhButton from "@/components/shared/GhButton";
import StatCard from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, CheckCircle2, XCircle, CalendarDays, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  canManage: boolean;
  restrictedEmployeeId?: string | null;
}

export default function HrLeavesPanel({ canManage, restrictedEmployeeId }: Props) {
  const { employees } = useHrEmployees();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [statusFilter, setStatusFilter] = useState<HrLeaveStatus | "all">("all");
  const [empFilter, setEmpFilter] = useState<string>("all");
  const [dlgOpen, setDlgOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [draft, setDraft] = useState<Partial<HrLeaveRequest>>({
    leave_type: "annuel", status: "pending", start_date: "", end_date: "",
    employee_id: restrictedEmployeeId ?? "",
  });

  const filters = useMemo(() => ({
    year,
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(restrictedEmployeeId ? { employee_id: restrictedEmployeeId } : empFilter !== "all" ? { employee_id: empFilter } : {}),
  }), [year, statusFilter, empFilter, restrictedEmployeeId]);

  const { leaves, upsert, decide, remove } = useHrLeaveRequests(filters);
  const { balances } = useHrLeaveBalances(year);

  const visibleEmployees = useMemo(
    () => restrictedEmployeeId ? employees.filter(e => e.id === restrictedEmployeeId) : employees,
    [employees, restrictedEmployeeId]
  );

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  const stats = useMemo(() => {
    const pending = leaves.filter(l => l.status === "pending").length;
    const approved = leaves.filter(l => l.status === "approved").length;
    const totalDays = leaves.filter(l => l.status === "approved").reduce((s, l) => s + Number(l.days_count || 0), 0);
    return { pending, approved, totalDays, total: leaves.length };
  }, [leaves]);

  const days = draft.start_date && draft.end_date ? calcLeaveDays(draft.start_date, draft.end_date) : 0;

  const handleSave = async () => {
    if (!draft.employee_id || !draft.start_date || !draft.end_date) {
      toast.error("Employé et dates requis");
      return;
    }
    if (new Date(draft.end_date) < new Date(draft.start_date)) {
      toast.error("Date de fin antérieure à la date de début");
      return;
    }
    try {
      await upsert.mutateAsync({ ...draft, days_count: days });
      toast.success("Demande de congé créée");
      setDlgOpen(false);
      setDraft({ leave_type: "annuel", status: "pending", start_date: "", end_date: "", employee_id: restrictedEmployeeId ?? "" });
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await decide.mutateAsync({ id, status: "approved" });
      toast.success("Congé approuvé · solde mis à jour");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      await decide.mutateAsync({ id: rejectId, status: "rejected", reason: rejectReason });
      toast.success("Demande refusée");
      setRejectId(null);
      setRejectReason("");
    } catch (e: any) { toast.error(e.message); }
  };

  const statusBadge = (s: HrLeaveStatus) => {
    const cfg: Record<HrLeaveStatus, { variant: any; cls: string }> = {
      draft: { variant: "outline", cls: "" },
      pending: { variant: "secondary", cls: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
      approved: { variant: "secondary", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
      rejected: { variant: "secondary", cls: "bg-destructive/10 text-destructive border-destructive/30" },
      cancelled: { variant: "outline", cls: "text-muted-foreground" },
    };
    return <Badge variant={cfg[s].variant} className={cfg[s].cls}>{LEAVE_STATUS_LABELS[s]}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard label="Demandes" value={stats.total} icon={<CalendarDays size={18} />} />
        <StatCard label="En attente" value={stats.pending} icon={<Clock size={18} />} />
        <StatCard label="Approuvées" value={stats.approved} icon={<CheckCircle2 size={18} />} />
        <StatCard label="Jours pris" value={stats.totalDays} icon={<CalendarDays size={18} />} />
      </div>

      <GhCard className="p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Année</Label>
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Statut</Label>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(LEAVE_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!restrictedEmployeeId && (
            <div>
              <Label className="text-xs">Employé</Label>
              <Select value={empFilter} onValueChange={setEmpFilter}>
                <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id!}>{e.prenom} {e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="ml-auto">
            <GhButton onClick={() => setDlgOpen(true)} className="gap-1"><Plus size={14} /> Nouvelle demande</GhButton>
          </div>
        </div>
      </GhCard>

      <GhCard className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left p-2.5">Employé</th>
              <th className="text-left p-2.5">Type</th>
              <th className="text-left p-2.5">Période</th>
              <th className="text-right p-2.5">Jours</th>
              <th className="text-left p-2.5">Statut</th>
              <th className="text-left p-2.5">Motif</th>
              <th className="text-right p-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Aucune demande</td></tr>
            ) : leaves.map(l => {
              const e = empMap.get(l.employee_id);
              return (
                <tr key={l.id} className="border-t hover:bg-muted/20">
                  <td className="p-2.5">{e ? `${e.prenom} ${e.nom}` : "—"}</td>
                  <td className="p-2.5"><Badge variant="outline">{LEAVE_TYPE_LABELS[l.leave_type]}</Badge></td>
                  <td className="p-2.5 text-xs">{new Date(l.start_date).toLocaleDateString("fr-FR")} → {new Date(l.end_date).toLocaleDateString("fr-FR")}</td>
                  <td className="p-2.5 text-right font-medium">{Number(l.days_count).toFixed(1)}</td>
                  <td className="p-2.5">{statusBadge(l.status)}</td>
                  <td className="p-2.5 text-xs text-muted-foreground max-w-xs truncate">{l.reason ?? "—"}</td>
                  <td className="p-2.5 text-right space-x-1">
                    {canManage && l.status === "pending" && (
                      <>
                        <GhButton variant="ghost" size="sm" onClick={() => handleApprove(l.id!)} title="Approuver" className="text-emerald-600">
                          <CheckCircle2 size={15} />
                        </GhButton>
                        <GhButton variant="ghost" size="sm" onClick={() => setRejectId(l.id!)} title="Refuser" className="text-destructive">
                          <XCircle size={15} />
                        </GhButton>
                      </>
                    )}
                    {canManage && (
                      <GhButton variant="ghost" size="sm" onClick={() => { if (confirm("Supprimer ?")) remove.mutate(l.id!); }} title="Supprimer">
                        <Trash2 size={14} />
                      </GhButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </GhCard>

      {canManage && (
        <GhCard className="p-3">
          <h3 className="font-semibold text-sm mb-2">Soldes annuels {year}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-2">Employé</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-right p-2">Initial</th>
                  <th className="text-right p-2">Reporté</th>
                  <th className="text-right p-2">Utilisés</th>
                  <th className="text-right p-2">Restant</th>
                </tr>
              </thead>
              <tbody>
                {balances.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Aucun solde — créé automatiquement à la première approbation</td></tr>
                ) : balances.map(b => {
                  const e = empMap.get(b.employee_id);
                  const remaining = Number(b.initial_days) + Number(b.carried_over) - Number(b.used_days);
                  return (
                    <tr key={b.id} className="border-t">
                      <td className="p-2">{e ? `${e.prenom} ${e.nom}` : "—"}</td>
                      <td className="p-2">{LEAVE_TYPE_LABELS[b.leave_type]}</td>
                      <td className="p-2 text-right">{Number(b.initial_days).toFixed(1)}</td>
                      <td className="p-2 text-right">{Number(b.carried_over).toFixed(1)}</td>
                      <td className="p-2 text-right">{Number(b.used_days).toFixed(1)}</td>
                      <td className={`p-2 text-right font-semibold ${remaining < 0 ? "text-destructive" : ""}`}>{remaining.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GhCard>
      )}

      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle demande de congé</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Employé</Label>
              <Select value={draft.employee_id} onValueChange={v => setDraft(d => ({ ...d, employee_id: v }))} disabled={!!restrictedEmployeeId}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {visibleEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id!}>{e.prenom} {e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={draft.leave_type} onValueChange={v => setDraft(d => ({ ...d, leave_type: v as HrLeaveType }))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Statut</Label>
              <Select value={draft.status} onValueChange={v => setDraft(d => ({ ...d, status: v as HrLeaveStatus }))} disabled={!canManage}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Du</Label>
              <Input type="date" className="h-8" value={draft.start_date ?? ""} onChange={e => setDraft(d => ({ ...d, start_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Au</Label>
              <Input type="date" className="h-8" value={draft.end_date ?? ""} onChange={e => setDraft(d => ({ ...d, end_date: e.target.value }))} />
            </div>
            <div className="col-span-2 text-xs text-muted-foreground">
              Jours ouvrés calculés : <span className="font-semibold text-foreground">{days}</span>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Motif</Label>
              <Textarea rows={2} value={draft.reason ?? ""} onChange={e => setDraft(d => ({ ...d, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <GhButton variant="ghost" onClick={() => setDlgOpen(false)}>Annuler</GhButton>
            <GhButton onClick={handleSave}>Enregistrer</GhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectId} onOpenChange={o => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refuser la demande</DialogTitle></DialogHeader>
          <Label className="text-xs">Motif du refus</Label>
          <Textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <DialogFooter>
            <GhButton variant="ghost" onClick={() => setRejectId(null)}>Annuler</GhButton>
            <GhButton onClick={handleReject} className="bg-destructive text-destructive-foreground">Refuser</GhButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
