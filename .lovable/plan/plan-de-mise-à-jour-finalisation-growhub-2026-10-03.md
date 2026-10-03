# Plan de mise à jour — Finalisation GrowHub

## Contexte
Base vidée (seul le compte i.cisse@growhubsenegal.com + plan comptable + réglages subsistent). Import de relevés bancaires PDF/photo terminé et testé. Verrouillage comptable de base en place (anti-doublon, écritures validées verrouillées, écran Contrôles d'intégrité).

## Vague 1 — Fiabilité comptable (fin de la phase P1)
1. **Numérotation sans rupture** : séquences par journal/exercice, blocage des trous de numéros de pièces.
2. **Piste d'audit chaînée** : hash enchaîné sur les écritures validées (chaque écriture embarque l'empreinte de la précédente) — toute modification ou suppression devient détectable.
3. **Taux de change historisés** : table de taux datés, utilisés par les écritures en devise au lieu d'un taux unique.
4. **Clôture de période appliquée** : blocage de toute saisie/validation sur une période clôturée, contrôlé en base.
5. **Jeu de test multi-exercices** : données fictives 2017/2026 pour rejouer la recette complète (10 tests) après chaque vague.

## Vague 2 — Sécurité (phase P2)
1. Corriger les 7 vues qui ignorent les droits de l'utilisateur connecté (sauf vues masquantes volontaires) et verrouiller les 4 fonctions d'envoi d'e-mails (search_path).
2. Revoir les permissions des 9 espaces de fichiers (le partage de pièces jointes de messagerie est public = risque).
3. Tests automatisés du cloisonnement par persona (entrepreneur, mentor, bailleur) en accès direct.
4. Tests dédiés des 23 fonctions serverless (authentification, rôles, erreurs, doublons).
5. Journal d'accès aux données personnelles, en-têtes de sécurité et contrôle des téléversements.

## Vague 3 — Clôture 2026 et parcours écrans
1. Ouvrir l'exercice 2017, générer les écritures des frais bancaires/chèques du relevé test, rapprocher les 34 lignes.
2. Générer les 12 déclarations de TVA, traiter les mouvements non rapprochés, rejouer les contrôles, clôturer 2026.
3. Tester à l'écran (Playwright) : rapprochement, régularisations, provisions, stocks, TVA, actionnaires, clôture, jusqu'aux états financiers.

## Vague 4 — États financiers et exports
1. Automatiser les 14 annexes de la plaquette encore manuelles (calculs + formulaires + affichage).
2. Vérifier le téléchargement réel du PDF de la plaquette en français et en arabe.
3. Tester l'export Excel DGID en conditions réelles et produire la version DGID de la plaquette.

## Vague 5 — Traductions et finitions
1. Traduire EN/AR les écrans restants (opérations de clôture, plaquette, auxiliaires) et vérifier l'arabe en sens de lecture droite-à-gauche, sur ordinateur et mobile.
2. Nettoyer la page provisoire inutilisée et les 788 avertissements de style de code.
3. Mettre à jour le cahier des charges (v3.1) et le rapport de livraison.

## Points bloqués — action de votre côté
- Relevés bancaires des 2 mouvements non rapprochés de 2026.
- Informations de la vraie subvention du bailleur (bailleur, montant, projet).
- Date réelle du règlement de la facture FAC-2026-0001.
- 3 réglages DNS chez Vercel pour activer l'envoi d'e-mails (notify.growhub-managementsystem.online).

## Détails techniques
- Numérotation : séquences Postgres par (journal_id, exercice_id) + trigger de contrôle de continuité.
- Hash chaîné : colonne `prev_hash`/`hash` (sha256) sur accounting_entries, trigger à la validation, fonction de vérification affichée dans l'écran Contrôles d'intégrité.
- Taux de change : table `exchange_rates` (devise, date, taux), résolution au plus proche ≤ date d'écriture.
- Tout passe par des migrations SQL avec GRANT + RLS sur chaque nouvelle table ; tests en français ; vérification UI via Playwright.
