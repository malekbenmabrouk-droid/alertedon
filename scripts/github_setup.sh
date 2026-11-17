#!/usr/bin/env bash
# Crée sur GitHub les 4 milestones (phases UP), les 6 tickets UC et les étiquettes.
# Prérequis : GitHub CLI installé et connecté (gh auth login), lancé depuis la racine du dépôt.
# Le script peut être relancé : il ne recrée pas ce qui existe déjà.
set -euo pipefail
REPO="${REPO:-malekbenmabrouk-droid/alertedon}"

milestone() {  # $1 titre, $2 description
  if ! gh api "repos/$REPO/milestones?state=all" --jq '.[].title' | grep -Fxq "$1"; then
    gh api "repos/$REPO/milestones" -f title="$1" -f description="$2" >/dev/null
    echo "milestone créé : $1"
  fi
}
label() { gh label create "$1" --color "$2" --repo "$REPO" 2>/dev/null || true; }
ticket() {  # $1 titre, $2 milestone, $3 étiquettes, $4 corps
  if ! gh issue list --repo "$REPO" --state all --limit 200 --json title --jq '.[].title' | grep -Fxq "$1"; then
    gh issue create --repo "$REPO" --title "$1" --milestone "$2" --label "$3" --body "$4" >/dev/null
    echo "ticket créé : $1"
  fi
}

milestone "Lancement"    "Vision, acteurs, UC, priorisation, plan — jalon LCO (tag v0.0-lancement)"
milestone "Élaboration"  "Itération 1 — architecture de base, UC3 de bout en bout, CI — jalon LCA (tag v0.1-elaboration)"
milestone "Construction" "Itérations 2-3 — UC2, UC4, UC5, UC6 — jalon IOC (tags v0.2-construction, v0.9-construction)"
milestone "Transition"   "Revue croisée, canal e-mail, démo — livraison (tag v1.0)"

label "uc" "1d76db"; label "risque" "d93f0b"; label "revue" "fbca04"

ticket "UC1 — S'inscrire comme donneur" "Élaboration" "uc" \
  "Branche \`uc1-inscription\` · Fiche : docs/fiches-uc.md#uc1 · Séquence : docs/uml/sequence-uc1.puml"
ticket "UC2 — Déclarer un besoin urgent" "Construction" "uc" \
  "Branche \`uc2-declarer-besoin\` · version minimale en élaboration, complète en construction (<<include>> UC3)"
ticket "UC3 — Alerter les donneurs ciblés (UC à risque)" "Élaboration" "uc,risque" \
  "Branche \`uc3-alerte-ciblee\` · compatibilité ABO/Rh, zone, éligibilité, anti-relance, échecs/relance, idempotence"
ticket "UC4 — Répondre à une alerte" "Construction" "uc" "Branche \`uc4-repondre-alerte\`"
ticket "UC5 — Enregistrer un don" "Construction" "uc" "Branche \`uc5-enregistrer-don\`"
ticket "UC6 — Suivre les besoins" "Construction" "uc" "Branche \`uc6-suivi-besoins\`"
ticket "Revue croisée par une autre équipe" "Transition" "revue" "Grille : docs/revue-croisee.md"

echo "Terminé. Ferme les tickets terminés et les milestones atteints (voir docs/GUIDE.md, étape 4)."
