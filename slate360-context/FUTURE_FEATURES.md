# Slate360 — Build Roadmap & Future Features

**Last Updated:** 2026-03-03  
**Priority Order:** Foundation → Project Hub → Design Studio → App Ecosystem → Remaining Modules → Advanced Features → Native Apps  
**Status Key:** ✅ Done · 🟢 In Progress · 🟡 Planned · 🔴 Not Started

---

## Architecture Readiness Analysis

### Tab Ecosystem — Current State (All 12 Tabs)

| Tab | Route | Scaffolding | Content | Shell |
|---|---|---|---|---|
| Dashboard Home | `/(dashboard)` | ✅ `DashboardClient.tsx` | ✅ Built (SPA mega-component) | ❌ Own header (has QuickNav) |
| Project Hub | `/project-hub` | ✅ Standalone layout | ✅ Built (3-tier structure) | ❌ Own header (has QuickNav) |
| SlateDrop | `/slatedrop` | ✅ Standalone page | ✅ Built | ❌ Own header (no QuickNav) |
| Design Studio | `/(dashboard)/design-studio` | ✅ `DashboardTabShell` | 🟡 Coming Soon scaffold | ✅ Shared (isCeo ✅) |
| Content Studio | `/(dashboard)/content-studio` | ✅ `DashboardTabShell` | 🟡 Coming Soon scaffold | ✅ Shared (isCeo ✅) |
| 360 Tours | `/(dashboard)/tours` | ✅ `DashboardTabShell` | 🟡 Coming Soon scaffold | ✅ Shared (isCeo ✅) |
| Geospatial | `/(dashboard)/geospatial` | ✅ `DashboardTabShell` | 🟡 Coming Soon scaffold | ✅ Shared (isCeo ✅) |
| Virtual Studio | `/(dashboard)/virtual-studio` | ✅ `DashboardTabShell` | 🟡 Coming Soon scaffold | ✅ Shared (isCeo ✅) |
| Analytics | `/(dashboard)/analytics` | ✅ `DashboardTabShell` | ✅ Report Builder v1 (UI) | ✅ Shared (isCeo ✅) |
| CEO | `/(dashboard)/ceo` | ✅ `DashboardTabShell` | 🟡 Stub | ✅ Shared (isCeo ✅) |
| Market Robot | `/market` | ✅ `MarketClient.tsx` | ✅ Built | ❌ Own header (no QuickNav) |
| Athlete360 | `/athlete360` | ✅ Standalone page | 🟡 Stub | ❌ Own header (no QuickNav) |
| My Account | `/(dashboard)/my-account` | ✅ `DashboardTabShell` | 🟡 Coming Soon scaffold | ✅ Shared (isCeo ✅) |

**Decisions made:**
- `DashboardTabShell` (shared component) standardizes: light theme, `max-w-7xl` content, `z-50` header, back-to-dashboard link in top-left, QuickNav dropdown in top-right.
- All new tabs USE `DashboardTabShell` automatically with `isCeo` prop.
- Analytics converted from dark theme to light DashboardTabShell (2026-03-04).
- CEO uses DashboardTabShell (light theme, 2026-03-03).
- Legacy tabs (Dashboard, Project Hub, SlateDrop, Market) retain own headers until Phase 0B decomposition.
- `QuickNav` (shared dropdown) includes all 13 navigation targets, tier-gated via `getEntitlements()`.
- CEO account (`slate360ceo@gmail.com`) gets enterprise entitlements via `getEntitlements(tier, { isSlateCeo })` override.
- Internal-tab access (`/ceo`, `/market`, `/athlete360`) is gated via `hasInternalAccess = isSlateCeo || isSlateStaff`.

### Architecture Readiness for Future Phases

| Phase | Architecture Ready? | Gaps |
|---|---|---|
| Phase 0 (Foundation) | ✅ Ready | Just execution work — no infra blockers |
| Phase 1 (Project Hub) | ✅ Ready | Tool pages exist, need enhancement. Observations feature added. |
| Phase 2 (Design Studio) | ✅ Shell ready | `DashboardTabShell` in place. Needs Zustand store + viewer stack. Route exists. |
| Phase 3 (App Ecosystem) | 🟡 Partially ready | Standalone routes exist for 6 tabs. Missing: `manifest.webmanifest`, service worker, `org_feature_flags` table, per-app Stripe products. |
| Phase 4 (Remaining Modules) | ✅ Shell ready | All 5 module routes scaffolded with `DashboardTabShell`. Each just needs content implementation. |
| Phase 5 (Advanced) | 🟡 Partially ready | GPU pipeline, Redis, realtime — all require new infrastructure. No code blockers. |
| Phase 6 (Native Apps) | 🔴 Not ready | Needs PWA foundation (Phase 3A) first. No Capacitor installed. |

### Key Architectural Strengths

1. **Modular routing:** Each tab is a standalone Next.js page — no coupling between modules
2. **Shared auth layer:** `withAuth()` / `withProjectAuth()` works for any new API route
3. **Entitlements system:** `getEntitlements(tier, { isSlateCeo? })` cleanly gates module access. CEO account gets enterprise entitlements regardless of DB tier. **CEO/internal platform tabs (`/ceo`, `/market`, `/athlete360`) are gated by `hasInternalAccess` directly — never via entitlements.**
4. **SlateDrop as common storage:** All modules can save artifacts via `saveProjectArtifact()`
5. **Shared UI patterns:** `ViewCustomizer`, `ChangeHistory`, `DashboardTabShell` are reusable
6. **QuickNav centralized:** Single navigation dropdown shared across all tab pages, tier-gated
7. **Consistent navigation:** DashboardTabShell provides uniform header (logo + back-link on left, QuickNav + user menu on right) with `isCeo` prop flowing from server through shells

### Key Risks / Debt to Address Before Scale

1. **DashboardClient.tsx (~2,953 lines)** — Must decompose before adding more dashboard logic
2. **Shared `(dashboard)/layout.tsx` only baseline-complete** — route-group layout now exists, but legacy pages still diverge on header/nav composition.
3. **Activity log baseline now active in core tools** — `project_activity_log` migration + helper exist, with create/update/delete logging wired for RFIs, Submittals, Schedule, Budget, Punch List, Daily Logs, Observations, Records, and Management Contracts. Remaining project mutations should be phased in.
4. **PWA/mobile infra now partially started** — manifest + mobile viewport/standalone metadata are in place; service worker/runtime caching still missing.
5. **Web3 global load issue mitigated** — wagmi/react-query providers are now Market-scoped; keep future Web3 imports route-scoped.
6. **Org provisioning fallback now implemented** — callback + dashboard fallback bootstrap added; webhook path still recommended for deterministic first-write provisioning.
7. **`slate360_staff` table may be missing in some environments** — code has graceful fallback. If table is missing, only `slate360ceo@gmail.com` has internal-tab access.

---

## How This Document Works

Every feature ever discussed is preserved here, organized into **7 build phases** in safe dependency order. Each phase lists what to build, what it depends on, and what infrastructure it needs. No feature or idea has been removed — items from the original planning docs, competitor analysis (Procore), Design Studio vision docs, app ecosystem specs, SlateDrop "wow features," and GPU processing specs are all included, consolidated, and de-duplicated.

---

## Phase 0 — Foundation & Tech Debt (DO FIRST)

These items unblock everything else. No new features until these are stable.

### 0A. Shared UI Component Library

| Component | Purpose | Needed By |
|---|---|---|
| `Modal` / `ConfirmDialog` | Consistent modals across all modules | All |
| `DataTable` | Sortable/filterable/paginated table | Project Hub tools, Analytics |
| `FormField` / `FormSection` | Consistent form layout | All creation flows |
| `EmptyState` | No-data placeholder | All modules |
| `StatusPill` | Colored status badges | Project Hub, SlateDrop |
| `FileUploadZone` | Drag-and-drop upload area | SlateDrop, Design Studio, 360 Tour |
| `SlideOverPanel` | Right-side drawer (ChangeHistory pattern) | All detail views |
| `CommandPalette` | Global keyboard search (Cmd+K) | Platform-wide |
| `TierGate` | UI wrapper that hides/shows based on entitlements | All gated features |

**What to do:** Create `components/ui/` files, each < 300 lines. Extract from existing inline implementations in DashboardClient, SlateDropClient, and tool pages.

### 0B. File Decomposition (300-Line Rule)

17 files exceed the limit. Decompose in this order (highest impact first):

| Priority | File | Lines | Extract Into |
|---|---|---|---|
| 1 | `DashboardClient.tsx` | 2,915 | ~10 files (shell, header, stats, cards, activity, widgets) |
| 2 | `SlateDropClient.tsx` | 2,030 | ~7 files (sidebar, grid, upload, context menu, preview, breadcrumb) |
| 3 | `MarketClient.tsx` | 3,006 | ~8 files (grid, card, form, filters, bot, detail) |
| 4 | `LocationMap.tsx` | 1,568 | ~5 files (container, controls, search, directions, drawing) |
| 5 | `management/page.tsx` | 934 | Extract contract/report/stakeholder components |
| 6 | All 9 tool pages | 324–593 | Extract table + form per page |

**What to do:** Follow safe refactor sequence from GUARDRAILS.md §4. One file at a time. No feature changes during decomposition.

### 0C. Activity / Audit Log Table

| Table | Columns |
|---|---|
| `project_activity_log` | `id`, `project_id`, `org_id`, `actor_user_id`, `entity_type` (rfi, submittal, etc.), `entity_id`, `action` (create, update, delete, comment, status_change), `field_name`, `old_value`, `new_value`, `metadata` (JSONB), `created_at` |

**What to do:** Create Supabase migration. Add RLS policy (org-scoped read, authenticated insert). Update `ChangeHistory` component to read from this table instead of `buildBaseHistory()`. Add `logActivity()` helper in `lib/server/audit.ts`. Wire into all Project Hub API routes.

### 0D. `file_folders` → `project_folders` Migration Phase 2

| Route / Service | Status |
|---|---|
| Design Studio file routes | 🔴 Migrate |
| `app/api/slatedrop/zip/route.ts` | 🔴 Migrate |
| Cross-tab upload service | 🔴 Migrate |
| Audit trail service | 🔴 Migrate |

**What to do:** Find all `file_folders` references, swap to `project_folders`, test, then Phase 3 = data sync + drop old table.

### 0E. Dependency Cleanup

| Task | Action |
|---|---|
| Recharts + Chart.js both present | Remove Chart.js, standardize on Recharts |
| 7 Web3 packages always loaded | Lazy-load via `next/dynamic` only on `/market` pages |
| PDF packages | Lazy-load only on report-generation pages |

### 0F. Cross-Tab Customization System (Required)

All tabs must implement a consistent customization layer per `slate360-context/dashboard-tabs/CUSTOMIZATION_SYSTEM.md`.

| Requirement | Description |
|---|---|
| Movable regions | Drag-reorder cards, tool groups, and workspace sections |
| Expandable/collapsible panels | Library, inspector, timeline/log panels |
| Resizable panel splits | User-controlled panel widths/heights with bounds |
| Mode presets | `simple`, `standard`, `advanced`, `custom` |
| Persistence | Per-user, per-tab saved preferences with versioning |

**What to do:** Implement shared preference shape/utilities, then apply to each tab shell and module workspace before advanced feature build-out.

---

## Phase 1 — Complete Project Hub (PRIORITY)

Project Hub is 80% built. These items finish it to production quality.

### 1A. Finish Tool Views

Each tool page needs: real CRUD (mostly done), proper empty states, export (CSV/PDF), ViewCustomizer wired to row styling, and ChangeHistory reading from `project_activity_log`.

| Tool | Remaining Work | Priority |
|---|---|---|
| RFIs | Wire `densityClass()` to row padding; export PDF; attachment preview | High |
| Submittals | Wire density; revision tracking; export PDF | High |
| Daily Logs | Photo upload field; weather auto-save server-side; CSV export to SlateDrop | High |
| Punch List | Photo attachment per item; PDF export with photos | High |
| Budget | Budget vs. actual chart (Recharts); CSV import; change order log | High |
| Schedule | Gantt dependencies (predecessor/successor); critical path highlighting; baseline comparison | High |
| Drawings | PDF markup / redline annotations (canvas overlay layer); revision set management | Medium |
| Photos | Bulk upload; photo timeline slider; AI tagging (future) | Medium |
| Management | Contract e-signature integration; insurance cert tracking; lien waiver management | Medium |

### 1B. Project Home (Tier 2) Overview Cards

| Widget | Data Source | Priority |
|---|---|---|
| Recent activity feed (last 10 changes) | `project_activity_log` | High |
| Open items summary (RFIs, punch, submittals) | Aggregate query | High |
| Budget health gauge | Budget table variance | Medium |
| Milestone countdown ticker | Schedule milestones | Medium |
| Live weather | Open-Meteo API (already in UI) | Low |

### 1C. Notification Center

| Component | Purpose |
|---|---|
| `notifications` table | Already exists in DB |
| In-app notification bell | Show unread count, dropdown list |
| Notification triggers | RFI response, submittal approval, overdue punch, budget alert |
| Email digests (Resend) | Daily/weekly project digest to stakeholders |

**What to do:** Build `NotificationBell` component. Add `POST /api/notifications/mark-read`. Add triggers in each API route that creates/updates records.

### 1D. External Stakeholder Portal

| Route | Purpose |
|---|---|
| `/external/project/[token]` | Read-only project view (no account required) |
| External RFI response form | Client responds to RFI via token link |
| External submittal approval | Approve/reject with signature |

**What to do:** Create `slatedrop_shares`-style token system. Build minimal read-only project viewer. Wire to RFI/submittal email notifications.

### 1E. Project Hub — Future Enhancements (Post-MVP)

These are valuable but not blocking MVP:

| Feature | Tool | Priority |
|---|---|---|
| RFI distribution list email blast | RFIs | Medium |
| RFI response SLA tracking with countdown | RFIs | Medium |
| Link RFIs to drawings (pin on PDF) | RFIs + Drawings | Medium |
| RFI → Change Order conversion | RFIs + Budget | Medium |
| AIA document workflow with e-signature | Submittals | Medium |
| Submittal log reconciliation vs spec sections | Submittals | Low |
| Revision tracking with side-by-side diff | Submittals | Low |
| Submittal package bundling (ZIP export) | Submittals | Low |
| Daily log photo upload (camera capture on mobile) | Daily Logs | Medium |
| Crew count analytics chart (trades vs. time) | Daily Logs | Low |
| QR code scan to open punch item on site | Punch List | Low |
| Contractor notification on punch assignment | Punch List | Medium |
| Drawing comparison (overlay two revisions) | Drawings | Medium |
| Issue log linked to drawing sheets | Drawings | Low |
| RFI / Punch item pin on drawing | Drawings | Medium |
| AI photo tagging (location, trade, progress %) | Photos | Low |
| 360° photo viewer (equirectangular pano) | Photos | Medium |
| Photo timeline slider (date-based progress) | Photos | Low |
| Before/after comparison slider | Photos | Low |
| Invoice matching against budget line items | Budget | Medium |
| Cash flow projection chart | Budget | Low |
| Integration with QuickBooks / Procore budget export | Budget | Low |
| Pay application auto-gen (AIA G702/G703) | Budget | Medium |
| Schedule import from MS Project / P6 | Schedule | Medium |
| Resource leveling | Schedule | Low |
| S-curve earned value chart | Schedule | Low |
| Subcontractor pre-qualification checklist | Management | Low |
| Project closeout checklist with document bundling | Management | Medium |
| Org-level contractor database (reuse across projects) | Management | Medium |

---

## Phase 2 — Design Studio (MVP Module)

Design Studio is the flagship creative module. It differentiates Slate360 from pure PM tools like Procore.

### 2A. Shell & Workspace

**Layout (always consistent):**
- **Top bar:** Module title, project selector, Simple/Advanced toggle, undo/redo, save, export, share
- **Left panel:** File browser (from SlateDrop), asset library, versions/timeline, upload dropzone
- **Center canvas:** Three.js / React Three Fiber viewport (3D) or PDF.js overlay (2D)
- **Right panel:** Properties, inspector, comments — changes based on mode + selection
- **Bottom bar:** Mode tabs: Upload · Design · Review · Print · Analyze · Animate

**What to do:**
1. Create `app/(dashboard)/design-studio/page.tsx` (server component, tier-gated)
2. Create `components/design-studio/DesignStudioShell.tsx` (client, layout frame)
3. Create Zustand store: `lib/hooks/useDesignStudioStore.ts` (project state, tool state, selection, pins, jobs)
4. Gate with `getEntitlements(tier).canAccessDesignStudio`

**User profile presets (control tool complexity):**

| Preset | Access Level |
|---|---|
| Starter | View + annotate + export |
| Pro | BIM layers, transforms, 2D underlays, basic print tools |
| Expert | Parametrics, clash detection, analysis, automation, advanced export |

### 2B. Project Type Presets (auto-configure workspace)

Set at project creation; determines which tools appear:

| Project Type | Primary Canvas | Key Tools |
|---|---|---|
| 2D Design | Flat drafting table | Lines, dimensions, hatches, blocks, sheet templates |
| 3D Design | Three.js 3D viewport | Push/pull, boolean ops, parametric dimensions, components |
| 2D Plan Review | PDF.js overlay | Callouts, stamps, redlines, measurements, takeoff table |
| Smart PDF Tool | PDF.js + AI | Split/merge, OCR, table extraction, scope summary draft |
| Digital Twin | Three.js + GS viewer | Upload wizard, processing queue, timeline, morph export |
| 3D Print / Fabrication | Three.js mesh tools | Repair, scale, split, connector library, slicer preview |

### 2C. Viewer Stack (Open-Source)

| Library | Purpose | License |
|---|---|---|
| Three.js + React Three Fiber | Base 3D canvas | MIT |
| xeokit SDK | BIM/IFC viewing (performance-optimized) | AGPL-3.0 |
| web-ifc | IFC parsing + clash detection | MPL-2.0 |
| PDF.js | 2D plan viewing + annotation overlay | Apache 2.0 |
| IFC.js | Lightweight IFC handling | MIT |
| SuperSplat (PlayCanvas) | Gaussian Splat web rendering | MIT |
| OpenCascade.js + JSCAD | Parametric design + 3D operations | LGPL |
| Kiri:Moto | 3D print slicer preview (in-browser) | MIT |
| CCapture.js + FFmpeg (server) | Animation → MP4 export | MIT |
| Pannellum | 360 panorama viewer (right-panel/modal) | MIT |

### 2D. File Handling

- Open any common file: .IFC, .DWG (via conversion), .OBJ, .STL, .GLB, .PDF, photos
- Auto-detect file type → pick correct mode
- "Save as" with format conversion
- Right-click in SlateDrop → "Send to Design Studio" deep link
- Everything auto-saves to project's SlateDrop folder
- Pin media to 3D model: 360 panos, photos, PDFs, notes, comments (all with coordinates)

### 2E. Sharing & Review Links

| Mode | Capabilities |
|---|---|
| View link (no login) | Orbit, section, measure, saved viewpoints; optional passcode + expiry |
| Review link (comment-back) | Same + pin comments; comments write back to Design Studio + optionally to Project Hub as RFI/issue |

### 2F. Safe Build Order for Design Studio

| Step | Slice | Depends On |
|---|---|---|
| 1 | Shell + layout + mode switcher + Zustand store | Phase 0A (UI components) |
| 2 | SlateDrop file browser panel (left panel) | Existing SlateDrop APIs |
| 3 | 3D viewer (Three.js + GLB/OBJ loading) | — |
| 4 | 2D plan viewer (PDF.js + annotation layer) | — |
| 5 | IFC/BIM viewer (xeokit integration) | Step 3 |
| 6 | Upload + convert pipeline (IFC→GLB, OBJ→GLB) | GPU worker (Phase 5A) |
| 7 | Review/collaboration (comment pins) | Step 3 |
| 8 | 3D Print Lab (mesh repair, split, slicer) | Step 3 |
| 9 | Digital Twin processing pipeline | GPU worker (Phase 5A) |
| 10 | Animation mode (camera path → MP4 export) | Step 3, FFmpeg server |
| 11 | Sharing/review links | Phase 1D patterns |

### 2G. Design Studio ↔ Project Hub Integration

- Store `projectHubId` reference in Design Studio project metadata
- "Attach this model version to": Daily Log, RFI, Submittal, Photo Log
- Digital Twin Timeline: date-stamped versions, compare overlay/slider
- Morph timelapse → MP4 → auto-save to Content Studio folder
- Exported MP4 appears as clip in Content Studio for stakeholder reels

### 2H. 3D Print Lab (Sub-Feature)

- Multi-printer management (USB, LAN, cloud)
- Auto-sectioning for large models
- STL/OBJ mesh preparation + auto-repair
- Connector library: peg/hole, tongue/groove, magnet recess, threads, gears/hinges
- Print queue with status tracking
- Scale slider + auto-section for multiple printers
- CuraEngine WASM slicer preview in browser
- Print cost/time estimate + material presets
- Multi-printer queue (Phase 2+)
- One-click "Send to Printer" — generates file, emails or saves to SlateDrop

---

## Phase 3 — App Ecosystem Infrastructure

This makes Slate360 modules individually subscribable and installable.

### 3A. PWA Foundation

**Currently missing — zero PWA infrastructure exists.** Marketing pages claim PWA but nothing is implemented.

| Task | What to Do |
|---|---|
| Create `app/manifest.ts` (`/manifest.webmanifest`) | App name, icons, `display: standalone`, `start_url`, theme/bg colors (`#1E3A8A` / `#FF4D00`) |
| Add manifest link to `app/layout.tsx` | `<link rel="manifest" href="/manifest.webmanifest">` + `themeColor` + `apple-touch-icon` |
| Install `next-pwa` or `@ducanh2912/next-pwa` | Configure in `next.config.ts` with runtime caching strategies |
| Create service worker config | Cache static assets, API responses for offline capability |
| Add install prompt component | "Add to Home Screen" banner for mobile/desktop |
| Generate app icons | 192×192, 512×512 PNG icons from Slate360 logo |

### 3B. Per-Module Standalone Routes

Each module should work as both a Slate360 dashboard tab AND a standalone entry:

| Module | Integrated Route | Standalone Route | Standalone Pricing |
|---|---|---|---|
| SlateDrop | `/(dashboard)` widget | `/slatedrop` (exists) | $39–$99/mo |
| 360 Tour Builder | `/(dashboard)/tour-builder` | `/tour-builder` | $25–$99/mo |
| Punch Walk | (integrated w/ Project Hub) | `/punch-walk` (PWA) | $15–$49/mo |
| Photo Log | (integrated w/ Project Hub) | `/photo-log` | $19/mo or per-report credits |
| Plans PDF Tool | (integrated w/ Design Studio) | `/plan-review` | $29–$99/mo |
| Walk-to-Quote | (new) | `/walk-to-quote` | $39–$149/mo |
| Field Uploader | (integrated w/ SlateDrop) | `/field-upload` (PWA) | Free w/ Business+; $9/mo standalone |
| Deliverable Packs | (integrated w/ SlateDrop) | N/A (feature, not standalone) | Included in tiers |

### 3C. Subscription Model for Standalone Apps

**Expand `lib/entitlements.ts`:**

```typescript
// Add to Entitlements interface:
canAccessStandaloneSlatedrop: boolean;
canAccessStandaloneTourBuilder: boolean;
canAccessStandalonePunchWalk: boolean;
canAccessStandalonePhotoLog: boolean;
canAccessStandalonePlanReview: boolean;
canAccessStandaloneWalkToQuote: boolean;
canAccessStandaloneFieldUploader: boolean;
```

**Key principle:** Users who subscribe to Slate360 (creator/model/business/enterprise) get the integrated versions. Users who subscribe to a standalone app get just that module + basic SlateDrop storage.

**What to do:**
1. Add `org_feature_flags` table: `org_id`, `feature_key`, `enabled`, `expires_at`
2. Update `getEntitlements()` to merge org-level flags with tier defaults
3. Add standalone Stripe products/prices per app
4. Create `/api/apps/subscribe` endpoint for standalone app checkout
5. Build app directory page at `/apps` (replaces current `/features/ecosystem-apps`)

### 3D. App Directory / Store Page

Replace the current marketing-only `/features/ecosystem-apps` page with a functional app directory:

| Section | Content |
|---|---|
| Hero | "Slate360 Apps — Download, Subscribe, Integrate" |
| App cards grid | Each standalone app with: icon, name, description, pricing, "Subscribe" / "Open" / "Install PWA" buttons |
| Integration badge | "Included with your {tier} plan" if user already has access |
| Install instructions | PWA install prompt for supported apps |

### 3E. SlateDrop "Wow Features" (Foundation for App Ecosystem)

These SlateDrop upgrades serve both the integrated platform and standalone apps:

| Feature | What to Build | Priority |
|---|---|---|
| Request/upload-only links | `slatedrop_shares` table + token system + public upload page at `/public/slatedrop/[token]` | High |
| File version history | `version`, `version_group_id`, `is_latest` columns on `unified_files` + versions panel | High |
| Audit trail | `slatedrop_audit_log` table + `logAudit()` helper + activity panel | High |
| Global search | `pg_trgm` index on `unified_files.name` + `GET /api/slatedrop/search` + search bar UI | Medium |
| Deliverable packs | `slatedrop_packs` table + zip generation worker + manifest + share link | Medium |
| Deep links ("Open in tab") | `origin_tab`, `origin_route`, `origin_entity_id` columns on `unified_files` | Medium |
| Offline upload queue | IndexedDB (dexie) client queue + retry logic + "Uploads" tray UI | Medium |
| Storage quota warning UI | Show used/limit bar when approaching tier limit | Low |
| OCR on uploaded PDFs | Full-text search on PDF content | Low |
| CAD file preview (DWG, DXF, IFC) | Server-side conversion to thumbnail | Low |
| "Receive file" link (external upload without account) | Public upload portal | Medium |
| Folder share links with expiry | Time-limited share tokens | Medium |
| Bulk file operations (move, copy, rename multiple) | Multi-select + batch API | Medium |

**DB migrations needed for SlateDrop wow features:**

```sql
-- slatedrop_audit_log
CREATE TABLE slatedrop_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL, actor_user_id UUID,
  action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id UUID NOT NULL,
  metadata JSONB, created_at TIMESTAMPTZ DEFAULT now()
);

-- slatedrop_shares
CREATE TABLE slatedrop_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL, created_by UUID NOT NULL,
  token_hash TEXT UNIQUE NOT NULL, folder_id UUID,
  mode TEXT NOT NULL DEFAULT 'view',
  expires_at TIMESTAMPTZ, max_upload_bytes BIGINT,
  allowed_mime TEXT[], target_folder_id UUID,
  revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()
);

-- slatedrop_packs
CREATE TABLE slatedrop_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL, created_by UUID NOT NULL,
  root_folder_id UUID NOT NULL,
  status TEXT DEFAULT 'queued', s3_key TEXT, manifest_key TEXT,
  size BIGINT, created_at TIMESTAMPTZ DEFAULT now()
);

-- org_feature_flags (for standalone app subscriptions)
CREATE TABLE org_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL, feature_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true, expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, feature_key)
);

-- org_credits (dedicated credit tracking)
CREATE TABLE org_credits (
  org_id UUID PRIMARY KEY,
  storage_bytes_used BIGINT DEFAULT 0,
  storage_bytes_limit BIGINT DEFAULT 0,
  gpu_credits_balance NUMERIC DEFAULT 0,
  processing_credits_balance NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- credits_ledger
CREATE TABLE credits_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL, actor_user_id UUID,
  event_type TEXT NOT NULL, amount NUMERIC NOT NULL,
  units TEXT NOT NULL, metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- unified_files additions
ALTER TABLE unified_files ADD COLUMN IF NOT EXISTS origin_tab TEXT;
ALTER TABLE unified_files ADD COLUMN IF NOT EXISTS origin_route TEXT;
ALTER TABLE unified_files ADD COLUMN IF NOT EXISTS origin_entity_id UUID;
ALTER TABLE unified_files ADD COLUMN IF NOT EXISTS logical_id UUID;
ALTER TABLE unified_files ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE unified_files ADD COLUMN IF NOT EXISTS version_group_id UUID;
ALTER TABLE unified_files ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT true;
ALTER TABLE unified_files ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
```

---

## Phase 4 — Remaining Modules

Build in this order (by subscriber value and dependency chain):

### 4A. 360 Tour Builder

| Feature | Description | Priority |
|---|---|---|
| Panorama upload + viewer | Pannellum-based 360 viewer | High |
| Hotspot editor | Interactive info points, link scenes, add markers | High |
| Tour sequencing + auto-play | Multi-scene tour with transitions | High |
| Floor plan mapping | Upload PDF/image → drop pano pins on plan | Medium |
| Shareable public tour links | `/tour/[token]` public viewer | High |
| Multi-floor navigation | Switch between floors in tour | Medium |
| VR headset export (WebXR) | View tours in VR | Low |
| Progress comparison | Same camera angle, different dates, slider | Medium |
| Hotspot → Punch List | Auto-create punch item from 360 hotspot | Medium |
| % coverage metric | Track how much of site has 360 coverage | Low |

**Upload pipeline (critical):** Phones don't capture 360 images natively. Support: Insta360/Ricoh Theta upload via web, desktop drag-drop from SD card, email-to-project ingestion, and SlateDrop request links.

### 4B. Content Studio

| Feature | Description | Priority |
|---|---|---|
| Media library | Browse org media from SlateDrop | High |
| Photo report generator | Drag/drop photos → auto-group by date → captions → PDF export | High |
| Video clip trimmer | Basic trim + caption overlay | Medium |
| Social media export | Formatted exports for LinkedIn/Instagram | Low |
| Design Studio MP4 import | Auto-import morph timelapse exports | Medium |

### 4C. Analytics & Reports

| Feature | Description | Priority |
|---|---|---|
| Report type selection | Stakeholder, RFI, Budget, Photo Log, Submittal, Custom | High |
| Data section selector | Include/exclude sections (RFI, submittals, budget, photos, etc.) | High |
| Date range report generation | Build reports by period and scope | High |
| Saved reports registry | Persist and list generated reports | High |
| PDF download/share actions | Stakeholder-ready export and sharing workflow | High |
| CSV export all | Bulk data export from reports section | Medium |
| Automated weekly PDF report via email | Resend scheduled delivery | Medium |
| Delay risk score | Weather + schedule + dependency analysis | Low |
| Labor zone heatmap | GPS check-in analytics | Low |

### 4D. Geospatial & Robotics

| Feature | Description | Priority |
|---|---|---|
| Drone flight path planning | Map-based waypoint editor | High |
| LiDAR point cloud viewer | Potree-based web viewer | High |
| Progress scan comparison (mesh diff) | Overlay two point clouds, color difference | Medium |
| Orthomosaic generation | OpenDroneMap integration | Medium |
| Site boundary detection | Cadastral data auto-import | Low |
| Google Routes API | Pending API key allowlist update (currently OSRM fallback) | ⚠️ Blocked |
| Crew GPS heatmap | Track crew locations on project map | Low |

### 4E. Virtual Studio

| Feature | Description | Priority |
|---|---|---|
| Immersive walkthrough viewer | WebXR-based site walkthrough | High |
| Integration with Design Studio assets | Load 3D models from SlateDrop | High |
| Meeting room with screen share | Virtual space for client presentations | Medium |
| Avatar collaboration | Multi-user presence in virtual space | Low |

### 4F. CEO Command Center

**Access:** `slate360ceo@gmail.com` ONLY. This is a Slate360 platform-admin surface. No subscription tier grants access to this tab — it is not part of enterprise or any paid plan. Future: employee grant system via `slate360_staff` table.

| Feature | Description | Priority |
|---|---|---|
| Business health dashboard | MRR, ARR, churn, runway | High |
| Pricing simulator | What-if slider for tier pricing changes | Medium |
| Feature flags management | Enable/disable features per org | Medium |
| Team/action item management | Task tracking for business operations | Medium |
| Content management | Marketing content pipeline | Low |
| Employee access grants | Grant CEO tab access to Slate360 staff via `slate360_staff` table | High |

### 4G. Athlete360

| Feature | Description | Priority |
|---|---|---|
| Practice Field | Live session capture and clip creation | High |
| Film Room | Review clips with coaching tools, body-line overlay | High |
| Coach ↔ Player messaging | Threaded comments per clip | Medium |
| Homework assignments | Coach assigns clips for review | Medium |
| 3D model viewer | Interactive athlete model viewer | Low |

**Access:** Invitation-only, permission given by `slate360ceo@gmail.com`.

### 4H. Market Module Improvements

| Feature | Description | Priority |
|---|---|---|
| Decompose `MarketClient.tsx` (3,006 lines) | Extract into ~8 component files | High |
| Performance optimization | Lazy-load Web3 packages | Medium |

**Access:** Invitation-only, permission given by `slate360ceo@gmail.com`.

---

## Phase 5 — Advanced Platform Features

### 5A. GPU Processing Pipeline

**Architecture:** Next.js API → Redis/Upstash Queue → EC2 GPU Worker → S3 + Supabase

| Component | Tech | Status |
|---|---|---|
| Job queue | BullMQ + Redis/Upstash | 🔴 Not built |
| GPU worker (Docker) | COLMAP, OpenMVS, gsplat, PDAL | 🔴 Not built |
| Cost estimator | `POST /api/credits/estimate` | 🔴 Not built |
| Job tracking UI | Status polling + progress bar | 🔴 Not built |
| Auto-scaling | Spot instances (g4dn.xlarge → g5.8xlarge) | 🔴 Not built |

**Processing stack (Gaussian Splatting = PRIMARY deliverable):**

| Tool | Purpose |
|---|---|
| 3D Gaussian Splatting (Kerbl et al.) | Primary visual digital twin — MIT license, highest fidelity |
| gsplat / splatfacto | Faster training, better memory — NeRFStudio ecosystem |
| Instant-NGP NeRF (NVIDIA) | Optional enhancement for tight interiors / thin geometry |
| COLMAP | Camera pose estimation + sparse geometry (gold standard) |
| OpenMVG / OpenMVS | Fallback photogrammetry for engineering exports |
| OpenDroneMap (ODM) | Survey-grade outputs — GCPs, RTK, LAS/OBJ/DEM |
| PotreeConverter / PDAL | Point cloud tiling + web streaming |
| Three.js + WebGPU | Custom GS renderer for browser delivery |
| gltf-pipeline | GLB optimization (Draco compression + LOD) |
| py3dtiles | Cesium 3D Tiles generation |

**Why Gaussian Splatting over mesh-first (RealityCapture):**
- Orders of magnitude faster than traditional photogrammetry
- Looks better than meshes for interiors, construction sites, as-builts
- Zero expensive licensing (open-source)
- Perfect for web + XR delivery
- Lower capture requirements, less fragile with incomplete coverage
- Market as "Live 3D Site Capture", not "photogrammetry"

**Tier gating for processing:**

| Tier | Access |
|---|---|
| MVP (all) | Gaussian Splatting only, photo+video input, web viewer, progress comparison |
| Pro (model+) | GS + NeRF, measurement overlays, time comparisons, section cuts |
| Enterprise | GS + NeRF + mesh, ODM integration, RTK/GCP, BIM alignment, legal export packages |

**Cost:** ~$105–$300/mo for GPU infrastructure (spot instances). Full spec: `GPU_WORKER_DEPLOYMENT.md`.

### 5B. Real-Time Collaboration

| Feature | Tech | Priority |
|---|---|---|
| Live cursors / presence indicators | Supabase Realtime | High |
| Multi-user document editing | Supabase Realtime subscriptions | Medium |
| Conflict-free markup merges (CRDT) | Yjs or Automerge | Low |
| Role-based edit restrictions | Reviewers can't modify geometry | Medium |

### 5C. AI Features (SlateMind)

| Feature | Description | Priority |
|---|---|---|
| AI field assistant | Voice → structured log; sentiment to analytics | Medium |
| AI photo tagging | Auto-detect location, trade, progress % | Medium |
| Cross-module AI Q&A | "What open items block closeout?" | Low |
| AI plan review | Smart sheet detection, auto-organize, scope summary | Low |
| Photo → 3D conversion | Hunyuan (open-source image-to-3D) | Low |
| Hand-drawn plans → editable model | AI converts sketches to 3D base model | Low |
| Smart RFI from site | Snap photo → AI suggests RFI text | Low |

### 5D. Integrations Hub

| Integration | Type | Priority |
|---|---|---|
| Procore (BIM 360 data sync) | Two-way | Medium |
| Autodesk Docs | Two-way | Medium |
| QuickBooks / Foundation | Budget push/pull | Medium |
| MS Project / Primavera P6 | Schedule import | Medium |
| DocuSign / HelloSign | E-signature | Medium |
| Zapier / Make.com connector | Webhook-based | Low |
| API key management for customers | Self-service | Medium |
| Webhook events for third-party | Outbound events | Low |

**What to do:** Build `/(dashboard)/integrations` page (133 lines, exists as stub). Add `org_integrations` table. Start with one integration (DocuSign for contract signing) and build the pattern.

### 5E. Platform / Billing Enhancements

| Feature | Description | Priority |
|---|---|---|
| Self-service plan upgrade/downgrade | In My Account page | High |
| Seat management (add/remove org members) | Business/enterprise only | High |
| Credit rollover (unused monthly credits) | Capped rollover per tier — see `CREDIT_ROLLOVER_SYSTEM.md` | Medium |
| Usage analytics in admin dashboard | Storage/credit trends | Medium |
| Custom org branding (white-label) | Logo, colors on reports/portals/emails | Low |
| Global language picker | i18n support | Low |
| Metric/imperial unit selection per user | User preferences | Low |

---

## Phase 6 — Native Apps & App Store Distribution

### 6A. Capacitor Wrapper (PWA → Native)

| Step | What to Do |
|---|---|
| 1 | Install `@capacitor/core` + `@capacitor/cli` |
| 2 | Initialize: `npx cap init "Slate360" "ai.slate360.app"` |
| 3 | Add platforms: `npx cap add ios && npx cap add android` |
| 4 | Configure `capacitor.config.ts`: server URL, splash screen, status bar |
| 5 | Add native plugins: Camera, Filesystem, Geolocation, Push Notifications |
| 6 | Build: `next build && npx cap sync && npx cap open ios` |
| 7 | Test on simulators + physical devices |

**Why Capacitor over React Native:** Slate360 is already a Next.js web app. Capacitor wraps the existing web app in a native shell with access to native APIs. No rewrite needed. Same codebase ships to web + iOS + Android.

### 6B. Per-App Native Wrappers

| App | Bundle ID | App Store Name |
|---|---|---|
| Slate360 (main) | `ai.slate360.app` | Slate360 |
| SlateDrop | `ai.slate360.slatedrop` | SlateDrop by Slate360 |
| 360 Tour Builder | `ai.slate360.tour` | Slate360 Tours |
| Punch Walk | `ai.slate360.punch` | PunchWalk by Slate360 |
| Field Uploader | `ai.slate360.capture` | Slate360 Capture |

### 6C. App Store Submission Checklist

| Platform | Requirements |
|---|---|
| Apple App Store | Apple Developer account ($99/yr), screenshots, privacy policy, app review compliance |
| Google Play Store | Developer account ($25 one-time), content rating, privacy policy, target API level |
| Both | Push notification certs, in-app purchase integration (if selling standalone via stores) |

### 6D. Offline & Field Use

| Feature | Tech | Priority |
|---|---|---|
| Service worker caching | next-pwa runtime cache | High |
| Offline upload queue | IndexedDB (dexie) + background sync | High |
| Offline data access | Cache critical project data locally | Medium |
| GPS auto-stamping | Capacitor Geolocation plugin | Medium |
| Camera capture | Capacitor Camera plugin | High |
| Voice-to-text notes | Web Speech API or Capacitor plugin | Medium |

---

## Phase 7 — Long-Term Vision

### Standalone App Ideas (Full Feature Set)

| App | Description | Target User | Standalone Pricing |
|---|---|---|---|
| SlateDrop | File management + request links + packs | GCs, PMs, supers | $39–$99/mo |
| 360 Tour Builder Lite | Upload panos → hotspots → share link | Realtors, inspectors | $25–$99/mo |
| Photo Log Automator | Photos → auto-group → captioned PDF report | Supers, inspectors | $19/mo |
| Punch Walk | Walk site → photo → tag → assign → export PDF | QA/QC, supers | $15–$49/mo |
| Plans PDF Tool | Upload drawings → split → markup → issue set → share | PMs, architects | $29–$99/mo |
| Deliverable Packs | Select files → ZIP + manifest + branded share page | Drone providers, PMs | Credits-based |
| Walk-to-Quote | Site walk capture → proposal/estimate packet → PDF | Remodelers, GCs | $39–$149/mo |
| Slate360 Companion Uploader | Lightweight mobile upload → tag to project → sync | Field workers | Free w/ Business+ |
| Client Snapshot Portal | Shareable project link → view/click metrics | PMs, owner reps | Credits-based |

### Platform Differentiators vs Procore

| Slate360 Advantage | Procore Gap |
|---|---|
| Native reality capture (360 tours, drone, digital twin) | Fragmented — need DroneDeploy + Matterport |
| AI insights compound across modules | AI limited to Helix add-on |
| Visual-first (simpler for non-tech users) | Form-heavy enterprise UI |
| Gaussian Splatting digital twins in browser | No in-browser 3D |
| Standalone app ecosystem | Monolithic platform |
| Target: small-mid jobs < $25M | Enterprise-focused |
| Combined PM + creative tools | PM only (no design/content) |

### Accessibility & UX Polish

| Feature | Priority |
|---|---|
| ARIA labels for all interactive elements | High |
| Keyboard navigation (panels, tools, search) | High |
| Focus management for modals/panels | Medium |
| High-contrast mode | Low |
| Reduced-motion option | Low |
| Guided tours per project type (first-time user) | Medium |
| Searchable context-aware FAQ panel | Low |
| Hoverable tool tips (name + shortcut + description) | Medium |

---

## Dependency Graph (What Blocks What)

```
Phase 0 (Foundation)
  ├── 0A UI Components ──────────────────────────────┐
  ├── 0B File Decomposition                          │
  ├── 0C Activity Log Table ─────── Phase 1B, 1C     │
  ├── 0D file_folders Migration ─── Phase 2          │
  └── 0E Dependency Cleanup                          │
                                                     │
Phase 1 (Project Hub)                                │
  ├── 1A Tool Views ─────────────── 0A, 0C           │
  ├── 1B Project Home Cards ─────── 0C               │
  ├── 1C Notification Center ────── 0C               │
  └── 1D External Portal ───────── shares pattern    │
                                                     │
Phase 2 (Design Studio)                              │
  ├── 2A Shell ──────────────────── 0A               │
  ├── 2B-2D Viewers ─────────────── 2A               │
  ├── 2E Sharing ────────────────── 1D patterns      │
  └── 2F-2G Integration ────────── 2A, Phase 1       │
                                                     │
Phase 3 (App Ecosystem)                              │
  ├── 3A PWA Foundation ─────────── layout.tsx edits  │
  ├── 3B Standalone Routes ──────── 3A               │
  ├── 3C Subscription Model ────── entitlements.ts   │
  ├── 3D App Directory ─────────── 3C               │
  └── 3E SlateDrop Wow ─────────── 0C, 0D           │
                                                     │
Phase 4 (Remaining Modules)                          │
  └── Each module ───────────────── 0A, Phase 3      │
                                                     │
Phase 5 (Advanced)                                   │
  ├── 5A GPU Pipeline ──────────── AWS infra         │
  ├── 5B Real-time ─────────────── Supabase Realtime │
  └── 5C-5E ─────────────────────── Various          │
                                                     │
Phase 6 (Native Apps)                                │
  └── Capacitor + App Store ─────── Phase 3A (PWA)   │
```

---

## Quick Reference: Infrastructure Still Needed

| Infrastructure | Current State | Needed For |
|---|---|---|
| `manifest.webmanifest` | ✅ Present (`app/manifest.ts`) | PWA install, native wrapper |
| Service worker | ❌ Missing | Offline, caching, background sync |
| `next-pwa` package | ❌ Not installed | Service worker generation |
| `project_activity_log` table | 🟡 Migration scaffolded | Audit trail, ChangeHistory, notifications |
| `slatedrop_audit_log` table | ❌ Missing | SlateDrop file tracking |
| `slatedrop_shares` table | ❌ Missing | Upload-only links, external portal |
| `slatedrop_packs` table | ❌ Missing | Deliverable ZIP generation |
| `org_feature_flags` table | ❌ Missing | Standalone app subscriptions |
| `org_credits` table | ❌ Missing | Credit + storage tracking |
| `credits_ledger` table | ❌ Missing | Credit transaction history |
| GPU worker server | ❌ Not deployed | Digital Twin, photogrammetry |
| Redis/Upstash queue | ❌ Not configured | Job processing |
| Capacitor | ❌ Not installed | iOS/Android native apps |
| Apple Developer account | ❌ Not created | App Store submission |
| Google Play account | ❌ Not created | Play Store submission |

---

_To propose a new feature, add it under the appropriate phase with 🔴 status. Move to 🟡 when approved._
