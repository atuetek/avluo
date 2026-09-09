# Avluo – Feature-Übersicht

**Avluo** ist eine Multi-Tenant-Social-App für türkische Wohnsiedlungen (Kooperatif). Jede Siedlung ist strikt isoliert. Die App ist trilingual (TR / EN / DE). Pilot: **Yeşiltepe Sitesi**.

**Status:** MVP-Kern laut [docs/ROADMAP.md](docs/ROADMAP.md) ist im Code umgesetzt (API + PWA). Soft-Launch-Checkliste: [docs/MVP-LAUNCH.md](docs/MVP-LAUNCH.md).

---

## Kernprodukt (Mitglieder)

| Feature | Beschreibung |
|---|---|
| Siedlungs-Timeline | Tenant-lokaler Feed mit Posts (Polling in Phase 1) |
| Posts | Erstellen, lesen, Soft-Delete, Pinning, Announcements, Sprachfeld |
| Kommentare | Ein Level in Phase 1 (Schema erlaubt optional Nested) |
| Likes | Ein Like pro Member und Post, mit Zählern |
| Direktnachrichten (1:1) | Conversations + Messages, Auto-Create beim ersten Kontakt |
| Gruppenchat | Typ `GROUP`, Titel, Mitglieder hinzufügen/entfernen |
| Broadcast-Chats | Typ `BROADCAST` – nur Admins können posten |
| Read-Receipts & Mute | `lastReadAt`, `isMuted`, ungelesen-Badges |
| Veranstaltungen | CRUD, Ort, Zeitraum, max. Teilnehmer, Abbruch |
| RSVP | Status: Going / Maybe / Not Going |
| iCal-Export | Export von Events in den Kalender |
| Umfragen | Frage, Optionen, Single/Multiple, anonym, Schließzeit, Auswertung |
| Notfall-System (SOS) | Broadcast bei Erdbeben, Feuer, medizinisch, Sicherheit, Eindringling u. a. |
| Notfall-Bestätigung | Ack-Tracking: „sicher“ / „braucht Hilfe“ |
| Mitgliederprofile | Anzeigename, Avatar, Hausnummer, Block, Sprache, Verifiziert-Status |
| Mitglieder-Suche | Suche nach Name und Block/Hausnummer |
| Medien in Posts | Bilder/Videos (MinIO), EXIF-Strip, Kompression, Virus-Scan geplant |
| In-App-Notifications | Hinweise zu Events, Polls, RSVP-Erinnerungen |
| Offline / PWA | Manifest, Icons, Service Worker, installierbar |

---

## Auth & Identität

| Feature | Beschreibung |
|---|---|
| SMS-OTP-Login | Login per Telefonnummer (Netgsm in TR, Twilio international) |
| JWT mit Tenant-Claim | Token enthält User, Tenant und Rolle; Cross-Tenant → 403 |
| Onboarding on-the-fly | Unbekannte Nummer legt User an |
| Sessions | Token-Sessions mit IP, User-Agent, Ablauf |
| OAuth (Google/Apple) | Schema vorhanden, Anbindung geplant |
| Rollen | `MEMBER`, `ADMIN`, `SUPER_ADMIN`, `GUARD` (Guard später) |
| Konto deaktivieren | Inaktive Members werden blockiert |
| Locale am User | `tr-TR` / `en-US` / `de-DE` |

---

## Multi-Tenant & Isolation

| Feature | Beschreibung |
|---|---|
| Tenant = Siedlung | Slug/Subdomain, Plan (FREE/STANDARD/PREMIUM), Status |
| Subdomain-Routing | Host → Tenant (Dev: `x-dev-tenant` oder Fallback) |
| 3-Schichten-Isolation | HTTP-Middleware → Prisma `withTenant()` → PostgreSQL RLS |
| Platform-Ops | Tenant-übergreifende Admin-Operationen |
| Ein User, viele Siedlungen | Globale User-Identität + je Tenant ein Member |
| Invites / Invite-Codes | Codes inkl. Hausnummer/Telefon/E-Mail, Ablauf, QR geplant |
| Excel-Mitgliederimport | Import von Mitgliedslisten für Onboarding |
| Tenant-Onboarding | Self-Serve / Platform-Console (Phase 2) |

---

## Admin / Yönetim

| Feature | Beschreibung |
|---|---|
| Yönetim-Panel | Route `/yönetim`: Member-Liste, Rollenverwaltung |
| Aidat-/Beitrags-Tracking | Tabelle in Phase 1, Zahlungen später |
| Audit-Log | Wer hat was gemacht; Filter nach Aktion/Datum/Member |
| Emergency-Ack-Dashboard | Übersicht der Notfall-Bestätigungen |
| Post-Moderation | Hide mit Reason, Pin, Announcement |
| DSGVO | Datenexport, Account-Löschung, Cookie-Banner (TR/EN/DE) |

---

## Mobile / PWA / Native

| Feature | Beschreibung |
|---|---|
| Installierbare PWA | Web-App-Manifest „Avluo - Yeşiltepe“ |
| Capacitor-Wrapper | App-ID `com.avluo.yesiltepe`, iOS + Android |
| Native Push | FCM / Web-Push (VAPID) |
| Biometrie | Geplant für Native-Clients |

---

## Integrationen & Infrastruktur

| Feature | Beschreibung |
|---|---|
| MinIO (S3) | Object Storage, Buckets pro Tenant |
| Redis | Cache / Queue |
| Web-Push (VAPID) | Browser-Push |
| Firebase / FCM | Notfall- und Mobile-Push |
| Netgsm + Twilio | SMS (TR + international), auch Notfall |
| Brevo (E-Mail) | Mehrsprachige E-Mail-Templates |
| WhatsApp-Bot | Onboarding + Posts (Phase 2) |
| Telegram | Push-Alternative (Phase 3) |
| Health-Checks | `/health`, `/health/db` |
| CI | GitHub Actions |
| Hosting | Hetzner, DSGVO; Monitoring (Sentry) geplant |

---

## i18n & UX

| Feature | Beschreibung |
|---|---|
| Trilinguale UI | Türkisch, Englisch, Deutsch |
| Content-Sprache | Sprachfeld an Posts, Comments, Messages, Events, Polls |
| Auto-Translation | Automatische Übersetzung von Posts (Phase 3) |
| Accessibility | WCAG AA als Phase-1-Ziel |

---

## Geplante Erweiterungen (Phase 2 / 3)

- Multi-Tenant-Onboarding & Platform-Console
- WhatsApp-Bot
- Native iOS/Android + Live-Timeline (WebSocket)
- Analytics-Dashboard
- Zahlungen / Aidat
- Siedlungs-Maps
- Mehrsprachige Auto-Übersetzung von Posts

---

## Tech-Stack (Kurz)

| Bereich | Technologie |
|---|---|
| Frontend | Angular 19 PWA + Capacitor 6 |
| Backend | NestJS 10, Prisma, JWT |
| Datenbank | PostgreSQL 16 mit Row-Level-Security |
| Storage / Cache | MinIO, Redis 7 |
| Shared | `@avluo/shared-types` |
