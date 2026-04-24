import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { OrgSettings } from "@/hooks/useOrgSettings";
import type { HrEmployee, PayrollResult } from "@/lib/payroll";
import { MOIS } from "@/lib/payroll";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n || 0)).replace(/\u202f/g, " ");

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

export async function exportPayrollPayslipPdf(emp: HrEmployee, paie: PayrollResult, mois: number, annee: number, org: OrgSettings | null) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const navy: [number, number, number] = [13, 31, 46];
  const accent: [number, number, number] = [37, 99, 235];
  const company = org?.company_name || "GROW HUB";
  const periode = `${MOIS[mois]} ${annee}`;
  const logo = await loadImageDataUrl(org?.logo_url);

  if (logo) {
    const h = 18;
    doc.addImage(logo.dataUrl, "PNG", 14, 10, h * (logo.w / logo.h), h);
  }
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("BULLETIN DE PAIE", 196, 16, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Période : ${periode}`, 196, 23, { align: "right" });
  doc.text(`Réf. BP-${annee}-${String(mois + 1).padStart(2, "0")}-${emp.matricule}`, 196, 29, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(company, 14, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const orgLines = [org?.address, org?.city, org?.phone, org?.email, org?.ninea ? `NINEA : ${org.ninea}` : null, org?.rccm ? `RCCM : ${org.rccm}` : null].filter(Boolean) as string[];
  orgLines.slice(0, 4).forEach((line, i) => doc.text(line, 14, 46 + i * 5));

  autoTable(doc, {
    startY: 72,
    body: [
      ["Matricule", emp.matricule, "Employé", `${emp.prenom} ${emp.nom}`],
      ["Fonction", emp.fonction || "—", "Contrat", emp.contrat || "—"],
      ["Convention", emp.convention || "—", "Catégorie", emp.categorie || "—"],
      ["Date d’entrée", emp.date_entree || "—", "Ancienneté", `${paie.anc} an${paie.anc > 1 ? "s" : ""}`],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", fillColor: [245, 247, 250] }, 2: { fontStyle: "bold", fillColor: [245, 247, 250] } },
    margin: { left: 14, right: 14 },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Élément", "Base / taux", "Montant"]],
    body: [
      ["Salaire de base", "Mensuel", `${fmt(paie.salaireBase)} FCFA`],
      ...(paie.sursalaire > 0 ? [["Sursalaire", "Mensuel", `${fmt(paie.sursalaire)} FCFA`]] : []),
      ...(paie.primeAnc > 0 ? [["Prime d’ancienneté", `${Math.round(paie.ancRate * 100)}%`, `${fmt(paie.primeAnc)} FCFA`]] : []),
      ...(paie.totalHS > 0 ? [["Heures supplémentaires", "Variable", `${fmt(paie.totalHS)} FCFA`]] : []),
      ...(paie.retAbsence > 0 ? [["Retenue absences", "Variable", `-${fmt(paie.retAbsence)} FCFA`]] : []),
      ["Salaire brut", "", `${fmt(paie.brut)} FCFA`],
      ["Total retenues", "IR, TRIMF, IPRES, IPM", `-${fmt(paie.totalRet)} FCFA`],
      ["Indemnités", "Transport, paniers, divers", `${fmt(paie.transport + paie.primePanier + paie.indKilometrique)} FCFA`],
      ...(paie.totalAvances > 0 ? [["Avances & retenues", "Variable", `-${fmt(paie.totalAvances)} FCFA`]] : []),
    ],
    theme: "striped",
    headStyles: { fillColor: navy, textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: { 2: { halign: "right", fontStyle: "bold" } },
    margin: { left: 14, right: 14 },
  });

  const y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFillColor(235, 245, 255);
  doc.roundedRect(14, y, 182, 16, 2, 2, "F");
  doc.setTextColor(...accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("NET À PAYER", 18, y + 10);
  doc.text(`${fmt(paie.net)} FCFA`, 190, y + 10, { align: "right" });

  doc.setTextColor(...navy);
  doc.setFontSize(9);
  doc.text(`Charges patronales : ${fmt(paie.chargesPat)} FCFA`, 14, y + 26);
  doc.text(`Masse salariale : ${fmt(paie.masse)} FCFA`, 14, y + 32);

  const sigY = 250;
  doc.setFont("helvetica", "bold");
  doc.text(org?.signatory_name || "La Direction", 196, sigY, { align: "right" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(org?.signatory_role || "Signataire autorisé", 196, sigY + 5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  const footer = org?.pdf_footer || "Document confidentiel généré par Grow Hub Management System";
  doc.text(footer, 105, 286, { align: "center", maxWidth: 180 });

  doc.save(`BP-${annee}-${String(mois + 1).padStart(2, "0")}-${emp.matricule}.pdf`);
}