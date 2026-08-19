#!/bin/sh
set -u
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"; cd "$ROOT"; [ -f .env ] && . ./.env
fail(){ printf '\033[31m[KO]\033[0m %s\n' "$1"; exit 1; }; ok(){ printf '\033[32m[OK]\033[0m %s\n' "$1"; }
printf '\nINCIDENT 03 - VALIDATION\n'
# On recree l API avec la configuration corrigee. Si le port est toujours en collision, cette commande echoue.
docker compose up -d --force-recreate api >/tmp/deploy-night-i3.log 2>&1 || { tail -60 /tmp/deploy-night-i3.log; fail "un service ne peut toujours pas demarrer"; }
docker compose restart gateway >/dev/null 2>&1 || true
for i in 1 2 3 4 5 6 7 8; do curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/status >/tmp/i3.json 2>/dev/null && break; sleep 2; done
curl -fsS http://localhost:${GATEWAY_PORT:-8080}/ >/tmp/i3-front.html 2>/dev/null || fail "frontend non joignable via le gateway"
grep -q 'Game Night - Ops Console' /tmp/i3-front.html || fail "le gateway ne sert pas Game Night"
curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/status >/tmp/i3.json 2>/dev/null || fail "API non joignable via le gateway"
grep -q '"database":true' /tmp/i3.json || fail "PostgreSQL n est plus joignable"
ok "release a nouveau demarrable"
./tools/mark-resolved.py 03
printf 'Timer arrete. Vous avez termine les 3 incidents obligatoires. Passez au snapshot DORA puis au post-mortem.\n'
