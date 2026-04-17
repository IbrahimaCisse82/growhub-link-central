import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import SectionHeader from "@/components/shared/SectionHeader";
import StatCard from "@/components/shared/StatCard";
import GhButton from "@/components/shared/GhButton";
import Pill from "@/components/shared/Pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import EditGrantDialog from "@/components/dialogs/EditGrantDialog";
import { toast } from "@/hooks/use-toast";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import {
  useGrantDetailQuery, useGrantTransactions, useGrantReports, useGrantDisbursements,
  useGrantDocuments, useGrantIndicators, useGrantActivities, useGrantChanges,
  useGrantBudgetLines, useGrantProjectBudgetLines, type GrantStatus,
} from "@/hooks/useGrantDetail";
import GrantTransactionsTab from "@/components/grants/GrantTransactionsTab";
import GrantReportsTab from "@/components/grants/GrantReportsTab";
import GrantDisbursementsTab from "@/components/grants/GrantDisbursementsTab";
import GrantDocumentsTab from "@/components/grants/GrantDocumentsTab";
import GrantIndicatorsTab from "@/components/grants/GrantIndicatorsTab";
import GrantActivitiesTab from "@/components/grants/GrantActivitiesTab";
import GrantBudgetChart from "@/components/grants/GrantBudgetChart";
import GrantAlertsPanel from "@/components/grants/GrantAlertsPanel";
import GrantAddendumTab, { useGrantAddendums } from "@/components/grants/GrantAddendumTab";
import GrantFicheRecapTab from "@/components/grants/GrantFicheRecapTab";
import EntityCommentsPanel from "@/components/shared/EntityCommentsPanel";
import AISuggestPanel from "@/components/ai/AISuggestPanel";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

const politiqueChangeLabel = (v: string | null | undefined): string => {
  if (!v) return "—";
  const map: Record<string, string> = {
    taux_moyen_pondere: "Taux moyen pondéré des versements",
    taux_fixe_convention: "Taux fixe de la convention",
    taux_jour: "Taux du jour (transaction)",
    procedure_interne: "Procédure interne validée",
  };
  return map[v] ?? v;
};

const statusMap: Record<string, { label: string; color: "green" | "amber" | "blue" | "gray" }> = {
  draft: { label: "Brouillon", color: "gray" },
  active: { label: "Active", color: "green" },
  disbursing: { label: "Décaissement", color: "blue" },
  closing: { label: "Clôture", color: "amber" },
  closed: { label: "Clôturé", color: "gray" },
};

export default function GrantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: grant, isLoading } = useGrantDetailQuery(id);
  const { data: budgetLines } = useGrantBudgetLines(id);
  const { data: projectBudgetLines } = useGrantProjectBudgetLines(id);
  const { data: grantChanges } = useGrantChanges(id);
  const { data: transactions } = useGrantTransactions(id);
  const { data: reports } = useGrantReports(id);
  const { data: disbursements } = useGrantDisbursements(id);
  const { data: documents } = useGrantDocuments(id);
  const { data: indicators } = useGrantIndicators(id);
  const { data: activities } = useGrantActivities(id);
  const { data: addendums } = useGrantAddendums(id);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("grants").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grants"] }); navigate("/app/grants"); toast({ title: "Grant supprimé" }); },
    onError: (e) => toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("grants").update({ status: "closed" as Database["public"]["Enums"]["grant_status"] }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grants"] }); qc.invalidateQueries({ queryKey: ["grant_detail", id] }); setShowCancel(false); toast({ title: "Grant annulé" }); },
    onError: (e) => toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-4 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  if (!grant) return <div className="text-center py-12 text-muted-foreground">Grant introuvable</div>;

  const st = statusMap[grant.status] ?? statusMap.draft;
  const pct = grant.amount_total > 0 ? Math.round(((grant.amount_disbursed ?? 0) / grant.amount_total) * 100) : 0;
  const totalPlanned = budgetLines?.reduce((s, b) => s + (b.amount_planned ?? 0), 0) ?? 0;
  const totalSpent = budgetLines?.reduce((s, b) => s + (b.amount_spent ?? 0), 0) ?? 0;
  const utilization = totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0;

  const EUR_TO_FCFA = (grant as any).taux_change ?? 655.957;
  const fmtFCFA = (n: number) => Math.round(n).toLocaleString("fr-FR");
  const calcRisqueLevel = (score: number): string => {
    if (score <= 25) return "Faible risque";
    if (score <= 50) return "Risque modéré";
    if (score <= 75) return "Risque important";
    return "Risque élevé";
  };
  const riskLevel = (grant as any).risk_score ? calcRisqueLevel((grant as any).risk_score) : null;
  const riskColor = riskLevel === "Faible risque" ? "green" : riskLevel === "Risque modéré" ? "blue" : riskLevel === "Risque important" ? "amber" : riskLevel === "Risque élevé" ? "gray" : "gray";

  const linesA = projectBudgetLines?.filter((l: any) => l.section === "A") ?? [];
  const linesB = projectBudgetLines?.filter((l: any) => l.section === "B") ?? [];
  const lineTotal = (l: any) => (l.quantity || 0) * (l.unit_cost || 0) * ((l.allocation_pct || 100) / 100);
  const totalA = linesA.reduce((s: number, l: any) => s + lineTotal(l), 0);
  const totalB = linesB.reduce((s: number, l: any) => s + lineTotal(l), 0);
  const grandTotal = totalA + totalB;

  const calcDuree = (): string => {
    if (!grant.start_date || !grant.end_date) return "—";
    const d1 = new Date(grant.start_date), d2 = new Date(grant.end_date);
    const months = (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth();
    return `${months} mois`;
  };

  const budgetExportCols = [
    { key: "label", label: "Libellé" }, { key: "category", label: "Catégorie" },
    { key: "amount_planned", label: "Planifié" }, { key: "amount_spent", label: "Dépensé" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate("/app/grants")} className="text-muted-foreground hover:text-foreground text-sm transition-colors">← Retour</button>
      </div>

      <SectionHeader
        title={grant.name}
        subtitle={`${grant.code} · ${grant.organization ?? "—"}`}
        actions={
          <>
            <Pill color={st.color}>{st.label}</Pill>
            <GhButton variant="ghost" onClick={() => setShowEdit(true)}>✏️ Modifier</GhButton>
            {grant.status !== "closed" && (
              <GhButton variant="ghost" onClick={() => setShowCancel(true)}>⊘ Annuler</GhButton>
            )}
            <GhButton variant="ghost" onClick={() => setShowDelete(true)} className="text-destructive hover:text-destructive">🗑 Supprimer</GhButton>
            <GhButton variant="ghost" onClick={() => budgetLines && exportToCSV(budgetLines, `budget-${grant.code}`, budgetExportCols)}>⤓ CSV</GhButton>
            <GhButton variant="ghost" onClick={() => budgetLines && exportToPDF(grant.name, budgetLines, budgetExportCols)}>⎙ PDF</GhButton>
          </>
        }
      />

      {/* Alerts */}
      <GrantAlertsPanel
        grant={grant}
        budgetLines={budgetLines ?? []}
        transactions={transactions ?? []}
        reports={reports ?? []}
        activities={activities ?? []}
        disbursements={disbursements ?? []}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <StatCard label="Montant total" value={`${fmt(grant.amount_total)} €`} note={grant.currency ?? "EUR"} color="blue" />
        <StatCard label="Décaissé" value={`${fmt(grant.amount_disbursed ?? 0)} €`} note={`${pct}% du total`} color="green" />
        <StatCard label="Dépenses engagées" value={`${fmt(totalSpent)} €`} note={`${budgetLines?.length ?? 0} lignes`} color="amber" />
        <StatCard label="Consommation" value={`${utilization}%`} note={`${fmt(totalSpent)} / ${fmt(totalPlanned)}`} color={utilization > 80 ? "rose" : "purple"} />
      </div>

      {/* Progress bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Taux de décaissement</span>
          <span className="font-mono text-sm font-bold text-primary">{pct}%</span>
        </div>
        <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct > 80 ? "bg-destructive" : pct > 50 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        {(grant.start_date || grant.end_date) && (
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-mono">
            <span>{grant.start_date ?? "—"}</span>
            <span>{grant.end_date ?? "—"}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="budget" className="space-y-4">
        <TabsList className="bg-secondary border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({transactions?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="disbursements">Décaissements ({disbursements?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="reports">Rapports ({reports?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="activities">Activités ({activities?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="indicators">Indicateurs ({indicators?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="addendums">Addendums ({addendums?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="fiche">Fiche récap.</TabsTrigger>
          <TabsTrigger value="tracking">Suivi</TabsTrigger>
          <TabsTrigger value="info">Infos</TabsTrigger>
          <TabsTrigger value="history">Historique ({grantChanges?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="discussion">💬 Discussion & IA</TabsTrigger>
        </TabsList>

        <TabsContent value="discussion" className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <EntityCommentsPanel entityType="grant" entityId={id!} />
          </div>
          <div className="space-y-3">
            <AISuggestPanel mode="risk_analysis" context={{ name: grant?.name, code: grant?.code, status: grant?.status, amount_total: grant?.amount_total, amount_disbursed: grant?.amount_disbursed, end_date: grant?.end_date }} />
            <AISuggestPanel mode="summary" context={{ name: grant?.name, organization: grant?.organization, amount_total: grant?.amount_total, amount_disbursed: grant?.amount_disbursed, status: grant?.status }} />
            <AISuggestPanel mode="next_actions" context={{ name: grant?.name, status: grant?.status, end_date: grant?.end_date }} />
          </div>
        </TabsContent>

        {/* Budget Tab with Chart */}
        <TabsContent value="budget" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Taux de conversion : <span className="font-mono font-semibold text-foreground">1 € = {fmtFCFA(EUR_TO_FCFA)} FCFA</span></span>
            <span className="text-muted-foreground font-mono text-[11px]">{(grant as any).currency ?? "EUR"} · {(grant as any).periodicite ?? "Trimestrielle"}</span>
          </div>
          <GrantBudgetChart budgetLines={budgetLines ?? []} transactions={transactions ?? []} />
          {projectBudgetLines && projectBudgetLines.length > 0 ? (
            <BudgetAnnexeTable linesA={linesA} linesB={linesB} totalA={totalA} totalB={totalB} grandTotal={grandTotal} lineTotal={lineTotal} eurToFcfa={EUR_TO_FCFA} />
          ) : (
            <EmptyBudgetState />
          )}
        </TabsContent>

        <TabsContent value="transactions">
          {grant && <GrantTransactionsTab grantId={grant.id} grantCode={grant.code} />}
        </TabsContent>

        <TabsContent value="disbursements">
          {grant && <GrantDisbursementsTab grantId={grant.id} grantTotal={grant.amount_total} />}
        </TabsContent>

        <TabsContent value="reports">
          {grant && <GrantReportsTab grantId={grant.id} budgetTotal={grant.amount_total} />}
        </TabsContent>

        <TabsContent value="activities">
          {grant && <GrantActivitiesTab grantId={grant.id} />}
        </TabsContent>

        <TabsContent value="indicators">
          {grant && <GrantIndicatorsTab grantId={grant.id} />}
        </TabsContent>

        <TabsContent value="documents">
          {grant && <GrantDocumentsTab grantId={grant.id} />}
        </TabsContent>

        {/* Addendums Tab */}
        <TabsContent value="addendums">
          {grant && <GrantAddendumTab grantId={grant.id} budgetLines={(projectBudgetLines ?? []).map((l: any) => ({ code: l.code, label: l.label, section: l.section, quantity: l.quantity, unit_cost: l.unit_cost, allocation_pct: l.allocation_pct }))} />}
        </TabsContent>

        {/* Fiche récapitulative Tab */}
        <TabsContent value="fiche">
          {grant && <GrantFicheRecapTab grant={grant} reports={reports ?? []} disbursements={disbursements ?? []} />}
        </TabsContent>

        {/* Tracking Tab */}
        <TabsContent value="tracking">
          {budgetLines && budgetLines.length > 0 ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Suivi budgétaire par poste</span>
                <span className="font-mono text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{budgetLines.length} lignes</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-secondary">
                      {["Libellé", "Catégorie", "Projet", "Planifié", "Dépensé", "%"].map(h => (
                        <th key={h} className="px-3.5 py-2.5 text-left text-[10px] font-mono uppercase text-muted-foreground tracking-wider border-b border-border whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {budgetLines.map(b => {
                      const bPct = (b.amount_planned ?? 0) > 0 ? Math.round(((b.amount_spent ?? 0) / (b.amount_planned ?? 1)) * 100) : 0;
                      return (
                        <tr key={b.id} className="hover:bg-secondary/50 transition-colors">
                          <td className="px-3.5 py-2.5 border-b border-border font-semibold text-foreground">{b.label}</td>
                          <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground">{b.category}</td>
                          <td className="px-3.5 py-2.5 border-b border-border text-muted-foreground">{b.projects?.name ?? "—"}</td>
                          <td className="px-3.5 py-2.5 border-b border-border font-mono text-foreground">{fmt(b.amount_planned ?? 0)} €</td>
                          <td className="px-3.5 py-2.5 border-b border-border font-mono text-foreground">{fmt(b.amount_spent ?? 0)} €</td>
                          <td className="px-3.5 py-2.5 border-b border-border">
                            <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${bPct > 80 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{bPct}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyBudgetState />
          )}
        </TabsContent>

        {/* Info Tab — GTS-style */}
        <TabsContent value="info">
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-4">Informations générales</h3>
              <div className="text-[10px] text-muted-foreground mb-3">{grant.organization ?? "—"} · {(grant as any).convention ?? grant.code}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "N° Convention", val: (grant as any).convention ?? "—" },
                  { label: "Version", val: (grant as any).version ?? "—" },
                  { label: "Date soumission", val: (grant as any).submit_date ?? "—" },
                  { label: "Préparé par", val: (grant as any).prepared_by ?? "—" },
                  { label: "Organisation", val: grant.organization ?? "—" },
                  { label: "Type d'organisation", val: (grant as any).org_type ?? "—" },
                  { label: "Titre du projet", val: grant.name },
                  { label: "Pays", val: (grant as any).pays ?? "—" },
                  { label: "Devise", val: grant.currency ?? "EUR" },
                  { label: "Taux de change (→ EUR)", val: `1 EUR = ${fmtFCFA(EUR_TO_FCFA)} FCFA` },
                  { label: "Politique de change", val: politiqueChangeLabel((grant as any).politique_change) },
                  { label: "Date début", val: grant.start_date ?? "—" },
                  { label: "Date fin", val: grant.end_date ?? "—" },
                  { label: "Durée", val: calcDuree() },
                  { label: "Périodicité", val: (grant as any).periodicite ?? "Trimestrielle" },
                  { label: "Frais de structure", val: (grant as any).frais_structure_pct ? `${(grant as any).frais_structure_pct}%` : "—" },
                  { label: "Contribution propre", val: (grant as any).contribution_propre ? `${fmt((grant as any).contribution_propre)} €` : "—" },
                  { label: "Programme", val: grant.programs?.name ?? "—" },
                  { label: "Description", val: grant.description ?? "—" },
                ].map(row => (
                  <div key={row.label} className="space-y-0.5">
                    <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{row.label}</div>
                    <div className="text-sm text-foreground font-medium">{row.val}</div>
                  </div>
                ))}
              </div>
            </div>
            {riskLevel && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">Niveau de risque</h3>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-foreground">{(grant as any).risk_score}/100</span>
                  <Pill color={riskColor as any}>{riskLevel}</Pill>
                </div>
                <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${(grant as any).risk_score > 75 ? "bg-destructive" : (grant as any).risk_score > 50 ? "bg-amber-500" : (grant as any).risk_score > 25 ? "bg-blue-500" : "bg-primary"}`} style={{ width: `${(grant as any).risk_score}%` }} />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <GrantHistoryTimeline changes={grantChanges ?? []} />
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <EditGrantDialog grant={grant} open={showEdit} onOpenChange={setShowEdit} />

      {/* Delete confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce grant ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Le grant « {grant.name} » et toutes ses données associées seront supprimés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel confirmation */}
      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce grant ?</AlertDialogTitle>
            <AlertDialogDescription>Le grant « {grant.name} » sera marqué comme clôturé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelMutation.mutate()} className="bg-amber-600 text-white hover:bg-amber-700">Confirmer l'annulation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// Sub-components
function EmptyBudgetState() {
  return (
    <div className="bg-card border border-border rounded-xl p-12 text-center">
      <div className="text-2xl mb-2">📊</div>
      <div className="text-sm text-muted-foreground">Aucune donnée budgétaire liée à ce grant</div>
    </div>
  );
}

function BudgetAnnexeTable({ linesA, linesB, totalA, totalB, grandTotal, lineTotal, eurToFcfa }: {
  linesA: any[]; linesB: any[]; totalA: number; totalB: number; grandTotal: number; lineTotal: (l: any) => number; eurToFcfa: number;
}) {
  const fmtF = (n: number) => Math.round(n).toLocaleString("fr-FR");
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">Budget — Annexe 1b</span>
        <span className="font-mono text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{linesA.length + linesB.length} lignes</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-secondary">
              {["Code", "Poste budgétaire", "Unité", "Qté", "Mont. unit. (FCFA)", "Alloc.%", "Total FCFA", "Total EUR"].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-mono uppercase text-muted-foreground tracking-wider border-b border-border whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linesA.length > 0 && (
              <>
                <tr><td colSpan={8} className="px-3 py-2 bg-primary/10 text-primary font-mono text-[10px] font-bold uppercase tracking-wider">A — Coûts opérationnels</td></tr>
                {linesA.map((l: any) => <BudgetRow key={l.id} l={l} lineTotal={lineTotal} section="A" eurToFcfa={eurToFcfa} />)}
                <tr className="bg-secondary/50">
                  <td colSpan={6} className="px-3 py-1.5 text-right text-[11px] font-bold text-foreground">SOUS-TOTAL A</td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold text-foreground">{fmtF(totalA * eurToFcfa)} F</td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold text-primary">{fmt(totalA)} €</td>
                </tr>
              </>
            )}
            {linesB.length > 0 && (
              <>
                <tr><td colSpan={8} className="px-3 py-2 bg-accent/10 text-accent-foreground font-mono text-[10px] font-bold uppercase tracking-wider">B — Frais de gestion</td></tr>
                {linesB.map((l: any) => <BudgetRow key={l.id} l={l} lineTotal={lineTotal} section="B" eurToFcfa={eurToFcfa} />)}
                <tr className="bg-secondary/50">
                  <td colSpan={6} className="px-3 py-1.5 text-right text-[11px] font-bold text-foreground">SOUS-TOTAL B</td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold text-foreground">{fmtF(totalB * eurToFcfa)} F</td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold text-primary">{fmt(totalB)} €</td>
                </tr>
              </>
            )}
            <tr className="bg-foreground/5">
              <td colSpan={6} className="px-3 py-2.5 text-right text-xs font-bold text-foreground uppercase">TOTAL GÉNÉRAL</td>
              <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-foreground">{fmtF(grandTotal * eurToFcfa)} F</td>
              <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-primary">{fmt(grandTotal)} €</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetRow({ l, lineTotal, section, eurToFcfa }: { l: any; lineTotal: (l: any) => number; section: string; eurToFcfa: number }) {
  const colorCls = section === "A" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent-foreground";
  const totalEur = lineTotal(l);
  const totalFcfa = totalEur * eurToFcfa;
  const montantFcfa = (l.unit_cost ?? 0) * eurToFcfa;
  const fmtF = (n: number) => Math.round(n).toLocaleString("fr-FR");
  return (
    <tr className="border-b border-border hover:bg-secondary/50 transition-colors">
      <td className="px-3 py-2"><span className={`font-mono text-[11px] ${colorCls} px-1.5 py-0.5 rounded font-semibold`}>{l.code || "—"}</span></td>
      <td className="px-3 py-2 text-foreground">{l.label}</td>
      <td className="px-3 py-2 text-muted-foreground">{l.unit || "Forfait"}</td>
      <td className="px-3 py-2 text-right font-mono text-foreground">{l.quantity ?? 0}</td>
      <td className="px-3 py-2 text-right font-mono text-foreground">{fmtF(montantFcfa)}</td>
      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{l.allocation_pct ?? 100}%</td>
      <td className="px-3 py-2 text-right font-mono text-foreground">{fmtF(totalFcfa)} F</td>
      <td className="px-3 py-2 text-right"><span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">{fmt(totalEur)} €</span></td>
    </tr>
  );
}

const fieldLabels: Record<string, string> = {
  name: "Nom", code: "Code", organization: "Organisation", status: "Statut",
  amount_total: "Montant total", amount_disbursed: "Décaissé", description: "Description",
  start_date: "Date début", end_date: "Date fin",
};

const actionLabels: Record<string, { label: string; icon: string; color: string }> = {
  create: { label: "Création", icon: "✦", color: "text-primary" },
  update: { label: "Modification", icon: "✏️", color: "text-foreground" },
  delete: { label: "Suppression", icon: "🗑", color: "text-destructive" },
};

function GrantHistoryTimeline({ changes }: { changes: any[] }) {
  if (changes.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <div className="text-2xl mb-2">📋</div>
        <div className="text-sm text-muted-foreground">Aucune modification enregistrée</div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-xs font-bold text-foreground">Historique des modifications</span>
      </div>
      <div className="divide-y divide-border">
        {changes.map((c: any) => {
          const act = actionLabels[c.action] ?? actionLabels.update;
          const changesObj = c.changes ?? {};
          const changedFields = Object.keys(changesObj);
          const date = new Date(c.created_at);

          return (
            <div key={c.id} className="px-4 py-3.5 flex gap-3">
              <div className="flex flex-col items-center pt-0.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${c.action === "create" ? "bg-primary" : c.action === "delete" ? "bg-destructive" : "bg-muted-foreground"}`} />
                <div className="w-px flex-1 bg-border mt-1" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[12px] font-semibold ${act.color}`}>{act.icon} {act.label}</span>
                  <span className="text-[11px] text-muted-foreground">par</span>
                  <span className="text-[12px] font-medium text-foreground">{c.user_name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                    {date.toLocaleDateString("fr-FR")} à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {c.action === "update" && changedFields.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {changedFields.map(field => {
                      const change = changesObj[field];
                      if (!change || typeof change !== "object") return null;
                      const label = fieldLabels[field] ?? field;
                      return (
                        <div key={field} className="text-[11.5px] flex items-start gap-2 bg-secondary/50 rounded-lg px-2.5 py-1.5">
                          <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider shrink-0 w-24">{label}</span>
                          <span className="text-destructive/70 line-through text-[11px]">{String(change.old ?? "—")}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-primary font-medium text-[11px]">{String(change.new ?? "—")}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {c.action === "create" && (
                  <div className="mt-1.5 text-[11px] text-muted-foreground">
                    Grant créé : <span className="text-foreground font-medium">{changesObj.name ?? "—"}</span> ({changesObj.code ?? "—"})
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
