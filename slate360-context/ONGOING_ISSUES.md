# Slate360 — Ongoing Issues & Known Tech Debt

**Last Updated:** 2026-05-01 (App shell / Site Walk cockpit triage)
**Maintained by:** Development team — update whenever a bug is discovered or fixed.
**Cross-reference:** See `FUTURE_FEATURES.md` for the full phased build roadmap (Phases 0–7).

---

## Critical / Blocking

| ID | Module | Description | Severity | Status |
|---|---|---|---|---|
| BUG-010 | Project Hub / Wizard + Dashboard LocationMap | **Project Location Wizard — multiple failures:** (1) Steps verified correct (4 steps); (2) **Places Autocomplete — FIXED:** Places API (New) confirmed enabled Mar 4 2026, geocoder fallback added for 403s, **and** autocomplete `useEffect` dependency bug fixed Mar 2026: `useMapsLibrary("places")` return value was discarded so autocomplete effects never re-ran when the places library finished loading — now captured as `placesLib` and added to all 4 autocomplete effect dependency arrays (`WizardLocationPicker` + `LocationMap` ×3); (3) Premature wizard close — **FIXED** via `if (step !== TOTAL_STEPS) return;` guard; (4) ~~step-3 canAdvance false gate~~ — **FIXED Mar 4 2026**: location step is now always passable (optional per spec); (5) ~~Polygon DrawTool type hack~~ — **FIXED Mar 4 2026**: `DrawTool` union extended to include `"polygondraw"`. | High | ✅ Fixed |
| BUG-011 | Dashboard / All Tabs | **Inconsistent top-bar navigation:** ~~Dashboard had duplicate custom header~~ — **FIXED.** Extracted `DashboardHeader` (`components/shared/DashboardHeader.tsx`, ~280 lines). Both `DashboardClient` and `DashboardTabShell` now use the same shared header with identical QuickNav, notifications, customize, and user menu. | High | ✅ Fixed |
| BUG-012 | Dashboard / SlateDrop Widgets | **SlateDrop widget incorrect behavior:** (1) ~~When in a project Files tab, UI rendered as screen-within-a-screen~~ — **FIXED** via `embedded` prop on `SlateDropClient`; (2) ~~Dashboard widget expanded + floating window now also pass `embedded`~~ — **FIXED**; (3) ~~In-project widgets (Project Hub Tier 2) used a separate root-folder mini-UI when not expanded~~ — **FIXED** by rendering the embedded `SlateDropClient` widget body in all widget sizes/contexts; (4) Widget shell still renders "Open SlateDrop" CTA even in embedded mode — see BUG-019. | Medium | 🟡 Mostly Fixed — see BUG-019 |
| BUG-014 | Dashboard / Project Creation | **"New Project" button context is wrong:** ~~Clicking "New Project" from the dashboard navigated to `/project-hub`~~ — **FIXED.** Both "New Project" buttons (header + carousel card) now open `CreateProjectWizard` inline on the dashboard with project creation + automatic widget data refresh on success. Future: per-module project wizards for Design Studio, etc. | Medium | ✅ Fixed |
| BUG-015 | Market Robot | **Market Robot page blank — `WagmiProviderNotFoundError`:** Page renders `<MarketClient />` directly without `<MarketProviders>` (Web3/wagmi context wrapper). Wagmi hooks inside `MarketClient` crash because there is no `WagmiProvider` in the render tree. **Attempt history:** Issue 11 mitigation (prior session) moved Web3 from root layout to `app/market/MarketProviders.tsx` — but `app/market/page.tsx` was never updated to actually USE `MarketProviders`. Fix appears in git commits but was not applied to the page itself. **Fix applied 2026-03-04:** Wrapped `<MarketClient />` with `<MarketProviders>` in `app/market/page.tsx`. | Critical | ✅ Fixed |
| BUG-016 | SlateDrop / File Preview | **File preview was downloading instead of opening inline.** Two-layer fix required: (1) **CSP layer:** `frame-src` extended with `https://*.amazonaws.com` and `blob:` — iframes unblocked. (2) **Root cause (session 3 — BUG-020):** `app/api/slatedrop/download/route.ts` hardcoded `ResponseContentDisposition: 'attachment'` on ALL presigned URLs — this forced the browser to download even inside an `<iframe>`, bypassing any CSP fix entirely. Fixed by adding `mode` query param: `mode=preview` → `inline; filename="..."` disposition; default → `attachment`. `SlateDropClient` preview fetch now calls `/api/slatedrop/download?fileId=...&mode=preview`. Preview modal now supports PDF/images/video/audio and falls back to iframe where possible. | High | ✅ Fully Fixed (CSP + S3 disposition both fixed) |
| BUG-017 | Dashboard | **React Hydration Error #418 — FULLY FIXED:** `isClient` is declared as `useState(false)` at line 479. `loadWidgetPrefs()` is called inside a `useEffect` at line 570 (same effect that sets `isClient(true)` and `setCalMonth/setCalYear`). All `new Date()` calls in JSX are guarded by `isClient &&`. The fix is complete — no decomposition needed for this specific bug. | High | ✅ Fully Fixed |
| BUG-018 | LocationMap | **DrawingManager deprecation — `LocationMap.tsx` confirmed source (not WizardLocationPicker):** `components/dashboard/LocationMap.tsx` uses `useMapsLibrary("drawing")` at line 194 and `new drawingLib.DrawingManager(...)` at line 459 with `APIProvider libraries={["places", "drawing", "geometry"]}` at line 1479. The `WizardLocationPicker` does NOT use the drawing library. **Migration deadline: May 2026** when Google removes the library. Scope: replace DrawingManager marker/polyline/polygon/rectangle/circle drawing with custom native `google.maps` click-based implementations. This is a ~400-line change within the 1624-line file. See `slate360-context/BACKEND.md §9b` for the migration approach. | High | 🔴 Open — May 2026 deadline |
| BUG-019 | SlateDrop Widgets | **"Extra Open SlateDrop" click required — root cause confirmed:** The `embedded` prop was added to `SlateDropClient` to remove the screen-within-a-screen layout. But the "Open SlateDrop" CTA button lives in the widget ***shell*** (not inside `SlateDropClient`), so the shell still renders the button even when the client is embedded. The shell and the client treat `embedded` as two separate concerns — the shell doesn't know the client is already visible. **Fixes applied Mar 4 2026:** (1) Dashboard + Project Hub SlateDrop widgets now share `SlateDropWidgetBody` and render embedded `SlateDropClient` in-widget (no separate root-folder mini UI); (2) Project Hub widget grid now uses `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`, which restores true large-width behavior (`lg` spans 3 columns at `xl`) instead of only growing downward. **Remaining:** remove redundant shell CTA where embedded content is already visible. | Medium | 🟡 Mostly Fixed |
| BUG-039 | Site Walk / Capture | **Image disappeared when returning from Data to Visual — FIXED 2026-04-30:** `CameraViewfinder` revoked local blob preview URLs even though active capture items still needed those URLs while server image routes were not ready. Fixed by preserving capture preview URLs across Visual/Data navigation and using a shared `getCaptureImageUrl()` fallback in Visual/Data surfaces. | Critical | ✅ Fixed |
| BUG-040 | Site Walk / Capture | **Pinned files could not be previewed — FIXED 2026-04-30:** The pinned attachments sheet only allowed removal. It now lists each pinned file as a previewable chip, fetches a SlateDrop preview URL, opens images/iframes in a modal, and includes an Open full file fallback. | High | ✅ Fixed |
| BUG-041 | Site Walk / Capture | **iOS long-press and zoom conflicted with canvas pins — FIXED 2026-04-30:** The markup canvas now suppresses iOS selection/callouts and native touch gestures on the canvas root, while custom pinch/wheel zoom updates the shared transform even in markup mode. | Critical | ✅ Fixed |
| BUG-042 | Site Walk / Capture | **Markup pencil disengaged and shape selection was unreliable — FIXED 2026-04-30:** Freehand draw now stays active after each stroke. Select mode uses bounding-box hit detection, selected shapes show a cyan bounds/handle overlay, and selected shapes can be moved/resized without relying only on SVG stroke taps. | High | ✅ Fixed |
| BUG-043 | Site Walk / Capture | **Attachment markers could not be dragged and marker thumbnail affordance was missing — FIXED 2026-04-30:** Saved paperclip markers no longer require a delayed long-press before movement; touch-drag starts immediately after a small movement and release saves the updated coordinates. Marker popovers now show a right-side `View` tile with image thumbnail/file fallback that opens the large preview modal. | High | ✅ Fixed |
| BUG-044 | Site Walk / Capture | **Markup selection popup was detached and resize handles were not functional — FIXED 2026-04-30:** Removed the floating plus/minus/delete canvas popup. Selected markup now resizes from the cyan corner handles, and the markup toolbar owns selected-shape color, stroke width, and delete controls. | High | ✅ Fixed |
| BUG-045 | Site Walk / Capture | **Attachment edit panels and preview modal were not mobile-contained — FIXED 2026-04-30:** New/edit attachment panels opened at the bottom of the capture and could be cut off by lower markup controls. The marker file preview opened too large and made close controls hard to reach. Panels now open centered in the capture with scroll safety, and previews are smaller with a persistent close button plus image pinch/drag zoom. | High | ✅ Fixed |
| BUG-046 | Site Walk / Capture | **Attachment preview gestures leaked to the capture and attachments could appear missing — FIXED 2026-04-30:** The marker preview modal did not stop pointer/wheel events from bubbling to the capture canvas, so pinch gestures could zoom the photo behind the modal. Attachment rendering also only read metadata pins, missing persisted `photo_attachment_pins` fallback data. Preview events are now isolated, the modal is smaller with a prominent close button, and the capture canvas/Attached sheet resolve pins from metadata or persisted item pins. | High | ✅ Fixed |
| BUG-047 | Site Walk / Capture | **Marker preview zoom could crash and capture preview felt delayed — FIXED 2026-04-30:** The marker preview zoom handlers used pointer capture on mobile, which can throw DOM pointer-capture errors during multi-touch transitions and trigger the global error screen. The preview card also still used viewport sizing instead of strictly fitting the capture stage. The modal now avoids pointer capture, stays as a fixed small contained card, caps zoom at 4x, and camera captures show the original file preview immediately while compression/upload continues in the background. | High | ✅ Fixed |
| BUG-048 | Site Walk / Capture | **Add Details returned to “Capture a photo first” after upload reconciliation — FIXED 2026-04-30:** The active capture resolver only matched `activeItemId` against `item.id`. When an optimistic local item was replaced by the server row, the row kept `client_item_id` but `activeItemId` could still be the local client id, so the Data page thought no active photo existed. `useCaptureItems` now resolves the active item by either server id or `client_item_id`, preserving the captured thumbnail and notes/details flow after markup or pinned-file saves. | Critical | ✅ Fixed |
| BUG-049 | Dashboard / Site Walk Mobile Shell | **Phone screens were locked and bottom actions could be cut off — FIXED 2026-04-30:** The authenticated shell and Site Walk details surfaces treated “native app shell” as `overflow-hidden` at too many levels. Small phone heights could hide lower content/actions behind the mobile nav with no contained scroll escape. `AppShell`, the Site Walk landing page, and `DataContextView` now keep the outer shell fixed while moving scrolling into `min-h-0 flex-1 overflow-y-auto` panes with mobile bottom padding. | Critical | ✅ Fixed |
| BUG-050 | Site Walk / Deliverables | **Deliverable metadata visibility controls are schema-ready but not wired — OPEN 2026-05-01:** `site_walk_deliverables.viewer_config` and `organizations.brand_settings` can store hide/show preferences for GPS, weather, timestamps, assignee, and cost impact, and the deliverable create/update APIs already accept `viewer_config`. The missing piece is a Deliverable Studio UI contract and public-viewer enforcement that reads/writes `viewer_config.metadataVisibility` per deliverable with org defaults as a fallback. | Medium | 🔴 Open |
| BUG-051 | App Shell / Navigation | **App Store mode exposed unfinished app surfaces — FIXED 2026-05-01:** Several reviewer-facing app launch surfaces showed 360 Tours, Design Studio, and Content Studio with Soon pills instead of hiding them. Added shared App Store mode filtering (`NEXT_PUBLIC_APP_STORE_MODE` defaults on unless explicitly `false`) across command palette, app grid, sidebar, and shared navigation. | High | ✅ Fixed |
| BUG-052 | Operations Console / Feedback | **Feedback intake schema could drift from owner inbox — FIXED 2026-05-01:** Migration history had both legacy `category`/`replay_url` and newer `type`/`app_area`/`console_errors` feedback contracts. Added a reconciliation migration that makes the current `/api/feedback` insert and Operations Console inbox/counts reliable, and the modal now sends an app-area hint from the current path. | High | ✅ Fixed |
| BUG-053 | App Shell / Site Walk / SlateDrop / Coordination | **Dark shell surfaces looked like disconnected white web pages — FIXED 2026-05-01 triage:** The authenticated shell mixed a dark native-app frame with white cards, tiny single-app launcher tiles, duplicate bottom padding, filler secondary pages, and capture defaults like `Current location`. Triage converted the Command Center, Site Walk home, More, Coordination, SlateDrop, and Site Walk files surfaces toward consistent Dark Glass; made `/site-walk` a Field-Work Cockpit; hid inactive SlateDrop app-folder placeholders in App Store mode; replaced default location copy with `Stop 1`; and made Save & Next capture the next stop immediately instead of forcing a modal. | Critical | ✅ Fixed — triage pass; deeper Projects/SlateDrop browser rebuild still pending |

---

## Console Errors (Logged 2026-03-04 — Root Cause Audit v2)

| Error | Source | Root Cause | Status | Fix |
|---|---|---|---|---|
| `Uncaught Error: Minified React error #418` | Hydration mismatch in production bundle | `DashboardClient` reads `localStorage` and `new Date()` before client hydration. **FULLY FIXED:** `isClient` is declared, `loadWidgetPrefs()` is inside `useEffect`, all `new Date()` calls guarded by `isClient &&`. | ✅ Fixed | Full fix confirmed — `useState(false)` + `useEffect` mount effect. |
| `Drawing library functionality in the Maps JavaScript API is deprecated` | `LocationMap.tsx` (NOT WizardLocationPicker) | **Root cause confirmed:** `components/dashboard/LocationMap.tsx` line 194 calls `useMapsLibrary("drawing")` and line 1479 includes `"drawing"` in APIProvider libraries. `WizardLocationPicker` only loads `["places","geocoding"]`. This warning will become a **break** in May 2026 when Google removes the library. | 🔴 BUG-018 (May 2026 deadline) | Full DrawingManager migration required in `LocationMap.tsx`. See BACKEND.md §9b. |
| `satellite and hybrid map types will no longer automatically switch to 45° Imagery` | Maps JavaScript API | Informational deprecation — no code change required yet. Not actionable until Maps JS API version bump. | ℹ️ Info only | Monitor for Maps JS API version bump. |
| `tiltInteractionEnabled and headingInteractionEnabled only have an effect on vector maps` | Maps JS API | Map instances don't use vector map type. Setting `tilt`/`heading` on raster maps is a no-op. Minor — fix by only setting these props when `mapTypeId` is a vector type. | ℹ️ Low | Conditionally set tilt/heading only for vector map type. |
| `places.googleapis.com/…/AutocompletePlaces: 403 Forbidden` | `WizardLocationPicker.tsx` + `LocationMap.tsx` | Places API (New) confirmed enabled in Google Cloud Console Mar 4 2026. **Session 3 geocoder fallback:** Both `WizardLocationPicker` and `LocationMap` (origin + dest) now catch 403s and fall back to `Geocoder.geocode()` (Geocoding API — confirmed enabled). Address search degrades to forward geocoding rather than empty results. | 🟡 Gracefully degraded | If 403s still appear: check HTTP referrer restrictions on API key in Google Cloud Console include `localhost:*` + production domain. |
| `WagmiProviderNotFoundError: useConfig must be used within WagmiProvider` | `/market` page → `MarketClient` | `app/market/page.tsx` rendered `<MarketClient />` without `<MarketProviders>` wrapper. Web3/wagmi providers existed in `MarketProviders.tsx` but were never used at the page level — previous session's "fix" created the file but forgot to wire it. | ✅ Fixed | `app/market/page.tsx` now wraps content in `<MarketProviders>`. |
| `Framing '*.amazonaws.com' violates Content-Security-Policy frame-src` | SlateDrop file preview | `frame-src` only allowed `cdn.pannellum.org`. Fixed: added `https://*.amazonaws.com` + `blob:`. **Note:** CSP alone was insufficient — `ResponseContentDisposition: attachment` in the download route was also sending `Content-Disposition: attachment` at the S3/HTTP level, overriding any frame policy. Both layers fixed (see BUG-016/BUG-020). | ✅ Fully Fixed | `blob: https://*.amazonaws.com` in `frame-src` + download route now uses `inline` disposition for preview mode. |

---

## Pattern: Why Fixes Don't "Stick" — Root Cause Analysis (v2 — Sonnet 4.6 Deep Audit, Mar 4 2026)

### Structural Root Cause #1 — Monolith Files Exceed LLM Context Window

**Status (2026-03-28): Largely resolved.** The four worst monoliths have been decomposed:

| File | Before | After | Status |
|---|---|---|---|
| `DashboardClient.tsx` | 2,800+ | 264 | ✅ Fixed (Phase 4) |
| `SlateDropClient.tsx` | 2,030 | 282 | ✅ Fixed (7 sub-hooks) |
| `useDashboardState.ts` | 775 | 244 | ✅ Fixed (6 sub-hooks) |
| `MarketClient.tsx` | — | 175 | ✅ Under limit |
| 9 Project Hub tool pages | 300–934 | Unchanged | ⚠️ Still over limit |

**Why this causes fixes to fail:** An AI session patches the part of the file it can see. The coupling effect (wrong state var, missing import, wrong guard scope) exists outside the visible window. The patch compiles but does the wrong thing at runtime.

### Structural Root Cause #2 — External Configuration Not In Codebase

Some bugs required Google Cloud Console changes that cannot be made by editing code. **Status as of Mar 4 2026:**

| Bug | External Action | Status |
|---|---|---|
| BUG-010: Places API 403 | Enable "Places API (New)" in Google Cloud Console | ✅ Confirmed enabled Mar 4 2026 — 403s should resolve |
| DrawingManager deprecation in LocationMap.tsx | Source is code, not config. Must replace DrawingManager with native drawing | 🔴 Code migration required before May 2026 |
| CSP frame-src S3 block | Code-side fix: `blob: https://*.amazonaws.com` added to `frame-src` | ✅ Fully fixed |

**Lesson:** Before labeling a bug as "external", confirm whether the API key's HTTP referrer restrictions OR the API enablement is the issue. Separate code bugs from console config bugs.

### Structural Root Cause #3 — Session-Boundary "Almost Fixes"

Code that appears fixed in git history but wasn't:

| Session | What was created | What was skipped | Effect |
|---|---|---|---|
| Prior | `MarketProviders.tsx` created | `app/market/page.tsx` never imported it | Error persisted unchanged |
| Prior | `isClient &&` conditionals added to `DashboardClient.tsx` JSX | `const [isClient, setIsClient] = useState(false)` never added | `ReferenceError` crash — worse than before |
| Prior | `frame-src` CSP extended for S3 | `blob:` origin not added | PDF/image inline preview still broken |
| Prior | `submit()` guard `if (step !== TOTAL_STEPS) return` added | `canAdvance` for step 3 allows advance with empty location — user can skip location step | Wizard creates projects with no location data |

### Structural Root Cause #4 — Polygon Tool Type Hack Bug (BUG-010 variant, found Mar 4 2026)

**File:** `components/project-hub/WizardLocationPicker.tsx`

The polygon drawing tool uses a non-existent draw state string `"polygondraw"` cast as `DrawTool`:

```typescript
// DrawTool type has: "select" | "marker" | "polygon" — NOT "polygondraw"
toolRef.current = "polygondraw" as DrawTool;  // set in activateTool()
if (currentTool === ("polygondraw" as DrawTool)) { ... }  // checked in map click handler
```

This technically works at runtime because the ref stores strings and the comparison is a string match — but it is fragile, bypasses TypeScript's exhaustive check on `DrawTool`, and makes future refactoring hazardous. The `DrawTool` union type should include `"polygondraw"` or the internal state should be separate from the public type.

### Structural Root Cause #5 — Drawing Library Source Was Misidentified

The `WizardLocationPicker` correctly passes `libraries={["places", "geocoding"]}` to `<APIProvider>` — it does NOT load the `drawing` library.

**Confirmed Mar 4 2026:** The deprecation warning `Drawing library functionality in the Maps JavaScript API is deprecated` comes from `components/dashboard/LocationMap.tsx`:
- Line 194: `const drawingLib = useMapsLibrary("drawing")`
- Line 1479: `<APIProvider apiKey={mapsApiKey} libraries={["places", "drawing", "geometry"]}>`

This was previously blamed on the Geospatial module, which is actually a "coming soon" placeholder with no map. The misidentification caused multiple sessions to look in the wrong file.

**Fix path:** Migrate `LocationMap.tsx` DrawingManager usage (markers, polylines, polygons, rectangles, circles) to native `google.maps` click-based implementations following the `WizardLocationPicker.tsx` pattern. Deadline: May 2026.

### Structural Root Cause #6 — React Hydration #418 (BUG-017) — CONFIRMED FULLY FIXED

**Status: ✅ Fixed.** Code audit Mar 4 2026 confirmed:
1. `const [isClient, setIsClient] = useState(false)` declared at line 479 of `DashboardClient.tsx`
2. `loadWidgetPrefs()` is called in a `useEffect` at line 570 (alongside `setIsClient(true)`, `setCalMonth`, `setCalYear`)
3. All `new Date()` render-time calls guarded by `isClient &&`

This bug was previously marked only "mitigated" because we couldn't see the full 2,800-line file in one context window. The actual fix was already in place. Pattern lesson: **before reporting a fix as incomplete, read the full file.**

### Structural Root Cause #7 — SlateDrop Widget "Extra Click" Problem (BUG-012 still partial)

The `embedded` prop was added to `SlateDropClient`. However, the "extra Open SlateDrop" button behavior persists because:

- There are multiple widget entry points: dashboard widget, Project Hub Tier 2 widget, and the standalone SlateDrop page.
- The widgets render their own "Open SlateDrop" CTA button BEFORE checking if the full client is already embedded.
- The widget shell and the client-level `embedded` prop serve different layout concerns — the outer widget still shows the button because the button is in the widget *shell*, not inside `SlateDropClient` itself.

**Fix path:** The widget shell needs to conditionally render: if `embedded={true}` is passed to the widget, the shell should skip the "Open SlateDrop" CTA and go straight to the client view.

---

## Previous Pattern Table (kept for reference)

Several fixes in this project appear in commit history but don't fix the production issue. The recurring patterns are:

| Pattern | Example | Root Cause |
|---|---|---|
| **Fix created the structure but didn't wire it** | `MarketProviders.tsx` created but never imported in `page.tsx` | Session ended before the last step of "use this thing" was done |
| **Fix landed in one component but the component itself isn't used** | `isClient` guard added, but `isClient` never declared in scope | Apply-patch script ran against wrong context / search string didn't match |
| **CSP is hardened for one directive but the related directive is missed** | `connect-src` allows S3 uploads but `frame-src` blocks S3 previews | CSP directives are treated as one-time fixes rather than per-feature audits |
| **Hydration guard added in JSX but not at state level** | `isClient &&` in render, but `useState` for `isClient` missing above it | File is 2,800 lines — the guard was added mid-file without checking the top |
| **Build passes locally but OOM-kills on Vercel** | All code changes were committed but Vercel deployments were silently failing with Exit 143 | Default Node.js memory settings too low for Next 15 production builds; `memoryBasedWorkersCount` experiment and `ignoreBuildErrors` added to `next.config.ts` |

---

## Prioritized Remediation Path (to actually make fixes stick)

These are the minimum steps needed before any new feature work. Without these, every fix remains fragile.

### ✅ Step 1 — External Actions (DONE Mar 4 2026)
1. **Google Cloud Console:** Places API (New) confirmed enabled on `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — fixes BUG-010 autocomplete 403 permanently.
2. **CSP audit:** Added `blob:` to `frame-src` in `next.config.ts` — fixes inline PDF preview. ✅

### ✅ Step 2 — Fix BUG-010 canAdvance skip (DONE Mar 4 2026)
Location step is now genuinely optional — `canAdvance` for step 3 is always `true`. Also:
- `DrawTool` union now includes `"polygondraw"` — no more `as DrawTool` casts in `WizardLocationPicker.tsx`. ✅

### 🔴 Step 3 — Fix BUG-018 (DrawingManager migration in `LocationMap.tsx`)
**Root cause corrected:** Source is `components/dashboard/LocationMap.tsx` lines 194 + 1479 — NOT the Geospatial module (which is a "coming soon" stub with no map). Migration deadline: **May 2026** (Google removes the library). Scope: replace DrawingManager marker/polyline/arrow/polygon/rectangle/circle with native `google.maps` click-based implementations across ~400 lines. See `BACKEND.md §9b` for the approach reference (WizardLocationPicker pattern).

### ✅ Step 4 — Fix BUG-017 fully (CONFIRMED ALREADY DONE)
Code audit Mar 4 2026 confirmed `loadWidgetPrefs()` IS inside `useEffect` at line 570 and `isClient` state IS declared at line 479 in `DashboardClient.tsx`. No further action needed.

### 🔴 Step 5 — Fix BUG-019 (SlateDrop widget extra click)
In the dashboard widget shell and Project Hub widget shell: when `embedded={true}`, do NOT render the "Open SlateDrop" CTA button — render the `SlateDropClient` directly. Unify the two widget families into one shared `SlateDropWidget` component.

### ✅ Step 6 — Decompose the monoliths (DONE for Dashboard + SlateDrop)
The main monoliths are now under limits: DashboardClient (264), SlateDropClient (282), useDashboardState (244). 9 Project Hub tool pages remain over 300 lines but are not critical path.

---

## Active Bugs

| ID | Module | Description | Severity | Status |
|---|---|---|---|---|
| BUG-001 | SlateDrop | `file_folders` table still used in Design Studio, export-zip, audit, and cross-tab service — Phase 2 migration to `project_folders` pending | Medium | ⚠️ Pending |
| BUG-002 | Geospatial | Google Routes API blocked by key restrictions — using OSRM fallback for routing | Low | ⚠️ Workaround |
| BUG-003 | Project Hub | Tier 3 tool views (RFIs, Submittals, etc.) — stub pages existed, now enhanced — DB schema must match client field expectations | Medium | ✅ Resolved (Jan 2025) |
| BUG-013 | Project Hub | **Missing high-level analytics snapshot:** The Project Hub Tier 1 (all-projects view) previously had a high-level analytics/snapshot section (project count, budget totals, active RFIs, etc.). This view is lost. It should be restored as a dedicated section card at the top of the Tier 1 grid page (`app/(dashboard)/project-hub/ClientPage.tsx`). No API currently aggregates these counts — a `GET /api/projects/summary` route needs to be added. | Medium | 🔴 Open |
| BUG-018 | Dashboard / LocationMap | **DrawingManager deprecated — source is `LocationMap.tsx`, NOT Geospatial module:** Geospatial module is a "coming soon" stub with no map. `components/dashboard/LocationMap.tsx` line 194: `useMapsLibrary("drawing")`; line 459: `new drawingLib.DrawingManager(...)`; line 1479: `<APIProvider libraries={["places","drawing","geometry"]}>`. Migration deadline: **May 2026** when Google removes the library. Scope: replace DrawingManager marker/polyline/polygon/rectangle/circle drawing with native `google.maps` click-based implementations (~400-line change in 1,624-line file). Follow `WizardLocationPicker.tsx` click-based pattern. | High | 🔴 Open — May 2026 deadline |
| BUG-019 | SlateDrop Widgets | **SlateDrop widget requires extra "Open SlateDrop" click:** `embedded` prop on `SlateDropClient` fixed the screen-within-screen layout, but the widget *shell* still renders its own CTA button above the embedded client. Also, dashboard widgets and in-project (Tier 2) widgets have diverged in styling. | Medium | 🔴 Open |
| BUG-020 | SlateDrop / File Preview | **PDF files downloaded instead of opening inline preview.** Root cause: `app/api/slatedrop/download/route.ts` set `ResponseContentDisposition: 'attachment'` on ALL presigned URLs — forced browser to download regardless of iframe context. **Fixed session 3:** Added `mode` param; `mode=preview` → `inline` disposition. `SlateDropClient.fetchPreviewUrl` now calls `&mode=preview`. See FIX-016. | High | ✅ Fixed — session 3 |
| BUG-021 | Location / Multiple Views | **Location widgets are inconsistent across the platform.** `WizardLocationPicker` (project creation step 3), `LocationMap` (dashboard widget), project address display in card/list views, and Project Hub Tier 2 project home all render location data differently with no shared component. Visual inconsistency and potential data mapping mismatches. Needs: (1) audit all 4 contexts, (2) extract a shared `LocationDisplay` component or align styles/data contract. | Medium | 🔴 Open — investigation pending |
| BUG-027 | Phase 1 Visible Surfaces | **Owner-facing Phase 1 shells are no longer safe patch targets.** The active Web Command Center (`/dashboard`), Projects list (`/projects`), Project detail home (`/projects/[projectId]`), and project-scoped SlateDrop (`/projects/[projectId]/slatedrop`) now require controlled blank-canvas replacement work rather than incremental cosmetic cleanup. Preserve working backend/data contracts: auth guards, scoped project lookup, usage-truth APIs, project summary loaders, folder provisioning, upload/download/share handlers, and project-to-SlateDrop bridges. The `/dashboard` route has now been detached from the old card stack and swapped to a simple proof shell through `CommandCenterContent`, proving that the live visible surface is under direct control. Remaining replacement targets are still the Projects directory composition (`ClientPage`, `ProjectsAllProjectsTab`, `CreateProjectWizard`), the Project detail home visible overview, and the current SlateDrop explorer shell/subcomponents. Hidden `/project-hub/[projectId]/*` wrapper-backed tool pages remain the largest legacy contamination source beneath `/projects/[projectId]/*`. | High | 🟡 In Progress — `/dashboard` proof shell active; remaining surfaces not started |
| BUG-026 | Market Robot | **Market Robot still feels unreliable because the remaining problem is architectural, not just UI.** March 11 delivered search/runtime visibility improvements, and **Mar 12 Rescue Batch 1** added a truthful four-section shell, server-grounded dashboard overview cards, re-homed Saved Markets and wallet/live-readiness access, and explicit manual-buy fallback messaging (`Live execution blocked. Executed as Paper Trade.`). Those fixes improve honesty and reachability, but they do not close the deeper issue. Market execution/config state is still fragmented across `market_plans`, legacy directives/runtime metadata, `market_bot_runtime`, scheduler paths, and wallet/live-trade prerequisites. Search is still lexical-only on current Gamma payloads, so "complete Polymarket search/filter/sort" plus trend/upset/history features are not implemented yet. Requested features like moonshot bundles/history, posted-probability-vs-outcome tracking, and a persistent recommendation-history system remain absent rather than merely hidden. | High | 🔴 Open — project-level consolidation still needed |
| BUG-030 | Site Walk | **Plan viewer image route was missing.** `PlanViewer.tsx` requested `/api/site-walk/plans/[id]/image`, but no endpoint existed to turn the stored `site_walk_plans.s3_key` into a browser-loadable image URL. **Fixed 2026-04-18:** added `app/api/site-walk/plans/[id]/image/route.ts`, which verifies org scope and redirects to a signed inline S3 URL for the plan asset. | Critical | ✅ Fixed |
| BUG-031 | Projects / collaborators | **Several project helper APIs still assumed org membership after collaborator access was added.** Routes like recent files, saved records, photo reports, and management document/report helpers used `organization_members` lookups to derive scope, which could break project-member-only flows even when the user had valid `project_members` access. **Fixed 2026-04-18:** those routes now derive effective org scope from the resolved project or `withProjectAuth`. | Critical | ✅ Fixed |
| BUG-037 | Site Walk / Capture | **Mobile capture canvas reset during markup/pins.** Root cause was a combined mobile state loop: `PhotoMarkupCanvas` re-emitted markup on parent rerenders, reset local shapes when optimistic item updates changed `initialMarkup`, `CameraViewfinder` could revoke then reuse the blob preview when the server item replaced the local optimistic item, and the parent workspace still allowed swipe gestures in capture task mode. **Fixed 2026-04-29:** markup emits only when local shapes change, canvas resets only on image changes, blob previews are preserved across upload reconciliation, and capture mode disables swipe paging in favor of explicit Next/Back controls. | Critical | ✅ Fixed |
| BUG-038 | Site Walk / Capture | **Pinned files did not appear and Data page implied extra angles were required.** Root cause was initial item loading replacing the local optimistic photo list instead of merging, so a just-captured active photo could disappear during upload/reconciliation. Pins also required a separate Save action after upload and rendered as tiny untransformed markers, making them look missing. **Fixed 2026-04-29:** fetched items merge into current items, file upload auto-saves the pin, pins update locally immediately, markers are larger and follow the canvas transform, and the Data page now offers Done with this photo rather than forcing another same-location/angle capture. | Critical | ✅ Fixed |
| BUG-032 | SlateDrop / storage | **Cloudflare R2 browser uploads were blocked by missing bucket CORS.** The app CSP and storage client changes were correct, but direct browser PUTs to presigned R2 URLs still failed until the Cloudflare bucket returned the right CORS headers for the Slate360 origin. **Fixed 2026-04-18:** after the bucket rule was added, the public upload/share smoke test passed the presigned PUT and the full public R2 flow completed successfully. | High | ✅ Fixed |
| BUG-033 | SlateDrop / sharing | **Share-link creation drifted from the live `unified_files` foreign key.** The repo tracked `slate_drop_links.file_id -> slatedrop_uploads(id)`, but the live database already enforced `slate_drop_links.file_id -> unified_files(id)`. That broke public share-link creation after uploads succeeded. **Fixed 2026-04-18:** added a tracked `unified_files` migration, a `slatedrop_uploads.unified_file_id` bridge column, upload-completion bridging, secure-send bridging, and a share-page `unified_files` read path with a legacy fallback. | Critical | ✅ Fixed |
| BUG-034 | Homepage / public shell | **Public-facing shells drifted away from the app brand system.** The live homepage header/mobile sheet, shared public navbar/footer, public app-detail pages, and branded deliverable portal still used hardcoded white, gray, zinc, and yellow classes plus repeated raw logo tags, so the public-facing product looked unrelated to the app despite the shared design-token system already existing. **Fixed in branch 2026-04-18:** those shells now use semantic tokens and the shared `SlateLogo`; final status depends on promoting the branch to `main` and re-checking production. | High | 🟡 Testing |

---

## Tech Debt

### Architecture

| Item | Description | Priority |
|---|---|---|
| `file_folders` → `project_folders` migration | Phase 2: Design Studio page, export-zip route, audit trail service, cross-tab upload service still reference `file_folders`. New code must use `project_folders` only. | High |
| 300-line limit violations | Project Hub tool pages exceed 300 lines: Submittals (565), Management (930+), Photos (594), Schedule (452). Each needs subcomponent extraction (form → `XxxForm.tsx`, row → `XxxRow.tsx`). Dashboard and SlateDrop monoliths are resolved. | Medium |
| Google DrawingManager removed (May 2026) | Replaced with custom `google.maps.Polyline` + `google.maps.Polygon` click-based drawing in Geospatial. Verify on all map interactions. | Medium |
| ~~Homepage over 300-line limit~~ | ✅ RESOLVED (Phase 6 complete 2026-03-28): `app/page.tsx` decomposed 775→63 lines. 8 files extracted to `components/home/`. | Done |
| **PWA infrastructure gap** | Marketing pages (`/features/ecosystem-apps`, `/plans`) claim PWA-ready and “Free standalone 360 Tour PWA” but ZERO PWA infra exists: no `manifest.webmanifest`, no service worker, no `next-pwa` package. Must be built in Phase 3. | Medium |
| **Standalone app subscription system** | No `org_feature_flags` table, no per-app Stripe products, no standalone app routing. Required for app ecosystem model. See FUTURE_FEATURES.md Phase 3. | Medium |
| **Missing planned DB tables** | 6 tables needed for Phases 1–3: `project_activity_log`, `slatedrop_audit_log`, `slatedrop_shares`, `slatedrop_packs`, `org_feature_flags`, `credits_ledger`. SQL in FUTURE_FEATURES.md §Phase 3E. | Medium |
| **Blank-canvas replacement boundary now defined for visible Phase 1 surfaces** | Stop treating the current owner-facing shells as long-term patch targets. The Web Command Center proof-of-control swap is now applied on `/dashboard`, replacing the old visible card composition with a minimal controlled shell. Remaining planned replacement surfaces: Projects list page, Project detail home page, and project-scoped SlateDrop. Preserve backend loaders, auth, project scoping, provisioning, usage truth, and file APIs. Replace the visible composition from scratch in controlled slices. | High |

### Data / API

| Item | Description | Priority |
|---|---|---|
| No activity_log / audit_log table | `ChangeHistory` component currently derives history from `created_at` / `updated_at` fields only. A proper `project_activity_log` table with per-field diffs would enable full history. | Medium |
| Daily logs CSV not auto-saved to SlateDrop | CSV exports for Daily Logs and Punch List are client-side only. Server-side auto-save to `/Daily Logs/` and `/Reports/` folders not yet implemented. | Low |
| Contracts saved to /Submittals/ folder | Contract file uploads use the Submittals SlateDrop folder. Should use a dedicated /Documents/ or /Contracts/ subfolder. | Low |

### UI / UX

| Item | Description | Priority |
|---|---|---|
| View preferences density not applied to cards | `ViewCustomizer` saves density to localStorage but none of the card-based pages (RFIs, Submittals, Daily Logs, Punch List) use `densityClass()` on their row padding. Wire `densityClass(prefs.density)` to each row's className. | Low |
| Tier 2 Project Home overview cards | Partial implementation — remaining content widgets (weather, recent activity, milestone countdown) not built. | Low |
| External stakeholder portal | `/external/project/[token]` route not built. | Low |

---

## Migration Watchlist

| Migration | Files Affected | Status |
|---|---|---|
| `file_folders` → `project_folders` Phase 2 | `app/(dashboard)/(design-studio)/...`, `app/api/projects/[projectId]/export-zip/`, audit service, cross-tab service | ⚠️ Pending |
| AutocompleteService → `AutocompleteSuggestion.fetchAutocompleteSuggestions()` | `WizardLocationPicker.tsx` | ✅ Done |
| DrawingManager → custom Polyline/Polygon | `components/dashboard/LocationMap.tsx` lines 194, 459, 1479 | 🔴 Open — May 2026 deadline (Geospatial module is a stub; source is LocationMap.tsx) |

---

## Environment / Infrastructure

| Item | Description |
|---|---|
| Stripe keys in Vercel only | Not in `.env.local` — webhook handler cannot be tested locally without Stripe CLI |
| GPU Worker deployment | Pending — see `slate360-context/GPU_WORKER_DEPLOYMENT.md`. Blocked on Phase 2 (Design Studio). |
| Native app packaging | No Capacitor, Expo, or React Native. Planned for Phase 6 in FUTURE_FEATURES.md. |

---

## Resolved (Recent)

| ID | Date | Description |
|---|---|---|
| FIX-022 | Mar 2026 | **BUG-010 autocomplete dependency bug fixed:** `useMapsLibrary("places")` return value was discarded in both `WizardLocationPicker.tsx` and `LocationMap.tsx`. The autocomplete `useEffect` hooks checked `window.google.maps.places.AutocompleteSuggestion` but did not list the places library in their dependency arrays. If the places lib loaded after the initial effect evaluation, `AutocompleteSuggestion` was permanently seen as undefined and suggestions never appeared. Fix: captured return value as `placesLib` and added it to all 4 autocomplete effect deps (1 in WizardLocationPicker + 3 in LocationMap). |
| FIX-017 | Mar 4 2026 | **BUG-010 geocoder fallback (session 3):** `WizardLocationPicker.tsx` and `LocationMap.tsx` (both origin + destination suggest handlers) now catch `AutocompleteSuggestion` 403s and fall back to `Geocoder.geocode()`. Address search degrades to forward geocoding — users see results even if Places API (New) 403s. Both files confirmed 0 TypeScript errors after fix. |
| FIX-016 | Mar 4 2026 | **BUG-020 / BUG-016 root fix (session 3) — inline PDF preview via `mode=preview`:** `app/api/slatedrop/download/route.ts` now reads `?mode=preview` query param. `mode=preview` → `ResponseContentDisposition: inline; filename="..."` (browser renders inline). Default → `attachment` (browser downloads). `SlateDropClient.fetchPreviewUrl` updated to call `&mode=preview`. Root cause: S3 presigned URLs embed `Content-Disposition` in the URL itself — the browser honors this header regardless of any CSP `frame-src` policy. The prior `blob:` + S3 CSP fixes were correct but insufficient because the HTTP-level `Content-Disposition: attachment` header from S3 was always overriding them. |
| AUDIT-002 | Mar 4 2026 | **Google Maps Platform APIs confirmed (Mar 4 2026):** User confirmed full list of enabled APIs including Places API (New), Routes API, Directions API, Distance Matrix, Street View, Elevation, Time Zone, Roads, Aerial View, Weather, Maps 3D SDK, Navigation SDK, and Google Cloud BigQuery/Storage services. Updated `slate360-context/BACKEND.md §9b` and `copilot-instructions.md` with full API list. Routes API now available to replace OSRM fallback. |
| AUDIT-001 | Mar 4 2026 | **Sonnet 4.6 deep root-cause audit v2:** Identified 7 structural root causes for why fixes don't stick. Documented: monolith file sizes exceed LLM context windows (Root Cause #1); external Google API key config requirement (Root Cause #2); session-boundary "almost fixes" pattern (Root Cause #3); polygon type hack in `WizardLocationPicker` (Root Cause #4); `drawing` library loaded by geospatial module, not wizard (Root Cause #5); `loadWidgetPrefs()` running during SSR (Root Cause #6); SlateDrop widget shell/client `embedded` disconnect (Root Cause #7). Added BUG-018, BUG-019. Added prioritized remediation path (Steps 1–6). |
| FIX-015 | Mar 4 2026 | **BUG-010 fully fixed:** (a) Places API (New) confirmed enabled externally — 403 errors should resolve; (b) `canAdvance` for step 3 removed partial-text gate — location is now genuinely optional; (c) `DrawTool` union extended to include `"polygondraw"` — no more unsafe type casts in `WizardLocationPicker.tsx` |
| FIX-014 | Mar 4 2026 | **BUG-016 fully fixed:** Added `blob:` to `frame-src` in `next.config.ts` — inline PDF preview (blob URLs) now unblocked alongside S3 iframes |
| FIX-013 | Mar 4 2026 | **BUG-017 confirmed fully fixed (not just mitigated):** Code audit confirmed `loadWidgetPrefs()` IS already inside `useEffect` at line 570 of `DashboardClient.tsx`. `isClient` state declared at line 479. All `new Date()` calls guarded by `isClient &&`. Hydration error #418 fully resolved. |
| FIX-012 | Mar 4 2026 | **BUG-018 root cause corrected:** Source of DrawingManager warning confirmed as `LocationMap.tsx` (not Geospatial module). Lines 194 + 1479 — `useMapsLibrary("drawing")` + APIProvider libraries. Migration deadline: May 2026. |
| FIX-011 | Mar 4 2026 | **BUG-016 fixed:** `frame-src` CSP extended to include `https://*.amazonaws.com` — S3 file previews unblocked. `blob:` still needed for inline PDF previews. |
| FIX-009 | Mar 4 2026 | **BUG-015 fixed:** `app/market/page.tsx` now wraps `<MarketClient />` in `<MarketProviders>` — Market Robot page no longer crashes with `WagmiProviderNotFoundError` |
| FIX-008 | Mar 4 2026 | **BUG-010 hardened:** `CreateProjectWizard` `submit()` now guards on `step === TOTAL_STEPS` — premature form submissions from keyboard Enter on non-final steps are blocked |
| FIX-007 | Mar 4 2026 | **BUG-017 mitigated:** `isClient` mount state declared in `DashboardClient` — `ReferenceError` crash fixed; full hydration fix pending decomposition |
| FIX-006 | Mar 2026 | **BUG-014 fixed:** Dashboard "New Project" opens `CreateProjectWizard` inline instead of navigating to `/project-hub` |
| FIX-005 | Mar 2026 | **BUG-011 fixed:** Extracted `DashboardHeader` — unified top bar across dashboard home + all tab pages |
| FIX-004 | Mar 2026 | **BUG-012 item 3 fixed:** `SlateDropClient` `embedded` prop eliminates screen-within-screen rendering in Files tab + dashboard widgets |
| FIX-019 | Mar 11 2026 | **Market UX/runtime pass landed but did not close the root cause:** commit `dae617f` added shared search synonym expansion, scan outcome banners, bot-status re-query in `app/api/market/scan/route.ts`, and simpler Results/Automation/overview UI. This improved visibility and reduced confusion, but follow-up audit confirmed the larger Market issue is still open because execution/config/history remain split across multiple systems. |
| FIX-020 | Mar 11 2026 | **Market canonical status + usability pass:** Added `GET /api/market/system-status`, reusable `useMarketSystemStatus()` hook, and surfaced backend readiness in Start Here, Automation, and Live Wallet. Added quick-search idea lanes in Direct Buy, plan-sanity insights in Automation builder, and results coaching cards. Validation passed locally (`tsc`, architecture/file-size guards, CLOB contract check). Current runtime audit shows schema is healthy and the remaining concrete live blocker is missing `NEXT_PUBLIC_POLYMARKET_SPENDER`. |
| FIX-021 | Mar 11 2026 | **Manual buy cap + Polygon RPC CSP fix:** Direct buys no longer use only the global `MARKET_MAX_OPEN_POSITIONS` fallback. `app/api/market/buy/route.ts` now resolves the effective per-user cap from saved plans/runtime metadata through `lib/market/user-position-limit.ts`, and `GET /api/market/system-status` exposes that cap so the UI can show it. `next.config.ts` now allows `https://polygon.drpc.org` and `https://*.drpc.org` in `connect-src`, fixing the wallet RPC CSP violation reported in production console logs. |
| FIX-001 | Jan 2025 | Satellite map card pattern fixed (absolute div separation) |
| FIX-002 | Jan 2025 | SlateDrop 3-dot menu + project banner + "Open in Project Hub" |
| FIX-003 | Jan 2025 | AutocompleteService migration to new Places API |
| FIX-004 | Jan 2025 | DrawingManager removed from wizard, replaced with custom Polyline/Polygon |
| FIX-005 | Jan 2025 | All 9 Project Hub tool pages — ViewCustomizer + ChangeHistory added |
| FIX-018 | Mar 5 2026 | **MarketClient.tsx decomposition complete:** Reduced from 3,132→300 lines. Architecture: 4 custom hooks (`useMarketTradeData` 155L, `useMarketBot` 218L, `useMarketsExplorer` 273L, `useMarketDirectives` 186L) + 19 sub-components in `components/dashboard/market/` (all ≤296L) + 1 lean coordinator (300L). Shared types in `market/types.ts`. Zero TypeScript errors. |
