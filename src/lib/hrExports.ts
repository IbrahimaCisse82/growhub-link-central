import { exportToExcel, type SheetData } from "./excelExport";
import { MOIS, type HrEmployee, type PayrollResult } from "./payroll";

export interface PayrollExportRow {
  emp: HrEmployee;
  paie: PayrollResult;
}

const moisLabel = (mois: number, annee: number) => `${MOIS[mois] ?? mois}_${annee}`;

/* ─────────────── Livre de paie (Excel multi-feuilles) ─────────────── */
export function exportLivreDePaieXlsx(rows: PayrollExportRow[], mois: number, annee: number) {
  if (rows.length === 0) throw new Error("Aucune donnée à exporter");

  // Feuille 1 — Synthèse complète
  const synthese = rows.map(({ emp, paie }) => ({
    matricule: emp.matricule,
    nom: `${emp.prenom} ${emp.nom}`,
    fonction: emp.fonction ?? "",
    statut: emp.statut,
    convention: emp.convention,
    categorie: emp.categorie,
    salaire_base: emp.salaire_base ?? 0,
    sursalaire: emp.sursalaire ?? 0,
    transport: paie.indemniteTransport,
    anciennete: paie.primeAnciennete,
    hs_total: paie.heuresSupp,
    brut: paie.brut,
    ipres: paie.ipres,
    css: paie.css,
    ir: paie.ir,
    trimf: paie.trimf,
    avances: (emp.avance_tabaski ?? 0) + (emp.avance_caisse ?? 0) + (emp.avance_financiere ?? 0),
    autres_retenues: paie.autresRetenues,
    net: paie.net,
    charges_pat: paie.chargesPat,
    masse_sal: paie.masse,
  }));

  // Feuille 2 — Charges patronales (ventilation IPRES/CSS/CFCE)
  const charges = rows.map(({ emp, paie }) => ({
    matricule: emp.matricule,
    nom: `${emp.prenom} ${emp.nom}`,
    brut: paie.brut,
    ipres_pat: paie.ipresPat,
    css_pat: paie.cssPat,
    cfce: paie.cfce,
    total: paie.chargesPat,
  }));

  // Feuille 3 — Retenues salariales (IR, TRIMF, IPRES, CSS)
  const retenues = rows.map(({ emp, paie }) => ({
    matricule: emp.matricule,
    nom: `${emp.prenom} ${emp.nom}`,
    brut: paie.brut,
    ipres_sal: paie.ipres,
    css_sal: paie.css,
    ir: paie.ir,
    trimf: paie.trimf,
    total_retenues: paie.ipres + paie.css + paie.ir + paie.trimf,
  }));

  const sheets: SheetData[] = [
    {
      name: `Synthèse ${MOIS[mois] ?? ""}`,
      rows: synthese,
      columns: [
        { key: "matricule", label: "Matricule" },
        { key: "nom", label: "Nom complet" },
        { key: "fonction", label: "Fonction" },
        { key: "statut", label: "Statut" },
        { key: "convention", label: "Convention" },
        { key: "categorie", label: "Catégorie" },
        { key: "salaire_base", label: "Salaire base" },
        { key: "sursalaire", label: "Sursalaire" },
        { key: "transport", label: "Transport" },
        { key: "anciennete", label: "Ancienneté" },
        { key: "hs_total", label: "Heures sup." },
        { key: "brut", label: "Brut" },
        { key: "ipres", label: "IPRES (sal.)" },
        { key: "css", label: "CSS (sal.)" },
        { key: "ir", label: "IR" },
        { key: "trimf", label: "TRIMF" },
        { key: "avances", label: "Avances" },
        { key: "autres_retenues", label: "Autres retenues" },
        { key: "net", label: "NET À PAYER" },
        { key: "charges_pat", label: "Charges patronales" },
        { key: "masse_sal", label: "Masse salariale" },
      ],
    },
    {
      name: "Charges patronales",
      rows: charges,
      columns: [
        { key: "matricule", label: "Matricule" },
        { key: "nom", label: "Nom" },
        { key: "brut", label: "Brut" },
        { key: "ipres_pat", label: "IPRES patronale" },
        { key: "css_pat", label: "CSS patronale" },
        { key: "cfce", label: "CFCE" },
        { key: "total", label: "Total charges" },
      ],
    },
    {
      name: "Retenues salariales",
      rows: retenues,
      columns: [
        { key: "matricule", label: "Matricule" },
        { key: "nom", label: "Nom" },
        { key: "brut", label: "Brut" },
        { key: "ipres_sal", label: "IPRES" },
        { key: "css_sal", label: "CSS" },
        { key: "ir", label: "IR" },
        { key: "trimf", label: "TRIMF" },
        { key: "total_retenues", label: "Total retenues" },
      ],
    },
  ];

  exportToExcel(sheets, `livre_de_paie_${moisLabel(mois, annee)}.xlsx`);
}

/* ─────────────── CSV bancaire (virement des salaires) ─────────────── */
export function exportBankCsv(rows: PayrollExportRow[], mois: number, annee: number) {
  if (rows.length === 0) throw new Error("Aucune donnée à exporter");
  const header = ["Matricule", "Beneficiaire", "Banque", "RIB/IBAN", "Montant_XOF", "Motif"];
  const lines = rows.map(({ emp, paie }) => {
    const beneficiaire = `${emp.prenom} ${emp.nom}`.replace(/[;\n\r]/g, " ");
    const banque = ((emp as any).banque ?? "").toString().replace(/[;\n\r]/g, " ");
    const rib = ((emp as any).rib ?? (emp as any).iban ?? "").toString().replace(/[;\n\r]/g, " ");
    const motif = `Salaire ${MOIS[mois] ?? ""} ${annee}`;
    return [emp.matricule, beneficiaire, banque, rib, Math.round(paie.net), motif].join(";");
  });
  const csv = [header.join(";"), ...lines].join("\r\n");
  // BOM UTF-8 pour Excel
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `virements_${moisLabel(mois, annee)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────── Registre du personnel (Excel) ─────────────── */
export function exportRegistrePersonnelXlsx(employees: HrEmployee[]) {
  const rows = employees.map(e => ({
    matricule: e.matricule,
    prenom: e.prenom,
    nom: e.nom,
    sexe: e.sexe,
    date_naissance: e.date_naissance ?? "",
    nationalite: e.nationalite ?? "",
    situation: e.situation_famille ?? "",
    enfants: e.enfants ?? 0,
    fonction: e.fonction ?? "",
    statut: e.statut,
    contrat: e.contrat,
    date_entree: e.date_entree ?? "",
    convention: e.convention,
    categorie: e.categorie ?? "",
    salaire_base: e.salaire_base ?? 0,
    telephone: e.telephone ?? "",
    email: e.email ?? "",
    actif: e.is_active ? "Oui" : "Non",
  }));
  exportToExcel([{
    name: "Registre du personnel",
    rows,
    columns: [
      { key: "matricule", label: "Matricule" },
      { key: "prenom", label: "Prénom" },
      { key: "nom", label: "Nom" },
      { key: "sexe", label: "Sexe" },
      { key: "date_naissance", label: "Date de naissance" },
      { key: "nationalite", label: "Nationalité" },
      { key: "situation", label: "Situation familiale" },
      { key: "enfants", label: "Enfants" },
      { key: "fonction", label: "Fonction" },
      { key: "statut", label: "Statut" },
      { key: "contrat", label: "Type contrat" },
      { key: "date_entree", label: "Date d'entrée" },
      { key: "convention", label: "Convention" },
      { key: "categorie", label: "Catégorie" },
      { key: "salaire_base", label: "Salaire de base" },
      { key: "telephone", label: "Téléphone" },
      { key: "email", label: "Email" },
      { key: "actif", label: "Actif" },
    ],
  }], `registre_personnel_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
