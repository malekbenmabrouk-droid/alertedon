"""Vrai canal de notification : e-mail via SMTP (itération 3).

Les messages SMS sont confiés à un canal de repli (pas de fournisseur SMS
dans le périmètre du TP).
"""
import smtplib
from email.message import EmailMessage

from app.notification.gateway import EchecNotification, Message, NotificationGateway


class EmailNotificationGateway:
    def __init__(self, hote: str, port: int, expediteur: str,
                 repli: NotificationGateway, fabrique_smtp=smtplib.SMTP):
        self.hote = hote
        self.port = port
        self.expediteur = expediteur
        self.repli = repli
        self.fabrique_smtp = fabrique_smtp

    def envoyer(self, message: Message) -> None:
        if message.canal != "EMAIL":
            self.repli.envoyer(message)
            return
        courriel = EmailMessage()
        courriel["From"] = self.expediteur
        courriel["To"] = message.destinataire
        courriel["Subject"] = message.objet
        courriel.set_content(message.texte)
        try:
            with self.fabrique_smtp(self.hote, self.port, timeout=10) as smtp:
                smtp.send_message(courriel)
        except (OSError, smtplib.SMTPException) as exc:
            raise EchecNotification(str(exc)) from exc
