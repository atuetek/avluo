# Avluo Roadmap

## MVP (aktuell umgesetzt)

Mitglieder-App + Yönetim für Pilot Yeşiltepe:

- Posts, Comments, Likes, Timeline-Polling
- 1:1 Direktnachrichten inkl. Read-Receipts
- Veranstaltungen + RSVP
- Mitgliederprofile + Suche
- SOS inkl. Notfall-Bestätigung (SAFE / NEED_HELP)
- In-App-Notifications
- Passkeys (WebAuthn) + Biometrie-Prompt (Platform Authenticator / Native Confirm)
- Admin: Members/Rollen, Invites, Audit, SOS-Ack-Dashboard, Post-Moderation API

Siehe auch [FEATURES.md](../FEATURES.md).

---

## MVP2 (~6–8 Wochen nach MVP)

Ziel: Siedlungs-Alltag vertiefen und Multi-Tenant vorbereiten.

| Block | Inhalt |
|---|---|
| Kommunikation | Gruppenchat, Broadcast (Admin-only), Mute, optional Typing |
| Engagement | Polls + Auswertung, Event-Erinnerungen, iCal-Export |
| Reach | Web-Push produktionstauglich, FCM für Native, SMS-Notfall-Fallback (Netgsm) |
| Onboarding | Excel-Mitgliederimport, Invite-QR, Onboarding-Flow |
| Admin | Aidat-Tabelle (ohne Payment), erweiterte Moderation, Notification-Settings |
| Platform | Zweiter Tenant / Self-Serve-Onboarding-Start, Platform-Ops-Basics |
| Tech | WebSocket oder SSE für Timeline/DMs statt reinem Polling |

### MVP2 Deliverables

1. Gruppen- und Broadcast-Chats nutzbar
2. Umfragen mit Live-Auswertung in der PWA
3. Push auf Browser + Native für SOS und DMs
4. Excel-Import + QR-Invites für Pilot-Onboarding
5. Zweiter Tenant erfolgreich onboarded

---

## MVP3 (Ausblick)

- Aidat-Payments
- Siedlungs-Maps
- Auto-Translation von Posts
- WhatsApp-Bot
- Analytics-Dashboard
- Guard-Rolle live
