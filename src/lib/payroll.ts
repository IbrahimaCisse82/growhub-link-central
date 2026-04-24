// ══════════════════════════════════════════════════════════════════════════════
// Types & Interfaces for HR Payroll Module (adapted from G-SENPAIE)
// ══════════════════════════════════════════════════════════════════════════════

export interface HrEmployee {
  id?: string;
  user_id?: string | null;
  archived_at?: string | null;
  matricule: string;
  prenom: string;
  nom: string;
  sexe: "M" | "F";
  date_naissance: string;
  lieu_naissance: string;
  nationalite: string;
  adresse: string;
  telephone: string;
  email: string;
  situation_famille: string;
  femmes: number;
  enfants: number;
  fonction: string;
  convention: string;
  categorie: string;
  statut: string;
  contrat: string;
  date_entree: string;
  salaire_base: number;
  sursalaire: number;
  heures_absence: number;
  heures_abs_maladie: number;
  taux_maladie: number;
  nb_paniers: number;
  hs_115: number;
  hs_140: number;
  hs_160: number;
  hs_200: number;
  avance_tabaski: number;
  avance_caisse: number;
  avance_financiere: number;
  ret_cooperative: number;
  frais_medicaux: number;
  ind_kilometrique: number;
  is_active: boolean;
}

export interface PayrollParams {
  CFCE: CotisationParam;
  BRS: CotisationParam;
  IPRES_RG: CotisationParam;
  IPRES_RCC: CotisationParam;
  CSS_AF: CotisationParam;
  CSS_AT: CotisationParam;
  IPM: CotisationParam;
  transport: { label: string; valeur: number };
}

export interface CotisationParam {
  label: string;
  taux: number;
  tauxSalarial: number;
  tauxPatronal: number;
  plafond: number | null;
}

export interface PayrollResult {
  salaireBase: number;
  sursalaire: number;
  primeAnc: number;
  brut: number;
  ir: number;
  trimf: number;
  brs: number;
  ipresRG_s: number;
  ipresRC_s: number;
  ipm_s: number;
  totalRet: number;
  cfce: number;
  ipresRG_p: number;
  ipresRC_p: number;
  css_af: number;
  css_at: number;
  ipm_p: number;
  chargesPat: number;
  transport: number;
  net: number;
  masse: number;
  anc: number;
  ancRate: number;
  baseCSS: number;
  partsIR: number;
  partsTRIMFCap: number;
  tauxHoraire: number;
  retAbsence: number;
  indMaladie: number;
  mtHS115: number;
  mtHS140: number;
  mtHS160: number;
  mtHS200: number;
  totalHS: number;
  primePanier: number;
  indKilometrique: number;
  totalAvances: number;
  avanceTabaski: number;
  avanceCaisse: number;
  avanceFinanciere: number;
  retCooperative: number;
  fraisMedicaux: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// Default Payroll Params (Senegal)
// ══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_PAYROLL_PARAMS: PayrollParams = {
  CFCE: { label: "CFCE", taux: 0.03, tauxSalarial: 0, tauxPatronal: 1, plafond: null },
  BRS: { label: "BRS", taux: 0, tauxSalarial: 1, tauxPatronal: 0, plafond: null },
  IPRES_RG: { label: "IPRES R.G.", taux: 0.14, tauxSalarial: 0.4, tauxPatronal: 0.6, plafond: 432000 },
  IPRES_RCC: { label: "IPRES R.C.C.", taux: 0.06, tauxSalarial: 0.4, tauxPatronal: 0.6, plafond: 1296000 },
  CSS_AF: { label: "CSS Alloc. Fam.", taux: 0.07, tauxSalarial: 0, tauxPatronal: 1, plafond: 63000 },
  CSS_AT: { label: "CSS Acc. Trav.", taux: 0.01, tauxSalarial: 0, tauxPatronal: 1, plafond: 63000 },
  IPM: { label: "IPM", taux: 0, tauxSalarial: 0.5, tauxPatronal: 0.5, plafond: null },
  transport: { label: "Ind. Transport", valeur: 26000 },
};

export const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

// ══════════════════════════════════════════════════════════════════════════════
// Payroll Calculation Engine
// ══════════════════════════════════════════════════════════════════════════════

export function getAnciennete(dateEntree: string, refDate?: Date): number {
  if (!dateEntree) return 0;
  const ref = refDate || new Date();
  return Math.max(0, Math.floor((ref.getTime() - new Date(dateEntree).getTime()) / (365.25 * 86400000)));
}

export function getTauxAnciennete(anc: number): number {
  if (anc < 2) return 0;
  return anc / 100;
}

function calculerTRIMF(brut: number, part: number): number {
  const ba = brut * 12;
  let t = 900;
  if (ba >= 12000000) t = part * 36000;
  else if (ba >= 7000000) t = part * 18000;
  else if (ba >= 2000000) t = part * 12000;
  else if (ba >= 1000000) t = part * 4800;
  else if (ba >= 600000) t = part * 3600;
  return t / 12;
}

export function calculerPaie(emp: HrEmployee, p: PayrollParams, refDate?: Date): PayrollResult {
  const anc = getAnciennete(emp.date_entree, refDate);
  const ancRate = getTauxAnciennete(anc);
  const primeAnc = (emp.salaire_base || 0) * ancRate;

  const TH = 173.33;
  const tauxHoraire = (emp.salaire_base || 0) / TH;

  const mtHS115 = (emp.hs_115 || 0) * tauxHoraire * 1.15;
  const mtHS140 = (emp.hs_140 || 0) * tauxHoraire * 1.40;
  const mtHS160 = (emp.hs_160 || 0) * tauxHoraire * 1.60;
  const mtHS200 = (emp.hs_200 || 0) * tauxHoraire * 2.00;
  const totalHS = mtHS115 + mtHS140 + mtHS160 + mtHS200;

  const retAbsence = (emp.heures_absence || 0) * tauxHoraire;
  const indMaladie = (emp.heures_abs_maladie || 0) * tauxHoraire * (emp.taux_maladie || 0);
  const primePanier = (emp.nb_paniers || 0) * 3000;
  const indKilometrique = emp.ind_kilometrique || 0;

  const brut = (emp.salaire_base || 0) + (emp.sursalaire || 0) + primeAnc + totalHS - retAbsence + indMaladie;

  const partsIR = emp.situation_famille === "Marié(e)"
    ? 1.5 + (emp.enfants || 0) * 0.5
    : 1 + (emp.enfants || 0) * 0.5;

  const brutAnnuel = brut * 12;
  const abatt = Math.min(brutAnnuel * 0.3, 900000);
  const baseImposable = brutAnnuel - abatt;
  const baseArr = Math.floor((baseImposable / partsIR) / 1000) * 1000;
  let irParPart = 0;
  if (baseArr > 13500000) irParPart = 4359000 + (baseArr - 13500000) * 0.40;
  else if (baseArr > 8000000) irParPart = 2324000 + (baseArr - 8000000) * 0.37;
  else if (baseArr > 4000000) irParPart = 924000 + (baseArr - 4000000) * 0.35;
  else if (baseArr > 1500000) irParPart = 174000 + (baseArr - 1500000) * 0.30;
  else if (baseArr > 630000) irParPart = (baseArr - 630000) * 0.20;
  const ir = Math.max(0, (irParPart * partsIR) / 12);

  const partsTRIMFCap = Math.min(1 + (emp.femmes || 0), 5);
  const trimf = calculerTRIMF(brut, partsTRIMFCap);

  const baseRG = p.IPRES_RG.plafond ? Math.min(brut, p.IPRES_RG.plafond) : brut;
  const ipresRG_s = baseRG * p.IPRES_RG.taux * p.IPRES_RG.tauxSalarial;
  const ipresRG_p = baseRG * p.IPRES_RG.taux * p.IPRES_RG.tauxPatronal;

  const baseRC = emp.statut === "cadres"
    ? (p.IPRES_RCC.plafond ? Math.min(brut, p.IPRES_RCC.plafond) : brut)
    : 0;
  const ipresRC_s = baseRC * p.IPRES_RCC.taux * p.IPRES_RCC.tauxSalarial;
  const ipresRC_p = baseRC * p.IPRES_RCC.taux * p.IPRES_RCC.tauxPatronal;

  const baseCSS = p.CSS_AF.plafond ? Math.min(brut, p.CSS_AF.plafond) : brut;
  const css_af = baseCSS * p.CSS_AF.taux;
  const css_at = baseCSS * p.CSS_AT.taux;

  const cfce = brut * p.CFCE.taux;

  const ipm_s = brut * p.IPM.taux * p.IPM.tauxSalarial;
  const ipm_p = brut * p.IPM.taux * p.IPM.tauxPatronal;

  // BRS (Bordereau de Retenue à la Source) – 5% salarial
  const brs = brut * p.BRS.taux * p.BRS.tauxSalarial;

  const avanceTabaski = emp.avance_tabaski || 0;
  const avanceCaisse = emp.avance_caisse || 0;
  const avanceFinanciere = emp.avance_financiere || 0;
  const retCooperative = emp.ret_cooperative || 0;
  const fraisMedicaux = emp.frais_medicaux || 0;
  const totalAvances = avanceTabaski + avanceCaisse + avanceFinanciere + retCooperative + fraisMedicaux;

  const totalRet = ir + trimf + brs + ipresRG_s + ipresRC_s + ipm_s;
  const chargesPat = cfce + ipresRG_p + ipresRC_p + css_af + css_at + ipm_p;
  const transport = p.transport.valeur || 0;
  const net = brut - totalRet + transport + primePanier + indKilometrique - totalAvances;
  const masse = brut + chargesPat;

  return {
    salaireBase: emp.salaire_base, sursalaire: emp.sursalaire,
    primeAnc, brut, ir, trimf, brs, ipresRG_s, ipresRC_s, ipm_s, totalRet,
    cfce, ipresRG_p, ipresRC_p, css_af, css_at, ipm_p, chargesPat,
    transport, net, masse, anc, ancRate, baseCSS, partsIR, partsTRIMFCap,
    tauxHoraire, retAbsence, indMaladie, mtHS115, mtHS140, mtHS160, mtHS200, totalHS,
    primePanier, indKilometrique, totalAvances,
    avanceTabaski, avanceCaisse, avanceFinanciere, retCooperative, fraisMedicaux,
  };
}

export const fmtXOF = (n: number): string => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));
