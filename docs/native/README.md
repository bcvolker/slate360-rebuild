# Slate360 native apps (Capacitor → TestFlight / Play)

Slate360 is a Next.js PWA served from `https://www.slate360.ai`. To distribute on
the App Store and Google Play — and to unlock native-only capabilities (camera,
and **ARKit/LiDAR depth capture** that the web layer can't reach) — we wrap the
app with **Capacitor** and build/sign/ship via **Codemagic** (cloud CI with Mac
runners, so no Mac is required locally).

## How it works

- The native shell is a thin WebView that loads the hosted Next.js app
  (`server.url` in `capacitor.config.json`). We keep our SSR/API routes on
  Vercel — Capacitor does **not** bundle the web app.
- Native plugins (camera, filesystem, and a future custom LiDAR/ARKit plugin)
  run in the shell and are callable from the web app via the Capacitor bridge.
- App store builds contain **only Slate360 (Site Walk + Twin 360)**. Thermal
  Studio and the future Design Studio must not appear in these builds.

> Trade-off: a `server.url` "hosted hybrid" app is fast to ship and always
> in sync with production, but reviewers expect genuine native value. Our native
> capture (camera + LiDAR) provides that. If Apple ever pushes back, the fallback
> is bundling a static-exported subset — larger effort.

## One-time local setup (run once, then commit `ios/` and `android/`)

```bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# 2. Add the native platforms (reads capacitor.config.json)
npx cap add ios
npx cap add android

# 3. Sync (copies config + plugins into the native projects)
npx cap sync

# 4. Commit the generated ios/ and android/ folders.
```

> Capacitor 8 uses **Swift Package Manager** for iOS — there is no `Podfile` or
> `.xcworkspace`, and CI builds `ios/App/App.xcodeproj` directly (no
> `pod install`).

`capacitor.config.json` is already in the repo (appId `ai.slate360.app`, name
`Slate360`, `server.url` → production). For plugin development against a local
dev server, temporarily set `server.url` to your machine's LAN URL + run
`npm run dev`.

## Codemagic setup

`codemagic.yaml` defines two workflows: `ios-capacitor` (→ TestFlight) and
`android-capacitor` (→ Play internal). Before the first run, create these
environment variable **groups** in the Codemagic UI:

**iOS**
- `app_store_connect`: `APP_STORE_CONNECT_PRIVATE_KEY`, `APP_STORE_CONNECT_KEY_IDENTIFIER`,
  `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_APP_ID` (from App Store Connect API key)
- `ios_signing`: `CERTIFICATE_PRIVATE_KEY`

**Android**
- `google_play`: `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` (Play service-account JSON)
- `android_signing`: `CM_KEYSTORE` (base64 of your `.jks`), `CM_KEYSTORE_PASSWORD`,
  `CM_KEY_ALIAS`, `CM_KEY_PASSWORD`

Connect this repo in Codemagic, pick a workflow, and run. iOS publishes to
TestFlight; Android uploads a draft to the Play internal track.

## LiDAR / ARKit depth (native, later)

Phone LiDAR depth capture is **not** possible from the web layer. Once the
native shells exist, add a small custom Capacitor plugin that exposes ARKit
depth (`ARFrame.sceneDepth`) on supported iPhones/iPads, writes the depth pass
alongside the video/photo capture, and uploads it as a `lidar_depth` asset —
which the pipeline already classifies, prices, and routes to the
`03_Digital_Twin/LiDAR` SlateDrop folder. The existing on-screen LiDAR HUD chip
stays; everything else about LiDAR runs silently in the background.
