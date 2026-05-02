# App Store & Offline Strategy

**Created:** 2026-05-02  
**Updated:** 2026-05-02 (V1 Foundational Release corrections)  
**Status:** LOCKED — Binding technical + strategic doctrine for native app submission, offline capture, V1 access control, and V2 monetization.  
**Answers:** How does a Next.js web app get into the iOS and Android App Stores, who is allowed to use it in V1, and how does monetization work later?

---

## 0. V1 vs V2 — Strategic Doctrine (read first)

### V1 — Foundational Release (CURRENT TARGET)

V1 is **NOT** a public paid release. V1 is **NOT** a beta. V1 is the **Slate360 V1 Foundational Release** — a controlled, invite-only deployment of Slate360 + Site Walk distributed through the App Store and Play Store with admin-controlled access.

**Banned terminology in V1 user-facing copy and App Store listings:**
- "beta"
- "test"
- "demo"
- "coming soon"
- "unfinished"
- "trial experiment"
- "pilot program"

**Approved terminology:**
- "Foundational Release"
- "Invite-only access"
- "Access pending approval"
- "Your organization administrator or Slate360 admin will review your request"

**V1 distribution model:**
- App is **free to download** from the App Store and Play Store
- **No public paid subscription flow** in V1
- **No In-App Purchases (IAP)** in V1
- All access is gated by admin approval through Operations Console
- New users default to `account_status = pending_approval` and see a polished "Pending Foundational Verification" screen
- The first foundational organization is Arizona State University Capital Programs Management Group (project managers, architects, leadership)
- The $1 ASU vendor-registration transaction is handled **outside the app** through normal business invoicing — **never** through Apple/Google IAP
- Approved foundational users get access to Site Walk and Field Projects scoped to their assigned organization
- Leadership gets the Executive Viewer role for organization-wide read-only oversight

**V1 success criteria:**
1. App accepted into both App Store and Play Store
2. ASU foundational users actively creating Field Projects, performing walks, generating deliverables
3. ASU leadership using Executive Viewer to oversee org activity
4. Bug reports + feature requests captured and triaged
5. No App Store rejections for incomplete/ghost features

### V2 — Public Monetized Release (FUTURE — after V1 stabilizes)

V2 is the public, monetized launch.

- Public App Store / Play Store availability remains
- **Native iOS/Android IAP becomes the primary purchase path** — users subscribe in-app
- Evaluate **RevenueCat** (or equivalent) for cross-platform entitlement abstraction — recommended over hand-rolling IAP
- Apple Small Business Program (15% commission tier) should be applied for if eligible
- Website remains for marketing, account support, and admin tools — **not** the primary purchase path
- Apps progressively unlock as they become production-ready: 360 Tours → Design Studio → Content Studio
- Foundational V1 users retain access to their data and receive a discounted V2 upgrade offer
- Enterprise/seat-based licensing path opens for organizations like ASU after V1 success

**Anti-patterns to avoid in V1 doctrine:**
- ❌ "Subscriptions are web-only forever" — wrong. V1 is web-free + approval-gated; V2 moves to native IAP.
- ❌ Building a Stripe/web checkout into V1 user-facing flow — V1 has no public purchase path.
- ❌ Showing future apps as locked tiles or "coming soon" — must be hidden entirely from V1 UI.

---

## 0a. V1 Distribution Tracks (evaluate before submission)

Distribution method on App Store Connect has long-term implications — **switching from private to public after approval may require a new app record**. Evaluate these tracks before final submission:

| Track | Purpose | When to Use |
|---|---|---|
| **Apple TestFlight / Play Internal Testing** | Technical pre-release device validation (camera, offline, native plugins) | Before public submission, for our own QA |
| **Apple TestFlight / Play Closed Testing** | Limited group testing of release candidates | Before public submission, with select foundational users |
| **Public App Store / Play Store (V1 Foundational, gated by approval)** | The primary V1 distribution path | Recommended for ASU rollout — easier user onboarding than custom app |
| **Apple Custom App via Apple Business Manager / Apple School Manager** | Private distribution to specific organizations | Evaluate for ASU specifically — may be preferable since ASU is an educational institution |
| **Apple Unlisted App** | Not discoverable in search, accessible via direct link | Alternative if public discoverability is undesired |

**Owner decision required before submission:**
- Which iOS distribution track for ASU? (Public-gated vs Apple School Manager Custom App)
- Which Android distribution track? (Public Play Store with approval gate vs Closed Testing track for ASU specifically)

---

## 0b. App Reviewer Access (CRITICAL)

Because V1 is approval-gated, the app reviewer would otherwise be stuck on the Pending Foundational Verification screen and reject the app.

**Mandatory before submission:**
1. Create a dedicated reviewer account (email: `appreview+ios@slate360.ai` and `appreview+android@slate360.ai`)
2. Pre-approve the reviewer account (`account_status = approved`, role = subscriber, linked to a demo organization)
3. Seed the reviewer's organization with at least one Field Project, one completed Site Walk session with sample photos, and one deliverable
4. Provide credentials in App Store Connect "App Review Information" section
5. Provide credentials in Play Console "App access" section, with a clear note: "This app uses approval-based access for organizational deployment. Reviewer account is pre-approved."
6. Provide a 30-second walkthrough video showing reviewer login → Field Project → Walk → Deliverable

---

## 1. The Core Problem

Apple and Google will not accept a URL submission to their app stores. Submitting "just a web app" or a thin web-view wrapper that has no substantial native functionality is grounds for rejection.

The Slate360 + Site Walk app must:
1. Be wrapped as a genuine native binary (not a simple web view)
2. Access the device camera, microphone, GPS, and file system using native APIs
3. Handle offline capture reliably without needing a network connection
4. Support native-style push notifications
5. Behave like an app, not a website in a browser frame

**Decision: Capacitor.js is the native wrapper.**

---

## 2. The Native Wrapper: Capacitor.js

### What It Is
[Capacitor](https://capacitorjs.com/) by Ionic is a native runtime that wraps web applications (Next.js, React, etc.) into genuine iOS and Android binaries. It:
- Compiles your web app into a `.ipa` (iOS) or `.apk`/`.aab` (Android) binary
- Provides a plugin API for native device capabilities (camera, filesystem, notifications, geolocation, SQLite)
- Lets you develop and test in a browser, then build for the device
- Is the industry standard for this pattern (used by many production apps)

### Why NOT React Native or Expo
- Both require a rewrite of the codebase in a different paradigm
- The existing Next.js + React codebase would be discarded
- Not viable for this project

### Why NOT TWA (Trusted Web Activity)
- Android only — no iOS path
- Requires Chrome on the device
- Not suitable for the full feature set required

### Why Capacitor
- Works with the existing Next.js codebase
- Native APIs via plugins (no rewrite)
- Single codebase → iOS + Android builds
- Used in production by major apps
- Apple consistently accepts Capacitor apps because they compile to genuine binaries with real native API access

---

## 3. Capacitor Installation Plan

This has NOT been done yet. When ready to execute this slice:

```bash
# Install Capacitor core and CLI
npm install @capacitor/core
npm install --save-dev @capacitor/cli

# Initialize Capacitor (run from repo root)
npx cap init "Slate360" "ai.slate360.app" --web-dir=out

# Add platforms
npx cap add ios
npx cap add android

# Install native plugins needed for Site Walk
npm install @capacitor/camera
npm install @capacitor/filesystem
npm install @capacitor/geolocation
npm install @capacitor/push-notifications
npm install @capacitor/microphone   # or @capacitor-community/speech-recognition
npm install @capacitor/network      # detect online/offline
npm install @capacitor-community/sqlite  # local SQLite for offline queue
```

> **Important:** Next.js requires a static export (`output: 'export'` in `next.config.ts`) for Capacitor builds. This has significant implications — server components render at build time, not at request time. This must be evaluated carefully before the Capacitor build slice begins.

> **Alternative:** Use Capacitor with a custom server and `next start` served from a local port inside Capacitor. This avoids the static export requirement but requires more setup. This decision must be made before the Capacitor slice begins, with a prompt for review before implementation.

---

## 4. Offline-First Architecture (MANDATORY for Site Walk Act 2)

### The Rule
Site Walk Act 2 (Capture) is **offline-first**. Photos, videos, voice notes, text notes, and status updates must save to the local device immediately, whether or not the device has network access. The sync to SlateDrop/Supabase happens in the background when a connection is available.

This is not a "nice to have." Construction jobsites routinely have zero signal. If a user loses a walk because of connectivity, the app fails at its core job.

### Local-First Storage Stack

| What | Where | When |
|---|---|---|
| Captured photos (compressed) | Capacitor Filesystem (device) | Immediately on capture |
| Voice notes (audio blob) | Capacitor Filesystem (device) | Immediately on record |
| Walk items (JSON metadata) | IndexedDB (`site-walk-queue` store) | Immediately on save |
| Plans (cached for pin reference) | IndexedDB (`site-walk-plans` store) | On plan load, before walk starts |
| Original full-res photos | Queued for background upload | When network available |

### Sync Strategy

```
Capture → Local save (instant) → Online check → Upload queue → Supabase write → SlateDrop path
```

1. User captures a photo
2. Compressed thumbnail → saved to device filesystem immediately
3. Walk item metadata → saved to IndexedDB immediately
4. User sees "Saved" confirmation 
5. Network available: background worker uploads original photo to R2
6. On upload success: Supabase `site_walk_items` row updated with cloud path
7. IndexedDB queue item marked `synced: true`
8. If upload fails: item stays in queue, retry on next network event
9. User can continue capturing without waiting

### Conflict Resolution

- Server is the source of truth for multi-user sync
- Local `revised_at` timestamp + local `revision_id` (UUID) on every item
- On sync: if server has a newer `updated_at` for the same item, surface a conflict indicator
- For Act 2 (single-device capture), conflicts are rare — most writes come from one device

### Current Service Worker Status

The service worker in `app/sw.ts` is currently **disabled via kill switch** (`KILL_SWITCH_VERSION`). It caches nothing. This is intentional — stale HTML/JS caching caused issues.

Offline capability for capture is NOT implemented via the service worker. It uses explicit IndexedDB queues. The service worker remains disabled until the Capacitor-based offline strategy has been tested on real devices.

Do NOT re-enable the service worker for offline capture. Use IndexedDB + Capacitor Filesystem.

---

## 5. Required Native Permissions

These permissions must be declared and have native pre-prompt explanations before App Store submission.

### iOS (Info.plist)
```
NSCameraUsageDescription = "Site Walk uses your camera to capture site conditions and document project progress."
NSMicrophoneUsageDescription = "Site Walk uses your microphone to record voice notes and field observations."
NSLocationWhenInUseUsageDescription = "Site Walk records your GPS location to tag field findings on the project site."
NSPhotoLibraryUsageDescription = "Site Walk can save and retrieve photos from your library."
NSPhotoLibraryAddUsageDescription = "Site Walk can save captured photos to your library."
```

### Android (AndroidManifest.xml)
```
CAMERA
RECORD_AUDIO
ACCESS_FINE_LOCATION
READ_EXTERNAL_STORAGE
WRITE_EXTERNAL_STORAGE (API <29)
```

### Pre-Prompt UI Requirement
Apple requires that the app present a clear, in-UI explanation of WHY a permission is needed BEFORE the native system dialog appears. The user must be able to understand and consent before being prompted.

App must show a modal/sheet before requesting each permission:
- Camera: shown when user taps the first capture button in a walk
- Microphone: shown when user taps voice note for the first time
- Location: shown during Walk setup when assigning GPS to findings

---

## 6. App Store Submission Checklist

### Technical Requirements

| Requirement | Status | Notes |
|---|---|---|
| Capacitor installed and configured | ❌ Not done | Required before submission |
| iOS binary builds successfully | ❌ Not done | Requires Mac/Xcode or CI |
| Android binary builds successfully | ❌ Not done | Requires Android Studio or CI |
| Camera permission pre-prompt UI | ❌ Not built | Required by Apple |
| Microphone permission pre-prompt UI | ❌ Not built | Required by Apple |
| Location permission pre-prompt UI | ❌ Not built | Required by Apple |
| Account deletion path | ✅ Exists | `/api/account/delete` route |
| Privacy policy | ✅ Exists | `/privacy` |
| Terms of service | ✅ Exists | `/terms` |
| App icon 1024×1024 | ❌ Missing | App Store Connect requires 1024px |
| iPhone screenshots (6.9" + 6.1") | ❌ Not prepared | Required for App Store listing |
| iPad screenshots (if supporting iPad) | TBD | Decide before submission |
| Safe area top (iOS notch) | ✅ Done | `env(safe-area-inset-top)` on MobileTopBar |
| Safe area bottom (iOS home indicator) | ✅ Done | `env(safe-area-inset-bottom)` on MobileBottomNav |
| `viewportFit: "cover"` | ✅ Done | layout.tsx viewport config |
| Offline capture functional | ❌ Not done | Must work on airplane mode before submission |
| Push notification permission flow | ❌ Not built | Lower priority (V1 can ship without) |
| Field High Contrast mode | ❌ Not built | Required before field beta |
| App-store-ready splash screen | ❌ Not prepared | Capacitor splash plugin needed |
| Crash reporting (Sentry) | ✅ Configured | sentry.client.config.ts |

### App Store Policy Requirements

| Requirement | Decision |
|---|---|
| In-App Purchases (Apple) | If subscriptions are purchased INSIDE the app on iOS, Apple requires IAP (30%/15% fee). If users subscribe on web and log in on app, no IAP required. **Recommendation: V1 subscriptions web-only; app is login+use only.** |
| Google Play Billing | Same as Apple — subscriptions managed on web bypass Play Billing. V1: web-only subscriptions. |
| Data deletion | Account deletion API exists ✅. Must be surfaced from within the app in Account settings. |
| Privacy policy link | Must be accessible inside the app, not just on the website. |
| Kids / COPPA | Not applicable — construction professional tool. |

### Minimum App Store Acceptance Bar (Apple)

Apple regularly rejects apps that:
- Are "just a website in a web view" with no native functionality
- Have obvious placeholder screens or empty Coming Soon content
- Do not use the camera/microphone/location they declare
- Have a broken login, blank screens, or crashes during review

Slate360 V1 must demonstrate to the reviewer:
1. Signing up works
2. Creating a walk works
3. Capturing a photo with the camera works (requires Capacitor Camera plugin)
4. Voice note works (requires microphone access)
5. Viewing and generating a deliverable works
6. Account deletion works

---

## 7. Field High Contrast Mode

Construction sites have bright sunlight, dirty screens, glare, and heavy gloves. The standard Dark Glass palette is not readable outdoors at noon.

Field High Contrast Mode is a toggle in Account settings that switches the app to a high-contrast palette designed for outdoor visibility.

### CSS Tokens (to be added to `globals.css`)

```css
/* -- Field High Contrast Mode tokens -- */
--field-contrast-bg: #000000;           /* pure black background */
--field-contrast-fg: #FFFFFF;           /* pure white text */
--field-contrast-border: #FFFFFF;       /* full-opacity borders */
--field-contrast-accent: #FFFF00;       /* yellow highlight for active states */
--field-contrast-card: #1A1A1A;         /* dark but distinct card surface */
--field-contrast-muted: #CCCCCC;        /* secondary text still readable */
```

Implementation: when `field_contrast_mode = true` in user preferences, apply `.field-contrast` class to the root shell div. All app components must consume the CSS variable tokens, not hardcoded colors, so they switch automatically.

User preference storage: `profiles.preferences` JSONB column, key `field_contrast_mode: boolean`.

---

## 8. Build and Release Flow for Native Apps

Once Capacitor is installed:

```
1. Web build:   next build (outputs to /out for static export OR runs /next for server mode)
2. Sync:        npx cap sync   (copies web build to ios/android Capacitor projects)
3. iOS:         npx cap open ios  (opens Xcode → Archive → Upload to App Store Connect)
4. Android:     npx cap open android  (opens Android Studio → Generate signed bundle → Upload to Play Console)
```

CI/CD (future): Fastlane or Xcode Cloud for automated App Store builds from `main`.

---

## 9. V1 App Store Submission Target

### Visible in V1

- Slate360 Core Shell (login, account, projects, SlateDrop, coordination)
- Site Walk App (Act 1 Setup / Act 2 Capture / Act 3 Deliver)
- Field Projects (lower-tier Site Walk container)
- SlateDrop with Site Walk + Field Project folders
- Coordination (inbox, calendar, contacts)
- Account / Organization Settings
- Pending Foundational Verification screen for unapproved users
- Executive Viewer role for organization leadership
- Operations Console (admin users only)

### Hidden in V1 (must NOT appear anywhere in app UI or App Store listing copy)

- 360 Tours
- Design Studio
- Content Studio
- "Coming soon" cards or tiles
- Disabled/locked future app tiles
- Public subscription prompts or pricing pages
- Stripe/web checkout flows
- Full Project PM suite (RFIs, submittals, budgets, schedules) — keep DB schema, hide UI
- "Beta" / "demo" / "test" language anywhere

### App Store Listing Copy Rules

- Describe Slate360 as a complete construction field-documentation app
- Describe Site Walk as the core feature (capture, organize, deliver)
- Do **not** mention other future apps in the listing
- Do **not** use the word "beta" or "early access" anywhere
- Use "Invite-only foundational release for construction professionals" if access-gating needs to be disclosed

### Post-Approval Plan

1. ASU Capital Programs Management foundational users approved through Operations Console
2. ASU users perform real Site Walks, generate deliverables
3. ASU leadership uses Executive Viewer for oversight
4. Bug reports + feature requests captured
5. App iterated and improved without disrupting foundational users
6. Once stable: V2 monetization unlocked, public subscriptions enabled, additional apps progressively unlocked
7. ASU offered enterprise license negotiation; foundational individual users offered V2 discount

### V1 → V2 Foundational User Transition Promise

Foundational users are guaranteed:
- Their created data (Field Projects, walks, items, deliverables, files) is preserved
- They retain view/download access to V1 data for **at least 1 year** after V2 launch
- They receive a **discounted V2 subscription** offer
- If their organization purchases enterprise access, organizational data access continues per the enterprise agreement
