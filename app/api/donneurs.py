"""Contrôleur UC1 — S'inscrire comme donneur."""
from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.dependances import get_db, get_horloge
from app.domain.groupes import Canal, GroupeSanguin
from app.repositories.donneur_repository import DonneurRepository
from app.services.erreurs import RessourceIntrouvable
from app.services.inscription_service import InscriptionService

router = APIRouter(prefix="/donneurs", tags=["UC1 — Donneurs"])


class InscriptionIn(BaseModel):
    nom: str = Field(min_length=2, max_length=100)
    groupe_sanguin: GroupeSanguin
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    canal_prefere: Canal = Canal.SMS
    telephone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=120)
    date_dernier_don: date | None = None


class DonneurOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nom: str
    groupe_sanguin: str
    canal_prefere: str
    telephone: str | None
    email: str | None
    date_dernier_don: date | None
    actif: bool


@router.post("", status_code=201, response_model=DonneurOut)
def inscrire(donnees: InscriptionIn, db: Session = Depends(get_db), horloge=Depends(get_horloge)):
    service = InscriptionService(db, aujourd_hui=horloge().date())
    return service.inscrire(
        nom=donnees.nom, groupe_sanguin=donnees.groupe_sanguin.value,
        latitude=donnees.latitude, longitude=donnees.longitude,
        canal_prefere=donnees.canal_prefere.value, telephone=donnees.telephone,
        email=donnees.email, date_dernier_don=donnees.date_dernier_don,
    )


@router.get("/{donneur_id}", response_model=DonneurOut)
def obtenir(donneur_id: int, db: Session = Depends(get_db)):
    donneur = DonneurRepository(db).par_id(donneur_id)
    if donneur is None:
        raise RessourceIntrouvable(f"Donneur {donneur_id} introuvable")
    return donneur
