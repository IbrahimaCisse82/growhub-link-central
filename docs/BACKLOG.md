# BACKLOG — Finalisation GrowHub v4.0

Source : `docs/MASTER_PROMPT.md`. Statuts : À FAIRE / EN COURS / FAIT / BLOQUÉ. Reprise : envoyer « Continue ».

## Phase 0 — Cartographie
| ID | Prio | Statut | Tâche / critère |
|---|---|---|---|
| P0-01 | P0 | FAIT | Inventaire tables, vues, fonctions, triggers, buckets, fonctions serverless → `SECURITY_AUDIT.md` |
| P0-02 | P0 | FAIT | Code mort / doublons listés (voir ci-dessous), rien supprimé |
| P0-03 | P0 | FAIT | État de base mesuré → `TESTING.md` |

### Résultat P0-02 (candidats, à traiter en P5-10)
- `src/pages/app/PlaceholderPage.tsx` : orpheline (aucun import).
- `EventsPage` (/app/events) ≠ `EvenementsPage` (/app/evenements) : la première est le journal technique des événements métier (admin), la seconde les événements du programme. Pas un doublon fonctionnel ; renommage d'affichage recommandé.

## Phase 1 — Intégrité comptable
| ID | Prio | Statut | Tâche |
|---|---|---|---|
| P1-01 | P0 | FAIT | Lien unique BC → réception → facture → paiement ; unicité (source_type, source_id) ; écran revue doublons (ACH-2026-0001 / BC-2026-0001) |
| P1-02 | P0 | FAIT | Idempotence des triggers d'écritures |
| P1-03 | P0 | FAIT | Contraintes : règlement ≥ facture, montants, anti-surpaiement, devise/taux |
| P1-04 | P0 | FAIT | Équilibre en base + blocage modif écritures validées (lignes incluses) — partiellement existant (acc_guard_*) à vérifier |
| P1-05 | P0 | FAIT | Clôture de période appliquée en base sur tous chemins |
| P1-06 | P0 | À FAIRE | Numérotation sans rupture par journal/exercice, verrouillée |
| P1-07 | P1 | À FAIRE | Piste d'audit chaînée (hash) + écran vérification |
| P1-08 | P1 | À FAIRE | Taux de change historisés USD/EUR/XOF (table exchange_rates existante à étendre) |
| P1-09 | P1 | FAIT | Écran « Contrôles d'intégrité » |
| P1-10 | P1 | À FAIRE | Jeu de test multi-exercices + non-régression |

## Phase 2 — Sécurité
| ID | Prio | Statut | Tâche |
|---|---|---|---|
| P2-01 | P0 | À FAIRE | 7 vues sans security_invoker ; 4 fonctions file e-mail sans search_path (voir audit) |
| P2-02 | P0 | À FAIRE | Policies stockage des 9 espaces de fichiers |
| P2-03 | P0 | À FAIRE | Tests RLS automatisés par persona sur tables sensibles |
| P2-04 | P0 | À FAIRE | Droits restrictifs bailleur/mentor testés en accès direct |
| P2-05 | P0 | À FAIRE | Audit + tests des 23 fonctions serverless |
| P2-06 | P1 | À FAIRE | API publique / clés / webhooks HMAC |
| P2-07 | P1 | À FAIRE | Journal d'accès PII complet |
| P2-08 | P1 | À FAIRE | En-têtes, CSP, contrôle des téléversements |

## Phase 3 à 7
Toutes les tâches P3-01 → P7-04 du `MASTER_PROMPT.md` : À FAIRE.

## Bloqués connus (action humaine)
| ID | Raison | Action attendue |
|---|---|---|
| B-01 | Justificatifs des 2 mouvements bancaires non rapprochés 2026 | Fournir relevés |
| B-02 | Vraie subvention du bailleur (bailleur, montant, projet) | Fournir les informations |
| B-03 | Date réelle du règlement FAC-2026-0001 | Confirmer la date |
| B-04 | Domaine notify.growhub-managementsystem.online non vérifié | Ajouter les 3 enregistrements DNS chez Vercel |
