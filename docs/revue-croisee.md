# Revue croisée — grille à remplir par l'équipe relectrice

**Équipe relectrice :** ……………………………  **Date :** ……/……/2026  **Version relue :** tag `v0.9-construction`

Comment relire :
1. Cloner le dépôt, puis lancer `pip install -r requirements.txt` et `pytest -v`. Tous les tests doivent passer.
2. Lancer l'API avec `uvicorn app.main:app --reload`, ouvrir http://127.0.0.1:8000/docs et dérouler le scénario nominal.
3. Ouvrir un ticket GitHub (étiquette `revue`) par remarque, et noter son numéro ci-dessous.

| # | Critère | OK / À revoir | Remarque | Ticket |
|---|---|---|---|---|
| 1 | La chaîne UC → ticket → branche → classes → tests est traçable pour chaque UC | | | |
| 2 | Les diagrammes de classes et de séquence correspondent au code | | | |
| 3 | Les couches sont respectées (le contrôleur n'accède pas directement à la base) | | | |
| 4 | Règles UC3 : compatibilité, zone, éligibilité, anti-relance | | | |
| 5 | Fiabilité UC3 : échecs, relance bornée, idempotence | | | |
| 6 | Les tests couvrent le scénario nominal et les principaux alternatifs | | | |
| 7 | La CI est verte sur `main` | | | |
| 8 | Lisibilité du code (nommage, taille des fonctions) | | | |
| 9 | Messages d'erreur et codes HTTP cohérents (404 / 409 / 422) | | | |

**Décision :** ☐ accepté  ☐ accepté avec corrections  ☐ à reprendre

## Suivi des corrections (à remplir par l'équipe AlerteDon)

| Ticket | Correction | Commit |
|---|---|---|
| | | |
