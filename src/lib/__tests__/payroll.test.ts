import { describe, it, expect } from "vitest";
import {
  calculerPaie,
  getAnciennete,
  getTauxAnciennete,
  DEFAULT_PAYROLL_PARAMS,
  type HrEmployee,
} from "../payroll";

const baseEmp = (overrides: Partial<HrEmployee> = {}): HrEmployee => ({
  matricule: "M001",
  prenom: "Awa",
  nom: "Diop",
  sexe: "F",
  date_naissance: "1990-01-01",
  lieu_naissance: "Dakar",
  nationalite: "SN",
  adresse: "Dakar",
  telephone: "",
  email: "",
  situation_famille: "Célibataire",
  femmes: 0,
  enfants: 0,
  fonction: "Chargée",
  convention: "Commerce",
  categorie: "5A",
  statut: "employes",
  contrat: "CDI",
  date_entree: "2024-01-01",
  salaire_base: 300000,
  sursalaire: 0,
  heures_absence: 0,
  heures_abs_maladie: 0,
  taux_maladie: 0,
  nb_paniers: 0,
  hs_115: 0,
  hs_140: 0,
  hs_160: 0,
  hs_200: 0,
  avance_tabaski: 0,
  avance_caisse: 0,
  avance_financiere: 0,
  ret_cooperative: 0,
  frais_medicaux: 0,
  ind_kilometrique: 0,
  is_active: true,
  ...overrides,
});

describe("ancienneté", () => {
  it("retourne 0 sans date d'entrée", () => {
    expect(getAnciennete("")).toBe(0);
  });
  it("calcule les années entières", () => {
    expect(getAnciennete("2020-01-01", new Date("2026-06-01"))).toBeGreaterThanOrEqual(6);
  });
  it("taux nul avant 2 ans", () => {
    expect(getTauxAnciennete(0)).toBe(0);
    expect(getTauxAnciennete(1)).toBe(0);
  });
  it("taux = anc/100 à partir de 2 ans", () => {
    expect(getTauxAnciennete(5)).toBe(0.05);
  });
});

describe("calculerPaie — salaire simple", () => {
  const ref = new Date("2026-06-01");

  it("brut = base sans autres éléments", () => {
    const r = calculerPaie(baseEmp(), DEFAULT_PAYROLL_PARAMS, ref);
    expect(r.brut).toBeCloseTo(300000, 0);
  });

  it("applique l'IPRES RG salariale (5.6%)", () => {
    const r = calculerPaie(baseEmp(), DEFAULT_PAYROLL_PARAMS, ref);
    // 300000 * 0.14 * 0.4 = 16800
    expect(r.ipresRG_s).toBeCloseTo(16800, 0);
  });

  it("pas d'IPRES RCC pour non-cadres", () => {
    const r = calculerPaie(baseEmp({ statut: "employes" }), DEFAULT_PAYROLL_PARAMS, ref);
    expect(r.ipresRC_s).toBe(0);
    expect(r.ipresRC_p).toBe(0);
  });

  it("IPRES RCC pour cadres", () => {
    const r = calculerPaie(baseEmp({ statut: "cadres", salaire_base: 800000 }), DEFAULT_PAYROLL_PARAMS, ref);
    expect(r.ipresRC_s).toBeGreaterThan(0);
  });

  it("transport de 26 000 FCFA ajouté au net", () => {
    const r = calculerPaie(baseEmp(), DEFAULT_PAYROLL_PARAMS, ref);
    expect(r.transport).toBe(26000);
  });

  it("net = brut - retenues + transport - avances", () => {
    const r = calculerPaie(baseEmp({ avance_caisse: 10000 }), DEFAULT_PAYROLL_PARAMS, ref);
    expect(r.net).toBeCloseTo(r.brut - r.totalRet + r.transport - 10000, 0);
  });

  it("masse salariale = brut + charges patronales", () => {
    const r = calculerPaie(baseEmp(), DEFAULT_PAYROLL_PARAMS, ref);
    expect(r.masse).toBeCloseTo(r.brut + r.chargesPat, 0);
  });
});

describe("calculerPaie — heures supplémentaires", () => {
  const ref = new Date("2026-06-01");
  it("ajoute HS 115% au brut", () => {
    const r = calculerPaie(baseEmp({ hs_115: 10 }), DEFAULT_PAYROLL_PARAMS, ref);
    expect(r.mtHS115).toBeGreaterThan(0);
    expect(r.totalHS).toBeCloseTo(r.mtHS115, 2);
  });
  it("prime de panier = 3000 × nb", () => {
    const r = calculerPaie(baseEmp({ nb_paniers: 4 }), DEFAULT_PAYROLL_PARAMS, ref);
    expect(r.primePanier).toBe(12000);
  });
});
