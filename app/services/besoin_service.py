"""UC2 — Déclarer un besoin urgent (inclut UC3 : alerte des donneurs ciblés)."""
from dataclasses import dataclass
from datetime import date, datetime
from typing import Callable

from sqlalchemy.orm import Session

from app.domain.besoin import OUVERT, Besoin
from app.domain.groupes import GROUPES
from app.repositories.besoin_repository import BesoinRepository
from app.repositories.centre_repository import CentreRepository
from app.services.alerte_service import AlerteService, RapportAlerte
from app.services.erreurs import RegleMetierViolee, RessourceIntrouvable

QUANTITE_MAX = 50


@dataclass
class ResultatDeclaration:
    besoin: Besoin
    alerte: RapportAlerte


class BesoinService:
    def __init__(self, db: Session, alertes: AlerteService,
                 horloge: Callable[[], datetime] = datetime.now):
        self.db = db
        self.alertes = alertes
        self.horloge = horloge
        self.besoins = BesoinRepository(db)
        self.centres = CentreRepository(db)

    def declarer(self, *, centre_id: int, groupe_sanguin: str, quantite: int,
                 echeance: date) -> ResultatDeclaration:
        if self.centres.par_id(centre_id) is None:
            raise RessourceIntrouvable(f"Centre {centre_id} introuvable")
        if groupe_sanguin not in GROUPES:
            raise RegleMetierViolee(f"Groupe sanguin inconnu : {groupe_sanguin}")
        if not 1 <= quantite <= QUANTITE_MAX:
            raise RegleMetierViolee(f"La quantité doit être comprise entre 1 et {QUANTITE_MAX} poches")
        if echeance < self.horloge().date():
            raise RegleMetierViolee("L'échéance ne peut pas être dans le passé")

        besoin = Besoin(centre_id=centre_id, groupe_sanguin=groupe_sanguin, quantite=quantite,
                        echeance=echeance, statut=OUVERT, quantite_collectee=0, cree_le=self.horloge())
        self.besoins.ajouter(besoin)
        self.db.commit()
        # <<include>> UC3 : la déclaration déclenche l'alerte ciblée.
        rapport = self.alertes.alerter_donneurs(besoin.id)
        return ResultatDeclaration(besoin=besoin, alerte=rapport)

    def obtenir(self, besoin_id: int) -> Besoin:
        besoin = self.besoins.par_id(besoin_id)
        if besoin is None:
            raise RessourceIntrouvable(f"Besoin {besoin_id} introuvable")
        return besoin
