---
name: Tests & CI/CD
description: BLOC 11 — Vitest étendu (payroll, workPackages, CRM), GitHub Actions lint+typecheck+test+build
type: feature
---
# BLOC 11 — Tests & CI/CD

## Tests unitaires (Vitest)
- `src/lib/__tests__/crmFormatters.test.ts` — formats XOF/EUR, aging, invoice remaining, quote totals.
- `src/lib/__tests__/payroll.test.ts` — ancienneté, IPRES RG/RCC, transport, HS, net, masse salariale.
- `src/lib/__tests__/workPackageUtils.test.ts` — parsing préfixes A1.x / I1.x / M1.x, fallback chunks, split titre sur `:`.
- Setup : `vitest.config.ts` (jsdom, globals), `src/test/setup.ts` (matchMedia stub).
- Commandes : `bun run test` (run) et `bun run test:watch`.

## CI GitHub Actions
- Fichier `.github/workflows/ci.yml`, déclenché sur push/PR `main`.
- Steps : checkout → setup-bun → `bun install --frozen-lockfile` → `bun run lint` → `bunx tsc --noEmit -p tsconfig.app.json` → `bun run test` → `bun run build`.
- Secrets attendus (fallbacks placeholder pour build) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
- Timeout job : 15 min.
