# Avluo · Architektur

Vollständige Architektur-Doku: [architecture.html](architecture.html) im Browser öffnen.

## Multi-Tenant-Strategie

Avluo hostet mehrere Kooperatif-Siedlungen auf einer Plattform. Jede Siedlung ist ein **Tenant**, der strikt isoliert ist.

### Drei Verteidigungslinien

```
┌─────────────────────────────────────────────────────────────┐
│ 1. HTTP-Layer (TenantMiddleware)                            │
│    - Subdomain → tenant_id                                   │
│    - JWT-Validierung: tenant_id-Claim MUSS matchen          │
│    - Cross-Tenant-Versuche werden auditiert                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Service-Layer (PrismaService.withTenant)                 │
│    - AsyncLocalStorage für tenant_id-Kontext                 │
│    - SET LOCAL app.tenant_id in Transaction                 │
│    - Service-Bugs können Tenant-Context nicht umgehen       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. DB-Layer (PostgreSQL RLS)                                │
│    - Row-Level-Security Policies auf 14 Tabellen            │
│    - USING (tenant_id = get_current_tenant())               │
│    - Selbst ohne WHERE-Klausel: 0 Rows zurück               │
└─────────────────────────────────────────────────────────────┘
```

## Verwandte Dokumente

- [Phase-1-Backlog](phase-1-backlog.md) — 10-Wochen-Plan
- [Monorepo-Setup](monorepo-setup.md) — Repo-Struktur, pnpm-Workspaces, Docker
- [DB-Schema](../apps/api/prisma/schema.prisma) — Prisma-Schema
- [RLS-Policies](../apps/api/prisma/rls-policies.sql) — PostgreSQL RLS
