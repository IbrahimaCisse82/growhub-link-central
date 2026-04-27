/**
 * Export project document as a structured PDF — pixel-perfect replica of the PAERID DOCX template
 * Colors: H1 bg=#1B3A6B text=white, H2 text=#1B3A6B border-bottom=#2E7D6F, H3 text=#2E7D6F
 * Font: Arial 11pt, Header: gray #5D6D7E + green #2E7D6F, Footer: gray + navy #1B3A6B
 */

interface ProjectPdfData {
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

export function exportProjectPdf({ project, logFrame, toc, indicators, budgetLines, budgetDetails, risks, milestones, partners }: ProjectPdfData) {
  const meta = (project.metadata ?? {}) as Record<string, unknown>;
  const totalBudget = budgetLines.reduce((s, l) => s + (Number(l.total_cost) || 0), 0);
  const contingencyPct = Number(meta.contingency_pct ?? 7) / 100;
  const totalWithContingency = Math.round(totalBudget * (1 + contingencyPct));

  const css = `<style>
    @page {
      margin: 25mm 20mm 20mm 20mm;
      size: A4;
      @top-left { content: ""; }
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #1a1a1a;
      line-height: 1.55;
      padding: 0 40px;
      max-width: 800px;
      margin: 0 auto;
      text-align: justify;
    }

    /* ─── HEADER BAR (simulated) ─── */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid #d1d5db;
      margin-bottom: 20px;
      font-size: 9pt;
      font-style: italic;
    }
    .page-header .left { color: #5D6D7E; }
    .page-header .right { color: #2E7D6F; font-weight: 600; font-style: normal; }

    /* ─── FOOTER (simulated) ─── */
    .page-footer {
      font-size: 9pt;
      color: #5D6D7E;
      border-top: 1px solid #d1d5db;
      padding-top: 6px;
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      font-style: italic;
    }
    .page-footer .page-num { color: #1B3A6B; font-weight: 700; font-style: normal; }

    /* ─── COVER PAGE ─── */
    .cover {
      text-align: center;
      padding: 120px 0 40px;
      page-break-after: always;
    }
    .cover .doc-type {
      font-size: 24pt;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 12px;
    }
    .cover .project-name {
      font-size: 18pt;
      font-weight: 600;
      color: #2E7D6F;
      margin: 0 0 8px;
    }
    .cover .project-code {
      font-size: 28pt;
      font-weight: 800;
      color: #C5A04A;
      margin: 0 0 16px;
      letter-spacing: 2px;
    }
    .cover .separator {
      border: none;
      border-top: 2px solid #1B3A6B;
      margin: 20px auto;
      width: 80%;
    }
    .cover-table {
      width: 80%;
      margin: 60px auto 0;
      border-collapse: collapse;
      font-size: 10.5pt;
      text-align: left;
    }
    .cover-table td {
      padding: 7px 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .cover-table td:first-child {
      font-weight: 700;
      color: #2E7D6F;
      width: 38%;
    }
    .cover-table td:last-child {
      color: #374151;
    }

    /* ─── HEADINGS (match DOCX exactly) ─── */
    h2 {
      font-size: 14pt;
      font-weight: 700;
      color: #FFFFFF;
      background: #1B3A6B;
      padding: 8px 14px;
      margin: 32px 0 14px;
      border-radius: 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      page-break-after: avoid;
    }
    h3 {
      font-size: 12pt;
      font-weight: 700;
      color: #1B3A6B;
      margin: 24px 0 10px;
      padding-bottom: 4px;
      border-bottom: 2px solid #2E7D6F;
    }
    h4 {
      font-size: 11pt;
      font-weight: 700;
      color: #2E7D6F;
      margin: 16px 0 6px;
    }

    /* ─── CONTENT ─── */
    p { margin: 0 0 10px; font-size: 11pt; color: #1a1a1a; }
    ul { padding-left: 20px; margin: 6px 0 12px; }
    li { margin-bottom: 4px; font-size: 11pt; }
    .os-label { color: #2E7D6F; font-weight: 700; }

    .field {
      margin-bottom: 10px;
    }
    .field-value {
      font-size: 11pt;
      color: #1a1a1a;
      white-space: pre-line;
      text-align: justify;
    }

    /* ─── TOC ─── */
    .toc { page-break-after: always; }
    .toc h2 { margin-bottom: 16px; }
    .toc-list { list-style: none; padding: 0; margin: 0; }
    .toc-list li {
      padding: 3px 0;
      font-size: 10.5pt;
      color: #374151;
      border-bottom: none;
      display: flex;
      justify-content: space-between;
    }
    .toc-list li.toc-main { font-weight: 600; color: #1B3A6B; margin-top: 4px; }
    .toc-list li.toc-sub { padding-left: 20px; font-weight: 400; }
    .toc-list li.toc-subsub { padding-left: 40px; font-size: 10pt; }
    .toc-dots { flex: 1; border-bottom: 1px dotted #c1c7cd; margin: 0 8px; align-self: flex-end; margin-bottom: 4px; }

    /* ─── TABLES ─── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin: 10px 0 16px;
    }
    th {
      background: #f1f5f9;
      padding: 7px 8px;
      text-align: left;
      border: 1px solid #d1d5db;
      font-weight: 700;
      font-size: 9pt;
      color: #1B3A6B;
      text-transform: uppercase;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #d1d5db;
      color: #374151;
    }
    .total-row { background: #f1f5f9; font-weight: 700; color: #1B3A6B; }

    .risk-high { color: #dc2626; font-weight: 600; }
    .risk-medium { color: #d97706; font-weight: 600; }
    .risk-low { color: #16a34a; font-weight: 600; }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 16px 0;
    }
    .stat-box {
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 14px;
      text-align: center;
    }
    .stat-box .stat-value { font-size: 22pt; font-weight: 800; color: #2E7D6F; }
    .stat-box .stat-label { font-size: 8pt; color: #5D6D7E; margin-top: 4px; }

    .section-break { page-break-before: always; }

    @media print {
      body { padding: 0; }
      .page-header, .page-footer { display: none; }
    }
  </style>`;

  const e = escapeHtml;
  const nl = (v: unknown): string => typeof v === "string" ? v : (Array.isArray(v) ? v.join("\n") : JSON.stringify(v ?? ""));
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const fmtNum = (n: number) => n.toLocaleString("fr-FR");

  const field = (value: string | undefined | null): string => {
    if (!value) return "";
    return `<div class="field"><div class="field-value">${e(value)}</div></div>`;
  };

  const header = () => `<div class="page-header"><span class="left">PAERID — Projet d'Appui à l'Entrepreneuriat Rural Innovant et Durable</span><span class="right">Sénégal — Kédougou · Kolda · Ziguinchor</span></div>`;

  let html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${e(project.name)}</title>${css}</head><body>`;

  // ═══════════════ COVER PAGE ═══════════════
  html += header();
  html += `<div class="cover">`;
  html += `<div class="doc-type">DOCUMENT DE PROJET</div>`;
  html += `<div class="project-name">Projet d'Appui à l'Entrepreneuriat Rural<br/>Innovant et Durable</div>`;
  html += `<div class="project-code">${e(project.code || "PAERID")}</div>`;
  html += `<hr class="separator"/>`;
  html += `<table class="cover-table">`;
  const coverFields: [string, string | undefined][] = [
    ["Intitulé du projet", project.name],
    ["Pays", project.country],
    ["Zones d'intervention", (project.locations as string[])?.join(", ") || nl(meta.lieux_implementation)],
    ["Durée", project.duration_months ? `${project.duration_months} mois` : nl(meta.duree_programme)],
    ["Secteurs prioritaires", nl(meta.secteurs_prioritaires)],
    ["Porteur du projet", nl(meta.porteur)],
    ["Budget du projet", totalWithContingency ? `${fmtNum(totalWithContingency)} USD` : nl(meta.budget_total_label)],
    ["Alignement ODD", nl(meta.alignement_odd)],
    ["Version du document", nl(meta.version_document)],
  ];
  coverFields.forEach(([label, val]) => {
    if (val) html += `<tr><td>${e(label)}</td><td>${e(val)}</td></tr>`;
  });
  html += `</table></div>`;
  html += `<div class="page-footer"><span>Document de projet — Usage interne et soumission aux bailleurs de fonds</span><span class="page-num">Page 1</span></div>`;

  // ═══════════════ TABLE DES MATIÈRES ═══════════════
  html += `<div class="toc">`;
  html += header();
  html += `<h2>TABLE DES MATIÈRES</h2>`;
  html += `<ul class="toc-list">`;
  const tocItems: [string, string, string][] = [
    ["main", "0. LISTE DES ABRÉVIATIONS", ""],
    ["main", "1. RÉSUMÉ EXÉCUTIF", ""],
    ["main", "2. DESCRIPTION DU PROJET", ""],
    ["main", "3. INTRODUCTION", ""],
    ["main", "4. CONTEXTE ET JUSTIFICATION DU PROJET", ""],
    ["sub", "4.1. Contexte territorial des régions du sud du Sénégal", ""],
    ["sub", "4.2. Contraintes structurelles et vulnérabilités", ""],
    ["sub", "4.3. Alignement avec les orientations stratégiques", ""],
    ["sub", "4.4. Justification de l'intervention", ""],
    ["main", "5. THÉORIE DU CHANGEMENT", ""],
    ["sub", "5.1 Cheminement du changement", ""],
    ["sub", "5.2 Hypothèses clés", ""],
    ["sub", "5.3 Mécanismes d'apprentissage et d'adaptation", ""],
    ["main", "6. OBJECTIF GÉNÉRAL ET OBJECTIFS SPÉCIFIQUES DU PROJET", ""],
    ["sub", "6.1 Objectif général du projet", ""],
    ["sub", "6.2 Objectifs spécifiques", ""],
    ["main", "7. RÉSULTATS ATTENDUS", ""],
    ["sub", "7.1 Tableau des indicateurs KPIs", ""],
    ["main", "8. STRATÉGIE D'IMPLÉMENTATION DU PROJET", ""],
    ["sub", "8.1 Objectif de la stratégie", ""],
    ["sub", "8.2 Principaux axes d'action", ""],
    ["sub", "8.3 Modalités de mise en œuvre", ""],
    ["sub", "8.4 Architecture opérationnelle — Work Packages", ""],
    ["sub", "8.5 WP1 — Renforcement des compétences", ""],
    ["sub", "8.6 WP2 — Accès aux marchés", ""],
    ["sub", "8.7 WP3 — Accès au financement", ""],
    ["sub", "8.8 WP4 — Innovation, durabilité, écosystème", ""],
    ["main", "9. MÉTHODOLOGIE", ""],
    ["main", "10. DURÉE DU PROGRAMME", ""],
    ["main", "11. LIEU(X) D'IMPLÉMENTATION DU PROJET", ""],
    ["main", "12. POPULATION CIBLE / BÉNÉFICIAIRES", ""],
    ["main", "13. PERSONNEL CLÉ IMPLIQUÉ DANS LE PROGRAMME", ""],
    ["main", "14. PARTENAIRES CIBLES DU PROGRAMME", ""],
    ["main", "15. SUIVI ET ÉVALUATION DU PROGRAMME", ""],
    ["sub", "15.1 Outils et méthodes de suivi", ""],
    ["sub", "15.2 Évaluation", ""],
    ["sub", "15.3 Rapports et communication des résultats", ""],
    ["main", "16. PLAN DE SORTIE / STRATÉGIE DE DURABILITÉ", ""],
    ["main", "17. ANALYSE DES RISQUES ET MESURES D'ATTÉNUATION", ""],
    ["main", "18. ANNEXE : BUDGET PRÉVISIONNEL", ""],
    ["main", "19. CADRE LOGIQUE DU PROGRAMME", ""],
  ];
  tocItems.forEach(([level, label]) => {
    html += `<li class="toc-${level}"><span>${label}</span><span class="toc-dots"></span></li>`;
  });
  html += `</ul></div>`;

  // ═══════════════ 0. ABRÉVIATIONS ═══════════════
  html += header();
  html += `<h2>0. LISTE DES ABRÉVIATIONS</h2>`;
  html += field(nl(meta.abreviations));

  // ═══════════════ 1. RÉSUMÉ EXÉCUTIF ═══════════════
  html += `<h2>1. RÉSUMÉ EXÉCUTIF</h2>`;
  html += field(nl(meta.resume_executif));

  // ═══════════════ 2. DESCRIPTION DU PROJET ═══════════════
  html += `<h2 class="section-break">2. DESCRIPTION DU PROJET</h2>`;
  html += field(nl(meta.description_projet) || project.description);

  // ═══════════════ 3. INTRODUCTION ═══════════════
  html += `<h2 class="section-break">3. INTRODUCTION</h2>`;
  html += field(nl(meta.introduction));

  // ═══════════════ 4. CONTEXTE ET JUSTIFICATION ═══════════════
  html += `<h2 class="section-break">4. CONTEXTE ET JUSTIFICATION DU PROJET</h2>`;
  html += field(nl(meta.contexte_justification));
  html += `<h3>4.1. Contexte territorial des régions du sud du Sénégal</h3>`;
  html += field(nl(meta.contexte_territorial));
  html += `<h3>4.2. Contraintes structurelles et vulnérabilités</h3>`;
  html += field(nl(meta.contraintes) || nl(meta.contraintes_vulnerabilites));
  html += `<h3>4.3. Alignement avec les orientations stratégiques nationales et internationales</h3>`;
  html += field(nl(meta.alignement_strategique));
  html += `<h3>4.4. Justification de l'intervention</h3>`;
  html += field(nl(meta.justification));

  // ═══════════════ 5. THÉORIE DU CHANGEMENT ═══════════════
  html += `<h2 class="section-break">5. THÉORIE DU CHANGEMENT</h2>`;
  if (meta.theorie_changement) {
    html += field(nl(meta.theorie_changement));
  }
  if (toc) {
    if (toc.inputs) { html += `<h3>5.1 Intrants</h3>`; html += field(nl(toc.inputs)); }
    if (toc.activities) { html += `<h3>5.2 Activités</h3>`; html += field(nl(toc.activities)); }
    if (toc.outputs) { html += `<h3>5.3 Extrants (Outputs)</h3>`; html += field(nl(toc.outputs)); }
    if (toc.outcomes) { html += `<h3>5.4 Effets (Outcomes)</h3>`; html += field(nl(toc.outcomes)); }
    if (toc.impact) { html += `<h3>5.5 Impact</h3>`; html += field(nl(toc.impact)); }
    if (toc.assumptions) { html += `<h3>5.6 Hypothèses clés</h3>`; html += field(nl(toc.assumptions)); }
  }

  // ═══════════════ 6. OBJECTIFS ═══════════════
  html += `<h2 class="section-break">6. OBJECTIF GÉNÉRAL ET OBJECTIFS SPÉCIFIQUES DU PROJET</h2>`;
  if (logFrame?.overall_objective) {
    html += `<h3>6.1 Objectif général du projet</h3>`;
    html += field(logFrame.overall_objective);
  }
  if (logFrame?.specific_objectives && Array.isArray(logFrame.specific_objectives) && logFrame.specific_objectives.length > 0) {
    html += `<h3>6.2 Objectifs spécifiques</h3>`;
    (logFrame.specific_objectives as string[]).forEach((obj, i) => {
      html += `<h4>OS${i + 1} : ${e(typeof obj === "string" ? obj : JSON.stringify(obj))}</h4>`;
    });
  }

  // ═══════════════ 7. RÉSULTATS ATTENDUS ═══════════════
  html += `<h2>7. RÉSULTATS ATTENDUS</h2>`;
  if (meta.resultats_attendus) {
    html += field(nl(meta.resultats_attendus));
  }
  if (logFrame?.expected_results && Array.isArray(logFrame.expected_results) && logFrame.expected_results.length > 0) {
    (logFrame.expected_results as string[]).forEach((r, i) => {
      html += `<h4>R${i + 1} : ${e(typeof r === "string" ? r : JSON.stringify(r))}</h4>`;
    });
  }

  // 7.1 Indicateurs KPI
  if (indicators.length > 0) {
    html += `<h3>7.1 Tableau des indicateurs KPIs</h3>`;
    html += `<table><thead><tr><th>Indicateur</th><th>Catégorie</th><th>Référence</th><th>Cible</th><th>Actuel</th><th>Unité</th><th>Fréquence</th></tr></thead><tbody>`;
    indicators.forEach(ind => {
      html += `<tr><td>${e(ind.name)}</td><td>${e(ind.category ?? "")}</td><td>${ind.baseline_value ?? "—"}</td><td>${ind.target_value ?? "—"}</td><td>${ind.current_value ?? "—"}</td><td>${e(ind.unit ?? "")}</td><td>${e(ind.frequency ?? "")}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  // ═══════════════ 8. STRATÉGIE D'IMPLÉMENTATION ═══════════════
  html += `<h2 class="section-break">8. STRATÉGIE D'IMPLÉMENTATION DU PROJET</h2>`;
  if (meta.strategie_objectif) { html += `<h3>8.1 Objectif de la stratégie</h3>`; html += field(nl(meta.strategie_objectif)); }
  if (meta.strategie_axes) { html += `<h3>8.2 Principaux axes d'action</h3>`; html += field(nl(meta.strategie_axes)); }
  if (meta.strategie_modalites) { html += `<h3>8.3 Modalités de mise en œuvre</h3>`; html += field(nl(meta.strategie_modalites)); }

  // Work Packages — synthèse architecture
  const wpMeta = (meta.wp_details ?? {}) as Record<string, { title?: string; objective?: string; activities?: string; results?: string; indicators?: string; milestones?: string; os_mapping?: string }>;
  const wpKeys = ["WP1", "WP2", "WP3", "WP4"];
  const hasAnyWp = wpKeys.some(k => wpMeta[k]) || budgetDetails.length > 0;

  if (hasAnyWp) {
    html += `<h3>8.4 Architecture opérationnelle — Work Packages</h3>`;
    // Tableau synthèse comme dans le DOCX
    html += `<table><thead><tr><th>Composante (WP)</th><th>OS liés</th><th>Activités clés</th></tr></thead><tbody>`;
    wpKeys.forEach(k => {
      const w = wpMeta[k];
      if (w?.title || w?.objective) {
        html += `<tr><td><strong>${e(k)} — ${e(w.title ?? "")}</strong></td><td>${e(w.os_mapping ?? "")}</td><td>${e((w.activities ?? "").split("\n").slice(0, 3).join(" • "))}</td></tr>`;
      }
    });
    html += `</tbody></table>`;
  }

  // Détail par WP (8.5 → 8.8) — Objectif / Activités / Résultats / Indicateurs / Jalons
  wpKeys.forEach((k, idx) => {
    const w = wpMeta[k];
    if (!w?.objective && !w?.activities && !w?.results) return;
    html += `<h3 class="${idx === 0 ? "section-break" : ""}">8.${5 + idx} ${k} — ${e(w.title ?? "")}</h3>`;
    if (w.objective) { html += `<h4>Objectif</h4>`; html += field(w.objective); }
    if (w.activities) { html += `<h4>Activités</h4>`; html += field(w.activities); }
    if (w.results) { html += `<h4>Résultats attendus</h4>`; html += field(w.results); }
    if (w.indicators) { html += `<h4>Indicateurs clés</h4>`; html += field(w.indicators); }
    if (w.milestones) { html += `<h4>Jalons clés (Milestones)</h4>`; html += field(w.milestones); }

    // Tableau budget de ce WP s'il existe
    const wpBudget = budgetDetails.filter(d => (d.work_package ?? "").toUpperCase().startsWith(k));
    if (wpBudget.length > 0) {
      const wpTotal = wpBudget.reduce((s, d) => s + (Number(d.total) || 0), 0);
      html += `<h4>Budget ${k} — ${fmtNum(wpTotal)} USD</h4>`;
      html += `<table><thead><tr><th>Code</th><th>Activité</th><th>Catégorie</th><th>Qté</th><th>Coût unit.</th><th>Total</th></tr></thead><tbody>`;
      wpBudget.forEach(d => {
        html += `<tr><td>${e(d.code ?? "")}</td><td>${e(d.activity ?? "")}</td><td>${e(d.category ?? "")}</td><td>${d.quantity ?? ""}</td><td>${fmtNum(Number(d.unit_cost) || 0)}</td><td>${fmtNum(Number(d.total) || 0)}</td></tr>`;
      });
      html += `</tbody></table>`;
    }
  });

  // Si aucune méta WP saisie, fallback : tableau budget par WP comme avant
  if (!wpKeys.some(k => wpMeta[k]) && budgetDetails.length > 0) {
    const wps = [...new Set(budgetDetails.map(d => d.work_package).filter(Boolean))].sort();
    wps.forEach(wp => {
      const wpDetails = budgetDetails.filter(d => d.work_package === wp);
      const wpTotal = wpDetails.reduce((s, d) => s + (Number(d.total) || 0), 0);
      html += `<h4>${e(wp)} — ${fmtNum(wpTotal)} USD</h4>`;
      html += `<table><thead><tr><th>Code</th><th>Activité</th><th>Catégorie</th><th>Qté</th><th>Coût unit.</th><th>Total</th></tr></thead><tbody>`;
      wpDetails.forEach(d => {
        html += `<tr><td>${e(d.code ?? "")}</td><td>${e(d.activity ?? "")}</td><td>${e(d.category ?? "")}</td><td>${d.quantity ?? ""}</td><td>${fmtNum(Number(d.unit_cost) || 0)}</td><td>${fmtNum(Number(d.total) || 0)}</td></tr>`;
      });
      html += `</tbody></table>`;
    });
  }

  // ═══════════════ 9. MÉTHODOLOGIE ═══════════════
  html += `<h2 class="section-break">9. MÉTHODOLOGIE</h2>`;
  html += field(nl(meta.methodologie));

  // ═══════════════ 10. DURÉE DU PROGRAMME ═══════════════
  html += `<h2>10. DURÉE DU PROGRAMME</h2>`;
  html += field(nl(meta.duree_programme) || (project.duration_months ? `${project.duration_months} mois` : ""));
  if (project.start_date && project.end_date) {
    html += `<p>Du <strong>${fmtDate(project.start_date)}</strong> au <strong>${fmtDate(project.end_date)}</strong></p>`;
  }
  if (milestones.length > 0) {
    html += `<h3>Jalons clés</h3>`;
    html += `<table><thead><tr><th>Jalon</th><th>Échéance</th><th>Statut</th></tr></thead><tbody>`;
    milestones.forEach(m => {
      html += `<tr><td>${e(m.title)}</td><td>${m.due_date ? fmtDate(m.due_date) : "—"}</td><td>${e(m.status ?? "pending")}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  // ═══════════════ 11. LIEU(X) ═══════════════
  html += `<h2>11. LIEU(X) D'IMPLÉMENTATION DU PROJET</h2>`;
  html += field(nl(meta.lieux_implementation) || (project.locations as string[])?.join(", "));

  // ═══════════════ 12. POPULATION CIBLE ═══════════════
  html += `<h2>12. POPULATION CIBLE / BÉNÉFICIAIRES</h2>`;
  html += field(nl(meta.population_cible));
  if (meta.estimation_beneficiaires) {
    html += `<h3>12.1 Estimation des bénéficiaires</h3>`;
    html += field(nl(meta.estimation_beneficiaires));
  }

  // ═══════════════ 13. PERSONNEL CLÉ ═══════════════
  html += `<h2 class="section-break">13. PERSONNEL CLÉ IMPLIQUÉ DANS LE PROGRAMME</h2>`;
  html += field(nl(meta.personnel_cle));

  // ═══════════════ 14. PARTENAIRES ═══════════════
  html += `<h2>14. PARTENAIRES CIBLES DU PROGRAMME</h2>`;
  if (meta.partenaires) {
    html += field(nl(meta.partenaires));
  }
  if (partners.length > 0) {
    html += `<table><thead><tr><th>Nom</th><th>Type</th><th>Secteur</th><th>Pays</th><th>Statut</th></tr></thead><tbody>`;
    partners.forEach(p => {
      html += `<tr><td>${e(p.name)}</td><td>${e(p.type ?? "")}</td><td>${e(p.sector ?? "")}</td><td>${e(p.country ?? "")}</td><td>${e(p.status ?? "")}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  // ═══════════════ 15. SUIVI ET ÉVALUATION ═══════════════
  html += `<h2>15. SUIVI ET ÉVALUATION DU PROGRAMME</h2>`;
  if (meta.suivi_outils) { html += `<h3>15.1 Outils et méthodes de suivi</h3>`; html += field(nl(meta.suivi_outils)); }
  if (meta.suivi_evaluation) { html += `<h3>15.2 Évaluation</h3>`; html += field(nl(meta.suivi_evaluation)); }
  if (meta.suivi_rapports) { html += `<h3>15.3 Rapports et communication des résultats</h3>`; html += field(nl(meta.suivi_rapports)); }

  // ═══════════════ 16. PLAN DE SORTIE ═══════════════
  html += `<h2>16. PLAN DE SORTIE (EXIT STRATEGY) / STRATÉGIE DE DURABILITÉ</h2>`;
  html += field(nl(meta.plan_sortie));

  // ═══════════════ 17. ANALYSE DES RISQUES ═══════════════
  html += `<h2 class="section-break">17. ANALYSE DES RISQUES ET MESURES D'ATTÉNUATION</h2>`;
  if (meta.analyse_risques) {
    html += field(nl(meta.analyse_risques));
  }
  if (risks.length > 0) {
    html += `<table><thead><tr><th>Risque</th><th>Niveau</th><th>Description</th><th>Mesure d'atténuation</th></tr></thead><tbody>`;
    risks.forEach(r => {
      const levelClass = r.level === "high" ? "risk-high" : r.level === "medium" ? "risk-medium" : "risk-low";
      const levelLabel = r.level === "high" ? "Élevé" : r.level === "medium" ? "Moyen" : "Faible";
      html += `<tr><td>${e(r.title)}</td><td class="${levelClass}">${levelLabel}</td><td>${e(r.description ?? "")}</td><td>${e(r.mitigation ?? "")}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  // ═══════════════ 18. BUDGET PRÉVISIONNEL ═══════════════
  html += `<h2 class="section-break">18. ANNEXE : BUDGET PRÉVISIONNEL</h2>`;
  if (budgetLines.length > 0) {
    html += `<table><thead><tr><th>Code</th><th>Poste budgétaire</th><th>Catégorie</th><th>An 1</th><th>An 2</th><th>An 3</th><th>An 4</th><th>An 5</th><th>Total (USD)</th></tr></thead><tbody>`;
    budgetLines.forEach(line => {
      html += `<tr>`;
      html += `<td>${e(line.code ?? "")}</td>`;
      html += `<td>${e(line.label)}</td>`;
      html += `<td>${e(line.category)}</td>`;
      html += `<td>${fmtNum(Number(line.year1) || 0)}</td>`;
      html += `<td>${fmtNum(Number(line.year2) || 0)}</td>`;
      html += `<td>${fmtNum(Number(line.year3) || 0)}</td>`;
      html += `<td>${fmtNum(Number(line.year4) || 0)}</td>`;
      html += `<td>${fmtNum(Number(line.year5) || 0)}</td>`;
      html += `<td>${fmtNum(Number(line.total_cost) || 0)}</td>`;
      html += `</tr>`;
    });
    html += `<tr class="total-row"><td colspan="8">Sous-total coûts directs</td><td>${fmtNum(totalBudget)}</td></tr>`;
    const contingency = totalWithContingency - totalBudget;
    html += `<tr><td colspan="8">Imprévus (${Math.round(contingencyPct * 100)}%)</td><td>${fmtNum(contingency)}</td></tr>`;
    html += `<tr class="total-row"><td colspan="8">TOTAL GÉNÉRAL</td><td>${fmtNum(totalWithContingency)} USD</td></tr>`;
    html += `</tbody></table>`;
  }

  // ═══════════════ 19. CADRE LOGIQUE ═══════════════
  html += `<h2 class="section-break">19. CADRE LOGIQUE DU PROGRAMME</h2>`;
  if (logFrame) {
    if (logFrame.overall_objective) { html += `<h3>Objectif global</h3>`; html += field(logFrame.overall_objective); }
    if (logFrame.specific_objectives && Array.isArray(logFrame.specific_objectives)) {
      html += `<h3>Objectifs spécifiques</h3><ul>`;
      (logFrame.specific_objectives as string[]).forEach((obj, i) => {
        html += `<li><span class="os-label">OS${i + 1} :</span> ${e(typeof obj === "string" ? obj : JSON.stringify(obj))}</li>`;
      });
      html += `</ul>`;
    }
    if (logFrame.expected_results && Array.isArray(logFrame.expected_results)) {
      html += `<h3>Résultats attendus</h3><ul>`;
      (logFrame.expected_results as string[]).forEach((r, i) => {
        html += `<li><span class="os-label">R${i + 1} :</span> ${e(typeof r === "string" ? r : JSON.stringify(r))}</li>`;
      });
      html += `</ul>`;
    }
    if (logFrame.activities) { html += `<h3>Activités</h3>`; html += field(nl(logFrame.activities)); }
    if (logFrame.assumptions) { html += `<h3>Hypothèses</h3>`; html += field(logFrame.assumptions); }
    if (logFrame.pre_conditions) { html += `<h3>Pré-conditions</h3>`; html += field(logFrame.pre_conditions); }
  }

  // Indicators table in cadre logique
  if (indicators.length > 0) {
    html += `<h3>Indicateurs de performance</h3>`;
    html += `<table><thead><tr><th>Indicateur</th><th>Référence</th><th>Cible</th><th>Source de données</th><th>Fréquence</th></tr></thead><tbody>`;
    indicators.forEach(ind => {
      html += `<tr><td>${e(ind.name)}</td><td>${ind.baseline_value ?? "—"}</td><td>${ind.target_value ?? "—"} ${e(ind.unit ?? "")}</td><td>${e(ind.data_source ?? "")}</td><td>${e(ind.frequency ?? "")}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  // Final footer
  html += `<div class="page-footer" style="margin-top: 60px;"><span>Document de projet — Usage interne et soumission aux bailleurs de fonds</span><span class="page-num">Exporté le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span></div>`;

  html += `</body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
