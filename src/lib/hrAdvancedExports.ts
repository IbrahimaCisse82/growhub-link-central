// Exports RH avancés : virement bancaire formel, livre de paie annuel, registre du personnel PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { OrgSettings } from "@/hooks/useOrgSettings";
import type { PayslipSnapshot } from "@/hooks/useHrDeclarations";
import type { HrEmployee } from "@/lib/payroll";
import { MOIS } from "@/lib/payroll";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
    .format(Math.round(n || 0))
    .replace(/\u202f/g, " ");

// ───────── Virement bancaire (CSV multi-banques + PDF ordre de virement) ─────────

export interface BankPayrollRow {
  matricule: string;
  beneficiaire: string;
  banque: string;
  rib: string;
  montant: number;
  motif: string;
}

export function buildBankRowsFromPayslips(
  payslips: PayslipSnapshot[],
  mois: number,
  annee: number,
  employeeIndex: Map<string, HrEmployee>,
): BankPayrollRow[] {
  return payslips.map((p) => {
    const emp = employeeIndex.get(p.employee_id) ?? (p.employee_snapshot as Partial<HrEmployee>) ?? {};
    return {
      matricule: emp.matricule ?? "—",
      beneficiaire: `${emp.prenom ?? ""} ${emp.nom ?? ""}`.trim() || "—",
      banque: ((emp as { banque?: string }).banque ?? "").toString(),
      rib: ((emp as { rib?: string; iban?: string }).rib ?? (emp as { iban?: string }).iban ?? "").toString(),
      montant: Math.round(p.net_total ?? p.calculation_snapshot?.net ?? 0),
      motif: `Salaire ${MOIS[mois]} ${annee}`,
    };
  });
}

export function exportBankCsvFormal(rows: BankPayrollRow[], mois: number, annee: number) {
  if (rows.length === 0) throw new Error("Aucune donnée à exporter");
  const sep = ";";
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""').replace(/[\r\n]/g, " ")}"`;
  const header = ["Matricule", "Bénéficiaire", "Banque", "RIB / IBAN", "Montant XOF", "Motif"]
    .map(escape)
    .join(sep);
  const lines = rows.map((r) =>
    [r.matricule, r.beneficiaire, r.banque, r.rib, r.montant, r.motif].map(escape).join(sep),
  );
  const total = rows.reduce((s, r) => s + r.montant, 0);
  const totalLine = [`"TOTAL"`, `""`, `""`, `""`, `"${total}"`, `""`].join(sep);
  const csv = [header, ...lines, totalLine].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `virement_salaires_${MOIS[mois]}_${annee}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function loadImg(url?: string | null) {
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

export async function exportBankOrderPdf(
  rows: BankPayrollRow[],
  mois: number,
  annee: number,
  org: OrgSettings | null,
) {
  if (rows.length === 0) throw new Error("Aucune donnée à exporter");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const navy: [number, number, number] = [13, 31, 46];
  const accent: [number, number, number] = [37, 99, 235];
  const total = rows.reduce((s, r) => s + r.montant, 0);
  const periodLabel = `${MOIS[mois]} ${annee}`;
  const ref = `OV-${annee}-${String(mois + 1).padStart(2, "0")}`;

  const logo = await loadImg(org?.logo_url);
  if (logo) {
    const h = 18;
    doc.addImage(logo.dataUrl, "PNG", 14, 10, h * (logo.w / logo.h), h);
  }
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("ORDRE DE VIREMENT MULTIPLE", 196, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Salaires – ${periodLabel}`, 196, 22, { align: "right" });
  doc.text(`Réf. ${ref}`, 196, 28, { align: "right" });
  doc.text(`Émis le ${new Date().toLocaleDateString("fr-FR")}`, 196, 33, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(org?.company_name || "ENTREPRISE", 14, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  [org?.address, org?.city, org?.phone, org?.ninea ? `NINEA : ${org.ninea}` : null]
    .filter(Boolean)
    .forEach((line, i) => doc.text(line as string, 14, 46 + i * 5));

  // Bloc bancaire émetteur
  if (org?.bank_details) {
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text("Compte à débiter :", 130, 46);
    const bankLines = org.bank_details.split(/\r?\n/).slice(0, 4);
    bankLines.forEach((l, i) => doc.text(l, 130, 51 + i * 4));
  }

  autoTable(doc, {
    startY: 72,
    head: [["#", "Matricule", "Bénéficiaire", "Banque", "RIB / IBAN", "Montant (XOF)"]],
    body: rows.map((r, i) => [
      String(i + 1),
      r.matricule,
      r.beneficiaire,
      r.banque || "—",
      r.rib || "—",
      fmt(r.montant),
    ]),
    foot: [["", "", "", "", "TOTAL", fmt(total)]],
    headStyles: { fillColor: navy, textColor: 255, fontStyle: "bold", fontSize: 9 },
    footStyles: { fillColor: accent, textColor: 255, fontStyle: "bold", fontSize: 10 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 0: { halign: "center", cellWidth: 10 }, 5: { halign: "right" } },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      const page = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Page ${page}`, 196, 290, { align: "right" });
      if (org?.pdf_footer) doc.text(org.pdf_footer, 14, 290);
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  if (finalY < 250) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...navy);
    doc.text(
      `Veuillez exécuter ce virement multiple pour un montant total de ${fmt(total)} FCFA en faveur des bénéficiaires listés ci-dessus.`,
      14,
      finalY,
      { maxWidth: 180 },
    );
    doc.text(`Fait à ${org?.city || "Dakar"}, le ${new Date().toLocaleDateString("fr-FR")}`, 130, finalY + 14);
    doc.text(org?.signatory_role || "Le Directeur", 130, finalY + 22);
    doc.setFont("helvetica", "bold");
    doc.text(org?.signatory_name || "—", 130, finalY + 34);
  }

  doc.save(`${ref}.pdf`);
}

// ───────── Livre de paie annuel ─────────

export function exportLivreDePaieAnnuelXlsx(
  payslips: PayslipSnapshot[],
  annee: number,
  employeeIndex: Map<string, HrEmployee>,
) {
  if (payslips.length === 0) throw new Error("Aucun bulletin clôturé pour cette année");

  // Organiser par employé > mois
  const byEmployee = new Map<string, PayslipSnapshot[]>();
  for (const p of payslips) {
    const list = byEmployee.get(p.employee_id) ?? [];
    list.push(p);
    byEmployee.set(p.employee_id, list);
  }

  // Feuille 1 — Synthèse annuelle (1 ligne par employé)
  const synthese = Array.from(byEmployee.entries()).map(([empId, slips]) => {
    const emp = employeeIndex.get(empId) ?? (slips[0]?.employee_snapshot as Partial<HrEmployee>) ?? {};
    const sum = (k: keyof PayslipSnapshot["calculation_snapshot"]) =>
      slips.reduce((s, p) => s + Number(p.calculation_snapshot?.[k] ?? 0), 0);
    const brut = slips.reduce((s, p) => s + Number(p.gross_total ?? 0), 0);
    const net = slips.reduce((s, p) => s + Number(p.net_total ?? 0), 0);
    const charges = slips.reduce((s, p) => s + Number(p.employer_charges ?? 0), 0);
    return {
      matricule: emp.matricule ?? "—",
      nom: `${emp.prenom ?? ""} ${emp.nom ?? ""}`.trim(),
      fonction: emp.fonction ?? "",
      mois_payes: slips.length,
      total_brut: brut,
      total_ir: sum("ir"),
      total_trimf: sum("trimf"),
      total_ipres_sal: sum("ipresRG_s") + sum("ipresRC_s"),
      total_ipres_pat: sum("ipresRG_p") + sum("ipresRC_p"),
      total_css: sum("css_af") + sum("css_at"),
      total_cfce: sum("cfce"),
      total_net: net,
      total_charges_pat: charges,
      masse_salariale: brut + charges,
    };
  });

  const wb = XLSX.utils.book_new();
  const wsSynthese = XLSX.utils.json_to_sheet(synthese);
  wsSynthese["!cols"] = [
    { wch: 12 }, { wch: 28 }, { wch: 22 }, { wch: 11 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    { wch: 16 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSynthese, `Synthèse ${annee}`);

  // Feuille 2 — Détail mois par mois
  const detailHead = [
    "Matricule", "Nom", "Mois", "Brut", "IR", "TRIMF",
    "IPRES sal.", "IPRES pat.", "CSS", "CFCE", "Net", "Charges pat.",
  ];
  const detailRows: (string | number)[][] = [];
  for (const p of payslips.sort((a, b) => a.mois - b.mois)) {
    const emp = employeeIndex.get(p.employee_id) ?? (p.employee_snapshot as Partial<HrEmployee>) ?? {};
    const c = p.calculation_snapshot;
    detailRows.push([
      emp.matricule ?? "—",
      `${emp.prenom ?? ""} ${emp.nom ?? ""}`.trim(),
      MOIS[p.mois],
      Math.round(p.gross_total ?? 0),
      Math.round(c?.ir ?? 0),
      Math.round(c?.trimf ?? 0),
      Math.round((c?.ipresRG_s ?? 0) + (c?.ipresRC_s ?? 0)),
      Math.round((c?.ipresRG_p ?? 0) + (c?.ipresRC_p ?? 0)),
      Math.round((c?.css_af ?? 0) + (c?.css_at ?? 0)),
      Math.round(c?.cfce ?? 0),
      Math.round(p.net_total ?? 0),
      Math.round(p.employer_charges ?? 0),
    ]);
  }
  const wsDetail = XLSX.utils.aoa_to_sheet([detailHead, ...detailRows]);
  wsDetail["!cols"] = detailHead.map((_, i) => ({ wch: i < 2 ? 24 : 13 }));
  XLSX.utils.book_append_sheet(wb, wsDetail, "Détail mensuel");

  // Feuille 3 — Totaux annuels
  const totalRow = synthese.reduce(
    (acc, r) => ({
      total_brut: acc.total_brut + r.total_brut,
      total_ir: acc.total_ir + r.total_ir,
      total_trimf: acc.total_trimf + r.total_trimf,
      total_ipres_sal: acc.total_ipres_sal + r.total_ipres_sal,
      total_ipres_pat: acc.total_ipres_pat + r.total_ipres_pat,
      total_css: acc.total_css + r.total_css,
      total_cfce: acc.total_cfce + r.total_cfce,
      total_net: acc.total_net + r.total_net,
      total_charges_pat: acc.total_charges_pat + r.total_charges_pat,
      masse: acc.masse + r.masse_salariale,
    }),
    {
      total_brut: 0, total_ir: 0, total_trimf: 0, total_ipres_sal: 0,
      total_ipres_pat: 0, total_css: 0, total_cfce: 0, total_net: 0,
      total_charges_pat: 0, masse: 0,
    },
  );
  const totalsSheet = [
    [`LIVRE DE PAIE ANNUEL ${annee}`],
    [`Effectif : ${synthese.length} employé(s)`],
    [`Bulletins traités : ${payslips.length}`],
    [],
    ["Indicateur", "Montant (FCFA)"],
    ["Masse salariale brute", totalRow.total_brut],
    ["Total IR", totalRow.total_ir],
    ["Total TRIMF", totalRow.total_trimf],
    ["Total IPRES (salarial)", totalRow.total_ipres_sal],
    ["Total IPRES (patronal)", totalRow.total_ipres_pat],
    ["Total CSS (patronal)", totalRow.total_css],
    ["Total CFCE", totalRow.total_cfce],
    ["Total Charges patronales", totalRow.total_charges_pat],
    ["Total Net versé", totalRow.total_net],
    ["MASSE SALARIALE TOTALE", totalRow.masse],
  ];
  const wsTotals = XLSX.utils.aoa_to_sheet(totalsSheet);
  wsTotals["!cols"] = [{ wch: 36 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsTotals, "Totaux annuels");

  XLSX.writeFile(wb, `livre_de_paie_${annee}.xlsx`);
}

// ───────── Registre du personnel (PDF officiel) ─────────

export async function exportRegistrePersonnelPdf(employees: HrEmployee[], org: OrgSettings | null) {
  if (employees.length === 0) throw new Error("Aucun employé à exporter");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const navy: [number, number, number] = [13, 31, 46];

  const logo = await loadImg(org?.logo_url);
  if (logo) {
    const h = 16;
    doc.addImage(logo.dataUrl, "PNG", 14, 8, h * (logo.w / logo.h), h);
  }
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("REGISTRE DU PERSONNEL", 283, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Document légal obligatoire (Code du Travail – Sénégal)", 283, 20, { align: "right" });
  doc.text(`Édité le ${new Date().toLocaleDateString("fr-FR")} – ${employees.length} employé(s)`, 283, 25, {
    align: "right",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(org?.company_name || "ENTREPRISE", 14, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  [org?.address, org?.ninea ? `NINEA : ${org.ninea}` : null, org?.rccm ? `RCCM : ${org.rccm}` : null]
    .filter(Boolean)
    .forEach((line, i) => doc.text(line as string, 14, 37 + i * 4));

  autoTable(doc, {
    startY: 52,
    head: [
      [
        "N°",
        "Matricule",
        "Nom & Prénom",
        "Sexe",
        "Date naiss.",
        "Nationalité",
        "Fonction",
        "Statut",
        "Contrat",
        "Date entrée",
        "Catégorie",
        "Salaire base",
      ],
    ],
    body: employees.map((e, i) => [
      String(i + 1),
      e.matricule,
      `${e.prenom} ${e.nom}`.trim(),
      e.sexe,
      e.date_naissance || "—",
      e.nationalite || "—",
      e.fonction || "—",
      e.statut || "—",
      e.contrat,
      e.date_entree || "—",
      e.categorie || "—",
      fmt(e.salaire_base ?? 0),
    ]),
    headStyles: { fillColor: navy, textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: { 0: { halign: "center", cellWidth: 10 }, 11: { halign: "right" } },
    margin: { left: 10, right: 10 },
    didDrawPage: () => {
      const page = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Page ${page}`, 283, 200, { align: "right" });
      if (org?.pdf_footer) doc.text(org.pdf_footer, 14, 200);
    },
  });

  doc.save(`registre_personnel_${new Date().toISOString().slice(0, 10)}.pdf`);
}
