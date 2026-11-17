"""UC1 — test d'intégration (contrôleur → service → base)."""


def test_inscription_via_api(client):
    reponse = client.post("/donneurs", json={
        "nom": "Malek", "groupe_sanguin": "O-", "latitude": 36.86, "longitude": 10.19,
        "canal_prefere": "SMS", "telephone": "+21620000001"})
    assert reponse.status_code == 201
    corps = reponse.json()
    assert corps["groupe_sanguin"] == "O-"
    assert client.get(f"/donneurs/{corps['id']}").status_code == 200


def test_groupe_inconnu_rejete_par_la_validation(client):
    reponse = client.post("/donneurs", json={
        "nom": "X", "groupe_sanguin": "C+", "latitude": 0, "longitude": 0, "telephone": "1"})
    assert reponse.status_code == 422


def test_donneur_introuvable(client):
    assert client.get("/donneurs/999").status_code == 404
