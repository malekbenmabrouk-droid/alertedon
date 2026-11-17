from datetime import date, datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.domain.centre import Centre

OUVERT = "OUVERT"
CLOTURE = "CLOTURE"


class Besoin(Base):
    __tablename__ = "besoins"

    id: Mapped[int] = mapped_column(primary_key=True)
    centre_id: Mapped[int] = mapped_column(ForeignKey("centres.id"))
    groupe_sanguin: Mapped[str] = mapped_column(String(3))
    quantite: Mapped[int]  # nombre de poches demandées
    quantite_collectee: Mapped[int] = mapped_column(default=0)
    echeance: Mapped[date]
    statut: Mapped[str] = mapped_column(String(10), default=OUVERT)
    cree_le: Mapped[datetime]
    cloture_le: Mapped[datetime | None]

    centre: Mapped[Centre] = relationship()

    @property
    def objectif_atteint(self) -> bool:
        return self.quantite_collectee >= self.quantite
