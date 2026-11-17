from datetime import date

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Donneur(Base):
    __tablename__ = "donneurs"

    id: Mapped[int] = mapped_column(primary_key=True)
    nom: Mapped[str] = mapped_column(String(100))
    telephone: Mapped[str | None] = mapped_column(String(20), unique=True)
    email: Mapped[str | None] = mapped_column(String(120), unique=True)
    groupe_sanguin: Mapped[str] = mapped_column(String(3), index=True)
    latitude: Mapped[float]
    longitude: Mapped[float]
    date_dernier_don: Mapped[date | None]
    canal_prefere: Mapped[str] = mapped_column(String(5), default="SMS")
    actif: Mapped[bool] = mapped_column(default=True)

    def contact(self) -> str:
        return self.email if self.canal_prefere == "EMAIL" else self.telephone
