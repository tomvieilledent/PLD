#!/bin/sh
set -eu
DELAY="${DB_START_DELAY:-0}"
if [ "$DELAY" != "0" ]; then
  echo "[db] Simulated cold start: waiting ${DELAY}s before PostgreSQL startup"
  sleep "$DELAY"
fi
exec /usr/local/bin/docker-entrypoint.sh "$@"
