from datetime import date

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Don(Base):
    __tablename__ = "dons"

    id: Mapped[int] = mapped_column(primary_key=True)
    donneur_id: Mapped[int] = mapped_column(ForeignKey("donneurs.id"), index=True)
    centre_id: Mapped[int] = mapped_column(ForeignKey("centres.id"))
    besoin_id: Mapped[int | None] = mapped_column(ForeignKey("besoins.id"), index=True)
    date_don: Mapped[date]
    volume_ml: Mapped[int] = mapped_column(default=450)
