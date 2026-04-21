import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoicePdfData {
  invoice_number: string;
  direction: "emise" | "recue";
  issue_date: string;
  due_date?: string | null;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  status: string;
  reference?: string | null;
  notes?: string | null;
  payment_terms?: string | null;
  contrepartie?: { name: string; address?: string | null; tax_id?: string | null; ninea?: string | null; email?: string | null; phone?: string | null } | null;
  lines?: Array<{ description: string; quantity: number; unit_price: number; line_total: number }>;
}

const fmt = (n: number, cur: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);

export function exportInvoicePdf(inv: InvoicePdfData, organizationName = "Grow Hub Management System") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PRIMARY: [number, number, number] = [0, 162, 131];
  const NAVY: [number, number, number] = [13, 31, 46];

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(inv.direction === "emise" ? "FACTURE" : "FACTURE FOURNISSEUR", 14, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(organizationName, 14, 24);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(inv.invoice_number, 196, 16, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Date : ${new Date(inv.issue_date).toLocaleDateString("fr-FR")}`, 196, 23, { align: "right" });
  if (inv.due_date) doc.text(`Échéance : ${new Date(inv.due_date).toLocaleDateString("fr-FR")}`, 196, 28, { align: "right" });

  // Contrepartie block
  doc.setTextColor(...NAVY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(inv.direction === "emise" ? "FACTURÉ À" : "FOURNISSEUR", 14, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 50;
  if (inv.contrepartie) {
    doc.setFont("helvetica", "bold");
    doc.text(inv.contrepartie.name, 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    if (inv.contrepartie.address) { doc.text(inv.contrepartie.address, 14, y); y += 5; }
    if (inv.contrepartie.email) { doc.text(inv.contrepartie.email, 14, y); y += 5; }
    if (inv.contrepartie.phone) { doc.text(inv.contrepartie.phone, 14, y); y += 5; }
    if (inv.contrepartie.ninea) { doc.text(`NINEA : ${inv.contrepartie.ninea}`, 14, y); y += 5; }
  }

  // Reference
  if (inv.reference) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Référence : ${inv.reference}`, 196, 50, { align: "right" });
  }

  // Lines table
  const tableY = Math.max(y + 6, 80);
  autoTable(doc, {
    startY: tableY,
    head: [["Description", "Qté", "PU", "Total"]],
    body: (inv.lines ?? []).map((l) => [
      l.description,
      String(l.quantity),
      fmt(Number(l.unit_price), inv.currency),
      fmt(Number(l.line_total), inv.currency),
    ]),
    theme: "striped",
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const xLabel = 130, xVal = 196;
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "normal");
  doc.text("Sous-total", xLabel, finalY);
  doc.text(fmt(inv.subtotal, inv.currency), xVal, finalY, { align: "right" });
  doc.text(`TVA (${inv.tax_rate}%)`, xLabel, finalY + 6);
  doc.text(fmt(inv.tax_amount, inv.currency), xVal, finalY + 6, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(xLabel, finalY + 9, xVal, finalY + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text("TOTAL", xLabel, finalY + 16);
  doc.text(fmt(inv.total, inv.currency), xVal, finalY + 16, { align: "right" });

  if (Number(inv.amount_paid) > 0) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text(`Déjà payé : ${fmt(Number(inv.amount_paid), inv.currency)}`, xVal, finalY + 22, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(`Reste à payer : ${fmt(inv.total - Number(inv.amount_paid), inv.currency)}`, xVal, finalY + 28, { align: "right" });
  }

  // Footer
  if (inv.payment_terms || inv.notes) {
    const footY = finalY + 40;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    if (inv.payment_terms) {
      doc.setFont("helvetica", "bold");
      doc.text("Conditions de paiement :", 14, footY);
      doc.setFont("helvetica", "normal");
      doc.text(inv.payment_terms, 14, footY + 4, { maxWidth: 180 });
    }
    if (inv.notes) {
      doc.setFont("helvetica", "bold");
      doc.text("Notes :", 14, footY + 14);
      doc.setFont("helvetica", "normal");
      doc.text(inv.notes, 14, footY + 18, { maxWidth: 180 });
    }
  }

  // Status badge
  doc.setFontSize(8);
  const statusLabel = inv.status === "payee" ? "PAYÉE" : inv.status === "en_retard" ? "EN RETARD" : inv.status.toUpperCase();
  doc.setFillColor(inv.status === "payee" ? 220 : 254, inv.status === "payee" ? 252 : 226, inv.status === "payee" ? 231 : 226);
  doc.setTextColor(inv.status === "payee" ? 22 : 153, inv.status === "payee" ? 101 : 27, inv.status === "payee" ? 52 : 27);
  doc.roundedRect(160, 36, 36, 7, 2, 2, "F");
  doc.text(statusLabel, 178, 41, { align: "center" });

  doc.save(`${inv.invoice_number}.pdf`);
}
