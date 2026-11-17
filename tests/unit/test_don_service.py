"""UC5 — Enregistrer un don."""
from datetime import date

import pytest

from app.config import Parametres
from app.services.don_service import DonService
from app.services.erreurs import Conflit, RegleMetierViolee
from tests.fabriques import creer_besoin, creer_centre, creer_donneur

AUJOURD_HUI = date(2026, 11, 17)


def test_don_met_a_jour_la_date_du_dernier_don(db, horloge):
    centre = creer_centre(db)
    donneur = creer_donneur(db, groupe="O-")
    DonService(db, horloge=horloge).enregistrer(donneur_id=donneur.id, centre_id=centre.id,
                                                date_don=AUJOURD_HUI)
    assert donneur.date_dernier_don == AUJOURD_HUI


def test_objectif_atteint_cloture_le_besoin(db, horloge):
    centre = creer_centre(db)
    besoin = creer_besoin(db, centre, groupe="A+", quantite=2)
    service = DonService(db, horloge=horloge)
    for groupe in ("O-", "A+"):
        donneur = creer_donneur(db, groupe=groupe)
        resultat = service.enregistrer(donneur_id=donneur.id, centre_id=centre.id,
                                       date_don=AUJOURD_HUI, besoin_id=besoin.id)
    assert resultat.besoin.quantite_collectee == 2
    assert resultat.besoin.statut == "CLOTURE"
    assert resultat.besoin.cloture_le is not None


def test_delai_entre_deux_dons_non_respecte(db, horloge):
    centre = creer_centre(db)
    donneur = creer_donneur(db, dernier_don=date(2026, 10, 30))
    with pytest.raises(RegleMetierViolee):
        DonService(db, horloge=horloge).enregistrer(donneur_id=donneur.id, centre_id=centre.id,
                                                    date_don=AUJOURD_HUI)


def test_delai_parametrable(db, horloge):
    centre = creer_centre(db)
    donneur = creer_donneur(db, dernier_don=date(2026, 10, 30))
    DonService(db, cfg=Parametres(delai_entre_dons_jours=14), horloge=horloge).enregistrer(
        donneur_id=donneur.id, centre_id=centre.id, date_don=AUJOURD_HUI)


def test_groupe_incompatible_avec_le_besoin(db, horloge):
    centre = creer_centre(db)
    besoin = creer_besoin(db, centre, groupe="O-")
    donneur = creer_donneur(db, groupe="A+")
    with pytest.raises(RegleMetierViolee):
        DonService(db, horloge=horloge).enregistrer(donneur_id=donneur.id, centre_id=centre.id,
                                                    date_don=AUJOURD_HUI, besoin_id=besoin.id)


def test_besoin_deja_cloture(db, horloge):
    centre = creer_centre(db)
    besoin = creer_besoin(db, centre)
    besoin.statut = "CLOTURE"
    db.commit()
    donneur = creer_donneur(db)
    with pytest.raises(Conflit):
        DonService(db, horloge=horloge).enregistrer(donneur_id=donneur.id, centre_id=centre.id,
                                                    date_don=AUJOURD_HUI, besoin_id=besoin.id)


def test_don_dans_le_futur_refuse(db, horloge):
    centre = creer_centre(db)
    donneur = creer_donneur(db)
    with pytest.raises(RegleMetierViolee):
        DonService(db, horloge=horloge).enregistrer(donneur_id=donneur.id, centre_id=centre.id,
                                                    date_don=date(2026, 11, 30))
