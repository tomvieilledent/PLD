#!/bin/sh
set -u
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"; cd "$ROOT"; [ -f .env ] && . ./.env
fail(){ printf '\033[31m[KO]\033[0m %s\n' "$1"; exit 1; }; ok(){ printf '\033[32m[OK]\033[0m %s\n' "$1"; }
printf '\nBONUS 05 - VALIDATION\n'
docker compose up -d --force-recreate api >/tmp/deploy-night-i5.log 2>&1 || { tail -40 /tmp/deploy-night-i5.log; fail "API ne redemarre pas"; }
docker compose restart gateway >/dev/null 2>&1 || true
for i in 1 2 3 4 5 6 7 8; do curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/status >/tmp/i5.json 2>/dev/null && break; sleep 2; done
curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/status >/tmp/i5.json 2>/dev/null || fail "API indisponible"
grep -q '"database":true' /tmp/i5.json || fail "PostgreSQL n est pas joignable"
grep -q '"cache":true' /tmp/i5.json || fail "Redis est toujours absent du chemin de l API"
# Deux appels laissent une chance au premier de remplir le cache et au second de le servir.
curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/games >/dev/null 2>&1 || fail "catalogue indisponible"
curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/games >/tmp/i5-games.json 2>/dev/null || fail "catalogue indisponible"
grep -q '"source":"redis"' /tmp/i5-games.json || fail "la seconde reponse ne vient pas du cache"
ok "cache reconnecte et utilise"
./tools/mark-resolved.py 05
