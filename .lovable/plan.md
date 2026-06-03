# BLOC 6 — Sécurité & Conformité (P0)

Objectif : rendre la plateforme déployable en production avec conformité RGPD / Loi sénégalaise 2008-12 et durcissement sécurité admin.

## Périmètre

### 6.1 — MFA / 2FA (TOTP)
- Activer Supabase Auth MFA (TOTP) via `configure_auth` + HIBP password check.
- Page `/app/parametres/securite` : enrôlement TOTP (QR code), liste facteurs, révocation.
- **Enforcement** : guard `MfaGuard` qui force l'enrôlement pour `super_admin` et `coordinator` (redirection si aucun facteur actif).
- Hook `useMfaFactors` (list, enroll, verify, unenroll).

### 6.2 — RGPD : Export & droit à l'oubli
- **Table** `data_export_requests` (user_id, status, requested_at, completed_at, file_path).
- **Table** `account_deletion_requests` (user_id, status, requested_at, scheduled_for, reason).
- **Edge function `gdpr-export`** : agrège toutes les données personnelles (profiles, applications, alumni, hr_employees, messages, coaching, kpis…) en un ZIP JSON+CSV stocké dans bucket privé `gdpr-exports`, retour signed URL 7 jours.
- **Edge function `gdpr-delete`** : anonymise le user (full_name→"Utilisateur supprimé", email→hash, photo→null), conserve les agrégats métier (factures, paie historique pour obligations légales 10 ans) avec flag `is_anonymized`, supprime PII (phone, bio, linkedin, avatar). Délai 30j avec possibilité d'annulation.
- Page `/app/profil` → onglet "Mes données" : bouton Export + bouton Supprimer (double confirmation + raison).
- Colonnes `is_anonymized boolean default false` sur `profiles`, `hr_employees`.

### 6.3 — Registre des traitements (Article 30 RGPD)
- **Table** `data_processing_register` (treatment_name, purpose, legal_basis, data_categories[], retention_period_days, recipients[], cross_border_transfer, security_measures).
- Page `/app/parametres/conformite` : CRUD admin avec export PDF.
- Seed 8 traitements types (RH, Candidatures, Coaching, Subventions, Alumni, Communications, Logs, Cookies).

### 6.4 — Audit consultations PII
- **Table** `pii_access_log` (user_id, accessed_entity_type, accessed_entity_id, accessed_fields[], purpose, accessed_at).
- Vue admin `/app/parametres/audit-pii` : recherche par user/entité/période, export CSV.
- Hook `useLogPiiAccess` appelé dans `StartupDetailPage`, `HrEmployees`, `AlumniDetailPanel` (lecture fiche complète d'un tiers).
- Trigger d'écriture côté client (RLS : insert only own logs).

### 6.5 — Consentement cookies & opt-in
- Bannière `<CookieConsent />` (3 catégories : nécessaires/analytics/marketing) avec localStorage + table `cookie_consents` (user_id, categories, given_at, revoked_at, ip_hash).
- Page publique `/politique-confidentialite` et `/mentions-legales` (templates FR/EN/AR).
- Lien footer dans `AppLayout` + `LoginPage`.

### 6.6 — Backup & DR — Documentation
- `docs/SECURITY.md` : procédures backup (Lovable Cloud auto-PITR), restore, RPO/RTO cibles.
- `docs/INCIDENT_RESPONSE.md` : matrice escalade, contacts CDP Sénégal (notification 72h obligatoire).
- README mis à jour avec section conformité.

## Hors périmètre (justification)

- **Rate limiting** : la plateforme Lovable Cloud n'expose pas de primitive standard ; à adresser séparément côté infra/WAF si exposition publique critique.
- **WAF / DDoS** : géré par Lovable Cloud / Cloudflare en amont.
- **Pentest** : audit externe distinct (livré par cabinet certifié post-bloc).

## Détails techniques

| Élément | Tech |
|---|---|
| MFA enrôlement | `supabase.auth.mfa.enroll({factorType: 'totp'})` + QR code via `qrcode.react` |
| Export ZIP | `jszip` + `papaparse` côté edge function |
| Anonymisation | function SQL `anonymize_user_data(uuid)` SECURITY DEFINER |
| Audit triggers | côté front (RLS strict) car certaines lectures ne traversent pas la DB |
| Cookie banner | nouveau composant + provider React |
| Migrations | 4 migrations atomiques (MFA n'en nécessite pas — géré par Supabase Auth) |
| Edge functions | 2 nouvelles : `gdpr-export`, `gdpr-delete` (`verify_jwt = true`) |
| Buckets | 1 nouveau : `gdpr-exports` (privé) |

## Volumétrie

| Item | Tables | Edge fn | Pages | Composants | Hooks |
|---|---|---|---|---|---|
| 6.1 MFA | 0 | 0 | 1 | 2 (Setup, Guard) | 1 |
| 6.2 RGPD | 2 | 2 | 1 onglet | 3 | 2 |
| 6.3 Registre | 1 | 0 | 1 | 2 | 1 |
| 6.4 Audit PII | 1 | 0 | 1 | 1 | 1 |
| 6.5 Cookies | 1 | 0 | 2 publiques | 2 | 1 |
| 6.6 Docs | 0 | 0 | 0 | 0 | 0 |

## Ordre d'exécution suggéré

1. Migration globale (6 tables + 1 bucket + function anonymize)
2. Activation `configure_auth` (MFA + HIBP)
3. Edge functions `gdpr-export` + `gdpr-delete`
4. Hooks (`useMfaFactors`, `useGdprRequests`, `useDataProcessingRegister`, `usePiiAccessLog`, `useCookieConsent`)
5. Pages & composants (Sécurité, Conformité, Audit PII, Mes données, Cookie banner)
6. Routes + sidebar
7. Documentation `docs/SECURITY.md` + `docs/INCIDENT_RESPONSE.md`
8. Mémoires (`mem://security/mfa-rgpd-conformite`)

## Question

Confirme-tu ce périmètre, ou tu veux qu'on **réduise** (ex: seulement MFA + RGPD export/delete, sans registre ni cookies pour ce bloc) afin d'aller plus vite ?
