import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { OrgSettings } from "@/hooks/useOrgSettings";

export type DocKind = "DEVIS" | "FACTURE" | "AVOIR" | "BON DE COMMANDE";

export interface PdfPartyInfo {
  name: string;
  contact_person?: string | null;
  address?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  ninea?: string | null;
}

export interface PdfLine {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number | null;
  line_total: number;
}

export interface GrowhubPdfDoc {
  kind: DocKind;
  number: string;
  issue_date: string;
  due_date?: string | null;
  reference?: string | null;
  currency: string;
  party: PdfPartyInfo;
  lines: PdfLine[];
  subtotal: number;
  tax_amount: number;
  total: number;
  advance_amount?: number | null; // montant acompte
  advance_label?: string | null; // ex "AVANCE DE 40%"
  notes?: string | null;
  payment_terms?: string | null;
}

const fmtFCFA = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)).replace(/\u202f/g, " ");

const fmtMoney = (n: number, cur: string) => {
  if (cur === "XOF" || cur === "FCFA") return fmtFCFA(n);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 0 }).format(n);
};

const hex2rgb = (hex: string | null | undefined, fallback: [number, number, number]): [number, number, number] => {
  if (!hex) return fallback;
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return fallback;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

async function loadImageDataUrl(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

const DOC_LABELS: Record<DocKind, string> = {
  DEVIS: "DEVIS N°",
  FACTURE: "FACTURE N°",
  AVOIR: "AVOIR N°",
  "BON DE COMMANDE": "BON DE COMMANDE N°",
};

export async function exportGrowhubPdf(doc: GrowhubPdfDoc, org: OrgSettings | null) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const NAVY = hex2rgb(org?.brand_primary_hex, [13, 31, 46]);
  const ACCENT = hex2rgb(org?.brand_accent_hex, [37, 99, 235]);
  const PAGE_W = 210;
  const PAGE_H = 297;
  const M = 14;

  // ===== HEADER =====
  // Logo (top-left)
  let logoW = 0;
  if (org?.logo_url) {
    const img = await loadImageDataUrl(org.logo_url);
    if (img) {
      const ratio = img.w / img.h;
      const targetH = 22;
      logoW = targetH * ratio;
      try {
        pdf.addImage(img.dataUrl, "PNG", M, 10, logoW, targetH);
      } catch {
        // Image illisible : le PDF est produit sans elle.
      }
    }
  }

  // Date and city top-right
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  const dateStr = new Date(doc.issue_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const cityStr = org?.signatory_city || org?.city || "Dakar";
  pdf.text(`${cityStr}, Le ${dateStr}`, PAGE_W - M, 16, { align: "right" });

  // ===== DESTINATAIRE block =====
  let y = 42;
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(doc.party.name.toUpperCase(), M, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  if (doc.party.contact_person) { pdf.text(doc.party.contact_person, M, y); y += 5; }
  if (doc.party.address) { pdf.text(doc.party.address, M, y); y += 5; }
  if (doc.party.city) { pdf.text(doc.party.city, M, y); y += 5; }
  if (doc.party.phone) { pdf.text(`Tel: ${doc.party.phone}`, M, y); y += 5; }

  // ===== TITLE: DOC N° =====
  y = Math.max(y + 6, 78);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...NAVY);
  pdf.text(`${DOC_LABELS[doc.kind]} ${doc.number}`, PAGE_W / 2, y, { align: "center" });
  y += 2;
  pdf.setDrawColor(...NAVY);
  pdf.setLineWidth(0.5);
  pdf.line(M, y, PAGE_W - M, y);
  y += 4;

  // Reference / due date sous le titre
  if (doc.reference || doc.due_date) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    const meta: string[] = [];
    if (doc.reference) meta.push(`Réf: ${doc.reference}`);
    if (doc.due_date) meta.push(`Échéance: ${new Date(doc.due_date).toLocaleDateString("fr-FR")}`);
    pdf.text(meta.join("   •   "), PAGE_W - M, y + 2, { align: "right" });
    y += 4;
  }

  // ===== TABLE LIGNES (style GROWHUB : DESIGNATION | QTE | PRIX UNIT | PRIX HT | TVA | PRIX TTC) =====
  const body = doc.lines.map((l) => {
    const ht = l.quantity * l.unit_price;
    const tva = (ht * (l.tax_rate ?? 0)) / 100;
    const ttc = ht + tva;
    return [
      l.description,
      String(l.quantity),
      fmtMoney(l.unit_price, doc.currency),
      fmtMoney(ht, doc.currency),
      fmtMoney(tva, doc.currency),
      fmtMoney(ttc, doc.currency),
    ];
  });

  autoTable(pdf, {
    startY: y + 4,
    head: [["DESIGNATION", "QTE", "PRIX UNIT", "PRIX HT", `TVA ${doc.lines[0]?.tax_rate ?? 18}%`, "PRIX TTC"]],
    body,
    theme: "grid",
    headStyles: {
      fillColor: NAVY,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      lineWidth: 0.2,
    },
    bodyStyles: { fontSize: 9, textColor: [30, 30, 30], lineWidth: 0.15 },
    columnStyles: {
      0: { cellWidth: 75 },
      1: { halign: "center", cellWidth: 15 },
      2: { halign: "right", cellWidth: 22 },
      3: { halign: "right", cellWidth: 24 },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "right", cellWidth: 24 },
    },
    margin: { left: M, right: M },
    foot: [[
      { content: "TOTAL TTC", colSpan: 5, styles: { halign: "right", fontStyle: "bold", fillColor: [240, 240, 240], textColor: NAVY } },
      { content: fmtMoney(doc.total, doc.currency), styles: { halign: "right", fontStyle: "bold", fillColor: [240, 240, 240], textColor: NAVY } },
    ]],
  });

  let afterTableY = (pdf as any).lastAutoTable.finalY;

  // Bloc avance optionnel
  if (doc.advance_amount && doc.advance_amount > 0) {
    autoTable(pdf, {
      startY: afterTableY,
      body: [[
        { content: doc.advance_label || "ACOMPTE", styles: { halign: "right", fontStyle: "bold", fillColor: ACCENT, textColor: 255 } },
        { content: fmtMoney(doc.advance_amount, doc.currency), styles: { halign: "right", fontStyle: "bold", fillColor: ACCENT, textColor: 255, cellWidth: 24 } },
      ]],
      theme: "grid",
      margin: { left: M, right: M },
      tableWidth: "wrap",
      styles: { fontSize: 10 },
    });
    afterTableY = (pdf as any).lastAutoTable.finalY;
  }

  // ===== Notes / Conditions =====
  let noteY = afterTableY + 8;
  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(9);
  if (doc.notes) {
    pdf.setFont("helvetica", "italic");
    const split = pdf.splitTextToSize(doc.notes, PAGE_W - 2 * M);
    pdf.text(split, M, noteY);
    noteY += split.length * 4 + 2;
  }
  if (doc.payment_terms) {
    pdf.setFont("helvetica", "normal");
    pdf.text(`Conditions : ${doc.payment_terms}`, M, noteY);
    noteY += 5;
  }
  if (org?.bank_details) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const bank = pdf.splitTextToSize(`Coordonnées bancaires : ${org.bank_details}`, PAGE_W - 2 * M);
    pdf.text(bank, M, noteY);
    noteY += bank.length * 3.5 + 2;
  }

  // ===== Signature + cachet =====
  const sigY = Math.max(noteY + 8, PAGE_H - 60);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...NAVY);
  const signatory = org?.signatory_name || "La Direction";
  pdf.text(signatory, PAGE_W - M, sigY, { align: "right" });
  pdf.setDrawColor(...NAVY);
  pdf.line(PAGE_W - M - 50, sigY + 1, PAGE_W - M, sigY + 1);
  if (org?.signatory_role) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(org.signatory_role, PAGE_W - M, sigY + 5, { align: "right" });
  }

  if (org?.stamp_url) {
    const stamp = await loadImageDataUrl(org.stamp_url);
    if (stamp) {
      const ratio = stamp.w / stamp.h;
      const h = 30;
      const w = h * ratio;
      try {
        pdf.addImage(stamp.dataUrl, "PNG", PAGE_W - M - w, sigY + 6, w, h);
      } catch {
        // Image illisible : le PDF est produit sans elle.
      }
    }
  }

  // ===== FOOTER paramétrable =====
  const footerY = PAGE_H - 18;
  pdf.setDrawColor(...ACCENT);
  pdf.setLineWidth(0.4);
  pdf.line(M, footerY - 4, PAGE_W - M, footerY - 4);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(80, 80, 80);

  const lines: string[] = [];
  if (org?.pdf_footer) {
    lines.push(org.pdf_footer);
  } else {
    const addr = [org?.address, org?.postal_box, org?.city, org?.country].filter(Boolean).join(" • ");
    if (addr) lines.push(`Adresse : ${addr}`);
  }
  const contact = [
    org?.phone ? `Tel : ${org.phone}` : null,
    org?.email ? `Email : ${org.email}` : null,
    org?.website ? `Site : ${org.website}` : null,
  ].filter(Boolean).join("  |  ");
  if (contact) lines.push(contact);

  const ids = [
    org?.ninea ? `NINEA: ${org.ninea}` : null,
    org?.rccm ? `RCCM: ${org.rccm}` : null,
    org?.tax_id ? `NIF: ${org.tax_id}` : null,
  ].filter(Boolean).join("  |  ");
  if (ids) lines.push(ids);

  if (org?.legal_mentions) lines.push(org.legal_mentions);

  let fy = footerY;
  for (const ln of lines) {
    pdf.text(ln, PAGE_W / 2, fy, { align: "center" });
    fy += 3.2;
  }

  // Page X sur Y
  pdf.setFontSize(7);
  pdf.text("Page 1 sur 1", PAGE_W - M, PAGE_H - 5, { align: "right" });

  pdf.save(`${doc.kind.replace(/\s/g, "_")}_${doc.number}.pdf`);
}
