import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { OrgSettings } from "@/hooks/useOrgSettings";
import type { DeclarationTotals, PayslipSnapshot } from "@/hooks/useHrDeclarations";
import { MOIS } from "@/lib/payroll";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
    .format(Math.round(n || 0))
    .replace(/\u202f/g, " ");

export type DeclarationKind = "IPRES" | "CSS" | "IR_TRIMF" | "CFCE";

const KIND_LABELS: Record<DeclarationKind, { title: string; ref: string; subtitle: string }> = {
  IPRES: {
    title: "DÉCLARATION IPRES",
    ref: "DCL-IPRES",
    subtitle: "Institution de Prévoyance Retraite du Sénégal",
  },
  CSS: {
    title: "DÉCLARATION CSS",
    ref: "DCL-CSS",
    subtitle: "Caisse de Sécurité Sociale (Allocations familiales + Accidents du travail)",
  },
  IR_TRIMF: {
    title: "DÉCLARATION IR / TRIMF",
    ref: "DCL-IR",
    subtitle: "Impôt sur le Revenu et Taxe Représentative de l'Impôt du Minimum Fiscal",
  },
  CFCE: {
    title: "DÉCLARATION CFCE",
    ref: "DCL-CFCE",
    subtitle: "Contribution Forfaitaire à la Charge des Employeurs",
  },
};

async function loadImageDataUrl(url?: string | null) {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

function getRecapRows(kind: DeclarationKind, t: DeclarationTotals): Array<[string, string]> {
  switch (kind) {
    case "IPRES":
      return [
        ["Effectif déclaré", String(t.effectif)],
        ["Masse salariale brute (FCFA)", fmt(t.masseSalarialeBrute)],
        ["IPRES Régime Général - Part salariale", fmt(t.ipresRG_salarial)],
        ["IPRES Régime Général - Part patronale", fmt(t.ipresRG_patronal)],
        ["IPRES Régime Complémentaire - Part salariale", fmt(t.ipresRC_salarial)],
        ["IPRES Régime Complémentaire - Part patronale", fmt(t.ipresRC_patronal)],
        ["TOTAL IPRES À VERSER", fmt(t.ipresTotal)],
      ];
    case "CSS":
      return [
        ["Effectif déclaré", String(t.effectif)],
        ["Base CSS plafonnée (FCFA)", fmt(t.baseCSS)],
        ["Allocations familiales (7%)", fmt(t.cssAF)],
        ["Accidents du travail", fmt(t.cssAT)],
        ["TOTAL CSS À VERSER", fmt(t.cssTotal)],
      ];
    case "IR_TRIMF":
      return [
        ["Effectif déclaré", String(t.effectif)],
        ["Masse salariale brute (FCFA)", fmt(t.masseSalarialeBrute)],
        ["Total Impôt sur le Revenu (IR)", fmt(t.ir)],
        ["Total TRIMF", fmt(t.trimf)],
        ["TOTAL IR + TRIMF", fmt(t.ir + t.trimf)],
      ];
    case "CFCE":
      return [
        ["Effectif déclaré", String(t.effectif)],
        ["Masse salariale brute (FCFA)", fmt(t.masseSalarialeBrute)],
        ["TOTAL CFCE À VERSER (3%)", fmt(t.cfce)],
      ];
  }
}

function getDetailHead(kind: DeclarationKind): string[] {
  const base = ["Matricule", "Nom & Prénom", "Brut"];
  switch (kind) {
    case "IPRES":
      return [...base, "RG Sal.", "RG Pat.", "RC Sal.", "RC Pat.", "Total"];
    case "CSS":
      return [...base, "Base CSS", "AF", "AT", "Total"];
    case "IR_TRIMF":
      return [...base, "IR", "TRIMF", "Total"];
    case "CFCE":
      return [...base, "Base", "CFCE 3%"];
  }
}

function getDetailRow(kind: DeclarationKind, p: PayslipSnapshot): string[] {
  const emp = p.employee_snapshot || {};
  const c = p.calculation_snapshot;
  const base = [
    emp.matricule ?? "—",
    `${emp.prenom ?? ""} ${emp.nom ?? ""}`.trim() || "—",
    fmt(p.gross_total ?? c.brut ?? 0),
  ];
  switch (kind) {
    case "IPRES":
      return [
        ...base,
        fmt(c.ipresRG_s),
        fmt(c.ipresRG_p),
        fmt(c.ipresRC_s),
        fmt(c.ipresRC_p),
        fmt((c.ipresRG_s ?? 0) + (c.ipresRG_p ?? 0) + (c.ipresRC_s ?? 0) + (c.ipresRC_p ?? 0)),
      ];
    case "CSS":
      return [...base, fmt(c.baseCSS), fmt(c.css_af), fmt(c.css_at), fmt((c.css_af ?? 0) + (c.css_at ?? 0))];
    case "IR_TRIMF":
      return [...base, fmt(c.ir), fmt(c.trimf), fmt((c.ir ?? 0) + (c.trimf ?? 0))];
    case "CFCE":
      return [...base, fmt(p.gross_total ?? c.brut ?? 0), fmt(c.cfce)];
  }
}

export async function exportDeclarationPdf(
  kind: DeclarationKind,
  totals: DeclarationTotals,
  payslips: PayslipSnapshot[],
  periode: { mois?: number; annee: number },
  org: OrgSettings | null,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const navy: [number, number, number] = [13, 31, 46];
  const accent: [number, number, number] = [37, 99, 235];
  const meta = KIND_LABELS[kind];
  const periodLabel =
    periode.mois !== undefined ? `${MOIS[periode.mois]} ${periode.annee}` : `Année ${periode.annee}`;
  const ref = `${meta.ref}-${periode.annee}${periode.mois !== undefined ? `-${String(periode.mois + 1).padStart(2, "0")}` : ""}`;

  // Header
  const logo = await loadImageDataUrl(org?.logo_url);
  if (logo) {
    const h = 18;
    doc.addImage(logo.dataUrl, "PNG", 14, 10, h * (logo.w / logo.h), h);
  }
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(meta.title, 196, 16, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(meta.subtitle, 196, 22, { align: "right" });
  doc.text(`Période : ${periodLabel}`, 196, 28, { align: "right" });
  doc.text(`Réf. ${ref}`, 196, 33, { align: "right" });

  // Org block
  const company = org?.company_name || "GROW HUB";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(company, 14, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const orgLines = [
    org?.address,
    org?.city,
    org?.phone,
    org?.email,
    org?.ninea ? `NINEA : ${org.ninea}` : null,
    org?.rccm ? `RCCM : ${org.rccm}` : null,
  ].filter(Boolean) as string[];
  orgLines.slice(0, 4).forEach((line, i) => doc.text(line, 14, 46 + i * 5));

  // Récap
  const recapRows = getRecapRows(kind, totals);
  autoTable(doc, {
    startY: 72,
    head: [["Récapitulatif", "Montant"]],
    body: recapRows,
    headStyles: { fillColor: accent, textColor: 255, fontStyle: "bold" },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === recapRows.length - 1) {
        data.cell.styles.fillColor = [240, 245, 252];
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Détail employés
  const detailY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.text("Détail par employé", 14, detailY);

  autoTable(doc, {
    startY: detailY + 3,
    head: [getDetailHead(kind)],
    body: payslips.map((p) => getDetailRow(kind, p)),
    headStyles: { fillColor: navy, textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: { 0: { halign: "left" }, 1: { halign: "left" } },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      const page = doc.getCurrentPageInfo().pageNumber;
      const total = (doc as any).getNumberOfPages?.() ?? page;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Page ${page}/${total}`, 196, 290, { align: "right" });
      if (org?.pdf_footer) doc.text(org.pdf_footer, 14, 290);
    },
  });

  // Signature
  const sigY = (doc as any).lastAutoTable.finalY + 12;
  if (sigY < 260) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...navy);
    doc.text(`Fait à ${org?.city || "Dakar"}, le ${new Date().toLocaleDateString("fr-FR")}`, 130, sigY);
    doc.text(org?.signatory_role || "Le Directeur", 130, sigY + 8);
    doc.setFont("helvetica", "bold");
    doc.text(org?.signatory_name || "—", 130, sigY + 20);
  }

  doc.save(`${ref}.pdf`);
}

export function exportDeclarationXlsx(
  kind: DeclarationKind,
  totals: DeclarationTotals,
  payslips: PayslipSnapshot[],
  periode: { mois?: number; annee: number },
) {
  const meta = KIND_LABELS[kind];
  const periodLabel =
    periode.mois !== undefined ? `${MOIS[periode.mois]} ${periode.annee}` : `Année ${periode.annee}`;
  const ref = `${meta.ref}-${periode.annee}${periode.mois !== undefined ? `-${String(periode.mois + 1).padStart(2, "0")}` : ""}`;

  const wb = XLSX.utils.book_new();

  // Feuille récap
  const recapRows = getRecapRows(kind, totals);
  const recapData = [
    [meta.title],
    [meta.subtitle],
    [`Période : ${periodLabel}`],
    [`Référence : ${ref}`],
    [],
    ["Libellé", "Montant (FCFA)"],
    ...recapRows,
  ];
  const wsRecap = XLSX.utils.aoa_to_sheet(recapData);
  wsRecap["!cols"] = [{ wch: 50 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsRecap, "Récapitulatif");

  // Feuille détail
  const head = getDetailHead(kind);
  const detailData = [head, ...payslips.map((p) => getDetailRow(kind, p))];
  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  wsDetail["!cols"] = head.map((_, i) => ({ wch: i < 2 ? 24 : 14 }));
  XLSX.utils.book_append_sheet(wb, wsDetail, "Détail employés");

  XLSX.writeFile(wb, `${ref}.xlsx`);
}

/**
 * Export combiné "État des charges sociales" : toutes les caisses dans un seul XLSX.
 */
export function exportEtatChargesXlsx(
  totals: DeclarationTotals,
  payslips: PayslipSnapshot[],
  periode: { mois?: number; annee: number },
) {
  const periodLabel =
    periode.mois !== undefined ? `${MOIS[periode.mois]} ${periode.annee}` : `Année ${periode.annee}`;
  const ref = `ETAT-CHARGES-${periode.annee}${periode.mois !== undefined ? `-${String(periode.mois + 1).padStart(2, "0")}` : ""}`;

  const wb = XLSX.utils.book_new();

  const summary = [
    ["ÉTAT DES CHARGES SOCIALES & FISCALES"],
    [`Période : ${periodLabel}`],
    [`Effectif : ${totals.effectif}`],
    [`Masse salariale brute : ${fmt(totals.masseSalarialeBrute)} FCFA`],
    [],
    ["Caisse / Impôt", "Part Salariale", "Part Patronale", "Total"],
    ["IPRES Régime Général", fmt(totals.ipresRG_salarial), fmt(totals.ipresRG_patronal), fmt(totals.ipresRG_salarial + totals.ipresRG_patronal)],
    ["IPRES Régime Complémentaire", fmt(totals.ipresRC_salarial), fmt(totals.ipresRC_patronal), fmt(totals.ipresRC_salarial + totals.ipresRC_patronal)],
    ["CSS Allocations familiales", "—", fmt(totals.cssAF), fmt(totals.cssAF)],
    ["CSS Accidents du travail", "—", fmt(totals.cssAT), fmt(totals.cssAT)],
    ["IR (Impôt sur le Revenu)", fmt(totals.ir), "—", fmt(totals.ir)],
    ["TRIMF", fmt(totals.trimf), "—", fmt(totals.trimf)],
    ["CFCE", "—", fmt(totals.cfce), fmt(totals.cfce)],
    ["IPM", fmt(totals.ipm_salarial), fmt(totals.ipm_patronal), fmt(totals.ipm_salarial + totals.ipm_patronal)],
    ["BRS", fmt(totals.brs), "—", fmt(totals.brs)],
    [],
    [
      "TOTAL GÉNÉRAL",
      fmt(totals.ipresRG_salarial + totals.ipresRC_salarial + totals.ir + totals.trimf + totals.ipm_salarial + totals.brs),
      fmt(totals.ipresRG_patronal + totals.ipresRC_patronal + totals.cssAF + totals.cssAT + totals.cfce + totals.ipm_patronal),
      fmt(
        totals.ipresTotal + totals.cssTotal + totals.ir + totals.trimf + totals.cfce +
          totals.ipm_salarial + totals.ipm_patronal + totals.brs,
      ),
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(summary);
  ws["!cols"] = [{ wch: 36 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, "Synthèse");

  XLSX.writeFile(wb, `${ref}.xlsx`);
}
