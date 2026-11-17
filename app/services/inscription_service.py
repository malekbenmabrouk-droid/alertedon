"""UC1 — S'inscrire comme donneur."""
from datetime import date

from sqlalchemy.orm import Session

from app.domain.donneur import Donneur
from app.domain.groupes import GROUPES
from app.repositories.donneur_repository import DonneurRepository
from app.services.erreurs import Conflit, RegleMetierViolee


class InscriptionService:
    def __init__(self, db: Session, aujourd_hui: date | None = None):
        self.db = db
        self.donneurs = DonneurRepository(db)
        self.aujourd_hui = aujourd_hui or date.today()

    def inscrire(self, *, nom: str, groupe_sanguin: str, latitude: float, longitude: float,
                 canal_prefere: str = "SMS", telephone: str | None = None,
                 email: str | None = None, date_dernier_don: date | None = None) -> Donneur:
        if groupe_sanguin not in GROUPES:
            raise RegleMetierViolee(f"Groupe sanguin inconnu : {groupe_sanguin}")
        if canal_prefere == "SMS" and not telephone:
            raise RegleMetierViolee("Un numéro de téléphone est requis pour le canal SMS")
        if canal_prefere == "EMAIL" and not email:
            raise RegleMetierViolee("Une adresse e-mail est requise pour le canal EMAIL")
        if date_dernier_don and date_dernier_don > self.aujourd_hui:
            raise RegleMetierViolee("La date du dernier don ne peut pas être dans le futur")
        if self.donneurs.existe_contact(telephone, email):
            raise Conflit("Un donneur est déjà inscrit avec ce téléphone ou cet e-mail")

        donneur = Donneur(
            nom=nom.strip(), groupe_sanguin=groupe_sanguin, latitude=latitude, longitude=longitude,
            canal_prefere=canal_prefere, telephone=telephone, email=email,
            date_dernier_don=date_dernier_don, actif=True,
        )
        self.donneurs.ajouter(donneur)
        self.db.commit()
        return donneur
