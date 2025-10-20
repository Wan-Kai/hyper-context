#!/bin/sh
set -e

export NODE_ENV=${NODE_ENV:-production}

echo "[entrypoint] DATABASE_URL=${DATABASE_URL}"

# Ensure prisma client is generated (safe to run multiple times)
if [ -x "./node_modules/.bin/prisma" ]; then
  PRISMA=./node_modules/.bin/prisma
else
  PRISMA=prisma
fi

echo "[entrypoint] prisma generate"
$PRISMA generate

echo "[entrypoint] prisma db push"
$PRISMA db push

if [ "${SEED:-true}" = "true" ]; then
  echo "[entrypoint] seeding database (if needed)"
  node prisma/seed.js || echo "[entrypoint] seed skipped or failed"
fi

echo "[entrypoint] starting Nest API"
exec node dist/main.js

