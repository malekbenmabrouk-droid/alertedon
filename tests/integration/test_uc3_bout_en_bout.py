"""UC3 — route de bout en bout : contrôleur → service → accès aux données → notification."""
from tests.fabriques import creer_besoin, creer_centre, creer_donneur


def test_route_alerter_les_donneurs_cibles(client, db, gateway):
    centre = creer_centre(db)
    donneur = creer_donneur(db, groupe="O-")
    besoin = creer_besoin(db, centre, groupe="A+")

    reponse = client.post(f"/besoins/{besoin.id}/alertes")

    assert reponse.status_code == 200
    assert reponse.json()["envoyees"] == 1
    assert gateway.envoyes[0].destinataire == donneur.telephone
    alertes = client.get(f"/besoins/{besoin.id}/alertes").json()
    assert alertes[0]["statut"] == "ENVOYEE"


def test_besoin_inconnu(client):
    assert client.post("/besoins/999/alertes").status_code == 404
