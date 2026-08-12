# Migration de la base GrowHub vers Hostinger — analyse et options

## Verdict

Un **hébergement web mutualisé Hostinger ne peut pas héberger la base GrowHub**. C'est une limite de l'offre, pas de la plateforme :

- Pas d'accès root ni de Docker : impossible d'installer Postgres + les services Supabase (auth, API REST, storage, edge functions).
- Le MySQL fourni par le mutualisé n'est pas compatible : GrowHub utilise du PostgreSQL avancé (RLS, `SECURITY DEFINER`, triggers, vues `security_invoker`, types enum, JSONB, RPC). Une conversion vers MySQL signifierait réécrire ~141 tables, toutes les politiques de sécurité et ~30 fonctions serverless.
- Les ~30 fonctions serverless (invitations, emails, webhooks, API publique, RGPD, digests) tournent en Deno : le mutualisé ne les exécute pas.

Autrement dit : migrer la base sur du mutualisé n'est pas une migration, c'est une reconstruction complète de l'application.

## Ce que Hostinger peut faire pour GrowHub aujourd'hui

**Servir le domaine.** L'app publiée reste sur Lovable, et le domaine acheté chez Hostinger pointe dessus (enregistrements A + TXT). C'est immédiat, sans risque et sans perte de fonctionnalité.

## Les vraies options pour la souveraineté des données

### Option A — Rester sur Lovable Cloud + exports réguliers (recommandé court terme)
Les données restent sur le backend managé, mais vous gardez une copie sous votre contrôle.
- Export CSV par table depuis Cloud → Advanced settings → Export data.
- Aucun changement de code, aucune régression.
- Limite : l'hébergement reste managé, pas chez vous.

### Option B — VPS (Hostinger VPS ou autre) avec Supabase auto-hébergé
La seule voie technique réelle vers l'auto-hébergement.
- Nécessite une offre **VPS** (accès root), pas le mutualisé : upgrade requis. Dimensionnement réaliste pour GrowHub : 4 vCPU / 8–16 Go RAM / 100 Go SSD.
- Stack Docker : Postgres 15, GoTrue (auth), PostgREST, Storage, Realtime, Kong, Edge Runtime (Deno).
- Travail : dump/restore du schéma et des données, redéploiement des ~30 fonctions, recréation des buckets, régénération des clés, repointage de l'app (`VITE_SUPABASE_URL` / clé publiable), tests des 7 personas.
- À votre charge ensuite : sauvegardes, mises à jour de sécurité, monitoring, certificats SSL, disponibilité.
- Ce que Lovable ne peut pas faire : provisionner, configurer ou maintenir le VPS. Je peux préparer le dump, les scripts de déploiement et adapter le code, mais l'exploitation du serveur reste côté équipe.

### Option C — Postgres managé souverain (compromis)
Un Postgres managé chez un hébergeur de votre choix (ex. hébergeur européen/africain avec Postgres managé), + Supabase auto-hébergé pour auth/storage/functions. Moins d'exploitation qu'un VPS nu, mais même effort de migration.

## Recommandation

1. **Maintenant** : brancher le domaine Hostinger sur l'app publiée, et mettre en place des exports de données périodiques (Option A). Zéro risque, la plateforme reste 100 % opérationnelle.
2. **Si la souveraineté est une exigence contractuelle** (bailleur, CDP Sénégal) : passer sur un **VPS** (Option B) et planifier la migration comme un chantier dédié, avec une fenêtre de bascule et une phase de recette des 7 personas.

## Détails techniques (pour référence)

- Base actuelle : PostgreSQL managé, ~141 tables en schéma `public`, RLS activée partout, fonctions `SECURITY DEFINER` (`has_role`, `has_scoped_role`, `verify_api_key`, `seed_project_pmo`, `anonymize_user_data`…), vues `security_invoker` pour la protection PII.
- Storage : buckets `entity-documents`, `gdpr-exports`.
- Fonctions serverless Deno : invitations, emails transactionnels, webhooks, API publique v1, RGPD export/delete, digests, push, jobs quotidiens CRM/RH.
- Le front est un SPA Vite/React : il se rebranche via `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`, donc le changement de backend est trivial côté code — la complexité est entièrement côté infrastructure.

## Prochaine étape à confirmer

Dites-moi laquelle vous voulez et j'exécute :
- **A** : je vous guide sur le branchement du domaine Hostinger + la procédure d'export des données.
- **B** : je prépare le dossier de migration VPS (inventaire schéma, script docker-compose, checklist de bascule, plan de recette) — à exécuter par votre équipe infra sur un VPS.
