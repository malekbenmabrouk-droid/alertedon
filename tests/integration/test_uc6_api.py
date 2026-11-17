"""UC6 — test d'intégration."""
from tests.fabriques import creer_besoin, creer_centre


def test_tableau_de_suivi(client, db):
    centre = creer_centre(db)
    besoin = creer_besoin(db, centre)
    lignes = client.get("/suivi/besoins", params={"statut": "OUVERT"}).json()
    assert [l["besoin_id"] for l in lignes] == [besoin.id]
    assert client.get(f"/suivi/besoins/{besoin.id}").json()["centre"] == "CNTS Tunis"


def test_statut_invalide(client):
    assert client.get("/suivi/besoins", params={"statut": "XYZ"}).status_code == 422
