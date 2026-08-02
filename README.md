# Avluo

> **Multi-Tenant Social-Media-App für türkische Wohnsiedlungen (Kooperatif)**
> Streng isoliert pro Siedlung, trilingual (TR/EN/DE), mit Notfall-System.

**Logo:** Offener Kreis mit Punkt in Korall-Rot (`#ff5a3c`)

**Pilot-Kunde:** Yeşiltepe Sitesi Kooperatifi

**Repo:** https://github.com/atuetek/avluo

---

## Was ist Avluo?

Avluo ist eine **Social-Media-App für Wohnsiedlungen (Kooperatif)**. Jede Siedlung ist ein isolierter Tenant mit eigener Timeline, Direktnachrichten, Veranstaltungen, Umfragen und Notfall-System. Mitglieder sehen nur ihre eigene Siedlung, nicht andere.

**Multi-Tenant-Isolation** ist nicht nur App-Code – sie ist 3-fach abgesichert:

1. **HTTP-Layer** — `TenantMiddleware` validiert Subdomain + JWT-tenant_id-Claim
2. **Service-Layer** — `PrismaService.withTenant()` setzt `SET LOCAL app.tenant_id` in einer Transaction
3. **DB-Layer** — PostgreSQL Row-Level-Security Policies blockieren Cross-Tenant-Queries selbst bei Bugs im App-Code

Mehr Architektur-Details: [`docs/architecture.md`](docs/architecture.md) (öffne [`docs/architecture.html`](docs/architecture.html) im Browser für Diagramm)

---

## Stack

- **Frontend:** Angular 19 PWA
- **Backend:** NestJS 10 (Multi-Tenant-fähig)
- **DB:** PostgreSQL 16 mit Row-Level-Security
- **Storage:** MinIO (S3-kompatibel, self-hosted)
- **Cache/Queue:** Redis 7
- **Monorepo:** pnpm workspaces
- **i18n:** TR (tr-TR), EN (en-US), DE (de-DE)
- **Auth:** SMS-OTP via Netgsm (TR-Lokaltarif)
- **Push:** Web-Push (VAPID), später Firebase für Mobile

---

## Quickstart (5–10 Minuten)

### Voraussetzungen

- **Node.js ≥ 20** (mit `corepack` für pnpm)
- **Docker + Docker Compose** (für Postgres, MinIO, Redis)
- **Git**

### Setup

```bash
# 1. Repo klonen
git clone https://github.com/atuetek/avluo.git
cd avluo

# 2. pnpm via corepack aktivieren (einmalig pro Maschine)
corepack enable pnpm

# 3. Dependencies installieren (~30s, installiert pnpm-Workspace)
pnpm install

# 4. Environment-Files anlegen
#    WICHTIG: Apps brauchen eigene .env, weil Prisma dort sucht
cp .env.example apps/api/.env
# Optional für Root-Tools: cp .env.example .env

# 5. Datenbank-Stack starten (Postgres + MinIO + Redis)
pnpm db:up

# 6. Prisma-Client generieren
cd apps/api && pnpm prisma generate && cd ../..

# 7. Schema-Migrationen ausführen
cd apps/api && pnpm prisma migrate dev --name init && cd ../..

# 8. RLS-Policies deployen (Tenant-Isolation aktivieren)
cd apps/api && pnpm prisma db execute --file prisma/rls-policies.sql && cd ../..

# 9. Pilot-Tenant seeden (Yeşiltepe Demo-Daten)
cd apps/api && pnpm prisma db seed && cd ../..

# 10. Dev-Server starten
pnpm dev
```

### Was du jetzt hast

| Service | URL | Zweck |
|---|---|---|
| API | http://localhost:3000 | NestJS Backend |
| API Health | http://localhost:3000/health | DB-Status checken |
| PWA | http://demo.localhost:4200 | Angular PWA |
| MinIO Console | http://localhost:9001 | Object-Storage UI (dev/devpass) |
| Postgres | localhost:5432 | DB (avluo/devpass) |
| Redis | localhost:6379 | Cache/Queue |

### Subdomain-Testing lokal

Die PWA erwartet eine Subdomain (z.B. `yesiltepe.localhost:4200`). Drei Optionen:

**Option 1 — `x-dev-tenant` Header** (schnellste)
```bash
# In DevTools-Console oder mit curl:
fetch('http://localhost:3000/api/posts', {
  headers: { 'x-dev-tenant': 'yesiltepe' }
})
```

**Option 2 — `/etc/hosts` editieren** (echte Subdomain-Simulation)
```bash
# macOS/Linux: zu /etc/hosts hinzufügen
echo "127.0.0.1 yesiltepe.localhost" | sudo tee -a /etc/hosts
# Dann: http://yesiltepe.localhost:4200
```

**Option 3 — Chrome-Flag** (für Demo)
```bash
google-chrome --unsafely-treat-insecure-origin-as-secure=http://yesiltepe.localhost:4200
```

---

## Pilot-Kunde: Yeşiltepe

**Yeşiltepe Sitesi** ist die erste Siedlung, die Avluo testet. Im Seed-SQL ist sie bereits angelegt:

| Property | Wert |
|---|---|
| Slug | `yesiltepe` |
| Tenant-ID | `00000000-0000-0000-0000-000000000001` |
| Subdomain | `yesiltepe.localhost:4200` (dev) / `yesiltepe.avluo.app` (prod) |
| Standard-Sprache | tr-TR |
| Plan | STANDARD (bis 1000 Member) |
| Pilot-Admin | `admin@avluo.dev` / `+905551234567` |

**Demo-Login** (Phase 1, dev):
- Telefon: `+905551234567`
- OTP-Code: erscheint in der API-Console (Mock-SMS in Dev-Mode)

---

## Repo-Struktur

```
avluo/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts         # Bootstrap
│   │   │   ├── app.module.ts   # Module-Übersicht
│   │   │   ├── common/
│   │   │   │   ├── prisma/     # PrismaService mit withTenant()
│   │   │   │   ├── tenant/     # TenantMiddleware
│   │   │   │   └── audit/      # Audit-Log
│   │   │   └── modules/        # Feature-Module (Stubs)
│   │   └── prisma/
│   │       ├── schema.prisma   # 19 Modelle
│   │       └── rls-policies.sql
│   └── pwa/                    # Angular 19 PWA
│       ├── src/
│       │   └── app/
│       │       ├── core/       # Auth, Tenant-Context
│       │       └── features/   # timeline, messages, events, polls, emergency
│       └── public/             # manifest, icons
├── packages/
│   └── shared-types/           # Geteilte TS-Types
├── docker/
│   ├── docker-compose.yml      # Postgres + MinIO + Redis
│   └── postgres/init/          # Extensions + Seed
├── docs/                       # Architektur, Backlog, Setup
├── .github/workflows/ci.yml    # GitHub Actions
└── scripts/                    # Helper-Scripts
```

---

## Häufige Stolpersteine

### ❌ `Error: Environment variable not found: DATABASE_URL`

Prisma sucht `.env` im **Schema-Verzeichnis**, nicht im Repo-Root. Lösung:
```bash
cp .env.example apps/api/.env
```

### ❌ `prisma:warn We could not find your Prisma schema in the default locations`

Lauf in `apps/api/`:
```bash
cd apps/api && pnpm prisma generate
```

### ❌ Port 3000 / 4200 / 5432 bereits belegt

```bash
lsof -i :3000  # Was läuft da?
# Alternativ: in docker-compose.yml und angular.json andere Ports setzen
```

### ❌ RLS-Policies blockieren alle Queries (auch vom Platform-Admin)

Das ist **by design**. Platform-weite Operationen müssen explizit `withPlatform()` aufrufen:
```typescript
// Geht nicht (RLS blockt):
await prisma.tenant.findMany()

// Geht:
await prisma.withPlatform(async (tx) => {
  return tx.tenant.findMany()
})
```

### ❌ Cross-Tenant-Token wird abgelehnt

Wenn du mit Token von Tenant A auf Tenant B zugreifst, loggt die Middleware einen Audit-Eintrag und wirft 403. Das ist **korrektes Verhalten**.

---

## Development-Workflow

### Branches

- `main` — Production-ready Code
- `develop` — Integration-Branch
- `feature/<name>` — Neue Features
- `fix/<name>` — Bugfixes

### Commit-Konventionen

```
feat: Neues Feature
fix: Bugfix
docs: Nur Doku
refactor: Code-Umstrukturierung
test: Tests
chore: Build/CI/Tooling
```

### Pre-Commit

```bash
# Vor jedem Commit:
pnpm -r run build   # Läuft durch alle Apps
cd apps/api && pnpm prisma validate  # Schema muss valid sein
```

### Tests (geplant ab Woche 9)

```bash
# E2E (Phase 1 Sprint 4+):
pnpm --filter @avluo/api run test:e2e

# Unit (Phase 1 Sprint 4+):
pnpm test
```

---

## Build-Status

| App | Tool | Status | Output |
|---|---|---|---|
| `apps/api` | `nest build` | ✅ passing | `apps/api/dist/` |
| `apps/pwa` | `ng build` | ✅ passing | `apps/pwa/dist/pwa/` (224 kB initial, 64 kB gzipped) |
| Prisma | `prisma validate` | ✅ valid | 19 Modelle |
| RLS | `psql ...` | ✅ scripted | siehe Quickstart Schritt 8 |
| Seed | `prisma db seed` | ✅ passing | 1 Tenant + 4 Users + 4 Members + 3 Posts + 1 Event |

---

## Phasen

- **Phase 1 (10 Wochen):** PWA + 1 Pilot-Siedlung + alle Core-Features
- **Phase 2 (6 Wochen):** Multi-Tenant-Onboarding + Yönetim-Panel + WhatsApp-Bot
- **Phase 3 (6 Wochen):** Native iOS/Android + Push + Live-Timeline

Vollständiger Plan: [`docs/phase-1-backlog.md`](docs/phase-1-backlog.md)

---

## Verwandte Projekte

- `organize4u` — Hausverwaltungs-App (gleicher Stack, Pattern-Quelle)
- `sm-display` — Digital Signage (gleicher Stack, Pattern-Quelle)

---

## Lizenz

MIT — siehe [LICENSE](LICENSE)

---

## Maintainer

**atuetek** <tuetek@softmatix.de>

Pilot: Yeşiltepe Sitesi Kooperatifi (TR)
