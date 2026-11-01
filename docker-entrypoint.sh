#!/bin/sh
set -e
npx prisma db push --skip-generate --accept-data-loss
npx tsx prisma/seed.ts
exec npx next start -H 0.0.0.0 -p 8080
