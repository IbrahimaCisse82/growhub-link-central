/** Export Excel DGID : remplit le modèle officiel (55 feuilles) à partir de la balance SYSCOHADA. */
import XLSX from "xlsx-js-style";
import template from "@/assets/modele_etats_financiers_DGID_Nouveau.xlsx.asset.json";
import { STATEMENT_MAP, matches, type MapLine } from "@/lib/plaquette";
import type { BalLine } from "@/lib/syscohada";

export interface DgidIdentity { denomination: string; sigle?: string | null; adresse?: string | null; ninea?: string | null; exerciceClos: string; dureeMois: number }

const ACTIF_ROW: Record<string, number> = { AD: 9, AI: 14, AP: 20, AQ: 21, BA: 25, BB: 26, BH: 28, BI: 29, BJ: 30, BQ: 32, BR: 33, BS: 34, BU: 36 };
const PASSIF_ROW: Record<string, number> = { CA: 9, CB: 10, CD: 11, CE: 12, CF: 13, CG: 14, CH: 15, CL: 17, CM: 18, DA: 20, DB: 21, DC: 22, DH: 25, DI: 26, DJ: 27, DK: 28, DM: 29, DN: 30, DQ: 33, DR: 34, DV: 36 };
const RESULT_ROW: Record<string, number> = { TA: 8, RA: 9, RB: 10, TB: 12, TC: 13, TD: 14, TE: 16, TF: 17, TG: 18, TH: 19, TI: 20, RC: 21, RD: 22, RE: 23, RF: 24, RG: 25, RH: 26, RI: 27, RJ: 28, RK: 30, TJ: 32, RL: 33, TK: 35, TL: 36, TM: 37, RM: 38, RN: 39, TN: 42, TO: 43, RO: 44, RP: 45, RQ: 47, RS: 48 };
/** Comptes à double sens : l'actif reprend les soldes débiteurs, le passif les soldes créditeurs. */
const MIXED = /^(4[0-7]|5)/;

const isAmort = (code: string, m: MapLine) => (m.amort ?? []).some((p) => code.startsWith(p));

export function computeDgidLines(rows: BalLine[]) {
  const actif: Record<string, { brut: number; amort: number }> = {};
  const passif: Record<string, number> = {};
  const resultat: Record<string, number> = {};
  for (const m of STATEMENT_MAP) {
    const hit = rows.filter((r) => matches(r.code, m));
    if (m.statement === "Actif") {
      let brut = 0, amort = 0;
      for (const r of hit) {
        if (isAmort(r.code, m)) amort += -r.solde;
        else if (!MIXED.test(r.code) || r.solde > 0) brut += r.solde;
      }
      actif[m.ref] = { brut, amort };
    } else if (m.statement === "Passif") {
      passif[m.ref] = hit.reduce((s, r) => s + (MIXED.test(r.code) ? (r.solde < 0 ? -r.solde : 0) : -r.solde), 0);
    } else {
      const total = hit.reduce((s, r) => s + r.solde, 0);
      resultat[m.ref] = m.ref.startsWith("T") ? -total : total;
    }
  }
  return { actif, passif, resultat };
}

const put = (ws: XLSX.WorkSheet, addr: string, v: string | number) => {
  const prev = ws[addr] as XLSX.CellObject | undefined;
  ws[addr] = { ...(prev ?? {}), t: typeof v === "number" ? "n" : "s", v, f: undefined, w: undefined } as XLSX.CellObject;
};
const fx = (ws: XLSX.WorkSheet, addr: string, f: string) => {
  const prev = ws[addr] as XLSX.CellObject | undefined;
  ws[addr] = { ...(prev ?? {}), t: "n", v: 0, f, w: undefined } as XLSX.CellObject;
};

export async function exportDgidToExcel(rows: BalLine[], id: DgidIdentity, fileName = "Etats_financiers_DGID.xlsx") {
  const res = await fetch(template.url);
  if (!res.ok) throw new Error(`Modèle DGID indisponible (${res.status})`);
  const wb = XLSX.read(await res.arrayBuffer(), { type: "array", cellStyles: true, cellFormula: true });
  const garde = wb.Sheets["Page de garde"], r1 = wb.Sheets["Fiche R1"];
  if (garde) { put(garde, "C35", id.denomination); put(garde, "C41", id.sigle ?? ""); put(garde, "C46", id.adresse ?? ""); put(garde, "C51", id.ninea ?? ""); }
  if (r1) { put(r1, "J4", id.denomination); put(r1, "J7", id.adresse ?? ""); put(r1, "AD7", id.sigle ?? ""); put(r1, "J10", id.ninea ?? ""); put(r1, "V10", id.exerciceClos); put(r1, "AH10", id.dureeMois); }

  const { actif, passif, resultat } = computeDgidLines(rows);
  const bilan = wb.Sheets["BILAN PAYSAGE"];
  if (bilan) {
    for (const [ref, row] of Object.entries(ACTIF_ROW)) {
      const v = actif[ref] ?? { brut: 0, amort: 0 };
      put(bilan, `D${row}`, Math.round(v.brut)); put(bilan, `E${row}`, Math.round(v.amort)); put(bilan, `F${row}`, Math.round(v.brut - v.amort));
    }
    for (const [ref, row] of Object.entries(PASSIF_ROW)) put(bilan, `K${row}`, Math.round(passif[ref] ?? 0));
  }
  if (bilan) {
    for (const c of ["D", "E", "F"]) {
      fx(bilan, `${c}24`, `${c}9+${c}14+${c}20+${c}21`); fx(bilan, `${c}31`, `${c}25+${c}26+${c}28+${c}29+${c}30`);
      fx(bilan, `${c}35`, `${c}32+${c}33+${c}34`); fx(bilan, `${c}37`, `${c}24+${c}31+${c}35+${c}36`);
    }
    fx(bilan, "K19", "SUM(K9:K18)"); fx(bilan, "K23", "K20+K21+K22"); fx(bilan, "K24", "K19+K23");
    fx(bilan, "K31", "SUM(K25:K30)"); fx(bilan, "K35", "K33+K34"); fx(bilan, "K37", "K24+K31+K35+K36");
  }
  const cr = wb.Sheets["COMPTE DE RESULTAT"];
  if (cr) {
    for (const [ref, row] of Object.entries(RESULT_ROW)) put(cr, `E${row}`, Math.round(resultat[ref] ?? 0));
    const t: Record<number, string> = {
      11: "E8-E9-E10", 15: "E8+E12+E13+E14", 29: "E11+E12+E13+E14+SUM(E16:E20)-SUM(E21:E28)", 31: "E29-E30",
      34: "E31+E32-E33", 40: "E35+E36+E37-E38-E39", 41: "E34+E40", 46: "E42+E43-E44-E45", 49: "E41+E46-E47-E48",
    };
    for (const [row, f] of Object.entries(t)) fx(cr, `E${row}`, f);
  }

  wb.Workbook = { ...(wb.Workbook ?? {}), CalcPr: { fullCalcOnLoad: true } } as XLSX.WorkBook["Workbook"];
  XLSX.writeFile(wb, fileName, { bookType: "xlsx", cellStyles: true });
  return { actif, passif, resultat };
}
