import * as XLSX from "xlsx-js-style";
import { supabase } from "@/integrations/supabase/client";

/**
 * Export Budget PAERID — reproduction fidèle du canevas Excel original :
 * - 4 feuilles (Budget Global, Détail par WP, Récap par Catégorie, Hypothèses)
 * - Structure 30+ sous-postes (WP1.1-WP4.6, GC.1-GC.4, SE.1-SE.3) avec catégories nommées
 * - Formules cross-sheet vivantes pointant vers la Feuille 2 pré-remplie
 * - Marqueurs Genre/Climat différenciés selon poste (✓, ✓✓, ○)
 * - Ordre logique : WP1→WP4→GC→SE→ST→IMP→TOT (sans doublon)
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
const titleStyle = {
  font: { bold: true, color: { rgb: C.headerFg }, sz: 14, name: "Calibri" },
  fill: { fgColor: { rgb: C.headerBg } },
  alignment: { horizontal: "center", vertical: "center" },
};
const subtitleStyle = {
  font: { italic: true, color: { rgb: C.headerFg }, sz: 10 },
  fill: { fgColor: { rgb: C.headerSubBg } },
  alignment: { horizontal: "center", vertical: "center" },
};

function setCell(ws: any, addr: string, value: any, style?: any, formula?: string) {
  ws[addr] = formula
    ? { f: formula, t: "n", s: style }
    : { v: value, t: typeof value === "number" ? "n" : "s", s: style };
}

interface ExportOptions {
  projectId: string;
  projectName?: string;
  currency?: string;
}

/**
 * Catalogue des 30 sous-postes du canevas PAERID :
 * code, libellé, catégorie, marqueur genre, marqueur climat, notes
 */
const SUBPOSTES: Array<{
  wp: string;
  code: string;
  label: string;
  category: string;
  gender: string;
  climate: string;
  notes: string;
}> = [
  // ═══════ WP1 — Renforcement des compétences & structuration ═══════
  { wp: "WP1", code: "WP1.1", label: "Ressources humaines (équipe terrain, formateurs)", category: "Ressources Humaines", gender: "✓", climate: "○", notes: "Animateurs, conseillers d'entreprises, experts" },
  { wp: "WP1", code: "WP1.2", label: "Formation & renforcement des capacités", category: "Formation", gender: "✓", climate: "○", notes: "Modules, sessions, per diem participants" },
  { wp: "WP1", code: "WP1.3", label: "Accompagnement à la formalisation (NINEA/RCCM)", category: "Services Techniques", gender: "✓", climate: "○", notes: "Frais juridiques, appui administratif" },
  { wp: "WP1", code: "WP1.4", label: "Outils numériques de gestion (licences, applis)", category: "Équipements & TIC", gender: "✓", climate: "○", notes: "Abonnements logiciels, tablettes" },
  { wp: "WP1", code: "WP1.5", label: "Coaching individualisé & mentorat", category: "Services Techniques", gender: "✓", climate: "○", notes: "Mentors pairs, experts sectoriels" },
  { wp: "WP1", code: "WP1.6", label: "Inclusion femmes & jeunes (dispositifs ciblés)", category: "Activités Opérationnelles", gender: "✓✓", climate: "○", notes: "Actions positives, réseaux féminins" },
  // ═══════ WP2 — Accès aux marchés & développement commercial ═══════
  { wp: "WP2", code: "WP2.1", label: "Ressources humaines (spécialiste marchés, chargés)", category: "Ressources Humaines", gender: "✓", climate: "○", notes: "Spécialiste chaînes de valeur, agents commerciaux" },
  { wp: "WP2", code: "WP2.2", label: "Études de marché & analyse des débouchés", category: "Services Techniques", gender: "✓", climate: "○", notes: "Consultants, enquêtes filières" },
  { wp: "WP2", code: "WP2.3", label: "Branding, packaging & certification qualité", category: "Services Techniques", gender: "✓", climate: "○", notes: "Design, labels, normes alimentaires" },
  { wp: "WP2", code: "WP2.4", label: "Participation à foires, salons & événements", category: "Activités Opérationnelles", gender: "✓", climate: "○", notes: "Stands, transport, hébergement" },
  { wp: "WP2", code: "WP2.5", label: "Développement de la présence digitale (e-commerce)", category: "Équipements & TIC", gender: "✓", climate: "○", notes: "Création sites, formation e-commerce" },
  { wp: "WP2", code: "WP2.6", label: "Plateforme de vente directe (développement/maintenance)", category: "Investissements", gender: "✓", climate: "○", notes: "Hébergement, maintenance, évolutions" },
  { wp: "WP2", code: "WP2.7", label: "Mise en relation & intermédiation commerciale", category: "Activités Opérationnelles", gender: "✓", climate: "○", notes: "Forums d'affaires, matchmaking B2B" },
  // ═══════ WP3 — Accès au financement & investissement productif ═══════
  { wp: "WP3", code: "WP3.1", label: "Ressources humaines (spécialiste finance, juriste)", category: "Ressources Humaines", gender: "✓", climate: "○", notes: "Expert bancabilité, conseiller financier" },
  { wp: "WP3", code: "WP3.2", label: "Diagnostic bancabilité & éducation financière", category: "Formation", gender: "✓", climate: "○", notes: "Ateliers, outils d'évaluation" },
  { wp: "WP3", code: "WP3.3", label: "Appui élaboration plans d'affaires & dossiers", category: "Services Techniques", gender: "✓", climate: "○", notes: "Consultants, modèles financiers" },
  { wp: "WP3", code: "WP3.4", label: "Journées d'intermédiation financière", category: "Activités Opérationnelles", gender: "✓", climate: "○", notes: "SFD, banques, fonds d'investissement" },
  { wp: "WP3", code: "WP3.5", label: "Fonds d'amorçage / subventions productives (pilote)", category: "Transferts", gender: "✓", climate: "✓", notes: "Équipements transformation, ENR, irrigation" },
  { wp: "WP3", code: "WP3.6", label: "Suivi post-financement & accompagnement invest.", category: "S&E", gender: "✓", climate: "✓", notes: "Audit utilisation fonds, reporting" },
  // ═══════ WP4 — Innovation, durabilité & écosystème ═══════
  { wp: "WP4", code: "WP4.1", label: "Ressources humaines (expert innovation, ingén. ENR)", category: "Ressources Humaines", gender: "✓", climate: "✓✓", notes: "Ingénieurs ENR, spécialiste écoconception" },
  { wp: "WP4", code: "WP4.2", label: "Hub d'Innovation Rurale (aménagement & équipement)", category: "Investissements", gender: "✓", climate: "✓", notes: "Mobilier, matériel, connectivité (invest. Y1)" },
  { wp: "WP4", code: "WP4.3", label: "Technologies vertes & pratiques durables (ENR, eau)", category: "Investissements", gender: "✓", climate: "✓✓", notes: "Kits solaires, systèmes irrigation économes" },
  { wp: "WP4", code: "WP4.4", label: "Innovation produits & écoconception", category: "Services Techniques", gender: "✓", climate: "✓", notes: "Prototypage, R&D appliqué, nutrition" },
  { wp: "WP4", code: "WP4.5", label: "Réseau de mentors, pairs & experts thématiques", category: "Services Techniques", gender: "✓", climate: "○", notes: "Honoraires mentors, ateliers de capitalisation" },
  { wp: "WP4", code: "WP4.6", label: "Capitalisation & diffusion des bonnes pratiques", category: "Communication", gender: "✓", climate: "✓", notes: "Publications, vidéos, ateliers restitution" },
  // ═══════ GC — Gouvernance, Coordination & Gestion du projet ═══════
  { wp: "GC", code: "GC.1", label: "Chef de projet & équipe de coordination", category: "Ressources Humaines", gender: "✓", climate: "○", notes: "Chef projet, assistants, admin/finance" },
  { wp: "GC", code: "GC.2", label: "Frais de fonctionnement & logistique bureaux", category: "Fonctionnement", gender: "○", climate: "○", notes: "Loyers, fournitures, communication" },
  { wp: "GC", code: "GC.3", label: "Déplacements & missions terrain", category: "Logistique", gender: "○", climate: "○", notes: "Per diem, carburant, véhicules" },
  { wp: "GC", code: "GC.4", label: "Audit externe & contrôle financier", category: "Audit", gender: "○", climate: "○", notes: "Cabinet d'audit, contrôles annuels" },
  // ═══════ SE — Suivi & Évaluation, Apprentissage, Communication ═══════
  { wp: "SE", code: "SE.1", label: "Système de suivi-évaluation & MEAL", category: "S&E", gender: "✓", climate: "✓", notes: "Outils digitaux, base de données, enquêtes" },
  { wp: "SE", code: "SE.2", label: "Évaluations à mi-parcours & finale (indépendantes)", category: "S&E", gender: "✓", climate: "✓", notes: "Évaluateurs externes, missions terrain" },
  { wp: "SE", code: "SE.3", label: "Communication & visibilité projet", category: "Communication", gender: "✓", climate: "○", notes: "Site web, vidéos, événements, presse" },
];

const WP_LABELS: Record<string, string> = {
  WP1: "WP1 — Renforcement des compétences & structuration",
  WP2: "WP2 — Accès aux marchés & développement commercial",
  WP3: "WP3 — Accès au financement & investissement productif",
  WP4: "WP4 — Innovation, durabilité & écosystème entrepreneurial",
  GC: "Gouvernance, Coordination & Gestion du projet",
  SE: "Suivi & Évaluation, Apprentissage et Communication",
};

const WP_ORDER = ["WP1", "WP2", "WP3", "WP4", "GC", "SE"];

export async function exportBudgetToExcel({ projectId, projectName = "PAERID", currency = "USD" }: ExportOptions) {
  // Fetch project data + template fallback
  const tplIdRes = await supabase.from("project_templates").select("id").eq("code", "PAERID").single();
  const tplId = tplIdRes.data?.id ?? "";

  const [detailsRes, tplDetailsRes, tplAssumpRes] = await Promise.all([
    supabase.from("project_budget_details").select("*").eq("project_id", projectId).order("sort_order"),
    supabase.from("project_template_budget_details").select("*").eq("template_id", tplId).order("sort_order"),
    supabase.from("project_template_assumptions").select("*").eq("template_id", tplId).order("sort_order"),
  ]);

  const details = (detailsRes.data && detailsRes.data.length > 0) ? detailsRes.data : (tplDetailsRes.data ?? []);
  const assumptions = tplAssumpRes.data ?? [];

  const wb = XLSX.utils.book_new();

  // ╔════════════════════════════════════════════════════════════════════╗
  // ║  FEUILLE 2 : Détail par WP (créée d'abord car référencée par F1)  ║
  // ╚════════════════════════════════════════════════════════════════════╝
  const ws2: any = {};
  setCell(ws2, "A1", `${projectName} — BUDGET DÉTAILLÉ PAR WORK PACKAGE ET PAR ACTIVITÉ (${currency})`, titleStyle);
  setCell(ws2, "A2", "Ventilation détaillée par activité, catégorie de dépenses et année", subtitleStyle);

  const headers2 = ["Code Activité", "Activité / Description", "Catégorie de Dépenses", "Unité", "Qté", "Coût Unitaire", "Année 1\n2026", "Année 2\n2027", "Année 3\n2028", "Année 4\n2029", "Année 5\n2030", "TOTAL\n5 ANS"];
  headers2.forEach((h, i) => setCell(ws2, XLSX.utils.encode_cell({ r: 2, c: i }), h, headerStyle));

  // Group details by WP
  const wpGroups: Record<string, any[]> = {};
  details.forEach(d => {
    const wp = (d as any).work_package || "WP1";
    (wpGroups[wp] = wpGroups[wp] || []).push(d);
  });

  let row = 3;
  const wpRowMap: Record<string, { start: number; end: number }> = {};
  // Map sub-poste code (WP1.2) → row in feuille 2 to allow precise cross-sheet refs
  const subPosteRowMap: Record<string, number> = {};
  // Fallback: rows by WP in sequential order (for code mismatches like A1.1 vs WP1.1)
  const wpRowsSequence: Record<string, number[]> = {};

  WP_ORDER.filter(wp => wpGroups[wp]?.length).forEach(wp => {
    setCell(ws2, XLSX.utils.encode_cell({ r: row, c: 0 }), WP_LABELS[wp], wpRowStyle);
    // Stretch wp-row across all 12 columns visually
    for (let c = 1; c < 12; c++) setCell(ws2, XLSX.utils.encode_cell({ r: row, c }), "", wpRowStyle);
    row++;
    const start = row;
    wpRowsSequence[wp] = [];
    wpGroups[wp].forEach(d => {
      const r = row;
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 0 }), d.code, cellStyle);
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 1 }), d.activity, cellStyle);
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 2 }), d.category, cellStyle);
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 3 }), d.unit, cellStyle);
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 4 }), Number(d.quantity) || 0, numStyle);
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 5 }), Number(d.unit_cost) || 0, numStyle);
      [d.year_1, d.year_2, d.year_3, d.year_4, d.year_5].forEach((v, i) =>
        setCell(ws2, XLSX.utils.encode_cell({ r, c: 6 + i }), Number(v) || 0, numStyle)
      );
      const excelRow = r + 1;
      setCell(ws2, XLSX.utils.encode_cell({ r, c: 11 }), 0, totalStyle, `SUM(G${excelRow}:K${excelRow})`);
      // Map sub-poste code (e.g. "WP1.2" or "A1.2") to its row for cross-sheet refs from Feuille 1
      if (d.code) subPosteRowMap[String(d.code)] = excelRow;
      wpRowsSequence[wp].push(excelRow);
      row++;
    });
    const end = row - 1;
    wpRowMap[wp] = { start, end };
    // Sous-total
    setCell(ws2, XLSX.utils.encode_cell({ r: row, c: 0 }), `SOUS-TOTAL ${wp}`, totalStyle);
    setCell(ws2, XLSX.utils.encode_cell({ r: row, c: 1 }), "", totalStyle);
    ["G", "H", "I", "J", "K", "L"].forEach((col, i) =>
      setCell(ws2, XLSX.utils.encode_cell({ r: row, c: 6 + i }), 0, totalStyle, `SUM(${col}${start + 1}:${col}${end + 1})`)
    );
    row += 2;
  });

  ws2["!ref"] = `A1:L${row}`;
  ws2["!cols"] = [{ wch: 10 }, { wch: 50 }, { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }];
  XLSX.utils.book_append_sheet(wb, ws2, "2. Détail par WP");

  // ╔════════════════════════════════════════════════════════════════════╗
  // ║  FEUILLE 1 : Budget Global (30 sous-postes structurés)            ║
  // ╚════════════════════════════════════════════════════════════════════╝
  const ws1: any = {};
  setCell(ws1, "A1", `PROJET D'APPUI À L'ENTREPRENEURIAT RURAL INNOVANT ET DURABLE (${projectName})`, titleStyle);
  setCell(ws1, "A2", `BUDGET PRÉVISIONNEL — RÉCAPITULATIF GLOBAL PAR COMPOSANTE ET PAR ANNÉE (2026–2030)  |  Montants en ${currency}`, subtitleStyle);
  setCell(ws1, "A3", "Sénégal — Régions de Kédougou, Kolda & Ziguinchor  |  Durée : 5 ans (T1 2026 – T4 2030)  |  Porteur : GROW HUB SARL", { ...subtitleStyle, font: { ...subtitleStyle.font, italic: true } });

  const h1 = ["Code", "Composante / Work Package", "Catégorie de dépenses", "Année 1\n2026", "Année 2\n2027", "Année 3\n2028", "Année 4\n2029", "Année 5\n2030", "TOTAL\n5 ANS", "% Budget\nTotal", "Marqueur\nGenre", "Marqueur\nClimat", "Notes"];
  h1.forEach((h, i) => setCell(ws1, XLSX.utils.encode_cell({ r: 3, c: i }), h, headerStyle));

  let r1 = 4;
  // Compute total general row reference (used by % formulas)
  // Will be after sous-total + imprévus → 30 sub-rows + 6 WP headers + 3 summary rows ≈ row 4 + 30 + 6 + 2 = 42 → I row 43
  // We compute lazily
  const dataStartRow1 = r1 + 1; // Excel-indexed (R5)

  WP_ORDER.forEach(wp => {
    // WP header row
    setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 0 }), wp, wpRowStyle);
    setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 1 }), WP_LABELS[wp], wpRowStyle);
    for (let c = 2; c < 13; c++) setCell(ws1, XLSX.utils.encode_cell({ r: r1, c }), "", wpRowStyle);
    r1++;

    // Sub-postes for this WP
    const wpSubpostes = SUBPOSTES.filter(sp => sp.wp === wp);
    const sequentialRows = wpRowsSequence[wp] || [];
    wpSubpostes.forEach((sp, idx) => {
      setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 0 }), sp.code, cellStyle);
      setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 1 }), sp.label, cellStyle);
      setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 2 }), sp.category, cellStyle);

      // Year columns: try exact code match first, fallback to sequential index in WP
      const matchingRow = subPosteRowMap[sp.code] ?? sequentialRows[idx];
      ["G", "H", "I", "J", "K"].forEach((col2col, i) => {
        if (matchingRow) {
          setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 3 + i }), 0, numStyle, `'2. Détail par WP'!${col2col}${matchingRow}`);
        } else {
          setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 3 + i }), 0, numStyle);
        }
      });
      const excelRow = r1 + 1;
      setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 8 }), 0, totalStyle, `SUM(D${excelRow}:H${excelRow})`);
      r1++;
    });
  });

  // Sous-total coûts directs
  const stRowIdx = r1; // 0-indexed row for sous-total
  setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 0 }), "ST", totalStyle);
  setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 1 }), "SOUS-TOTAL COÛTS DIRECTS", totalStyle);
  setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 2 }), "", totalStyle);
  ["D", "E", "F", "G", "H", "I"].forEach((col, i) =>
    setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 3 + i }), 0, totalStyle, `SUM(${col}${dataStartRow1}:${col}${r1})`)
  );
  for (let c = 9; c < 13; c++) setCell(ws1, XLSX.utils.encode_cell({ r: r1, c }), "", totalStyle);
  const stRowExcel = r1 + 1;
  r1++;

  // Imprévus (1 seule ligne)
  setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 0 }), "IMP", cellStyle);
  setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 1 }), "Imprévus (7%)", cellStyle);
  setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 2 }), "Provision pour aléas", cellStyle);
  ["D", "E", "F", "G", "H", "I"].forEach((col, i) =>
    setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 3 + i }), 0, numStyle, `'4. Hypothèses & Paramètres'!$E$6*${col}${stRowExcel}`)
  );
  const impRowExcel = r1 + 1;
  r1++;

  // TOTAL GÉNÉRAL
  setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 0 }), "TOT", totalStyle);
  setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 1 }), "TOTAL GÉNÉRAL", totalStyle);
  setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 2 }), "", totalStyle);
  ["D", "E", "F", "G", "H", "I"].forEach((col, i) =>
    setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 3 + i }), 0, totalStyle, `${col}${stRowExcel}+${col}${impRowExcel}`)
  );
  setCell(ws1, XLSX.utils.encode_cell({ r: r1, c: 9 }), 1, pctStyle);
  for (let c = 10; c < 13; c++) setCell(ws1, XLSX.utils.encode_cell({ r: r1, c }), "", totalStyle);
  const totalGeneralRowExcel = r1 + 1;

  // Now backfill the % formula and Genre/Climat/Notes columns for each sub-poste row
  // Rows are: data rows from dataStartRow1 to stRowIdx-1 in Excel terms
  let backfillRow = dataStartRow1 - 1; // back to first row (0-indexed)
  WP_ORDER.forEach(wp => {
    backfillRow++; // skip WP header
    SUBPOSTES.filter(sp => sp.wp === wp).forEach(sp => {
      const er = backfillRow + 1;
      setCell(ws1, XLSX.utils.encode_cell({ r: backfillRow, c: 9 }), 0, pctStyle, `IFERROR(I${er}/I${totalGeneralRowExcel},0)`);
      setCell(ws1, XLSX.utils.encode_cell({ r: backfillRow, c: 10 }), sp.gender, sp.gender.includes("✓") ? genderStyle : cellStyle);
      setCell(ws1, XLSX.utils.encode_cell({ r: backfillRow, c: 11 }), sp.climate, sp.climate.includes("✓") ? genderStyle : cellStyle);
      setCell(ws1, XLSX.utils.encode_cell({ r: backfillRow, c: 12 }), sp.notes, cellStyle);
      backfillRow++;
    });
  });

  ws1["!ref"] = `A1:M${r1 + 1}`;
  ws1["!cols"] = [{ wch: 8 }, { wch: 48 }, { wch: 28 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 32 }];
  ws1["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } },
  ];

  // Insert as first sheet
  wb.SheetNames.unshift("1. Budget Global");
  wb.Sheets["1. Budget Global"] = ws1;
  wb.SheetNames = ["1. Budget Global", "2. Détail par WP"];

  // ╔════════════════════════════════════════════════════════════════════╗
  // ║  FEUILLE 3 : Récapitulatif par catégorie de dépenses              ║
  // ╚════════════════════════════════════════════════════════════════════╝
  const ws3: any = {};
  setCell(ws3, "A1", `${projectName} — RÉCAPITULATIF PAR CATÉGORIE DE DÉPENSES (${currency})`, titleStyle);
  const h3 = ["#", "Catégorie de Dépenses", "Rubrique OCDE-DAC", "Année 1\n2026", "Année 2\n2027", "Année 3\n2028", "Année 4\n2029", "Année 5\n2030", "TOTAL\n5 ANS", "% Total"];
  h3.forEach((h, i) => setCell(ws3, XLSX.utils.encode_cell({ r: 2, c: i }), h, headerStyle));

  // Build categories list from SUBPOSTES (unique, ordered)
  const seen = new Set<string>();
  const categories: Array<[string, string]> = [];
  SUBPOSTES.forEach(sp => {
    if (!seen.has(sp.category)) {
      seen.add(sp.category);
      const dac = sp.category === "Ressources Humaines" ? "Salaires & Indemnités"
        : sp.category === "Formation" ? "Formation"
        : sp.category === "Services Techniques" ? "Services Techniques"
        : sp.category === "Transferts" ? "Transferts"
        : sp.category === "Équipements & TIC" ? "Investissements"
        : sp.category === "Investissements" ? "Investissements"
        : sp.category === "Activités Opérationnelles" ? "Activités Opérationnelles"
        : sp.category === "Logistique" ? "Logistique"
        : sp.category === "Fonctionnement" ? "Fonctionnement"
        : sp.category === "Communication" ? "Communication"
        : sp.category === "S&E" ? "S&E"
        : sp.category === "Audit" ? "Audit" : "Divers";
      categories.push([sp.category, dac]);
    }
  });

  let r3 = 3;
  const cat3StartRow = r3 + 1;
  categories.forEach((cat, idx) => {
    setCell(ws3, XLSX.utils.encode_cell({ r: r3, c: 0 }), idx + 1, cellStyle);
    setCell(ws3, XLSX.utils.encode_cell({ r: r3, c: 1 }), cat[0], cellStyle);
    setCell(ws3, XLSX.utils.encode_cell({ r: r3, c: 2 }), cat[1], cellStyle);
    // Use SUMIF on Feuille 1 to aggregate per category across years
    ["D", "E", "F", "G", "H"].forEach((col, ci) => {
      setCell(ws3, XLSX.utils.encode_cell({ r: r3, c: 3 + ci }), 0, numStyle,
        `SUMIF('1. Budget Global'!$C$${dataStartRow1}:$C$${stRowIdx},$B${r3 + 1},'1. Budget Global'!${col}$${dataStartRow1}:${col}$${stRowIdx})`);
    });
    const er = r3 + 1;
    setCell(ws3, XLSX.utils.encode_cell({ r: r3, c: 8 }), 0, totalStyle, `SUM(D${er}:H${er})`);
    setCell(ws3, XLSX.utils.encode_cell({ r: r3, c: 9 }), 0, pctStyle, `IFERROR(I${er}/I${cat3StartRow + categories.length + 2},0)`);
    r3++;
  });
  // Sous-total coûts directs
  setCell(ws3, XLSX.utils.encode_cell({ r: r3, c: 1 }), "SOUS-TOTAL COÛTS DIRECTS", totalStyle);
  ["D", "E", "F", "G", "H", "I"].forEach((col, i) =>
    setCell(ws3, XLSX.utils.encode_cell({ r: r3, c: 3 + i }), 0, totalStyle, `'1. Budget Global'!${col}${stRowExcel}`)
  );
  r3++;
  setCell(ws3, XLSX.utils.encode_cell({ r: r3, c: 1 }), "IMPRÉVUS (7%)", cellStyle);
  ["D", "E", "F", "G", "H", "I"].forEach((col, i) =>
    setCell(ws3, XLSX.utils.encode_cell({ r: r3, c: 3 + i }), 0, numStyle, `'1. Budget Global'!${col}${impRowExcel}`)
  );
  r3++;
  setCell(ws3, XLSX.utils.encode_cell({ r: r3, c: 1 }), "TOTAL GÉNÉRAL", totalStyle);
  ["D", "E", "F", "G", "H", "I"].forEach((col, i) =>
    setCell(ws3, XLSX.utils.encode_cell({ r: r3, c: 3 + i }), 0, totalStyle, `'1. Budget Global'!${col}${totalGeneralRowExcel}`)
  );
  setCell(ws3, XLSX.utils.encode_cell({ r: r3, c: 9 }), 1, pctStyle);

  ws3["!ref"] = `A1:J${r3 + 1}`;
  ws3["!cols"] = [{ wch: 5 }, { wch: 42 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }];
  ws3["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
  XLSX.utils.book_append_sheet(wb, ws3, "3. Récap par Catégorie");

  // ╔════════════════════════════════════════════════════════════════════╗
  // ║  FEUILLE 4 : Hypothèses & Paramètres                              ║
  // ╚════════════════════════════════════════════════════════════════════╝
  const ws4: any = {};
  setCell(ws4, "A1", `${projectName} — HYPOTHÈSES BUDGÉTAIRES & PARAMÈTRES CLÉS`, titleStyle);
  let r4 = 1;
  let lastCat = "";
  ws4["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

  assumptions.forEach(a => {
    if (a.category !== lastCat) {
      r4++;
      setCell(ws4, XLSX.utils.encode_cell({ r: r4, c: 0 }), a.category, wpRowStyle);
      ws4["!merges"]!.push({ s: { r: r4, c: 0 }, e: { r: r4, c: 5 } });
      lastCat = a.category;
      r4++;
    }
    setCell(ws4, XLSX.utils.encode_cell({ r: r4, c: 0 }), a.label, cellStyle);
    setCell(ws4, XLSX.utils.encode_cell({ r: r4, c: 1 }), a.value, cellStyle);
    setCell(ws4, XLSX.utils.encode_cell({ r: r4, c: 2 }), a.unit || "", cellStyle);
    setCell(ws4, XLSX.utils.encode_cell({ r: r4, c: 3 }), a.notes || "", cellStyle);
    // Cellule E6 réservée au taux d'imprévus (référence formule)
    if (a.label.toLowerCase().includes("imprévus")) setCell(ws4, "E6", 0.07, numStyle);
    r4++;
  });
  // Garantir que E6 contient le taux même si pas trouvé dans assumptions
  if (!ws4["E6"]) setCell(ws4, "E6", 0.07, numStyle);

  ws4["!ref"] = `A1:F${r4}`;
  ws4["!cols"] = [{ wch: 32 }, { wch: 18 }, { wch: 22 }, { wch: 50 }, { wch: 10 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws4, "4. Hypothèses & Paramètres");

  XLSX.writeFile(wb, `Budget_${projectName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
