"""UC5 — test d'intégration : un don rend le donneur inéligible pour UC3."""
from tests.fabriques import creer_besoin, creer_centre, creer_donneur


def test_apres_un_don_le_donneur_n_est_plus_cible(client, db, gateway):
    centre = creer_centre(db)
    donneur = creer_donneur(db, groupe="O-")

    reponse = client.post("/dons", json={"donneur_id": donneur.id, "centre_id": centre.id,
                                         "date_don": "2026-11-17"})
    assert reponse.status_code == 201

    besoin = creer_besoin(db, centre, groupe="O-")
    rapport = client.post(f"/besoins/{besoin.id}/alertes").json()
    assert rapport["envoyees"] == 0
    assert rapport["exclus"] == {"non_eligible": 1}


def test_volume_hors_bornes(client, db):
    centre = creer_centre(db)
    donneur = creer_donneur(db)
    reponse = client.post("/dons", json={"donneur_id": donneur.id, "centre_id": centre.id,
                                         "date_don": "2026-11-17", "volume_ml": 900})
    assert reponse.status_code == 422
