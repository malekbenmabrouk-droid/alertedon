from datetime import datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.domain.besoin import Besoin
from app.domain.donneur import Donneur

A_ENVOYER = "A_ENVOYER"
ENVOYEE = "ENVOYEE"
ECHEC = "ECHEC"
ACCEPTEE = "ACCEPTEE"
DECLINEE = "DECLINEE"
STATUTS_NOTIFIES = (ENVOYEE, ACCEPTEE, DECLINEE)


class Alerte(Base):
    __tablename__ = "alertes"
    # Idempotence : un donneur n'est alerté qu'une fois par besoin.
    __table_args__ = (UniqueConstraint("besoin_id", "donneur_id", name="uq_alerte_besoin_donneur"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    besoin_id: Mapped[int] = mapped_column(ForeignKey("besoins.id"), index=True)
    donneur_id: Mapped[int] = mapped_column(ForeignKey("donneurs.id"), index=True)
    statut: Mapped[str] = mapped_column(String(10), default=A_ENVOYER)
    tentatives: Mapped[int] = mapped_column(default=0)
    envoyee_le: Mapped[datetime | None]
    repondue_le: Mapped[datetime | None]
    creneau: Mapped[datetime | None]

    besoin: Mapped[Besoin] = relationship()
    donneur: Mapped[Donneur] = relationship()
