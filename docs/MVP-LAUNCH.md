# MVP Soft-Launch Checklist (Yeşiltepe)

## Lokal Setup

```bash
bash scripts/setup-soft-launch.sh
pnpm --filter @avluo/api dev
pnpm --filter @avluo/pwa dev
bash scripts/smoke-mvp.sh
```

- [x] Prisma-Init-Migration (`apps/api/prisma/migrations/20240908000000_init`)
- [x] Health `/health/live` + `/health/ready`
- [x] Smoke-Script `scripts/smoke-mvp.sh`
- [x] Setup-Script `scripts/setup-soft-launch.sh`
- [x] E2E API + Playwright PWA — siehe [E2E.md](./E2E.md)

## Smoke-Flows (manuell UI)

1. Login SMS-OTP (`+905551234567`, Code aus API-Log/Response)
2. Passkey enrollen (Browser mit Platform-Authenticator)
3. Post erstellen, liken, kommentieren
4. Mitglied suchen → DM starten
5. Event anlegen → RSVP
6. SOS senden → Ack SAFE / NEED_HELP
7. Admin `/yonetim`: Rolle ändern, Invite anlegen, SOS-Acks sehen
8. RLS-Spotcheck: Token von Tenant A gegen Tenant B → 403

## Prod (GitLab → Hetzner)

Siehe [DEPLOY.md](./DEPLOY.md).

- [ ] Cluster: Traefik + cert-manager + `letsencrypt-prod`
- [ ] `infra/scripts/setup-prod-once.sh` (Postgres + Redis + Registry-Secret)
- [ ] DNS `app.avluo.app` / `api.avluo.app`
- [ ] GitLab CI Variables gesetzt
- [ ] `deploy:prod:api` + `deploy:prod:pwa` grün
- [ ] Seed + Smoke gegen `https://api.avluo.app`

## Soft-Launch Betrieb

- Kleine Pilot-Gruppe (Vertrauenspersonen) freischalten
- Feedback-Kanal (WhatsApp/Telegram der Siedlung)
- On-Call: API-Logs; optional Sentry
