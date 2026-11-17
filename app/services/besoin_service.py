"""UC2 — Déclarer un besoin urgent (version minimale, élaboration)."""
from datetime import date, datetime
from typing import Callable

from sqlalchemy.orm import Session

from app.domain.besoin import OUVERT, Besoin
from app.domain.groupes import GROUPES
from app.repositories.besoin_repository import BesoinRepository
from app.repositories.centre_repository import CentreRepository
from app.services.erreurs import RegleMetierViolee, RessourceIntrouvable


class BesoinService:
    def __init__(self, db: Session, horloge: Callable[[], datetime] = datetime.now):
        self.db = db
        self.horloge = horloge
        self.besoins = BesoinRepository(db)
        self.centres = CentreRepository(db)

    def declarer(self, *, centre_id: int, groupe_sanguin: str, quantite: int, echeance: date) -> Besoin:
        if self.centres.par_id(centre_id) is None:
            raise RessourceIntrouvable(f"Centre {centre_id} introuvable")
        if groupe_sanguin not in GROUPES:
            raise RegleMetierViolee(f"Groupe sanguin inconnu : {groupe_sanguin}")
        besoin = Besoin(centre_id=centre_id, groupe_sanguin=groupe_sanguin, quantite=quantite,
                        echeance=echeance, statut=OUVERT, quantite_collectee=0, cree_le=self.horloge())
        self.besoins.ajouter(besoin)
        self.db.commit()
        return besoin

    def obtenir(self, besoin_id: int) -> Besoin:
        besoin = self.besoins.par_id(besoin_id)
        if besoin is None:
            raise RessourceIntrouvable(f"Besoin {besoin_id} introuvable")
        return besoin
