"""UC6 — Suivre les besoins."""
from datetime import datetime

import pytest

from app.domain.alerte import ACCEPTEE, DECLINEE, ECHEC, ENVOYEE, Alerte
from app.services.erreurs import RessourceIntrouvable
from app.services.suivi_service import SuiviService
from tests.fabriques import creer_besoin, creer_centre, creer_donneur


def test_indicateurs_du_besoin(db):
    centre = creer_centre(db)
    besoin = creer_besoin(db, centre, quantite=4)
    for statut in (ENVOYEE, ACCEPTEE, DECLINEE, ECHEC):
        donneur = creer_donneur(db)
        db.add(Alerte(besoin_id=besoin.id, donneur_id=donneur.id, statut=statut, tentatives=1,
                      envoyee_le=None if statut == ECHEC else datetime(2026, 11, 17, 9)))
    besoin.quantite_collectee = 1
    db.commit()

    suivi = SuiviService(db).suivre(besoin.id)

    assert (suivi.alertes_envoyees, suivi.alertes_en_echec) == (3, 1)
    assert (suivi.acceptees, suivi.declinees, suivi.sans_reponse) == (1, 1, 1)
    assert suivi.taux_reponse == 0.67
    assert suivi.progression == 0.25


def test_filtre_par_statut(db):
    centre = creer_centre(db)
    creer_besoin(db, centre)
    clos = creer_besoin(db, centre)
    clos.statut = "CLOTURE"
    db.commit()
    assert [s.besoin_id for s in SuiviService(db).lister(statut="CLOTURE")] == [clos.id]
    assert len(SuiviService(db).lister()) == 2


def test_besoin_inconnu(db):
    with pytest.raises(RessourceIntrouvable):
        SuiviService(db).suivre(999)
