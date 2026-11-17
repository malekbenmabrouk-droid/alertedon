"""UC4 — Répondre à une alerte."""
from datetime import datetime

import pytest

from app.domain.alerte import ACCEPTEE, DECLINEE, ENVOYEE, Alerte
from app.services.erreurs import Conflit, RegleMetierViolee
from app.services.reponse_service import ReponseService
from tests.fabriques import creer_besoin, creer_centre, creer_donneur


@pytest.fixture
def contexte(db):
    centre = creer_centre(db)
    donneur = creer_donneur(db, groupe="O-")
    besoin = creer_besoin(db, centre)
    alerte = Alerte(besoin_id=besoin.id, donneur_id=donneur.id, statut=ENVOYEE,
                    tentatives=1, envoyee_le=datetime(2026, 11, 17, 9, 30))
    db.add(alerte)
    db.commit()
    return donneur, besoin, alerte


def test_accepter_avec_un_creneau(db, horloge, contexte):
    donneur, _, alerte = contexte
    creneau = datetime(2026, 11, 18, 9, 0)
    resultat = ReponseService(db, horloge).repondre(alerte_id=alerte.id, donneur_id=donneur.id,
                                                    accepte=True, creneau=creneau)
    assert resultat.statut == ACCEPTEE and resultat.creneau == creneau


def test_decliner(db, horloge, contexte):
    donneur, _, alerte = contexte
    resultat = ReponseService(db, horloge).repondre(alerte_id=alerte.id, donneur_id=donneur.id,
                                                    accepte=False)
    assert resultat.statut == DECLINEE


def test_accepter_sans_creneau_refuse(db, horloge, contexte):
    donneur, _, alerte = contexte
    with pytest.raises(RegleMetierViolee):
        ReponseService(db, horloge).repondre(alerte_id=alerte.id, donneur_id=donneur.id, accepte=True)


def test_creneau_apres_echeance_refuse(db, horloge, contexte):
    donneur, _, alerte = contexte
    with pytest.raises(RegleMetierViolee):
        ReponseService(db, horloge).repondre(alerte_id=alerte.id, donneur_id=donneur.id,
                                             accepte=True, creneau=datetime(2026, 11, 25, 9))


def test_un_autre_donneur_ne_peut_pas_repondre(db, horloge, contexte):
    _, _, alerte = contexte
    intrus = creer_donneur(db, groupe="A+")
    with pytest.raises(RegleMetierViolee):
        ReponseService(db, horloge).repondre(alerte_id=alerte.id, donneur_id=intrus.id, accepte=False)


def test_on_ne_repond_pas_deux_fois(db, horloge, contexte):
    donneur, _, alerte = contexte
    service = ReponseService(db, horloge)
    service.repondre(alerte_id=alerte.id, donneur_id=donneur.id, accepte=False)
    with pytest.raises(Conflit):
        service.repondre(alerte_id=alerte.id, donneur_id=donneur.id, accepte=False)


def test_besoin_deja_couvert(db, horloge, contexte):
    donneur, besoin, alerte = contexte
    besoin.statut = "CLOTURE"
    db.commit()
    with pytest.raises(Conflit):
        ReponseService(db, horloge).repondre(alerte_id=alerte.id, donneur_id=donneur.id, accepte=False)
