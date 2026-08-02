# Avluo · Phase 1 Backlog (Szenario A)

PWA mit 1 Pilot-Siedlung, alle Core-Features. Ziel: **8-10 Wochen** bis Live.

**Stack:** Angular 19 PWA + NestJS Monolith + PostgreSQL 16 + RLS
**Hosting:** Hetzner Cloud, eine VM für App+DB (Phase 1)
**Pilot-Siedlung:** Eine ausgewählte Kooperatif (z.B. eine in Didim, Bodrum oder Antalya)

---

## Woche 1 · Fundament

| Tag | Task | Stunden |
|---|---|---|
| Mo | Monorepo-Setup (`pnpm workspaces` oder Nx), 1:1 von sm-display-Pattern | 6 |
| Di | Docker-Compose: Postgres + MinIO + Redis lokal, CI-Pipeline (GitHub Actions) | 8 |
| Mi | Prisma-Schema deployen, RLS-Policies ausführen, Tenant-Slug + Seed anlegen | 6 |
| Do | NestJS-Skeleton: `withTenant()` Helper, Tenant-Middleware, Subdomain-Resolution (dev: x-dev-tenant Header) | 8 |
| Fr | Auth-Modul: SMS-OTP via Netgsm, JWT-Token mit tenant_id-Claim, E2E-Test mit curl | 6 |
| **Wochenende** | 1 Pilot-Siedlung vor Ort besuchen, Bedürfnisse validieren, Migrations-Plan für Excel-Mitgliedsliste |  |

**Deliverable Woche 1:** Login funktioniert, JWT enthält tenant_id, erste Tenant-Isolation getestet.

---

## Woche 2 · Posts + Timeline

| Tag | Task | Stunden |
|---|---|---|
| Mo | Post-CRUD: erstellen, lesen, soft-delete, hidden-Flag | 6 |
| Di | Comments (1-Level, Phase 1) + Likes | 6 |
| Mi | Timeline-Polling-Endpoint (`GET /api/posts?since=timestamp`) | 8 |
| Do | i18n: Angular-Lokalisierung tr-TR/en-US/de-DE, UI-Strings extrahiert | 6 |
| Fr | PWA-Setup: Service Worker, manifest.json, App-Icon (das Symbol aus 01-circle.html) | 4 |
| **Wochenende** | E2E-Test: 3 Test-User erstellen, Posts schreiben, Likes/Comments, Polling alle 10s |  |

**Deliverable Woche 2:** Funktionierende Timeline mit Posts, Comments, Likes. Trilingual UI. PWA installierbar.

---

## Woche 3 · Media + Profile

| Tag | Task | Stunden |
|---|---|---|
| Mo | MinIO-Buckets pro Tenant, Upload-Endpoint, EXIF-Strip, Virus-Scan (ClamAV) | 8 |
| Di | Media-Service: Bilder komprimieren (sharp), max 5MB, 4 Formate (jpg, png, webp, heic) | 6 |
| Mi | Member-Profile: Avatar, Anzeigename, Hausnummer, Block, Rolle (nur Admin editierbar) | 6 |
| Do | Profil-Anpassung: Sprache wechseln, Notification-Settings | 4 |
| Fr | Search-light: Member-Suche nach Name/Hausnummer (SQL LIKE, kein MeiliSearch in Phase 1) | 4 |

**Deliverable Woche 3:** User können Bilder in Posts packen, Profil pflegen, Mitglieder suchen.

---

## Woche 4 · DMs (1:1 + Gruppe)

| Tag | Task | Stunden |
|---|---|---|
| Mo | Conversation + Message Tabellen, 1:1-Conversation auto-create bei erstem Kontakt | 8 |
| Di | Message-CRUD, Polling-Endpoint für neue Messages (5s-Intervall in DM-View) | 6 |
| Mi | Gruppen-Chat: Conversation-Type=GROUP, Member-Add/Remove | 6 |
| Do | Read-Receipts: `lastReadAt` in MemberConversation, ungelesen-Badge | 4 |
| Fr | Push-Vorbereitung: Web-Push-Subscription speichern, VAPID-Keys generieren | 4 |

**Deliverable Woche 4:** Vollständiges DM-System, inkl. 1:1 + Gruppen + Read-Receipts.

---

## Woche 5 · Veranstaltungen + Umfragen

| Tag | Task | Stunden |
|---|---|---|
| Mo | Event-CRUD: Erstellen, Liste, Detail, RSVP-Status | 6 |
| Di | iCal-Export für Events (eigener kleiner Service) | 4 |
| Mi | Poll-CRUD: Frage, Optionen, Multiple-Choice, Single-Vote, Anonym-Modus | 8 |
| Do | Poll-Auswertung mit Charts (Chart.js im Frontend) | 6 |
| Fr | Notification-System: In-App-Notifications (neue Events, neue Polls, RSVP-Erinnerungen) | 6 |

**Deliverable Woche 5:** Veranstaltungen mit RSVP, Umfragen mit Live-Auswertung, In-App-Notifications.

---

## Woche 6 · Notfall-System

| Tag | Task | Stunden |
|---|---|---|
| Mo | EmergencyAlert-Modell + API, Push-Broadcast via FCM (Firebase) | 8 |
| Di | SMS-Fallback: Twilio + Netgsm parallel, Template in TR/EN/DE | 6 |
| Mi | Notfall-Button im Frontend, große Touch-Targets, Bestätigungs-Dialog | 4 |
| Do | Acknowledgement-Tracking, "Wer ist sicher" / "Wer braucht Hilfe" | 6 |
| Fr | **Load-Test**: 2000 simulierte Members erhalten Notfall-Push + SMS in <30s | 8 |

**Deliverable Woche 6:** Notfall-System produktionsreif, Last-getestet mit 2000 Usern.

---

## Woche 7 · Migration Pilot-Siedlung

| Tag | Task | Stunden |
|---|---|---|
| Mo | Excel-Importer für Member-Liste (Hausnummer, Name, Telefon, E-Mail) | 8 |
| Di | Invite-Codes generieren und als QR-Codes drucken (für Aushang im Schaukasten) | 6 |
| Mi | Onboarding-Flow: User lädt App, scannt QR oder tippt Code, verifiziert per SMS | 6 |
| Do | Schulungsmaterial: 1-Seiten-Anleitung (TR), Video-Tutorial, Hotline-Nummer | 4 |
| Fr | **Soft-Launch**: 50 Vertrauens-Personen aus Pilot-Siedlung befragen | 4 |

**Deliverable Woche 7:** Pilot-Siedlung importiert, Onboarding-Material steht.

---

## Woche 8 · Admin + Yönetim-Panel

| Tag | Task | Stunden |
|---|---|---|
| Mo | Yönetim-Login (separate Route `/yönetim`), Member-Liste, Rollen-Verwaltung | 8 |
| Di | Beiträge verwalten (Aidat-Tracking, nur als Tabelle, kein Payment in Phase 1) | 6 |
| Mi | Audit-Log UI: Wer hat was gemacht, Filter nach Aktion/Datum/Member | 4 |
| Do | Emergency-Ack-Dashboard für Vorstände | 4 |
| Fr | DSGVO: Daten-Export, Account-Löschung, Cookie-Banner (TR/EN/DE) | 6 |

**Deliverable Woche 8:** Vorstände können ihre Siedlung eigenständig verwalten.

---

## Woche 9 · QA + Performance

| Tag | Task | Stunden |
|---|---|---|
| Mo | E2E-Tests: Cypress für Top-20-Userflows | 8 |
| Di | Performance: Timeline-Query < 200ms bei 2000 Members, Posts-Pagination | 6 |
| Mi | Accessibility: WCAG AA, Screen-Reader-Tests (NVDA + VoiceOver) | 4 |
| Do | **Pilot-Siedlung Goes Live**: 2000 Members bekommen Zugang | 4 |
| Fr | On-Call-Setup: Sentry, Uptime-Monitoring, WhatsApp-Support-Gruppe | 4 |

---

## Woche 10 · Stabilisierung + Übergabe

| Tag | Task | Stunden |
|---|---|---|
| Mo | Bug-Bash: 1 Tag intensiv Testen, Issues sammeln | 8 |
| Di-Di | Bugfixes priorisieren, Top-10 fixen | 24 |
| Mi | Performance-Monitoring, Lighthouse-Score > 90 | 4 |
| Do | Dokumentation: Admin-Handbuch, API-Docs, Architektur-Entscheidungen | 4 |
| Fr | **Phase 1 abgeschlossen**, Übergabe an dich für laufenden Betrieb | 4 |

---

## Was Phase 1 NICHT enthält

- Native iOS/Android-App (kommt in Phase 3)
- WhatsApp-Bot (Phase 2)
- WebSocket Live-Timeline (Phase 3)
- Multi-Tenant-Onboarding (Phase 2 – Phase 1 = 1 Pilot)
- Zahlungen (Phase 3)
- Maps/Siedlungs-Plan (Phase 3)
- Mehrsprachige Posts (Auto-Translation, Phase 3)

## Was du für Phase 1 brauchst

**Vor Projektstart:**
- Pilot-Siedlung gefunden, **Vertrag/Mitwirkungszusage** unterzeichnet
- Mitgliederliste als Excel (Name, Telefon, E-Mail, Hausnummer)
- 1 türkisch-sprachiger Ansprechpartner aus der Siedlung (für Übersetzungen + Feedback)
- Budget für SMS-Versand (~200 €/Monat bei 2000 Members, anfangs weniger)
- Budget für Hetzner-VM (~30-50 €/Monat)

**Während Phase 1:**
- Wöchentliche Reviews (1h, gemeinsam durchgewaschene Screens)
- Bug-Triage (30 min/Woche, priorisieren)
- Übersetzungs-Hilfe bei unklaren TR-Strings
- Pilot-Mitglieder-Onboarding beobachten

**Nach Phase 1 (laufender Betrieb):**
- 2-4h/Woche für Support-Anfragen
- monatliche Auswertung: Posts/Tag, aktive Members, Notfall-Übungen

## Nächste konkrete Schritte (heute/Morgen)

1. **Pilot-Siedlung klären** – wer ist die erste Kooperatif? Hast du Kontakt?
2. **Domains kaufen** – `avluo.com`, `avluo.de`, `avluo.com.tr` (~40 €)
3. **GitHub-Repo anlegen** – `atuetek/avluo` oder ähnlich
4. **Woche 1 Tag 1 starten** – Monorepo-Setup (Nx, pnpm, Docker-Compose)

Sag **„Pilot gefunden, leg los"** wenn du starten willst, oder frag was zu klären ist.
