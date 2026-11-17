"""Fixtures communes : base SQLite en mémoire, horloge figée, service de notification simulé."""
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.api import dependances
from app.database import Base, creer_moteur
from app.main import app
from app.notification.gateway import MockNotificationGateway

MAINTENANT = datetime(2026, 11, 17, 10, 0)


@pytest.fixture
def horloge():
    return lambda: MAINTENANT


@pytest.fixture
def db():
    moteur = creer_moteur("sqlite://")
    Base.metadata.create_all(moteur)
    session = sessionmaker(bind=moteur, autoflush=False, expire_on_commit=False)()
    yield session
    session.close()
    moteur.dispose()


@pytest.fixture
def gateway():
    return MockNotificationGateway()


@pytest.fixture
def client(db, gateway, horloge):
    app.dependency_overrides[dependances.get_db] = lambda: db
    app.dependency_overrides[dependances.get_gateway] = lambda: gateway
    app.dependency_overrides[dependances.get_horloge] = lambda: horloge
    yield TestClient(app)
    app.dependency_overrides.clear()
