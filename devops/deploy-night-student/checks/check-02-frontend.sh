#!/bin/sh
set -u
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"
fail(){ printf '\033[31m[KO]\033[0m %s\n' "$1"; exit 1; }
ok(){ printf '\033[32m[OK]\033[0m %s\n' "$1"; }
cleanup(){ docker rm -f game-night-front-check >/dev/null 2>&1 || true; }
command -v docker >/dev/null 2>&1 || fail "Docker introuvable"
trap cleanup EXIT INT TERM

printf '\nCHECKPOINT 2 - IMAGE FRONTEND\n'
docker build -t game-night-frontend ./frontend >/tmp/deploy-night-build-front.log 2>&1 || { tail -30 /tmp/deploy-night-build-front.log; fail "le build frontend echoue"; }
ok "image frontend construite"

docker image inspect game-night-frontend --format '{{json .Config.ExposedPorts}}' | grep -q '80/tcp' \
  || fail "le port 80 n est pas documente dans l image"
cleanup
docker run -d --name game-night-front-check -p 3901:80 game-night-frontend >/dev/null 2>&1 || fail "le container frontend ne demarre pas"
for i in 1 2 3 4 5; do curl -fsS http://localhost:3901/ >/tmp/game-night-front.html 2>/dev/null && break; sleep 1; done
curl -fsS http://localhost:3901/ >/tmp/game-night-front.html 2>/dev/null || { docker logs game-night-front-check 2>/dev/null || true; fail "la page n est pas servie sur le port 80 du container"; }
grep -q 'Game Night - Ops Console' /tmp/game-night-front.html \
  || fail "Nginx repond, mais l interface Game Night n est pas presente (page Nginx par defaut ?)"
curl -fsS http://localhost:3901/styles.css >/dev/null 2>&1 || fail "styles.css n est pas servi"
curl -fsS http://localhost:3901/app.js >/dev/null 2>&1 || fail "app.js n est pas servi"
curl -fsS http://localhost:3901/assets/game-1.jpg >/dev/null 2>&1 || fail "les visuels du frontend ne sont pas servis"
ok "interface Game Night et fichiers statiques servis par Nginx"
printf 'Checkpoint valide.\n'
