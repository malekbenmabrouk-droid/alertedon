"""Règles métier pures du ciblage (UC3) — sans base de données, faciles à tester."""
from datetime import date, datetime, timedelta
from math import asin, cos, radians, sin, sqrt

# Compatibilité des globules rouges : groupe du receveur → groupes donneurs acceptés.
COMPATIBILITE: dict[str, frozenset[str]] = {
    "O-": frozenset({"O-"}),
    "O+": frozenset({"O-", "O+"}),
    "A-": frozenset({"O-", "A-"}),
    "A+": frozenset({"O-", "O+", "A-", "A+"}),
    "B-": frozenset({"O-", "B-"}),
    "B+": frozenset({"O-", "O+", "B-", "B+"}),
    "AB-": frozenset({"O-", "A-", "B-", "AB-"}),
    "AB+": frozenset({"O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"}),
}

RAYON_TERRE_KM = 6371.0


def groupes_compatibles(groupe_receveur: str) -> frozenset[str]:
    try:
        return COMPATIBILITE[groupe_receveur]
    except KeyError as exc:
        raise ValueError(f"Groupe sanguin inconnu : {groupe_receveur}") from exc


def est_compatible(groupe_donneur: str, groupe_receveur: str) -> bool:
    return groupe_donneur in groupes_compatibles(groupe_receveur)


def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance orthodromique (formule de haversine)."""
    p1, p2 = radians(lat1), radians(lat2)
    dp, dl = p2 - p1, radians(lon2 - lon1)
    h = sin(dp / 2) ** 2 + cos(p1) * cos(p2) * sin(dl / 2) ** 2
    return 2 * RAYON_TERRE_KM * asin(sqrt(h))


def est_eligible(date_dernier_don: date | None, aujourd_hui: date, delai_jours: int) -> bool:
    """Éligible si jamais donné, ou si le délai minimal depuis le dernier don est écoulé."""
    return date_dernier_don is None or (aujourd_hui - date_dernier_don).days >= delai_jours


def alerte_recente(derniere_alerte: datetime | None, maintenant: datetime, delai_jours: int) -> bool:
    return derniere_alerte is not None and maintenant - derniere_alerte < timedelta(days=delai_jours)
