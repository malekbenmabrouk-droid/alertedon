"""Contrôleur UC4 — Répondre à une alerte."""
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependances import get_db, get_horloge
from app.api.schemas_alerte import AlerteOut
from app.services.reponse_service import ReponseService

router = APIRouter(tags=["UC4 — Réponses"])


class ReponseIn(BaseModel):
    donneur_id: int
    accepte: bool
    creneau: datetime | None = None


@router.post("/alertes/{alerte_id}/reponse", response_model=AlerteOut)
def repondre(alerte_id: int, donnees: ReponseIn, db: Session = Depends(get_db),
             horloge=Depends(get_horloge)):
    return ReponseService(db, horloge=horloge).repondre(
        alerte_id=alerte_id, donneur_id=donnees.donneur_id,
        accepte=donnees.accepte, creneau=donnees.creneau)


@router.get("/donneurs/{donneur_id}/alertes", response_model=list[AlerteOut])
def mes_alertes(donneur_id: int, db: Session = Depends(get_db), horloge=Depends(get_horloge)):
    return ReponseService(db, horloge=horloge).alertes_du_donneur(donneur_id)
