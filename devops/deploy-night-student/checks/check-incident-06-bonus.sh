#!/bin/sh
set -u
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"; cd "$ROOT"; [ -f .env ] && . ./.env
fail(){ printf '\033[31m[KO]\033[0m %s\n' "$1"; exit 1; }; ok(){ printf '\033[32m[OK]\033[0m %s\n' "$1"; }
printf '\nBONUS 06 - VALIDATION\n'
docker compose up -d --force-recreate api >/tmp/deploy-night-i6.log 2>&1 || { tail -50 /tmp/deploy-night-i6.log; fail "API ne redemarre pas"; }
docker compose restart gateway >/dev/null 2>&1 || true
for i in 1 2 3 4 5 6 7 8; do curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/status >/tmp/i6.json 2>/dev/null && break; sleep 2; done
curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/status >/tmp/i6.json 2>/dev/null || fail "API toujours indisponible"
grep -q '"database":true' /tmp/i6.json || fail "l API n est toujours pas authentifiee aupres de PostgreSQL"
ok "connexion PostgreSQL retablie"
./tools/mark-resolved.py 06
printf 'Bonus termine. Votre garde est propre.\n'
