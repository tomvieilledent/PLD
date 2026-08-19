#!/bin/sh
set -u
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"
fail(){ printf '\033[31m[KO]\033[0m %s\n' "$1"; exit 1; }
ok(){ printf '\033[32m[OK]\033[0m %s\n' "$1"; }
command -v docker >/dev/null 2>&1 || fail "Docker introuvable"

printf '\nCHECKPOINT 1 - IMAGE API\n'
docker build -t game-night-api ./api >/tmp/deploy-night-build-api.log 2>&1 || { tail -30 /tmp/deploy-night-build-api.log; fail "le build API echoue"; }
ok "image API construite"

# On verifie la recette sans exiger PostgreSQL a ce stade.
docker image inspect game-night-api --format '{{json .Config.ExposedPorts}}' | grep -q '3000/tcp' \
  || fail "le port 3000 n est pas documente dans l image"
CMD_JSON="$(docker image inspect game-night-api --format '{{json .Config.Cmd}}')"
ENTRY_JSON="$(docker image inspect game-night-api --format '{{json .Config.Entrypoint}}')"
[ "$CMD_JSON" != "null" ] || [ "$ENTRY_JSON" != "null" ] || fail "aucune commande de demarrage n est definie"

# docker run doit au minimum pouvoir creer le container avec la recette produite.
docker rm -f game-night-api-check >/dev/null 2>&1 || true
docker run -d --name game-night-api-check -p 3900:3000 game-night-api >/dev/null 2>&1 || fail "le container API ne peut pas etre cree"
sleep 1
docker rm -f game-night-api-check >/dev/null 2>&1 || true
ok "Dockerfile interprete, port et commande de demarrage coherents"
printf 'Checkpoint valide. Vous n avez pas encore besoin que l API parle a la base.\n'
