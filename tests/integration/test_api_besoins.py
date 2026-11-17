"""UC2 (minimal) — test d'intégration."""
from tests.fabriques import creer_centre


def test_declarer_un_besoin(client, db):
    centre = creer_centre(db)
    reponse = client.post("/besoins", json={
        "centre_id": centre.id, "groupe_sanguin": "A+", "quantite": 3, "echeance": "2026-11-20"})
    assert reponse.status_code == 201
    assert reponse.json()["statut"] == "OUVERT"


def test_centre_inconnu(client):
    reponse = client.post("/besoins", json={
        "centre_id": 42, "groupe_sanguin": "A+", "quantite": 1, "echeance": "2026-11-20"})
    assert reponse.status_code == 404
