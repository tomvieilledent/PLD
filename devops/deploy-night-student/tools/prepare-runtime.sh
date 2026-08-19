#!/bin/sh
set -eu
mkdir -p runtime .incident-state
[ -f .env ] || cp .env.example .env
if [ ! -f runtime/nginx.conf ]; then
  cp gateway/nginx.conf runtime/nginx.conf
  echo '[OK] runtime/nginx.conf prepared'
else
  echo '[OK] runtime/nginx.conf already present - left unchanged'
fi
