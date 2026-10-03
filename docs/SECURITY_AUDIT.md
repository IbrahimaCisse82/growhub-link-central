# SECURITY AUDIT — inventaire (03/10/2026)

| Élément | Nombre | Constat |
|---|---|---|
| Tables publiques | 170 | RLS actif sur 170/170 |
| Vues | 10 | 7 sans `security_invoker` : profiles_safe, startup_members_safe (volontaire : vues masquantes), accounting_balance, cost_imputation_consolidated, system_health_overview, me_indicator_progress, treasury_consolidated |
| Fonctions SECURITY DEFINER | 113 | 4 sans `search_path` fixé : enqueue_email, move_to_dlq, delete_email, read_email_batch (file e-mail, service uniquement) |
| Triggers | 260 | — |
| Fonctions serverless | 23 | Audit détaillé antérieur : 4 critiques (crm-daily-job, dispatch-domain-webhooks, hr-daily-reminders, weekly-digest), 2 critiques d'accès (send-invoice-email, send-quote-email), 3 élevées (elearning-ai, send-web-push, daily-digest) — à traiter en P2-05 |

## Espaces de fichiers
| Espace | Public | Remarque |
|---|---|---|
| avatars, logos, resources, message-attachments | oui | message-attachments public = risque (P2-02) |
| hr-expense-receipts, receipts, grant-documents, entity-documents, gdpr-exports | non | policies à vérifier en P2-02 |

## Décisions
- profiles_safe / startup_members_safe restent sans security_invoker : elles masquent les données personnelles et doivent lire la table sous-jacente.
