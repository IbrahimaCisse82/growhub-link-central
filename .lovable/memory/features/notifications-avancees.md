---
name: Notifications avancées (Bloc 12)
description: Web push VAPID + digest daily/weekly + préférences push_enabled
type: feature
---
# BLOC 12 — Notifications avancées

## Tables
- `push_subscriptions` : endpoint (UNIQUE), p256dh, auth_key, user_agent, last_used_at. RLS : user owns rows, service_role full.
- `user_notification_prefs.push_enabled` (bool) : opt-in par utilisateur pour les notifications push web.

## Service worker
- `public/push-handlers.js` injecté dans le SW généré par vite-plugin-pwa via `workbox.importScripts`.
- Gère `push` (affiche notification avec title/body/url/tag) et `notificationclick` (focus fenêtre existante ou openWindow).

## Client
- `src/lib/push/registerPush.ts` : `subscribeToPush()`, `unsubscribeFromPush()`, `isPushSupported()`, `isPushConfigured()` (dépend de `VITE_VAPID_PUBLIC_KEY`).
- `src/hooks/usePushSubscription.ts` : état `subscribed`, `subscribe()`, `unsubscribe()`, toasts intégrés.
- `src/components/settings/PushNotificationsCard.tsx` : UI d'activation dans /app/parametres.

## Edge functions
- `send-web-push` : POST `{user_id, title, body, url?, tag?}` → itère `push_subscriptions`, envoie via `web-push` (npm). Supprime les endpoints 404/410. Requiert `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- `daily-digest` : miroir de `weekly-digest` pour `email_digest_frequency='daily'`. Idempotence 20h glissantes.

## Cron recommandé (à planifier via supabase--insert)
```sql
select cron.schedule('daily-digest', '0 7 * * *', $$
  select net.http_post(url:='https://<ref>.supabase.co/functions/v1/daily-digest',
    headers:='{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
    body:='{}'::jsonb);
$$);
```

## Secrets requis pour activation complète push
- `VAPID_PUBLIC_KEY` (edge)
- `VAPID_PRIVATE_KEY` (edge)
- `VAPID_SUBJECT` (edge, mailto:)
- `VITE_VAPID_PUBLIC_KEY` (client, même valeur que public)

Sans ces secrets, l'UI push affiche "clés non configurées" mais tout le reste fonctionne (digest quotidien inclus).
