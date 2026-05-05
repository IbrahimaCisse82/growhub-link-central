# Plan d'exécution — 5 blocs GrowHub

Le périmètre demandé est très large (≈ 15 sous-tâches, 8+ tables, 4 edge functions, 6 pages). Je propose de l'enchaîner **bloc par bloc**, en validant à la fin de chaque bloc avant d'attaquer le suivant. Cela limite les régressions, garde les migrations atomiques et facilite les retours.

## Ordre d'exécution proposé

### Étape 1 — BLOC 1 : Corrections critiques (priorité sécurité)
1. **[1.1] Buckets privés** — migration : `UPDATE storage.buckets SET public=false` pour `grant-documents`, `entity-documents`, `receipts` + policies RLS scope-based. Refactor des hooks `useEntityDocuments`, `useGrantDocuments`, `useHrExpenses` pour `createSignedUrl(path, 3600)`. Section "Buckets" dans `SettingsPage`.
2. **[1.2] Webhooks résilients** — migration : colonnes `retry_count`, `next_retry_at`, `last_error_body` + désactivation auto. Refonte `dispatch-domain-webhooks` (backoff 1m→5m→30m→2h→24h, 5 max). Onglet "Webhooks" dans `EventsPage` (refonte `WebhooksPage` existante en tabs).
3. **[1.3] Notes de frais N+2** — migration : `organizations.approval_threshold_xof`, `hr_expense_reports.second_*`, statut `approved_l1`, trigger `notify_expense_second_approval` + contrainte premier ≠ second. UI `HrExpensesPanel` : badge amber + workflow boutons.

### Étape 2 — BLOC 2 : Module Alumni
- Tables `alumni_records`, `alumni_kpis` + RLS scopée + trigger `domain_events` (`alumni.created`, `alumni.kpi_recorded`).
- Page `/app/alumni` : liste statut coloré, fiche timeline (Recharts LineChart), dialog "Enregistrer KPIs", filtres.
- Hook `useAlumniRecords`, `useAlumniKpis`.
- Export `alumniReportPdf.ts` (jsPDF + autoTable, charte existante).
- Route + entrée sidebar (filtrée pour coordinator/PM/funder).

### Étape 3 — BLOC 3 : Analytique impact ODD
- Table `impact_indicators` + RLS.
- Page `/app/analytics/impact` : sélecteur programme/période, RadarChart Recharts, table éditable inline, barre progression conditionnelle.
- Export `impactOddReportPdf.ts` (radar via html2canvas → jsPDF).
- Hook `useImpactIndicators`.

### Étape 4 — BLOC 4 : Import CSV/Excel
- Table `import_logs`.
- Page `/app/settings/import` (4 onglets : Startups, Employés, Budgets, CRM).
- Composant générique `ImportWizard` : Upload (SheetJS) → Preview → Mapping → Validation (zod par onglet) → Import batch 50 → Résumé.
- Logique de résolution (programme_slug → id, projet_code → id, invitation auto si email inconnu).
- Événement `import.completed`.

### Étape 5 — BLOC 5 : Améliorations ciblées
- **5.1 LMS Quiz** : table `quiz_attempts`, types question (radio/checkbox/bool/free), params (passing_score, max_attempts, time_limit, shuffle), refonte `QuizPlayer`, condition certificat.
- **5.2 Matching mentor** : table `mentor_blacklists`, colonne `rejection_reason` sur `mentor_matches`, hook auto re-matching post-évaluation < 3, badges UI, boost capacité 25 % si moyenne ≥ 4.5.
- **5.3 RTL arabe** : `dir="rtl"` dynamique, plugin `tailwindcss-rtl`, audit Sidebar/Topbar/tableaux/forms, `Intl.NumberFormat('ar-DZ')`, `doc.setR2L(true)` sur exports PDF.

## Détails techniques transverses

- Toutes les nouvelles tables : `id uuid PK gen_random_uuid()`, `created_at/updated_at timestamptz default now()`, trigger `update_updated_at_column`, `ALTER TABLE … ENABLE ROW LEVEL SECURITY`.
- RLS via `has_role`, `has_scoped_role`, `is_admin_or_coordinator`, `user_accessible_projects` (jamais d'EXISTS direct sur `user_roles`).
- Édge functions nouvelles : `verify_jwt = false` dans `supabase/config.toml` + bouton "Déclencher manuellement" exposé dans la page admin associée.
- PDF : jsPDF + autoTable (même police, header logo via `OrgSettings`, footer pagination — pattern de `grantDonorReportPdf.ts`).
- Mémoires à mettre à jour : `mem://security/buckets-prives`, `mem://features/alumni`, `mem://features/impact-odd`, `mem://features/import-wizard`, `mem://features/lms-quiz-v2`, `mem://style/rtl-arabe`, et `mem://index.md`.

## Volumétrie estimée

| Bloc | Migrations | Edge fn | Pages | Composants | Hooks |
|------|-----------|---------|-------|------------|-------|
| 1    | 3         | 1 refonte | 0  | 4          | 3     |
| 2    | 1         | 0       | 1     | 4          | 2     |
| 3    | 1         | 0       | 1     | 3          | 1     |
| 4    | 1         | 0       | 1     | 6          | 1     |
| 5    | 3         | 0       | 0     | 5          | 2     |

## Question

Confirme-tu cet enchaînement bloc 1 → 2 → 3 → 4 → 5 avec **validation à chaque fin de bloc** (recommandé), ou préfères-tu que **j'enchaîne tout d'une traite sans pause** ? La seconde option économise des allers-retours mais rend les retours en arrière plus coûteux.
