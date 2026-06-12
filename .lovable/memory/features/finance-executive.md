---
name: Finance exécutive (BLOC 7)
description: Trésorerie consolidée multi-sources, Cap Table, investissements et term sheets
type: feature
---
**Vue `treasury_consolidated`** (security_invoker = on) : agrège grants_disbursements, crm_invoices (emise/recue), hr_payslips, purchase_orders, hr_expense_reports avec direction in/out et statut realized/planned/partial.

**RPC `get_cashflow_summary(_from, _to)`** : cashflow mensuel cumulé sur fenêtre glissante.

**Tables Cap Table** :
- `startup_investments` : tours (pre_seed → series_c, bridge, grant, convertible, SAFE)
- `cap_table_entries` : détenteurs avec auto-recalcul du `ownership_pct` via trigger `tg_cap_table_recalc`
- `term_sheets` : négociations en cours

**RLS** : admins/coordinateurs gèrent tout, fondateurs voient uniquement leur entreprise (founder_id ou startup_members).

**Pages** :
- `/app/finance/tresorerie` (AdminRoute) — KPIs + bar chart + ligne cumulée + table détaillée filtrable
- `/app/finance/cap-table` — sélecteur startup + pie chart + tours + détenteurs CRUD
