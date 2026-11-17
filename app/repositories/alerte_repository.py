from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.alerte import ECHEC, STATUTS_NOTIFIES, Alerte


class AlerteRepository:
    def __init__(self, db: Session):
        self.db = db

    def ajouter(self, alerte: Alerte) -> Alerte:
        self.db.add(alerte)
        self.db.flush()
        return alerte

    def par_id(self, alerte_id: int) -> Alerte | None:
        return self.db.get(Alerte, alerte_id)

    def pour_besoin_et_donneur(self, besoin_id: int, donneur_id: int) -> Alerte | None:
        return self.db.scalar(
            select(Alerte).where(Alerte.besoin_id == besoin_id, Alerte.donneur_id == donneur_id)
        )

    def derniere_alerte_hors_besoin(self, donneur_id: int, besoin_id: int) -> datetime | None:
        """Date de la dernière alerte effectivement reçue pour un AUTRE besoin."""
        return self.db.scalar(
            select(func.max(Alerte.envoyee_le)).where(
                Alerte.donneur_id == donneur_id,
                Alerte.besoin_id != besoin_id,
                Alerte.statut.in_(STATUTS_NOTIFIES),
            )
        )

    def en_echec(self, besoin_id: int, max_tentatives: int) -> list[Alerte]:
        return list(self.db.scalars(
            select(Alerte).where(
                Alerte.besoin_id == besoin_id,
                Alerte.statut == ECHEC,
                Alerte.tentatives < max_tentatives,
            ).order_by(Alerte.id)
        ))

    def du_besoin(self, besoin_id: int) -> list[Alerte]:
        return list(self.db.scalars(select(Alerte).where(Alerte.besoin_id == besoin_id).order_by(Alerte.id)))

    def du_donneur(self, donneur_id: int) -> list[Alerte]:
        return list(self.db.scalars(
            select(Alerte).where(Alerte.donneur_id == donneur_id).order_by(Alerte.id.desc())
        ))
