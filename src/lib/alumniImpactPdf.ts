import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtXOF } from "@/lib/payroll";
import type { AlumniRecord, AlumniKpi } from "@/hooks/useAlumni";
import { ALUMNI_STATUS_LABEL } from "@/hooks/useAlumni";

export function exportAlumniImpactPdf(record: AlumniRecord, kpis: AlumniKpi[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RAPPORT D'IMPACT ALUMNI", W / 2, 10, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Édité le ${new Date().toLocaleDateString("fr-FR")}`, W / 2, 16, { align: "center" });

  // Identity
  doc.setTextColor(20);
  let y = 32;
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text(record.startup?.name ?? "Entreprise", 14, y);
  y += 6;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`Secteur : ${record.startup?.sector ?? "—"}    Localisation : ${record.startup?.city ?? ""} ${record.startup?.country ?? ""}`, 14, y);
  y += 5;
  doc.text(`Programme : ${record.program?.name ?? "—"}    Cohorte : ${record.cohort?.name ?? "—"}`, 14, y);
  y += 5;
  doc.text(`Diplômé(e) le : ${new Date(record.graduation_date).toLocaleDateString("fr-FR")}    Statut : ${ALUMNI_STATUS_LABEL[record.status]}`, 14, y);
  y += 8;

  // Impact summary
  if (record.impact_summary) {
    doc.setFont("helvetica", "bold"); doc.text("Synthèse d'impact", 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(record.impact_summary, W - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 4;
  }

  // Aggregate KPIs
  const last = kpis[kpis.length - 1];
  const first = kpis[0];
  const totals = {
    revenue: last?.revenue_xof ?? 0,
    jobs: last?.jobs_total ?? 0,
    funding: kpis.reduce((s, k) => s + Number(k.funding_raised_xof ?? 0), 0),
    exports: last?.exports_xof ?? 0,
  };
  doc.setFont("helvetica", "bold"); doc.text("Indicateurs clés (dernier relevé)", 14, y); y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Chiffre d'affaires", `${fmtXOF(totals.revenue)} F CFA`],
      ["Emplois créés (total)", String(totals.jobs)],
      ["dont femmes", String(last?.jobs_women ?? 0)],
      ["dont jeunes", String(last?.jobs_youth ?? 0)],
      ["Financements levés (cumulés)", `${fmtXOF(totals.funding)} F CFA`],
      ["Exportations", `${fmtXOF(totals.exports)} F CFA`],
      ["Clients", String(last?.customers_count ?? 0)],
    ],
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // History table
  if (kpis.length > 0) {
    doc.setFont("helvetica", "bold"); doc.text("Historique des KPIs", 14, y); y += 2;
    autoTable(doc, {
      startY: y + 2,
      head: [["Date", "CA (XOF)", "Emplois", "Femmes", "Jeunes", "Levée", "Exports", "Clients"]],
      body: kpis.map((k) => [
        new Date(k.recorded_at).toLocaleDateString("fr-FR"),
        fmtXOF(k.revenue_xof ?? 0),
        String(k.jobs_total ?? 0),
        String(k.jobs_women ?? 0),
        String(k.jobs_youth ?? 0),
        fmtXOF(k.funding_raised_xof ?? 0),
        fmtXOF(k.exports_xof ?? 0),
        String(k.customers_count ?? 0),
      ]),
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
  }

  // Growth note
  if (first && last && first !== last) {
    const growth = first.revenue_xof ? Math.round(((Number(last.revenue_xof ?? 0) - Number(first.revenue_xof)) / Number(first.revenue_xof)) * 100) : 0;
    const jobsDelta = (last.jobs_total ?? 0) - (first.jobs_total ?? 0);
    const fy = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "italic"); doc.setFontSize(9);
    doc.text(`Croissance CA : ${growth >= 0 ? "+" : ""}${growth}%   ·   Emplois créés sur la période : ${jobsDelta >= 0 ? "+" : ""}${jobsDelta}`, 14, fy);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`GrowHub — Rapport d'impact Alumni — Page ${i}/${pageCount}`, W / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });
  }

  doc.save(`alumni-impact-${record.startup?.name ?? "rapport"}-${Date.now()}.pdf`);
}
