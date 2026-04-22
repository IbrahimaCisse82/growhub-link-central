import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (n: number, cur = "XOF") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);

interface ReportData {
  periodLabel: string;
  totalCA: number;
  totalEncaisse: number;
  totalImpaye: number;
  collectionRate: number;
  dso: number;
  topClients: { name: string; total: number; count: number }[];
  monthly: { label: string; ca: number; encaisse: number }[];
  cashForecast: { label: string; expected: number }[];
}

export function exportCrmReportPdf(data: ReportData) {
  const doc = new jsPDF();
  let y = 18;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport CRM & Facturation", 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Période : ${data.periodLabel}`, 14, y);
  doc.text(`Émis le ${new Date().toLocaleDateString("fr-FR")}`, 196, y, { align: "right" });
  y += 8;

  // KPIs
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Indicateurs clés", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Indicateur", "Valeur"]],
    headStyles: { fillColor: [30, 41, 59] },
    body: [
      ["Chiffre d'affaires facturé", fmt(data.totalCA)],
      ["Total encaissé", fmt(data.totalEncaisse)],
      ["Encours impayé", fmt(data.totalImpaye)],
      ["Taux d'encaissement", `${data.collectionRate}%`],
      ["DSO moyen (Days Sales Outstanding)", `${data.dso} jours`],
    ],
    styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Mensuel
  if (data.monthly.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Évolution mensuelle (CA / Encaissé)", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y + 2,
      theme: "striped",
      head: [["Mois", "CA facturé", "Encaissé", "Taux"]],
      headStyles: { fillColor: [30, 41, 59] },
      body: data.monthly.map((m) => [
        m.label,
        fmt(m.ca),
        fmt(m.encaisse),
        m.ca > 0 ? `${Math.round((m.encaisse / m.ca) * 100)}%` : "—",
      ]),
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Top clients
  if (data.topClients.length) {
    if (y > 230) { doc.addPage(); y = 18; }
    doc.setFont("helvetica", "bold");
    doc.text("Top clients par chiffre d'affaires", 14, y);
    autoTable(doc, {
      startY: y + 2,
      theme: "striped",
      head: [["Client", "Factures", "Total"]],
      headStyles: { fillColor: [30, 41, 59] },
      body: data.topClients.map((c) => [c.name, c.count, fmt(c.total)]),
      styles: { fontSize: 9 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Cash forecast
  if (data.cashForecast.length) {
    if (y > 230) { doc.addPage(); y = 18; }
    doc.setFont("helvetica", "bold");
    doc.text("Trésorerie prévisionnelle (encaissements attendus)", 14, y);
    autoTable(doc, {
      startY: y + 2,
      theme: "grid",
      head: [["Période", "Montant attendu"]],
      headStyles: { fillColor: [16, 185, 129] },
      body: data.cashForecast.map((c) => [c.label, fmt(c.expected)]),
      styles: { fontSize: 9 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`GrowHub Accelerator — Rapport CRM — Page ${i}/${pageCount}`, 105, 290, { align: "center" });
  }

  doc.save(`rapport-crm-${new Date().toISOString().split("T")[0]}.pdf`);
}
