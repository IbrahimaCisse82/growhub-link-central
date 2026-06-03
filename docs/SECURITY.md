# Sécurité & Conformité — GrowHub

## Posture sécurité

| Domaine | Mesure |
|---|---|
| Authentification | Email/password + Google OAuth + MFA TOTP (admins requis) |
| Mots de passe | Vérification HIBP (Have I Been Pwned) à la création/modification |
| Sessions | JWT Supabase Auth, refresh automatique, révocation possible |
| Transport | TLS 1.3 obligatoire (Lovable Cloud) |
| Base de données | RLS sur toutes les tables `public.*`, fonctions SECURITY DEFINER restreintes |
| PII | Vues `security_invoker = on`, audit consultation via `pii_access_log` |
| Buckets storage | Privés par défaut (`gdpr-exports`, `grant-documents`, `entity-documents`, `receipts`) avec signed URLs |
| Edge functions | `verify_jwt = true` par défaut, validation Zod des inputs |
| Webhooks | Backoff exponentiel, désactivation auto après 5 échecs |

## Backup & DR

**RPO** (Recovery Point Objective) : 5 minutes — Lovable Cloud effectue un Point-in-Time Recovery automatique.
**RTO** (Recovery Time Objective) : < 1 heure pour restauration complète.

### Procédure de restauration

1. Identifier le timestamp cible (avant l'incident).
2. Contacter le support Lovable Cloud (PITR self-service ou ticket).
3. Une instance restaurée est créée — bascule du DNS si besoin.
4. Re-déployer les edge functions depuis Git.
5. Vérifier l'intégrité avec un script de smoke-test (auth, lecture des principales tables).

### Tests périodiques

- **Mensuel** : test de restauration sur environnement de staging.
- **Trimestriel** : exercice de tabletop incident response.

## Conformité réglementaire

| Cadre | Statut |
|---|---|
| RGPD (UE) | Couvert — articles 15, 17, 30 implémentés |
| Loi sénégalaise n°2008-12 | Couvert — CDP comme autorité de contrôle |
| Notification de violation 72h | Procédure documentée (`INCIDENT_RESPONSE.md`) |

### Droits utilisateurs

- **Article 15 (accès)** : export ZIP via `/app/profil` → onglet "Mes données".
- **Article 17 (effacement)** : demande de suppression avec délai 30 jours, annulable. Anonymisation préservant les agrégats légaux (paie, factures conservés 10 ans).
- **Article 30 (registre)** : `/app/parametres/conformite` — CRUD + export CSV.

## Audit & traçabilité

- `activity_log` : actions CRUD sur entités critiques.
- `pii_access_log` : consultations de PII de tiers (fiches entreprises, employés, alumni).
- `domain_events` : event bus métier (project.created, grant.disbursed, payroll.validated, etc.).
- Logs auth Supabase : 30 jours rétention.

## Contacts

- DPO interne : contact@growhub.app
- Support Lovable Cloud : support@lovable.dev
- CDP Sénégal : www.cdp.sn
