# Native App (iOS & Android)

Avluo läuft als **Capacitor-App** (`com.avluo.yesiltepe`): dieselbe Angular-UI in einer nativen Hülle für App Store / Play Store.

## Voraussetzungen

- Node ≥ 20, pnpm
- API lokal: `pnpm db:up` + `pnpm --filter @avluo/api dev` (Port 3000)
- **iOS:** macOS, Xcode, CocoaPods
- **Android:** Android Studio, SDK, Emulator oder Gerät

## Schnellstart

```bash
# aus Repo-Root
pnpm --filter @avluo/api dev          # Terminal 1

# Terminal 2 — iOS Simulator
pnpm native:ios

# oder Android Emulator
pnpm native:android
```

Nur Sync (nach Code-Änderungen):

```bash
pnpm native:sync
# danach in Xcode / Android Studio erneut Run
```

PWA-Scripts (`apps/pwa`):

| Script | Zweck |
|---|---|
| `pnpm native:ios` | Dev-Build + `cap sync ios` + Xcode öffnen |
| `pnpm native:android` | Dev-Build + `cap sync android` + Android Studio öffnen |
| `pnpm native:sync` | Dev-Build + `cap sync` (beide Plattformen) |
| `pnpm cap:open:ios` / `cap:open:android` | Nur IDE öffnen |

## API-URL (wichtig)

| Umgebung | URL |
|---|---|
| Browser (`ng serve`) | `http://localhost:3000` |
| iOS Simulator | `http://127.0.0.1:3000` |
| Android Emulator | `http://10.0.2.2:3000` |
| Produktion | `https://api.avluo.app` |

**Physisches Gerät:** API muss über LAN erreichbar sein. In der WebView-Console oder einmalig:

```js
localStorage.setItem('avluo_api_url', 'http://192.168.x.x:3000')
```

(IP deines Macs im WLAN; Firewall/CORS: API erlaubt Dev-Origins.)

Cleartext HTTP ist für Dev freigeschaltet (Android `usesCleartextTraffic`, iOS `NSAllowsLocalNetworking`).

## Was schon verdrahtet ist

- Splash / StatusBar / Keyboard / App-Back-Button
- Biometrie vor Passkey-Login (`@aparajita/capacitor-biometric-auth` + Face ID Usage String)
- Haptics beim SOS-Senden
- `cap sync` kopiert `dist/pwa/browser` nach `ios/` und `android/`

## Store / nächste Schritte (später)

1. Icons & Splash finalisieren
2. Signing: Apple Developer Team + Play Console Keystore
3. Production-Build: `pnpm --filter @avluo/pwa build` + `cap sync`
4. Push (FCM) für SOS/DMs — geplant in MVP2
5. TestFlight / Internal Testing Track

## Troubleshooting

- **Weiße App / alte UI:** erneut `pnpm native:sync`, in Xcode/AS Clean Build
- **API unreachable auf Android:** Emulator nutzt `10.0.2.2`, nicht `localhost`
- **Pods fehlgeschlagen:** `cd apps/pwa/ios/App && pod install`
- **Face ID Dialog fehlt:** `NSFaceIDUsageDescription` in `Info.plist` (bereits gesetzt)
