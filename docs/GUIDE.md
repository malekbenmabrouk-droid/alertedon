# Guide pas à pas — finaliser le TP1 AlerteDon sur GitHub

Ce guide part de l'archive `alertedon.bundle`, qui contient tout l'historique Git : commits, 6 branches UC et tags.
Il reste quatre choses à faire de ton côté : **pousser**, **créer les tickets et milestones**, **faire la revue croisée**, puis **poser `v1.0`**.

---

## 0. Prérequis (une seule fois)

- Git, Python 3.12 et le GitHub CLI : https://cli.github.com
- Connexion au CLI : `gh auth login`, puis `gh auth refresh -s project` pour le tableau de bord.

---

## 1. Pousser tout l'historique sur GitHub

Place `alertedon.bundle` dans un dossier vide, puis :

```bash
git clone --bare alertedon.bundle alertedon.git
cd alertedon.git
git push https://github.com/malekbenmabrouk-droid/alertedon.git "refs/heads/*:refs/heads/*" "refs/tags/*:refs/tags/*"
```

- Ce push n'est **pas forcé** : toutes les branches prolongent celles qui sont déjà sur GitHub.
- Si Git refuse avec « rejected (fetch first) », c'est qu'un coéquipier a poussé entre-temps. Préviens-moi, il faudra fusionner.

Ensuite, pour travailler normalement :

```bash
cd ..
git clone https://github.com/malekbenmabrouk-droid/alertedon.git
cd alertedon
```

**Vérifie :** dans l'onglet **Actions** du dépôt, le workflow **CI** doit être vert ✅. Dans **Code → Tags**, tu dois voir `v0.0-lancement`, `v0.1-elaboration`, `v0.2-construction` et `v0.9-construction`.

---

## 2. Lancer le projet en local (pour comprendre et pour la démo)

```bash
python -m venv .venv
source .venv/bin/activate          # Windows : .venv\Scripts\activate
pip install -r requirements.txt
pytest -v                          # 59 tests doivent passer
python -m scripts.donnees_demo     # 1 centre + 6 donneurs
uvicorn app.main:app --reload
```

Ouvre http://127.0.0.1:8000/docs puis déroule le scénario (bouton « Try it out ») :

1. `POST /besoins` avec `{"centre_id": 1, "groupe_sanguin": "A+", "quantite": 2, "echeance": "2026-12-01"}`.
   Le rapport montre 3 donneurs alertés, 1 non éligible et 1 hors zone (Sfax).
2. `GET /donneurs/1/alertes`, puis `POST /alertes/{id}/reponse` avec `{"donneur_id": 1, "accepte": true, "creneau": "..."}`.
3. `POST /dons` avec `besoin_id`.
4. `GET /suivi/besoins/1` affiche les indicateurs du besoin.

Pour voir le test fondateur de l'élaboration :
`pytest -v tests/unit/test_alerte_service.py::test_premier_test_ci_o_neg_eligible_alerte_et_donneur_alerte_il_y_a_2_jours_exclu`

---

## 3. Milestones, tickets et tableau de bord

Déjà en place sur GitHub (fait depuis l'interface web) :

- **Milestones** : Lancement, Élaboration, Construction (fermés) et Transition (ouvert jusqu'à la revue).
- **Tickets** : #1 Lancement, #2 à #7 pour UC1 à UC6 (fermés, chacun avec le commit qui l'implémente), #8 Revue croisée (ouvert).
- **Tableau de bord** : projet GitHub « AlerteDon » (vue Board) — #1 à #7 dans Done, #8 dans Todo.

> Attention : dans le tableau de bord, déplacer un ticket dans **Done** le ferme automatiquement.

---
## 4. Revue croisée puis livraison v1.0

1. Donne à l'autre équipe le lien du dépôt et la grille `docs/revue-croisee.md`. La revue porte sur le tag `v0.9-construction`.
2. Chaque remarque devient un ticket (étiquette `revue`, milestone Transition).
3. Corrige, puis mets `Fixes #n` dans le message de commit pour que le ticket se ferme automatiquement.
4. Remplis la grille, et le tableau 6.6 du rapport Word.
5. Pose le jalon final :

```bash
git tag -a v1.0 -m "Livraison — jalon PR : produit livré après revue croisée"
git push origin v1.0
gh api -X PATCH repos/malekbenmabrouk-droid/alertedon/milestones/<n° Transition> -f state=closed
```

---

## 5. Rapport

`docs/TP1_AlerteDon.docx` reprend ton document d'origine, enrichi des sections 5 (Élaboration), 6 (Construction et Transition) et 7 (Conclusion), avec tous les diagrammes.
**À compléter :** la ligne « Équipe : … » et le tableau de la revue croisée (6.6).

---

## Correspondance énoncé → dépôt

| Énoncé | Où le montrer |
|---|---|
| Vision, acteurs, UC, priorisation, 3 itérations et 4 phases | Rapport §1 à §4, tag `v0.0-lancement` |
| P1.1 Dépôt, tableau de bord, UC en tickets, milestones = phases, branche par UC, jalons = tags | GitHub Issues, Projects, Milestones, Branches, Tags |
| P1.2 Diagramme de cas d'utilisation en PlantUML | `docs/uml/cas-utilisation.puml` |
| P1.3 Route de bout en bout pour le UC à risque + test en CI | `POST /besoins/{id}/alertes`, `app/services/alerte_service.py`, `.github/workflows/ci.yml` |
| P1.4 Tag `v0.1-elaboration`, milestone fermé | Tag et milestone Élaboration |
| P2.1 Classes et séquences en PlantUML | `docs/uml/classes*.puml`, `docs/uml/sequence-uc*.puml`, `docs/fiches-uc.md` |
| P2.2 UC implémentés en couches | `app/api` → `app/services` → `app/repositories` |
| P2.3 Tests unitaires + test d'intégration du scénario nominal | `tests/unit`, `tests/integration/test_scenario_nominal.py` |
| P2.4 Revue croisée | `docs/revue-croisee.md`, tickets `revue` |
