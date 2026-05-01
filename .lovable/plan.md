## Vue d'ensemble

3 lots livrés en séquence, chacun autonome :

1. **Onboarding checkpoint persistant** (rapide, frontend + 1 colonne DB)
2. **Sprint 3 — RH/Paie : consolidation** (le module est déjà complet, on ajoute l'imputation analytique côté employés/notes de frais et un panneau de validation)
3. **Sprint 4 — Event bus + imputation analytique** (DB-heavy, backbone pour rapports cross-modules)

---

## Lot 1 — Onboarding checkpoint persistant

**Pourquoi** : aujourd'hui l'état d'onboarding est stocké dans `localStorage` → perdu entre appareils, pas observable côté admin, pas de checkpoint final récapitulatif.

**Livrables**
- Migration : ajouter sur `profiles` les colonnes `onboarding_completed_at TIMESTAMPTZ`, `onboarding_persona TEXT`, `onboarding_steps_done JSONB DEFAULT '[]'`
- `OnboardingWizard.tsx` :
  - ajouter une étape finale **"Récapitulatif"** dynamique par persona (checklist des modules clés à explorer + lien direct)
  - persister chaque étape franchie dans `profiles.onboarding_steps_done`
  - à la complétion : `update profiles set onboarding_completed_at = now()` + garder le fallback localStorage
- `AppLayout.tsx` : déclencheur basé sur `profile.onboarding_completed_at` au lieu du seul localStorage
- Dashboards (Admin / PM / Funder / Staff / Mentor / Entrepreneur) : badge **"Onboarding"** discret en haut à droite si non complété, avec CTA "Reprendre"
- Page `UsersPage.tsx` (admin) : nouvelle colonne "Onboarding" (✓ date / — en cours)

---

## Lot 2 — Sprint 3 RH/Paie : consolidation

Le module est déjà très complet (paie Sénégal IPRES/CSS/IR/TRIMF/BRS, congés, contrats, IPM, déclarations DTS/CSS, audit, exports bancaires, livre de paie). On comble les 3 vrais manques :

**2.1 Imputation projet sur les coûts RH**
- Migration : ajouter `project_id UUID REFERENCES projects(id)` sur `hr_payslips`, `hr_expense_lines`, `hr_employees` (affectation par défaut)
- Hook `useHrEmployees` : exposer `default_project_id`
- `HrExpensesPanel` : selecteur projet par ligne de note de frais
- Bulletin PDF : afficher le projet d'imputation si présent

**2.2 Workflow validation paie**
- Composant `PayrollValidationPanel` : timeline `draft → calculated → validated → closed` avec garde-fous (impossible de re-calculer un run validé sans le rouvrir, traçabilité dans `hr_payroll_runs.validated_by/closed_by`)
- Migration : ajouter `validated_by UUID`, `closed_by UUID` sur `hr_payroll_runs`

**2.3 Auto-renouvellement des soldes de congés**
- Edge function cron `hr-yearly-leave-reset` (1er janvier) : crédite `conges_annuels = 24` (Sénégal) sur `hr_leave_balances` pour chaque employé actif
- Trigger d'audit dans `hr_audit_log`

---

## Lot 3 — Sprint 4 Event Bus + imputation analytique

**3.1 Domain Event Bus**
- Migration : table `domain_events`
  - colonnes : `id`, `event_name`, `aggregate_type`, `aggregate_id`, `payload JSONB`, `actor_user_id`, `occurred_at`, `processed_at`, `webhook_dispatched_at`
  - index sur `(event_name, occurred_at)` et `(aggregate_type, aggregate_id)`
  - RLS : seuls super_admin/coordinator lisent
- Helper SQL `emit_domain_event(name, agg_type, agg_id, payload)` SECURITY DEFINER
- Triggers AFTER INSERT/UPDATE sur 6 tables clés émettant les events :
  - `projects` → `project.created`, `project.status_changed`
  - `grants` → `grant.created`, `grant.disbursed`
  - `hr_payroll_runs` → `payroll.validated`, `payroll.closed`
  - `purchase_orders` → `po.approved`
  - `crm_invoices` → `invoice.paid`
  - `milestones` → `milestone.completed`, `milestone.overdue`
- Réutilisation : la table `webhooks` existante consommera `domain_events` via le edge function existant (rien à recoder côté webhooks utilisateur)

**3.2 Imputation analytique consolidée**
- Vue `cost_imputation_consolidated` (`security_invoker = on`) regroupant :
  - paie : `SELECT employee_id, project_id, mois, annee, salaire_net + charges_pat AS montant, 'payroll' AS source FROM hr_payslips WHERE project_id IS NOT NULL`
  - notes de frais : `hr_expense_lines` agrégées par projet
  - achats : `purchase_orders` validés par projet
  - factures sortantes : `crm_invoices` payées par projet
- RPC `get_project_cost_breakdown(p_project_id UUID, p_from DATE, p_to DATE)` retournant montants par catégorie
- Hook frontend `useProjectCostBreakdown(projectId)` + nouvel onglet **"Coûts consolidés"** sur `ProjetDetailPage` (graphique camembert sources × budget Enabel A32)

**3.3 Page admin `/app/events`** (super_admin only)
- Liste paginée des `domain_events` avec filtres event_name + recherche payload
- Détail JSON pretty-printed
- Bouton "Rejouer" (re-déclenche les webhooks)

---

## Détails techniques

### Migrations à créer (3 fichiers)

```sql
-- M1 : onboarding state
ALTER TABLE profiles 
  ADD COLUMN onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN onboarding_persona TEXT,
  ADD COLUMN onboarding_steps_done JSONB NOT NULL DEFAULT '[]'::jsonb;

-- M2 : RH imputation + validation
ALTER TABLE hr_employees ADD COLUMN default_project_id UUID REFERENCES projects(id);
ALTER TABLE hr_payslips ADD COLUMN project_id UUID REFERENCES projects(id);
ALTER TABLE hr_expense_lines ADD COLUMN project_id UUID REFERENCES projects(id);
ALTER TABLE hr_payroll_runs 
  ADD COLUMN validated_by UUID REFERENCES auth.users(id),
  ADD COLUMN closed_by UUID REFERENCES auth.users(id);

-- M3 : domain events + vue consolidée + triggers
CREATE TABLE domain_events (...);
CREATE FUNCTION emit_domain_event(...) SECURITY DEFINER;
CREATE TRIGGER ... AFTER INSERT OR UPDATE ON projects ...;
-- (5 autres triggers)
CREATE VIEW cost_imputation_consolidated WITH (security_invoker = on) AS ...;
CREATE FUNCTION get_project_cost_breakdown(...) STABLE SECURITY DEFINER;
```

### Fichiers frontend touchés

- `src/components/onboarding/OnboardingWizard.tsx` (étape récap + persistance DB)
- `src/components/layout/AppLayout.tsx` (trigger sur profile)
- `src/pages/app/UsersPage.tsx` (colonne onboarding)
- `src/pages/app/HrPage.tsx` + `HrExpensesPanel.tsx` (sélecteur projet)
- `src/components/hr/PayrollValidationPanel.tsx` (nouveau)
- `src/hooks/useDomainEvents.ts` (nouveau)
- `src/hooks/useProjectCostBreakdown.ts` (nouveau)
- `src/pages/app/ProjetDetailPage.tsx` (onglet coûts)
- `src/pages/app/EventsPage.tsx` (nouveau, route `/app/events`)

### Edge function

- `supabase/functions/hr-yearly-leave-reset/index.ts` (cron annuel)

### Mémoires à mettre à jour

- `mem://features/onboarding-persistant` (nouveau)
- `mem://features/event-bus-imputation` (nouveau)
- `mem://index.md` (références)
