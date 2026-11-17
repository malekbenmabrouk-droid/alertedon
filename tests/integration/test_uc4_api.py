"""UC4 — test d'intégration."""
from tests.fabriques import creer_besoin, creer_centre, creer_donneur


def test_le_donneur_consulte_puis_accepte_son_alerte(client, db):
    centre = creer_centre(db)
    donneur = creer_donneur(db, groupe="O-")
    besoin = creer_besoin(db, centre)
    client.post(f"/besoins/{besoin.id}/alertes")

    mes_alertes = client.get(f"/donneurs/{donneur.id}/alertes").json()
    assert len(mes_alertes) == 1

    reponse = client.post(f"/alertes/{mes_alertes[0]['id']}/reponse", json={
        "donneur_id": donneur.id, "accepte": True, "creneau": "2026-11-18T09:00:00"})
    assert reponse.status_code == 200
    assert reponse.json()["statut"] == "ACCEPTEE"


def test_alerte_inconnue(client):
    reponse = client.post("/alertes/999/reponse", json={"donneur_id": 1, "accepte": False})
    assert reponse.status_code == 404
