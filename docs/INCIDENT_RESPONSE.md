# Plan de réponse aux incidents — GrowHub

## Classification

| Niveau | Description | Délai notification | Escalade |
|---|---|---|---|
| **P0 — Critique** | Violation de données confirmée, indisponibilité totale | Immédiat | DPO + Direction + CDP (72h) |
| **P1 — Majeur** | Faille de sécurité exploitable, perte de données partielle | < 4h | DPO + CTO |
| **P2 — Mineur** | Anomalie sans impact direct, tentative bloquée | < 24h | Équipe sécurité |
| **P3 — Information** | Suspicion, comportement anormal | Best effort | Équipe technique |

## Procédure P0 — Violation de données (article 33 RGPD)

### Heure 0 — Détection
1. Confirmer l'incident (faux positif vs réel).
2. Préserver les preuves (logs `auth_logs`, `activity_log`, `pii_access_log`).
3. Notifier DPO et Direction par canal sécurisé.

### Heure +1 — Confinement
1. Désactiver les comptes compromis (`UPDATE profiles SET is_approved=false`).
2. Révoquer les sessions actives Supabase Auth.
3. Rotation des secrets exposés (`secrets--rotate`).
4. Bloquer IP source si identifiable.

### Heure +4 — Évaluation
- Nature des données impactées (PII, RH, financières).
- Nombre de personnes concernées.
- Conséquences probables.

### Heure +72 — Notification CDP Sénégal
Si la violation est susceptible d'engendrer un risque pour les droits et libertés :
- Formulaire CDP (www.cdp.sn).
- Inclure : description, catégories de données, mesures prises, contact DPO.

### Heure +72 — Notification utilisateurs concernés
Si risque élevé : email individuel via `send-transactional-email`.

## Matrice d'escalade

| Rôle | Contact |
|---|---|
| DPO | contact@growhub.app |
| CTO | (à compléter) |
| Direction | (à compléter) |
| Support infrastructure | support@lovable.dev |
| CDP Sénégal | www.cdp.sn / +221 33 859 55 70 |

## Post-mortem

Dans les 30 jours suivant l'incident :
1. Rédiger un rapport (cause racine, chronologie, impact).
2. Identifier les actions correctrices.
3. Mettre à jour `SECURITY.md` et le registre des traitements si nécessaire.
4. Mémoire `mem://security/incidents-historique` à compléter.

## Exercices

- **Tabletop trimestriel** : simulation d'un scénario (ransomware, fuite via mentor compromis, attaque sur API publique candidatures).
- **Red team annuel** : pentest externe par cabinet certifié.
