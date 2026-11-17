"""UC2 — tests d'intégration : déclarer un besoin déclenche UC3 (<<include>>)."""
from tests.fabriques import SFAX, creer_centre, creer_donneur


def _declarer(client, centre_id, **surcharges):
    corps = {"centre_id": centre_id, "groupe_sanguin": "A+", "quantite": 2, "echeance": "2026-11-20"}
    corps.update(surcharges)
    return client.post("/besoins", json=corps)


def test_declarer_un_besoin_alerte_les_donneurs_cibles(client, db, gateway):
    centre = creer_centre(db)
    creer_donneur(db, groupe="O-")              # compatible, proche, éligible
    creer_donneur(db, groupe="B+")              # incompatible avec A+
    creer_donneur(db, groupe="A+", position=SFAX)  # hors zone

    reponse = _declarer(client, centre.id)

    assert reponse.status_code == 201
    corps = reponse.json()
    assert corps["besoin"]["statut"] == "OUVERT"
    assert corps["alerte"]["envoyees"] == 1
    assert corps["alerte"]["exclus"] == {"hors_zone": 1}
    assert len(gateway.envoyes) == 1


def test_centre_inconnu(client):
    assert _declarer(client, 42).status_code == 404


def test_echeance_passee_refusee(client, db):
    centre = creer_centre(db)
    assert _declarer(client, centre.id, echeance="2026-11-01").status_code == 422


def test_quantite_trop_grande_refusee(client, db):
    centre = creer_centre(db)
    assert _declarer(client, centre.id, quantite=500).status_code == 422
