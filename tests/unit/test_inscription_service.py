"""UC1 — tests unitaires dérivés de la fiche UC (scénario nominal + alternatifs)."""
from datetime import date

import pytest

from app.services.erreurs import Conflit, RegleMetierViolee
from app.services.inscription_service import InscriptionService

AUJOURD_HUI = date(2026, 11, 17)


def _inscrire(db, **surcharges):
    donnees = dict(nom="Malek", groupe_sanguin="O-", latitude=36.86, longitude=10.19,
                   canal_prefere="SMS", telephone="+21620000001")
    donnees.update(surcharges)
    return InscriptionService(db, aujourd_hui=AUJOURD_HUI).inscrire(**donnees)


def test_inscription_nominale_cree_un_donneur_actif(db):
    donneur = _inscrire(db)
    assert donneur.id is not None
    assert donneur.actif is True
    assert donneur.groupe_sanguin == "O-"


def test_canal_sms_sans_telephone_est_refuse(db):
    with pytest.raises(RegleMetierViolee):
        _inscrire(db, telephone=None)


def test_canal_email_exige_une_adresse(db):
    with pytest.raises(RegleMetierViolee):
        _inscrire(db, canal_prefere="EMAIL", email=None)


def test_date_de_dernier_don_future_refusee(db):
    with pytest.raises(RegleMetierViolee):
        _inscrire(db, date_dernier_don=date(2026, 12, 1))


def test_double_inscription_meme_telephone_refusee(db):
    _inscrire(db)
    with pytest.raises(Conflit):
        _inscrire(db, nom="Autre")
