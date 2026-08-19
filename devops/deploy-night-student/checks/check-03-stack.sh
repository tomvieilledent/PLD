#!/bin/sh
set -u
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"
[ -f .env ] && . ./.env
fail(){ printf '\033[31m[KO]\033[0m %s\n' "$1"; exit 1; }
ok(){ printf '\033[32m[OK]\033[0m %s\n' "$1"; }
command -v docker >/dev/null 2>&1 || fail "Docker introuvable"
docker compose version >/dev/null 2>&1 || fail "Docker Compose introuvable"

printf '\nCHECKPOINT 3 - STACK DE BASE\n'
./tools/prepare-runtime.sh >/dev/null
docker compose config >/tmp/deploy-night-compose.txt 2>&1 || { cat /tmp/deploy-night-compose.txt; fail "compose.yaml invalide"; }
for svc in gateway frontend api db cache; do grep -q "^  $svc:" /tmp/deploy-night-compose.txt || fail "service $svc absent"; done
ok "5 services detectes"
docker compose up -d --build >/tmp/deploy-night-up.log 2>&1 || { tail -60 /tmp/deploy-night-up.log; fail "la stack ne demarre pas"; }
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/status >/tmp/deploy-night-status.json 2>/dev/null && break
  sleep 2
done
curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/status >/tmp/deploy-night-status.json 2>/dev/null || fail "le gateway ou l API est injoignable"
grep -q '"database":true' /tmp/deploy-night-status.json || fail "l API ne joint pas PostgreSQL"
grep -q '"cache":true' /tmp/deploy-night-status.json || fail "l API ne joint pas Redis dans l etat sain"
curl -fsS http://localhost:${GATEWAY_PORT:-8080}/ >/tmp/deploy-night-front.html 2>/dev/null || fail "le frontend est injoignable via le gateway"
grep -q 'Game Night - Ops Console' /tmp/deploy-night-front.html || fail "le gateway ne sert pas l interface Game Night"
ok "Game Night fonctionne de bout en bout"
printf 'Ouvrez http://localhost:%s et observez le tableau de bord.\n' "${GATEWAY_PORT:-8080}"
printf 'Checkpoint valide. Ne cherchez pas encore a ajouter un healthcheck PostgreSQL si le support ne vous le demande pas.\n'
