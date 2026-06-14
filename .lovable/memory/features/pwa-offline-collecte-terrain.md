---
name: PWA offline & collecte terrain
description: BLOC 9 — Service worker via vite-plugin-pwa, file IndexedDB pour mutations hors-ligne, page mobile /app/terrain
type: feature
---
# BLOC 9 — PWA offline + collecte terrain

## Stack
- `vite-plugin-pwa` v1 (generateSW, autoUpdate, filename `sw.js`)
- `workbox-window` / `workbox-*` (NetworkFirst nav, CacheFirst static & images)
- `idb` v8 pour file de mutations offline

## Configuration
- `vite.config.ts` : VitePWA avec `devOptions.enabled=false`, `injectRegister=null`, `manifest=false` (on garde `/public/manifest.json`).
- Runtime caching :
  - `NetworkFirst` pour navigations HTML (timeout 5s, exclut `/~oauth`, `/api`, `/auth/v1`).
  - `CacheFirst` pour assets statiques same-origin et images.
- `navigateFallbackDenylist`: `/~oauth`, `/api`, `/auth/v1`.

## Registration guard (`src/lib/pwa/registerSW.ts`)
Refuse l'enregistrement si :
- `!import.meta.env.PROD`
- dans une iframe
- hostname `id-preview--*`, `preview--*`, `*.lovableproject.com`, `*.lovableproject-dev.com`, `*.beta.lovable.dev`
- query `?sw=off`
Dans tous ces cas → désenregistre les SW existants pour `/sw.js`.

## File offline (`src/lib/offline/db.ts`)
IndexedDB `growhub-offline.queue` :
- `OfflineOperation` : `me_measurement | task_status | task_create`
- API : `enqueueOffline`, `listQueue`, `removeQueueItem`, `markAttempt`, `queueSize`

## Sync (`src/hooks/useOfflineSync.ts`)
- Écoute `online`/`offline`, flush auto au retour réseau + toutes les 5s polling de la taille.
- Replay via `supabase.from(...)` (insert/update) ; invalide les query keys `me_measurements`, `me_indicator_progress`, `tasks`.

## UI
- `OfflineIndicator` (topbar) : badge vert/orange/rouge avec compteur de pending, click = flush manuel.
- `/app/terrain` (`FieldCollectionPage`) : formulaire mobile-first (max-w-2xl) pour saisir des mesures M&E ; enqueue local puis flush si online.
- Sidebar : "Collecte terrain" dans groupe Insights ; visible pour project_manager + funder.

## Anciens artefacts supprimés
- `public/sw.js` (hand-rolled) supprimé — remplacé par celui généré par vite-plugin-pwa au build.
- Ancien `if ('serviceWorker' in navigator) ...` dans `main.tsx` remplacé par `registerServiceWorker()`.
