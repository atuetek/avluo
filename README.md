# Avluo

> Multi-Tenant Social-Media-App für türkische Wohnsiedlungen (Kooperatif)
> Streng isoliert pro Siedlung, trilingual (TR/EN/DE), mit Notfall-System.

**Logo:** Offener Kreis mit Punkt in Korall-Rot (`#ff5a3c`)

**Pilot-Kunde:** Yeşiltepe Sitesi Kooperatifi

---

## Stack

- **Frontend:** Angular 19 PWA
- **Backend:** NestJS 10 (Multi-Tenant-fähig)
- **DB:** PostgreSQL 16 mit Row-Level-Security
- **Storage:** MinIO (S3-kompatibel, self-hosted)
- **Cache/Queue:** Redis 7
- **Monorepo:** pnpm workspaces
- **i18n:** TR (tr-TR), EN (en-US), DE (de-DE)

## Architektur

3 Verteidigungslinien für Tenant-Isolation:

1. **HTTP-Layer** — `TenantMiddleware` validiert Subdomain + JWT-tenant_id
2. **Service-Layer** — `PrismaService.withTenant()` setzt `SET LOCAL app.tenant_id`
3. **DB-Layer** — PostgreSQL Row-Level-Security Policies blockieren Cross-Tenant-Queries

Vollständige Doku: [`docs/architecture.md`](docs/architecture.md)

## Schnellstart

```bash
# 1. Dependencies
pnpm install

# 2. Environment
cp .env.example .env

# 3. Datenbank starten
pnpm db:up

# 4. Prisma-Migrationen
pnpm db:migrate

# 5. RLS-Policies deployen
pnpm db:rls

# 6. Pilot-Tenant seeden
pnpm db:seed

# 7. Dev-Server starten
pnpm dev
```

→ API: http://localhost:3000
→ PWA: http://demo.localhost:4200 (Subdomain-Testing via `x-dev-tenant` Header)

## Pilot-Kunde

**Yeşiltepe Sitesi** — erste Siedlung die Avluo testet.

| | |
|---|---|
| Slug | `yesiltepe` |
| Subdomain | `yesiltepe.localhost:4200` (dev) / `yesiltepe.avluo.app` (prod) |
| Standard-Sprache | tr-TR |
| Plan | STANDARD (bis 1000 Member) |
| Pilot-Mitglieder | ca. 50 Vertrauenspersonen (Phase 1) |

## Module

```
apps/
├── api/          NestJS Backend
└── pwa/          Angular 19 PWA
packages/
└── shared-types/ Geteilte TypeScript-Types
docker/
├── docker-compose.yml
└── postgres/init/
    ├── 01-extensions.sql
    └── 99-seed-pilot.sql
```

## Phasen

- **Phase 1 (10 Wochen):** PWA + 1 Pilot-Siedlung + alle Core-Features
- **Phase 2 (6 Wochen):** Multi-Tenant-Onboarding + Yönetim-Panel + WhatsApp-Bot
- **Phase 3 (6 Wochen):** Native iOS/Android + Push + Live-Timeline

Vollständiger Plan: [`docs/phase-1-backlog.md`](docs/phase-1-backlog.md)

## Verwandte Projekte

- `organize4u` — Hausverwaltungs-App (gleicher Stack, Pattern-Quelle)
- `sm-display` — Digital Signage (gleicher Stack, Pattern-Quelle)

## Lizenz

MIT — siehe [LICENSE](LICENSE)
