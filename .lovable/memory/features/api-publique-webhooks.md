---
name: API publique & Webhooks v2 (Bloc 13)
description: Clés API scopées lv_<prefix>_<secret>, endpoint public-api, journal webhook_deliveries
type: feature
---
# BLOC 13 — API publique & Webhooks v2

## Tables
- `api_keys` : user_id, name, key_prefix (unique), key_hash (SHA-256 du secret), scopes[] (read/write), last_used_at, expires_at, revoked_at. RLS : propriétaire ou admin.
- `webhook_deliveries` : historique par tentative (webhook_config_id, event_id, event_name, attempt, status, http_status, response_body, duration_ms, error). RLS lecture admin.

## Fonctions SQL
- `verify_api_key(_prefix, _hash)` SECURITY DEFINER → (api_key_id, user_id, scopes) si active et non expirée.
- `log_api_key_usage(_id)` → met à jour last_used_at.

## Edge function `public-api` (verify_jwt=false)
- Auth : `Authorization: Bearer lv_<prefix>_<secret>` → SHA-256 du secret puis `verify_api_key`.
- Scopes vérifiés ("read" requis pour GET).
- Endpoints GET : `/v1/me`, `/v1/projects` (filtré via `user_accessible_projects`), `/v1/grants`, `/v1/startups`.
- Base URL : `${VITE_SUPABASE_URL}/functions/v1/public-api`.

## Dispatcher webhooks (mise à jour)
- Signature HMAC-SHA256 déjà présente dans `X-GrowHub-Signature`.
- Chaque tentative log désormais dans `webhook_deliveries` (status, http_status, response_body, duration_ms, error).
- Retry exponentiel 1/5/30/120/1440 min, désactivation après 5 échecs (inchangé).

## UI
- Route `/app/admin/api-keys` (page `ApiKeysPage`) : création (clé affichée UNE SEULE FOIS), révocation, liste des clés + 50 dernières livraisons webhook.
- Lien sidebar sous Admin (KeyRound icon).

## Sécurité
- Le secret n'est jamais stocké en clair, seulement le hash SHA-256.
- Génération client-side via `crypto.getRandomValues` (24 bytes hex).
