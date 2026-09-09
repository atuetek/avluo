# E2E-Tests

Vollständige End-to-End-Abdeckung für Avluo MVP.

## API (Jest + Supertest)

In-Memory-Prisma-Harness, kein Docker/Postgres nötig.

```bash
pnpm test:e2e:api
# oder
pnpm --filter @avluo/api test:e2e
```

Abgedeckt:

- Health (`/health`, live, ready, db)
- Auth (send/verify OTP)
- Members + Cross-Tenant-Isolation
- Posts (CRUD soft-delete, likes, comments, admin pin)
- Messages (DM start, send, read)
- Events (create, RSVP, cancel)
- Emergency SOS + Acks + resolve
- Notifications
- Admin (members, invites, audit, moderate)
- Media (Auth-/Validierung)
- MVP-Journey (durchgängiger Happy Path)

## PWA (Playwright)

Angular UI mit gemockter API (`page.route`).

```bash
# einmalig Browser
pnpm --filter @avluo/pwa exec playwright install chromium

pnpm test:e2e:pwa
# oder alles:
pnpm test:e2e
```

Abgedeckt:

- Login OTP + Redirect
- Timeline (Post, Like, Kommentar)
- Members → DM
- Events + RSVP
- SOS + Ack
- Notifications
- Admin (Invite, Audit)
- Nav-Journey aller Kernseiten

## CI

GitLab Job `test:e2e` (API) und `test:e2e:pwa` laufen parallel zur Unit-Stage.
