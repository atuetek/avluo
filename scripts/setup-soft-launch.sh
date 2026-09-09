#!/usr/bin/env bash
# Local Soft-Launch Setup: DB up, migrate, RLS, seed
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Docker stack (Postgres/MinIO/Redis)"
pnpm db:up

echo "==> Wait for Postgres"
for i in $(seq 1 30); do
  if docker exec avluo-postgres pg_isready -U avluo >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if [[ ! -f apps/api/.env ]]; then
  cp .env.example apps/api/.env
  echo "Created apps/api/.env from .env.example"
fi

echo "==> Prisma generate + migrate"
cd apps/api
npx prisma generate
npx prisma migrate deploy || npx prisma migrate dev --name init --skip-seed
cd "$ROOT"

echo "==> RLS policies"
if command -v psql >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  set -a
  # Prefer DATABASE_URL from apps/api/.env
  if [[ -f apps/api/.env ]]; then
    # shellcheck disable=SC2046
    export $(grep -E '^DATABASE_URL=' apps/api/.env | xargs)
  fi
  set +a
  psql "$DATABASE_URL" -f apps/api/prisma/rls-policies.sql || true
else
  echo "psql not found — apply RLS later: pnpm db:rls"
fi

echo "==> Seed Yeşiltepe"
pnpm --filter @avluo/api run prisma:seed

echo ""
echo "Soft-Launch local ready."
echo "  API:  pnpm --filter @avluo/api dev"
echo "  PWA:  pnpm --filter @avluo/pwa dev"
echo "  Login: +905551234567 (OTP in API logs)"
echo "  Smoke: bash scripts/smoke-mvp.sh"
