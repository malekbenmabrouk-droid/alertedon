"""Point d'entrée de l'API AlerteDon (couche contrôleur)."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api import sante, donneurs, centres, besoins, alertes, reponses
from app.database import Base, moteur
from app.services.erreurs import Conflit, ErreurMetier, RegleMetierViolee, RessourceIntrouvable

VERSION = "0.2.0"
ROUTEURS = [sante, donneurs, centres, besoins, alertes, reponses]

_CODES = {RessourceIntrouvable: 404, Conflit: 409, RegleMetierViolee: 422}


@asynccontextmanager
async def cycle_de_vie(_app: FastAPI):
    Base.metadata.create_all(moteur)
    yield


def creer_app() -> FastAPI:
    application = FastAPI(title="AlerteDon", version=VERSION, lifespan=cycle_de_vie,
                          description="Système d'alerte ciblée des donneurs de sang")

    @application.exception_handler(ErreurMetier)
    async def erreur_metier(_requete: Request, exc: ErreurMetier):
        return JSONResponse(status_code=_CODES.get(type(exc), 400), content={"detail": str(exc)})

    for module in ROUTEURS:
        application.include_router(module.router)
    return application


app = creer_app()
