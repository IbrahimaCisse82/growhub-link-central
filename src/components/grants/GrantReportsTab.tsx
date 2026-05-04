import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useGrantReports, useGrantTransactions, useDeleteReport, useGrantDetailQuery, type GrantReport, type GrantTransaction } from "@/hooks/useGrantDetail";
import { exportGrantDonorReportPdf } from "@/lib/grantDonorReportPdf";
import { FileDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
const inputCls = "flex h-10 w-full rounded-lg border border-input bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors";

const statusMap: Record<string, { label: string; color: "green" | "amber" | "blue" | "gray" }> = {
  draft: { label: "Brouillon", color: "gray" }, submitted: { label: "Soumis", color: "blue" },
  validated: { label: "Validé", color: "green" }, rejected: { label: "Rejeté", color: "amber" },
};

export { useGrantReports };

export default function GrantReportsTab({ grantId, budgetTotal }: { grantId: string; budgetTotal?: number }) {
  const { user } = useAuth();
  const deleteMutation = useDeleteReport(grantId);
  const { data: reports, isLoading } = useGrantReports(grantId);
  const { data: transactions } = useGrantTransactions(grantId);
  const [showForm, setShowForm] = useState(false);
  const [editReport, setEditReport] = useState<GrantReport | null>(null);
  const [deleteReport, setDeleteReport] = useState<GrantReport | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const totalDeclared = reports?.reduce((s, r) => s + (r.amount_declared ?? 0), 0) ?? 0;
  const totalValidated = reports?.reduce((s, r) => s + (r.amount_validated ?? 0), 0) ?? 0;
  const totalReceived = reports?.reduce((s, r) => s + (r.amount_received ?? 0), 0) ?? 0;
  const bt = budgetTotal ?? 0;
  const soldeRestant = bt - totalDeclared;
  const soldePct = bt > 0 ? Math.round((soldeRestant / bt) * 100) : 0;

  // Get transactions linked to a specific report
  const getReportTransactions = (reportId: string): GrantTransaction[] =>
    (transactions ?? []).filter(t => (t as any).report_id === reportId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-[10px] text-muted-foreground font-mono uppercase">Budget total</div><div className="text-lg font-bold font-mono text-foreground">{fmt(bt)} €</div></div>
        <div className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-[10px] text-muted-foreground font-mono uppercase">Déclaré</div><div className="text-lg font-bold font-mono text-foreground">{fmt(totalDeclared)} €</div></div>
        <div className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-[10px] text-muted-foreground font-mono uppercase">Validé</div><div className="text-lg font-bold font-mono text-primary">{fmt(totalValidated)} €</div></div>
        <div className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-[10px] text-muted-foreground font-mono uppercase">Reçu</div><div className="text-lg font-bold font-mono text-green-500">{fmt(totalReceived)} €</div></div>
        <div className="bg-card border border-border rounded-xl p-3 text-center"><div className="text-[10px] text-muted-foreground font-mono uppercase">Solde restant</div><div className={`text-lg font-bold font-mono ${soldePct < 20 ? "text-destructive" : "text-foreground"}`}>{fmt(soldeRestant)} € <span className="text-[10px] text-muted-foreground">({soldePct}%)</span></div></div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">Rapports financiers</span>
        <div className="flex items-center gap-2">
          <GhButton variant="ghost" onClick={() => handleExportDonorReport()}>
            <FileDown size={14} className="mr-1" /> Annexe 1b (PDF)
          </GhButton>
          <GhButton onClick={() => { setEditReport(null); setShowForm(true); }}>+ Nouveau rapport</GhButton>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-secondary rounded-xl animate-pulse" />)}</div>
      ) : !reports || reports.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="text-2xl mb-2">📊</div><div className="text-sm text-muted-foreground mb-3">Aucun rapport financier</div>
          <GhButton onClick={() => { setEditReport(null); setShowForm(true); }}>+ Premier rapport</GhButton>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead><tr className="bg-secondary">
                {["", "Période", "Type", "Début", "Fin", "Déclaré", "Validé", "Solde €", "Solde %", "Prévu Q+1", "Prévu Q+2", "Prévu Q+3", "Statut", ""].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-mono uppercase text-muted-foreground tracking-wider border-b border-border whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {reports.map(r => {
                  const st = statusMap[r.status] ?? statusMap.draft;
                  const rBudget = bt;
                  const rSolde = rBudget - (r.amount_declared ?? 0);
                  const rSoldePct = rBudget > 0 ? Math.round((rSolde / rBudget) * 100) : 0;
                  const reportTx = getReportTransactions(r.id);
                  const isExpanded = expandedReport === r.id;

                  return (
                    <>
                      <tr key={r.id} className="hover:bg-secondary/50 transition-colors group cursor-pointer" onClick={() => setExpandedReport(isExpanded ? null : r.id)}>
                        <td className="px-3 py-2.5 border-b border-border text-muted-foreground">{isExpanded ? "▼" : "▶"}</td>
                        <td className="px-3 py-2.5 border-b border-border font-semibold text-foreground">{r.period_label}</td>
                        <td className="px-3 py-2.5 border-b border-border text-muted-foreground capitalize">{r.period_type === "quarterly" ? "Trim." : r.period_type === "semiannual" ? "Sem." : "An."}</td>
                        <td className="px-3 py-2.5 border-b border-border font-mono text-muted-foreground text-[11px]">{r.start_date ?? "—"}</td>
                        <td className="px-3 py-2.5 border-b border-border font-mono text-muted-foreground text-[11px]">{r.end_date ?? "—"}</td>
                        <td className="px-3 py-2.5 border-b border-border font-mono text-foreground">{fmt(r.amount_declared ?? 0)} €</td>
                        <td className="px-3 py-2.5 border-b border-border font-mono text-primary">{fmt(r.amount_validated ?? 0)} €</td>
                        <td className="px-3 py-2.5 border-b border-border font-mono text-foreground">{fmt(rSolde)} €</td>
                        <td className="px-3 py-2.5 border-b border-border">
                          <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${rSoldePct < 20 ? "bg-destructive/10 text-destructive" : rSoldePct < 50 ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"}`}>{rSoldePct}%</span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-border font-mono text-muted-foreground">{fmt((r as any).forecast_q1 ?? 0)} €</td>
                        <td className="px-3 py-2.5 border-b border-border font-mono text-muted-foreground">{fmt((r as any).forecast_q2 ?? 0)} €</td>
                        <td className="px-3 py-2.5 border-b border-border font-mono text-muted-foreground">{fmt((r as any).forecast_q3 ?? 0)} €</td>
                        <td className="px-3 py-2.5 border-b border-border"><Pill color={st.color}>{st.label}</Pill></td>
                        <td className="px-3 py-2.5 border-b border-border">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setEditReport(r); setShowForm(true); }} className="text-[11px] text-muted-foreground hover:text-foreground">✏️</button>
                            <button onClick={() => setDeleteReport(r)} className="text-[11px] text-muted-foreground hover:text-destructive">🗑</button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${r.id}-tx`}>
                          <td colSpan={14} className="bg-secondary/30 px-6 py-3 border-b border-border">
                            <div className="text-[11px] font-bold text-foreground mb-2">
                              Transactions liées — {r.period_label}
                              <span className="ml-2 font-mono text-muted-foreground font-normal">({reportTx.length} transaction{reportTx.length !== 1 ? "s" : ""})</span>
                            </div>
                            {reportTx.length === 0 ? (
                              <div className="text-[11px] text-muted-foreground italic">Aucune transaction rattachée à ce rapport. Rattachez des transactions en sélectionnant ce rapport dans le formulaire de transaction.</div>
                            ) : (
                              <table className="w-full text-[11px]">
                                <thead><tr className="text-[9px] text-muted-foreground uppercase">
                                  <th className="text-left py-1 px-2">Date</th><th className="text-left py-1 px-2">Libellé</th>
                                  <th className="text-left py-1 px-2">Code</th><th className="text-left py-1 px-2">Fournisseur</th>
                                  <th className="text-right py-1 px-2">Montant EUR</th>
                                </tr></thead>
                                <tbody>
                                  {reportTx.map(tx => (
                                    <tr key={tx.id} className="border-t border-border/50">
                                      <td className="py-1 px-2 font-mono">{tx.transaction_date}</td>
                                      <td className="py-1 px-2 text-foreground">{tx.label}</td>
                                      <td className="py-1 px-2"><span className="font-mono text-primary">{tx.budget_code ?? "—"}</span></td>
                                      <td className="py-1 px-2 text-muted-foreground">{tx.vendor ?? "—"}</td>
                                      <td className="py-1 px-2 text-right font-mono font-semibold">{fmt(tx.amount)} €</td>
                                    </tr>
                                  ))}
                                  <tr className="border-t border-border font-bold">
                                    <td colSpan={4} className="py-1 px-2 text-right text-[10px] uppercase">Total</td>
                                    <td className="py-1 px-2 text-right font-mono text-primary">{fmt(reportTx.reduce((s, t) => s + t.amount, 0))} €</td>
                                  </tr>
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                <tr className="bg-foreground/5 font-bold">
                  <td className="px-3 py-2.5" />
                  <td colSpan={4} className="px-3 py-2.5 text-right text-[11px] text-foreground uppercase">Totaux</td>
                  <td className="px-3 py-2.5 font-mono text-foreground">{fmt(totalDeclared)} €</td>
                  <td className="px-3 py-2.5 font-mono text-primary">{fmt(totalValidated)} €</td>
                  <td className="px-3 py-2.5 font-mono text-foreground">{fmt(soldeRestant)} €</td>
                  <td className="px-3 py-2.5"><span className="font-mono text-xs">{soldePct}%</span></td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{fmt(reports?.reduce((s, r) => s + ((r as any).forecast_q1 ?? 0), 0) ?? 0)} €</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{fmt(reports?.reduce((s, r) => s + ((r as any).forecast_q2 ?? 0), 0) ?? 0)} €</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{fmt(reports?.reduce((s, r) => s + ((r as any).forecast_q3 ?? 0), 0) ?? 0)} €</td>
                  <td colSpan={2} className="px-3 py-2.5" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ReportFormDialog open={showForm} onOpenChange={setShowForm} grantId={grantId} editData={editReport} userId={user?.id} />

      <AlertDialog open={!!deleteReport} onOpenChange={(o) => { if (!o) setDeleteReport(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce rapport ?</AlertDialogTitle><AlertDialogDescription>Le rapport « {deleteReport?.period_label} » sera définitivement supprimé.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => deleteReport && deleteMutation.mutate(deleteReport.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReportFormDialog({ open, onOpenChange, grantId, editData, userId }: {
  open: boolean; onOpenChange: (o: boolean) => void; grantId: string; editData: GrantReport | null; userId?: string;
}) {
  const qc = useQueryClient();
  const isEdit = !!editData;
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodType, setPeriodType] = useState("quarterly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amountDeclared, setAmountDeclared] = useState("");
  const [amountValidated, setAmountValidated] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [forecastQ1, setForecastQ1] = useState("");
  const [forecastQ2, setForecastQ2] = useState("");
  const [forecastQ3, setForecastQ3] = useState("");
  const [forecastYear1, setForecastYear1] = useState("");
  const [forecastYear2, setForecastYear2] = useState("");
  const [forecastYear3, setForecastYear3] = useState("");

  const handleOpenChange = (o: boolean) => {
    if (o && editData) {
      setPeriodLabel(editData.period_label ?? ""); setPeriodType(editData.period_type ?? "quarterly");
      setStartDate(editData.start_date ?? ""); setEndDate(editData.end_date ?? "");
      setAmountDeclared(String(editData.amount_declared ?? "")); setAmountValidated(String(editData.amount_validated ?? ""));
      setAmountReceived(String(editData.amount_received ?? "")); setStatus(editData.status ?? "draft"); setNotes(editData.notes ?? "");
      setForecastQ1(String((editData as any).forecast_q1 ?? "")); setForecastQ2(String((editData as any).forecast_q2 ?? ""));
      setForecastQ3(String((editData as any).forecast_q3 ?? ""));
      setForecastYear1(String((editData as any).forecast_year1 ?? "")); setForecastYear2(String((editData as any).forecast_year2 ?? ""));
      setForecastYear3(String((editData as any).forecast_year3 ?? ""));
    } else if (o) {
      setPeriodLabel(""); setPeriodType("quarterly"); setStartDate(""); setEndDate("");
      setAmountDeclared(""); setAmountValidated(""); setAmountReceived(""); setStatus("draft"); setNotes("");
      setForecastQ1(""); setForecastQ2(""); setForecastQ3("");
      setForecastYear1(""); setForecastYear2(""); setForecastYear3("");
    }
    onOpenChange(o);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        grant_id: grantId, period_label: periodLabel, period_type: periodType,
        start_date: startDate || null, end_date: endDate || null,
        amount_declared: parseFloat(amountDeclared) || 0, amount_validated: parseFloat(amountValidated) || 0,
        amount_received: parseFloat(amountReceived) || 0, status, notes: notes || null, submitted_by: userId ?? null,
        forecast_q1: parseFloat(forecastQ1) || 0, forecast_q2: parseFloat(forecastQ2) || 0, forecast_q3: parseFloat(forecastQ3) || 0,
        forecast_year1: parseFloat(forecastYear1) || 0, forecast_year2: parseFloat(forecastYear2) || 0, forecast_year3: parseFloat(forecastYear3) || 0,
      };
      if (isEdit) { const { error } = await supabase.from("grant_reports").update(payload).eq("id", editData.id); if (error) throw error; }
      else { const { error } = await supabase.from("grant_reports").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grant_reports", grantId] }); onOpenChange(false); toast({ title: isEdit ? "Rapport modifié" : "Rapport créé" }); },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{isEdit ? "Modifier le rapport" : "Nouveau rapport financier"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Période *</label><input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} required className={inputCls} placeholder="Ex: T1 2026" /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Type</label>
              <select value={periodType} onChange={e => setPeriodType(e.target.value)} className={inputCls}>
                <option value="quarterly">Trimestriel</option><option value="semiannual">Semestriel</option><option value="annual">Annuel</option>
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Date début</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-foreground">Date fin</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} /></div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="text-[11px] font-bold text-foreground mb-2 uppercase tracking-wider">Dépenses engagées</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Déclaré (€)</label><input type="number" value={amountDeclared} onChange={e => setAmountDeclared(e.target.value)} className={inputCls} /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Validé (€)</label><input type="number" value={amountValidated} onChange={e => setAmountValidated(e.target.value)} className={inputCls} /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Reçu (€)</label><input type="number" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} className={inputCls} /></div>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="text-[11px] font-bold text-foreground mb-2 uppercase tracking-wider">Dépenses prévues (prochains trimestres)</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Q+1 (€)</label><input type="number" value={forecastQ1} onChange={e => setForecastQ1(e.target.value)} className={inputCls} placeholder="Trimestre N+1" /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Q+2 (€)</label><input type="number" value={forecastQ2} onChange={e => setForecastQ2(e.target.value)} className={inputCls} placeholder="Trimestre N+2" /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Q+3 (€)</label><input type="number" value={forecastQ3} onChange={e => setForecastQ3(e.target.value)} className={inputCls} placeholder="Trimestre N+3" /></div>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="text-[11px] font-bold text-foreground mb-2 uppercase tracking-wider">Prévisions annuelles</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Exercice N+1</label><input type="number" value={forecastYear1} onChange={e => setForecastYear1(e.target.value)} className={inputCls} /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Exercice N+2</label><input type="number" value={forecastYear2} onChange={e => setForecastYear2(e.target.value)} className={inputCls} /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-foreground">Exercice N+3</label><input type="number" value={forecastYear3} onChange={e => setForecastYear3(e.target.value)} className={inputCls} /></div>
            </div>
          </div>

          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Statut</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
              <option value="draft">Brouillon</option><option value="submitted">Soumis</option><option value="validated">Validé</option><option value="rejected">Rejeté</option>
            </select></div>
          <div className="space-y-2"><label className="text-sm font-medium text-foreground">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls + " h-auto"} /></div>
          <button type="submit" disabled={saveMutation.isPending} className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50">
            {saveMutation.isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le rapport"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
