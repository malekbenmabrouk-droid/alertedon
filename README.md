# AlerteDon — Système d'alerte ciblée des donneurs de sang

TP1 « Processus unifié et Approches Agiles »

Quand un centre de transfusion manque d'un groupe sanguin, AlerteDon alerte **uniquement** les donneurs
compatibles (ABO/Rh), proches du centre et éligibles (délai depuis le dernier don respecté).

[![CI](https://github.com/malekbenmabrouk-droid/alertedon/actions/workflows/ci.yml/badge.svg)](https://github.com/malekbenmabrouk-droid/alertedon/actions/workflows/ci.yml)

## Démarrer

```bash
python -m venv .venv && source .venv/bin/activate   # Windows : .venv\Scripts\activate
pip install -r requirements.txt
pytest -v                          # tests unitaires + intégration
python -m scripts.donnees_demo     # jeu de données de démonstration (facultatif)
uvicorn app.main:app --reload      # API sur http://127.0.0.1:8000/docs (Swagger)
```

## Architecture en couches

```
app/
├── api/            Contrôleurs HTTP (FastAPI) — un routeur par UC
├── services/       Couche métier — un service par UC
├── domain/         Entités (SQLAlchemy) + règles pures de ciblage (regles.py)
├── repositories/   Accès aux données
└── notification/   Interface NotificationGateway + canaux (log, mock, e-mail SMTP)
```

| UC | Route(s) | Service | Tests |
|---|---|---|---|
| UC1 S'inscrire | `POST /donneurs` | `InscriptionService` | `test_inscription_service`, `test_api_donneurs` |
| UC2 Déclarer un besoin | `POST /besoins` | `BesoinService` | `test_api_besoins` |
| **UC3 Alerter (à risque)** | `POST /besoins/{id}/alertes` (+ `/relance`) | `AlerteService` | `test_regles`, `test_alerte_service`, `test_uc3_bout_en_bout` |
| UC4 Répondre | `POST /alertes/{id}/reponse` | `ReponseService` | `test_reponse_service`, `test_uc4_api` |
| UC5 Enregistrer un don | `POST /dons` | `DonService` | `test_don_service`, `test_uc5_api` |
| UC6 Suivre | `GET /suivi/besoins` | `SuiviService` | `test_suivi_service`, `test_uc6_api` |

Scénario nominal complet : `tests/integration/test_scenario_nominal.py`.

## Documentation

- `docs/TP1_AlerteDon.docx` : rapport (vision, UC, priorisation, plan, élaboration, construction et transition)
- `docs/fiches-uc.md` : fiches des 6 cas d'utilisation
- `docs/uml/` : diagrammes PlantUML (cas d'utilisation, architecture, classes, séquences UC1 à UC6) et leurs PNG
- `docs/revue-croisee.md` : grille de revue croisée
- `docs/GUIDE.md` : guide pas à pas (push, tickets, milestones, revue, v1.0)

## Processus unifié dans Git

| Phase | Itération | Tag |
|---|---|---|
| Lancement | — | `v0.0-lancement` |
| Élaboration | It. 1 : architecture de base et UC3 de bout en bout | `v0.1-elaboration` |
| Construction | It. 2 : UC2 complet, UC4, UC5 | `v0.2-construction` |
| Construction → Transition | It. 3 : UC6, canal e-mail, revue | `v0.9-construction`, puis `v1.0` |

Une branche par UC : `uc1-inscription`, `uc2-declarer-besoin`, `uc3-alerte-ciblee`,
`uc4-repondre-alerte`, `uc5-enregistrer-don`, `uc6-suivi-besoins`.

## Configuration (variables d'environnement)

| Variable | Défaut | Rôle |
|---|---|---|
| `ALERTEDON_DELAI_DON_JOURS` | 56 | délai minimal entre deux dons |
| `ALERTEDON_DELAI_RELANCE_JOURS` | 7 | anti-sollicitation |
| `ALERTEDON_RAYON_KM` | 30 | zone autour du centre |
| `ALERTEDON_MAX_TENTATIVES` | 3 | nombre d'envois maximum d'une alerte |
| `ALERTEDON_NOTIFICATION` | `log` | `log` (simulé) ou `email` (SMTP) |
| `ALERTEDON_SMTP_HOTE` / `_PORT` / `_EXPEDITEUR` | localhost / 25 | canal e-mail |
