// Export PDF — Rapport Impact ODD
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SDG_LABELS, type ImpactIndicator } from "@/hooks/useImpactIndicators";

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n ?? 0).replace(/\u202f/g, " ");

export interface ImpactPdfInput {
  indicators: ImpactIndicator[];
  scopeLabel: string;
  periodLabel?: string;
  orgName?: string;
  radarPngDataUrl?: string;
}

export function exportImpactOddReportPdf(input: ImpactPdfInput) {
  const { indicators, scopeLabel, periodLabel, orgName = "GrowHub", radarPngDataUrl } = input;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Rapport Impact ODD", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(orgName, 14, 22);
  doc.text(new Date().toLocaleDateString("fr-FR"), pageW - 14, 22, { align: "right" });

  // Contexte
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Périmètre : ", 14, 38);
  doc.setFont("helvetica", "normal");
  doc.text(scopeLabel, 40, 38);
  if (periodLabel) {
    doc.setFont("helvetica", "bold");
    doc.text("Période : ", 14, 45);
    doc.setFont("helvetica", "normal");
    doc.text(periodLabel, 40, 45);
  }

  let cursorY = 52;

  // Radar (image PNG capturée via html2canvas)
  if (radarPngDataUrl) {
    try {
      const imgW = 110;
      const imgH = 110;
      doc.addImage(radarPngDataUrl, "PNG", (pageW - imgW) / 2, cursorY, imgW, imgH);
      cursorY += imgH + 6;
    } catch {
      // ignore
    }
  }

  // Synthèse par ODD
  const grouped = new Map<number, { target: number; actual: number; count: number }>();
  for (const i of indicators) {
    const g = grouped.get(i.sdg_number) ?? { target: 0, actual: 0, count: 0 };
    g.target += Number(i.target_value ?? 0);
    g.actual += Number(i.actual_value ?? 0);
    g.count += 1;
    grouped.set(i.sdg_number, g);
  }

  const synthRows = Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([n, g]) => {
      const pct = g.target > 0 ? Math.round((g.actual / g.target) * 100) : 0;
      return [
        `ODD ${n}`,
        SDG_LABELS[n] ?? "—",
        String(g.count),
        fmt(g.target),
        fmt(g.actual),
        `${pct}%`,
      ];
    });

  autoTable(doc, {
    startY: cursorY,
    head: [["ODD", "Intitulé", "Indicateurs", "Cible", "Réalisé", "% Atteinte"]],
    body: synthRows,
    theme: "striped",
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 5: { halign: "right", fontStyle: "bold" } },
  });

  // Détail
  const tail = (doc as any).lastAutoTable?.finalY ?? cursorY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Détail des indicateurs", 14, tail + 10);

  const detailRows = indicators.map((i) => {
    const pct = i.target_value && i.target_value > 0
      ? Math.round(((i.actual_value ?? 0) / i.target_value) * 100)
      : 0;
    return [
      `ODD ${i.sdg_number}`,
      i.indicator_name,
      i.unit ?? "—",
      fmt(i.target_value),
      fmt(i.actual_value),
      `${pct}%`,
    ];
  });

  autoTable(doc, {
    startY: tail + 14,
    head: [["ODD", "Indicateur", "Unité", "Cible", "Réalisé", "%"]],
    body: detailRows,
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 5: { halign: "right" } },
  });

  // Footer pagination
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${orgName} · Rapport Impact ODD · Page ${i}/${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: "center" }
    );
  }

  const safeScope = scopeLabel.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 40);
  doc.save(`impact-odd_${safeScope}_${Date.now()}.pdf`);
}
