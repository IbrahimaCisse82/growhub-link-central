// Templates PDF rapports bailleurs multi-formats : UE, USAID, AFD, World Bank
// Source : cost_imputation_consolidated + me_indicator_progress + logical_frameworks
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

const TAUX_EUR_XOF = 655.957;
const TAUX_USD_XOF = 600; // approximatif, ajustable

const fmtXOF = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n || 0)).replace(/\u202f/g, " ");
const fmtNum = (n: number, decimals = 2) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n || 0).replace(/\u202f/g, " ");

export type DonorTemplate = "eu_intpa" | "usaid_qpr" | "afd_semestriel" | "wb_isr";

export const DONOR_TEMPLATE_LABELS: Record<DonorTemplate, string> = {
  eu_intpa: "UE — Narrative DG INTPA",
  usaid_qpr: "USAID — Quarterly Performance Report",
  afd_semestriel: "AFD — Rapport semestriel",
  wb_isr: "World Bank — Implementation Status Report (ISR)",
};

interface GrantInfo {
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
  description?: string | null;
}

export interface DonorReportContext {
  grant: GrantInfo;
  template: DonorTemplate;
  periodLabel: string;
  startDate?: string | null;
  endDate?: string | null;
  orgName?: string;
  narrative?: {
    progress?: string;
    challenges?: string;
    nextSteps?: string;
    lessons?: string;
  };
}

interface CostRow { source: string; total_amount: number; line_count: number }
interface IndicatorRow {
  name: string;
  unit: string | null;
  baseline_value: number | null;
  target_value: number | null;
  endline_measured: number | null;
  midline_measured: number | null;
  achievement_pct: number | null;
  variation_vs_baseline_pct: number | null;
}

const SOURCE_LABEL: Record<string, string> = {
  payroll: "Personnel (paie)",
  expense: "Notes de frais",
  purchase_order: "Bons de commande",
  invoice: "Factures fournisseurs",
  grant_transaction: "Transactions subvention",
};

async function loadData(ctx: DonorReportContext) {
  let costs: CostRow[] = [];
  let indicators: IndicatorRow[] = [];

  if (ctx.grant.project_id) {
    const { data } = await supabase.rpc("get_project_cost_breakdown", {
      _project_id: ctx.grant.project_id,
      _from: ctx.startDate ?? null,
      _to: ctx.endDate ?? null,
    });
    costs = (data ?? []).map((r: { source: string; total_amount: number; line_count: number }) => ({
      source: r.source,
      total_amount: Number(r.total_amount ?? 0),
      line_count: Number(r.line_count ?? 0),
    }));

    const { data: indData } = await supabase
      .from("me_indicator_progress" as never)
      .select("*")
      .eq("project_id", ctx.grant.project_id);
    indicators = (indData ?? []) as unknown as IndicatorRow[];
  }

  // Fallback grant-level indicators
  if (indicators.length === 0) {
    const { data: indData } = await supabase
      .from("me_indicator_progress" as never)
      .select("*")
      .eq("grant_id", ctx.grant.id);
    indicators = (indData ?? []) as unknown as IndicatorRow[];
  }

  return { costs, indicators };
}

function header(doc: jsPDF, title: string, subtitle: string, ctx: DonorReportContext) {
  const navy: [number, number, number] = [13, 31, 46];
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(subtitle, 14, 24);
  doc.text(`Période : ${ctx.periodLabel}`, 14, 29);
  doc.text(`Émis le ${new Date().toLocaleDateString("fr-FR")}`, 196, 18, { align: "right" });
  if (ctx.orgName) doc.text(ctx.orgName, 196, 24, { align: "right" });
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.4);
  doc.line(14, 33, 196, 33);
}

function grantIdBlock(doc: jsPDF, ctx: DonorReportContext, startY = 38) {
  const navy: [number, number, number] = [13, 31, 46];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  doc.text(ctx.grant.name, 14, startY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  const lines = [
    ctx.grant.code ? `Code : ${ctx.grant.code}` : null,
    ctx.grant.organization ? `Bailleur : ${ctx.grant.organization}` : null,
    ctx.grant.convention ? `Convention : ${ctx.grant.convention}` : null,
    ctx.grant.pays ? `Pays : ${ctx.grant.pays}` : null,
  ].filter(Boolean) as string[];
  lines.forEach((l, i) => doc.text(l, 14, startY + 6 + i * 5));
  return startY + 6 + lines.length * 5;
}

function footer(doc: jsPDF, label: string) {
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(label, 14, 290);
  doc.text("Généré automatiquement par GrowHub", 196, 290, { align: "right" });
}

// ============ TEMPLATE: UE / DG INTPA ============
async function renderEuIntpa(ctx: DonorReportContext) {
  const { costs, indicators } = await loadData(ctx);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const navy: [number, number, number] = [13, 31, 46];
  const accent: [number, number, number] = [0, 51, 153]; // EU blue

  header(doc, "Rapport narratif et financier — UE / DG INTPA", "Format Annexe VI — Conditions générales 2024", ctx);
  let y = grantIdBlock(doc, ctx) + 6;

  // Sections narratives
  const sections: { title: string; body?: string }[] = [
    { title: "1. Résumé exécutif", body: ctx.narrative?.progress },
    { title: "2. Progrès vers les résultats attendus", body: ctx.narrative?.progress },
    { title: "3. Difficultés rencontrées et mesures correctives", body: ctx.narrative?.challenges },
    { title: "4. Activités prévues pour la prochaine période", body: ctx.narrative?.nextSteps },
    { title: "5. Leçons apprises et bonnes pratiques", body: ctx.narrative?.lessons },
  ];
  sections.forEach((s) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...accent);
    doc.text(s.title, 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    const body = s.body || "À compléter par le chargé de projet.";
    const lines = doc.splitTextToSize(body, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 4;
    if (y > 240) { doc.addPage(); y = 20; }
  });

  // Cadre logique : indicateurs
  if (y > 230) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  doc.text("6. Cadre logique — Suivi des indicateurs", 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [["Indicateur", "Unité", "Baseline", "Cible", "Réalisé", "% Atteinte"]],
    body: indicators.length > 0 ? indicators.map((i) => [
      i.name,
      i.unit ?? "",
      i.baseline_value != null ? fmtNum(i.baseline_value, 0) : "—",
      i.target_value != null ? fmtNum(i.target_value, 0) : "—",
      i.endline_measured != null ? fmtNum(i.endline_measured, 0) : (i.midline_measured != null ? fmtNum(i.midline_measured, 0) : "—"),
      i.achievement_pct != null ? `${fmtNum(i.achievement_pct, 1)} %` : "—",
    ]) : [["Aucun indicateur enregistré", "", "", "", "", ""]],
    headStyles: { fillColor: accent, textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  // Financier
  const totalXOF = costs.reduce((s, r) => s + r.total_amount, 0);
  const finY = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  doc.text("7. Exécution financière (EUR)", 14, finY);
  autoTable(doc, {
    startY: finY + 3,
    head: [["Catégorie", "Montant XOF", "Équivalent EUR", "% total"]],
    body: costs.map((r) => [
      SOURCE_LABEL[r.source] ?? r.source,
      fmtXOF(r.total_amount),
      fmtNum(r.total_amount / TAUX_EUR_XOF),
      totalXOF > 0 ? `${Math.round((r.total_amount / totalXOF) * 100)} %` : "—",
    ]),
    foot: [["TOTAL PÉRIODE", fmtXOF(totalXOF), fmtNum(totalXOF / TAUX_EUR_XOF), "100 %"]],
    headStyles: { fillColor: accent, textColor: 255, fontSize: 8.5 },
    footStyles: { fillColor: navy, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  footer(doc, `UE/INTPA — ${ctx.grant.code ?? ctx.grant.name}`);
  return doc;
}

// ============ TEMPLATE: USAID QPR ============
async function renderUsaidQpr(ctx: DonorReportContext) {
  const { costs, indicators } = await loadData(ctx);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const usaidBlue: [number, number, number] = [0, 47, 108];
  const usaidRed: [number, number, number] = [191, 13, 62];

  header(doc, "USAID — Quarterly Performance Report (QPR)", "ADS 201 / Performance Management Plan", ctx);
  let y = grantIdBlock(doc, ctx) + 6;

  // 1. Activity Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...usaidBlue);
  doc.text("1. Activity Summary", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  const summary = doc.splitTextToSize(
    ctx.narrative?.progress ||
      `Award: ${ctx.grant.code ?? "N/A"}. Implementing partner: ${ctx.orgName ?? "—"}. ` +
      `Period of performance covering ${ctx.periodLabel}.`,
    180,
  );
  doc.text(summary, 14, y);
  y += summary.length * 4 + 6;

  // 2. Performance against indicators
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...usaidBlue);
  doc.text("2. Performance Indicators (PMP)", 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [["Indicator", "Unit", "Baseline", "LOP Target", "Q Actual", "% LOP"]],
    body: indicators.length > 0 ? indicators.map((i) => [
      i.name,
      i.unit ?? "",
      i.baseline_value != null ? fmtNum(i.baseline_value, 0) : "N/A",
      i.target_value != null ? fmtNum(i.target_value, 0) : "N/A",
      i.endline_measured ?? i.midline_measured != null ? fmtNum((i.endline_measured ?? i.midline_measured) as number, 0) : "—",
      i.achievement_pct != null ? `${fmtNum(i.achievement_pct, 1)}%` : "—",
    ]) : [["No indicators recorded", "", "", "", "", ""]],
    headStyles: { fillColor: usaidBlue, textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  // 3. Implementation Challenges
  let yy = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...usaidRed);
  doc.text("3. Implementation Challenges & Mitigation", 14, yy);
  yy += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  const ch = doc.splitTextToSize(ctx.narrative?.challenges || "No major challenges reported for this quarter.", 180);
  doc.text(ch, 14, yy);
  yy += ch.length * 4 + 6;

  // 4. Financial summary (USD)
  const totalXOF = costs.reduce((s, r) => s + r.total_amount, 0);
  if (yy > 220) { doc.addPage(); yy = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...usaidBlue);
  doc.text("4. Financial Execution (USD equivalent)", 14, yy);
  autoTable(doc, {
    startY: yy + 3,
    head: [["Cost Category", "XOF", "USD ~", "% Total"]],
    body: costs.map((r) => [
      SOURCE_LABEL[r.source] ?? r.source,
      fmtXOF(r.total_amount),
      fmtNum(r.total_amount / TAUX_USD_XOF),
      totalXOF > 0 ? `${Math.round((r.total_amount / totalXOF) * 100)}%` : "—",
    ]),
    foot: [["TOTAL Q", fmtXOF(totalXOF), fmtNum(totalXOF / TAUX_USD_XOF), "100%"]],
    headStyles: { fillColor: usaidBlue, textColor: 255, fontSize: 8.5 },
    footStyles: { fillColor: usaidRed, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  footer(doc, `USAID QPR — ${ctx.grant.code ?? ctx.grant.name}`);
  return doc;
}

// ============ TEMPLATE: AFD ============
async function renderAfdSemestriel(ctx: DonorReportContext) {
  const { costs, indicators } = await loadData(ctx);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const afdRed: [number, number, number] = [227, 25, 55];
  const navy: [number, number, number] = [13, 31, 46];

  header(doc, "AFD — Rapport semestriel d'exécution", "Convention de financement — Modèle CICID", ctx);
  let y = grantIdBlock(doc, ctx) + 6;

  // 1. État d'avancement
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...afdRed);
  doc.text("1. État d'avancement physique", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  const adv = doc.splitTextToSize(ctx.narrative?.progress || "À compléter.", 180);
  doc.text(adv, 14, y);
  y += adv.length * 4 + 6;

  // 2. Indicateurs cadre de résultats
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  doc.text("2. Cadre de résultats AFD", 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [["Indicateur", "Référence", "Cible fin projet", "Valeur S", "Variation /baseline"]],
    body: indicators.length > 0 ? indicators.map((i) => [
      i.name,
      i.baseline_value != null ? `${fmtNum(i.baseline_value, 0)} ${i.unit ?? ""}` : "—",
      i.target_value != null ? `${fmtNum(i.target_value, 0)} ${i.unit ?? ""}` : "—",
      i.endline_measured ?? i.midline_measured != null ? fmtNum((i.endline_measured ?? i.midline_measured) as number, 0) : "—",
      i.variation_vs_baseline_pct != null ? `${fmtNum(i.variation_vs_baseline_pct, 1)} %` : "—",
    ]) : [["Aucun indicateur", "", "", "", ""]],
    headStyles: { fillColor: afdRed, textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  // 3. Exécution financière
  const totalXOF = costs.reduce((s, r) => s + r.total_amount, 0);
  const yy = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...afdRed);
  doc.text("3. Exécution financière du semestre", 14, yy);
  autoTable(doc, {
    startY: yy + 3,
    head: [["Poste de dépense", "XOF", "EUR", "% du décaissé"]],
    body: costs.map((r) => [
      SOURCE_LABEL[r.source] ?? r.source,
      fmtXOF(r.total_amount),
      fmtNum(r.total_amount / TAUX_EUR_XOF),
      totalXOF > 0 ? `${Math.round((r.total_amount / totalXOF) * 100)} %` : "—",
    ]),
    foot: [["TOTAL SEMESTRE", fmtXOF(totalXOF), fmtNum(totalXOF / TAUX_EUR_XOF), "100 %"]],
    headStyles: { fillColor: navy, textColor: 255, fontSize: 8.5 },
    footStyles: { fillColor: afdRed, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  // 4. Perspectives
  const fy = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  doc.text("4. Perspectives prochain semestre", 14, fy);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  const ns = doc.splitTextToSize(ctx.narrative?.nextSteps || "À compléter.", 180);
  doc.text(ns, 14, fy + 5);

  footer(doc, `AFD Rapport semestriel — ${ctx.grant.code ?? ctx.grant.name}`);
  return doc;
}

// ============ TEMPLATE: World Bank ISR ============
async function renderWbIsr(ctx: DonorReportContext) {
  const { costs, indicators } = await loadData(ctx);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const wbBlue: [number, number, number] = [0, 95, 140];
  const navy: [number, number, number] = [13, 31, 46];

  header(doc, "World Bank — Implementation Status & Results Report (ISR)", "Operations Policy & Country Services", ctx);
  let y = grantIdBlock(doc, ctx) + 6;

  // Project ratings table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...wbBlue);
  doc.text("A. Project Ratings", 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [["Indicator", "Previous", "Current"]],
    body: [
      ["Progress towards achievement of PDO", "—", "Satisfactory"],
      ["Overall Implementation Progress (IP)", "—", "Moderately Satisfactory"],
      ["Overall Risk Rating", "—", "Substantial"],
      ["Financial Management", "—", "Satisfactory"],
      ["Procurement", "—", "Moderately Satisfactory"],
    ],
    headStyles: { fillColor: wbBlue, textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  let yy = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // B. Results Framework
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...wbBlue);
  doc.text("B. Results Framework — PDO & Intermediate Indicators", 14, yy);
  yy += 4;
  autoTable(doc, {
    startY: yy,
    head: [["Indicator Name", "Unit", "Baseline", "Current", "End Target", "% Achieved"]],
    body: indicators.length > 0 ? indicators.map((i) => [
      i.name,
      i.unit ?? "",
      i.baseline_value != null ? fmtNum(i.baseline_value, 0) : "0",
      i.endline_measured ?? i.midline_measured != null ? fmtNum((i.endline_measured ?? i.midline_measured) as number, 0) : "—",
      i.target_value != null ? fmtNum(i.target_value, 0) : "—",
      i.achievement_pct != null ? `${fmtNum(i.achievement_pct, 1)}%` : "—",
    ]) : [["No indicators captured", "", "", "", "", ""]],
    headStyles: { fillColor: wbBlue, textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  yy = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // C. Disbursement summary
  const totalXOF = costs.reduce((s, r) => s + r.total_amount, 0);
  const budget = Number(ctx.grant.amount_total ?? 0);
  const disbursed = Number(ctx.grant.amount_disbursed ?? 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...wbBlue);
  doc.text("C. Disbursement Summary (USD equivalent)", 14, yy);
  autoTable(doc, {
    startY: yy + 3,
    head: [["", "XOF", "USD ~"]],
    body: [
      ["Approved Financing", fmtXOF(budget), fmtNum(budget / TAUX_USD_XOF)],
      ["Cumulative Disbursed", fmtXOF(disbursed), fmtNum(disbursed / TAUX_USD_XOF)],
      ["Expenses this period", fmtXOF(totalXOF), fmtNum(totalXOF / TAUX_USD_XOF)],
      ["Undisbursed Balance", fmtXOF(Math.max(0, budget - disbursed)), fmtNum(Math.max(0, budget - disbursed) / TAUX_USD_XOF)],
    ],
    headStyles: { fillColor: navy, textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  yy = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  if (yy > 250) { doc.addPage(); yy = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...wbBlue);
  doc.text("D. Key Implementation Issues & Lessons Learned", 14, yy);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  const issues = doc.splitTextToSize(ctx.narrative?.challenges || "No critical issues reported.", 180);
  doc.text(issues, 14, yy + 5);
  const lessons = doc.splitTextToSize(`Lessons learned: ${ctx.narrative?.lessons || "—"}`, 180);
  doc.text(lessons, 14, yy + 5 + issues.length * 4 + 4);

  footer(doc, `World Bank ISR — ${ctx.grant.code ?? ctx.grant.name}`);
  return doc;
}

export async function generateDonorReport(ctx: DonorReportContext) {
  let doc: jsPDF;
  switch (ctx.template) {
    case "eu_intpa": doc = await renderEuIntpa(ctx); break;
    case "usaid_qpr": doc = await renderUsaidQpr(ctx); break;
    case "afd_semestriel": doc = await renderAfdSemestriel(ctx); break;
    case "wb_isr": doc = await renderWbIsr(ctx); break;
  }
  const safeName = (ctx.grant.code ?? ctx.grant.name).replace(/[^a-zA-Z0-9-_]/g, "_");
  doc.save(`${ctx.template}_${safeName}_${ctx.periodLabel.replace(/\s+/g, "_")}.pdf`);
}
