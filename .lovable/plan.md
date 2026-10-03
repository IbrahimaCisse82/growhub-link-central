# Finalisation comptable, sécurité et cloisonnement

## Objectif
Finaliser les annexes SYSCOHADA, les exports, les parcours comptables, la sécurité et les droits bailleur/mentor, puis rejouer une recette complète en français, anglais et arabe.

## 1. Plaquette SYSCOHADA et export PDF
- Transformer les 14 annexes encore manuelles en annexes alimentées par les données disponibles : identité de l’organisation, RH/paie, exercices, actionnaires, emprunts, immobilisations et balance.
- Ajouter des formulaires structurés et sécurisés pour les informations qui n’existent pas dans les écritures : dirigeants, engagements, méthodes comptables, retraite, éventualités et informations RSE.
- Enregistrer ces informations dans des tables dédiées, avec accès réservé à la comptabilité et modification limitée aux administrateurs/coordinateurs.
- Remplacer l’impression navigateur par un vrai téléchargement PDF avec pagination, tableaux, montants XOF et caractères français/arabe.
- Corriger les titres de plaquette non traduits et compléter les dictionnaires anglais/arabe.

## 2. Clôture 2026 et cohérence des données
- Importer puis rapprocher le relevé bancaire dès qu’il est fourni ; ne pas marquer les deux mouvements rapprochés sans justificatif.
- Générer les douze déclarations de TVA 2026 depuis les écritures validées, contrôler les montants et créer les écritures de TVA nécessaires en brouillon.
- Rejouer les contrôles de clôture, valider les écritures d’inventaire autorisées, puis clôturer uniquement si tous les contrôles sont verts.
- Ne pas modifier FAC-2026-0001 sans date correcte.
- Ne pas relier ACH-2026-0001 à BC-2026-0001 sans confirmation qu’il s’agit du même achat.

## 3. Parcours complets des nouveaux écrans
- Tester dans l’interface : rapprochement, régularisations, provisions, stocks, TVA, actionnaires et assistant de clôture.
- Utiliser des données de recette identifiables et les supprimer ou contre-passer après vérification.
- Vérifier chaque résultat jusque dans les écritures, la balance, le grand livre et les états financiers.

## 4. Sécurité des fonctions et tests automatisés
- Corriger d’abord les failles relevées : contrôle d’accès aux factures/devis, authentification des tâches planifiées et webhooks, protection des notifications push, validation stricte des entrées et messages d’erreur neutres.
- Relire individuellement les alertes du contrôleur de sécurité pour les nouvelles fonctions comptables et réduire les droits d’exécution au strict nécessaire.
- Ajouter des tests Deno aux 23 fonctions automatisées : authentification, rôles, validation, idempotence et erreurs, avec appels email/IA/webhooks simulés.
- Exécuter le contrôleur de sécurité et la suite complète après correction.

## 5. Droits bailleur et mentor
- Appliquer le choix restrictif par défaut :
  - bailleur : projet financé, subvention, budget synthétique et jalons ; aucun risque, partenaire, budget détaillé ni dataroom ;
  - mentor : projet et jalons rattachés ; aucun budget détaillé ni dataroom.
- Faire respecter ces droits dans les menus, les pages accessibles par URL directe et les règles de la base.
- Tester les nouvelles tables comptables et les pages projet avec les comptes entrepreneur, mentor et bailleur.

## 6. Traductions et validation finale
- Compléter les traductions EN/AR des sept nouveaux écrans, des auxiliaires et des annexes.
- Vérifier visuellement chaque écran dans les trois langues, y compris tableaux, boutons, confirmations et sens RTL.
- Vérifier sur ordinateur et mobile l’absence de texte coupé ou de chevauchement.

## Éléments bloqués jusqu’à réception
- Relevé bancaire 2026 correspondant aux deux mouvements non rapprochés.
- Nom du bailleur, montant, projet, dates et référence de convention pour créer la vraie subvention.
- Date correcte du règlement FAC-2026-0001.
- Confirmation que ACH-2026-0001 et BC-2026-0001 représentent ou non le même achat.

Tout le reste sera réalisé sans attendre ces quatre éléments.
