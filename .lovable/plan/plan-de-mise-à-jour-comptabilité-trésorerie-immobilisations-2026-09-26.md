# Plan de mise à jour : Comptabilité, Trésorerie, Immobilisations, États financiers

Il part de la recette du 26/09/2026 (16 tests réussis, 10 échoués) et des protocoles OHADA reçus. Il y a 4 vagues, et chacune se termine par une nouvelle recette sur l'entreprise fictive, effacée ensuite.

## Vague 1 : corriger les 8 défauts (priorité haute)
1. Refuser un compte archivé à la validation.
2. Interdire l'effacement d'une écriture validée, même directement dans la base. On annule seulement par contre-passation.
3. Anti-doublon : un numéro de pièce unique par journal et par exercice.
4. Refuser un règlement plus élevé que le reste à payer de la facture.
5. Bloquer une sortie de caisse qui rendrait la caisse négative. La banque reste permise, avec un avertissement.
6. Refuser un règlement daté dans un exercice clôturé ou absent.
7. Garder une trace des modifications des immobilisations et de leurs sorties, et des comptes de trésorerie.
8. Permettre les biens non amortissables (terrains) avec une durée à 0.
9. Prorata d'amortissement au mois, comme dans le protocole. Le calcul au jour reste possible en option.

## Vague 2 : clôture et régularisations
- Assistant de clôture : contrôles (brouillons restants, balance, comptes d'attente 47), écritures de régularisation, calcul du résultat, clôture, puis à-nouveaux automatiques.
- Régularisations : charges et produits constatés d'avance (476/477), factures non parvenues ou à établir (408/418), extournées toutes seules au 1er jour de l'exercice suivant.
- Provisions et dépréciations : clients douteux (491), stocks (39), risques (19), avec dotation et reprise.
- Affectation du résultat et dividendes : réserves (11), report à nouveau (12), dividendes à payer (465), puis paiement par la Trésorerie.
- Actionnaires : registre du capital (101), apports, libération.

## Vague 3 : trésorerie et financements
- Emprunts : fiche d'emprunt, tableau d'amortissement (capital et intérêts), échéances payées par la Trésorerie (162 / 6712), intérêts courus à la clôture.
- Rapprochement bancaire : import d'un relevé (CSV), rapprochement automatique par montant et référence, état de rapprochement.
- Devises : taux du jour, écarts de change à la clôture (476/477, 676/776).
- Prévision de trésorerie reliée aux échéances des factures, des emprunts et des salaires.
- Encaissements et décaissements en lot (plusieurs factures d'un coup).

## Vague 4 : stocks, TVA, auxiliaires, états
- Stocks : articles, entrées et sorties, valeur au coût moyen (CMUP), inventaire, variation de stock (6031/7361) à la clôture.
- Déclaration de TVA mensuelle : TVA collectée moins TVA déductible, crédit reporté, paiement (4441).
- Auxiliaires clients et fournisseurs : balance âgée, relevé de compte, lettrage automatique.
- Établissements : ventilation analytique par établissement.
- Intra-groupe et parties liées : signalement des tiers liés, tableau pour la note annexe.
- États financiers : export Excel au format DGID (le modèle Excel reçu était vide, il faut le renvoyer), et des contrôles croisés (bilan = balance, TFT = variation de trésorerie).

## Ce que vous verrez
- Nouveaux menus : Clôture, Emprunts, Stocks, TVA, Actionnaires, et Rapprochement dans Trésorerie.
- Blocages clairs quand une opération n'est pas conforme.
- Un rapport de recette après chaque vague.

## Détails techniques
- Contrôles 1 à 6 dans les triggers existants (`acc_check_entry_rules`, nouveau trigger `BEFORE DELETE` sur `accounting_entries`, unicité `(journal_id, fiscal_year_id, piece_ref)`, contrôles dans `treasury_auto_entry`). Audit par `log_activity` sur `accounting_fixed_assets` et `treasury_*`. Contrainte de durée assouplie si `method='non_amortissable'`. `acc_asset_dotation` au mois.
- Nouvelles tables : `acc_loans` + `acc_loan_schedule`, `acc_accruals`, `acc_provisions`, `shareholders`, `stock_items` + `stock_moves`, `vat_returns`, `bank_statements` + `bank_statement_lines`, `establishments`. Chacune avec les GRANT, le RLS `can_view_accounting` / `is_admin_or_coordinator` et des écritures en brouillon générées par des fonctions.
- Les recettes passent par un script SQL annulé en fin d'exécution, comme la précédente.
