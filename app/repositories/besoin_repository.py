from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.besoin import Besoin


class BesoinRepository:
    def __init__(self, db: Session):
        self.db = db

    def ajouter(self, besoin: Besoin) -> Besoin:
        self.db.add(besoin)
        self.db.flush()
        return besoin

    def par_id(self, besoin_id: int) -> Besoin | None:
        return self.db.get(Besoin, besoin_id)

    def lister(self, statut: str | None = None, centre_id: int | None = None) -> list[Besoin]:
        requete = select(Besoin)
        if statut:
            requete = requete.where(Besoin.statut == statut)
        if centre_id:
            requete = requete.where(Besoin.centre_id == centre_id)
        return list(self.db.scalars(requete.order_by(Besoin.echeance, Besoin.id)))
