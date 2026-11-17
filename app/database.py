"""Accès aux données : moteur SQLAlchemy et session par requête."""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import parametres


class Base(DeclarativeBase):
    pass


def creer_moteur(url: str):
    options = {}
    if url.startswith("sqlite"):
        options["connect_args"] = {"check_same_thread": False}
        if url in ("sqlite://", "sqlite:///:memory:"):
            options["poolclass"] = StaticPool
    return create_engine(url, **options)


moteur = creer_moteur(parametres.database_url)
SessionLocale = sessionmaker(bind=moteur, autoflush=False, expire_on_commit=False)


def get_db():
    db = SessionLocale()
    try:
        yield db
    finally:
        db.close()
