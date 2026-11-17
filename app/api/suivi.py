"""Contrôleur UC6 — Suivre les besoins."""
from dataclasses import asdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependances import get_db
from app.services.suivi_service import SuiviService

router = APIRouter(prefix="/suivi/besoins", tags=["UC6 — Suivi"])


@router.get("")
def lister(statut: str | None = Query(default=None, pattern="^(OUVERT|CLOTURE)$"),
           centre_id: int | None = None, db: Session = Depends(get_db)):
    return [asdict(s) for s in SuiviService(db).lister(statut=statut, centre_id=centre_id)]


@router.get("/{besoin_id}")
def suivre(besoin_id: int, db: Session = Depends(get_db)):
    return asdict(SuiviService(db).suivre(besoin_id))
