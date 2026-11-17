"""Itération 3 — vrai canal e-mail (SMTP simulé par un faux serveur)."""
import smtplib

import pytest

from app.notification.email_gateway import EmailNotificationGateway
from app.notification.gateway import EchecNotification, Message, MockNotificationGateway


class FauxSMTP:
    envoyes = []

    def __init__(self, hote, port, timeout):
        self.hote = hote

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def send_message(self, courriel):
        FauxSMTP.envoyes.append(courriel)


class SMTPEnPanne(FauxSMTP):
    def send_message(self, courriel):
        raise smtplib.SMTPServerDisconnected("serveur indisponible")


def _gateway(fabrique, repli=None):
    return EmailNotificationGateway("smtp.test", 25, "alertedon@test.tn",
                                    repli=repli or MockNotificationGateway(), fabrique_smtp=fabrique)


def test_envoie_un_email():
    FauxSMTP.envoyes.clear()
    _gateway(FauxSMTP).envoyer(Message("a@b.tn", "EMAIL", "Objet", "Texte"))
    assert FauxSMTP.envoyes[0]["To"] == "a@b.tn"


def test_sms_delegue_au_canal_de_repli():
    repli = MockNotificationGateway()
    _gateway(FauxSMTP, repli).envoyer(Message("+216", "SMS", "Objet", "Texte"))
    assert len(repli.envoyes) == 1


def test_panne_smtp_devient_un_echec_de_notification():
    with pytest.raises(EchecNotification):
        _gateway(SMTPEnPanne).envoyer(Message("a@b.tn", "EMAIL", "Objet", "Texte"))
