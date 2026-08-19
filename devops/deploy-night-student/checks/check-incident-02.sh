#!/bin/sh
set -u
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"; cd "$ROOT"; [ -f .env ] && . ./.env
fail(){ printf '\033[31m[KO]\033[0m %s\n' "$1"; exit 1; }; ok(){ printf '\033[32m[OK]\033[0m %s\n' "$1"; }
printf '\nINCIDENT 02 - VALIDATION\n'
docker compose config >/tmp/i2-compose.txt 2>&1 || fail "compose.yaml invalide"
grep -q 'pg_isready' /tmp/i2-compose.txt || fail "PostgreSQL n a pas encore de test de sante fiable"
python3 - <<'PY' || exit 1
from pathlib import Path
lines = Path('/tmp/i2-compose.txt').read_text().splitlines()
in_api = False
in_depends = False
in_db = False
db_healthy = False
for line in lines:
    if line == '  api:':
        in_api = True
        continue
    if in_api and line.startswith('  ') and not line.startswith('    ') and line.endswith(':'):
        break
    if not in_api:
        continue
    if line == '    depends_on:':
        in_depends = True
        continue
    if in_depends:
        if line.startswith('    ') and not line.startswith('      '):
            in_depends = False
            in_db = False
            continue
        if line == '      db:':
            in_db = True
            continue
        if in_db and line.startswith('      ') and not line.startswith('        '):
            in_db = False
        if in_db and line.strip() == 'condition: service_healthy':
            db_healthy = True
if not db_healthy:
    print('\033[31m[KO]\033[0m l API n attend pas PostgreSQL en etat healthy')
    raise SystemExit(1)
print('\033[32m[OK]\033[0m l API attend bien PostgreSQL en etat healthy')
PY
printf 'Test du redemarrage a froid...\n'
docker compose down >/dev/null 2>&1 || true
docker compose up -d >/tmp/deploy-night-i2.log 2>&1 || { tail -60 /tmp/deploy-night-i2.log; fail "la stack ne redemarre pas"; }
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/status >/tmp/i2.json 2>/dev/null && break; sleep 2; done
curl -fsS http://localhost:${GATEWAY_PORT:-8080}/api/status >/tmp/i2.json 2>/dev/null || fail "API indisponible apres un redemarrage a froid"
grep -q '"database":true' /tmp/i2.json || fail "PostgreSQL n est pas joignable depuis l API"
# On confirme aussi que Compose expose bien un etat de sante pour la DB.
docker compose ps db | grep -qi 'healthy' || fail "PostgreSQL n est pas signale healthy par Compose"
ok "cold start robuste"
./tools/mark-resolved.py 02
printf 'Timer arrete. Incident 02 valide.\n'
