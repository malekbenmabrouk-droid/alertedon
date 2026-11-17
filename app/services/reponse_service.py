"""UC4 — Répondre à une alerte."""
from datetime import datetime, time
from typing import Callable

from sqlalchemy.orm import Session

from app.domain.alerte import ACCEPTEE, DECLINEE, ENVOYEE, Alerte
from app.domain.besoin import OUVERT
from app.repositories.alerte_repository import AlerteRepository
from app.repositories.donneur_repository import DonneurRepository
from app.services.erreurs import Conflit, RegleMetierViolee, RessourceIntrouvable


class ReponseService:
    def __init__(self, db: Session, horloge: Callable[[], datetime] = datetime.now):
        self.db = db
        self.horloge = horloge
        self.alertes = AlerteRepository(db)
        self.donneurs = DonneurRepository(db)

    def repondre(self, *, alerte_id: int, donneur_id: int, accepte: bool,
                 creneau: datetime | None = None) -> Alerte:
        alerte = self.alertes.par_id(alerte_id)
        if alerte is None:
            raise RessourceIntrouvable(f"Alerte {alerte_id} introuvable")
        if alerte.donneur_id != donneur_id:
            raise RegleMetierViolee("Cette alerte n'est pas adressée à ce donneur")
        if alerte.statut != ENVOYEE:
            raise Conflit(f"Impossible de répondre : alerte au statut {alerte.statut}")
        if alerte.besoin.statut != OUVERT:
            raise Conflit("Le besoin est déjà couvert, merci !")

        maintenant = self.horloge()
        if accepte:
            if creneau is None:
                raise RegleMetierViolee("Un créneau est requis pour accepter")
            limite = datetime.combine(alerte.besoin.echeance, time.max)
            if not maintenant <= creneau <= limite:
                raise RegleMetierViolee("Le créneau doit être entre maintenant et l'échéance du besoin")
            alerte.statut, alerte.creneau = ACCEPTEE, creneau
        else:
            alerte.statut, alerte.creneau = DECLINEE, None
        alerte.repondue_le = maintenant
        self.db.commit()
        return alerte

    def alertes_du_donneur(self, donneur_id: int) -> list[Alerte]:
        if self.donneurs.par_id(donneur_id) is None:
            raise RessourceIntrouvable(f"Donneur {donneur_id} introuvable")
        return self.alertes.du_donneur(donneur_id)
