import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PayrollResult } from "@/lib/payroll";

/**
 * Snapshot d'un bulletin clôturé tel que stocké dans hr_payslips.
 */
export interface PayslipSnapshot {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  mois: number;
  annee: number;
  reference: string | null;
  employee_snapshot: any;
  variables_snapshot: any;
  calculation_snapshot: PayrollResult;
  gross_total: number;
  net_total: number;
  employer_charges: number;
}

export interface PayrollRunWithPayslips {
  id: string;
  mois: number;
  annee: number;
  status: "draft" | "calculated" | "validated" | "closed" | "cancelled";
  closed_at: string | null;
  validated_at: string | null;
  hr_payslips: PayslipSnapshot[];
}

/**
 * Agrégats par caisse pour une période donnée.
 */
export interface DeclarationTotals {
  // Effectif & masse
  effectif: number;
  masseSalarialeBrute: number;
  totalNet: number;
  totalChargesPatronales: number;

  // IPRES
  ipresRG_salarial: number;
  ipresRG_patronal: number;
  ipresRC_salarial: number;
  ipresRC_patronal: number;
  ipresTotal: number;

  // CSS
  cssAF: number;
  cssAT: number;
  cssTotal: number;
  baseCSS: number;

  // Impôts
  ir: number;
  trimf: number;
  cfce: number;

  // IPM
  ipm_salarial: number;
  ipm_patronal: number;

  // BRS
  brs: number;
}

const ZERO_TOTALS: DeclarationTotals = {
  effectif: 0,
  masseSalarialeBrute: 0,
  totalNet: 0,
  totalChargesPatronales: 0,
  ipresRG_salarial: 0,
  ipresRG_patronal: 0,
  ipresRC_salarial: 0,
  ipresRC_patronal: 0,
  ipresTotal: 0,
  cssAF: 0,
  cssAT: 0,
  cssTotal: 0,
  baseCSS: 0,
  ir: 0,
  trimf: 0,
  cfce: 0,
  ipm_salarial: 0,
  ipm_patronal: 0,
  brs: 0,
};

export function aggregateDeclarations(payslips: PayslipSnapshot[]): DeclarationTotals {
  const t = { ...ZERO_TOTALS };
  t.effectif = payslips.length;
  for (const p of payslips) {
    const c = p.calculation_snapshot || ({} as PayrollResult);
    t.masseSalarialeBrute += Number(p.gross_total ?? c.brut ?? 0);
    t.totalNet += Number(p.net_total ?? c.net ?? 0);
    t.totalChargesPatronales += Number(p.employer_charges ?? c.chargesPat ?? 0);
    t.ipresRG_salarial += Number(c.ipresRG_s ?? 0);
    t.ipresRG_patronal += Number(c.ipresRG_p ?? 0);
    t.ipresRC_salarial += Number(c.ipresRC_s ?? 0);
    t.ipresRC_patronal += Number(c.ipresRC_p ?? 0);
    t.cssAF += Number(c.css_af ?? 0);
    t.cssAT += Number(c.css_at ?? 0);
    t.baseCSS += Number(c.baseCSS ?? 0);
    t.ir += Number(c.ir ?? 0);
    t.trimf += Number(c.trimf ?? 0);
    t.cfce += Number(c.cfce ?? 0);
    t.ipm_salarial += Number(c.ipm_s ?? 0);
    t.ipm_patronal += Number(c.ipm_p ?? 0);
    t.brs += Number(c.brs ?? 0);
  }
  t.ipresTotal = t.ipresRG_salarial + t.ipresRG_patronal + t.ipresRC_salarial + t.ipresRC_patronal;
  t.cssTotal = t.cssAF + t.cssAT;
  return t;
}

/**
 * Charge tous les bulletins pour une période (mois + année) ou une année complète.
 * Filtre uniquement les paies validées ou clôturées.
 */
export function useHrDeclarations(filters: { annee: number; mois?: number; onlyClosed?: boolean }) {
  const { annee, mois, onlyClosed = true } = filters;
  const { data, isLoading } = useQuery({
    queryKey: ["hr_declarations", annee, mois, onlyClosed],
    queryFn: async () => {
      let q = supabase
        .from("hr_payroll_runs")
        .select("id, mois, annee, status, closed_at, validated_at, hr_payslips(*)")
        .eq("annee", annee)
        .order("mois");
      if (mois) q = q.eq("mois", mois);
      const { data: runs, error } = await q;
      if (error) throw error;
      const filtered = (runs ?? []).filter((r: any) =>
        onlyClosed ? r.status === "closed" || r.status === "validated" : true,
      ) as unknown as PayrollRunWithPayslips[];
      const allPayslips = filtered.flatMap((r) => r.hr_payslips ?? []);
      const totals = aggregateDeclarations(allPayslips);
      return { runs: filtered, payslips: allPayslips, totals };
    },
  });

  return {
    runs: data?.runs ?? [],
    payslips: data?.payslips ?? [],
    totals: data?.totals ?? ZERO_TOTALS,
    isLoading,
  };
}
