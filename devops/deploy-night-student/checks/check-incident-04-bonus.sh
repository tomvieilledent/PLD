#!/bin/sh
set -u
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"; cd "$ROOT"; [ -f .env ] && . ./.env
fail(){ printf '\033[31m[KO]\033[0m %s\n' "$1"; exit 1; }; ok(){ printf '\033[32m[OK]\033[0m %s\n' "$1"; }
printf '\nBONUS 04 - VALIDATION\n'
# L API doit etre saine directement avant de valider le chemin via Nginx.
curl -fsS http://localhost:${API_HOST_PORT:-3000}/api/status >/tmp/i4-direct.json 2>/dev/null || fail "l API elle-meme est indisponible : ce bonus cible le gateway"
grep -q '"database":true' /tmp/i4-direct.json || fail "l API directe ne joint pas PostgreSQL"
docker compose restart gateway >/dev/null 2>&1 || true
sleep 2
curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/status >/tmp/i4-gateway.json 2>/dev/null || fail "le gateway renvoie toujours une erreur sur /api"
ok "route gateway -> API retablie"
./tools/mark-resolved.py 04
