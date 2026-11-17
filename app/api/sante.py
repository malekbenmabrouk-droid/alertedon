from fastapi import APIRouter

router = APIRouter(tags=["Santé"])


@router.get("/sante")
def sante():
    return {"statut": "ok"}
