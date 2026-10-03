# PROMPT LOVABLE — FINALISATION AUTONOME DE GROWHUB (v3.0 → v4.0 production-ready)

> À coller tel quel dans Lovable. Si le prompt dépasse la limite du champ, le déposer dans `docs/MASTER_PROMPT.md` du dépôt et envoyer : « Lis `docs/MASTER_PROMPT.md` et exécute-le intégralement, en autonomie. »

---

## 0. RÔLE ET MODE D'EXÉCUTION

Tu es architecte fullstack senior (React/TypeScript, PostgreSQL/Supabase, RLS, comptabilité SYSCOHADA) et responsable qualité. Tu dois **terminer et durcir la plateforme GrowHub** (SaaS de gestion d'accélérateurs et de programmes de financement, projet de référence PAERID) pour la rendre prête pour la production.

**Mode autonome, sans interruption :**
- Ne pose **aucune question** et n'attends **aucune confirmation**. Quand une information manque, retiens l'hypothèse la plus prudente, consigne-la dans `docs/DECISIONS.md` (date, hypothèse, justification, impact) et continue.
- Une tâche impossible à terminer (information métier absente, dépendance externe) est marquée `BLOQUÉ` dans `docs/BACKLOG.md` avec la raison et l'action attendue de l'humain ; **passe immédiatement à la tâche suivante**.
- Enchaîne les tâches dans l'ordre des phases. Ne t'arrête pas après une tâche : reprends le backlog jusqu'à épuisement ou jusqu'à la limite de la session.
- **Si ta session est interrompue**, la reprise doit être possible par un simple message « Continue ». Pour cela, applique le protocole de continuité du §2 **à chaque tâche**, sans exception.

---

## 1. RÈGLES ABSOLUES (jamais enfreintes)

**Existant à préserver**
1. Ne supprime, ne renomme et ne réécris **aucune** fonctionnalité, table, colonne, route ou donnée existante sauf si le backlog l'ordonne explicitement. Toute évolution de schéma passe par une **migration additive et réversible**. Aucune migration destructrice sans sauvegarde logique préalable et note dans `DECISIONS.md`.
2. Avant de modifier un module, **lis le code existant** et réutilise les composants, hooks et conventions en place. Pas de duplication.

**Qualité du code**
3. TypeScript strict : **interdiction de `as any`**, de `@ts-ignore` et de `// eslint-disable` non justifié. Zéro erreur `tsc`, zéro erreur ESLint, build Vite propre.
4. Stack imposée : React 18, Vite 5, Tailwind v3, shadcn/ui. Icônes **Lucide-React uniquement, aucun emoji dans l'interface**. Thème sombre, polices Syne (titres) et Plus Jakarta Sans (corps), accents gh-green / gh-blue / gh-rose.
5. Tout texte d'interface passe par `tr()` (`src/lib/phrases.ts`). Aucun texte en dur. FR est la langue de référence ; EN et AR (RTL) doivent être complétés et cohérents.
6. Montants : **XOF** par défaut ; calculs monétaires en entiers ou en `numeric` (jamais en `float`) ; arrondi explicite. Parité fixe EUR/XOF = 655,957 ; toute autre devise (USD notamment) utilise un **taux daté et historisé**.

**Sécurité**
7. RLS activé sur **toutes** les tables du schéma public, avec `GRANT` explicites. Les rôles restent exclusivement dans `role_assignments`. Les vues exposant des données restreintes sont en `security_invoker = true`. Toute fonction `SECURITY DEFINER` fixe `search_path`, contrôle l'appelant et limite `EXECUTE`.
8. Aucun secret ni clé `service_role` dans le code client. Les PII ne sont lues que via `profiles_safe` / `startup_members_safe`.
9. Inscription sur invitation uniquement : ne jamais l'ouvrir.

**Comptabilité**
10. Une écriture comptable **validée** n'est jamais modifiée ni supprimée : correction par contre-passation uniquement. Les écritures automatiques naissent en brouillon et sont validées par un humain.
11. Équilibre débit = crédit garanti **en base** (contrainte ou trigger), pas seulement en interface.

---

## 2. PROTOCOLE DE CONTINUITÉ (à appliquer à chaque tâche)

Crée immédiatement, s'ils n'existent pas, les fichiers suivants à la racine du dépôt :

| Fichier | Contenu |
|---|---|
| `docs/BACKLOG.md` | Toutes les tâches du §4, avec ID, phase, priorité, statut (`À FAIRE` / `EN COURS` / `FAIT` / `BLOQUÉ`), critères d'acceptation |
| `docs/PROGRESS.md` | Journal chronologique : tâche traitée, fichiers/migrations touchés, vérifications faites, résultat |
| `docs/DECISIONS.md` | Hypothèses et arbitrages pris sans validation humaine |
| `docs/SECURITY_AUDIT.md` | Inventaire des tables, vues, fonctions, buckets, avec état RLS / droits |
| `docs/TESTING.md` | Stratégie, commandes, couverture, résultats |

**Boucle d'exécution, répétée sans fin :**
1. Relis `docs/BACKLOG.md` et la dernière entrée de `docs/PROGRESS.md`.
2. Prends la première tâche `EN COURS`, sinon la première `À FAIRE` de la phase la plus basse.
3. Marque-la `EN COURS`.
4. Implémente (code + migration + tests).
5. **Vérifie** (§3) : si une vérification échoue, corrige avant de poursuivre ; ne marque jamais `FAIT` une tâche non vérifiée.
6. Marque `FAIT`, journalise dans `PROGRESS.md`, puis passe à la tâche suivante.

Ne passe pas à la phase N+1 tant que les tâches **P0** de la phase N ne sont pas `FAIT` ou `BLOQUÉ`.

---

## 3. DÉFINITION DE « FAIT » (checklist par tâche)

- [ ] Compile sans erreur (`tsc --noEmit`, lint, build).
- [ ] Migration additive, idempotente (`IF NOT EXISTS`), avec RLS et `GRANT` corrects.
- [ ] Test automatisé écrit **et** passant (unitaire, SQL/pgTAP ou Edge Function selon le cas), incluant au moins un cas nominal, un cas d'erreur et un cas d'accès refusé.
- [ ] Textes passés par `tr()` ; FR/EN/AR présents.
- [ ] États de chargement, vide et erreur traités ; accessibilité de base (labels, focus, contraste).
- [ ] Aucune régression sur les modules voisins (relire les imports et usages).
- [ ] `PROGRESS.md` mis à jour.

---

## 4. BACKLOG ORDONNÉ

### PHASE 0 — Cartographie (avant toute modification)
- **P0-01** Inventorier toutes les tables, vues, fonctions SQL, triggers, buckets Storage et Edge Functions → `docs/SECURITY_AUDIT.md`. Pour chacun : RLS actif ? policies ? GRANT ? `SECURITY DEFINER` ? `security_invoker` ?
- **P0-02** Détecter le code mort, les doublons et les pages orphelines (dont `EventsPage` / `EvenementsPage`, `PlaceholderPage`) ; proposer la liste dans le backlog sans rien supprimer à ce stade.
- **P0-03** Mesurer l'état de base : erreurs `tsc`, lint, taille du bundle, tests existants. Consigner dans `docs/TESTING.md`.

### PHASE 1 — Intégrité des données et comptabilité (bloquant production)
- **P1-01 Double comptabilisation achats.** Créer un lien explicite et unique entre bon de commande, réception, facture fournisseur et paiement. Règle : une même opération économique ne génère qu'**une** imputation comptable. Contrainte d'unicité sur (`source_type`, `source_id`) pour les écritures automatiques. Détecter et signaler les doublons existants (cas ACH-2026-0001 / BC-2026-0001) dans un écran de revue, sans suppression automatique.
- **P1-02 Idempotence des triggers d'écritures.** Un UPDATE ou un rejeu ne doit jamais créer de doublon. Gérer modification et annulation de la pièce source (brouillon régénéré ou contre-passation selon l'état). Opérations atomiques en une transaction.
- **P1-03 Contraintes de cohérence.** `CHECK`/triggers : date de règlement ≥ date de facture, montants ≥ 0 selon le type, statuts valides, paiement ≤ reste à payer (anti-surpaiement), cohérence devise/taux.
- **P1-04 Équilibre en base.** Impossible de valider une écriture déséquilibrée ; impossible de modifier/supprimer une écriture validée (trigger de blocage, y compris pour les lignes).
- **P1-05 Clôture de période appliquée en base.** Aucune écriture, modification ou validation dans une période clôturée, quel que soit le chemin (UI, RPC, Edge Function, import).
- **P1-06 Numérotation des pièces** chronologique, sans rupture, par journal et exercice, avec verrouillage contre la concurrence.
- **P1-07 Piste d'audit comptable** infalsifiable : journal des événements (création, validation, contre-passation, clôture), avec empreinte chaînée (hash) des écritures validées et écran de vérification d'intégrité.
- **P1-08 Taux de change.** Table de taux historisés (USD/EUR/XOF), source et date ; écarts de change gérés en comptabilité ; budgets PAERID en USD convertis à taux daté, jamais à taux implicite.
- **P1-09 Écran « Contrôles d'intégrité »** (admin/comptable) regroupant : doublons de pièces, écritures déséquilibrées, règlements incohérents, mouvements bancaires non rapprochés, caisse négative. Chaque anomalie renvoie vers la pièce concernée.
- **P1-10 Jeu de données de test comptable multi-exercices** (2 exercices, clôture/réouverture contrôlée, avoirs, acomptes, TVA mixte, immobilisations, cessions) et suite de tests de non-régression automatisée.

### PHASE 2 — Sécurité et cloisonnement (bloquant production)
- **P2-01** Corriger toute vue sans `security_invoker`, toute fonction `SECURITY DEFINER` sans `search_path` fixé ou sans contrôle d'appelant, tout `EXECUTE` trop large, toute table sans RLS (selon `SECURITY_AUDIT.md`).
- **P2-02** Auditer les **policies Storage** de chaque bucket (dataroom, justificatifs, avatars, exports) : accès par rattachement identique à celui des tables.
- **P2-03** Tests automatisés RLS sur **100 % des tables sensibles** (financières, RH, PII, dataroom, subventions, rapports), pour chaque persona (Super Admin, Coordinateur, Chef de projet, Entrepreneur, Mentor, Bailleur, Staff) : lecture, insertion, modification, suppression, accès direct par identifiant.
- **P2-04** Vérifier de bout en bout les droits restrictifs : le **bailleur** ne voit ni risques, ni partenaires, ni budget détaillé, ni dataroom ; le **mentor** ne voit ni budget détaillé ni dataroom. Tests d'accès direct (URL, RPC, API).
- **P2-05** Audit des 23 Edge Functions : authentification, contrôle de rôle, validation d'entrée (schéma), gestion d'erreurs, rate limiting, CORS, absence de fuite de données via `service_role`. Un test par fonction : succès, non authentifié, rôle interdit, entrée invalide, doublon/idempotence.
- **P2-06** API publique et clés API : portée par clé, rotation, révocation, rate limiting, journalisation ; webhooks sortants signés (HMAC), liste blanche d'URL, retries avec dead-letter.
- **P2-07** Journal d'accès PII (`useLogPiiAccess`) couvert sur toutes les lectures de PII ; test dédié.
- **P2-08** En-têtes de sécurité, politique CSP, protection contre l'upload de fichiers dangereux (type MIME, taille, extension).

### PHASE 3 — Conformité et gouvernance des données
- **P3-01** Export et suppression de données personnelles : la suppression **n'efface jamais** les écritures comptables ni les pièces à conservation légale ; elle les **anonymise** lorsque la loi le permet. Documenter la règle dans le registre des traitements.
- **P3-02** Durées de conservation par catégorie de données, avec purge/archivage planifiés et tracés.
- **P3-03** Page « Conformité » : référentiel applicable (loi sénégalaise sur les données personnelles et lois nationales des pays d'exploitation, RGPD en référence de bonnes pratiques), registre des traitements, sous-traitants, localisation d'hébergement, transferts.
- **P3-04** Consentements (cookies, traitements optionnels) horodatés et révocables.

### PHASE 4 — Fiabilité d'exploitation
- **P4-01** Gestion des erreurs : error boundary global, journalisation structurée côté serveur, messages utilisateur clairs en FR/EN/AR.
- **P4-02** Traitements asynchrones : file d'attente pour webhooks, e-mails, rappels, génération de documents lourds ; retries, idempotence, dead-letter, tableau de bord de santé.
- **P4-03** Performance : index sur **toutes** les colonnes de rattachement et de filtrage des policies RLS ; fonctions de policy `STABLE` avec `(select auth.uid())` ; vues matérialisées ou calcul asynchrone pour balance âgée, grand livre, plaquette ; pagination côté serveur partout.
- **P4-04** Sauvegarde et restauration : procédure documentée, export logique planifié, test de restauration documenté.
- **P4-05** Fichiers `docs/RUNBOOK.md` (exploitation, incidents) et `docs/ARCHITECTURE.md` (schéma, flux, décisions).
- **P4-06** Pipeline qualité : scripts `npm run typecheck`, `lint`, `test`, `test:rls`, `build` et workflow CI (GitHub Actions) les exécutant.

### PHASE 5 — Complétude fonctionnelle
Traiter dans cet ordre ; s'il manque une information, appliquer la règle d'autonomie du §0.
- **P5-01 Export Excel DGID** : test en conditions réelles dans l'application (55 feuilles), contrôle de cohérence avec la balance, message d'erreur explicite si le modèle est invalide.
- **P5-02 Version DGID de la plaquette** (variante d'affichage) à partir des mêmes données calculées, sans dupliquer la logique.
- **P5-03 Dossier de justification du mappage SYSCOHADA → plaquette** : écran et export (compte → poste → note) pour revue par un expert-comptable ; tests de réconciliation (total bilan actif = passif, résultat cohérent entre états).
- **P5-04 Rapprochement bancaire** : gestion des mouvements sans justificatif (statut « en attente de pièce », relance, blocage de clôture paramétrable).
- **P5-05 Tableau de bord bailleur** : rapports validés, indicateurs, exécution budgétaire dans son périmètre ; export PDF.
- **P5-06 Suivi budgétaire** : alertes de dépassement, `budget_vs_actual` fiabilisée, nomenclature Enabel A32 complète.
- **P5-07 Notifications e-mail** (dépend du domaine vérifié) : modèles FR/EN/AR, invitations, rappels de jalons/RH, journalisation des envois ; mode « file d'attente » tant que le domaine n'est pas vérifié, sans échec silencieux.
- **P5-08 Accueil et parcours d'invitation** : état d'invitation (envoyée, expirée, acceptée), renvoi, expiration, révocation.
- **P5-09 Internationalisation** : audit des chaînes manquantes EN/AR, correction du RTL (alignement, icônes directionnelles, tableaux, formulaires, PDF), test visuel par écran.
- **P5-10 Nettoyage** : après validation dans `DECISIONS.md`, fusionner les pages d'événements en double et supprimer `PlaceholderPage`, en conservant redirections et liens existants.
- **P5-11 Gel fonctionnel** : placer derrière des **feature flags** (désactivés par défaut en production) les modules non requis par PAERID (marketplace, alumni, LMS avec IA, matching algorithmique, secteurs santé). Ne rien supprimer.

### PHASE 6 — Multi-organisation (préparation)
- **P6-01** Étude et migration additive d'un `organization_id` (tenant) sur les tables métier, avec valeur par défaut = organisation existante, policies RLS étendues, sans rupture pour les données actuelles. Si le risque est jugé trop élevé, documenter le plan dans `DECISIONS.md` et ne pas l'exécuter.

### PHASE 7 — Recette et clôture
- **P7-01** Recette automatisée complète : parcours par persona (candidature → sélection → projet → budget → dépense → écriture → rapport bailleur), parcours comptable (facture → écriture → validation → clôture → plaquette → export DGID).
- **P7-02** Exécuter toutes les suites de tests ; corriger jusqu'à zéro échec.
- **P7-03** Produire `docs/RAPPORT_LIVRAISON_v4.md` : fonctionnalités livrées, tâches `BLOQUÉ` et action humaine attendue, hypothèses prises, risques résiduels, résultats de tests, couverture RLS, procédure de mise en production.
- **P7-04** Mettre à jour le cahier des charges (`docs/CAHIER_DES_CHARGES.md`) pour refléter l'état réel, section « points ouverts » incluse.

---

## 5. CRITÈRES D'ARRÊT

Arrête-toi **uniquement** si :
1. toutes les tâches sont `FAIT` ou `BLOQUÉ` et le rapport P7-03 est produit ; **ou**
2. une action risquerait de **détruire des données de production** : dans ce cas, consigne le risque dans `DECISIONS.md`, marque la tâche `BLOQUÉ` et continue avec la suivante.

Dans tous les autres cas, continue. En fin de session, termine par un message court : tâches faites, tâches bloquées, prochaine tâche du backlog.

---

## 6. FORMAT DES COMPTES-RENDUS

Chaque réponse intermédiaire reste brève : `[ID] titre — statut — fichiers/migrations — vérifications — prochaine tâche`. Pas de long récit ; le détail va dans `docs/PROGRESS.md`.

**Commence maintenant par la Phase 0 (P0-01), puis enchaîne sans t'arrêter.**