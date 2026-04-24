
## Ce qui existe déjà dans le module RH

Le module RH actuel couvre une base solide :

- Tableau de bord RH avec effectif, brut, net, charges et masse salariale.
- Fiche employé avec identité, contrat, salaire, catégorie, statut, avances, absences et heures supplémentaires.
- Moteur de paie Sénégal dans `payroll.ts` : IR, TRIMF, IPRES, CSS, CFCE, transport, ancienneté, net à payer.
- Génération d’un bulletin de paie en HTML imprimable.
- Historique simple de clôture mensuelle.
- Paramètres de cotisation éditables à l’écran.
- Conventions collectives et grilles salariales affichées/modifiables dans l’interface.
- Tables backend existantes : `hr_employees` et `hr_payroll_history`.

## Ce qui manque pour que le module RH soit aligné avec le reste de la plateforme

### 1. Sécurité et confidentialité RH

Aujourd’hui, les données RH sont trop visibles : les employés RH sont consultables par tout utilisateur connecté. Comme les fiches contiennent des données personnelles et salariales, il faut renforcer l’accès.

À ajouter :

- Restreindre la consultation RH aux rôles autorisés : `super_admin`, `coordinator`, éventuellement `project_manager` ou un futur rôle RH.
- Prévoir un accès limité “employé” uniquement à son propre bulletin ou sa propre fiche si un compte utilisateur est lié.
- Ajouter un lien optionnel entre `hr_employees` et un utilisateur de la plateforme.
- Masquer les salaires et informations sensibles pour les profils non autorisés.
- Remplacer les suppressions directes par une désactivation / archivage quand c’est sensible.

### 2. Persistance réelle des paramètres RH

Actuellement, certains éléments sont seulement gardés en état local dans la page :

- paramètres de cotisation,
- informations entreprise,
- conventions collectives,
- catégories et salaires minima.

À ajouter :

- Table `hr_payroll_settings` pour versionner les taux de cotisations, plafonds, transport, IPM, BRS, etc.
- Table `hr_collective_agreements` pour les conventions.
- Table `hr_salary_categories` pour les catégories et salaires minima.
- Historique des changements de paramètres, car un bulletin passé doit rester calculé avec les taux de sa période.

### 3. Clôture de paie complète

La clôture actuelle sauvegarde uniquement des totaux globaux. Il manque une vraie paie mensuelle figée.

À ajouter :

- Table `hr_payroll_runs` : période, statut, date de clôture, validateur, totaux.
- Table `hr_payslips` : un bulletin figé par employé et par mois.
- Stockage du détail calculé en JSON pour garantir que le bulletin reste identique même si les taux changent plus tard.
- Statuts : brouillon, calculé, validé, clôturé, annulé.
- Bouton “Calculer la paie du mois”.
- Bouton “Valider / clôturer la paie”.
- Empêcher la modification silencieuse d’une paie clôturée.

### 4. Bulletins de paie au format plateforme

Le bulletin actuel s’ouvre dans un nouvel onglet et demande `Ctrl+P`. Il n’utilise pas encore le même système PDF que les devis, factures et bons de commande.

À ajouter :

- Export PDF direct du bulletin.
- Utilisation des paramètres organisation existants : logo, cachet, NINEA, RCCM, adresse, footer, signataire.
- Archivage du bulletin généré.
- Téléchargement individuel.
- Téléchargement groupé des bulletins du mois.
- Aperçu avant génération.
- Numérotation ou référence du bulletin.

### 5. Variables de paie mensuelles séparées de la fiche employé

Aujourd’hui, les avances, absences, heures supplémentaires et indemnités sont stockées directement sur l’employé. Cela pose problème car ces éléments changent chaque mois.

À ajouter :

- Table `hr_payroll_variables`.
- Saisie par période : mois, année, employé.
- Variables mensuelles :
  - heures supplémentaires,
  - absences,
  - maladie,
  - paniers,
  - indemnités,
  - avances,
  - retenues,
  - primes exceptionnelles.
- Import CSV/Excel des variables.
- Validation avant calcul de la paie.

### 6. Congés et absences

Le module ne gère pas encore un cycle RH complet d’absences.

À ajouter :

- Table `hr_leave_requests`.
- Types : congé annuel, maladie, absence autorisée, absence non autorisée, maternité, permission.
- Workflow : demandé, approuvé, refusé, annulé.
- Impact automatique ou assisté sur les variables de paie.
- Solde de congés par employé.
- Vue calendrier RH.

### 7. Contrats et documents RH

La plateforme a déjà une logique de gestion documentaire, mais le module RH ne l’exploite pas encore.

À ajouter :

- Table `hr_contracts`.
- Type de contrat : CDI, CDD, stage, prestation.
- Date début, date fin, période d’essai, renouvellement.
- Alertes d’expiration de contrat.
- Documents RH par employé :
  - contrat,
  - CNI/passeport,
  - RIB,
  - certificats,
  - attestations,
  - bulletins archivés.
- Upload via le système documentaire existant.

### 8. Workflow de validation RH

Le reste de la plateforme utilise des workflows de validation. Le module RH devrait suivre la même logique.

À ajouter :

- Validation des fiches employés sensibles.
- Validation des variables mensuelles.
- Validation de la paie avant clôture.
- Journalisation des actions RH.
- Notifications aux validateurs.
- Historique des changements de salaire et de statut.

### 9. Exports administratifs et financiers

Il manque les exports utiles pour l’exploitation RH réelle.

À ajouter :

- Export Excel de la paie mensuelle.
- Export CSV bancaire pour virement des salaires.
- État des charges patronales.
- État des retenues salariales.
- Résumé IPRES / CSS / CFCE / IR / TRIMF.
- Livre de paie mensuel.
- Rapport annuel de masse salariale.
- Export du registre du personnel.

### 10. Intégration avec les fonctionnalités existantes de la plateforme

Pour être cohérent avec la plateforme, le module RH devrait être relié à :

- Paramètres organisation : utiliser `org_settings` au lieu d’un bloc “Entreprise” séparé local.
- Audit trail : tracer création, modification, suppression, validation, clôture.
- Notifications : rappels contrat, validation paie, bulletins disponibles.
- Documents : rattacher les fichiers RH aux employés.
- Recherche globale : retrouver un employé, contrat, bulletin ou document.
- Permissions : limiter l’accès selon les rôles.
- Exports : harmoniser avec les autres modules PDF/Excel.
- Tableau de bord global : inclure masse salariale, charges et alertes RH.

## Plan recommandé d’implémentation

### Étape 1 — Sécuriser et stabiliser la base RH

- Corriger les règles d’accès aux données RH.
- Ajouter le lien optionnel entre un employé RH et un utilisateur de la plateforme.
- Retirer l’accès global aux salaires pour tous les utilisateurs connectés.
- Nettoyer le code RH pour respecter les règles TypeScript du projet, notamment éviter `as any`.
- Remplacer les icônes texte/emoji par des icônes Lucide.

### Étape 2 — Persister les paramètres et conventions

- Créer les tables :
  - `hr_payroll_settings`,
  - `hr_collective_agreements`,
  - `hr_salary_categories`.
- Migrer les paramètres actuellement locaux vers ces tables.
- Charger les paramètres actifs depuis le backend.
- Ajouter une notion de période d’effet pour les paramètres de paie.

### Étape 3 — Ajouter les variables mensuelles

- Créer `hr_payroll_variables`.
- Déplacer les éléments mensuels hors de la fiche employé.
- Ajouter une interface “Variables du mois”.
- Permettre la saisie rapide par employé.
- Ajouter import CSV/Excel.

### Étape 4 — Créer la vraie clôture de paie

- Créer :
  - `hr_payroll_runs`,
  - `hr_payslips`.
- Ajouter un bouton “Calculer la paie”.
- Ajouter une étape de validation.
- Générer un bulletin figé par employé.
- Bloquer les modifications d’une paie clôturée.
- Conserver le détail des calculs dans chaque bulletin.

### Étape 5 — Moderniser les bulletins PDF

- Refactoriser la génération de bulletin dans un module dédié.
- Utiliser les paramètres organisation existants : logo, cachet, NINEA, RCCM, footer, signataire.
- Ajouter :
  - aperçu bulletin,
  - téléchargement PDF direct,
  - téléchargement groupé,
  - archivage du PDF,
  - historique par employé.

### Étape 6 — Ajouter congés, absences et contrats

- Créer :
  - `hr_leave_requests`,
  - `hr_contracts`.
- Ajouter workflow d’approbation.
- Ajouter alertes d’expiration.
- Relier les absences validées aux variables de paie.
- Ajouter une vue calendrier RH.

### Étape 7 — Ajouter exports et reporting

- Export Excel de paie.
- Export bancaire.
- Livre de paie.
- États sociaux/fiscaux.
- Rapports par période, statut, département ou contrat.
- Indicateurs RH dans le dashboard.

## Priorité conseillée

Ordre recommandé :

1. Sécurité et permissions RH.
2. Persistance des paramètres/conventions.
3. Variables mensuelles de paie.
4. Vraie clôture avec bulletins figés.
5. PDF officiel des bulletins.
6. Congés, contrats et documents RH.
7. Exports administratifs et reporting avancé.

C’est la séquence la plus sûre, car elle évite de produire des bulletins ou exports sur une base de données encore trop permissive ou avec des paramètres non persistés.
