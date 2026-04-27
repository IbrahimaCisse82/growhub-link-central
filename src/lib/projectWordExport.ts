/**
 * Export projet au format Word (.docx) — fidèle au canevas PAERID :
 * - 20 sections numérotées (0 → 19)
 * - Couleurs : H1 bg=#1B3A6B blanc, H2 navy + bordure verte #2E7D6F, H3 vert
 * - Police Arial 11pt
 * - Tableaux pour Indicateurs / Budget / Risques / Partenaires / Cadre logique
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, LevelFormat, ShadingType, WidthType, BorderStyle,
  PageBreak, Header, Footer, PageNumber,
} from "docx";
import { saveAs } from "file-saver";

interface ProjectWordData {
  project: Record<string, any>;
  logFrame: Record<string, any> | null;
  toc: Record<string, any> | null;
  indicators: Record<string, any>[];
  budgetLines: Record<string, any>[];
  budgetDetails: Record<string, any>[];
  risks: Record<string, any>[];
  milestones: Record<string, any>[];
  partners: Record<string, any>[];
}

const NAVY = "1B3A6B";
const GREEN = "2E7D6F";
const GOLD = "C5A04A";
const GREY_BORDER = "D1D5DB";
const GREY_HEADER_BG = "F1F5F9";

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: GREY_BORDER };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

const fmtNum = (n: number) => n.toLocaleString("fr-FR");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Convertit n'importe quelle valeur en texte multiligne lisible (gère arrays d'objets). */
const nl = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    return v.map(item => {
      if (item == null) return "";
      if (typeof item === "string") return item;
      if (typeof item === "object") {
        // Cas typique : { role, name, description } ou { sigle, signification }
        const obj = item as Record<string, unknown>;
        const vals = Object.values(obj).filter(x => x != null && x !== "").map(x => String(x));
        return vals.join(" — ");
      }
      return String(item);
    }).filter(Boolean).join("\n");
  }
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    return Object.entries(obj).filter(([, x]) => x != null && x !== "").map(([k, x]) => `${k}: ${x}`).join("\n");
  }
  return String(v);
};

/* ── Builders ── */
function p(text: string | TextRun[], opts: any = {}): Paragraph {
  const children = typeof text === "string" ? [new TextRun({ text, font: "Arial", size: 22 })] : text;
  return new Paragraph({ children, spacing: { after: 120 }, alignment: AlignmentType.JUSTIFIED, ...opts });
}

function multiPara(text: string): Paragraph[] {
  if (!text) return [];
  return text.split(/\n+/).filter(Boolean).map(line => p(line.trim()));
}

function h1(text: string, pageBreak = false): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: pageBreak,
    spacing: { before: 360, after: 200 },
    shading: { type: ShadingType.CLEAR, fill: NAVY, color: "auto" },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: "FFFFFF", size: 28, font: "Arial" })],
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GREEN, space: 4 } },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 24, font: "Arial" })],
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, color: GREEN, size: 22, font: "Arial" })],
  });
}

function tcell(text: string, opts: any = {}): TableCell {
  return new TableCell({
    width: { size: opts.width ?? 1500, type: WidthType.DXA },
    borders: cellBorders,
    shading: opts.header ? { type: ShadingType.CLEAR, fill: GREY_HEADER_BG, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: opts.align ?? AlignmentType.LEFT,
      children: [new TextRun({
        text: text || "",
        bold: !!opts.header || !!opts.bold,
        color: opts.header ? NAVY : (opts.color ?? "1A1A1A"),
        size: opts.header ? 18 : 20,
        font: "Arial",
      })],
    })],
  });
}

function buildTable(headers: { text: string; width: number }[], rows: (string | { text: string; bold?: boolean; color?: string })[][]): Table {
  const totalWidth = headers.reduce((s, h) => s + h.width, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: headers.map(h => h.width),
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(h => tcell(h.text, { width: h.width, header: true, align: AlignmentType.CENTER })),
      }),
      ...rows.map(r => new TableRow({
        children: r.map((cell, i) => {
          if (typeof cell === "string") return tcell(cell, { width: headers[i].width });
          return tcell(cell.text, { width: headers[i].width, bold: cell.bold, color: cell.color });
        }),
      })),
    ],
  });
}

export async function exportProjectWord(data: ProjectWordData) {
  const { project, logFrame, toc, indicators, budgetLines, budgetDetails, risks, milestones, partners } = data;
  const meta = (project.metadata ?? {}) as Record<string, any>;
  const totalBudget = budgetLines.reduce((s, l) => s + (Number(l.total_cost) || 0), 0);
  const contingencyPct = Number(meta.contingency_pct ?? 7) / 100;
  const totalWithContingency = Math.round(totalBudget * (1 + contingencyPct));
  const contingency = totalWithContingency - totalBudget;

  const children: any[] = [];

  // ═══════ COUVERTURE ═══════
  children.push(new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "DOCUMENT DE PROJET", bold: true, size: 48, font: "Arial", color: "1A1A1A" })] }));
  children.push(new Paragraph({ spacing: { before: 240 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: project.name || "Projet", bold: true, size: 36, font: "Arial", color: GREEN })] }));
  children.push(new Paragraph({ spacing: { before: 160 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: project.code || "PAERID", bold: true, size: 56, font: "Arial", color: GOLD })] }));
  children.push(new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: NAVY, space: 2 } }, children: [new TextRun({ text: "" })] }));

  // Tableau d'identification
  const coverRowsAll: [string, string][] = [
    ["Intitulé du projet", project.name || ""],
    ["Pays", project.country || ""],
    ["Zones d'intervention", (project.locations as string[])?.join(", ") || nl(meta.lieux_implementation)],
    ["Durée", project.duration_months ? `${project.duration_months} mois` : nl(meta.duree_programme)],
    ["Secteurs prioritaires", nl(meta.secteurs_prioritaires)],
    ["Porteur du projet", nl(meta.porteur)],
    ["Budget total", totalWithContingency ? `${fmtNum(totalWithContingency)} USD` : nl(meta.budget_total_label)],
    ["Alignement ODD", nl(meta.alignement_odd)],
    ["Version du document", nl(meta.version_document)],
  ];
  const coverRows: [string, string][] = coverRowsAll.filter((r): r is [string, string] => Boolean(r[1]));

  children.push(new Paragraph({ spacing: { before: 480 }, children: [new TextRun({ text: "" })] }));
  children.push(new Table({
    width: { size: 8000, type: WidthType.DXA },
    columnWidths: [3000, 5000],
    rows: coverRows.map(([k, v]) => new TableRow({
      children: [tcell(k, { width: 3000, bold: true, color: GREEN }), tcell(v, { width: 5000 })],
    })),
  }));

  // ═══════ 0. ABRÉVIATIONS ═══════
  children.push(h1("0. Liste des abréviations", true));
  const abrevs = meta.abreviations;
  if (Array.isArray(abrevs) && abrevs.length > 0 && typeof abrevs[0] === "object") {
    children.push(buildTable(
      [{ text: "Sigle", width: 2000 }, { text: "Signification", width: 6000 }],
      (abrevs as { sigle?: string; signification?: string }[])
        .filter(a => a.sigle)
        .map(a => [{ text: a.sigle ?? "", bold: true, color: NAVY }, a.signification ?? ""]),
    ));
  } else {
    children.push(...multiPara(nl(abrevs)));
  }

  // ═══════ 1. RÉSUMÉ EXÉCUTIF ═══════
  children.push(h1("1. Résumé exécutif", true));
  children.push(...multiPara(nl(meta.resume_executif)));

  // ═══════ 2. DESCRIPTION ═══════
  children.push(h1("2. Description du projet", true));
  children.push(...multiPara(nl(meta.description_projet) || project.description || ""));

  // ═══════ 3. INTRODUCTION ═══════
  children.push(h1("3. Introduction", true));
  children.push(...multiPara(nl(meta.introduction)));

  // ═══════ 4. CONTEXTE ═══════
  children.push(h1("4. Contexte et justification du projet", true));
  children.push(...multiPara(nl(meta.contexte_justification)));
  children.push(h2("4.1. Contexte territorial des régions du sud du Sénégal"));
  children.push(...multiPara(nl(meta.contexte_territorial)));
  children.push(h2("4.2. Contraintes structurelles et vulnérabilités"));
  children.push(...multiPara(nl(meta.contraintes) || nl(meta.contraintes_vulnerabilites)));
  children.push(h2("4.3. Alignement avec les orientations stratégiques"));
  children.push(...multiPara(nl(meta.alignement_strategique)));
  children.push(h2("4.4. Justification de l'intervention"));
  children.push(...multiPara(nl(meta.justification)));

  // ═══════ 5. THÉORIE DU CHANGEMENT ═══════
  children.push(h1("5. Théorie du changement", true));
  if (meta.theorie_changement) children.push(...multiPara(nl(meta.theorie_changement)));
  if (toc) {
    children.push(h2("5.1 Cheminement du changement"));
    if (toc.inputs) { children.push(h3("Intrants")); children.push(...multiPara(nl(toc.inputs))); }
    if (toc.activities) { children.push(h3("Activités")); children.push(...multiPara(nl(toc.activities))); }
    if (toc.outputs) { children.push(h3("Extrants (Outputs)")); children.push(...multiPara(nl(toc.outputs))); }
    if (toc.outcomes) { children.push(h3("Effets (Outcomes)")); children.push(...multiPara(nl(toc.outcomes))); }
    if (toc.impact) { children.push(h3("Impact")); children.push(...multiPara(nl(toc.impact))); }
    if (toc.assumptions) { children.push(h2("5.2 Hypothèses clés")); children.push(...multiPara(nl(toc.assumptions))); }
  }
  if (meta.mecanismes_apprentissage) {
    children.push(h2("5.3 Mécanismes d'apprentissage et d'adaptation"));
    children.push(...multiPara(nl(meta.mecanismes_apprentissage)));
  }

  // ═══════ 6. OBJECTIFS ═══════
  children.push(h1("6. Objectif général et objectifs spécifiques", true));
  if (logFrame?.overall_objective) {
    children.push(h2("6.1 Objectif général"));
    children.push(...multiPara(logFrame.overall_objective));
  }
  if (Array.isArray(logFrame?.specific_objectives) && logFrame.specific_objectives.length) {
    children.push(h2("6.2 Objectifs spécifiques"));
    (logFrame.specific_objectives as string[]).forEach((obj, i) => {
      children.push(h3(`OS${i + 1}`));
      children.push(p(typeof obj === "string" ? obj : JSON.stringify(obj)));
    });
  }

  // ═══════ 7. RÉSULTATS ATTENDUS ═══════
  children.push(h1("7. Résultats attendus", true));
  if (meta.resultats_attendus) children.push(...multiPara(nl(meta.resultats_attendus)));
  if (Array.isArray(logFrame?.expected_results)) {
    (logFrame.expected_results as string[]).forEach((r, i) => {
      children.push(h3(`R${i + 1}`));
      children.push(p(typeof r === "string" ? r : JSON.stringify(r)));
    });
  }
  if (indicators.length) {
    children.push(h2("7.1 Tableau des indicateurs KPIs"));
    children.push(buildTable(
      [
        { text: "Indicateur", width: 2200 },
        { text: "Catégorie", width: 1000 },
        { text: "Réf.", width: 700 },
        { text: "Cible", width: 700 },
        { text: "Unité", width: 700 },
        { text: "Fréq.", width: 900 },
        { text: "Kédougou", width: 900 },
        { text: "Kolda", width: 800 },
        { text: "Ziguinchor", width: 900 },
      ],
      indicators.map(ind => {
        const rt = (ind.metadata?.regional_targets) || {};
        return [
          ind.name ?? "",
          ind.category ?? "",
          String(ind.baseline_value ?? "—"),
          String(ind.target_value ?? "—"),
          ind.unit ?? "",
          ind.frequency ?? "",
          String(rt.kedougou ?? "—"),
          String(rt.kolda ?? "—"),
          String(rt.ziguinchor ?? "—"),
        ];
      }),
    ));
  }

  // ═══════ 8. STRATÉGIE D'IMPLÉMENTATION ═══════
  children.push(h1("8. Stratégie d'implémentation", true));
  if (meta.strategie_objectif) { children.push(h2("8.1 Objectif de la stratégie")); children.push(...multiPara(nl(meta.strategie_objectif))); }
  if (meta.strategie_axes) { children.push(h2("8.2 Principaux axes d'action")); children.push(...multiPara(nl(meta.strategie_axes))); }
  if (meta.strategie_modalites) { children.push(h2("8.3 Modalités de mise en œuvre")); children.push(...multiPara(nl(meta.strategie_modalites))); }
  // 8.4 → 8.8 : reconstruction WP1-WP4 depuis logFrame + indicators + milestones
  const osMappings = (meta.os_mappings as string[] | undefined) ?? [];
  const lfObjectives = Array.isArray(logFrame?.specific_objectives) ? (logFrame!.specific_objectives as string[]) : [];
  const lfActivities = Array.isArray(logFrame?.activities) ? (logFrame!.activities as string[]) : [];
  const lfResults = Array.isArray(logFrame?.expected_results) ? (logFrame!.expected_results as string[]) : [];

  const buildWpFromLogframe = (n: number) => {
    const obj = lfObjectives[n - 1] || "";
    const colon = obj.indexOf(":");
    const title = colon > 0 && colon < 80 ? obj.substring(0, colon).trim() : "";
    const objective = colon > 0 && colon < 80 ? obj.substring(colon + 1).trim() : obj;
    const acts = lfActivities.filter(a => new RegExp(`^A${n}\\.\\d`, "i").test(a.trim())).join("\n");
    const res = lfResults.filter(r => new RegExp(`^R${n}\\.\\d`, "i").test(r.trim())).join("\n");
    const inds = indicators.filter(i => new RegExp(`^I${n}\\.\\d`, "i").test((i.name || "").trim())).map(i => i.name).join("\n");
    const ms = milestones.filter(m => new RegExp(`^M${n}\\.\\d`, "i").test((m.title || "").trim())).map(m => m.title).join("\n");
    return { title, objective, activities: acts, results: res, indicators: inds, milestones: ms, os_mapping: osMappings[n - 1] || "" };
  };

  const explicitWp = (meta.wp_details ?? {}) as Record<string, { title?: string; objective?: string; activities?: string; results?: string; indicators?: string; milestones?: string; os_mapping?: string }>;
  const wpKeys = ["WP1", "WP2", "WP3", "WP4", "WP5", "WP6"].slice(0, Math.max(lfObjectives.length, 4));
  const wpMeta: typeof explicitWp = {};
  wpKeys.forEach((k, i) => { wpMeta[k] = { ...buildWpFromLogframe(i + 1), ...(explicitWp[k] || {}) }; });
  const hasWp = wpKeys.some(k => wpMeta[k]?.objective || wpMeta[k]?.activities) || budgetDetails.length > 0;

  if (hasWp) {
    children.push(h2("8.4 Architecture opérationnelle — Work Packages"));
    const synthRows = wpKeys
      .filter(k => wpMeta[k]?.title || wpMeta[k]?.objective)
      .map(k => {
        const w = wpMeta[k];
        return [
          { text: `${k} — ${w.title ?? ""}`, bold: true, color: NAVY },
          w.os_mapping ?? "",
          (w.activities ?? "").split("\n").slice(0, 3).join(" • "),
        ];
      });
    if (synthRows.length) {
      children.push(buildTable(
        [{ text: "Composante (WP)", width: 3000 }, { text: "OS liés", width: 2000 }, { text: "Activités clés", width: 4000 }],
        synthRows,
      ));
    }

    // Détail par WP
    wpKeys.forEach((k, idx) => {
      const w = wpMeta[k];
      if (!w?.objective && !w?.activities && !w?.results) return;
      children.push(h2(`8.${5 + idx} ${k} — ${w.title ?? ""}`));
      if (w.objective) { children.push(h3("Objectif")); children.push(...multiPara(w.objective)); }
      if (w.activities) { children.push(h3("Activités")); children.push(...multiPara(w.activities)); }
      if (w.results) { children.push(h3("Résultats attendus")); children.push(...multiPara(w.results)); }
      if (w.indicators) { children.push(h3("Indicateurs clés")); children.push(...multiPara(w.indicators)); }
      if (w.milestones) { children.push(h3("Jalons clés")); children.push(...multiPara(w.milestones)); }

      const wpBudget = budgetDetails.filter(d => (d.work_package ?? "").toUpperCase().startsWith(k));
      if (wpBudget.length) {
        const total = wpBudget.reduce((s, d) => s + (Number(d.total) || 0), 0);
        children.push(h3(`Budget ${k} — ${fmtNum(total)} USD`));
        children.push(buildTable(
          [
            { text: "Code", width: 900 },
            { text: "Activité", width: 3500 },
            { text: "Catégorie", width: 1800 },
            { text: "Qté", width: 700 },
            { text: "Coût unit.", width: 1200 },
            { text: "Total", width: 1300 },
          ],
          wpBudget.map(d => [
            d.code ?? "",
            d.activity ?? "",
            d.category ?? "",
            String(d.quantity ?? ""),
            fmtNum(Number(d.unit_cost) || 0),
            fmtNum(Number(d.total) || 0),
          ]),
        ));
      }
    });
  }
    });
  }

  // ═══════ 9. MÉTHODOLOGIE ═══════
  children.push(h1("9. Méthodologie", true));
  children.push(...multiPara(nl(meta.methodologie)));

  // ═══════ 10. DURÉE ═══════
  children.push(h1("10. Durée du programme"));
  children.push(...multiPara(nl(meta.duree_programme) || (project.duration_months ? `${project.duration_months} mois` : "")));
  if (project.start_date && project.end_date) {
    children.push(p([
      new TextRun({ text: "Du ", font: "Arial", size: 22 }),
      new TextRun({ text: fmtDate(project.start_date), bold: true, font: "Arial", size: 22 }),
      new TextRun({ text: " au ", font: "Arial", size: 22 }),
      new TextRun({ text: fmtDate(project.end_date), bold: true, font: "Arial", size: 22 }),
    ]));
  }
  if (milestones.length) {
    children.push(h3("Jalons clés"));
    children.push(buildTable(
      [{ text: "Jalon", width: 5500 }, { text: "Échéance", width: 2000 }, { text: "Statut", width: 1500 }],
      milestones.map(m => [m.title ?? "", m.due_date ? fmtDate(m.due_date) : "—", m.status ?? "pending"]),
    ));
  }

  // ═══════ 11. LIEUX ═══════
  children.push(h1("11. Lieu(x) d'implémentation"));
  children.push(...multiPara(nl(meta.lieux_implementation) || (project.locations as string[])?.join(", ") || ""));

  // ═══════ 12. POPULATION CIBLE ═══════
  children.push(h1("12. Population cible / bénéficiaires"));
  children.push(...multiPara(nl(meta.population_cible)));
  if (meta.estimation_beneficiaires) {
    children.push(h2("12.1 Estimation des bénéficiaires"));
    children.push(...multiPara(nl(meta.estimation_beneficiaires)));
  }

  // ═══════ 13. PERSONNEL CLÉ ═══════
  children.push(h1("13. Personnel clé impliqué", true));
  children.push(...multiPara(nl(meta.personnel_cle)));

  // ═══════ 14. PARTENAIRES ═══════
  children.push(h1("14. Partenaires cibles"));
  if (meta.partenaires) children.push(...multiPara(nl(meta.partenaires)));
  if (partners.length) {
    children.push(buildTable(
      [
        { text: "Nom", width: 2500 },
        { text: "Type", width: 1500 },
        { text: "Secteur", width: 1800 },
        { text: "Pays", width: 1500 },
        { text: "Statut", width: 1700 },
      ],
      partners.map(pa => [pa.name ?? "", pa.type ?? "", pa.sector ?? "", pa.country ?? "", pa.status ?? ""]),
    ));
  }

  // ═══════ 15. SUIVI & ÉVALUATION ═══════
  children.push(h1("15. Suivi et évaluation"));
  if (meta.suivi_outils) { children.push(h2("15.1 Outils et méthodes de suivi")); children.push(...multiPara(nl(meta.suivi_outils))); }
  if (meta.suivi_evaluation) { children.push(h2("15.2 Évaluation")); children.push(...multiPara(nl(meta.suivi_evaluation))); }
  if (meta.suivi_rapports) { children.push(h2("15.3 Rapports et communication")); children.push(...multiPara(nl(meta.suivi_rapports))); }

  // ═══════ 16. PLAN DE SORTIE ═══════
  children.push(h1("16. Plan de sortie / Stratégie de durabilité"));
  children.push(...multiPara(nl(meta.plan_sortie)));

  // ═══════ 17. RISQUES ═══════
  children.push(h1("17. Analyse des risques et mesures d'atténuation", true));
  if (meta.analyse_risques) children.push(...multiPara(nl(meta.analyse_risques)));
  if (risks.length) {
    children.push(buildTable(
      [
        { text: "Risque", width: 2500 },
        { text: "Niveau", width: 1200 },
        { text: "Description", width: 2500 },
        { text: "Atténuation", width: 2800 },
      ],
      risks.map(r => {
        const lvl = r.level === "high" ? "Élevé" : r.level === "medium" ? "Moyen" : "Faible";
        const color = r.level === "high" ? "DC2626" : r.level === "medium" ? "D97706" : "16A34A";
        return [r.title ?? "", { text: lvl, bold: true, color }, r.description ?? "", r.mitigation ?? ""];
      }),
    ));
  }

  // ═══════ 18. BUDGET ═══════
  children.push(h1("18. Annexe : Budget prévisionnel", true));
  if (budgetLines.length) {
    const rows: (string | { text: string; bold?: boolean; color?: string })[][] = budgetLines.map(line => [
      line.code ?? "", line.label ?? "", line.category ?? "",
      fmtNum(Number(line.year1) || 0), fmtNum(Number(line.year2) || 0), fmtNum(Number(line.year3) || 0),
      fmtNum(Number(line.year4) || 0), fmtNum(Number(line.year5) || 0), fmtNum(Number(line.total_cost) || 0),
    ]);
    rows.push([
      { text: "Sous-total coûts directs", bold: true, color: NAVY }, "", "", "", "", "", "", "",
      { text: fmtNum(totalBudget), bold: true, color: NAVY },
    ]);
    rows.push([
      `Imprévus (${Math.round(contingencyPct * 100)}%)`, "", "", "", "", "", "", "",
      fmtNum(contingency),
    ]);
    rows.push([
      { text: "TOTAL GÉNÉRAL", bold: true, color: NAVY }, "", "", "", "", "", "", "",
      { text: `${fmtNum(totalWithContingency)} USD`, bold: true, color: NAVY },
    ]);
    children.push(buildTable(
      [
        { text: "Code", width: 700 }, { text: "Poste budgétaire", width: 2300 }, { text: "Catégorie", width: 1300 },
        { text: "An 1", width: 800 }, { text: "An 2", width: 800 }, { text: "An 3", width: 800 },
        { text: "An 4", width: 800 }, { text: "An 5", width: 800 }, { text: "Total", width: 1100 },
      ],
      rows,
    ));
  }

  // ═══════ 19. CADRE LOGIQUE ═══════
  children.push(h1("19. Cadre logique du programme", true));
  if (logFrame) {
    if (logFrame.overall_objective) { children.push(h2("Objectif global")); children.push(...multiPara(logFrame.overall_objective)); }
    if (Array.isArray(logFrame.specific_objectives)) {
      children.push(h2("Objectifs spécifiques"));
      (logFrame.specific_objectives as string[]).forEach((obj, i) => {
        children.push(p([
          new TextRun({ text: `OS${i + 1} : `, bold: true, color: GREEN, font: "Arial", size: 22 }),
          new TextRun({ text: typeof obj === "string" ? obj : JSON.stringify(obj), font: "Arial", size: 22 }),
        ]));
      });
    }
    if (Array.isArray(logFrame.expected_results)) {
      children.push(h2("Résultats attendus"));
      (logFrame.expected_results as string[]).forEach((r, i) => {
        children.push(p([
          new TextRun({ text: `R${i + 1} : `, bold: true, color: GREEN, font: "Arial", size: 22 }),
          new TextRun({ text: typeof r === "string" ? r : JSON.stringify(r), font: "Arial", size: 22 }),
        ]));
      });
    }
    if (logFrame.activities) { children.push(h2("Activités")); children.push(...multiPara(nl(logFrame.activities))); }
    if (logFrame.assumptions) { children.push(h2("Hypothèses")); children.push(...multiPara(nl(logFrame.assumptions))); }
    if (logFrame.pre_conditions) { children.push(h2("Pré-conditions")); children.push(...multiPara(nl(logFrame.pre_conditions))); }
  }
  if (indicators.length) {
    children.push(h2("Indicateurs de performance"));
    children.push(buildTable(
      [
        { text: "Indicateur", width: 2800 },
        { text: "Référence", width: 1200 },
        { text: "Cible", width: 1400 },
        { text: "Source", width: 2000 },
        { text: "Fréquence", width: 1600 },
      ],
      indicators.map(ind => [
        ind.name ?? "",
        String(ind.baseline_value ?? "—"),
        `${ind.target_value ?? "—"} ${ind.unit ?? ""}`.trim(),
        ind.data_source ?? "",
        ind.frequency ?? "",
      ]),
    ));
  }

  // ═══════ DOCUMENT ═══════
  const doc = new Document({
    creator: "GrowHub — Plateforme PAERID",
    title: project.name || "Document de projet",
    description: "Document de projet généré automatiquement selon le canevas PAERID",
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1134, bottom: 1440, left: 1134 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.LEFT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GREY_BORDER, space: 4 } },
            children: [
              new TextRun({ text: "PAERID — Projet d'Appui à l'Entrepreneuriat Rural Innovant et Durable", italics: true, color: "5D6D7E", size: 18, font: "Arial" }),
              new TextRun({ text: "\t\tSénégal — Kédougou · Kolda · Ziguinchor", color: GREEN, bold: true, size: 18, font: "Arial" }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: GREY_BORDER, space: 4 } },
            children: [
              new TextRun({ text: "Document de projet — Page ", italics: true, color: "5D6D7E", size: 18, font: "Arial" }),
              new TextRun({ children: [PageNumber.CURRENT], bold: true, color: NAVY, size: 18, font: "Arial" }),
              new TextRun({ text: " / ", color: "5D6D7E", size: 18, font: "Arial" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], bold: true, color: NAVY, size: 18, font: "Arial" }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${(project.code || project.name || "projet").replace(/[^a-z0-9]/gi, "_")}_document_projet.docx`;
  saveAs(blob, filename);
}
