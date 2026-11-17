"""UC3 — règles métier pures : compatibilité, zone, éligibilité, anti-relance."""
from datetime import date, datetime

import pytest

from app.domain import regles
from tests.fabriques import ARIANA, SFAX, TUNIS


@pytest.mark.parametrize("receveur, attendus", [
    ("A+", {"O-", "O+", "A-", "A+"}),
    ("O-", {"O-"}),
    ("AB+", {"O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"}),
    ("B-", {"O-", "B-"}),
])
def test_groupes_compatibles(receveur, attendus):
    assert regles.groupes_compatibles(receveur) == attendus


def test_o_negatif_est_donneur_universel():
    assert all(regles.est_compatible("O-", g) for g in regles.COMPATIBILITE)


def test_groupe_inconnu():
    with pytest.raises(ValueError):
        regles.groupes_compatibles("Z+")


def test_distance_tunis_ariana_et_sfax():
    assert regles.distance_km(*TUNIS, *ARIANA) < 10
    assert 200 < regles.distance_km(*TUNIS, *SFAX) < 280


@pytest.mark.parametrize("dernier_don, eligible", [
    (None, True),
    (date(2026, 9, 22), True),   # 56 jours pile
    (date(2026, 9, 23), False),  # 55 jours
])
def test_eligibilite(dernier_don, eligible):
    assert regles.est_eligible(dernier_don, date(2026, 11, 17), 56) is eligible


def test_alerte_recente():
    maintenant = datetime(2026, 11, 17, 10)
    assert regles.alerte_recente(datetime(2026, 11, 15, 10), maintenant, 7)
    assert not regles.alerte_recente(datetime(2026, 11, 1), maintenant, 7)
    assert not regles.alerte_recente(None, maintenant, 7)
