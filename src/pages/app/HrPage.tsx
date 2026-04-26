import { useEffect, useState, useMemo } from "react";
import SectionHeader from "@/components/shared/SectionHeader";
import GhButton from "@/components/shared/GhButton";
import GhCard from "@/components/shared/GhCard";
import StatCard from "@/components/shared/StatCard";
import { EMPTY_PAYROLL_VARIABLE, useHrEmployees, useHrPayrollHistory, useHrPayrollRuns, useHrPayrollSettings, useHrPayrollVariables, useMyHrEmployees, type HrPayrollVariable } from "@/hooks/useHrEmployees";
import { useAuth } from "@/hooks/useAuth";
import { useAssignableUsers } from "@/hooks/useAssignableUsers";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { calculerPaie, fmtXOF, DEFAULT_PAYROLL_PARAMS, MOIS, type HrEmployee, type PayrollParams, type PayrollResult } from "@/lib/payroll";
import { exportPayrollPayslipPdf } from "@/lib/payrollPdfExport";
import { exportLivreDePaieXlsx, exportBankCsv, exportRegistrePersonnelXlsx } from "@/lib/hrExports";
import {
  buildBankRowsFromPayslips,
  exportBankCsvFormal,
  exportBankOrderPdf,
  exportLivreDePaieAnnuelXlsx,
  exportRegistrePersonnelPdf,
} from "@/lib/hrAdvancedExports";
import { Plus, FileText, Users, DollarSign, TrendingUp, Trash2, Pencil, Eye, Download, Search, Settings, Building2, BookOpen, BarChart3, Printer, ShieldCheck, CalendarClock, Lock, Calculator, FileDown, AlertTriangle, CheckCircle2, History, CalendarDays, FileSignature, Receipt, BookText, Banknote } from "lucide-react";
import HrLeavesPanel from "@/components/hr/HrLeavesPanel";
import HrContractsPanel from "@/components/hr/HrContractsPanel";
import HrAgreementsPanel from "@/components/hr/HrAgreementsPanel";
import HrAuditPanel from "@/components/hr/HrAuditPanel";
import HrSelfServicePanel from "@/components/hr/HrSelfServicePanel";
import HrExpensesPanel from "@/components/hr/HrExpensesPanel";
import HrDeclarationsPanel from "@/components/hr/HrDeclarationsPanel";
import HrAdvancedDashboard from "@/components/hr/HrAdvancedDashboard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_EMP: Partial<HrEmployee> = {
  matricule: "", prenom: "", nom: "", sexe: "M", date_naissance: "", lieu_naissance: "",
  nationalite: "Sénégalaise", adresse: "", telephone: "", email: "", situation_famille: "Célibataire",
  femmes: 0, enfants: 0, fonction: "", convention: "COMMERCE", categorie: "", statut: "employés",
  contrat: "CDI", date_entree: "", salaire_base: 0, sursalaire: 0, heures_absence: 0,
  heures_abs_maladie: 0, taux_maladie: 0, nb_paniers: 0, hs_115: 0, hs_140: 0, hs_160: 0, hs_200: 0,
  avance_tabaski: 0, avance_caisse: 0, avance_financiere: 0, ret_cooperative: 0, frais_medicaux: 0,
  ind_kilometrique: 0, is_active: true,
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(210, 80%, 60%)", "hsl(40, 90%, 55%)"];
const STATUT_COLORS: Record<string, string> = { "employés": "hsl(210, 80%, 60%)", "agents de maîtrise": "hsl(40, 90%, 55%)", "cadres": "hsl(270, 70%, 65%)" };

const DEFAULT_CONVENTIONS = [
  {
    id: "CC001", nom: "Commerce", secteur: "Commerce général", dateSignature: "1982-01-01",
    description: "Convention collective nationale du commerce applicable au Sénégal.",
    categories: [
      { id: "c1", code: "1_er A", libelle: "1ère catégorie A", statut: "employés", salaireMinima: 70706 },
      { id: "c2", code: "1_er B", libelle: "1ère catégorie B", statut: "employés", salaireMinima: 74870 },
      { id: "c3", code: "2_ème", libelle: "2ème catégorie", statut: "employés", salaireMinima: 75361 },
      { id: "c4", code: "3_ème", libelle: "3ème catégorie", statut: "employés", salaireMinima: 77840 },
      { id: "c5", code: "4_ème", libelle: "4ème catégorie", statut: "employés", salaireMinima: 82272 },
      { id: "c6", code: "5_ème", libelle: "5ème catégorie", statut: "employés", salaireMinima: 89244 },
      { id: "c7", code: "6_ème", libelle: "6ème catégorie", statut: "employés", salaireMinima: 93790 },
      { id: "c8", code: "7_ème A", libelle: "7ème catégorie A", statut: "agents de maîtrise", salaireMinima: 105342 },
      { id: "c9", code: "7_ème B", libelle: "7ème catégorie B", statut: "agents de maîtrise", salaireMinima: 113984 },
      { id: "c10", code: "8_ème A", libelle: "8ème catégorie A", statut: "agents de maîtrise", salaireMinima: 115718 },
      { id: "c11", code: "8_ème B", libelle: "8ème catégorie B", statut: "agents de maîtrise", salaireMinima: 123484 },
      { id: "c12", code: "8_ème C", libelle: "8ème catégorie C", statut: "cadres", salaireMinima: 124254 },
      { id: "c13", code: "9_ème A", libelle: "9ème catégorie A", statut: "cadres", salaireMinima: 125543 },
      { id: "c14", code: "9_ème B", libelle: "9ème catégorie B", statut: "cadres", salaireMinima: 132498 },
      { id: "c15", code: "10_ème A", libelle: "10ème catégorie A", statut: "cadres", salaireMinima: 141024 },
      { id: "c16", code: "10_ème B", libelle: "10ème catégorie B", statut: "cadres", salaireMinima: 157097 },
      { id: "c17", code: "10_ème C", libelle: "10ème catégorie C", statut: "cadres", salaireMinima: 174049 },
      { id: "c18", code: "11_ème", libelle: "11ème catégorie", statut: "cadres", salaireMinima: 195119 },
    ]
  },
];
interface Entreprise {
  nom: string; adresse: string; telephone: string; email: string; ninea: string; rccm: string; logo_url?: string | null; pdf_footer?: string | null; signatory_name?: string | null; signatory_role?: string | null;
}

const DEFAULT_ENTREPRISE: Entreprise = {
  nom: "GROW HUB", adresse: "Dakar, Sénégal", telephone: "+221 77 000 00 00",
  email: "contact@growhub.sn", ninea: "", rccm: "",
};

// ═══════════════════════════════════════════════════════════════════════════
// Bulletin PDF Generator
// ═══════════════════════════════════════════════════════════════════════════

function genererBulletinHTML(emp: HrEmployee, p: PayrollResult, mois: number, annee: number, ent: Entreprise): string {
  const periode = `${MOIS[mois]} ${annee}`;
  const f = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
  const date_emission = new Date().toLocaleDateString("fr-FR");

  const row = (label: string, val: number, opts: any = {}) => {
    const { neg = false, bold = false, color = "#1f2937", bg = "transparent", indent = false } = opts;
    return `<tr style="background:${bg}">
      <td style="padding:5px 8px 5px ${indent ? '20px' : '8px'};font-size:11px;color:#374151;border-bottom:1px solid #e5e7eb;font-weight:${bold ? 700 : 400}">${label}</td>
      <td style="padding:5px 10px;text-align:right;font-size:11px;color:${color};border-bottom:1px solid #e5e7eb;font-weight:${bold ? 700 : 400}">${neg ? '– ' : ''}<b>${f(val)} FCFA</b></td>
    </tr>`;
  };

  const section = (title: string, bgColor: string, rows: string) => `
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      <thead><tr><th colspan="2" style="background:${bgColor};color:#fff;padding:6px 10px;text-align:left;font-size:9px;letter-spacing:1px;text-transform:uppercase">${title}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  const infoRows = [
    ["Matricule", emp.matricule], ["Fonction", emp.fonction || "—"],
    ["Nom & Prénom", `${emp.prenom} ${emp.nom}`], ["Catégorie", emp.categorie || "—"],
    ["Convention", emp.convention || "—"], ["Contrat", emp.contrat],
    ["Date d'entrée", emp.date_entree || "—"], ["Ancienneté", `${p.anc} an${p.anc > 1 ? "s" : ""}`],
    ["Situation fam.", emp.situation_famille || "—"], ["Enfants à charge", String(emp.enfants || 0)],
  ];

  const footerItems = [
    ent.adresse && `<span>&#128205; ${ent.adresse}</span>`,
    ent.telephone && `<span>&#128222; ${ent.telephone}</span>`,
    ent.email && `<span>&#9993; ${ent.email}</span>`,
    ent.ninea && `<span>NINEA&nbsp;: ${ent.ninea}</span>`,
    ent.rccm && `<span>RCCM&nbsp;: ${ent.rccm}</span>`,
  ].filter(Boolean).join(`<span style="color:#d1d5db">&nbsp;|&nbsp;</span>`);

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Bulletin – ${emp.prenom} ${emp.nom} – ${periode}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1f2937;background:#fff}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:12mm 14mm;display:flex;flex-direction:column}.content{flex:1}
  .header{background:#064e3b;color:#fff;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-radius:6px}
  .emp-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden;margin-bottom:11px}
  .emp-cell{padding:5px 10px;font-size:10px;border-bottom:1px solid #e5e7eb}.emp-cell:nth-child(4n+1),.emp-cell:nth-child(4n+2){background:#f9fafb}
  .emp-label{color:#9ca3af;font-size:8px;text-transform:uppercase;letter-spacing:.5px;display:block}.emp-val{color:#1f2937;font-weight:700}
  table{width:100%;border-collapse:collapse;margin-bottom:9px;font-size:11px}
  .net-box{background:#ecfdf5;border:2px solid #10b981;border-radius:6px;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;margin:10px 0}
  .net-label{font-size:14px;font-weight:800;color:#064e3b}.net-val{font-size:20px;font-weight:900;color:#10b981}
  .masse-box{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:4px;padding:7px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
  .sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:12px 0 8px}.sig{text-align:center}
  .sig-name{font-size:9px;color:#6b7280;margin-bottom:24px}.sig-line{border-top:1px solid #d1d5db;padding-top:5px;font-size:8px;color:#9ca3af}
  .footer{margin-top:auto;padding-top:10px;border-top:2px solid #10b981}
  .footer-coords{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 0;font-size:9px;color:#4b5563;padding:6px 0;text-align:center;line-height:1.8}
  .footer-doc{text-align:center;font-size:8px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:5px;margin-top:4px}
  .no-print{display:none}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:10mm 12mm}}
</style></head><body>
<div class="page"><div class="content">
  <div class="header">
    <div style="display:flex;align-items:center;gap:10px">${ent.logo_url ? `<img src="${ent.logo_url}" style="max-height:32px;max-width:96px;object-fit:contain;background:#fff;border-radius:3px;padding:2px"/>` : ""}<div><div style="font-size:15px;font-weight:900;letter-spacing:1px;text-transform:uppercase">${ent.nom || "ENTREPRISE"}</div>
    ${ent.ninea ? `<div style="font-size:9px;color:#a7f3d0;margin-top:2px">NINEA : ${ent.ninea}</div>` : ""}</div></div>
    <div style="text-align:right"><h2 style="font-size:15px;font-weight:900">BULLETIN DE PAIE</h2>
    <div style="font-size:11px;color:#a7f3d0;margin-top:3px">Période : <b>${periode}</b></div>
    <div style="font-size:9px;color:#6ee7b7;margin-top:2px">Émis le : ${date_emission}</div></div>
  </div>
  <div class="emp-grid">${infoRows.map(([l, v]) => `<div class="emp-cell"><span class="emp-label">${l}</span><span class="emp-val">${v}</span></div>`).join("")}</div>
  ${section("Éléments de Salaire", "#1d4ed8",
    row("Salaire de base", p.salaireBase, { bg: "#f9fafb" }) +
    (p.sursalaire > 0 ? row("Sursalaire", p.sursalaire) : "") +
    (p.primeAnc > 0 ? row(`Prime d'ancienneté (${p.anc}%)`, p.primeAnc, { indent: true, color: "#1d4ed8", bg: "#f9fafb" }) : "") +
    (p.totalHS > 0 ? row("Heures supplémentaires", p.totalHS, { indent: true }) : "") +
    (p.retAbsence > 0 ? row("Retenue absences", p.retAbsence, { neg: true, indent: true, color: "#dc2626" }) : "") +
    row("SALAIRE BRUT", p.brut, { bold: true, color: "#1d4ed8" })
  )}
  ${section("Retenues Salariales", "#dc2626",
    row("Impôt sur le Revenu (IR)", p.ir, { neg: true, indent: true, color: "#dc2626", bg: "#f9fafb" }) +
    row("TRIMF", p.trimf, { neg: true, indent: true, color: "#dc2626" }) +
    (p.brs > 0 ? row("BRS (5%)", p.brs, { neg: true, indent: true, color: "#dc2626", bg: "#f9fafb" }) : "") +
    row("IPRES R.G. salarié (5,6%)", p.ipresRG_s, { neg: true, indent: true, color: "#dc2626", bg: p.brs > 0 ? "transparent" : "#f9fafb" }) +
    (p.ipresRC_s > 0 ? row("IPRES R.C.C. salarié (2,4%)", p.ipresRC_s, { neg: true, indent: true, color: "#dc2626" }) : "") +
    (p.ipm_s > 0 ? row("IPM salarié", p.ipm_s, { neg: true, indent: true, color: "#dc2626", bg: "#f9fafb" }) : "") +
    row("TOTAL RETENUES", p.totalRet, { neg: true, bold: true, color: "#dc2626" })
  )}
  ${section("Indemnités", "#059669",
    row("Indemnité de transport", p.transport, { color: "#065f46", bg: "#f0fdf4" }) +
    (p.primePanier > 0 ? row("Prime de panier", p.primePanier, { color: "#065f46" }) : "") +
    (p.indKilometrique > 0 ? row("Indemnité kilométrique", p.indKilometrique, { color: "#065f46", bg: "#f0fdf4" }) : "")
  )}
  ${p.totalAvances > 0 ? section("Avances & Retenues", "#b45309",
    (p.avanceTabaski > 0 ? row("Avance Tabaski", p.avanceTabaski, { neg: true, color: "#92400e" }) : "") +
    (p.avanceCaisse > 0 ? row("Avance caisse", p.avanceCaisse, { neg: true, color: "#92400e" }) : "") +
    (p.avanceFinanciere > 0 ? row("Avance financière", p.avanceFinanciere, { neg: true, color: "#92400e" }) : "") +
    (p.retCooperative > 0 ? row("Ret. coopérative", p.retCooperative, { neg: true, color: "#92400e" }) : "") +
    (p.fraisMedicaux > 0 ? row("Frais médicaux", p.fraisMedicaux, { neg: true, color: "#92400e" }) : "") +
    row("TOTAL AVANCES", p.totalAvances, { neg: true, bold: true, color: "#92400e" })
  ) : ""}
  <div class="net-box"><div><div class="net-label">NET À PAYER</div><div style="font-size:9px;color:#6b7280;margin-top:2px">Période : ${periode}</div></div><div class="net-val">${f(p.net)} FCFA</div></div>
  ${section("Charges Patronales (informatif)", "#b45309",
    [["CFCE (3%)", p.cfce], ["IPRES R.G. patronal (8,4%)", p.ipresRG_p],
     p.ipresRC_p > 0 ? ["IPRES R.C.C. patronal (3,6%)", p.ipresRC_p] : null,
     ["CSS Alloc. Familiales (7%)", p.css_af], ["CSS Acc. Travail (1%)", p.css_at],
     p.ipm_p > 0 ? ["IPM patronal", p.ipm_p] : null].filter(Boolean)
    .map(([l, v]: any, i: number) => row(l, v, { bg: i % 2 === 0 ? "#fffbeb" : "transparent", color: "#92400e" })).join("") +
    row("TOTAL CHARGES PATRONALES", p.chargesPat, { bold: true, color: "#92400e", bg: "#fffbeb" })
  )}
  <div class="masse-box"><span style="font-size:10px;font-weight:700;color:#5b21b6">MASSE SALARIALE TOTALE</span><span style="font-size:12px;font-weight:800;color:#5b21b6">${f(p.masse)} FCFA</span></div>
  <div class="sigs">${[ent.signatory_name || "Employeur", ent.signatory_role || "Service RH", "Employé(e)"].map(s => `<div class="sig"><div class="sig-name">${s}</div><div class="sig-line">Signature &amp; cachet</div></div>`).join("")}</div>
</div>
<div class="footer"><div class="footer-coords">${footerItems}</div><div class="footer-doc">${ent.pdf_footer || `Document généré par Grow Hub Management System · ${periode} · Confidentiel`}</div></div>
</div></body></html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Bulletin Modal with period selector + PDF
// ═══════════════════════════════════════════════════════════════════════════

function BulletinModal({ emp, params, entreprise, orgSettings, defaultMois, defaultAnnee, onClose }: { emp: HrEmployee; params: PayrollParams; entreprise: Entreprise; orgSettings: any; defaultMois: number; defaultAnnee: number; onClose: () => void }) {
  const now = new Date();
  const [mois, setMois] = useState(defaultMois);
  const [annee, setAnnee] = useState(defaultAnnee);
  const refDate = new Date(annee, mois + 1, 0);
  const paie = calculerPaie(emp, params, refDate);
  const periodeLabel = `${MOIS[mois]} ${annee}`;
  const years = Array.from({ length: 10 }, (_, i) => now.getFullYear() - i);

  const openPDF = () => {
    const html = genererBulletinHTML(emp, paie, mois, annee, entreprise);
    const win = window.open("", "_blank");
    if (!win) { toast.error("Veuillez autoriser les popups"); return; }
    win.document.write(html);
    win.document.close();
  };

  const downloadPDF = async () => {
    // Coherence check: recompute paie just before generation and compare to displayed values
    const verif = calculerPaie(emp, params, refDate);
    const tol = 1; // tolerance FCFA
    const diffs: string[] = [];
    if (Math.abs(verif.brut - paie.brut) > tol) diffs.push(`Brut: ${fmtXOF(paie.brut)} ≠ ${fmtXOF(verif.brut)}`);
    if (Math.abs(verif.net - paie.net) > tol) diffs.push(`Net: ${fmtXOF(paie.net)} ≠ ${fmtXOF(verif.net)}`);
    if (Math.abs(verif.totalRet - paie.totalRet) > tol) diffs.push(`Retenues: ${fmtXOF(paie.totalRet)} ≠ ${fmtXOF(verif.totalRet)}`);
    if (Math.abs(verif.chargesPat - paie.chargesPat) > tol) diffs.push(`Charges: ${fmtXOF(paie.chargesPat)} ≠ ${fmtXOF(verif.chargesPat)}`);
    if (diffs.length > 0) {
      toast.error(`Incohérence aperçu/PDF — ${diffs.join(" · ")}`);
      return;
    }
    await exportPayrollPayslipPdf(emp, paie, mois, annee, orgSettings ?? null);
    toast.success("Bulletin PDF généré (montants vérifiés)");
  };

  const Row = ({ l, v, c, bold, neg }: { l: string; v: number; c?: string; bold?: boolean; neg?: boolean }) => (
    <div className={`flex justify-between py-1 px-2 text-[12px] border-b border-border/50 ${bold ? "font-bold" : ""}`}>
      <span className="text-muted-foreground">{l}</span>
      <span className={c || (neg ? "text-destructive" : "")} style={{ fontWeight: bold ? 700 : 400 }}>
        {neg ? "– " : ""}{fmtXOF(Math.abs(v))} FCFA
      </span>
    </div>
  );

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} /> Bulletin de Paie — {emp.prenom} {emp.nom}
          </DialogTitle>
        </DialogHeader>

        {/* Period selector */}
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg flex-wrap">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Période :</span>
          <Select value={String(mois)} onValueChange={v => setMois(+v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{MOIS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(annee)} onValueChange={v => setAnnee(+v)}>
            <SelectTrigger className="w-[90px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex-1" />
          <GhButton size="sm" variant="secondary" onClick={openPDF}>
            <Eye size={13} className="mr-1" /> Aperçu
          </GhButton>
          <GhButton size="sm" variant="accent" onClick={downloadPDF}>
            <Printer size={13} className="mr-1" /> Télécharger PDF
          </GhButton>
        </div>

        {/* Employee info */}
        <div className="grid grid-cols-2 gap-1 p-3 bg-muted/20 rounded-lg text-[11px]">
          {[["Matricule", emp.matricule], ["Fonction", emp.fonction || "—"], ["Employé", `${emp.prenom} ${emp.nom}`], ["Catégorie", emp.categorie || "—"],
            ["Convention", emp.convention || "—"], ["Contrat", emp.contrat], ["Date d'entrée", emp.date_entree || "—"], ["Ancienneté", `${paie.anc} an${paie.anc > 1 ? "s" : ""} (${(paie.ancRate * 100).toFixed(0)}%)`]
          ].map(([l, v]) => (
            <div key={l}><span className="text-muted-foreground">{l} : </span><span className="font-semibold">{v}</span></div>
          ))}
        </div>

        {/* Salary elements */}
        <div>
          <div className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">Éléments de salaire</div>
          <Row l="Salaire de base" v={paie.salaireBase} />
          {paie.sursalaire > 0 && <Row l="Sursalaire" v={paie.sursalaire} />}
          {paie.primeAnc > 0 && <Row l={`Prime ancienneté (${paie.anc}%)`} v={paie.primeAnc} c="text-primary" />}
          {paie.totalHS > 0 && <Row l="Heures supplémentaires" v={paie.totalHS} />}
          {paie.retAbsence > 0 && <Row l="Retenue absences" v={paie.retAbsence} neg />}
          <Row l="SALAIRE BRUT" v={paie.brut} c="text-primary" bold />
        </div>

        {/* Retenues */}
        <div>
          <div className="text-[10px] font-bold text-destructive uppercase tracking-wide mb-1">Retenues salariales</div>
          <Row l="Impôt sur le Revenu (IR)" v={paie.ir} neg />
          <Row l="TRIMF" v={paie.trimf} neg />
          {paie.brs > 0 && <Row l="BRS (5%)" v={paie.brs} neg />}
          <Row l="IPRES R.G. salarié (5,6%)" v={paie.ipresRG_s} neg />
          {paie.ipresRC_s > 0 && <Row l="IPRES R.C.C. salarié (2,4%)" v={paie.ipresRC_s} neg />}
          {paie.ipm_s > 0 && <Row l="IPM salarié" v={paie.ipm_s} neg />}
          <Row l="TOTAL RETENUES" v={paie.totalRet} neg bold />
        </div>

        {/* Indemnités */}
        <div>
          <div className="text-[10px] font-bold text-green-600 uppercase tracking-wide mb-1">Indemnités</div>
          <Row l="Indemnité de transport" v={paie.transport} />
          {paie.primePanier > 0 && <Row l="Prime de panier" v={paie.primePanier} />}
          {paie.indKilometrique > 0 && <Row l="Indemnité kilométrique" v={paie.indKilometrique} />}
        </div>

        {/* Avances */}
        {paie.totalAvances > 0 && (
          <div>
            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">Avances & retenues</div>
            {paie.avanceTabaski > 0 && <Row l="Avance Tabaski" v={paie.avanceTabaski} neg />}
            {paie.avanceCaisse > 0 && <Row l="Avance caisse" v={paie.avanceCaisse} neg />}
            {paie.avanceFinanciere > 0 && <Row l="Avance financière" v={paie.avanceFinanciere} neg />}
            {paie.retCooperative > 0 && <Row l="Ret. coopérative" v={paie.retCooperative} neg />}
            {paie.fraisMedicaux > 0 && <Row l="Frais médicaux" v={paie.fraisMedicaux} neg />}
            <Row l="TOTAL AVANCES" v={paie.totalAvances} neg bold />
          </div>
        )}

        {/* NET */}
        <div className="bg-primary/10 border-2 border-primary rounded-lg p-4 flex justify-between items-center">
          <div><div className="font-extrabold text-sm">NET À PAYER</div><div className="text-[10px] text-muted-foreground mt-1">Période : {periodeLabel}</div></div>
          <div className="text-xl font-black text-primary">{fmtXOF(paie.net)} FCFA</div>
        </div>

        {/* Charges patronales */}
        <div className="p-3 bg-muted/20 rounded-lg">
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-2">Charges patronales (informatif)</div>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            {[["CFCE", paie.cfce], ["IPRES R.G. patronal", paie.ipresRG_p], ["IPRES R.C.C. patronal", paie.ipresRC_p],
              ["CSS Alloc. Fam.", paie.css_af], ["CSS Acc. Trav.", paie.css_at], ["IPM patronal", paie.ipm_p]
            ].filter(([, v]) => (v as number) > 0).map(([l, v]) => (
              <div key={l as string} className="flex justify-between text-muted-foreground"><span>{l as string}</span><span>{fmtXOF(v as number)} F</span></div>
            ))}
          </div>
          <div className="flex justify-between font-bold text-amber-700 border-t border-border pt-2 mt-2 text-xs">
            <span>Total charges patronales</span><span>{fmtXOF(paie.chargesPat)} FCFA</span>
          </div>
          <div className="flex justify-between font-bold text-purple-600 mt-1 text-xs">
            <span>Masse salariale totale</span><span>{fmtXOF(paie.masse)} FCFA</span>
          </div>
        </div>

        <div className="text-center text-[10px] text-muted-foreground p-2 bg-primary/5 rounded-lg">
          L’aperçu reprend le logo, le footer et le signataire des paramètres d’organisation avant téléchargement.
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Employee Form Dialog
// ═══════════════════════════════════════════════════════════════════════════

function EmployeeFormDialog({ emp, onSave, onClose, existingMats, conventions, users, locked }: {
  emp: Partial<HrEmployee> | null; onSave: (e: Partial<HrEmployee>) => void; onClose: () => void; existingMats: string[];
  conventions: Convention[]; users: { user_id: string; full_name: string; email: string | null }[]; locked?: boolean;
}) {
  const [form, setForm] = useState<Partial<HrEmployee>>(emp || { ...EMPTY_EMP });
  const isEdit = !!emp?.id;
  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const selectedCC = conventions.find(c => c.nom === form.convention);
  const availableCats = selectedCC?.categories || [];

  const handleCatChange = (catCode: string) => {
    set("categorie", catCode);
    const cat = availableCats.find(c => c.code === catCode);
    if (cat) {
      set("statut", cat.statut);
      if (!form.salaire_base || form.salaire_base === 0) set("salaire_base", cat.salaireMinima);
    }
  };

  const handleSubmit = () => {
    if (!form.matricule || !form.prenom || !form.nom) {
      toast.error("Matricule, prénom et nom sont requis");
      return;
    }
    if (!isEdit && existingMats.includes(form.matricule!)) {
      toast.error("Ce matricule existe déjà");
      return;
    }
    if (!(Number(form.salaire_base) > 0)) {
      toast.error("Le salaire de base doit être supérieur à 0");
      return;
    }
    if (locked) { toast.error("Cette période est clôturée : modification impossible"); return; }
    onSave(form);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'employé" : "Nouvel employé"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="identite">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="identite">Identité</TabsTrigger>
            <TabsTrigger value="emploi">Emploi & Salaire</TabsTrigger>
            <TabsTrigger value="avances">Avances & HS</TabsTrigger>
          </TabsList>

          <TabsContent value="identite" className="space-y-3 mt-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-[11px]">Matricule *</Label><Input value={form.matricule || ""} onChange={e => set("matricule", e.target.value)} disabled={isEdit} /></div>
              <div><Label className="text-[11px]">Prénom *</Label><Input value={form.prenom || ""} onChange={e => set("prenom", e.target.value)} /></div>
              <div><Label className="text-[11px]">Nom *</Label><Input value={form.nom || ""} onChange={e => set("nom", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px]">Sexe</Label>
                <Select value={form.sexe || "M"} onValueChange={v => set("sexe", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="M">Homme</SelectItem><SelectItem value="F">Femme</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-[11px]">Date de naissance</Label><Input type="date" value={form.date_naissance || ""} onChange={e => set("date_naissance", e.target.value)} /></div>
              <div><Label className="text-[11px]">Lieu de naissance</Label><Input value={form.lieu_naissance || ""} onChange={e => set("lieu_naissance", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[11px]">Téléphone</Label><Input value={form.telephone || ""} onChange={e => set("telephone", e.target.value)} /></div>
              <div><Label className="text-[11px]">Email</Label><Input value={form.email || ""} onChange={e => set("email", e.target.value)} /></div>
            </div>
            <div>
              <Label className="text-[11px]">Compte utilisateur lié</Label>
              <Select value={form.user_id || "none"} onValueChange={v => set("user_id", v === "none" ? null : v)} disabled={locked}>
                <SelectTrigger><SelectValue placeholder="Aucun compte lié" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun compte lié</SelectItem>
                  {users.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email} · {u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px]">Situation familiale</Label>
                <Select value={form.situation_famille || "Célibataire"} onValueChange={v => set("situation_famille", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf(ve)"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-[11px]">Nb femmes</Label><Input type="number" value={form.femmes ?? 0} onChange={e => set("femmes", +e.target.value)} /></div>
              <div><Label className="text-[11px]">Nb enfants</Label><Input type="number" value={form.enfants ?? 0} onChange={e => set("enfants", +e.target.value)} /></div>
            </div>
          </TabsContent>

          <TabsContent value="emploi" className="space-y-3 mt-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-[11px]">Fonction</Label><Input value={form.fonction || ""} onChange={e => set("fonction", e.target.value)} /></div>
              <div>
                <Label className="text-[11px]">Convention collective</Label>
                <Select value={form.convention || ""} onValueChange={v => { set("convention", v); set("categorie", ""); }}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {conventions.map(cc => <SelectItem key={cc.id} value={cc.nom}>{cc.nom} · {cc.secteur}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Catégorie</Label>
                {availableCats.length > 0 ? (
                  <Select value={form.categorie || ""} onValueChange={handleCatChange}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {availableCats.map(cat => <SelectItem key={cat.id} value={cat.code}>{cat.code} · {cat.libelle} (min. {fmtXOF(cat.salaireMinima)} F)</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.categorie || ""} onChange={e => set("categorie", e.target.value)} placeholder="ex: 3_ème" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px]">Statut</Label>
                <Select value={form.statut || "employés"} onValueChange={v => set("statut", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employés">Employé</SelectItem>
                    <SelectItem value="agents de maîtrise">Agent de maîtrise</SelectItem>
                    <SelectItem value="cadres">Cadre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Contrat</Label>
                <Select value={form.contrat || "CDI"} onValueChange={v => set("contrat", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["CDI", "CDD", "Stage", "Prestation"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-[11px]">Date d'entrée</Label><Input type="date" value={form.date_entree || ""} onChange={e => set("date_entree", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[11px]">Salaire de base (FCFA) *</Label><Input type="number" value={form.salaire_base ?? 0} onChange={e => set("salaire_base", +e.target.value)} /></div>
              <div><Label className="text-[11px]">Sursalaire (FCFA)</Label><Input type="number" value={form.sursalaire ?? 0} onChange={e => set("sursalaire", +e.target.value)} /></div>
            </div>
            {form.categorie && availableCats.find(c => c.code === form.categorie) && Number(form.salaire_base) < (availableCats.find(c => c.code === form.categorie)?.salaireMinima || 0) && (
              <div className="text-xs text-destructive">⚠ Inférieur au salaire minima de la catégorie ({fmtXOF(availableCats.find(c => c.code === form.categorie)!.salaireMinima)} F)</div>
            )}
          </TabsContent>

          <TabsContent value="avances" className="space-y-3 mt-3">
            <h4 className="text-xs font-bold text-muted-foreground">Heures supplémentaires</h4>
            <div className="grid grid-cols-4 gap-3">
              {[["HS 115%", "hs_115"], ["HS 140%", "hs_140"], ["HS 160%", "hs_160"], ["HS 200%", "hs_200"]].map(([label, key]) => (
                <div key={key}><Label className="text-[11px]">{label}</Label><Input type="number" value={(form as any)[key] ?? 0} onChange={e => set(key, +e.target.value)} /></div>
              ))}
            </div>
            <h4 className="text-xs font-bold text-muted-foreground mt-2">Avances & retenues</h4>
            <div className="grid grid-cols-3 gap-3">
              {[["Avance Tabaski", "avance_tabaski"], ["Avance caisse", "avance_caisse"], ["Avance financière", "avance_financiere"],
                ["Ret. coopérative", "ret_cooperative"], ["Frais médicaux", "frais_medicaux"], ["Ind. kilométrique", "ind_kilometrique"]
              ].map(([label, key]) => (
                <div key={key}><Label className="text-[11px]">{label}</Label><Input type="number" value={(form as any)[key] ?? 0} onChange={e => set(key, +e.target.value)} /></div>
              ))}
            </div>
            <h4 className="text-xs font-bold text-muted-foreground mt-2">Absences</h4>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-[11px]">Heures absence</Label><Input type="number" value={form.heures_absence ?? 0} onChange={e => set("heures_absence", +e.target.value)} /></div>
              <div><Label className="text-[11px]">Heures maladie</Label><Input type="number" value={form.heures_abs_maladie ?? 0} onChange={e => set("heures_abs_maladie", +e.target.value)} /></div>
              <div><Label className="text-[11px]">Nb paniers</Label><Input type="number" value={form.nb_paniers ?? 0} onChange={e => set("nb_paniers", +e.target.value)} /></div>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-2 mt-4">
          <GhButton variant="ghost" size="sm" onClick={onClose}>Annuler</GhButton>
          <GhButton size="sm" onClick={handleSubmit} disabled={locked}>{locked ? "Période clôturée" : isEdit ? "Modifier" : "Créer"}</GhButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Paramètres Tab
// ═══════════════════════════════════════════════════════════════════════════

function ParametresTab({ params, onSave }: { params: PayrollParams; onSave: (p: PayrollParams) => void }) {
  const [local, setLocal] = useState<PayrollParams>(JSON.parse(JSON.stringify(params)));
  const setP = (key: string, field: string, value: string | number) => {
    setLocal(prev => ({ ...prev, [key]: { ...(prev as any)[key], [field]: isNaN(+value) ? value : +value } }));
  };
  const KEYS = ["CFCE", "BRS", "IPRES_RG", "IPRES_RCC", "CSS_AF", "CSS_AT", "IPM"] as const;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold">Paramètres de cotisation</h3>
          <p className="text-xs text-muted-foreground">Taux des cotisations sociales · République du Sénégal</p>
        </div>
        <div className="flex gap-2">
          <GhButton size="sm" variant="ghost" onClick={() => setLocal(JSON.parse(JSON.stringify(DEFAULT_PAYROLL_PARAMS)))}>↺ Réinitialiser</GhButton>
          <GhButton size="sm" onClick={() => { onSave(local); toast.success("Paramètres enregistrés"); }}>💾 Enregistrer</GhButton>
        </div>
      </div>

      <GhCard title="🏛️ Cotisations Sociales">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                {["Libellé", "Taux total", "Salarié", "Patronal", "Plafond (FCFA)"].map(h => (
                  <th key={h} className="py-2 px-3 text-left font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KEYS.map(key => {
                const p = (local as any)[key];
                return (
                  <tr key={key} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-3 font-semibold">{p.label}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <Input type="number" step="0.001" min={0} max={1} value={p.taux} onChange={e => setP(key, "taux", e.target.value)} className="w-20 h-7 text-xs" />
                        <span className="text-primary text-[10px] font-semibold w-12">{(p.taux * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <Input type="number" step="0.1" min={0} max={1} value={p.tauxSalarial} onChange={e => setP(key, "tauxSalarial", e.target.value)} className="w-16 h-7 text-xs" />
                    </td>
                    <td className="py-2 px-3">
                      <Input type="number" step="0.1" min={0} max={1} value={p.tauxPatronal} onChange={e => setP(key, "tauxPatronal", e.target.value)} className="w-16 h-7 text-xs" />
                    </td>
                    <td className="py-2 px-3">
                      {p.plafond !== null ? (
                        <Input type="number" step="1000" min={0} value={p.plafond ?? ""} onChange={e => setP(key, "plafond", e.target.value)} className="w-28 h-7 text-xs" />
                      ) : (
                        <span className="text-muted-foreground text-[10px]">Sans plafond</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GhCard>

      <GhCard title="🚌 Indemnité de Transport">
        <div className="flex items-center gap-4">
          <div>
            <Label className="text-[11px]">Montant mensuel (FCFA)</Label>
            <Input type="number" step="500" min={0} value={local.transport.valeur} onChange={e => setP("transport", "valeur", e.target.value)} className="w-48" />
          </div>
          <div className="text-xl font-bold text-primary">{fmtXOF(local.transport.valeur)} FCFA</div>
        </div>
      </GhCard>

      <GhCard title="📊 Barème IR — Code Général des Impôts Sénégal">
        <p className="text-xs text-muted-foreground mb-3">Non modifiable — défini par la législation fiscale sénégalaise.</p>
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-border"><th className="py-2 px-3 text-left text-muted-foreground font-semibold">Tranche annuelle (FCFA)</th><th className="py-2 px-3 text-left text-muted-foreground font-semibold">Taux</th></tr></thead>
          <tbody>
            {[["0 – 630 000", "0 %"], ["630 001 – 1 500 000", "20 %"], ["1 500 001 – 4 000 000", "30 %"], ["4 000 001 – 8 000 000", "35 %"], ["8 000 001 – 13 500 000", "37 %"], ["Au-delà de 13 500 000", "40 %"]].map(([t, r], i) => (
              <tr key={i} className="border-b border-border/50"><td className="py-2 px-3">{t}</td><td className="py-2 px-3 font-bold text-amber-600">{r}</td></tr>
            ))}
          </tbody>
        </table>
      </GhCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Entreprise Tab
// ═══════════════════════════════════════════════════════════════════════════

function EntrepriseTab({ entreprise, onSave }: { entreprise: Entreprise; onSave: (e: Entreprise) => void }) {
  const [form, setForm] = useState({ ...entreprise });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold">Informations de l'entreprise</h3>
          <p className="text-xs text-muted-foreground">Ces informations apparaissent sur les bulletins de paie</p>
        </div>
        <GhButton size="sm" onClick={() => { onSave(form); toast.success("Entreprise enregistrée"); }}>💾 Enregistrer</GhButton>
      </div>

      <GhCard title="📋 Coordonnées">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-[11px]">Nom de l'entreprise *</Label><Input value={form.nom} onChange={e => set("nom", e.target.value)} /></div>
          <div><Label className="text-[11px]">Téléphone</Label><Input value={form.telephone} onChange={e => set("telephone", e.target.value)} /></div>
          <div><Label className="text-[11px]">Adresse</Label><Input value={form.adresse} onChange={e => set("adresse", e.target.value)} /></div>
          <div><Label className="text-[11px]">Email</Label><Input value={form.email} onChange={e => set("email", e.target.value)} /></div>
          <div><Label className="text-[11px]">NINEA</Label><Input value={form.ninea} onChange={e => set("ninea", e.target.value)} /></div>
          <div><Label className="text-[11px]">RCCM</Label><Input value={form.rccm} onChange={e => set("rccm", e.target.value)} /></div>
        </div>
      </GhCard>

      {/* Aperçu mini header bulletin */}
      <GhCard title="Aperçu du bulletin">
        <div className="rounded-md overflow-hidden">
          <div className="bg-emerald-900 text-white p-3 flex justify-between items-center">
            <div className="font-black text-sm tracking-wide">{form.nom || "Nom entreprise"}</div>
            <div className="text-right">
              <div className="font-bold text-xs">BULLETIN DE PAIE</div>
              <div className="text-emerald-300 text-[10px]">Période : Avril 2026</div>
            </div>
          </div>
          <div className="border-t-2 border-emerald-600 p-2 flex flex-wrap gap-3 text-[9px] text-muted-foreground bg-muted/20">
            {form.adresse && <span>📍 {form.adresse}</span>}
            {form.telephone && <span>📞 {form.telephone}</span>}
            {form.email && <span>✉️ {form.email}</span>}
            {form.ninea && <span>NINEA : {form.ninea}</span>}
          </div>
        </div>
      </GhCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Conventions Tab
// ═══════════════════════════════════════════════════════════════════════════

type ConvCategory = { id: string; code: string; libelle: string; statut: string; salaireMinima: number };
type Convention = { id: string; nom: string; secteur: string; dateSignature: string; description: string; categories: ConvCategory[] };

function applyPayrollVariable(emp: HrEmployee, variable?: HrPayrollVariable): HrEmployee {
  if (!variable) return emp;
  return {
    ...emp,
    hs_115: variable.hs_115,
    hs_140: variable.hs_140,
    hs_160: variable.hs_160,
    hs_200: variable.hs_200,
    heures_absence: variable.heures_absence,
    heures_abs_maladie: variable.heures_abs_maladie,
    taux_maladie: variable.taux_maladie,
    nb_paniers: variable.nb_paniers,
    avance_tabaski: variable.avance_tabaski,
    avance_caisse: variable.avance_caisse,
    avance_financiere: variable.avance_financiere,
    ret_cooperative: variable.ret_cooperative,
    frais_medicaux: variable.frais_medicaux,
    ind_kilometrique: variable.ind_kilometrique + variable.primes_exceptionnelles,
  };
}

function VariablesTab({ employees, variables, onSave }: { employees: HrEmployee[]; variables: HrPayrollVariable[]; onSave: (v: Partial<HrPayrollVariable> & { employee_id: string }) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, number | string>>({});
  const open = (emp: HrEmployee) => {
    const variable = variables.find(v => v.employee_id === emp.id);
    setEditing(emp.id!);
    setForm({ ...EMPTY_PAYROLL_VARIABLE, ...(variable ?? {}) });
  };
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: k === "notes" ? v : Number(v || 0) }));
  const fields = [
    ["HS 115%", "hs_115"], ["HS 140%", "hs_140"], ["Absences", "heures_absence"], ["Paniers", "nb_paniers"],
    ["Avance caisse", "avance_caisse"], ["Avance financière", "avance_financiere"], ["Ret. coopérative", "ret_cooperative"], ["Prime exceptionnelle", "primes_exceptionnelles"],
  ];

  return (
    <GhCard title="Variables mensuelles de paie">
      <div className="space-y-2">
        {employees.map(emp => {
          const variable = variables.find(v => v.employee_id === emp.id);
          const hasValues = variable && fields.some(([, k]) => Number((variable as any)[k] ?? 0) > 0);
          return (
            <div key={emp.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div><div className="font-semibold text-sm">{emp.prenom} {emp.nom}</div><div className="text-xs text-muted-foreground">{emp.matricule} · {emp.fonction || "—"}</div></div>
                <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{hasValues ? "Variables saisies" : "Aucune variable"}</span><GhButton size="sm" variant="secondary" onClick={() => open(emp)}><Pencil className="w-3 h-3 mr-1" />Saisir</GhButton></div>
              </div>
              {editing === emp.id && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border">
                  {fields.map(([label, key]) => <div key={key}><Label className="text-[11px]">{label}</Label><Input type="number" value={String(form[key] ?? 0)} onChange={e => set(key, e.target.value)} /></div>)}
                  <div className="md:col-span-4"><Label className="text-[11px]">Notes</Label><Input value={String(form.notes ?? "")} onChange={e => set("notes", e.target.value)} /></div>
                  <div className="md:col-span-4 flex justify-end gap-2"><GhButton size="sm" variant="ghost" onClick={() => setEditing(null)}>Annuler</GhButton><GhButton size="sm" onClick={() => { onSave({ ...(form as any), employee_id: emp.id! }); setEditing(null); toast.success("Variables enregistrées"); }}>Enregistrer</GhButton></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GhCard>
  );
}

function ConventionsTab({ conventions, setConventions }: { conventions: Convention[]; setConventions: (c: Convention[]) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedCC = conventions.find(c => c.id === selected);

  // Convention form
  const [showCCForm, setShowCCForm] = useState<Convention | "new" | null>(null);
  const [ccForm, setCcForm] = useState({ nom: "", secteur: "", dateSignature: "", description: "" });

  // Category form
  const [showCatForm, setShowCatForm] = useState<ConvCategory | "new" | null>(null);
  const [catForm, setCatForm] = useState<Omit<ConvCategory, "id">>({ code: "", libelle: "", statut: "employés", salaireMinima: 0 });

  const openNewCC = () => { setCcForm({ nom: "", secteur: "", dateSignature: "", description: "" }); setShowCCForm("new"); };
  const openEditCC = (cc: Convention) => { setCcForm({ nom: cc.nom, secteur: cc.secteur, dateSignature: cc.dateSignature, description: cc.description }); setShowCCForm(cc); };
  const saveCC = () => {
    if (!ccForm.nom.trim()) { toast.error("Le nom est requis"); return; }
    if (showCCForm === "new") {
      setConventions([...conventions, { id: "CC" + Date.now(), ...ccForm, categories: [] }]);
      toast.success("Convention créée");
    } else if (showCCForm) {
      setConventions(conventions.map(c => c.id === (showCCForm as Convention).id ? { ...c, ...ccForm } : c));
      toast.success("Convention modifiée");
    }
    setShowCCForm(null);
  };
  const deleteCC = (id: string) => {
    if (!confirm("Supprimer cette convention et toutes ses catégories ?")) return;
    setConventions(conventions.filter(c => c.id !== id));
    if (selected === id) setSelected(null);
    toast.success("Convention supprimée");
  };

  const openNewCat = () => { setCatForm({ code: "", libelle: "", statut: "employés", salaireMinima: 0 }); setShowCatForm("new"); };
  const openEditCat = (cat: ConvCategory) => { setCatForm({ code: cat.code, libelle: cat.libelle, statut: cat.statut, salaireMinima: cat.salaireMinima }); setShowCatForm(cat); };
  const saveCat = () => {
    if (!selectedCC || !catForm.code.trim()) { toast.error("Le code est requis"); return; }
    setConventions(conventions.map(c => {
      if (c.id !== selectedCC.id) return c;
      if (showCatForm === "new") {
        return { ...c, categories: [...c.categories, { id: "cat" + Date.now(), ...catForm, salaireMinima: +catForm.salaireMinima }] };
      }
      return { ...c, categories: c.categories.map(cat => cat.id === (showCatForm as ConvCategory).id ? { ...cat, ...catForm, salaireMinima: +catForm.salaireMinima } : cat) };
    }));
    toast.success(showCatForm === "new" ? "Catégorie ajoutée" : "Catégorie modifiée");
    setShowCatForm(null);
  };
  const deleteCat = (catId: string) => {
    if (!selectedCC) return;
    setConventions(conventions.map(c => c.id !== selectedCC.id ? c : { ...c, categories: c.categories.filter(cat => cat.id !== catId) }));
    toast.success("Catégorie supprimée");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">Conventions Collectives</h3>
          <p className="text-xs text-muted-foreground">{conventions.length} convention{conventions.length > 1 ? "s" : ""} enregistrée{conventions.length > 1 ? "s" : ""}</p>
        </div>
        <GhButton size="sm" onClick={openNewCC}><Plus className="w-3 h-3 mr-1" />Nouvelle convention</GhButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {conventions.map(cc => (
          <div key={cc.id} className={`rounded-lg border p-3 transition-colors ${selected === cc.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}>
            <div className="cursor-pointer" onClick={() => setSelected(cc.id === selected ? null : cc.id)}>
              <div className="font-bold text-sm">{cc.nom}</div>
              <div className="text-xs text-muted-foreground mt-1">{cc.secteur}</div>
              <div className="flex gap-2 mt-2">
                <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-semibold">{cc.categories.length} cat.</span>
                {cc.dateSignature && <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full">{cc.dateSignature.slice(0, 4)}</span>}
              </div>
            </div>
            <div className="flex gap-1 mt-2 border-t border-border/50 pt-2">
              <button onClick={() => openEditCC(cc)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5"><Pencil className="w-3 h-3" /> Modifier</button>
              <button onClick={() => deleteCC(cc.id)} className="text-[10px] text-destructive hover:underline flex items-center gap-0.5 ml-auto"><Trash2 className="w-3 h-3" /> Supprimer</button>
            </div>
          </div>
        ))}
      </div>

      {selectedCC && (
        <GhCard title={`📊 Grille salariale — ${selectedCC.nom}`}>
          {selectedCC.description && <p className="text-xs text-muted-foreground mb-3">{selectedCC.description}</p>}
          {selectedCC.categories.length > 0 && (
            <div className="flex gap-3 mb-3">
              {[
                { label: "Salaire min.", value: fmtXOF(Math.min(...selectedCC.categories.map(c => c.salaireMinima))) + " F" },
                { label: "Salaire max.", value: fmtXOF(Math.max(...selectedCC.categories.map(c => c.salaireMinima))) + " F" },
                { label: "Moyenne", value: fmtXOF(selectedCC.categories.reduce((s, c) => s + c.salaireMinima, 0) / selectedCC.categories.length) + " F" },
              ].map(s => (
                <div key={s.label} className="bg-muted/30 rounded-md p-2 flex-1">
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  <div className="font-bold text-sm text-primary mt-1">{s.value}</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end mb-2">
            <GhButton size="sm" variant="secondary" onClick={openNewCat}><Plus className="w-3 h-3 mr-1" />Ajouter catégorie</GhButton>
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 px-3 text-left">Code</th>
                <th className="py-2 px-3 text-left">Libellé</th>
                <th className="py-2 px-3 text-left">Statut</th>
                <th className="py-2 px-3 text-right">Salaire Minima</th>
                <th className="py-2 px-1 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedCC.categories.map(cat => (
                <tr key={cat.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="py-2 px-3"><span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">{cat.code}</span></td>
                  <td className="py-2 px-3 font-medium">{cat.libelle}</td>
                  <td className="py-2 px-3"><span className="text-[10px] px-2 py-0.5 rounded capitalize" style={{ background: `${STATUT_COLORS[cat.statut] || "gray"}20`, color: STATUT_COLORS[cat.statut] || "gray" }}>{cat.statut}</span></td>
                  <td className="py-2 px-3 text-right font-bold text-amber-600">{fmtXOF(cat.salaireMinima)} FCFA</td>
                  <td className="py-2 px-1 text-right">
                    <button onClick={() => openEditCat(cat)} className="p-1 hover:bg-muted rounded"><Pencil className="w-3 h-3 text-primary" /></button>
                    <button onClick={() => deleteCat(cat.id)} className="p-1 hover:bg-muted rounded"><Trash2 className="w-3 h-3 text-destructive" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GhCard>
      )}

      {/* Convention Form Dialog */}
      <Dialog open={!!showCCForm} onOpenChange={() => setShowCCForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{showCCForm === "new" ? "Nouvelle convention" : "Modifier la convention"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom *</Label><Input value={ccForm.nom} onChange={e => setCcForm({ ...ccForm, nom: e.target.value })} placeholder="Ex: Commerce" /></div>
            <div><Label>Secteur</Label><Input value={ccForm.secteur} onChange={e => setCcForm({ ...ccForm, secteur: e.target.value })} placeholder="Ex: Commerce général" /></div>
            <div><Label>Date de signature</Label><Input type="date" value={ccForm.dateSignature} onChange={e => setCcForm({ ...ccForm, dateSignature: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={ccForm.description} onChange={e => setCcForm({ ...ccForm, description: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <GhButton variant="secondary" onClick={() => setShowCCForm(null)}>Annuler</GhButton>
              <GhButton onClick={saveCC}>Enregistrer</GhButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Form Dialog */}
      <Dialog open={!!showCatForm} onOpenChange={() => setShowCatForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{showCatForm === "new" ? "Nouvelle catégorie" : "Modifier la catégorie"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Code *</Label><Input value={catForm.code} onChange={e => setCatForm({ ...catForm, code: e.target.value })} placeholder="Ex: 3_ème" /></div>
            <div><Label>Libellé</Label><Input value={catForm.libelle} onChange={e => setCatForm({ ...catForm, libelle: e.target.value })} placeholder="Ex: 3ème catégorie" /></div>
            <div>
              <Label>Statut</Label>
              <Select value={catForm.statut} onValueChange={v => setCatForm({ ...catForm, statut: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employés">Employés</SelectItem>
                  <SelectItem value="agents de maîtrise">Agents de maîtrise</SelectItem>
                  <SelectItem value="cadres">Cadres</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Salaire Minima (FCFA)</Label><Input type="number" value={catForm.salaireMinima} onChange={e => setCatForm({ ...catForm, salaireMinima: +e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <GhButton variant="secondary" onClick={() => setShowCatForm(null)}>Annuler</GhButton>
              <GhButton onClick={saveCat}>Enregistrer</GhButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════
// Main HrPage
// ═══════════════════════════════════════════════════════════════════════════

export default function HrPage() {
  const { t } = useTranslation();
  const { isAdmin, roles, user } = useAuth();
  const canManageHr = roles.includes("super_admin") || roles.includes("coordinator");
  const { data: orgSettings } = useOrgSettings();
  const { data: assignableUsers = [] } = useAssignableUsers();
  const adminEmployees = useHrEmployees();
  const ownEmployees = useMyHrEmployees(!canManageHr);
  const employees = canManageHr ? adminEmployees.employees : ownEmployees.employees.filter(e => e.user_id === user?.id);
  const isLoading = canManageHr ? adminEmployees.isLoading : ownEmployees.isLoading;
  const { upsert, remove } = adminEmployees;
  const { history, saveSnapshot } = useHrPayrollHistory();
  const payrollSettings = useHrPayrollSettings(canManageHr);
  const payrollRuns = useHrPayrollRuns(canManageHr);
  const [showNew, setShowNew] = useState(false);
  const [showForm, setShowForm] = useState<Partial<HrEmployee> | null>(null);
  const [showBulletin, setShowBulletin] = useState<HrEmployee | null>(null);
  const [search, setSearch] = useState("");
  const [params, setParams] = useState<PayrollParams>(DEFAULT_PAYROLL_PARAMS);
  const now = new Date();
  const [payrollMonth, setPayrollMonth] = useState(now.getMonth());
  const [payrollYear, setPayrollYear] = useState(now.getFullYear());
  const { variables, saveVariable } = useHrPayrollVariables(payrollMonth, payrollYear, canManageHr);
  const [entreprise, setEntreprise] = useState<Entreprise>(DEFAULT_ENTREPRISE);
  const [conventions, setConventions] = useState(DEFAULT_CONVENTIONS);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (payrollSettings.setting?.settings) setParams(payrollSettings.setting.settings as unknown as PayrollParams);
  }, [payrollSettings.setting]);

  useEffect(() => {
    if (!orgSettings) return;
    setEntreprise({
      nom: orgSettings.company_name || DEFAULT_ENTREPRISE.nom,
      adresse: orgSettings.address || DEFAULT_ENTREPRISE.adresse,
      telephone: orgSettings.phone || DEFAULT_ENTREPRISE.telephone,
      email: orgSettings.email || DEFAULT_ENTREPRISE.email,
      ninea: orgSettings.ninea || "",
      rccm: orgSettings.rccm || "",
      logo_url: orgSettings.logo_url,
      pdf_footer: orgSettings.pdf_footer,
      signatory_name: orgSettings.signatory_name,
      signatory_role: orgSettings.signatory_role,
    });
  }, [orgSettings]);

  const variablesByEmployee = useMemo(() => new Map(variables.map(v => [v.employee_id, v])), [variables]);
  const currentRun = useMemo(() => payrollRuns.runs.find((r: any) => r.mois === payrollMonth && r.annee === payrollYear), [payrollRuns.runs, payrollMonth, payrollYear]) as any;
  const isPeriodClosed = currentRun?.status === "closed";
  const allPaies = useMemo(() => employees.map(e => {
    const empWithVariables = applyPayrollVariable(e, variablesByEmployee.get(e.id!));
    return { ...empWithVariables, paie: calculerPaie(empWithVariables, params, new Date(payrollYear, payrollMonth + 1, 0)) };
  }), [employees, params, payrollMonth, payrollYear, variablesByEmployee]);
  const filtered = allPaies.filter(e =>
    `${e.prenom} ${e.nom} ${e.matricule} ${e.fonction}`.toLowerCase().includes(search.toLowerCase())
  );

  const totaux = useMemo(() => ({
    brut: allPaies.reduce((s, e) => s + e.paie.brut, 0),
    net: allPaies.reduce((s, e) => s + e.paie.net, 0),
    charges: allPaies.reduce((s, e) => s + e.paie.chargesPat, 0),
    masse: allPaies.reduce((s, e) => s + e.paie.masse, 0),
  }), [allPaies]);

  // Charts data
  const statutData = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => { counts[e.statut || "autre"] = (counts[e.statut || "autre"] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const contratData = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => { counts[e.contrat || "autre"] = (counts[e.contrat || "autre"] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const salaryByStatut = useMemo(() => {
    const sums: Record<string, { brut: number; net: number; count: number }> = {};
    allPaies.forEach(e => {
      const key = e.statut || "autre";
      if (!sums[key]) sums[key] = { brut: 0, net: 0, count: 0 };
      sums[key].brut += e.paie.brut;
      sums[key].net += e.paie.net;
      sums[key].count += 1;
    });
    return Object.entries(sums).map(([name, v]) => ({ name, brut: Math.round(v.brut), net: Math.round(v.net) }));
  }, [allPaies]);

  const handleSave = async (emp: Partial<HrEmployee>) => {
    if (isPeriodClosed) { toast.error("Cette période est clôturée : modification impossible"); return; }
    await upsert.mutateAsync(emp);
    setShowForm(null);
    setShowNew(false);
    toast.success("Employé enregistré");
  };

  const handleDelete = async (id: string) => {
    if (isPeriodClosed) { toast.error("Cette période est clôturée : modification impossible"); return; }
    if (!confirm("Archiver cet employé ? Les données RH restent conservées pour l'historique de paie.")) return;
    await remove.mutateAsync(id);
    toast.success("Employé archivé");
  };

  const handleCloseMonth = async () => {
    if (!canManageHr) { toast.error("Accès RH non autorisé"); return; }
    if (isPeriodClosed) { toast.error("Cette période est déjà clôturée"); return; }
    const run = await payrollRuns.upsertRun.mutateAsync({
      mois: payrollMonth,
      annee: payrollYear,
      status: "closed",
      settings_snapshot: params as any,
      total_brut: totaux.brut,
      total_net: totaux.net,
      total_charges: totaux.charges,
      total_masse: totaux.masse,
      nb_employes: employees.length,
      calculated_at: new Date().toISOString(),
      closed_at: new Date().toISOString(),
    }) as any;
    await payrollRuns.savePayslips.mutateAsync(allPaies.map(emp => ({
      payroll_run_id: run.id,
      employee_id: emp.id,
      mois: payrollMonth,
      annee: payrollYear,
      reference: `BP-${payrollYear}-${String(payrollMonth + 1).padStart(2, "0")}-${emp.matricule}`,
      employee_snapshot: emp,
      variables_snapshot: variablesByEmployee.get(emp.id!) ?? {},
      calculation_snapshot: emp.paie,
      gross_total: emp.paie.brut,
      net_total: emp.paie.net,
      employer_charges: emp.paie.chargesPat,
    })));
    await saveSnapshot.mutateAsync({
      mois: payrollMonth,
      annee: payrollYear,
      total_brut: totaux.brut,
      total_net: totaux.net,
      total_charges: totaux.charges,
      total_masse: totaux.masse,
      nb_employes: employees.length,
    });
    toast.success(`${MOIS[payrollMonth]} ${payrollYear} clôturé avec bulletins figés`);
  };

  const handleCalculatePayroll = async () => {
    if (!canManageHr) { toast.error("Accès RH non autorisé"); return; }
    if (isPeriodClosed) { toast.error("Cette période est clôturée"); return; }
    await payrollRuns.upsertRun.mutateAsync({
      mois: payrollMonth, annee: payrollYear, status: "draft", settings_snapshot: params as any,
      total_brut: totaux.brut, total_net: totaux.net, total_charges: totaux.charges, total_masse: totaux.masse,
      nb_employes: employees.length, calculated_at: new Date().toISOString(),
    });
    toast.success(`Paie brouillon calculée pour ${MOIS[payrollMonth]} ${payrollYear}`);
  };

  // Bulk PDF export — selection + confirmation + progress
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; running: boolean } | null>(null);
  const toggleSelected = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAllFiltered = () => setSelectedIds(prev => {
    const ids = filtered.map(e => e.id!).filter(Boolean);
    const allSelected = ids.length > 0 && ids.every(id => prev.has(id));
    const next = new Set(prev);
    if (allSelected) ids.forEach(id => next.delete(id));
    else ids.forEach(id => next.add(id));
    return next;
  });
  const exportTargets = useMemo(
    () => selectedIds.size > 0 ? allPaies.filter(e => e.id && selectedIds.has(e.id)) : allPaies,
    [allPaies, selectedIds]
  );
  const exportTotals = useMemo(() => ({
    brut: exportTargets.reduce((s, e) => s + e.paie.brut, 0),
    net: exportTargets.reduce((s, e) => s + e.paie.net, 0),
  }), [exportTargets]);
  const handleBulkExport = async () => {
    setBulkConfirm(false);
    if (exportTargets.length === 0) { toast.error("Aucun employé à exporter"); return; }
    setBulkProgress({ current: 0, total: exportTargets.length, running: true });
    let ok = 0, fail = 0;
    for (let i = 0; i < exportTargets.length; i++) {
      const e = exportTargets[i];
      try {
        const verif = calculerPaie(e, params, new Date(payrollYear, payrollMonth + 1, 0));
        if (Math.abs(verif.net - e.paie.net) > 1 || Math.abs(verif.brut - e.paie.brut) > 1) {
          fail++;
        } else {
          await exportPayrollPayslipPdf(e, e.paie, payrollMonth, payrollYear, orgSettings ?? null);
          ok++;
        }
      } catch { fail++; }
      setBulkProgress({ current: i + 1, total: exportTargets.length, running: i + 1 < exportTargets.length });
    }
    setBulkProgress(null);
    if (fail > 0) toast.warning(`${ok} bulletin(s) exporté(s) · ${fail} en échec/incohérence`);
    else toast.success(`${ok} bulletin(s) PDF générés pour ${MOIS[payrollMonth]} ${payrollYear}`);
  };

  // History filter
  const [historyYear, setHistoryYear] = useState<number | "all">(payrollYear);
  const [historyMonth, setHistoryMonth] = useState<number | "all">("all");
  const [historyStatus, setHistoryStatus] = useState<"all" | "draft" | "calculated" | "validated" | "closed">("all");
  const filteredRuns = useMemo(() => {
    return (payrollRuns.runs as any[]).filter(r =>
      (historyYear === "all" || r.annee === historyYear) &&
      (historyMonth === "all" || r.mois === historyMonth) &&
      (historyStatus === "all" || r.status === historyStatus)
    );
  }, [payrollRuns.runs, historyYear, historyMonth, historyStatus]);
  const historyYears = useMemo(() => {
    const ys = new Set<number>([payrollYear]);
    (payrollRuns.runs as any[]).forEach(r => ys.add(r.annee));
    history.forEach((h: any) => ys.add(h.annee));
    return Array.from(ys).sort((a, b) => b - a);
  }, [payrollRuns.runs, history, payrollYear]);
  if (!canManageHr && employees.length === 0) return <div className="max-w-xl mx-auto mt-12"><GhCard title="Accès RH restreint"><div className="flex gap-3 text-sm text-muted-foreground"><ShieldCheck className="w-5 h-5 text-primary shrink-0" />Les données RH sensibles sont réservées aux administrateurs et coordinateurs. Aucun profil employé n’est lié à votre compte.</div></GhCard></div>;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Gestion RH & Paie"
        subtitle="Module complet de paie conforme au droit sénégalais — Barème fiscal, cotisations sociales et bulletins"
        actions={
          <div className="flex gap-2">
            <Select value={String(payrollMonth)} onValueChange={v => setPayrollMonth(Number(v))}>
              <SelectTrigger className="w-[132px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{MOIS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="w-24 h-9" type="number" value={payrollYear} onChange={e => setPayrollYear(Number(e.target.value))} />
            {canManageHr && <GhButton size="sm" variant="secondary" onClick={handleCalculatePayroll} disabled={isPeriodClosed}>
              <Calculator size={14} className="mr-1" /> Calculer la paie
            </GhButton>}
            {canManageHr && <GhButton size="sm" variant="secondary" onClick={() => setBulkConfirm(true)} disabled={exportTargets.length === 0 || !!bulkProgress}>
              <FileDown size={14} className="mr-1" />
              {selectedIds.size > 0 ? `Bulletins PDF (${selectedIds.size} sél.)` : "Bulletins PDF du mois"}
            </GhButton>}
            {canManageHr && <GhButton size="sm" variant="secondary" onClick={() => {
              try { exportLivreDePaieXlsx(exportTargets, payrollMonth, payrollYear); toast.success("Livre de paie exporté"); }
              catch (e: any) { toast.error(e?.message ?? "Export impossible"); }
            }} disabled={exportTargets.length === 0}>
              <FileDown size={14} className="mr-1" /> Livre de paie (Excel)
            </GhButton>}
            {canManageHr && <GhButton size="sm" variant="secondary" onClick={() => {
              try { exportBankCsv(exportTargets, payrollMonth, payrollYear); toast.success("Fichier de virement généré"); }
              catch (e: any) { toast.error(e?.message ?? "Export impossible"); }
            }} disabled={exportTargets.length === 0}>
              <FileDown size={14} className="mr-1" /> Virement bancaire (CSV)
            </GhButton>}
            {canManageHr && <GhButton size="sm" variant="secondary" onClick={handleCloseMonth} disabled={isPeriodClosed}>
              {isPeriodClosed ? <Lock size={14} className="mr-1" /> : <Download size={14} className="mr-1" />} Clôturer le mois
            </GhButton>}
            {canManageHr && <GhButton size="sm" onClick={() => setShowNew(true)} disabled={isPeriodClosed}>
              <Plus size={14} className="mr-1" /> Nouvel employé
            </GhButton>}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          {canManageHr && <TabsTrigger value="dashboard" className="gap-1"><BarChart3 size={13} /> Tableau de bord</TabsTrigger>}
          <TabsTrigger value="employes" className="gap-1"><Users size={13} /> {canManageHr ? "Employés" : "Ma fiche"}</TabsTrigger>
          {canManageHr && <TabsTrigger value="variables" className="gap-1"><CalendarClock size={13} /> Variables</TabsTrigger>}
          <TabsTrigger value="conges" className="gap-1"><CalendarDays size={13} /> Congés</TabsTrigger>
          <TabsTrigger value="contrats" className="gap-1"><FileSignature size={13} /> Contrats</TabsTrigger>
          <TabsTrigger value="notes-frais" className="gap-1"><Receipt size={13} /> Notes de frais</TabsTrigger>
          {canManageHr && <TabsTrigger value="declarations" className="gap-1"><ShieldCheck size={13} /> Déclarations</TabsTrigger>}
          {!canManageHr && <TabsTrigger value="mes-bulletins" className="gap-1"><FileText size={13} /> Mes bulletins</TabsTrigger>}
          {canManageHr && <TabsTrigger value="parametres" className="gap-1"><Settings size={13} /> Paramètres</TabsTrigger>}
          {canManageHr && <TabsTrigger value="conventions" className="gap-1"><BookOpen size={13} /> Conventions</TabsTrigger>}
          {canManageHr && <TabsTrigger value="entreprise" className="gap-1"><Building2 size={13} /> Entreprise</TabsTrigger>}
          {canManageHr && <TabsTrigger value="audit" className="gap-1"><History size={13} /> Audit</TabsTrigger>}
        </TabsList>

        {/* ═══ DASHBOARD ═══ */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Effectif" value={String(employees.length)} note="Employés actifs" color="blue" icon={<Users size={18} />} />
            <StatCard label="Masse salariale brute" value={`${fmtXOF(totaux.brut)} F`} note="Total mensuel" color="green" icon={<DollarSign size={18} />} />
            <StatCard label="Net total" value={`${fmtXOF(totaux.net)} F`} note="À verser" color="purple" icon={<TrendingUp size={18} />} />
            <StatCard label="Charges patronales" value={`${fmtXOF(totaux.charges)} F`} note="Cotisations" color="amber" icon={<DollarSign size={18} />} />
          </div>

          {/* Charts */}
          {employees.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GhCard title="Répartition par statut">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statutData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`}>
                      {statutData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </GhCard>
              <GhCard title="Répartition par contrat">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={contratData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} (${value})`}>
                      {contratData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </GhCard>
              <GhCard title="Masse salariale par statut">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={salaryByStatut}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v: number) => fmtXOF(v) + " F"} />
                    <Bar dataKey="brut" name="Brut" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="net" name="Net" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </GhCard>
            </div>
          )}

          {/* Top 5 salaires */}
          {allPaies.length > 0 && (
            <GhCard title="Top salaires bruts">
              <div className="space-y-1">
                {[...allPaies].sort((a, b) => b.paie.brut - a.paie.brut).slice(0, 5).map((emp, i) => (
                  <div key={emp.id} className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-muted/30 text-[12px]">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="font-medium">{emp.prenom} {emp.nom}</span>
                      <span className="text-muted-foreground">· {emp.fonction}</span>
                    </div>
                    <span className="font-mono font-bold text-primary">{fmtXOF(emp.paie.brut)} F</span>
                  </div>
                ))}
              </div>
            </GhCard>
          )}

          {/* Payroll History — filterable */}
          {canManageHr && (
            <GhCard title={<div className="flex items-center gap-2"><History size={14} /> Historique des paies</div> as any}>
              <div className="flex flex-wrap gap-2 mb-3 items-center text-xs">
                <span className="text-muted-foreground">Filtrer :</span>
                <Select value={String(historyMonth)} onValueChange={v => setHistoryMonth(v === "all" ? "all" : Number(v))}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les mois</SelectItem>
                    {MOIS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={String(historyYear)} onValueChange={v => setHistoryYear(v === "all" ? "all" : Number(v))}>
                  <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes années</SelectItem>
                    {historyYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={historyStatus} onValueChange={v => setHistoryStatus(v as any)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="calculated">Calculé</SelectItem>
                    <SelectItem value="validated">Validé</SelectItem>
                    <SelectItem value="closed">Clôturé</SelectItem>
                  </SelectContent>
                </Select>
                <span className="ml-auto text-muted-foreground">{filteredRuns.length} période(s)</span>
              </div>
              <div className="space-y-1">
                {filteredRuns.length === 0 && (
                  <div className="py-6 text-center text-xs text-muted-foreground">Aucune paie trouvée pour ce filtre</div>
                )}
                {filteredRuns.map((r: any) => {
                  const slipCount = (r.hr_payslips ?? []).length;
                  const statusVariant = r.status === "closed" ? "default" : r.status === "draft" ? "secondary" : "outline";
                  return (
                    <div key={r.id} className="flex flex-wrap justify-between items-center gap-2 py-2 px-3 text-[11px] rounded border border-border/50 hover:bg-muted/30">
                      <div className="flex items-center gap-2 min-w-[160px]">
                        {r.status === "closed" ? <Lock size={12} className="text-primary" /> : <CalendarClock size={12} className="text-muted-foreground" />}
                        <span className="font-medium">{MOIS[r.mois]} {r.annee}</span>
                        <Badge variant={statusVariant as any} className="h-4 text-[9px] px-1.5">{r.status}</Badge>
                      </div>
                      <span className="text-muted-foreground">{r.nb_employes ?? 0} emp.</span>
                      <span className="text-muted-foreground">{slipCount} bulletin{slipCount > 1 ? "s" : ""}</span>
                      <span className="font-mono">Brut: {fmtXOF(r.total_brut ?? 0)} F</span>
                      <span className="font-mono text-primary font-bold">Net: {fmtXOF(r.total_net ?? 0)} F</span>
                    </div>
                  );
                })}
              </div>
            </GhCard>
          )}
        </TabsContent>

        {/* ═══ VARIABLES ═══ */}
        <TabsContent value="variables" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard label="Période" value={`${MOIS[payrollMonth]} ${payrollYear}`} note="Variables mensuelles" color="blue" icon={<CalendarClock size={18} />} />
            <StatCard label="Employés variables" value={String(variables.length)} note="Saisies enregistrées" color="green" icon={<Users size={18} />} />
            <StatCard label="Net prévisionnel" value={`${fmtXOF(totaux.net)} F`} note="Après variables" color="purple" icon={<TrendingUp size={18} />} />
          </div>
          <VariablesTab employees={employees} variables={variables} onSave={(v) => isPeriodClosed ? toast.error("Cette période est clôturée") : saveVariable.mutateAsync(v)} />
        </TabsContent>

        {/* ═══ EMPLOYÉS ═══ */}
        <TabsContent value="employes" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative max-w-sm flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un employé..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" />
            </div>
            <Badge variant="outline" className="text-[10px] gap-1">
              <ShieldCheck size={11} />
              {canManageHr ? "Vue complète RH" : "Vue restreinte — votre fiche uniquement"}
            </Badge>
            {canManageHr && selectedIds.size > 0 && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
                <button onClick={() => setSelectedIds(new Set())} className="ml-1 hover:text-destructive">×</button>
              </Badge>
            )}
            {canManageHr && (
              <GhButton size="sm" variant="secondary" onClick={() => {
                try { exportRegistrePersonnelXlsx(employees); toast.success("Registre exporté"); }
                catch (e: any) { toast.error(e?.message ?? "Export impossible"); }
              }} disabled={employees.length === 0}>
                <FileDown size={14} className="mr-1" /> Registre du personnel
              </GhButton>
            )}
          </div>

          <GhCard title={`Liste des employés (${filtered.length})`} className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  {canManageHr && (
                    <th className="py-2 px-3 w-8">
                      <Checkbox
                        checked={filtered.length > 0 && filtered.every(e => e.id && selectedIds.has(e.id))}
                        onCheckedChange={toggleAllFiltered}
                        aria-label="Tout sélectionner"
                      />
                    </th>
                  )}
                  <th className="py-2 px-3">Matricule</th>
                  <th className="py-2 px-3">Nom complet</th>
                  <th className="py-2 px-3">Fonction</th>
                  <th className="py-2 px-3">Statut</th>
                  <th className="py-2 px-3">Contrat</th>
                  <th className="py-2 px-3 text-right">Salaire base</th>
                  <th className="py-2 px-3 text-right">Brut</th>
                  <th className="py-2 px-3 text-right">Net</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    {canManageHr && (
                      <td className="py-2.5 px-3">
                        <Checkbox
                          checked={!!emp.id && selectedIds.has(emp.id)}
                          onCheckedChange={() => emp.id && toggleSelected(emp.id)}
                          aria-label={`Sélectionner ${emp.prenom} ${emp.nom}`}
                        />
                      </td>
                    )}
                    <td className="py-2.5 px-3 font-mono">{emp.matricule}</td>
                    <td className="py-2.5 px-3 font-medium">{emp.prenom} {emp.nom}</td>
                    <td className="py-2.5 px-3">{emp.fonction}</td>
                    <td className="py-2.5 px-3 capitalize">{emp.statut}</td>
                    <td className="py-2.5 px-3">{emp.contrat}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{fmtXOF(emp.salaire_base)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{fmtXOF(emp.paie.brut)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">{fmtXOF(emp.paie.net)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setShowBulletin(emp)} className="p-1.5 rounded hover:bg-primary/10 text-primary" title="Bulletin"><Eye size={13} /></button>
                        <button onClick={() => setShowForm(emp)} className="p-1.5 rounded hover:bg-muted" title="Modifier"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(emp.id!)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Supprimer"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={canManageHr ? 10 : 9} className="py-8 text-center text-muted-foreground">Aucun employé trouvé</td></tr>
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-primary/20 bg-primary/5 font-bold text-xs">
                    <td colSpan={canManageHr ? 6 : 5} className="py-2 px-3 text-primary">TOTAUX — {filtered.length} employé{filtered.length > 1 ? "s" : ""}</td>
                    <td className="py-2 px-3 text-right font-mono">{fmtXOF(filtered.reduce((s, e) => s + e.salaire_base, 0))}</td>
                    <td className="py-2 px-3 text-right font-mono">{fmtXOF(filtered.reduce((s, e) => s + e.paie.brut, 0))}</td>
                    <td className="py-2 px-3 text-right font-mono text-primary">{fmtXOF(filtered.reduce((s, e) => s + e.paie.net, 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </GhCard>
        </TabsContent>

        {/* ═══ PARAMÈTRES ═══ */}
        <TabsContent value="parametres" className="mt-4">
          <ParametresTab params={params} onSave={(p) => { setParams(p); payrollSettings.save.mutate(p as any); }} />
        </TabsContent>

        {/* ═══ CONVENTIONS ═══ */}
        <TabsContent value="conventions" className="mt-4">
          <HrAgreementsPanel />
        </TabsContent>

        {/* ═══ ENTREPRISE ═══ */}
        <TabsContent value="entreprise" className="mt-4">
          <EntrepriseTab entreprise={entreprise} onSave={setEntreprise} />
        </TabsContent>

        {/* ═══ CONGÉS ═══ */}
        <TabsContent value="conges" className="mt-4">
          <HrLeavesPanel
            canManage={canManageHr}
            restrictedEmployeeId={!canManageHr && employees[0]?.id ? employees[0].id : null}
          />
        </TabsContent>

        {/* ═══ CONTRATS ═══ */}
        <TabsContent value="contrats" className="mt-4">
          <HrContractsPanel
            canManage={canManageHr}
            restrictedEmployeeId={!canManageHr && employees[0]?.id ? employees[0].id : null}
          />
        </TabsContent>

        {/* ═══ NOTES DE FRAIS ═══ */}
        <TabsContent value="notes-frais" className="mt-4">
          <HrExpensesPanel
            canManageHr={canManageHr}
            restrictedEmployeeId={!canManageHr && employees[0]?.id ? employees[0].id : null}
          />
        </TabsContent>

        {/* ═══ MES BULLETINS (self-service) ═══ */}
        {!canManageHr && employees[0]?.id && (
          <TabsContent value="mes-bulletins" className="mt-4">
            <HrSelfServicePanel employeeId={employees[0].id} />
          </TabsContent>
        )}

        {/* ═══ DÉCLARATIONS LÉGALES ═══ */}
        {canManageHr && (
          <TabsContent value="declarations" className="mt-4">
            <HrDeclarationsPanel />
          </TabsContent>
        )}

        {/* ═══ AUDIT TRAIL RH ═══ */}
        {canManageHr && (
          <TabsContent value="audit" className="mt-4">
            <HrAuditPanel />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      {showNew && <EmployeeFormDialog emp={{ ...EMPTY_EMP }} onSave={handleSave} onClose={() => setShowNew(false)} existingMats={employees.map(e => e.matricule)} conventions={conventions} users={assignableUsers} locked={isPeriodClosed} />}
      {showForm && <EmployeeFormDialog emp={showForm} onSave={handleSave} onClose={() => setShowForm(null)} existingMats={employees.filter(e => e.id !== showForm.id).map(e => e.matricule)} conventions={conventions} users={assignableUsers} locked={isPeriodClosed} />}
      {showBulletin && <BulletinModal emp={showBulletin} params={params} entreprise={entreprise} orgSettings={orgSettings} defaultMois={payrollMonth} defaultAnnee={payrollYear} onClose={() => setShowBulletin(null)} />}

      {/* Bulk PDF — confirmation */}
      <AlertDialog open={bulkConfirm} onOpenChange={setBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><FileDown size={16} /> {selectedIds.size > 0 ? `Générer les ${exportTargets.length} bulletins sélectionnés ?` : "Générer tous les bulletins du mois ?"}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-xs">
                <div>Période : <b>{MOIS[payrollMonth]} {payrollYear}</b></div>
                <div>Portée : <b>{selectedIds.size > 0 ? `${exportTargets.length} employé(s) sélectionné(s)` : `tous les employés (${exportTargets.length})`}</b></div>
                <div>Total brut : <b>{fmtXOF(exportTotals.brut)} F</b> · Total net : <b>{fmtXOF(exportTotals.net)} F</b></div>
                <div className="flex items-start gap-2 p-2 bg-muted/40 rounded text-muted-foreground">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>Chaque bulletin sera vérifié (recalcul brut/net) avant téléchargement. En cas d’incohérence, le bulletin est ignoré.</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkExport}><FileDown size={14} className="mr-1" /> Générer {exportTargets.length} PDF</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk PDF — progress */}
      {bulkProgress && (
        <Dialog open onOpenChange={() => {}}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FileDown size={16} /> Génération des bulletins</DialogTitle>
              <DialogDescription>{MOIS[payrollMonth]} {payrollYear} — {bulkProgress.current} / {bulkProgress.total}</DialogDescription>
            </DialogHeader>
            <Progress value={Math.round((bulkProgress.current / bulkProgress.total) * 100)} />
            <div className="text-[11px] text-muted-foreground text-center">
              {bulkProgress.running ? "Traitement en cours, ne fermez pas cette fenêtre…" : <><CheckCircle2 size={12} className="inline mr-1 text-primary" /> Terminé</>}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
