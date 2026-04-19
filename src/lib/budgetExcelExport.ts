import * as XLSX from "xlsx-js-style";
import { supabase } from "@/integrations/supabase/client";

/**
 * Export Budget PAERID — reproduction fidèle du canevas Excel original :
 * - 4 feuilles (Budget Global, Détail par WP, Récap par Catégorie, Hypothèses)
 * - Couleurs : entêtes #1F3864 (blanc), sous-totaux #FFF2CC, marqueurs Genre #E2EFDA
 * - Formules vivantes entre cellules et entre feuilles
 * - Pré-rempli depuis project_budget_lines + project_budget_details + canevas template
 */

const C = {
  headerBg: "1F3864",
  headerSubBg: "2E5FA3",
  headerFg: "FFFFFF",
  wpRowBg: "BDD7EE",
  wpRowFg: "1F3864",
  totalBg: "FFF2CC",
  rowAltBg: "F2F2F2",
  genderBg: "E2EFDA",
  border: "CCCCCC",
};

const border = { style: "thin" as const, color: { rgb: C.border } };
const borders = { top: border, bottom: border, left: border, right: border };

const headerStyle = {
  font: { bold: true, color: { rgb: C.headerFg }, sz: 11, name: "Calibri" },
  fill: { fgColor: { rgb: C.headerBg } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: borders,
};
const wpRowStyle = {
  font: { bold: true, color: { rgb: C.wpRowFg }, sz: 11 },
  fill: { fgColor: { rgb: C.wpRowBg } },
  border: borders,
};
const totalStyle = {
  font: { bold: true, color: { rgb: C.wpRowFg }, sz: 11 },
  fill: { fgColor: { rgb: C.totalBg } },
  alignment: { horizontal: "right" },
  border: borders,
  numFmt: "#,##0",
};
const cellStyle = { border: borders, alignment: { vertical: "center", wrapText: true } };
const numStyle = { ...cellStyle, alignment: { horizontal: "right" }, numFmt: "#,##0" };
const pctStyle = { ...cellStyle, alignment: { horizontal: "right" }, numFmt: "0.0%" };
const genderStyle = { ...cellStyle, fill: { fgColor: { rgb: C.genderBg } }, alignment: { horizontal: "center" } };

function setCell(ws: any, addr: string, value: any, style?: any, formula?: string) {
  ws[addr] = formula ? { f: formula, t: "n", s: style } : { v: value, t: typeof value === "number" ? "n" : "s", s: style };
}

interface ExportOptions {
  projectId: string;
  projectName?: string;
  currency?: string;
}

export async function exportBudgetToExcel({ projectId, projectName = "PAERID", currency = "USD" }: ExportOptions) {
  // Fetch project data + template fallback
  const [linesRes, detailsRes, tplDetailsRes, tplAssumpRes] = await Promise.all([
    supabase.from("project_budget_lines").select("*").eq("project_id", projectId).order("code"),
    supabase.from("project_budget_details").select("*").eq("project_id", projectId).order("sort_order"),
    supabase.from("project_template_budget_details").select("*").eq("template_id", (await supabase.from("project_templates").select("id").eq("code","PAERID").single()).data?.id ?? "").order("sort_order"),
    supabase.from("project_template_assumptions").select("*").eq("template_id", (await supabase.from("project_templates").select("id").eq("code","PAERID").single()).data?.id ?? "").order("sort_order"),
  ]);

  const projectLines = linesRes.data ?? [];
  const details = (detailsRes.data && detailsRes.data.length > 0) ? detailsRes.data : (tplDetailsRes.data ?? []);
  const assumptions = tplAssumpRes.data ?? [];

  const wb = XLSX.utils.book_new();

  // ============= FEUILLE 2 : Détail par WP (créée d'abord car référencée par F1) =============
  const ws2: any = {};
  setCell(ws2, "A1", `${projectName} — BUDGET DÉTAILLÉ PAR WORK PACKAGE ET PAR ACTIVITÉ (${currency})`, headerStyle);
  setCell(ws2, "A2", "Ventilation détaillée par activité, catégorie de dépenses et année", { ...cellStyle, font: { italic: true, sz: 9 } });

  const headers2 = ["Code Activité", "Activité / Description", "Catégorie de Dépenses", "Unité", "Qté", "Coût Unitaire", "Année 1 2026", "Année 2 2027", "Année 3 2028", "Année 4 2029", "Année 5 2030", "TOTAL 5 ANS"];
  headers2.forEach((h, i) => setCell(ws2, XLSX.utils.encode_cell({ r: 2, c: i }), h, headerStyle));

  const wpGroups: Record<string, any[]> = {};
  details.forEach(d => {
    const wp = (d as any).work_package || "WP1";
    (wpGroups[wp] = wpGroups[wp] || []).push(d);
  });
  const WP_LABELS: Record<string,string> = {
    WP1:"WP1 — Renforcement des compétences, accompagnement technique et formalisation",
    WP2:"WP2 — Accès aux marchés, développement commercial et intégration chaînes de valeur",
    WP3:"WP3 — Accès au financement, bancabilité et investissement productif",
    WP4:"WP4 — Innovation, durabilité climatique et renforcement de l'écosystème entrepreneurial",
    GC:"Gouvernance, Coordination générale & Gestion administrative et financière",
    SE:"Suivi & Évaluation, Apprentissage et Communication des résultats",
  };

  let row = 3; // 0-indexed → row 4 in Excel
  const wpRowMap: Record<string, { start: number; end: number }> = {};

  Object.keys(WP_LABELS).filter(wp => wpGroups[wp]?.length).forEach(wp => {
    setCell(ws2, XLSX.utils.encode_cell({ r: row, c: 0 }), WP_LABELS[wp], wpRowStyle);
    row++;
    const start = row;
    wpGroups[wp].forEach(d => {
      const r = row;
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 0 }), d.code, cellStyle);
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 1 }), d.activity, cellStyle);
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 2 }), d.category, cellStyle);
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 3 }), d.unit, cellStyle);
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 4 }), Number(d.quantity)||0, numStyle);
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 5 }), Number(d.unit_cost)||0, numStyle);
      [d.year_1,d.year_2,d.year_3,d.year_4,d.year_5].forEach((v,i) => setCell(ws2, XLSX.utils.encode_cell({r,c:6+i}), Number(v)||0, numStyle));
      const excelRow = r + 1;
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 11 }), 0, totalStyle, `SUM(G${excelRow}:K${excelRow})`);
      row++;
    });
    const end = row - 1;
    wpRowMap[wp] = { start, end };
    // Sous-total
    setCell(ws2, XLSX.utils.encode_cell({ r: row, c: 0 }), `SOUS-TOTAL ${wp}`, totalStyle);
    ["G","H","I","J","K","L"].forEach((col, i) => {
      setCell(ws2, XLSX.utils.encode_cell({r:row,c:6+i}), 0, totalStyle, `SUM(${col}${start+1}:${col}${end+1})`);
    });
    row += 2;
  });

  ws2["!ref"] = `A1:L${row}`;
  ws2["!cols"] = [{wch:10},{wch:50},{wch:22},{wch:12},{wch:8},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:14}];
  ws2["!merges"] = [{ s:{r:0,c:0}, e:{r:0,c:11} },{ s:{r:1,c:0}, e:{r:1,c:11} }];
  XLSX.utils.book_append_sheet(wb, ws2, "2. Détail par WP");

  // ============= FEUILLE 1 : Budget Global =============
  const ws1: any = {};
  setCell(ws1, "A1", `PROJET ${projectName} — BUDGET PRÉVISIONNEL GLOBAL`, headerStyle);
  setCell(ws1, "A2", `Récapitulatif par composante et par année (2026-2030) — ${currency}`, { ...cellStyle, font: { italic: true, sz: 9, color: { rgb: C.headerFg } }, fill: { fgColor: { rgb: C.headerSubBg } } });

  const h1 = ["Code","Composante / Work Package","Catégorie de dépenses","Année 1 2026","Année 2 2027","Année 3 2028","Année 4 2029","Année 5 2030","TOTAL 5 ANS","% Budget","Marqueur Genre","Marqueur Climat","Notes"];
  h1.forEach((h,i) => setCell(ws1, XLSX.utils.encode_cell({r:3,c:i}), h, headerStyle));

  let r1 = 4;
  const sourceLines = projectLines.length > 0 ? projectLines : [
    {code:"WP1",label:"WP1 — Renforcement des compétences",section:"WP1",year1:0,year2:0,year3:0,year4:0,year5:0,notes:""},
    {code:"WP2",label:"WP2 — Accès aux marchés",section:"WP2",year1:0,year2:0,year3:0,year4:0,year5:0,notes:""},
    {code:"WP3",label:"WP3 — Accès au financement",section:"WP3",year1:0,year2:0,year3:0,year4:0,year5:0,notes:""},
    {code:"WP4",label:"WP4 — Innovation & durabilité",section:"WP4",year1:0,year2:0,year3:0,year4:0,year5:0,notes:""},
    {code:"GC",label:"Gouvernance & Coordination",section:"GC",year1:0,year2:0,year3:0,year4:0,year5:0,notes:""},
    {code:"SE",label:"Suivi & Évaluation",section:"SE",year1:0,year2:0,year3:0,year4:0,year5:0,notes:""},
  ];

  const totalRowExcel = 4 + sourceLines.length + 2; // for I% reference
  sourceLines.forEach(line => {
    setCell(ws1, XLSX.utils.encode_cell({r:r1,c:0}), line.code, wpRowStyle);
    setCell(ws1, XLSX.utils.encode_cell({r:r1,c:1}), line.label, wpRowStyle);
    setCell(ws1, XLSX.utils.encode_cell({r:r1,c:2}), "—", cellStyle);
    const wpKey = line.section || line.code;
    const wpInfo = wpRowMap[wpKey];
    ["year1","year2","year3","year4","year5"].forEach((y,i) => {
      const col = String.fromCharCode(68+i); // D..H
      const formula = wpInfo ? `'2. Détail par WP'!${String.fromCharCode(71+i)}${wpInfo.end+2}` : undefined;
      if (formula) setCell(ws1, XLSX.utils.encode_cell({r:r1,c:3+i}), 0, numStyle, formula);
      else setCell(ws1, XLSX.utils.encode_cell({r:r1,c:3+i}), Number((line as any)[y])||0, numStyle);
    });
    const excelRow = r1+1;
    setCell(ws1, XLSX.utils.encode_cell({r:r1,c:8}), 0, totalStyle, `SUM(D${excelRow}:H${excelRow})`);
    setCell(ws1, XLSX.utils.encode_cell({r:r1,c:9}), 0, pctStyle, `IFERROR(I${excelRow}/I${totalRowExcel},0)`);
    setCell(ws1, XLSX.utils.encode_cell({r:r1,c:10}), "✓", genderStyle);
    setCell(ws1, XLSX.utils.encode_cell({r:r1,c:11}), "○", cellStyle);
    setCell(ws1, XLSX.utils.encode_cell({r:r1,c:12}), line.notes || "", cellStyle);
    r1++;
  });

  // Sous-total coûts directs
  setCell(ws1, XLSX.utils.encode_cell({r:r1,c:0}), "ST", totalStyle);
  setCell(ws1, XLSX.utils.encode_cell({r:r1,c:1}), "SOUS-TOTAL COÛTS DIRECTS", totalStyle);
  ["D","E","F","G","H","I"].forEach((col,i) => {
    setCell(ws1, XLSX.utils.encode_cell({r:r1,c:3+i}), 0, totalStyle, `SUM(${col}5:${col}${r1})`);
  });
  const stRow = r1 + 1;
  r1++;

  // Imprévus
  setCell(ws1, XLSX.utils.encode_cell({r:r1,c:0}), "IMP", cellStyle);
  setCell(ws1, XLSX.utils.encode_cell({r:r1,c:1}), "Imprévus (7%)", cellStyle);
  ["D","E","F","G","H","I"].forEach((col,i) => {
    setCell(ws1, XLSX.utils.encode_cell({r:r1,c:3+i}), 0, numStyle, `'4. Hypothèses & Paramètres'!E6*${col}${stRow}`);
  });
  r1++;

  // TOTAL
  setCell(ws1, XLSX.utils.encode_cell({r:r1,c:0}), "TOT", totalStyle);
  setCell(ws1, XLSX.utils.encode_cell({r:r1,c:1}), "TOTAL GÉNÉRAL", totalStyle);
  ["D","E","F","G","H","I"].forEach((col,i) => {
    setCell(ws1, XLSX.utils.encode_cell({r:r1,c:3+i}), 0, totalStyle, `${col}${stRow}+${col}${stRow+1}`);
  });
  setCell(ws1, XLSX.utils.encode_cell({r:r1,c:9}), 1, pctStyle);

  ws1["!ref"] = `A1:M${r1+1}`;
  ws1["!cols"] = [{wch:8},{wch:42},{wch:30},{wch:13},{wch:13},{wch:13},{wch:13},{wch:13},{wch:14},{wch:10},{wch:14},{wch:14},{wch:30}];
  ws1["!merges"] = [{s:{r:0,c:0},e:{r:0,c:12}},{s:{r:1,c:0},e:{r:1,c:12}}];

  // Insert as first sheet
  wb.SheetNames.unshift("1. Budget Global");
  wb.Sheets["1. Budget Global"] = ws1;
  wb.SheetNames = ["1. Budget Global", "2. Détail par WP"];

  // ============= FEUILLE 3 : Récap par Catégorie =============
  const ws3: any = {};
  setCell(ws3, "A1", `${projectName} — RÉCAPITULATIF PAR CATÉGORIE DE DÉPENSES (${currency})`, headerStyle);
  const h3 = ["#","Catégorie de Dépenses","Rubrique OCDE-DAC","Année 1","Année 2","Année 3","Année 4","Année 5","TOTAL 5 ANS","% Total"];
  h3.forEach((h,i) => setCell(ws3, XLSX.utils.encode_cell({r:2,c:i}), h, headerStyle));

  const cats = [
    ["Ressources Humaines (personnel clé & terrain)","Salaires & Indemnités"],
    ["Formation & Renforcement des Capacités","Formation"],
    ["Consultants & Experts externes","Services Techniques"],
    ["Subventions & Fonds d'Amorçage","Transferts"],
    ["Équipements, TIC & Outils numériques","Investissements"],
    ["Infrastructures (Hub, plateformes)","Investissements"],
    ["Événementiel, Réseautage & Foires","Activités Opérationnelles"],
    ["Transport & Logistique terrain","Logistique"],
    ["Fonctionnement & Administration","Fonctionnement"],
    ["Communication & Visibilité","Communication"],
    ["Suivi-Évaluation & Études","S&E"],
    ["Audit & Contrôle externe","Audit"],
  ];
  let r3 = 3;
  cats.forEach((c,idx) => {
    setCell(ws3, XLSX.utils.encode_cell({r:r3,c:0}), idx+1, cellStyle);
    setCell(ws3, XLSX.utils.encode_cell({r:r3,c:1}), c[0], cellStyle);
    setCell(ws3, XLSX.utils.encode_cell({r:r3,c:2}), c[1], cellStyle);
    [3,4,5,6,7].forEach(ci => setCell(ws3, XLSX.utils.encode_cell({r:r3,c:ci}), 0, numStyle));
    const er = r3+1;
    setCell(ws3, XLSX.utils.encode_cell({r:r3,c:8}), 0, totalStyle, `SUM(D${er}:H${er})`);
    setCell(ws3, XLSX.utils.encode_cell({r:r3,c:9}), 0, pctStyle, `IFERROR(I${er}/I${r3+3},0)`);
    r3++;
  });
  setCell(ws3, XLSX.utils.encode_cell({r:r3,c:1}), "SOUS-TOTAL COÛTS DIRECTS", totalStyle);
  ["D","E","F","G","H","I"].forEach((col,i) => setCell(ws3, XLSX.utils.encode_cell({r:r3,c:3+i}), 0, totalStyle, `'1. Budget Global'!${col}${stRow}`));
  r3++;
  setCell(ws3, XLSX.utils.encode_cell({r:r3,c:1}), "IMPRÉVUS (7%)", cellStyle);
  ["D","E","F","G","H","I"].forEach((col,i) => setCell(ws3, XLSX.utils.encode_cell({r:r3,c:3+i}), 0, numStyle, `'4. Hypothèses & Paramètres'!E6*'1. Budget Global'!${col}${stRow}`));
  r3++;
  setCell(ws3, XLSX.utils.encode_cell({r:r3,c:1}), "TOTAL GÉNÉRAL", totalStyle);
  ["D","E","F","G","H","I"].forEach((col,i) => setCell(ws3, XLSX.utils.encode_cell({r:r3,c:3+i}), 0, totalStyle, `'1. Budget Global'!${col}${stRow+2}`));
  setCell(ws3, XLSX.utils.encode_cell({r:r3,c:9}), 1, pctStyle);

  ws3["!ref"] = `A1:J${r3+1}`;
  ws3["!cols"] = [{wch:5},{wch:42},{wch:25},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:14},{wch:10}];
  ws3["!merges"] = [{s:{r:0,c:0},e:{r:0,c:9}}];
  XLSX.utils.book_append_sheet(wb, ws3, "3. Récap par Catégorie");

  // ============= FEUILLE 4 : Hypothèses & Paramètres =============
  const ws4: any = {};
  setCell(ws4, "A1", `${projectName} — HYPOTHÈSES BUDGÉTAIRES & PARAMÈTRES CLÉS`, headerStyle);
  let r4 = 1;
  let lastCat = "";
  assumptions.forEach(a => {
    if (a.category !== lastCat) {
      r4++;
      setCell(ws4, XLSX.utils.encode_cell({r:r4,c:0}), a.category, wpRowStyle);
      ws4["!merges"] = ws4["!merges"] || [];
      ws4["!merges"].push({s:{r:r4,c:0},e:{r:r4,c:5}});
      lastCat = a.category;
      r4++;
    }
    setCell(ws4, XLSX.utils.encode_cell({r:r4,c:0}), a.label, cellStyle);
    setCell(ws4, XLSX.utils.encode_cell({r:r4,c:1}), a.value, cellStyle);
    setCell(ws4, XLSX.utils.encode_cell({r:r4,c:2}), a.unit || "", cellStyle);
    setCell(ws4, XLSX.utils.encode_cell({r:r4,c:3}), a.notes || "", cellStyle);
    // Cellule E6 : valeur numérique du taux d'imprévus pour formules cross-sheet
    if (a.label.includes("imprévus")) setCell(ws4, "E6", 0.07, numStyle);
    r4++;
  });
  ws4["!ref"] = `A1:F${r4}`;
  ws4["!cols"] = [{wch:30},{wch:18},{wch:30},{wch:50},{wch:10},{wch:30}];
  (ws4["!merges"] = ws4["!merges"] || []).unshift({s:{r:0,c:0},e:{r:0,c:5}});
  XLSX.utils.book_append_sheet(wb, ws4, "4. Hypothèses & Paramètres");

  XLSX.writeFile(wb, `Budget_${projectName}_${new Date().toISOString().slice(0,10)}.xlsx`);
}
