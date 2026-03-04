# Slate360 — Ongoing Issues & Known Tech Debt

**Last Updated:** 2026-03-04 (Phase 0B decomposition: BUG-010/011/012/014 partially resolved)  
**Maintained by:** Development team — update whenever a bug is discovered or fixed.
**Cross-reference:** See `FUTURE_FEATURES.md` for the full phased build roadmap (Phases 0–7).

---

## Critical / Blocking

| ID | Module | Description | Severity | Status |
|---|---|---|---|---|
| BUG-010 | Project Hub / Wizard | **Project Location Wizard — multiple failures:** (1) ~~Steps are missing or out of order~~ — steps verified correct; (2) Places Autocomplete returns 403 — **API key must have Places API (New) enabled in Google Cloud Console** (code-side fine); (3) ~~Premature wizard close~~ — fixed: `canAdvance` now requires location on step 3, `valueRef` eliminates stale closure in map click listener, `stopPropagation` on Enter prevents form bubbling. Remaining: Google Cloud Console key restriction. | Medium | 🟡 Partially Fixed |
| BUG-011 | Dashboard / All Tabs | **Inconsistent top-bar navigation:** ~~Dashboard had duplicate custom header~~ — **FIXED.** Extracted `DashboardHeader` (`components/shared/DashboardHeader.tsx`, ~280 lines). Both `DashboardClient` and `DashboardTabShell` now use the same shared header with identical QuickNav, notifications, customize, and user menu. | High | ✅ Fixed |
| BUG-012 | Dashboard / SlateDrop Widgets | **SlateDrop widget incorrect behavior:** (1) ~~When in a project Files tab, UI rendered as screen-within-a-screen~~ — **FIXED** via `embedded` prop on `SlateDropClient`; (2) Dashboard widget expanded + floating window now also pass `embedded`; (3) In-project widgets (Project Hub Tier 2) still need visual reconciliation. | Medium | 🟡 Partially Fixed |
| BUG-013 | Project Hub | **Missing high-level analytics snapshot:** The Project Hub previously had a high-level analytics/snapshot section. This view has been lost. Should be restored as a dedicated section on the Project Hub main page or Tier 2 overview. | Medium | 🔴 Open |
| BUG-014 | Dashboard / Project Creation | **"New Project" button context is wrong:** ~~Clicking "New Project" from the dashboard navigated to `/project-hub`~~ — **FIXED.** Both "New Project" buttons (header + carousel card) now open `CreateProjectWizard` inline on the dashboard with project creation + automatic widget data refresh on success. Future: per-module project wizards for Design Studio, etc. | Medium | ✅ Fixed |

---

## Console Errors (Logged 2026-03-03)

| Error | Source | Root Cause | Fix |
|---|---|---|---|
| `Uncaught Error: Minified React error #418` | Hydration mismatch in production bundle | Server-rendered HTML differs from client render — likely a component that accesses `window`/`localStorage`/`Date` before hydration guard fires. Check `DashboardClient.tsx` and any widget using browser-only APIs outside guards. | Wrap browser-only reads in `useEffect` or behind `isClient` guard; never read `localStorage` during SSR. |
| `Drawing library functionality in the Maps JavaScript API is deprecated` | Geospatial / LocationMap | `DrawingManager` still referenced somewhere — migration to custom `Polyline`/`Polygon` incomplete. | Audit all `google.maps.drawing` references; remove remaining `DrawingManager` usage before May 2026. |
| `satellite and hybrid map types will no longer automatically switch to 45° Imagery` | Maps JavaScript API | Informational deprecation — no code change required yet, but note for future map version upgrades. | Monitor for Maps JS API version bump; no action needed now. |
| `places.googleapis.com/…/AutocompletePlaces: 403 Forbidden` | `WizardLocationPicker.tsx` | **Google Cloud API key does not have "Places API (New)" enabled.** The new `AutocompleteSuggestion.fetchAutocompleteSuggestions()` API requires the Places API (New) to be explicitly enabled on the key in Google Cloud Console. The old `AutocompleteService` was previously enabled. | Enable "Places API (New)" in Google Cloud Console for the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. If key restrictions are in place, add the required API to the allowed list. |

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
| FIX-006 | Mar 2026 | **BUG-014 fixed:** Dashboard "New Project" opens `CreateProjectWizard` inline instead of navigating to `/project-hub` |
| FIX-005 | Mar 2026 | **BUG-011 fixed:** Extracted `DashboardHeader` — unified top bar across dashboard home + all tab pages |
| FIX-004 | Mar 2026 | **BUG-012 item 3 fixed:** `SlateDropClient` `embedded` prop eliminates screen-within-screen rendering in Files tab + dashboard widgets |
| FIX-001 | Jan 2025 | Satellite map card pattern fixed (absolute div separation) |
| FIX-002 | Jan 2025 | SlateDrop 3-dot menu + project banner + "Open in Project Hub" |
| FIX-003 | Jan 2025 | AutocompleteService migration to new Places API |
| FIX-004 | Jan 2025 | DrawingManager removed, replaced with custom Polyline/Polygon |
| FIX-005 | Jan 2025 | All 9 Project Hub tool pages — ViewCustomizer + ChangeHistory added |
