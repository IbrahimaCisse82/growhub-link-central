---
name: M&E avancé multi-bailleurs
description: BLOC 8 — Mesures baseline/midline/endline, PMP, et templates PDF UE/USAID/AFD/World Bank
type: feature
---
# BLOC 8 — M&E avancé

## Tables
- `me_measurements` : phase (baseline/midline/endline/adhoc), measured_value, sample_size, methodology, evidence_doc_url, validated_by/at. FK vers `project_indicators` OU `grant_indicators` (CHECK).
- `me_monitoring_plans` (PMP) : data_source, collection_frequency, responsible_user_id, target_phases jsonb.

## Vue
- `me_indicator_progress` (security_invoker) : UNION project_indicators + grant_indicators avec baseline/midline/endline mesurés, achievement_pct, variation_vs_baseline_pct.

## UI
- `/app/me` (MePage) : 3 onglets — Progression indicateurs / Mesures / PMP.
- `/app/rapports/bailleurs` (DonorReportsPage) : sélecteur subvention + template + période + sections narratives → génération PDF.

## Templates PDF (`src/lib/donorReportTemplates.ts`)
- `eu_intpa` : 7 sections (narrative + cadre logique + financier EUR)
- `usaid_qpr` : Activity Summary, PMP, Challenges, Financial USD (TAUX_USD_XOF=600)
- `afd_semestriel` : Avancement, Cadre résultats AFD, Exécution semestrielle EUR, Perspectives
- `wb_isr` : Project Ratings, Results Framework, Disbursement Summary USD, Issues/Lessons

## Hooks
- `useMeMeasurements` (CRUD + validate + progress)
- `useMonitoringPlans` (CRUD PMP)

## Personas
Accès `me` ouvert à project_manager + funder ; rapports bailleurs aux mêmes.
