# Plan d'amélioration général GrowHub — Synthèse complète

Consolidation des audits : modules (Portefeuilles → Webhooks), logique métier inter-modules, profils utilisateurs (7 personas), et environnement démo. Objectif : passer d'une plateforme fonctionnelle à une solution de référence pour accélérateurs en Afrique francophone.

---

## Vision cible

```text
                    GROWHUB v2 — Plateforme intégrée
   ┌─────────────────────────────────────────────────────────┐
   │  STRATÉGIE   →  Portefeuilles · Programmes · Bailleurs  │
   │  EXÉCUTION   →  Projets PAERID · Cohortes · Entreprises │
   │  OPÉRATIONS  →  RH · Finance · CRM · Achats · Documents │
   │  INTELLIGENCE → Analytics · IA · Rapports · Alertes     │
   │  GOUVERNANCE →  Rôles scopés · Audit · Workflows        │
   └─────────────────────────────────────────────────────────┘
```

---

## AXE 1 — Sécurité, rôles & gouvernance (FONDATION)

**Pourquoi en premier** : tout le reste dépend d'un modèle de permissions sain.

### 1.1 Refonte du système de rôles
- Enum `app_role` enrichi : ajouter `staff`, `consultant_expert`, `consultant_coach` (garder `mentor` rétrocompatible)
- Hiérarchie : `profiles.reports_to_id`, `department`, `job_title`
- Table `role_assignments` (scope_type : global/portfolio/program/project/cohort)
- Fonctions SECURITY DEFINER : `has_scoped_role()`, `user_programs()`, `user_projects()`

### 1.2 RLS contextualisée
Réécrire les policies pour que :
- Coordinateur voit uniquement ses programmes
- Chef de projet voit uniquement ses projets
- Consultant voit uniquement ses entreprises rattachées
- Entreprise voit uniquement sa fiche + livrables
- Bailleur : lecture seule sur ses grants/projets financés
- Staff : périmètre fonctionnel (RH, finance, comm)

### 1.3 Audit & workflow
- Étendre l'audit trail à toutes les tables sensibles (RH, finance, grants)
- Workflow d'approbation centralisé : budgets > seuil, PO, contrats RH, validations paie
- Notifications aux validateurs

---

## AXE 2 — Architecture métier & event bus

**Problème identifié** : modules fortement couplés, pas de bus d'événements.

### 2.1 Event bus interne
- Table `domain_events` (entity_type, entity_id, event_name, payload, occurred_at)
- Triggers Postgres → publication d'événements (project.created, grant.disbursed, payroll.closed…)
- Edge function `event-dispatcher` → routing vers webhooks externes + notifications internes

### 2.2 Imputation analytique systématique
- Forcer `project_id` sur : dépenses RH, factures CRM, bons de commande, transactions grants
- Vue matérialisée `project_financial_consolidation` (budget vs réalisé tous canaux)
- Réconciliation automatique mensuelle

### 2.3 Webhooks bidirectionnels
- Aujourd'hui : sortants uniquement
- Ajouter : webhooks entrants signés (HMAC) pour intégrations bailleurs, banques, gouvernement

---

## AXE 3 — Modules à compléter (priorisé par impact)

### 3.1 RH & Paie (priorité HAUTE)
Voir plan détaillé `.lovable/plan.md` :
- Sécuriser accès données salariales
- Persister paramètres cotisations (versionnés)
- Variables mensuelles séparées de la fiche employé
- Vraie clôture de paie avec bulletins figés (JSONB)
- PDF officiels via `growhubPdf` + org_settings
- Congés/contrats avec workflow
- Exports bancaires + états sociaux (IPRES, CSS, CFCE)

### 3.2 Portefeuilles & Programmes
- Vue financière consolidée (rollup budgets enfants)
- Indicateurs de santé agrégés (RAG)
- Comparaison inter-programmes
- Templates de programme (réplication rapide)

### 3.3 Projets PAERID
- Versioning des wizards (snapshots à chaque validation)
- Comparaison versions
- Génération automatique cadre logique
- Export Word/PDF complet déjà OK → ajouter export bailleur (formats Enabel, AFD, UE)

### 3.4 Grants (GTS)
- Réconciliation bancaire automatique
- Multi-devise étendue (USD, GBP en plus EUR/XOF)
- Génération rapports bailleurs auto (modèles préconfigurés)
- Indicateurs IRIS+ pour bailleurs impact

### 3.5 Entreprises & Cohortes
- Scoring santé entreprise IA (basé KPIs + assiduité + livrables)
- Alertes décrochage automatiques
- Parcours alumni structuré (suivi N+1, N+2, N+3)
- Réseau alumni-mentors

### 3.6 Mentoring & Coaching
- Algorithme matching v2 (intégrer feedback historique, langue, géolocalisation)
- Agenda mentor avec sync Google/Outlook bidirectionnelle
- Visioconférence intégrée (Jitsi/Daily.co)
- Notes de session structurées + objectifs SMART

### 3.7 LMS
- Parcours certifiants multi-cours
- Badges & gamification
- Génération IA de quiz depuis contenu
- Tracking temps réel progression cohorte

### 3.8 CRM & Facturation
- Pipeline opportunités complet
- Relances automatiques multi-canal
- Intégration moyens de paiement (Wave, Orange Money, Stripe)
- Recouvrement avec scoring risque client

### 3.9 Analytics & Rapports
- Dashboards personnalisables (drag & drop widgets)
- Export programmé (rapports mensuels auto par email)
- Comparaisons temporelles & benchmarks sectoriels
- Prédictions IA (taux succès cohorte, risque décrochage)

### 3.10 Messagerie
- Threads & réactions (déjà partiel)
- Recherche full-text avancée
- Intégration notifications mobiles (PWA push déjà OK)
- @mentions cross-projet

### 3.11 Marketplace & Partenaires
- Catalogue services partenaires structuré
- Demandes/devis intégrés
- Évaluations bidirectionnelles
- Commission tracking

### 3.12 Webhooks & Intégrations
- Bibliothèque de connecteurs préconfigurés (Slack, Teams, Zapier, Make)
- Logs détaillés + replay
- Rate limiting & retry policies

---

## AXE 4 — Expérience utilisateur par persona

### 4.1 Sidebar dynamique avancée
Filtrage `AppSidebar.tsx` selon rôle principal :
- **Super-Admin / Coordinateur** : tout
- **Chef de projet** : Projets, Jalons, Tâches, Risques, Budgets, Équipe, Rapports
- **Consultant** : Coaching, RDV, Mes entreprises, Messagerie, Ressources, LMS
- **Entreprise** : Mon entreprise, Mes tâches, Coaching, LMS, Ressources, Messagerie
- **Bailleur** : Portefeuilles (R), Grants, Rapports, Analytics
- **Staff** : selon département (RH, CRM, Achats, Documents)

### 4.2 Dashboards contextuels (6 layouts)
Chaque persona a son propre Dashboard avec KPIs pertinents.

### 4.3 Onboarding wizard branché
Étendre `OnboardingWizard.tsx` avec étapes conditionnelles selon rôle invité.

### 4.4 Mobile-first sur parcours critiques
- Saisie tâches/livrables entreprise
- Validation managériale
- Notifications push actionnables

---

## AXE 5 — Internationalisation & Localisation

- Compléter traductions FR/EN/AR (couverture actuelle ~70%)
- Ajouter formats régionaux (dates, nombres) par pays
- Templates emails localisés
- Support multi-pays (Sénégal prioritaire, étendre Mali, Côte d'Ivoire, Bénin)
- Paramètres fiscaux/sociaux par pays

---

## AXE 6 — Démo & Multi-tenant

### 6.1 Sandbox démo (déjà initié)
- Compléter `is_demo` sur toutes les tables sensibles
- Reset périodique automatique
- Données seed réalistes (programme PAERID démo complet)

### 6.2 Multi-organisation (long terme)
- Préparer schéma `organizations` → permettre plusieurs Grow Hub
- Isolation données par tenant
- SSO entreprise (SAML/Azure AD)

---

## AXE 7 — Différenciateurs (long terme)

- **IA conversationnelle** : assistant intégré pour navigation et requêtes naturelles
- **Signature électronique** : contrats RH, conventions partenaires, accords mentoring
- **Visioconférence native** : sessions coaching/cours sans outil tiers
- **Scoring santé IA** : prédiction succès entreprises
- **Marketplace complet** : transactions B2B entre entreprises de l'écosystème
- **Réseau alumni** : portail dédié + opportunités

---

## Roadmap proposée (6 sprints)

```text
Sprint 1 (2 sem) │ AXE 1 — Rôles + RLS scopée + Audit étendu
Sprint 2 (2 sem) │ AXE 4.1+4.2 — Sidebar/Dashboards par rôle + Onboarding
Sprint 3 (3 sem) │ AXE 3.1 — RH/Paie complet (plan détaillé existant)
Sprint 4 (2 sem) │ AXE 2 — Event bus + imputation analytique systématique
Sprint 5 (2 sem) │ AXE 3.4+3.9 — Grants rapports auto + Analytics avancés
Sprint 6 (2 sem) │ AXE 3.6+3.7 — Mentoring v2 + LMS certifiants
```

Total : ~13 semaines pour atteindre la parité AcceleratorApp + différenciateurs locaux.

---

## Quick wins (< 1 jour chacun, parallélisables)

1. Ajouter `staff` à l'enum `app_role`
2. Filtrer sidebar pour rôle `entrepreneur` (déjà partiellement fait)
3. Compléter traductions manquantes (i18n)
4. Ajouter export PDF bulletins paie via `growhubPdf`
5. Activer audit trail sur `hr_employees` et `grants`
6. Vue `project_financial_consolidation` (SQL)
7. Webhook signing HMAC
8. Reset démo automatique (cron edge function)

---

## Question

**Par où veux-tu commencer ?**
- **(A)** AXE 1 complet (fondation rôles/RLS) — recommandé
- **(B)** Quick wins en parallèle (impact rapide visible)
- **(C)** AXE 3.1 RH (besoin métier urgent ?)
- **(D)** Définir un sprint sur-mesure
