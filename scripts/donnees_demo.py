"""Charge un jeu de données de démonstration dans la base locale.

Usage :  python -m scripts.donnees_demo   (depuis la racine du dépôt)
"""
from datetime import date

from app.database import Base, SessionLocale, moteur
from app.services.centre_service import CentreService
from app.services.inscription_service import InscriptionService

DONNEURS = [
    ("Amine", "O-", 36.8625, 10.1956, "+21620000001", None, None),
    ("Sarra", "A+", 36.8189, 10.1658, "+21620000002", None, date(2026, 8, 1)),
    ("Yassine", "O+", 36.8008, 10.1800, "+21620000003", None, date(2026, 11, 2)),
    ("Ines", "A-", 36.8380, 10.2400, None, "ines@exemple.tn", None),
    ("Karim", "B+", 36.8000, 10.1700, "+21620000005", None, None),
    ("Rania", "A+", 34.7406, 10.7603, "+21620000006", None, None),  # Sfax : hors zone
]


def main():
    Base.metadata.create_all(moteur)
    with SessionLocale() as db:
        centre = CentreService(db).creer("CNTS Tunis", 36.8065, 10.1815)
        inscription = InscriptionService(db)
        for nom, groupe, lat, lon, tel, email, dernier in DONNEURS:
            inscription.inscrire(nom=nom, groupe_sanguin=groupe, latitude=lat, longitude=lon,
                                 canal_prefere="EMAIL" if email else "SMS",
                                 telephone=tel, email=email, date_dernier_don=dernier)
        print(f"Centre {centre.id} et {len(DONNEURS)} donneurs créés.")


if __name__ == "__main__":
    main()
