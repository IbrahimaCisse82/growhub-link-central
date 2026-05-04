// Génération PDF "Annexe 1b" — Rapport bailleur GTS
// Source : vue cost_imputation_consolidated (RPC get_project_cost_breakdown) + grant_reports
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

const TAUX_EUR_XOF = 655.957;

const fmtXOF = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n || 0)).replace(/\u202f/g, " ");
const fmtEUR = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n || 0).replace(/\u202f/g, " ");

export interface DonorReportInput {
  grant: {
    id: string;
    name: string;
    code?: string | null;
    organization?: string | null;
    amount_total?: number | null;
    amount_disbursed?: number | null;
    currency?: string | null;
    project_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    convention?: string | null;
    pays?: string | null;
  };
  periodLabel: string;
  startDate?: string | null;
  endDate?: string | null;
  orgName?: string;
}

interface BreakdownRow {
  source: string;
  total_amount: number;
  line_count: number;
}

const SOURCE_LABEL: Record<string, string> = {
  payroll: "Charges de personnel (paie)",
  expense: "Notes de frais",
  purchase_order: "Bons de commande",
  invoice: "Factures fournisseurs",
  grant_transaction: "Transactions subvention",
};

export async function exportGrantDonorReportPdf(input: DonorReportInput) {
  const { grant, periodLabel, startDate, endDate, orgName } = input;

  // Récupération des coûts consolidés via RPC
  let breakdown: BreakdownRow[] = [];
  if (grant.project_id) {
    const { data, error } = await supabase.rpc("get_project_cost_breakdown", {
      _project_id: grant.project_id,
      _from: startDate ?? null,
      _to: endDate ?? null,
    });
    if (error) throw new Error(error.message);
    breakdown = (data ?? []).map((r: { source: string; total_amount: number; line_count: number }) => ({
      source: r.source,
      total_amount: Number(r.total_amount ?? 0),
      line_count: Number(r.line_count ?? 0),
    }));
  }

  const totalXOF = breakdown.reduce((s, r) => s + r.total_amount, 0);
  const totalEUR = totalXOF / TAUX_EUR_XOF;
  const budgetTotal = Number(grant.amount_total ?? 0);
  const disbursed = Number(grant.amount_disbursed ?? 0);
  const consumptionPct = budgetTotal > 0 ? Math.round((totalXOF / budgetTotal) * 100) : 0;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const navy: [number, number, number] = [13, 31, 46];
  const accent: [number, number, number] = [37, 99, 235];

  // En-tête
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ANNEXE 1b — Rapport financier bailleur", 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Modèle GTS v3.3 — Période : ${periodLabel}`, 14, 24);
  doc.text(`Émis le ${new Date().toLocaleDateString("fr-FR")}`, 196, 18, { align: "right" });
  if (orgName) doc.text(orgName, 196, 24, { align: "right" });

  // Bloc identification
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.4);
  doc.line(14, 28, 196, 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  doc.text(grant.name, 14, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  const idLines = [
    grant.code ? `Code : ${grant.code}` : null,
    grant.organization ? `Bailleur : ${grant.organization}` : null,
    grant.convention ? `Convention : ${grant.convention}` : null,
    grant.pays ? `Pays : ${grant.pays}` : null,
    grant.start_date && grant.end_date
      ? `Durée totale : ${new Date(grant.start_date).toLocaleDateString("fr-FR")} → ${new Date(grant.end_date).toLocaleDateString("fr-FR")}`
      : null,
  ].filter(Boolean) as string[];
  idLines.forEach((l, i) => doc.text(l, 14, 42 + i * 5));

  // Tableau synthèse
  let startY = 42 + idLines.length * 5 + 6;
  autoTable(doc, {
    startY,
    head: [["Indicateur", "Montant (XOF)", "Équivalent EUR"]],
    body: [
      ["Budget total octroyé", fmtXOF(budgetTotal), fmtEUR(budgetTotal / TAUX_EUR_XOF)],
      ["Décaissements bailleur", fmtXOF(disbursed), fmtEUR(disbursed / TAUX_EUR_XOF)],
      [`Dépenses période (${periodLabel})`, fmtXOF(totalXOF), fmtEUR(totalEUR)],
      ["Taux de consommation", `${consumptionPct} %`, ""],
      ["Solde restant", fmtXOF(budgetTotal - totalXOF), fmtEUR((budgetTotal - totalXOF) / TAUX_EUR_XOF)],
    ],
    headStyles: { fillColor: navy, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Détail par source
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.text("Détail des dépenses par source d'imputation", 14, startY);

  if (breakdown.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Aucune dépense imputée sur ce projet pour la période.", 14, startY + 6);
  } else {
    autoTable(doc, {
      startY: startY + 3,
      head: [["Source", "Nb. lignes", "Montant XOF", "Équiv. EUR", "% du total"]],
      body: breakdown.map((r) => [
        SOURCE_LABEL[r.source] ?? r.source,
        String(r.line_count),
        fmtXOF(r.total_amount),
        fmtEUR(r.total_amount / TAUX_EUR_XOF),
        totalXOF > 0 ? `${Math.round((r.total_amount / totalXOF) * 100)} %` : "—",
      ]),
      foot: [["TOTAL", "", fmtXOF(totalXOF), fmtEUR(totalEUR), "100 %"]],
      headStyles: { fillColor: navy, textColor: 255, fontSize: 9 },
      footStyles: { fillColor: accent, textColor: 255, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });
  }

  // Pied de page : note + signatures
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? startY + 30;
  const signY = Math.min(finalY + 18, 250);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Taux de change appliqué : 1 EUR = ${TAUX_EUR_XOF} XOF (parité fixe). Données extraites de la vue consolidée des coûts (paie, notes de frais, bons de commande, factures, transactions subvention).`,
    14,
    signY - 8,
    { maxWidth: 180 },
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...navy);
  doc.text("Le Responsable financier", 14, signY);
  doc.text("Le Représentant du bailleur", 130, signY);
  doc.line(14, signY + 18, 80, signY + 18);
  doc.line(130, signY + 18, 196, signY + 18);

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Annexe 1b — ${grant.code ?? grant.name} — page 1`, 14, 290);
  doc.text(`Généré automatiquement par GrowHub`, 196, 290, { align: "right" });

  const safeName = (grant.code ?? grant.name).replace(/[^a-zA-Z0-9-_]/g, "_");
  doc.save(`annexe_1b_${safeName}_${periodLabel.replace(/\s+/g, "_")}.pdf`);
}
