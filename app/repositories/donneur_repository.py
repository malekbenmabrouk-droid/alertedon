from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.domain.donneur import Donneur


class DonneurRepository:
    def __init__(self, db: Session):
        self.db = db

    def ajouter(self, donneur: Donneur) -> Donneur:
        self.db.add(donneur)
        self.db.flush()
        return donneur

    def par_id(self, donneur_id: int) -> Donneur | None:
        return self.db.get(Donneur, donneur_id)

    def existe_contact(self, telephone: str | None, email: str | None) -> bool:
        conditions = []
        if telephone:
            conditions.append(Donneur.telephone == telephone)
        if email:
            conditions.append(Donneur.email == email)
        if not conditions:
            return False
        return self.db.scalar(select(Donneur.id).where(or_(*conditions)).limit(1)) is not None

    def actifs_des_groupes(self, groupes) -> list[Donneur]:
        requete = select(Donneur).where(Donneur.actif.is_(True), Donneur.groupe_sanguin.in_(list(groupes)))
        return list(self.db.scalars(requete.order_by(Donneur.id)))
