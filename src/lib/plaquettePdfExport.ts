import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import arabicFontUrl from "@/assets/fonts/NotoSansArabic-Regular.ttf?url";
import latinFontUrl from "@/assets/fonts/DejaVuSans.ttf?url";
import type { Locale } from "@/lib/i18n";

export interface PlaquettePdfSection {
  code: string;
  title: string;
  rows: Array<{ label: string; value: string }>;
}

const labels: Record<Locale, { title: string; generated: string; empty: string; item: string; value: string }> = {
  fr: { title: "Plaquette SYSCOHADA révisée", generated: "Générée le", empty: "Aucune donnée pour l'exercice", item: "Rubrique", value: "Valeur" },
  en: { title: "Revised SYSCOHADA financial statements", generated: "Generated on", empty: "No data for the period", item: "Item", value: "Value" },
  ar: { title: "القوائم المالية وفق نظام سيسكوا المحاسبي المنقح", generated: "تم الإنشاء في", empty: "لا توجد بيانات للفترة", item: "البند", value: "القيمة" },
};

async function fontAsBase64(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Impossible de charger la police PDF");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function installUnicodeFonts(pdf: jsPDF) {
  const [arabic, latin] = await Promise.all([fontAsBase64(arabicFontUrl), fontAsBase64(latinFontUrl)]);
  pdf.addFileToVFS("NotoSansArabic.ttf", arabic);
  pdf.addFont("NotoSansArabic.ttf", "NotoSansArabic", "normal");
  pdf.addFileToVFS("DejaVuSans.ttf", latin);
  pdf.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
}

export async function exportPlaquettePdf(
  sections: PlaquettePdfSection[],
  organisation: string,
  locale: Locale,
) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await installUnicodeFonts(pdf);
  const copy = labels[locale];
  const rtl = locale === "ar";
  const font = rtl ? "NotoSansArabic" : "DejaVuSans";
  pdf.setFont(font, "normal");
  const margin = 14;
  const pageWidth = 210;

  pdf.setFontSize(20);
  pdf.text(copy.title, rtl ? pageWidth - margin : margin, 35, { align: rtl ? "right" : "left" });
  pdf.setFontSize(13);
  pdf.text(organisation, rtl ? pageWidth - margin : margin, 48, { align: rtl ? "right" : "left" });
  pdf.setFontSize(9);
  pdf.text(`${copy.generated} ${new Date().toLocaleDateString(locale === "ar" ? "ar" : locale)}`, rtl ? pageWidth - margin : margin, 58, { align: rtl ? "right" : "left" });

  sections.forEach((section) => {
    pdf.addPage();
    pdf.setFont(font, "normal");
    pdf.setFontSize(14);
    pdf.text(`${section.code} — ${section.title}`, rtl ? pageWidth - margin : margin, 18, { align: rtl ? "right" : "left" });
    const body = section.rows.length > 0
      ? section.rows.map((row) => rtl ? [row.value, row.label] : [row.label, row.value])
      : [[copy.empty, ""]];
    autoTable(pdf, {
      startY: 25,
      head: [rtl ? [copy.value, copy.item] : [copy.item, copy.value]],
      body,
      theme: "grid",
      styles: { font, fontSize: 8, halign: rtl ? "right" : "left", cellPadding: 2.5 },
      headStyles: { fillColor: [20, 83, 74], textColor: 255, fontStyle: "normal" },
      columnStyles: rtl ? { 0: { cellWidth: 55 }, 1: { cellWidth: 125 } } : { 0: { cellWidth: 125 }, 1: { cellWidth: 55 } },
      margin: { left: margin, right: margin },
    });
  });

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFontSize(8);
    pdf.text(`${page} / ${pages}`, pageWidth / 2, 289, { align: "center" });
  }
  pdf.save(`plaquette-syscohada-${new Date().toISOString().slice(0, 10)}-${locale}.pdf`);
}