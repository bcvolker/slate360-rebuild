# Slate360 — Completion Audit

**Date:** 2026-05-04
**Author:** AI Build Session (GitHub Copilot / Claude Sonnet 4.6)
**Purpose:** This doc is for sharing with other AI assistants to understand what is built, what is missing, and the correct build order. Read this alongside `slate360-context/DESIGN_SYSTEM.md` before writing any code.

---

## How to Read This Doc

- ✅ = Shipped and working
- 🟡 = Scaffolded / partial — UI exists but not fully wired to real data or not complete
- 🟥 = Not built — route, component, or feature does not exist
- 🔒 = Blocked by another item (dependency listed)
- 🔴 = Open bug or critical issue

**Priority tag:** `[BLOCKER]` = must fix before real users. `[MVP]` = must exist for launch. `[P2]` = post-launch polish.

---

## Part 1 — Slate360 Platform (The Shell)

These are the foundational platform capabilities. Every app depends on them.

### 1A. Authentication & Onboarding

| Item | Status | Notes |
|---|---|---|
| Email signup (`/api/auth/signup`) | ✅ | Honeypot + Turnstile code shipped |
| Google OAuth | ✅ | Wired |
| Email confirmation flow | ✅ | Resend sends, Supabase confirms |
| Login (`/login`) | ✅ | Auth page, dark glass, amber CTA |
| Password reset (`/forgot-password`, `/reset-password`) | ✅ | Routes exist |
| Org auto-bootstrap on first login | ✅ | `api/auth/bootstrap-org` |
| **Turnstile CAPTCHA activation** | 🟡 `[BLOCKER]` | Code is live but `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` not yet in Vercel env. Add keys to activate. |
| **Upstash Redis rate limiting** | 🟥 `[BLOCKER]` | `UPSTASH_REDIS_REST_URL=""` — rate limiter is disabled in production. Create Upstash DB and add env vars. |
| **Supabase anon signup bypass** | 🟥 `[BLOCKER]` | Supabase public anon key can POST `/auth/v1/signup` bypassing our API. Fix: Supabase Dashboard → Auth → Providers → Email → Disable "Allow new users to sign up." |
| Signup approval gate | 🟡 | Approval-pending page exists. CEO must approve from Operations Console. |
| Account deletion (Apple requirement) | 🟥 `[MVP]` | Required for App Store. Route + Supabase deletion not built. |
| Magic-link guest login (for external viewers) | 🟥 `[P2]` | Depends on F11 in Site Walk feature registry. |

### 1B. Organization & Team Management

| Item | Status | Notes |
|---|---|---|
| Org creation on signup | ✅ | Auto-bootstrap |
| Org settings page | 🟡 | Exists but sparse — missing address, website, dedicated brand color fields. Everything in `brand_settings` jsonb. |
| Seat management (invite by email) | 🟡 | Invite code exists; no seat-count enforcement UI |
| Role-based access (owner / admin / member / viewer) | 🟡 | DB RLS exists; UI for role changes not built |
| Org branding (logo, colors, for deliverables) | 🟡 `[MVP]` | `brand_settings` jsonb in `organizations`. No UI form. Logo URL field exists, no upload widget wired. |
| Collaborator portal | 🟡 | `app/(collaborator)/` shell exists. External respond route exists. Full two-way workflow not built. |

### 1C. Billing & Subscriptions

| Item | Status | Notes |
|---|---|---|
| Stripe checkout (platform tier) | ✅ | `/plans` → `POST /api/billing/checkout` |
| Stripe customer portal | ✅ | `POST /api/billing/portal` |
| Stripe webhook handler | ✅ | `POST /api/stripe/webhook` |
| Real prices set | ✅ | Standard $149/mo, Business $499/mo, annual ~17% off |
| Per-app purchases (Site Walk, Tour Builder, etc.) | 🟡 | Stripe products defined, webhook updates flags. No in-app purchase flow wired for mobile. |
| **Apple IAP compliance** | 🟥 `[BLOCKER for App Store]` | Apple requires in-app purchases for digital goods sold inside the app. Stripe-direct violates AppStore rules. Capacitor IAP plugin or server-side Apple receipt validation required. |
| Trial limits enforcement | 🟡 | Trial tier defined in entitlements. Limit guards not enforced on most API routes. |
| Storage quota enforcement | 🟥 `[BLOCKER]` | No quota check before presigned upload URLs are issued. Metering engine not built. |
| Credit metering engine | 🟥 `[MVP]` | See §11 of Master Build Plan. Tables `site_walk_usage_events`, `site_walk_usage_monthly`, `record_site_walk_usage()` not created. |

### 1D. Dashboard (Command Center)

| Item | Status | Notes |
|---|---|---|
| Dashboard shell and layout | ✅ | `DashboardClient.tsx` (264 lines after extraction) |
| GlassCard dark glass card primitive | ✅ | `components/shared/GlassCard.tsx` |
| Command Center content (Quick Nav, recent items) | ✅ | `CommandCenterContent.tsx` — amber pass complete, Site Walk bias removed |
| Widget system (drag, save prefs) | ✅ | Multiple widgets wired |
| Dashboard calendar widget | ✅ | `DashboardCalendarWidget.tsx` |
| Dashboard weather widget | ✅ | `DashboardWeatherWidget.tsx` |
| Dashboard data usage widget | ✅ | `DashboardDataUsageWidget.tsx` |
| App launcher (shows real vs coming-soon apps) | ✅ | App Store mode active by default |
| Active session feed (live field sessions on dashboard) | 🟥 `[MVP]` | Dashboard should surface active Site Walk sessions for leadership. Not built. |
| Shared activity feed (cross-app events) | 🟥 `[P2]` | `notifications` table not built. |
| Shared notification center (bell icon) | 🟥 `[P2]` | `notifications` table not built (F8 in feature registry). |

### 1E. Projects (Platform-Level)

| Item | Status | Notes |
|---|---|---|
| Project creation wizard | ✅ | Wizard with map location picker |
| Project list (`/projects`) | ✅ | Compact directory, search, create action, amber |
| Project map / location picker | 🟡 `[BUG-018]` | `LocationMap.tsx` uses deprecated Google DrawingManager — **May 2026 deadline** before breakage. |
| Projects linking to apps | 🟡 | Projects exist but no clean path from project → Site Walk sessions for that project |
| `projects` schema has real columns | 🟥 | `location`, `address`, `scope`, `start_date`, `end_date`, `budget_total`, `client_id` are all in jsonb `metadata`, not proper columns. Limits SQL filtering / reporting. |

### 1F. SlateDrop (File System)

| Item | Status | Notes |
|---|---|---|
| File upload (S3/R2 presigned) | ✅ | `/api/slatedrop/upload-url` + `/api/slatedrop/complete` |
| File list and folder navigation | ✅ | `SlateDropClient.tsx` (282 lines, decomposed) |
| File preview (inline PDF, image, video) | ✅ | BUG-016 fully fixed — both CSP and disposition fixed |
| Folder creation | ✅ | `POST /api/slatedrop/folders` |
| File delete, rename, move | ✅ | Modals and API routes exist |
| Secure send / share link | ✅ | `slate_drop_links` table + token route |
| External upload (intake link) | 🟡 | `/upload` route exists, not fully polished |
| **Recents tab** | 🟡 `[MVP]` | UI scaffolded, mock data only — not wired to real `slatedrop_uploads.last_accessed` |
| **Shared tab** | 🟡 `[MVP]` | UI scaffolded, no real shared-with-me query |
| **Requests tab** | 🟡 `[MVP]` | UI scaffolded, no real external-sends-waiting query |
| Site Walk → SlateDrop folder bridge | 🟡 | `lib/site-walk/slatedrop-bridge.ts` exists, not wired to session folder auto-creation |
| Drag-and-drop upload zone (desktop) | ✅ | Wired on `/slatedrop/upload` and section pages |
| Storage quota enforcement | 🟥 `[BLOCKER]` | No quota check before presigned URL issued |

### 1G. Coordination

| Item | Status | Notes |
|---|---|---|
| Inbox page | 🟡 | Shell exists with InboxTabs (amber), empty state for all 3 tabs — needs real data |
| Calendar page | 🟡 | Empty state only |
| Contacts page | 🟡 | Empty state only (`org_contacts` table exists, no UI picker wired) |
| **Threaded comments (site-walk items)** | 🟥 `[MVP]` | `viewer_comments` table referenced in schema, no UI |
| In-app notification center | 🟥 `[P2]` | `notifications` table not built |

### 1H. Settings

| Item | Status | Notes |
|---|---|---|
| Account / profile settings | 🟡 | Exists but sparse |
| Password change | ✅ | Reset flow works |
| Org branding settings (logo, colors, address) | 🟥 `[MVP]` | No form — blocks branded deliverables |
| Notification preferences | 🟥 `[P2]` | `notification_preferences` table not built |
| **Billing / subscription management** | 🟡 | Portal link goes to Stripe customer portal |
| App purchase flow (from settings) | 🟥 `[MVP]` | Can't buy Site Walk subscription from inside the app |

---

## Part 2 — Site Walk (App 1 — Primary Revenue App)

Site Walk is the flagship app. A complete Site Walk standalone product must exist for beta.

### 2A. Setup & Configuration (Act 1)

| Item | Status | Notes |
|---|---|---|
| Setup wizard UI | ✅ | 6 forms — dark glass, amber — `SiteWalkSetupClient.tsx` |
| Brand settings form | ✅ | `BrandSettingsForm.tsx` — fields exist, no upload widget for logo |
| Project setup form | ✅ | `ProjectSetupForm.tsx` |
| Deliverable defaults form | ✅ | `DeliverableDefaultsForm.tsx` |
| Stakeholder picker form | ✅ | `StakeholderPicker.tsx` |
| Start walk form | ✅ | `StartWalkForm.tsx` |
| **Org brand logo upload** | 🟥 `[MVP]` | No file upload widget wired for logo in brand settings. Required for branded reports. |
| Ad-hoc walk (no project required) | 🟥 `[MVP]` | `project_id` is NOT nullable on `site_walk_sessions`. Schema change required. |

### 2B. Field Capture (Act 2 — The Core)

| Item | Status | Notes |
|---|---|---|
| Capture screen shell (`/site-walk/capture`) | ✅ | Route group scaffold exists |
| `CameraViewfinder.tsx` | ✅ | Camera capture with blob preview, image URL resolution fixed (BUG-039) |
| `DualModeToggle.tsx` | ✅ | Visual/Data mode toggle |
| `UnifiedVectorToolbar.tsx` | ✅ | Markup toolbar |
| Canvas markup (arrows, circles, freehand, text) | ✅ | BUG-042–044 fixed — shapes, select, resize wired |
| Photo markup pinning on plan | ✅ | `usePlanViewer`, `H1-H12` in feature registry |
| Voice note entry (browser speech-to-text) | 🟡 | Wired to browser SpeechRecognition. No streaming Whisper fallback. No live preview while recording. |
| Text note entry | ✅ | |
| GPS + timestamp + weather metadata | 🟡 | GPS reads; weather call exists; EXIF extraction from uploaded photos not wired (B12) |
| Item save to `site_walk_items` | ✅ | API routes exist; offline queue `useSiteWalkOfflineSync` wired |
| IndexedDB draft persistence | ✅ | `lib/site-walk/draft-store.ts` |
| Pinned attachment in capture | ✅ | BUG-043–046 fixed |
| Category / trade / status / priority fields | 🟡 | Fields exist in DB; UI pickers exist; **no bulk action on multiple items** |
| Assignee field + due date | 🟡 | Fields exist; assignment to stakeholders requires address book wired |
| Item timeline (edit / delete / reorder) | 🟡 | Edit and delete wired; **reorder not built** |
| Auto-save / resume in-progress sessions | 🟡 | IndexedDB queue; no explicit "resume session" flow tested on interruption |
| Plan upload and multi-page viewer | 🟡 | `usePlanViewer` hook built; `PDF.js` multi-page base layer (H15) **not built** — only single image plans work |
| Numbered pins on plan | 🟡 | Pin API built (H4–H6); Konva/canvas component (H14) **not built** — pins render but no Konva layer |
| Native camera roll multi-select | 🟥 | B1 — `<input multiple capture/>` + drag-drop zone not wired |
| HEIC/ProRAW → JPEG conversion | 🟥 | B2 — `heic2any` or Sharp not wired |
| Video capture + compression | 🟥 | B3 — `ffmpeg.wasm` not wired |
| Hardware volume-button shutter (native only) | 🟥 | C1 — iOS PWA limitation; needs native wrapper |
| Wake lock (prevent screen sleep in field) | 🟥 `[MVP]` | C7 — `navigator.wakeLock` not wired |
| Swipe between captured items | 🟥 | C4 — gesture nav not built |
| Glare mode (high-contrast for sunlight) | 🟥 `[P2]` | C3 |
| Session review screen ("end walk" summary) | 🟡 | Walk sessions list shows `in_progress` only; **completed sessions not shown** |
| **Add "completed" filter to walks list** | 🟥 `[MVP]` | `walks/page.tsx` queries `status=in_progress` only — must add completed tab/filter |

### 2C. Session Management

| Item | Status | Notes |
|---|---|---|
| Walk sessions list page (`/site-walk/walks`) | ✅ | Amber pass done; shows in_progress sessions |
| Session detail / review page (`/site-walk/walks/[sessionId]`) | ✅ | Full amber conversion done |
| **Completed sessions** | 🟥 `[MVP]` | Both list and filter for `status=completed` not built |
| Start new walk CTA | 🟡 | CTA exists on home page; does not appear on sessions list |
| Realtime updates during active walk | ✅ | `useSiteWalkRealtime` (H7) — postgres_changes wired |
| Multi-user cursor/pin ghost rendering | 🟥 `[P2]` | H18 — Broadcast built (H8), cursor avatar overlay component not built |

### 2D. Assigned Work (Act 2)

| Item | Status | Notes |
|---|---|---|
| Assigned work list page (`/site-walk/assigned-work`) | ✅ | Amber pass done; shows assignment rows |
| Office → Field assignment creation | 🟥 `[MVP]` | No UI for creating an assignment from office side |
| Field acknowledgement (seen → in-progress → complete) | 🟥 `[MVP]` | Status update API may exist; no mobile UI for transition |
| Field → Office "Need Help" / escalation | 🟥 `[P2]` | Not built |
| Pre-walk punch list import | 🟥 `[P2]` | |

### 2E. Deliverables (Act 3 — The Revenue Output)

| Item | Status | Notes |
|---|---|---|
| Deliverables list page (`/site-walk/deliverables`) | ✅ | Amber pass done; shows deliverable rows |
| **Deliverable builder** (`/site-walk/deliverables/new`) | 🟥 `[BLOCKER — MVP]` | Route exists as redirect placeholder. `BlockEditor.tsx` is a scaffold. NOT wired to session items. This is the most critical missing feature. |
| `site_walk_deliverables` table | 🟡 | Table schema exists (per Master Build Plan); verify RLS and all required columns |
| `site_walk_items` table | 🟡 | Table exists; verify markup_data, gps, weather columns present |
| PDF generation engine | 🟥 `[MVP]` | No PDF generation code exists. Must build. |
| Branded PDF (logo + colors injected) | 🟥 `[MVP]` | Requires org branding form (see 1H) first |
| Digital viewer link (`/site-walk/present/[id]`) | 🟥 `[MVP]` | Route does not exist |
| Token-based public viewer (`/site-walk/portal/[token]`) | 🟥 `[MVP]` | Route does not exist |
| Send by email flow | 🟡 `[MVP]` | `lib/email-site-walk.ts` exists; no send UI wired to deliverable builder |
| Send by text (SMS) | 🟥 `[P2]` | Twilio not wired (F12) |
| Export to CSV / Excel | 🟥 `[P2]` | E5 — `xlsx` generator not built |
| Deliverable metadata visibility controls | 🟡 `[BUG-050]` | `viewer_config` schema-ready; UI contract not built |
| Access expiry / revoke / max-view | 🟥 `[MVP]` | Extend `share_token` with expiry and revoke |
| View analytics (opened, read receipt) | 🟡 | `share_view_count` exists; no per-recipient tracking |
| Cover page / custom layout | 🟥 `[P2]` | E1–E3 |
| Approval workflow (Accept / Reject / RFI) | 🟥 `[P2]` | F2 — `deliverable_approvals` table not built |

### 2F. Plans & Drawing Management

| Item | Status | Notes |
|---|---|---|
| Plan upload | 🟡 | Via SlateDrop. `usePlanViewer` hook wired. |
| Multi-page PDF plan viewer | 🟥 `[MVP]` | H15 — `PDF.js` multi-page canvas not built |
| Pin drop on plan (long-press) | 🟡 | API wired (H4); Konva canvas (H14) not built — rendering broken |
| Pin migration between revisions | 🟥 `[P2]` | D2 |
| Zone mapping (area-level grouping) | 🟥 `[P2]` | D4 |

### 2G. Field ↔ Office Coordination (Phase 5)

| Item | Status | Notes |
|---|---|---|
| Item-level threaded comments | 🟥 `[MVP]` | `viewer_comments` table referenced, no UI (F1, F4) |
| Session-level comments | 🟥 `[MVP]` | |
| Read receipts on sent items | 🟡 | `share_view_count` only |
| Live field session feed (office view) | 🟥 `[P2]` | |
| Push notifications (in-app) | 🟥 `[P2]` | `notifications` table not built |
| Push notifications (device — PWA) | 🟥 `[P2]` | Service worker not wired for push |

### 2H. Metering & Quota (Phase 11 per Master Plan)

| Item | Status | Notes |
|---|---|---|
| Storage cap enforcement before upload | 🟥 `[BLOCKER]` | No quota guard on presigned URL route |
| AI credit cap enforcement | 🟥 `[MVP]` | `site_walk_usage_events` + `site_walk_usage_monthly` tables not created |
| `record_site_walk_usage()` Supabase function | 🟥 `[MVP]` | Not built |
| Usage metering UI (in settings / dashboard) | 🟥 `[P2]` | |

---

## Part 3 — SlateDrop (File Backbone)

SlateDrop is live and functional as a file browser. Key missing pieces:

| Item | Status | Notes |
|---|---|---|
| Browse tab (folder tree) | ✅ | Working |
| File preview (PDF, image, video) | ✅ | BUG-016 fully fixed |
| Secure send + external links | ✅ | Working |
| **Recents tab (real data)** | 🟥 `[MVP]` | Mock data only |
| **Shared tab (real data)** | 🟥 `[MVP]` | Mock data only — needs query of `slate_drop_links` sent by org |
| **Requests tab (real data)** | 🟥 `[MVP]` | Mock data only — needs query of files pending external upload |
| Site Walk auto-folder creation | 🟥 `[MVP]` | Bridge exists; folder structure not auto-created when session starts |
| Storage quota guard | 🟥 `[BLOCKER]` | |
| Collaborator-scoped file permissions | 🟥 `[P2]` | |

---

## Part 4 — Market Robot (Internal Tool)

| Item | Status | Notes |
|---|---|---|
| Route and auth gate | ✅ | `/market` — `canAccessMarket` |
| 6 tabs render | ✅ | Tab routing works, 0 TS errors |
| **Data wiring** | 🟥 `[CRITICAL]` | Orchestrator (`MarketClient.tsx`) passes dummy data to ALL tabs. 8 real hooks exist, 17 API routes exist — none wired to the UI. V2 rebuild approved. Wire orchestrator to hooks first, rebuild tabs one at a time. |
| Cleanup: delete orphan files | 🟥 | `components/dashboard/MarketClient.tsx` (old 75-line orphan), `components/dashboard/market/MarketRobotWorkspace.tsx` (unused 84 lines) |

---

## Part 5 — 360 Tours (App 2 — ~80% Done)

| Item | Status | Notes |
|---|---|---|
| Tour builder (core) | 🟡 | ~80% done per Master Build Plan |
| Scene reordering | 🟥 `[MVP]` | |
| Mobile viewing improvements | 🟥 `[MVP]` | |
| Sharing and branding polish | 🟥 `[MVP]` | |
| Site Walk → 360 scene reference | 🟥 `[P2]` | Phase 9 of Master Plan |
| "Open immersive context" in Site Walk deliverables | 🟥 `[P2]` | |

---

## Part 6 — Design Studio & Content Studio (Apps 3 & 4)

Both are stub pages only. Not a launch blocker. Build after Site Walk + 360 Tours are solid.

| Item | Status | Notes |
|---|---|---|
| Design Studio shell | 🟡 | Stub route `app/(apps)/design-studio/` |
| Content Studio shell | 🟡 | Stub route `app/(apps)/content-studio/` |
| Any real functionality | 🟥 | Phase 10 + 11 of Master Plan. Post-MVP. |

---

## Part 7 — Design & UI Consistency Gaps

| Item | Status | Notes |
|---|---|---|
| `--primary` CSS var still cobalt | 🟥 `[HIGH]` | Fix in `globals.css`. Propagates to ALL shadcn components + focus rings. Single edit. |
| Auth utilities still cobalt | 🟥 `[HIGH]` | `.auth-btn-primary`, `.auth-input:focus`, `.auth-link` in `globals.css` |
| `--app-glow-amber` vars wrong (contain cobalt rgba) | 🟥 `[HIGH]` | Misnamed. Fix rgba in `globals.css`. |
| `lib/email-theme.ts` still cobalt | 🟥 `[HIGH]` | `primary: "#3B82F6"` → change to `#F59E0B` |
| `lib/email-assignments.ts` inline cobalt bypass | 🟥 `[HIGH]` | ~line 52 |
| `lib/email-collaborators.ts` inline cobalt bypass | 🟥 `[HIGH]` | ~line 22 |
| Supabase auth email templates use old gold `#D4AF37` | 🟥 `[HIGH]` | Manual Supabase Dashboard edit |
| LandingHeader / LandingFooter / LoginModal raw `<img>` | 🟥 `[MEDIUM]` | Use `<SlateLogo>` / `<SlateLogoOnLight>` components instead |
| CollaboratorShell raw `<img>` logo | 🟥 `[MEDIUM]` | Use `<SlateLogo>` |
| `app/icon.svg` — `fill="#3B82F6"` hardcoded | 🟥 `[MEDIUM]` | Change to `fill="#F59E0B"` |
| 136 TSX files with cobalt hardcoded | 🟥 `[LOW]` | Long tail — fix when touching each file |
| Project Hub tool pages (9 files over 300 lines) | 🟥 `[MEDIUM]` | Each needs extraction + amber pass |
| `DESIGN.md` still documents cobalt as primary | 🟥 `[LOW]` | Update to amber |
| `UI_CONSISTENCY.md` still lists `#D4AF37` as brand | 🟥 `[LOW]` | Update — `DESIGN_SYSTEM.md` is now the canonical doc |

---

## Part 8 — Infrastructure & Security

| Item | Status | Notes |
|---|---|---|
| Resend email (transactional) | ✅ | Domain `slate360.ai` verified, key valid |
| Cloudflare R2 storage | ✅ | Wired via S3-compatible endpoint |
| AWS S3 storage | ✅ | Primary storage bucket |
| Vercel auto-deploy | ✅ | `main` branch auto-deploys |
| Market cron (`/api/market/scheduler/tick`) | ✅ | Every 5 min via `vercel.json` |
| **Upstash Redis (rate limiting)** | 🟥 `[BLOCKER]` | Not wired. Create free Upstash DB → add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to Vercel. |
| **Cloudflare Turnstile CAPTCHA** | 🟥 `[BLOCKER]` | Code live, keys not in Vercel. Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`. |
| **Supabase anon signup disable** | 🟥 `[BLOCKER]` | Manual: Supabase → Auth → Providers → Email → Disable new signups. |
| Google DrawingManager migration | 🟥 `[BUG-018]` | `LocationMap.tsx` must replace deprecated DrawingManager before **May 2026** or map drawing breaks in production. |
| PWA service worker (Workbox/Serwist) | 🟥 `[MVP for App Store]` | Asset caching, background sync. Phase 8 of Master Plan. |
| IndexedDB background sync on iOS | 🟥 `[MVP for App Store]` | iOS PWA does not support BackgroundFetch natively. |
| Sentry error monitoring | ✅ | `sentry.client.config.ts` exists |
| Account deletion endpoint | 🟥 `[BLOCKER for App Store]` | Apple requires this. Not built. |
| Resend quota check | 🟥 `[HIGH]` | Free tier is 3k/month. Upgrade to Pro ($20/mo) before ASU V1 launch. |

---

## Part 9 — Build Priority Order (For Other AI Assistants)

Work items in the order they unblock the most other items.

### Tier 1 — Security (do first, these are ACTIVE risk)

1. **Supabase Dashboard** → Auth → Email → Disable "Allow new users to sign up" (manual, 30 seconds)
2. **Upstash** → Create free Redis DB → add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to Vercel
3. **Cloudflare Turnstile** → Turnstile tab → Add site (`slate360.ai` + `localhost`) → add two Vercel env vars
4. Push security commit to GitHub (already committed, not pushed)

### Tier 2 — Design System (CSS + email — highest leverage single edits)

5. **`globals.css`** — fix `--primary`, `--ring`, `--app-glow-amber`, auth utilities to amber. Single file, propagates to ALL shadcn + auth.
6. **`lib/email-theme.ts`** — `primary: "#F59E0B"`. Fix inline bypasses in `email-assignments.ts` and `email-collaborators.ts`.
7. **Supabase Dashboard** → Auth → Email Templates → find/replace `#D4AF37` → `#F59E0B` (manual)
8. Fix 4 raw-img logo sites → use `<SlateLogo>` components

### Tier 3 — Site Walk MVP (the revenue app)

9. **Walk sessions list** — add `status=completed` filter + completed sessions query to `walks/page.tsx`
10. **Deliverable builder** — this is the biggest missing feature. Wire `BlockEditor.tsx` to `site_walk_items`, save to `site_walk_deliverables`. Minimal block types: photos + notes + item list.
11. **PDF generation** — integrate `@react-pdf/renderer` or Puppeteer/Playwright PDF route. Wire to deliverable builder.
12. **`/site-walk/present/[id]`** — digital viewer route (server-rendered, public, amber branded)
13. **`/site-walk/portal/[token]`** — token-gated external viewer
14. **Send by email/text** — wire deliverable to `lib/email-site-walk.ts` send flow
15. **Org branding form** — logo upload + colors in settings. Required before branded PDF.
16. **Metering engine** — storage quota guard on presigned URL; `site_walk_usage_events` table
17. **Completed sessions in walks list** — extend query + add filter tabs
18. **Plans multi-page PDF viewer** — H15/`PDF.js` layer for plan navigation

### Tier 4 — Platform Completeness

19. SlateDrop Recents / Shared / Requests tabs with real data
20. Org contacts picker UI wired to `org_contacts` table
21. Item-level threaded comments
22. Office → Field assignment creation UI
23. Active session dashboard card (live field sessions visible to leadership)
24. Notification system (`notifications` table + bell icon + realtime)

### Tier 5 — App Store Packaging

25. Account deletion route
26. Apple IAP compliance research (strategic decision needed)
27. PWA service worker (Workbox)
28. Wake lock for field sessions
29. Google DrawingManager migration (BUG-018 — May 2026 deadline)
30. Android TWA packaging
31. iOS native shell submission

---

## Part 10 — Assumptions for Other AI Assistants

### What you CAN assume is already built

- The authentication system works end-to-end
- The dark glass design shell is applied to dashboard, coordination, SlateDrop, and all Site Walk pages touched since session 2026-04-23
- All 14 amber-pass files are correct — do not revert their color changes
- `GlassCard` component is the canonical dark card primitive
- `SlateLogo` / `SlateLogoOnLight` are the canonical logo components — use them everywhere, never raw `<img>`
- `lib/email-theme.ts` is the single source for all email colors
- The 4-tier entitlement system (`trial < standard < business < enterprise`) is in `lib/entitlements.ts` — use `getEntitlements()` for all gates
- App Store mode (`NEXT_PUBLIC_APP_STORE_MODE`) hides unfinished apps from all nav surfaces

### What you MUST NOT do

- Do not add `"use client"` unnecessarily — server components first
- Do not use `any` — use `unknown` + narrowing
- Do not write inline hex colors in TSX — use Tailwind classes or `EMAIL_COLORS` constants
- Do not write API routes without `withAuth()` or `withProjectAuth()` from `@/lib/server/api-auth`
- Do not redefine types inline — import from `lib/types/`
- Do not write files over 300 lines — extract first
- Do not use `project_folders` for anything other than project folder writes (not file folders)
- Do not use mock data in production UI — show empty states
- Do not use `#3B82F6` (cobalt) for any new UI element — use amber `#F59E0B` (or `bg-amber-500`)
- Do not use `text-white` on amber backgrounds — use `text-slate-950` (amber is light)

### Key file paths every assistant should know

| Purpose | File |
|---|---|
| Design tokens / color system | `slate360-context/DESIGN_SYSTEM.md` |
| Product direction | `SLATE360_MASTER_BUILD_PLAN.md` |
| Current handoff | `SLATE360_PROJECT_MEMORY.md` (Latest Session Handoff section) |
| Site Walk feature registry | `slate360-context/dashboard-tabs/site-walk/FEATURE_REGISTRY.md` |
| Active bugs | `slate360-context/ONGOING_ISSUES.md` |
| Entitlements | `lib/entitlements.ts` |
| Auth wrappers | `lib/server/api-auth.ts` |
| Response helpers | `lib/server/api-response.ts` |
| Email colors | `lib/email-theme.ts` |
| Brand logo (dark bg) | `components/shared/SlateLogo.tsx` |
| Brand logo (light bg) | `components/shared/SlateLogoOnLight.tsx` |
| GlassCard component | `components/shared/GlassCard.tsx` |
| Site Walk sessions API | `app/api/site-walk/sessions/` |
| Site Walk items API | `app/api/site-walk/items/` |
| Offline queue | `lib/site-walk/draft-store.ts`, `lib/hooks/useSiteWalkOfflineSync.ts` |
| Realtime updates | `lib/hooks/useSiteWalkRealtime.ts` |
| Plan viewer hook | `lib/hooks/usePlanViewer.ts` |
| Markup types | `lib/site-walk/markup-types.ts` |
| SlateDrop bridge | `lib/site-walk/slatedrop-bridge.ts` |
| Market orchestrator | `components/dashboard/market/MarketClient.tsx` |
| Globals / CSS vars | `app/globals.css` |
