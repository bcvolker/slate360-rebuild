# Slate360 — Ongoing Issues & Known Tech Debt

**Last Updated:** 2026-03-04 (Sonnet 4.6 root-cause audit — BUG-010/011/012/014/015/016/017 triaged and partially fixed)  
**Maintained by:** Development team — update whenever a bug is discovered or fixed.
**Cross-reference:** See `FUTURE_FEATURES.md` for the full phased build roadmap (Phases 0–7).

---

## Critical / Blocking

| ID | Module | Description | Severity | Status |
|---|---|---|---|---|
| BUG-010 | Project Hub / Wizard | **Project Location Wizard — multiple failures:** (1) ~~Steps are missing or out of order~~ — steps verified correct; (2) Places Autocomplete returns 403 — **API key must have Places API (New) enabled in Google Cloud Console** (code-side code is correct — fallback via Geocoding API still works); (3) ~~Premature wizard close~~ — **FIXED** (twice): was fixed with `canAdvance` guard + `stopPropagation` on Enter, but still triggered in some cases. Root cause: `submit()` had no step guard — any Enter press in a form input on step 1/2/3 could submit the form even without `type="submit"` being clicked, via browser keyboard nav. **Fix applied 2026-03-04:** Added `if (step !== TOTAL_STEPS) return;` at top of `submit()` handler as hard guard. | High | 🟡 Partially Fixed (autocomplete 403 remains — external API key config required) |
| BUG-011 | Dashboard / All Tabs | **Inconsistent top-bar navigation:** ~~Dashboard had duplicate custom header~~ — **FIXED.** Extracted `DashboardHeader` (`components/shared/DashboardHeader.tsx`, ~280 lines). Both `DashboardClient` and `DashboardTabShell` now use the same shared header with identical QuickNav, notifications, customize, and user menu. | High | ✅ Fixed |
| BUG-012 | Dashboard / SlateDrop Widgets | **SlateDrop widget incorrect behavior:** (1) ~~When in a project Files tab, UI rendered as screen-within-a-screen~~ — **FIXED** via `embedded` prop on `SlateDropClient`; (2) Dashboard widget expanded + floating window now also pass `embedded`; (3) In-project widgets (Project Hub Tier 2) still need visual reconciliation. | Medium | 🟡 Partially Fixed |
| BUG-013 | Project Hub | **Missing high-level analytics snapshot:** The Project Hub previously had a high-level analytics/snapshot section. This view has been lost. Should be restored as a dedicated section on the Project Hub main page or Tier 2 overview. | Medium | 🔴 Open |
| BUG-014 | Dashboard / Project Creation | **"New Project" button context is wrong:** ~~Clicking "New Project" from the dashboard navigated to `/project-hub`~~ — **FIXED.** Both "New Project" buttons (header + carousel card) now open `CreateProjectWizard` inline on the dashboard with project creation + automatic widget data refresh on success. Future: per-module project wizards for Design Studio, etc. | Medium | ✅ Fixed |
| BUG-015 | Market Robot | **Market Robot page blank — `WagmiProviderNotFoundError`:** Page renders `<MarketClient />` directly without `<MarketProviders>` (Web3/wagmi context wrapper). Wagmi hooks inside `MarketClient` crash because there is no `WagmiProvider` in the render tree. **Attempt history:** Issue 11 mitigation (prior session) moved Web3 from root layout to `app/market/MarketProviders.tsx` — but `app/market/page.tsx` was never updated to actually USE `MarketProviders`. Fix appears in git commits but was not applied to the page itself. **Fix applied 2026-03-04:** Wrapped `<MarketClient />` with `<MarketProviders>` in `app/market/page.tsx`. | Critical | ✅ Fixed |
| BUG-016 | SlateDrop / File Preview | **File preview fails — S3 URLs blocked by CSP `frame-src`:** `frame-src` directive in `next.config.ts` only allowed `'self' https://cdn.pannellum.org/`. Any file preview that renders an S3 URL in an iframe (PDF viewer, image preview, 360 viewer) is silently blocked. Browser console shows: `Framing 'https://slate360-storage.s3.us-east-2.amazonaws.com/' violates Content-Security-Policy: frame-src`. **Attempt history:** CSP was hardened in prior cycles for `connect-src` (S3 uploads) and `worker-src` (maps), but `frame-src` was never extended. **Fix applied 2026-03-04:** Added `https://*.amazonaws.com https://slate360-storage.s3.us-east-2.amazonaws.com` to `frame-src` in `next.config.ts`. | High | ✅ Fixed |
| BUG-017 | Dashboard | **React Hydration Error #418 — persistent mismatch:** `Uncaught Error: Minified React Error #418` means server HTML and client HTML diverge on first render. Root cause: `DashboardClient.tsx` is a 2,800+ line monolith. Multiple browser-only APIs (`localStorage`, `window`, `new Date()`, `new Date().getMonth()`) are invoked in component render scope (not behind `useEffect`). Prior session hotfix added `isClient` guard, but `isClient` was never declared, causing `ReferenceError: isClient is not defined`. **Fix applied 2026-03-04:** Declared `const [isClient, setIsClient] = useState(false)` + mount effect in `DashboardClient`. **Still open:** `DashboardClient` still accesses `localStorage` via `loadWidgetPrefs()` during initial render — `loadWidgetPrefs` should be moved inside `useEffect`. Proper fix requires decomposing `DashboardClient` into smaller client-only islands. | High | 🟡 Mitigated (not fully fixed — decomposition required) |

---

## Console Errors (Logged 2026-03-04 — Root Cause Audit)

| Error | Source | Root Cause | Status | Fix |
|---|---|---|---|---|
| `Uncaught Error: Minified React error #418` | Hydration mismatch in production bundle | `DashboardClient` (2,800+ lines) reads `localStorage` via `loadWidgetPrefs()` during initial server render, and renders `new Date()` values directly. SSR produces different HTML than client. | 🟡 Mitigated | `isClient` guard declared + mount effect added. Full fix: decompose `DashboardClient` — move `loadWidgetPrefs` inside `useEffect`. |
| `Drawing library functionality in the Maps JavaScript API is deprecated` | Geospatial / LocationMap / WizardLocationPicker | `DrawingManager` still referenced somewhere — migration to custom `Polyline`/`Polygon` incomplete. `WizardLocationPicker` uses custom drawing (uses `google.maps.Polyline` + `google.maps.Marker`) but may still load the `drawing` library implicitly via Maps API config. | ⚠️ Pending | Audit all `google.maps.drawing` references; ensure `drawing` library is not included in API loader config. |
| `satellite and hybrid map types will no longer automatically switch to 45° Imagery` | Maps JavaScript API | Informational deprecation — no code change required yet. | ℹ️ Info only | Monitor for Maps JS API version bump. |
| `places.googleapis.com/…/AutocompletePlaces: 403 Forbidden` | `WizardLocationPicker.tsx` | **External config:** Google Cloud API key does not have "Places API (New)" enabled. The new `AutocompleteSuggestion.fetchAutocompleteSuggestions()` API requires Places API (New) to be explicitly enabled. Code-side is correct; geocoding fallback works for manual entry. | 🔴 External | Enable "Places API (New)" in Google Cloud Console for `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. |
| `Uncaught ReferenceError: isClient is not defined` | `DashboardClient.tsx` | Prior session hotfix added `isClient` conditional rendering in multiple JSX blocks but did not declare the state variable, causing a runtime `ReferenceError` and blank `/dashboard`. | ✅ Fixed | Declared state + mount effect in `DashboardClient`. |
| `WagmiProviderNotFoundError: useConfig must be used within WagmiProvider` | `/market` page → `MarketClient` | `app/market/page.tsx` rendered `<MarketClient />` without `<MarketProviders>` wrapper. Web3/wagmi providers existed in `MarketProviders.tsx` but were never used at the page level — previous session's "fix" created the file but forgot to wire it. | ✅ Fixed | `app/market/page.tsx` now wraps content in `<MarketProviders>`. |
| `Framing '*.amazonaws.com' violates Content-Security-Policy frame-src` | SlateDrop file preview | `frame-src` only allowed `cdn.pannellum.org` — S3 file preview iframes were silently blocked in all browsers. | ✅ Fixed | Added `https://*.amazonaws.com` to `frame-src` in `next.config.ts`. |

---

## Pattern: Why Fixes Don't "Stick" — Root Cause Analysis

Several fixes in this project appear in commit history but don't fix the production issue. The recurring patterns are:

| Pattern | Example | Root Cause |
|---|---|---|
| **Fix created the structure but didn't wire it** | `MarketProviders.tsx` created but never imported in `page.tsx` | Session ended before the last step of "use this thing" was done |
| **Fix landed in one component but the component itself isn't used** | `isClient` guard added, but `isClient` never declared in scope | Apply-patch script ran against wrong context / search string didn't match |
| **CSP is hardened for one directive but the related directive is missed** | `connect-src` allows S3 uploads but `frame-src` blocks S3 previews | CSP directives are treated as one-time fixes rather than per-feature audits |
| **Hydration guard added in JSX but not at state level** | `isClient &&` in render, but `useState` for `isClient` missing above it | File is 2,800 lines — the guard was added mid-file without checking the top |
| **Build passes locally but OOM-kills on Vercel** | All code changes were committed but Vercel deployments were silently failing with Exit 143 | Default Node.js memory settings too low for Next 15 production builds; `memoryBasedWorkersCount` experiment and `ignoreBuildErrors` added to `next.config.ts` |

---

## Active Bugs

| ID | Module | Description | Severity | Status |
|---|---|---|---|---|
| BUG-001 | SlateDrop | `file_folders` table still used in Design Studio, export-zip, audit, and cross-tab service — Phase 2 migration to `project_folders` pending | Medium | ⚠️ Pending |
| BUG-002 | Geospatial | Google Routes API blocked by key restrictions — using OSRM fallback for routing | Low | ⚠️ Workaround |
| BUG-003 | Project Hub | Tier 3 tool views (RFIs, Submittals, etc.) — stub pages existed, now enhanced — DB schema must match client field expectations | Medium | ✅ Resolved (Jan 2025) |

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
| DrawingManager → custom Polyline/Polygon | Geospatial map component | ✅ Done |

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
| FIX-010 | Mar 4 2026 | **BUG-016 fixed:** `frame-src` CSP extended to include `https://*.amazonaws.com` — S3 file previews unblocked |
| FIX-009 | Mar 4 2026 | **BUG-015 fixed:** `app/market/page.tsx` now wraps `<MarketClient />` in `<MarketProviders>` — Market Robot page no longer crashes with `WagmiProviderNotFoundError` |
| FIX-008 | Mar 4 2026 | **BUG-010 hardened:** `CreateProjectWizard` `submit()` now guards on `step === TOTAL_STEPS` — premature form submissions from keyboard Enter on non-final steps are blocked |
| FIX-007 | Mar 4 2026 | **BUG-017 mitigated:** `isClient` mount state declared in `DashboardClient` — `ReferenceError` crash fixed; full hydration fix pending decomposition |
| FIX-006 | Mar 2026 | **BUG-014 fixed:** Dashboard "New Project" opens `CreateProjectWizard` inline instead of navigating to `/project-hub` |
| FIX-005 | Mar 2026 | **BUG-011 fixed:** Extracted `DashboardHeader` — unified top bar across dashboard home + all tab pages |
| FIX-004 | Mar 2026 | **BUG-012 item 3 fixed:** `SlateDropClient` `embedded` prop eliminates screen-within-screen rendering in Files tab + dashboard widgets |
| FIX-001 | Jan 2025 | Satellite map card pattern fixed (absolute div separation) |
| FIX-002 | Jan 2025 | SlateDrop 3-dot menu + project banner + "Open in Project Hub" |
| FIX-003 | Jan 2025 | AutocompleteService migration to new Places API |
| FIX-004 | Jan 2025 | DrawingManager removed, replaced with custom Polyline/Polygon |
| FIX-005 | Jan 2025 | All 9 Project Hub tool pages — ViewCustomizer + ChangeHistory added |
