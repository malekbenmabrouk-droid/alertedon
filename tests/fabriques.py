"""Fabriques de données de test (imports paresseux : chaque entité arrive avec son UC)."""
from datetime import date

# Tunis (centre) et quelques villes de référence.
TUNIS = (36.8065, 10.1815)
ARIANA = (36.8625, 10.1956)      # ~6 km de Tunis
SFAX = (34.7406, 10.7603)        # ~235 km de Tunis

_compteur = {"n": 0}


def _suivant() -> int:
    _compteur["n"] += 1
    return _compteur["n"]


def creer_centre(db, nom="CNTS Tunis", position=TUNIS):
    from app.domain.centre import Centre

    centre = Centre(nom=nom, latitude=position[0], longitude=position[1])
    db.add(centre)
    db.commit()
    return centre


def creer_donneur(db, groupe="O-", position=ARIANA, dernier_don: date | None = None,
                  canal="SMS", nom=None):
    from app.domain.donneur import Donneur

    n = _suivant()
    donneur = Donneur(nom=nom or f"Donneur {n}", groupe_sanguin=groupe,
                      latitude=position[0], longitude=position[1],
                      telephone=f"+2162000{n:04d}", email=f"donneur{n}@exemple.tn",
                      canal_prefere=canal, date_dernier_don=dernier_don, actif=True)
    db.add(donneur)
    db.commit()
    return donneur


def creer_besoin(db, centre, groupe="A+", quantite=2, echeance=date(2026, 11, 20), cree_le=None):
    from datetime import datetime

    from app.domain.besoin import Besoin

    besoin = Besoin(centre_id=centre.id, groupe_sanguin=groupe, quantite=quantite,
                    quantite_collectee=0, echeance=echeance, statut="OUVERT",
                    cree_le=cree_le or datetime(2026, 11, 17, 9, 0))
    db.add(besoin)
    db.commit()
    return besoin
