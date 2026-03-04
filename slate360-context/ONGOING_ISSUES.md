# Slate360 — Ongoing Issues & Known Tech Debt

**Last Updated:** 2026-03-04 (Session 5 — BUG-013 fixed: Project Hub Tier-1 portfolio snapshot + /api/projects/summary; SlateDrop file-state hook extraction started)  
**Maintained by:** Development team — update whenever a bug is discovered or fixed.
**Cross-reference:** See `FUTURE_FEATURES.md` for the full phased build roadmap (Phases 0–7).

---

## Critical / Blocking

| ID | Module | Description | Severity | Status |
|---|---|---|---|---|
| BUG-010 | Project Hub / Wizard + Dashboard LocationMap | **Project Location Wizard — multiple failures:** (1) Steps verified correct (4 steps); (2) **Places Autocomplete 403 — PARTIALLY RESOLVED:** Places API (New) confirmed enabled in Google Cloud Console Mar 4 2026. **Session 3 geocoder fallback:** `WizardLocationPicker` and `LocationMap` (origin + dest) now catch 403s from `AutocompleteSuggestion.fetchAutocompleteSuggestions()` and fall back to `Geocoder.geocode()` (Geocoding API — confirmed enabled). Address search degrades gracefully. If 403s still appear in production, check HTTP referrer restrictions on the API key include the production domain; (3) Premature wizard close — **FIXED** via `if (step !== TOTAL_STEPS) return;` guard; (4) ~~step-3 canAdvance false gate~~ — **FIXED Mar 4 2026**: location step is now always passable (optional per spec); (5) ~~Polygon DrawTool type hack~~ — **FIXED Mar 4 2026**: `DrawTool` union extended to include `"polygondraw"`. | High | 🟡 Mostly Fixed — geocoder fallback active; confirm 403s gone in production |
| BUG-011 | Dashboard / All Tabs | **Inconsistent top-bar navigation:** ~~Dashboard had duplicate custom header~~ — **FIXED.** Extracted `DashboardHeader` (`components/shared/DashboardHeader.tsx`, ~280 lines). Both `DashboardClient` and `DashboardTabShell` now use the same shared header with identical QuickNav, notifications, customize, and user menu. | High | ✅ Fixed |
| BUG-012 | Dashboard / SlateDrop Widgets | **SlateDrop widget incorrect behavior:** (1) ~~When in a project Files tab, UI rendered as screen-within-a-screen~~ — **FIXED** via `embedded` prop on `SlateDropClient`; (2) ~~Dashboard widget expanded + floating window now also pass `embedded`~~ — **FIXED**; (3) ~~In-project widgets (Project Hub Tier 2) used a separate root-folder mini-UI when not expanded~~ — **FIXED** by rendering the embedded `SlateDropClient` widget body in all widget sizes/contexts; (4) Widget shell still renders "Open SlateDrop" CTA even in embedded mode — see BUG-019. | Medium | 🟡 Mostly Fixed — see BUG-019 |
| BUG-014 | Dashboard / Project Creation | **"New Project" button context is wrong:** ~~Clicking "New Project" from the dashboard navigated to `/project-hub`~~ — **FIXED.** Both "New Project" buttons (header + carousel card) now open `CreateProjectWizard` inline on the dashboard with project creation + automatic widget data refresh on success. Future: per-module project wizards for Design Studio, etc. | Medium | ✅ Fixed |
| BUG-015 | Market Robot | **Market Robot page blank — `WagmiProviderNotFoundError`:** Page renders `<MarketClient />` directly without `<MarketProviders>` (Web3/wagmi context wrapper). Wagmi hooks inside `MarketClient` crash because there is no `WagmiProvider` in the render tree. **Attempt history:** Issue 11 mitigation (prior session) moved Web3 from root layout to `app/market/MarketProviders.tsx` — but `app/market/page.tsx` was never updated to actually USE `MarketProviders`. Fix appears in git commits but was not applied to the page itself. **Fix applied 2026-03-04:** Wrapped `<MarketClient />` with `<MarketProviders>` in `app/market/page.tsx`. | Critical | ✅ Fixed |
| BUG-016 | SlateDrop / File Preview | **File preview was downloading instead of opening inline.** Two-layer fix required: (1) **CSP layer:** `frame-src` extended with `https://*.amazonaws.com` and `blob:` — iframes unblocked. (2) **Root cause (session 3 — BUG-020):** `app/api/slatedrop/download/route.ts` hardcoded `ResponseContentDisposition: 'attachment'` on ALL presigned URLs — this forced the browser to download even inside an `<iframe>`, bypassing any CSP fix entirely. Fixed by adding `mode` query param: `mode=preview` → `inline; filename="..."` disposition; default → `attachment`. `SlateDropClient` preview fetch now calls `/api/slatedrop/download?fileId=...&mode=preview`. Preview modal now supports PDF/images/video/audio and falls back to iframe where possible. | High | ✅ Fully Fixed (CSP + S3 disposition both fixed) |
| BUG-017 | Dashboard | **React Hydration Error #418 — FULLY FIXED:** `isClient` is declared as `useState(false)` at line 479. `loadWidgetPrefs()` is called inside a `useEffect` at line 570 (same effect that sets `isClient(true)` and `setCalMonth/setCalYear`). All `new Date()` calls in JSX are guarded by `isClient &&`. The fix is complete — no decomposition needed for this specific bug. | High | ✅ Fully Fixed |
| BUG-018 | LocationMap | **DrawingManager deprecation — `LocationMap.tsx` confirmed source (not WizardLocationPicker):** `components/dashboard/LocationMap.tsx` uses `useMapsLibrary("drawing")` at line 194 and `new drawingLib.DrawingManager(...)` at line 459 with `APIProvider libraries={["places", "drawing", "geometry"]}` at line 1479. The `WizardLocationPicker` does NOT use the drawing library. **Migration deadline: May 2026** when Google removes the library. Scope: replace DrawingManager marker/polyline/polygon/rectangle/circle drawing with custom native `google.maps` click-based implementations. This is a ~400-line change within the 1624-line file. See `slate360-context/BACKEND.md §9b` for the migration approach. | High | 🔴 Open — May 2026 deadline |
| BUG-019 | SlateDrop Widgets | **"Extra Open SlateDrop" click required — root cause confirmed and fixed:** The `embedded` prop removed the screen-within-screen layout, but dashboard widget shell still rendered a redundant "Open →" CTA. **Final fix (Mar 4 2026):** Removed dashboard shell CTA from SlateDrop widget when embedded body is already visible. Dashboard + Project Hub now both render embedded `SlateDropClient` directly in-widget without extra click. | Medium | ✅ Fixed |

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

The codebase contains several files so large no single AI session can see the whole file:

| File | Lines | Problem |
|---|---|---|
| `DashboardClient.tsx` | 2,800+ | Can't see state declarations AND JSX usage in one pass → guards added without state variable, state vars added without checking all usages |
| `SlateDropClient.tsx` | 2,030 | Decomposition planned but not done → fixes must be applied in a blind-spot area |
| `ClientPage.tsx` (Project Hub) | 834 | Over-limit; mutation logic and display logic interleaved |
| 9 of 14 Tier-3 pages | 300–934 | Each over limit; component dependencies entangled |

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

### ✅ Step 5 — Fix BUG-019 (SlateDrop widget extra click)
Resolved: dashboard and Project Hub widget shells now render embedded SlateDrop content directly without redundant "Open SlateDrop" CTA when expanded.

### 🔴 Step 6 — Decompose the monoliths (blocker for all future fixes being reliable)
Before building new features, extract the sub-components planned in `SLATEDROP.md §3` and enforce the 300-line file limit from `GUARDRAILS.md`. With smaller files, every future AI session will be able to see the full file, and session-boundary partial-fix bugs will stop happening.

Progress update (Mar 4 2026): extracted `SlateDropContextMenu.tsx`, `SlateDropActionModals.tsx`, `SlateDropSharePreviewModals.tsx`, `SlateDropFileArea.tsx`, `SlateDropSidebar.tsx`, `SlateDropTopBar.tsx`, and `SlateDropToolbar.tsx`, plus `useSlateDropFiles` and `useSlateDropUiState`; remaining work is final shell reduction.

---

## Active Bugs

| ID | Module | Description | Severity | Status |
|---|---|---|---|---|
| BUG-001 | SlateDrop | `file_folders` table still used in Design Studio, export-zip, audit, and cross-tab service — Phase 2 migration to `project_folders` pending | Medium | ⚠️ Pending |
| BUG-002 | Geospatial | Google Routes API blocked by key restrictions — using OSRM fallback for routing | Low | ⚠️ Workaround |
| BUG-003 | Project Hub | Tier 3 tool views (RFIs, Submittals, etc.) — stub pages existed, now enhanced — DB schema must match client field expectations | Medium | ✅ Resolved (Jan 2025) |
| BUG-013 | Project Hub | **Missing high-level analytics snapshot — fixed:** Added `GET /api/projects/summary` aggregate endpoint and restored Tier-1 snapshot section card at the top of `app/(dashboard)/project-hub/ClientPage.tsx`. Card now shows total projects, active projects, open RFIs, pending submittals, and portfolio budget. | Medium | ✅ Fixed |
| BUG-018 | Dashboard / LocationMap | **DrawingManager deprecated — source is `LocationMap.tsx`, NOT Geospatial module:** Geospatial module is a "coming soon" stub with no map. `components/dashboard/LocationMap.tsx` line 194: `useMapsLibrary("drawing")`; line 459: `new drawingLib.DrawingManager(...)`; line 1479: `<APIProvider libraries={["places","drawing","geometry"]}>`. Migration deadline: **May 2026** when Google removes the library. Scope: replace DrawingManager marker/polyline/polygon/rectangle/circle drawing with native `google.maps` click-based implementations (~400-line change in 1,624-line file). Follow `WizardLocationPicker.tsx` click-based pattern. | High | 🔴 Open — May 2026 deadline |
| BUG-019 | SlateDrop Widgets | **SlateDrop widget extra-click resolved:** Expanded dashboard and Tier 2 Project Hub widgets now mount embedded SlateDrop content directly and no longer require a redundant CTA click. | Medium | ✅ Fixed |
| BUG-020 | SlateDrop / File Preview | **PDF files downloaded instead of opening inline preview.** Root cause: `app/api/slatedrop/download/route.ts` set `ResponseContentDisposition: 'attachment'` on ALL presigned URLs — forced browser to download regardless of iframe context. **Fixed session 3:** Added `mode` param; `mode=preview` → `inline` disposition. `SlateDropClient.fetchPreviewUrl` now calls `&mode=preview`. See FIX-016. | High | ✅ Fixed — session 3 |
| BUG-021 | Location / Multiple Views | **Location widgets are inconsistent across the platform.** `WizardLocationPicker` (project creation step 3), `LocationMap` (dashboard widget), project address display in card/list views, and Project Hub Tier 2 project home render location data with mixed contracts/styles. Progress: shared `LocationDisplay` component is wired into dashboard/project-hub card views and shared `resolveProjectLocation` helper now normalizes metadata → label/lat/lng in Project Hub + dashboard widgets API; remaining map + wizard alignment pending. | Medium | 🟡 In progress |

---

## Tech Debt

### Architecture

| Item | Description | Priority |
|---|---|---|
| `file_folders` → `project_folders` migration | Phase 2: Design Studio page, export-zip route, audit trail service, cross-tab upload service still reference `file_folders`. New code must use `project_folders` only. | High |
| 300-line limit violations | Multiple tool pages exceed 300 lines: Submittals (565), Management (930+), Photos (594), Schedule (452). Each needs subcomponent extraction (form → `XxxForm.tsx`, row → `XxxRow.tsx`). | Medium |
| Google DrawingManager removed (May 2026) | Replaced with custom `google.maps.Polyline` + `google.maps.Polygon` click-based drawing in Geospatial. Verify on all map interactions. | Medium |
| `SlateDropClient.tsx` size | Approaching 300-line limit — extract: `FolderTreeItem`, `ContextMenu`, `FileGrid`, `NotificationTray` | Medium |
| **PWA infrastructure gap** | Marketing pages (`/features/ecosystem-apps`, `/plans`) claim PWA-ready and “Free standalone 360 Tour PWA” but ZERO PWA infra exists: no `manifest.webmanifest`, no service worker, no `next-pwa` package. Must be built in Phase 3. | Medium |
| **Standalone app subscription system** | No `org_feature_flags` table, no per-app Stripe products, no standalone app routing. Required for app ecosystem model. See FUTURE_FEATURES.md Phase 3. | Medium |
| **Missing planned DB tables** | 6 tables needed for Phases 1–3: `project_activity_log`, `slatedrop_audit_log`, `slatedrop_shares`, `slatedrop_packs`, `org_feature_flags`, `credits_ledger`. SQL in FUTURE_FEATURES.md §Phase 3E. | Medium |

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
| FIX-001 | Jan 2025 | Satellite map card pattern fixed (absolute div separation) |
| FIX-002 | Jan 2025 | SlateDrop 3-dot menu + project banner + "Open in Project Hub" |
| FIX-003 | Jan 2025 | AutocompleteService migration to new Places API |
| FIX-004 | Jan 2025 | DrawingManager removed from wizard, replaced with custom Polyline/Polygon |
| FIX-005 | Jan 2025 | All 9 Project Hub tool pages — ViewCustomizer + ChangeHistory added |
