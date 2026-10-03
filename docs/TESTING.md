# TESTING — état de base (03/10/2026)

| Contrôle | Commande | Résultat |
|---|---|---|
| Typage | `npx tsgo --noEmit -p tsconfig.app.json` | 0 erreur |
| Lint | `bunx eslint src --quiet` | 788 erreurs (dette existante, à résorber en P4-06) |
| Tests unitaires | `bunx vitest run` | 4 fichiers, 43/43 réussis |
| Build | Vite | OK |
| Tests serverless | — | aucun (P2-05) |
| Tests RLS | — | manuels uniquement (P2-03) |
