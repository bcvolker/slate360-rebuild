# Slate360 Release Preflight

Read-only audit of repo-verifiable release facts (sections 1–5) plus an operator checklist for dashboard-only verification (section 6). Generated from codebase inspection — no live dashboard/API calls were made.

**Scope:** iOS/Android CI, env dependencies, inbound webhooks, third-party touchpoints, Apple-facing config, and manual sign-off items.

---

## 1. iOS release pipeline (repo facts)

### CI location and workflows

Single CI file: `codemagic.yaml` at repo root. Two workflows:

| Workflow | Instance | Output | Publish target |
|---|---|---|---|
| `ios-capacitor` | `mac_mini_m2`, Node 22, Xcode latest | `.ipa` → `build/ios/ipa/*.ipa` | TestFlight upload only (no external beta review submission) |
| `android-capacitor` | `linux_x2`, Node 22, Java 17 | `.aab` → `android/app/build/outputs/**/*.aab` | Google Play **internal** track, `submit_as_draft: true` |

Capacitor loads the hosted web app — CI does **not** build the Next.js app (`codemagic.yaml` lines 4–7, `docs/native/README.md`).

### Bundle ID alignment

| Source | Value |
|---|---|
| `capacitor.config.json` → `appId` | `ai.slate360.app` |
| `codemagic.yaml` → `BUNDLE_ID` / `PACKAGE_NAME` | `ai.slate360.app` |
| `ios/App/App.xcodeproj/project.pbxproj` → `PRODUCT_BUNDLE_IDENTIFIER` | `ai.slate360.app` |
| `android/app/build.gradle` → `applicationId` | `ai.slate360.app` |

All aligned.

### Signing method

**iOS (Codemagic):** App Store Connect API key + automatic profile fetch — not the checked-in Xcode automatic signing alone.

```55:69:codemagic.yaml
      - name: Set up code signing
        script: |
          echo "$APP_STORE_CONNECT_PRIVATE_KEY_B64" | base64 --decode > /tmp/asc_api_key.p8
          ...
          app-store-connect fetch-signing-files "$BUNDLE_ID" \
            --issuer-id "$APP_STORE_CONNECT_ISSUER_ID" \
            --key-id "$APP_STORE_CONNECT_KEY_IDENTIFIER" \
            --private-key @file:/tmp/asc_api_key.p8 \
            --type IOS_APP_STORE --create
          keychain add-certificates
          xcode-project use-profiles
```

- Env group `app_store_connect`: `APP_STORE_CONNECT_PRIVATE_KEY_B64`, `APP_STORE_CONNECT_KEY_IDENTIFIER`, `APP_STORE_CONNECT_ISSUER_ID`, **`APP_STORE_APP_ID`** (required for build-number step — referenced in yaml line 72 but not listed in `docs/native/README.md`'s bullet list).
- Env group `ios_signing`: `CERTIFICATE_PRIVATE_KEY`.
- Checked-in Xcode project has `CODE_SIGN_STYLE = Automatic` and `DEVELOPMENT_TEAM = G5L38UMX97` (`project.pbxproj`) — Codemagic overrides with fetched profiles at build time.

**Android (Codemagic):** Keystore decoded from base64 env vars into `android/app/keystore.jks`; groups `google_play` + `android_signing`.

**Doc vs yaml mismatch:** `docs/native/README.md` lists `APP_STORE_CONNECT_PRIVATE_KEY` (multi-line); `codemagic.yaml` expects **`APP_STORE_CONNECT_PRIVATE_KEY_B64`** (base64 single-line) to avoid paste mangling.

### TestFlight / App Store publish steps

1. `npm ci` (5-attempt retry loop)
2. `npx cap sync ios`
3. `ruby scripts/ios/add-lidar-plugin.rb` (LiDAR plugin + frameworks in Xcode target)
4. Code signing setup (above)
5. **Build number:** `app-store-connect get-latest-testflight-build-number "$APP_STORE_APP_ID"` → `agvtool new-version -all $(($LATEST + 1))` in `ios/App`
6. **Git SHA stamp:** PlistBuddy sets `SlateBuildCommit` in `ios/App/App/Info.plist` from `$CM_COMMIT` (first 7 chars)
7. `xcode-project build-ipa`
8. `app-store-connect publish --path build/ios/ipa/App.ipa` — **upload only**; deliberately omits `--testflight` external beta submission (lines 94–98)

### Build / version strategy

| Platform | Marketing version | Build number | Auto-increment |
|---|---|---|---|
| iOS (repo default) | `MARKETING_VERSION = 1.0` in `project.pbxproj` | `CURRENT_PROJECT_VERSION = 1` (overwritten by Codemagic `agvtool`) | **Yes** — latest TestFlight + 1 |
| Android (repo default) | `versionName "1.0"` in `android/app/build.gradle` | `versionCode 1` | **No** — static in repo; Codemagic yaml has no increment step |

Native HUD reads build stamp via `SlateBuildCommit` Info.plist key (`LiDARCapturePlugin.swift`, `TwinARKitCaptureViewController.swift`).

### Entitlements / capabilities (repo)

**No `.entitlements` file** anywhere under `ios/`. Grep for `UIBackgroundModes`, `aps-environment`, `Associated Domains`, `com.apple.developer` in `ios/` → **zero matches**.

Implications (facts only):
- **Background Modes** — not declared in repo; any upload/resume-in-background capability would require Xcode capability + entitlement not present here.
- **Push Notifications** — no `aps-environment` entitlement; no push capability in repo. Referenced as future need in `docs/APP_STORE_AND_OFFLINE_STRATEGY.md` and processing UX docs; **not wired in native project**.
- **Sign in with Apple** — no `ASAuthorization` / Apple Sign-In references in Swift/TS/plist.
- **Associated Domains (Universal Links)** — not in Xcode project; web side serves AASA dynamically (section 5).

### Capacitor server config

```6:9:capacitor.config.json
  "server": {
    "url": "https://www.slate360.ai",
    "cleartext": false,
```

Production WebView always loads live Vercel deploy — TestFlight builds require that URL to be up and compatible.

### LiDAR native plugin

Codemagic runs `scripts/ios/add-lidar-plugin.rb` after `cap sync` to register LiDAR capture sources and link ARKit/RealityKit/AVFoundation frameworks (`codemagic.yaml` lines 49–54).

---

## 2. Environment variable dependency map

**Method:** Grep `process.env.*` / `import.meta.env.*` across `app/`, `lib/`, `src/trigger/`, `workers/` (Python secrets referenced by name), `scripts/`, `components/`, plus `trigger.config.ts`, `next.config.ts`, `instrumentation.ts`, `sentry.*.config.ts`. Excludes `.trigger/tmp` build artifacts.

**Totals:** 130 unique variables referenced in scanned paths. **86 absent from `.env.example`** (flagged below).

**Naming drift (fact):** `.env.example` defines `WORKER_SECRET_KEY`; all callback routes use **`GPU_WORKER_SECRET_KEY`**. `.env.example` defines `NEXT_PUBLIC_BASE_URL`; runtime code predominantly uses **`NEXT_PUBLIC_APP_URL`** and **`NEXT_PUBLIC_SITE_URL`**.

### 2.1 Trigger.dev env sync (`trigger.config.ts`)

Synced to Trigger workers at deploy from `.env.local` / deploy env via `syncEnvVars(pickTriggerEnv)`:

`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `R2_BUCKET`, `R2_REGION`, `R2_ENDPOINT`, `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `MODAL_TWIN_ENDPOINT`, `MODAL_THERMAL_ENDPOINT`, `MODAL_THERMAL_INTERPRET_ENDPOINT`, `MODAL_TOUR_ENDPOINT`, `MODAL_CONTENT_ENDPOINT`, `MODAL_CONTENT_INGEST_ENDPOINT`, `GPU_WORKER_SECRET_KEY`, `SITE_URL`.

**Not synced but consumed in `src/trigger/`:** `MODAL_DESIGN_ENDPOINT` (`design-generate.ts`), `NEXT_PUBLIC_SITE_URL` (thermal-extract callback URL fallback). Changing these requires either adding to `triggerEnvNames` and redeploying Trigger, or they remain stale on Trigger infra.

**Vercel → Trigger dispatch:** API routes call `@trigger.dev/sdk/v3` `tasks.trigger(...)` — requires **`TRIGGER_SECRET_KEY`** on Vercel (SDK convention; not referenced explicitly in app TS but required for dispatch).

### 2.2 Production-critical — Vercel (Next.js server + edge)

| Variable | Consumed by (representative) | In `.env.example`? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/admin.ts`, `client.ts`, many API routes | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts`, `server.ts` | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` (+ widespread server routes) | yes |
| `SUPABASE_URL` | Fallback in callbacks/scripts/trigger | yes |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `R2_REGION`, `CLOUDFLARE_ACCOUNT_ID` | `lib/s3.ts`, plan PDF route, Trigger rasterize | partial — R2_* **not** in example; `AWS_*` + `SLATEDROP_S3_BUCKET` are |
| `SLATEDROP_S3_BUCKET` | `lib/s3.ts` AWS fallback bucket name | yes |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | `lib/s3.ts` fallback path | yes |
| `STRIPE_SECRET_KEY` | `lib/stripe.ts`, billing routes | yes |
| `STRIPE_WEBHOOK_SECRET` | `app/api/stripe/webhook/route.ts` | yes |
| `STRIPE_PRICE_*` (see §2.4) | `lib/billing.ts`, `lib/billing-apps.ts` | partial |
| `GPU_WORKER_SECRET_KEY` | All Modal→app job callbacks (§3) | yes |
| `CRON_SECRET` | `app/api/ops/cron/*` (Bearer auth) | yes |
| `TRIGGER_SECRET_KEY` | Trigger SDK dispatch from Vercel | **no** |
| `RESEND_API_KEY` | `lib/email.ts` | yes |
| `EMAIL_FROM` | `lib/email.ts` | yes |
| `GROQ_API_KEY`, `GROQ_CHAT_MODEL`, `GROQ_WHISPER_MODEL` | `lib/server/ai-provider.ts` | GROQ_* **no** |
| `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL` | `lib/server/ai-provider.ts`, contract analyze | OPENAI yes; `OPENAI_CHAT_MODEL` **no** |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | `lib/server/rate-limit.ts`, `lib/digital-twin/share-rate-limit.ts` | yes |
| `TURNSTILE_SECRET_KEY` | `lib/server/turnstile.ts` | **no** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `app/signup/page.tsx` | **no** |
| `CEO_EMAIL` | `lib/server/beta-access.ts`, thermal share questions | yes |
| `SITE_URL` | Thermal callback base, design exports, thermal email links | **no** (has `NEXT_PUBLIC_SITE_URL`) |
| `NEXT_PUBLIC_APP_URL` | Email templates, invite links, deliverable send | **no** (has `NEXT_PUBLIC_BASE_URL`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps components, `/api/directions`, `/api/static-map` | yes |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Project location pickers | yes |
| `NEXT_PUBLIC_APP_STORE_MODE` | `lib/app-store-mode.ts` — **opt-in** (`=== "true"`) | **no** |
| `NEXT_PUBLIC_BETA_MODE` | `lib/beta-mode.ts` — default **on** unless `"false"` | **no** |
| `NEXT_PUBLIC_CAPTURE_V2` | `lib/site-walk/capture-v2-config.ts` — default **on** unless `"false"` | yes |
| `NEXT_PUBLIC_CAPTURE_CANVAS_SHELL` | Same file — default **on** unless `"false"` | yes |
| `NEXT_PUBLIC_DIGITAL_TWIN_DESKTOP` | `lib/digital-twin/desktop-feature.ts` — default **off** unless `"true"` | yes |
| `APPLE_APP_ID` | `app/.well-known/apple-app-site-association/route.ts` | **no** |
| `ANDROID_PACKAGE_NAME`, `ANDROID_SHA256_FINGERPRINT` | `app/.well-known/assetlinks.json/route.ts` | **no** |
| `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_AUTH_TOKEN` | `sentry.*.config.ts`, `next.config.ts` | **no** |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE` | `components/providers/PostHogProvider.tsx` | **no** |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | `lib/sms.ts` — skips send outside prod if unset | yes |
| `DESIGN_STUDIO_CHAT_MODEL` | `lib/design-studio/interpret-prompt.ts` | **no** |
| `MODAL_THERMAL_ENDPOINT` | `app/api/ops/thermal/timelapse/route.ts` (direct Modal call) | **no** |
| `MODAL_TOUR_ENDPOINT` | `app/api/tours/[tourId]/scenes/complete/route.ts` | **no** |
| `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_REF`, `VERCEL_URL`, `VERCEL_REGION` | Deploy info routes | auto (Vercel) |
| `NODE_ENV` | Turnstile permissive path, rate-limit warnings, cookies | runtime |

### 2.3 Modal workers (Modal secrets + HTTP endpoints)

Modal apps read secrets from Modal secret objects (not Vercel env):

| Modal app | Secret name | Callback / progress targets |
|---|---|---|
| `slate360-twin-gaussian-splat` | `slate360-twin-worker` | `POST ${SITE_URL}/api/digital-twin/jobs/callback`, `POST .../api/twin/jobs/{id}/progress` |
| `slate360-thermal-analysis` | (thermal worker secret) | `POST .../api/ops/thermal/jobs/callback` |
| Content studio ingest/render | `slate360-thermal-worker` (reused) | `POST .../api/content-studio/jobs/callback` |
| Design preview | `slate360-design` | `POST .../api/design-studio/jobs/callback` |
| Tour ingest | (tour worker) | `POST .../api/tours/jobs/callback` |

Secrets must contain at minimum: `GPU_WORKER_SECRET_KEY`, `SITE_URL`, R2 credentials — matching Vercel/Trigger values.

**Endpoint env vars (Trigger → Modal HTTP):** `MODAL_TWIN_ENDPOINT`, `MODAL_THERMAL_ENDPOINT`, `MODAL_THERMAL_INTERPRET_ENDPOINT`, `MODAL_TOUR_ENDPOINT`, `MODAL_CONTENT_ENDPOINT`, `MODAL_CONTENT_INGEST_ENDPOINT`, `MODAL_DESIGN_ENDPOINT`.

### 2.4 Stripe price ID variables (all in `lib/billing.ts` + `lib/billing-apps.ts`)

Present in `.env.example`: most Site Walk / Twin / bundle / credits IDs.

**In code but missing from `.env.example`:**

`STRIPE_PRICE_APP_CONTENT_STUDIO_MONTHLY`, `STRIPE_PRICE_APP_DESIGN_STUDIO_MONTHLY`, `STRIPE_PRICE_APP_DIGITAL_TWIN_MONTHLY`, `STRIPE_PRICE_BUNDLE_ALL_ACCESS`, `STRIPE_PRICE_BUNDLE_ALL_ACCESS_ANNUAL`, `STRIPE_PRICE_CONTENTSTUDIO_BASIC`, `STRIPE_PRICE_CONTENTSTUDIO_PRO`, `STRIPE_PRICE_CREDITS_GROWTH`, `STRIPE_PRICE_CREDITS_PRO`, `STRIPE_PRICE_CREDITS_STARTER`, `STRIPE_PRICE_DESIGNSTUDIO_BASIC`, `STRIPE_PRICE_DESIGNSTUDIO_PRO`, `STRIPE_PRICE_SLATEDROP_PRO`, `STRIPE_PRICE_STANDARD_ANNUAL`, `STRIPE_PRICE_STANDARD_MONTHLY`, `STRIPE_PRICE_STORAGE_10GB`, `STRIPE_PRICE_STORAGE_50GB`, `STRIPE_PRICE_TOURS_BASIC`, `STRIPE_PRICE_TOURS_PRO`, `STRIPE_UPGRADE_LINK`.

Legacy tier names (`standard`/`business` + `CREDITS_STARTER/GROWTH/PRO`) coexist with modular catalog (`STRIPE_PRICE_SITEWALK_*`, etc.) — both paths are live in code.

### 2.5 Codemagic-only env (not in application code)

From `codemagic.yaml` + `docs/native/README.md`:

**iOS groups:** `APP_STORE_CONNECT_PRIVATE_KEY_B64`, `APP_STORE_CONNECT_KEY_IDENTIFIER`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_APP_ID`, `CERTIFICATE_PRIVATE_KEY`, plus Codemagic built-ins (`CM_COMMIT`, etc.).

**Android groups:** `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`, `CM_KEYSTORE`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`, `CM_KEY_PASSWORD`.

### 2.6 Scripts / local / CI-only (abbreviated)

Not required for production runtime unless noted:

`API_BASE_URL`, `BASE_URL`, `BURST_*`, `DIAG_*`, `E2E_TWIN_*`, `HEADED`, `MARKET_BASE_URL`, `MEASURE_*`, `PLAYWRIGHT_BASE_URL`, `PORT`, `PREVIEW_BASE_URL`, `SMOKE_BASE_URL`, `STRIPE_SMOKE_TEST_BASE`, `SUPABASE_ACCESS_TOKEN` (migrations CLI), `SWEEP_COOKIE`, `TWIN_SHARE_TOKEN`, `CONTENT_STUDIO_SEED_ORG_ID`, `OUTPUT_FILE`, `OUTPUT_FORMAT`, `NEXT_TELEMETRY_DISABLED`, `NEXT_PUBLIC_DEV_SCREENS`, `NEXT_PUBLIC_BUILD_ID`, `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`.

**Archived / non-prod:** `MARKET_SCHEDULER_SECRET` — only `scripts/market-burst-test.mjs`.

### 2.7 `.env.example` entries with no code references in scanned paths

Examples include: `ADOBE_SIGN_*`, `AUTODESK_*`, `DOCUSIGN_*`, `EMAIL_PROVIDER`, `SENDGRID_API_KEY`, `LIVEKIT_*`, `POLYMARKET_*`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `PROCORE_*`, `POSTGRES_*`, `SUPABASE_WEBHOOK_SECRET`, `WORKER_SECRET_KEY` (superseded by `GPU_WORKER_SECRET_KEY`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (no TS references found), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, legacy creator/model Stripe price placeholders.

---

## 3. Webhook & callback inventory

### 3.1 Stripe — `POST /api/stripe/webhook`

| Field | Value |
|---|---|
| Auth | `stripe-signature` header + `STRIPE_WEBHOOK_SECRET` (`constructEvent`) |
| Dedup | Insert into `stripe_events` before processing |
| **Handled event types** | `checkout.session.completed`; `customer.subscription.created`; `customer.subscription.updated`; `customer.subscription.deleted` |
| **Explicitly not handled** | `invoice.payment_failed` (no handler; noted in `PROJECTS_SITEWALK_CLAIMS_AUDIT.md` §Open questions); all other types fall through `default: break` |
| Misconfiguration effect | Missing secret → 500; bad signature → 400; wrong webhook URL/secret in Stripe dashboard → subscriptions/tiers/credits never update; `past_due` sets org status but does not downgrade until subscription deleted/canceled |

Subscription logic branches on metadata `kind`: `standalone_app`, `modular_*`, `storage_addon`, legacy `target_tier`, credits checkout.

### 3.2 Modal / GPU worker callbacks (HMAC)

Shared auth: raw body + `x-worker-signature` header, HMAC-SHA256 via `lib/twin/worker-signature.ts` with **`GPU_WORKER_SECRET_KEY`**.

| Route | Method | Purpose | If misconfigured |
|---|---|---|---|
| `/api/digital-twin/jobs/callback` | POST | Twin reconstruction complete/fail | Jobs stuck processing; no model in DB/R2 |
| `/api/twin/jobs/[id]/progress` | POST | Twin pipeline stage heartbeat | Submit UI frozen at dispatch % |
| `/api/ops/thermal/jobs/callback` | POST | Thermal analysis complete/fail | Thermal jobs stuck |
| `/api/ops/thermal/interpret/callback` | POST | Thermal AI interpret complete/fail | Interpret jobs stuck |
| `/api/ops/thermal/timelapse/callback` | POST | Thermal timelapse complete/fail | Timelapse jobs stuck |
| `/api/content-studio/jobs/callback` | POST | Content studio ingest/render | CS jobs stuck |
| `/api/design-studio/jobs/callback` | POST | Design studio preview/generate | Design jobs stuck |
| `/api/tours/jobs/callback` | POST | Tour scene ingest | Tour processing stuck |

Modal workers POST to `${SITE_URL}/...` — **`SITE_URL` must match production origin** (`https://www.slate360.ai`) in Modal secrets and Trigger sync. Mismatch → callbacks hit wrong host → silent job failure.

**Secret mismatch** between Vercel `GPU_WORKER_SECRET_KEY` and Modal secret → 401 on all callbacks.

### 3.3 Trigger.dev connectivity

| Direction | Mechanism |
|---|---|
| Vercel → Trigger | `@trigger.dev/sdk/v3` `tasks.trigger(taskId, payload)` from API routes; needs `TRIGGER_SECRET_KEY` on Vercel |
| Trigger → Modal | HTTP POST to `MODAL_*_ENDPOINT` env vars inside Trigger worker |
| Trigger → Supabase | Service role / anon key in task code |
| Trigger → App callbacks | Modal workers call app, not Trigger |

**Deployed tasks** (`src/trigger/*.ts`):

| Task ID | File |
|---|---|
| `twin.gaussian_splat` | `twin-gaussian-splat.ts` |
| `thermal.process` / `thermal.extract` | `thermal-extract.ts` |
| `thermal.interpret` | `thermal-interpret.ts` |
| `plan.rasterize` | `rasterize.ts` |
| `tour.ingest` | `tour-ingest.ts` |
| `design.generate` | `design-generate.ts` |
| `content-studio.ingest` | `content-studio-ingest.ts` |
| `content-studio.render` | `content-studio-render.ts` |

Project ID: `proj_ydquoejbfqidzbjioyno` (`trigger.config.ts`).

If Trigger deploy is stale vs code, or `MODAL_TWIN_ENDPOINT` on Trigger ≠ deployed Modal URL → jobs stay `queued`.

### 3.4 Vercel Cron — `GET` with Bearer `CRON_SECRET`

Configured in `vercel.json`:

| Path | Schedule | Purpose |
|---|---|---|
| `/api/ops/cron/recover-stale-twin-jobs` | `*/15 * * * *` | Re-queue stuck twin jobs |
| `/api/ops/cron/r2-cleanup` | `0 * * * *` | Process twin R2 deletion queue |

Auth: `Authorization: Bearer ${CRON_SECRET}`. Missing `CRON_SECRET` → all cron requests unauthorized. Vercel must inject cron secret automatically when configured in project settings (operator verify in §6).

### 3.5 Other inbound endpoints (not external-service webhooks)

| Route | Auth | Notes |
|---|---|---|
| `/api/auth/signup`, `/api/auth/resend-confirmation` | Session/rate-limit; optional Turnstile | Turnstile skipped if `TURNSTILE_SECRET_KEY` unset (warns in prod) |
| Public share/view routes | Token in URL | Rate-limited when Upstash configured |
| **Planned but not in repo:** `/api/billing/store-webhook` | — | Spec'd in `docs/specs/STORE_IAP_ENTITLEMENTS.md` §2 for RevenueCat/ASN — **no route file exists** |

No Supabase database webhook route found despite `SUPABASE_WEBHOOK_SECRET` in `.env.example`.

---

## 4. Third-party service touchpoints

### 4.1 Cloudflare R2

| Item | Repo fact |
|---|---|
| Default bucket | `slate360-storage` (`lib/s3.ts` fallback, Trigger rasterize, ops scripts) |
| Provider selection | Full R2 config → R2; else AWS S3 fallback (`STORAGE_PROVIDER` in `lib/s3.ts`) |
| Key patterns | `orgs/{orgId}/{folderId}/{timestamp}_{filename}` (`buildS3Key`); `orgs/{orgId}/digital-twin/{spaceId}/models/{jobId}.spz` (Modal twin worker); `orgs/{orgId}/digital-twin/{spaceId}/{captureId}/...` (upload helpers); `orgs/{orgId}/thermal/{sessionId}/...` (`lib/thermal/storage-keys.ts`); `site-walk/exports/{orgId}/{deliverableId}.pdf` |
| CORS | Not defined in repo — operator must verify R2 bucket CORS allows browser uploads from `https://www.slate360.ai` |

### 4.2 Supabase

| Item | Repo fact |
|---|---|
| Admin client | `lib/supabase/admin.ts` — `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS |
| Usage | Widespread server routes, share viewers, webhooks, cron, Trigger tasks |
| Anon client | `lib/supabase/client.ts`, `server.ts` — browser and SSR user context |
| Linked prod ref (from project docs) | `hadnfcenpcfaeclczsmm` / `slate360-prod` |

### 4.3 Upstash Redis

| Item | Repo fact |
|---|---|
| Vars | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Rate limiting | `lib/server/rate-limit.ts` — signup, resend, upload-url, email send, share unlock, viewer comments/questions, tour join |
| Twin share | `lib/digital-twin/share-rate-limit.ts` — per-token+IP |
| **When unset** | Limiters return `null` → **allow all**; production logs `CRITICAL` warning (`rate-limit.ts` lines 48–54). Share rate limit silently disabled (returns null, no prod error log) |

### 4.4 Resend

| Item | Repo fact |
|---|---|
| API key | `RESEND_API_KEY` — throws if missing when sending |
| From address | `EMAIL_FROM` default `Slate360 <noreply@slate360.ai>` |
| Domain in templates | Links to `NEXT_PUBLIC_APP_URL` (default `https://slate360.ai`) and asset `https://www.slate360.ai/slate360-icon-color.png` |

### 4.5 Groq / OpenAI

| Provider | Vars | Used for |
|---|---|---|
| Groq (preferred) | `GROQ_API_KEY`, `GROQ_CHAT_MODEL`, `GROQ_WHISPER_MODEL` | Chat + Whisper via `lib/server/ai-provider.ts`; design interpret |
| OpenAI (fallback) | `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL` | Same wrapper; contract analyze route |
| Effect if both missing | Voice-to-text and AI note polish fail at runtime |

### 4.6 Google Maps

| Var | Usage |
|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client maps, server `/api/directions`, `/api/static-map` |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Map ID for Advanced Markers (defaults `DEMO_MAP_ID` if unset) |

---

## 5. Apple-facing repo facts

### 5.1 Info.plist usage strings (`ios/App/App/Info.plist`)

| Key | Text |
|---|---|
| `NSCameraUsageDescription` | Site photos, video, 3D scans |
| `NSMicrophoneUsageDescription` | Voice memos and video audio |
| `NSLocationWhenInUseUsageDescription` | Tag captures with location |
| `NSPhotoLibraryUsageDescription` | Add existing photos/videos |
| `NSPhotoLibraryAddUsageDescription` | Save exports to photo library |
| `NSMotionUsageDescription` | Motion sensors for stable captures |

No `NSFaceIDUsageDescription`, Bluetooth, or tracking strings.

### 5.2 Export compliance

`ITSAppUsesNonExemptEncryption` = **`false`** (Info.plist line 48–49) — standard HTTPS-only claim.

### 5.3 Device families & orientation

| Setting | Value |
|---|---|
| `TARGETED_DEVICE_FAMILY` | `"1,2"` (iPhone + iPad) in `project.pbxproj` |
| `UIRequiredDeviceCapabilities` | `armv7` only (Info.plist) |
| iPhone orientations | Portrait only |
| iPad orientations | Portrait + PortraitUpsideDown |
| `UIRequiresFullScreen` | `true` |
| `IPHONEOS_DEPLOYMENT_TARGET` | 15.0 |

### 5.4 Deep links / Associated Domains

**AASA route:** `GET /.well-known/apple-app-site-association` (`app/.well-known/apple-app-site-association/route.ts`)

```13:28:app/.well-known/apple-app-site-association/route.ts
  const appId =
    process.env.APPLE_APP_ID ?? "XXXXXXXXXX.ai.slate360.app";
  ...
          paths: ["/dashboard/*", "/site-walk/*", "/slatedrop/*", "/share/*"],
    ...
    webcredentials: {
      apps: [appId],
```

- Default `appID` is placeholder unless `APPLE_APP_ID` env set (expected format: `{TeamID}.ai.slate360.app`; checked-in team ID `G5L38UMX97` → likely `G5L38UMX97.ai.slate360.app`).
- **No Associated Domains entitlement in Xcode project** — Universal Links won't activate on device until capability + matching AASA + env are all aligned.

**Android asset links:** `GET /.well-known/assetlinks.json` — placeholder SHA256 unless `ANDROID_SHA256_FINGERPRINT` set.

### 5.5 Version / build locations

| Location | Field |
|---|---|
| `ios/App/App/Info.plist` | `CFBundleShortVersionString` → `$(MARKETING_VERSION)`; `CFBundleVersion` → `$(CURRENT_PROJECT_VERSION)` |
| `ios/App/App.xcodeproj/project.pbxproj` | `MARKETING_VERSION = 1.0`; `CURRENT_PROJECT_VERSION = 1` |
| Codemagic | Overwrites build number via `agvtool`; stamps `SlateBuildCommit` |
| `android/app/build.gradle` | `versionName "1.0"`, `versionCode 1` |

---

## 6. Manual dashboard checklist

Use after sections 1–5. Check each box only when verified in the live dashboard/console — not inferable from repo alone.

> **Note:** `SLATE360_IMPLEMENTATION_PLAN_SLICES.md` was **not found** in the repo. IAP SKU names below come from `docs/specs/STORE_IAP_ENTITLEMENTS.md` §2. Schema drift items from `PROJECTS_SITEWALK_CLAIMS_AUDIT.md` §Open questions.

### 6.1 App Store Connect

- [ ] App record exists for bundle ID **`ai.slate360.app`**
- [ ] **`APP_STORE_APP_ID`** in Codemagic matches this app's numeric ID
- [ ] Agreements, Tax, and Banking active (required before IAP)
- [ ] **Paid Applications Agreement** signed if selling digital goods
- [ ] App Store listing metadata draft complete for Site Walk-first release
- [ ] **Export compliance** answers match `ITSAppUsesNonExemptEncryption = false` in Info.plist
- [ ] TestFlight **internal** testing group has build recipients
- [ ] **IAP products to create** (per `STORE_IAP_ENTITLEMENTS.md` §2 — not yet in repo code):
  - [ ] Auto-renewable: `sitewalk.low`, `sitewalk.high`, `twin.low`, `twin.high`, `bundle` (monthly + annual variants)
  - [ ] Consumables: `tokens.100`, `tokens.500`, `tokens.2000`
  - [ ] Intro offers / trial configured to match server-side trial caps spec
- [ ] **Sign in with Apple:** decide yes/no — repo has **no** Sign in with Apple implementation; if required for other social login, plan capability + entitlement
- [ ] **Push Notifications capability:** decide timeline — repo has **no** push entitlement (needed for processing-complete UX per product docs / Phase 2.13 references in design docs)
- [ ] **Background Modes** (e.g. `fetch`, `processing`) — not in repo; enable in Xcode + ASC only if upload-resume strategy requires it
- [ ] Associated Domains: add `applinks:www.slate360.ai` (and apex if used) once `APPLE_APP_ID` env is `G5L38UMX97.ai.slate360.app` (or actual team ID)

### 6.2 Google Play Console

- [ ] App **`ai.slate360.app`** created
- [ ] Play App Signing certificate SHA-256 copied → Vercel env **`ANDROID_SHA256_FINGERPRINT`**
- [ ] Internal testing track receives Codemagic AAB drafts
- [ ] Data safety + content rating questionnaires complete
- [ ] Play Billing products mirror IAP catalog (when monetization goes live)
- [ ] **`ANDROID_PACKAGE_NAME`** env matches Play package if overriding default

### 6.3 Codemagic

- [ ] iOS workflow **`ios-capacitor`** green on `main`
- [ ] Env group **`app_store_connect`**: `APP_STORE_CONNECT_PRIVATE_KEY_B64`, `APP_STORE_CONNECT_KEY_IDENTIFIER`, `APP_STORE_CONNECT_ISSUER_ID`, **`APP_STORE_APP_ID`**
- [ ] Env group **`ios_signing`**: `CERTIFICATE_PRIVATE_KEY` valid, not expired
- [ ] Distribution certificate + App Store provisioning profile for `ai.slate360.app` valid
- [ ] Android groups **`google_play`**, **`android_signing`** configured
- [ ] Latest `.ipa` appears in App Store Connect → TestFlight
- [ ] **`SlateBuildCommit`** in TestFlight build matches expected git SHA
- [ ] Open built IPA's embedded Xcode project capabilities: confirm **Background Modes** / **Push** match intentional ASC settings (repo has neither — any capability here was added manually in Apple Developer portal + Xcode, not from git)

### 6.4 Vercel (production)

- [ ] Project linked; latest deploy matches intended `main` commit (`GET https://www.slate360.ai/api/deploy-info`)
- [ ] **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- [ ] **Storage:** `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=slate360-storage`, `R2_ENDPOINT` or `CLOUDFLARE_ACCOUNT_ID`, `R2_REGION`
- [ ] **Stripe:** `STRIPE_SECRET_KEY` (live mode for launch), `STRIPE_WEBHOOK_SECRET`, all live **`STRIPE_PRICE_*`** IDs referenced in `lib/billing-apps.ts` + `lib/billing.ts`
- [ ] **Worker auth:** `GPU_WORKER_SECRET_KEY` matches Modal secrets
- [ ] **Trigger dispatch:** `TRIGGER_SECRET_KEY` present
- [ ] **Cron:** `CRON_SECRET` set; Vercel Cron jobs authorized (pairs with `vercel.json` paths)
- [ ] **Email:** `RESEND_API_KEY`; `EMAIL_FROM` uses verified domain
- [ ] **AI:** `GROQ_API_KEY` and/or `OPENAI_API_KEY`
- [ ] **Maps:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- [ ] **Rate limits:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] **CAPTCHA (signup):** `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- [ ] **Deep links:** `APPLE_APP_ID` = `{TeamID}.ai.slate360.app`
- [ ] **URLs:** `SITE_URL=https://www.slate360.ai`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` consistent
- [ ] **Feature flags — verify intentional states:**
  - [ ] `NEXT_PUBLIC_APP_STORE_MODE` — `true` hides unfinished apps from nav (`lib/app-store-mode.ts`)
  - [ ] `NEXT_PUBLIC_BETA_MODE` — `false` for real entitlement gating; `true` bypasses all gates
  - [ ] `NEXT_PUBLIC_CAPTURE_V2` — `true` (default) uses V2 capture routes
  - [ ] `NEXT_PUBLIC_DIGITAL_TWIN_DESKTOP` — `false` unless desktop twin workstation intended
- [ ] Optional: Sentry, PostHog, Twilio SMS vars if those surfaces are live

### 6.5 Trigger.dev

- [ ] Project **`proj_ydquoejbfqidzbjioyno`** — latest deploy matches `main` `src/trigger/*`
- [ ] Synced env vars match Vercel / `.env.local` (see §2.1), especially:
  - [ ] **`MODAL_TWIN_ENDPOINT`** URL matches currently deployed Modal twin worker
  - [ ] **`MODAL_THERMAL_ENDPOINT`**, **`MODAL_TOUR_ENDPOINT`**, content studio endpoints
  - [ ] **`GPU_WORKER_SECRET_KEY`**, **`SITE_URL`**, R2 credentials
- [ ] **`MODAL_DESIGN_ENDPOINT`** — confirm value on Trigger even though not in `trigger.config.ts` sync list (may be stale)
- [ ] Test dispatch: enqueue a harmless task (e.g. plan rasterize) and confirm run completes

### 6.6 Modal

- [ ] **`slate360-twin-gaussian-splat`** deployed; endpoint label **`reconstruct`** matches `MODAL_TWIN_ENDPOINT`
- [ ] Deployed worker revision includes SPZ v3 fix — commit **`b701feae`** (2026-06-09) per `TWIN360_TECH_AUDIT.md`; pre-fix twins may still have v4 `.spz` in R2
- [ ] **`slate360-thermal-analysis`** deployed; matches `MODAL_THERMAL_ENDPOINT`
- [ ] Secret **`slate360-twin-worker`**: `GPU_WORKER_SECRET_KEY`, `SITE_URL`, R2 keys aligned with Vercel
- [ ] Secret **`slate360-thermal-worker`** (content studio reuse): same alignment
- [ ] Secret **`slate360-design`**: same alignment for design callbacks
- [ ] Tour ingest worker deployed if tour features exercised

### 6.7 Stripe

- [ ] Webhook endpoint URL: **`https://www.slate360.ai/api/stripe/webhook`** (or canonical prod host)
- [ ] Webhook signing secret matches Vercel `STRIPE_WEBHOOK_SECRET`
- [ ] Subscribed events include at minimum: `checkout.session.completed`, `customer.subscription.*`
- [ ] **Decide:** add `invoice.payment_failed` handler? (not in repo today — failed payments may not downgrade until subscription status changes)
- [ ] Live **Price IDs** match every `STRIPE_PRICE_*` env name in Vercel (modular + legacy tiers)
- [ ] Customer portal / payment links tested in live mode

### 6.8 Supabase (prod)

- [ ] Schema matches app expectations; resolve **prod schema drift** called out in audit:
  - [ ] `projects.metadata`
  - [ ] `project_members.role_id`, `project_members.status`
  - [ ] `site_walk_sessions.client_session_id`
  - [ ] Other columns read/written by code but absent from checked-in migrations
- [ ] RLS policies allow intended flows for Site Walk release
- [ ] `stripe_events` table exists for webhook dedup
- [ ] Realtime enabled where UI depends on job status updates

### 6.9 Cloudflare R2

- [ ] Bucket **`slate360-storage`** exists in account
- [ ] API token / keys match Vercel + Modal + Trigger
- [ ] **CORS** allows browser PUT/POST from `https://www.slate360.ai` (and Capacitor origin if distinct)
- [ ] Lifecycle/orphan policy understood (DB deletes do not remove blobs — separate cleanup)

### 6.10 Upstash

- [ ] Redis database created
- [ ] **`UPSTASH_REDIS_REST_URL`** + **`UPSTASH_REDIS_REST_TOKEN`** on Vercel production
- [ ] Confirm rate limiting active (signup spam test returns 429 after threshold)

### 6.11 Resend

- [ ] Domain **`slate360.ai`** (or chosen From domain) verified
- [ ] SPF/DKIM/DMARC DNS records green
- [ ] Test send from production (`noreply@slate360.ai` or `EMAIL_FROM` value)

### 6.12 Google Cloud (Maps)

- [ ] Maps JavaScript API + Places/Geocoding enabled for prod key
- [ ] Key restricted to `https://www.slate360.ai/*` (and localhost for dev)
- [ ] Map ID **`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`** exists in Google Cloud Console

---

*End of preflight document. Facts reflect repo state at generation time; dashboard items require live verification.*
