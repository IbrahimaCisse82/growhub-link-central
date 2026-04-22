import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface QuotePdfData {
  quote_number: string;
  issue_date: string;
  valid_until?: string | null;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: string;
  reference?: string | null;
  notes?: string | null;
  payment_terms?: string | null;
  contrepartie?: { name: string; address?: string | null; ninea?: string | null; email?: string | null; phone?: string | null } | null;
  lines?: Array<{ description: string; quantity: number; unit_price: number; tax_rate?: number | null; line_total: number }>;
}

const fmt = (n: number, cur: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);

export function exportQuotePdf(q: QuotePdfData, organizationName = "Grow Hub Management System") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PRIMARY: [number, number, number] = [37, 99, 235];
  const NAVY: [number, number, number] = [13, 31, 46];

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("DEVIS", 14, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(organizationName, 14, 24);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(q.quote_number, 196, 16, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date : ${new Date(q.issue_date).toLocaleDateString("fr-FR")}`, 196, 23, { align: "right" });
  if (q.valid_until) doc.text(`Valable jusqu'au : ${new Date(q.valid_until).toLocaleDateString("fr-FR")}`, 196, 28, { align: "right" });

  doc.setTextColor(...NAVY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DESTINATAIRE", 14, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 50;
  if (q.contrepartie) {
    doc.setFont("helvetica", "bold");
    doc.text(q.contrepartie.name, 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    if (q.contrepartie.address) { doc.text(q.contrepartie.address, 14, y); y += 5; }
    if (q.contrepartie.email) { doc.text(q.contrepartie.email, 14, y); y += 5; }
    if (q.contrepartie.phone) { doc.text(q.contrepartie.phone, 14, y); y += 5; }
    if (q.contrepartie.ninea) { doc.text(`NINEA : ${q.contrepartie.ninea}`, 14, y); y += 5; }
  }

  if (q.reference) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Référence : ${q.reference}`, 196, 50, { align: "right" });
  }

  const tableY = Math.max(y + 6, 80);
  autoTable(doc, {
    startY: tableY,
    head: [["Description", "Qté", "PU", "TVA", "Total"]],
    body: (q.lines ?? []).map((l) => [
      l.description,
      String(l.quantity),
      fmt(Number(l.unit_price), q.currency),
      `${l.tax_rate ?? 0}%`,
      fmt(Number(l.line_total), q.currency),
    ]),
    theme: "striped",
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const xLabel = 130, xVal = 196;
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "normal");
  doc.text("Sous-total HT", xLabel, finalY);
  doc.text(fmt(q.subtotal, q.currency), xVal, finalY, { align: "right" });
  doc.text("TVA totale", xLabel, finalY + 6);
  doc.text(fmt(q.tax_amount, q.currency), xVal, finalY + 6, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(xLabel, finalY + 9, xVal, finalY + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text("TOTAL TTC", xLabel, finalY + 16);
  doc.text(fmt(q.total, q.currency), xVal, finalY + 16, { align: "right" });

  if (q.payment_terms || q.notes) {
    const footY = finalY + 30;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    if (q.payment_terms) {
      doc.setFont("helvetica", "bold");
      doc.text("Conditions de paiement :", 14, footY);
      doc.setFont("helvetica", "normal");
      doc.text(q.payment_terms, 14, footY + 4, { maxWidth: 180 });
    }
    if (q.notes) {
      doc.setFont("helvetica", "bold");
      doc.text("Notes :", 14, footY + 14);
      doc.setFont("helvetica", "normal");
      doc.text(q.notes, 14, footY + 18, { maxWidth: 180 });
    }
  }

  doc.save(`${q.quote_number}.pdf`);
}
