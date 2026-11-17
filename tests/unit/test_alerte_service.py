"""UC3 — service d'alerte ciblée (UC à risque)."""
from datetime import date, datetime

import pytest

from app.domain.alerte import ECHEC, ENVOYEE, Alerte
from app.notification.gateway import MockNotificationGateway
from app.services.alerte_service import AlerteService
from app.services.erreurs import Conflit
from tests.fabriques import SFAX, creer_besoin, creer_centre, creer_donneur


def _service(db, gateway, horloge):
    return AlerteService(db, gateway, horloge=horloge)


def test_premier_test_ci_o_neg_eligible_alerte_et_donneur_alerte_il_y_a_2_jours_exclu(db, gateway, horloge):
    """Test fondateur de l'élaboration (plan d'itérations) :
    « un donneur O− éligible est alerté pour un besoin A+ ;
      un donneur alerté il y a 2 jours ne l'est pas »."""
    centre = creer_centre(db)
    o_neg = creer_donneur(db, groupe="O-")
    deja_sollicite = creer_donneur(db, groupe="A+")
    ancien_besoin = creer_besoin(db, centre, groupe="A+")
    db.add(Alerte(besoin_id=ancien_besoin.id, donneur_id=deja_sollicite.id, statut=ENVOYEE,
                  tentatives=1, envoyee_le=datetime(2026, 11, 15, 10, 0)))
    db.commit()
    besoin = creer_besoin(db, centre, groupe="A+")

    rapport = _service(db, gateway, horloge).alerter_donneurs(besoin.id)

    destinataires = [m.destinataire for m in gateway.envoyes]
    assert destinataires == [o_neg.telephone]
    assert rapport.envoyees == 1
    assert rapport.exclus == {"alerte_recente": 1}


def test_exclut_incompatibles_hors_zone_et_non_eligibles(db, gateway, horloge):
    centre = creer_centre(db)
    creer_donneur(db, groupe="AB+")                              # incompatible : pas même candidat
    creer_donneur(db, groupe="O+", position=SFAX)                # hors zone
    creer_donneur(db, groupe="A-", dernier_don=date(2026, 11, 1))  # non éligible (16 j)
    ok = creer_donneur(db, groupe="A+", dernier_don=date(2026, 8, 1))
    besoin = creer_besoin(db, centre, groupe="A+")

    rapport = _service(db, gateway, horloge).alerter_donneurs(besoin.id)

    assert [m.destinataire for m in gateway.envoyes] == [ok.telephone]
    assert rapport.exclus == {"hors_zone": 1, "non_eligible": 1}


def test_idempotence_aucun_doublon_si_on_relance_le_ciblage(db, gateway, horloge):
    centre = creer_centre(db)
    creer_donneur(db, groupe="O-")
    besoin = creer_besoin(db, centre)
    service = _service(db, gateway, horloge)

    service.alerter_donneurs(besoin.id)
    second = service.alerter_donneurs(besoin.id)

    assert len(gateway.envoyes) == 1
    assert second.deja_alertes == 1 and second.envoyees == 0


def test_echec_de_notification_puis_relance_reussie(db, horloge):
    centre = creer_centre(db)
    donneur = creer_donneur(db, groupe="O-")
    besoin = creer_besoin(db, centre)
    en_panne = MockNotificationGateway(destinataires_en_panne={donneur.telephone})

    rapport = _service(db, en_panne, horloge).alerter_donneurs(besoin.id)
    assert rapport.echecs == 1
    alerte = db.query(Alerte).one()
    assert alerte.statut == ECHEC and alerte.tentatives == 1

    retabli = MockNotificationGateway()
    relance = _service(db, retabli, horloge).relancer_echecs(besoin.id)
    assert relance.envoyees == 1
    assert alerte.statut == ENVOYEE and alerte.tentatives == 2


def test_relance_bornee_par_le_nombre_max_de_tentatives(db, horloge):
    centre = creer_centre(db)
    donneur = creer_donneur(db, groupe="O-")
    besoin = creer_besoin(db, centre)
    en_panne = MockNotificationGateway(destinataires_en_panne={donneur.telephone})
    service = _service(db, en_panne, horloge)

    service.alerter_donneurs(besoin.id)
    for _ in range(5):
        service.relancer_echecs(besoin.id)

    assert db.query(Alerte).one().tentatives == 3


def test_besoin_cloture_ne_peut_plus_alerter(db, gateway, horloge):
    centre = creer_centre(db)
    besoin = creer_besoin(db, centre)
    besoin.statut = "CLOTURE"
    db.commit()
    with pytest.raises(Conflit):
        _service(db, gateway, horloge).alerter_donneurs(besoin.id)
