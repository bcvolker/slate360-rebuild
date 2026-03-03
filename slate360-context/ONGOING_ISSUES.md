# Slate360 — Ongoing Issues & Known Tech Debt

**Last Updated:** 2026-03-03  
**Maintained by:** Development team — update whenever a bug is discovered or fixed.
**Cross-reference:** See `FUTURE_FEATURES.md` for the full phased build roadmap (Phases 0–7).

---

## Critical / Blocking

_No blocking issues at this time._

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
| "Daily Logs" SlateDrop folder not provisioned | `ARTIFACT_FOLDER_MAP` maps `DailyLog → "Daily Logs"` but project provisioning only creates: Documents, Drawings, Photos, RFIs, Submittals, Schedule, Budget, Records. Add "Daily Logs" to the provisioning list or remap to "Records". | Low |
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
| FIX-001 | Jan 2025 | Satellite map card pattern fixed (absolute div separation) |
| FIX-002 | Jan 2025 | SlateDrop 3-dot menu + project banner + "Open in Project Hub" |
| FIX-003 | Jan 2025 | AutocompleteService migration to new Places API |
| FIX-004 | Jan 2025 | DrawingManager removed, replaced with custom Polyline/Polygon |
| FIX-005 | Jan 2025 | All 9 Project Hub tool pages — ViewCustomizer + ChangeHistory added |
