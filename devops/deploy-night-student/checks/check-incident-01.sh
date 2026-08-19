#!/bin/sh
set -u
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"; cd "$ROOT"; [ -f .env ] && . ./.env
fail(){ printf '\033[31m[KO]\033[0m %s\n' "$1"; exit 1; }; ok(){ printf '\033[32m[OK]\033[0m %s\n' "$1"; }
printf '\nINCIDENT 01 - VALIDATION\n'
# La correction change la configuration runtime de l API : on la recree volontairement.
docker compose up -d --force-recreate api >/tmp/deploy-night-i1.log 2>&1 || { tail -40 /tmp/deploy-night-i1.log; fail "l API ne repart pas"; }
# Nginx peut avoir resolu l ancienne IP du container API : on recharge le gateway apres recreation.
docker compose restart gateway >/dev/null 2>&1 || true
for i in 1 2 3 4 5 6 7 8; do curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/status >/tmp/i1.json 2>/dev/null && break; sleep 2; done
curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/status >/tmp/i1.json 2>/dev/null || fail "API toujours indisponible"
grep -q '"database":true' /tmp/i1.json || fail "l API ne joint toujours pas PostgreSQL"
ok "service retabli"
./tools/mark-resolved.py 01
printf 'Timer arrete. Notez la cause et le signal qui vous a mis sur la piste.\n'
