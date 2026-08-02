# Avluo · Monorepo-Setup

Wiederverwendungsbasis: sm-display-Pattern (`pnpm` workspaces + Nx-light).

## Struktur

```
avluo/
├── apps/
│   ├── api/                      # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/
│   │   │   │   ├── tenant/        # TenantMiddleware, Guards
│   │   │   │   ├── audit/         # AuditLog Service
│   │   │   │   └── prisma/        # PrismaService mit RLS
│   │   │   ├── modules/
│   │   │   │   ├── auth/          # SMS-OTP, JWT
│   │   │   │   ├── members/       # Member-CRUD
│   │   │   │   ├── posts/         # Timeline, Comments, Likes
│   │   │   │   ├── messages/      # DMs
│   │   │   │   ├── events/        # Veranstaltungen
│   │   │   │   ├── polls/         # Umfragen
│   │   │   │   ├── emergency/     # Notfall
│   │   │   │   ├── media/         # MinIO
│   │   │   │   └── admin/         # Yönetim-Panel
│   │   │   └── prisma/
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # siehe ../db/schema.prisma
│   │   │   └── rls-policies.sql   # siehe ../db/rls-policies.sql
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── pwa/                      # Angular 19 PWA
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/          # Auth, Tenant-Context, i18n
│       │   │   ├── features/
│       │   │   │   ├── timeline/  # Posts-Feed
│       │   │   │   ├── messages/   # DMs
│       │   │   │   ├── events/     # Veranstaltungen
│       │   │   │   ├── polls/      # Umfragen
│       │   │   │   ├── emergency/  # Notfall-Button
│       │   │   │   └── profile/    # Eigenes Profil
│       │   │   ├── shared/         # Components, Pipes
│       │   │   └── app.component.ts
│       │   ├── locales/            # i18n files
│       │   │   ├── tr-TR.json
│       │   │   ├── en-US.json
│       │   │   └── de-DE.json
│       │   └── manifest.webmanifest
│       ├── public/
│       │   ├── icons/
│       │   │   ├── icon-192.png    # App-Icon
│       │   │   └── icon-512.png
│       │   └── favicon.ico
│       ├── angular.json
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── shared-types/             # Geteilte TypeScript-Types
│   │   ├── src/
│   │   │   ├── post.ts
│   │   │   ├── member.ts
│   │   │   ├── event.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── eslint-config/            # Geteilte Lint-Regeln
│       └── index.js
├── docker/
│   ├── docker-compose.yml         # Lokal: Postgres + MinIO + Redis
│   ├── docker-compose.prod.yml    # Hetzner-VM
│   └── postgres/
│       └── init/
│           ├── 01-extensions.sql  # pgcrypto, citext
│           ├── 02-rls-policies.sql # rls-policies.sql
│           └── 99-seed-pilot.sql  # Demo-Tenant für Dev
├── scripts/
│   ├── setup-pilot-tenant.sh     # Pilot-Mitglieder importieren
│   ├── generate-invite-codes.sh  # QR-Codes drucken
│   └── backup.sh                 # Tägliches pg_dump → Hetzner Storage Box
├── .github/
│   └── workflows/
│       ├── ci.yml                # Lint, Test, Build
│       └── deploy.yml            # Hetzner-VM Deploy
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .env.example
├── README.md
└── LICENSE
```

## pnpm-Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

## Top-Level package.json

```json
{
  "name": "avluo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint",
    "db:up": "docker compose -f docker/docker-compose.yml up -d",
    "db:migrate": "pnpm --filter @avluo/api run prisma:migrate",
    "db:rls": "psql $DATABASE_URL -f apps/api/prisma/rls-policies.sql",
    "db:seed": "pnpm --filter @avluo/api run prisma:seed"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

## docker-compose.yml (lokal)

```yaml
# docker/docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: avluo
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: avluo
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U avluo"]
      interval: 5s

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  minio-data:
  redis-data:
```

## .env.example

```bash
# Database
DATABASE_URL=postgresql://avluo:devpass@localhost:5432/avluo
POSTGRES_PASSWORD=devpass

# JWT
JWT_SECRET=change-me-32-chars-minimum-secret
JWT_EXPIRES_IN=7d

# MinIO
MINIO_USER=avluo
MINIO_PASSWORD=devpass
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false

# Redis
REDIS_URL=redis://localhost:6379

# SMS (Netgsm for TR)
NETGSM_USER=dev
NETGSM_PASSWORD=dev
NETGSM_SENDER=AVLUO

# Push (Firebase / Web-Push)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:dev@avluo.app

# App
APP_BASE_URL=http://demo.localhost:4200
PLATFORM_URL=http://localhost:3000
```

## Schritt-für-Schritt Setup

```bash
# 1. Repo klonen + Workspaces installieren
git clone <repo>
cd avluo
pnpm install

# 2. Environment
cp .env.example .env
# Secrets einsetzen

# 3. Datenbank starten
pnpm db:up

# 4. Prisma migrieren + RLS deployen
pnpm db:migrate
pnpm db:rls

# 5. Demo-Tenant seeden (Demo-Siedlung "Akıcı Mahalle")
pnpm db:seed

# 6. Dev-Server starten
pnpm dev
# → PWA auf http://demo.localhost:4200
# → API auf http://demo.localhost:3000
```

## CI (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: avluo
          POSTGRES_PASSWORD: test
          POSTGRES_DB: avluo_test
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 5s
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

## Was wiederverwendet wird

| Komponente | Quelle |
|---|---|
| Monorepo-Setup (pnpm) | sm-display |
| Docker-Compose Pattern | sm-display |
| NestJS-Modul-Struktur | organize4u + sm-display |
| Prisma-Service-Pattern | organize4u (erweitert um RLS) |
| Auth-Modul (JWT) | organize4u (erweitert um tenant_id) |
| Angular-Modul-Struktur | sm-display |
| i18n-Setup | sm-display |
| CI-Workflows | sm-display |
| ESLint-Konfig | sm-display |

**Geschätzter Copy-Paste-Aufwand für Monorepo-Setup: 1-2 Tage** (statt 1 Woche ohne Vorlage)
