# Fieldlens

A camera that reads. Point it at a product, a label, a wall, a contract or a broken thing; it says what it is looking at and what to do about it.

Five modes, one shutter:

| | Mode | What it does |
|---|---|---|
| I | **Shop** | Buy / wait / walk away verdict on a product and its price |
| II | **Label** | Decodes ingredient lists; flags EU-restricted and allergy-relevant items |
| III | **Home** | Move-in / move-out damage evidence and how to document it |
| IV | **Paper** | Contracts, fine print, signs and fines in plain language |
| V | **Repair** | Diagnoses a fault and judges whether it is worth fixing |

Stack: Expo SDK 58 / React Native (iOS + Android) · Expo Router · Cloudflare Worker backend calling the Claude vision model with a strict tool schema. Photos are analysed and not stored server-side; readings live only on the phone.

Working title. Rename by changing `name`, `slug`, `scheme`, `bundleIdentifier` and `package` in `app.json`, and `name` in `backend/worker/wrangler.toml`.

## Layout

```
app/                 Expo Router screens
  index.tsx          Camera + mode rail + shutter
  reading/[id].tsx   Result sheet
  history.tsx        Past readings
  settings.tsx       Haptics, history, server address
  modes.tsx          Mode descriptions (long-press the rail)
src/
  theme.ts           Paper/ink palette, fonts, type scale
  modes.ts           Mode copy (names, hints, disclaimers)
  lib/               api, image prep, history, settings, config
  ui/                Text, Rule, Button, ModeRail, Viewfinder
shared/schema.ts     Request/response contract shared with the backend
backend/worker/      Cloudflare Worker (prompts.ts holds the per-mode system prompts)
.github/workflows/   build.yml (iOS → TestFlight, Android APK/AAB), deploy-worker.yml
```

## 1. Deploy the backend

```bash
cd backend/worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY     # from console.anthropic.com
npx wrangler deploy
```

Note the printed URL (`https://fieldlens-api.<account>.workers.dev`) and paste it into `app.json → extra.apiBaseUrl`. You can also set it at runtime in the app under Settings → Server.

Optional hardening:

- `npx wrangler secret put APP_TOKEN` with a random string, and put the same string in `app.json → extra.appToken`. Requests without it are rejected.
- Rate limiting: `npx wrangler kv namespace create RATE_KV`, paste the id into `wrangler.toml`, uncomment the block. Default is 40 readings per device per hour.
- Model: `MODEL` var in `wrangler.toml`. `claude-sonnet-5-5` is the default; `claude-haiku-5-5` is cheaper and faster for a free tier.

Or let GitHub deploy it: add repo secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ANTHROPIC_API_KEY` (and optionally `FIELDLENS_APP_TOKEN`) and push to `main`.

## 2. Build the app

Local dev (needs Android Studio / Xcode, or a development build):

```bash
npm install
npx expo run:android   # or run:ios
```

CI builds run on every push to `main` via `.github/workflows/build.yml`.

### Android secrets (optional until you publish)

Without them the workflow produces debug-signed APK/AAB as run artifacts.

```
ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
```

### iOS secrets

```
APPLE_TEAM_ID
APPLE_CERTIFICATE_BASE64      Apple Distribution .p12, base64
P12_PASSWORD
APPLE_PROVISION_PROFILE_BASE64  App Store profile for eu.fieldlens.app named "FieldlensAppStore"
                                (or commit it at ios-signing/FieldlensAppStore.mobileprovision)
APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_PRIVATE_KEY
```

Create the App ID `eu.fieldlens.app` and an App Store Connect record before the first upload.

## Design notes

Paper and ink, not glass and gradients. Fraunces for display, IBM Plex Sans for body, IBM Plex Mono for labels. Hairline rules structure everything; a single vermilion marker carries the active mode and the shutter. Verdict tone (good / caution / bad / neutral) is colour-coded but never decorated. No icons: the interface is typographic, with corner brackets as the only drawn element. Dark mode is a true ink-black counterpart, not an inversion.

## Monetisation hooks (not yet wired)

The natural model is a free tier (e.g. 5 readings/day) and a subscription. `RATE_KV` already counts per device; gate on it and add `react-native-purchases` (RevenueCat) for the paywall. Keep the Worker as the single enforcement point so the app can be trusted less.
