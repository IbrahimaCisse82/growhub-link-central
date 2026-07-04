---
name: Observabilité & SRE
description: BLOC 10 — capture erreurs client, snapshots santé système, dashboard admin /app/admin/system-health
type: feature
---
# BLOC 10 — Observabilité & SRE

## Tables
- `client_error_log` : erreurs JS capturées (message, stack, route, severity info/warning/error/fatal, context JSONB). Insert par tout authenticated, SELECT réservé super_admin / coordinator.
- `system_health_snapshots` : snapshots périodiques (active_users_24h, domain_events_24h, errors_24h, emails_sent_24h, webhook_failures_24h). SELECT/INSERT admin only.
- Vue `system_health_overview` (security_invoker) : agrégation temps réel des compteurs (users, projects, événements 1h/24h, erreurs, emails, activity).

## Capture erreurs
- `src/lib/observability/init.ts` : listeners globaux `error` + `unhandledrejection` → `logClientError()`.
- `src/components/shared/GlobalErrorBoundary.tsx` : React ErrorBoundary racine (main.tsx), écrit en `fatal` avec componentStack.
- `logClientError()` dans `useSystemHealth.ts` : swallow silencieusement, jamais bloquant.

## UI
- `/app/admin/system-health` (`SystemHealthPage.tsx`) : statut global (Opérationnel/Dégradé/Critique selon critical_errors_24h), 8 metric cards, graphique snapshots (recharts), liste des 50 dernières erreurs avec badge severity.
- Bouton "Snapshot" → `useCaptureHealthSnapshot` (lit overview puis insert).
- Auto refetch overview toutes les 30s.
- Sidebar : "Santé système" (HeartPulse) dans groupe Administration.
