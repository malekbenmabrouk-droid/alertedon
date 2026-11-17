from enum import Enum


class GroupeSanguin(str, Enum):
    O_NEG = "O-"
    O_POS = "O+"
    A_NEG = "A-"
    A_POS = "A+"
    B_NEG = "B-"
    B_POS = "B+"
    AB_NEG = "AB-"
    AB_POS = "AB+"


class Canal(str, Enum):
    SMS = "SMS"
    EMAIL = "EMAIL"


GROUPES: frozenset[str] = frozenset(g.value for g in GroupeSanguin)
