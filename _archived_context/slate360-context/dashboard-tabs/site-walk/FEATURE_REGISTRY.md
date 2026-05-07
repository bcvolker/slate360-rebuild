# Site Walk — Feature Registry (Rolling)

Last Updated: 2026-04-24
Status: **Authoritative source-of-truth for Site Walk UX scope.**

> This is the single source of truth for what Site Walk *must do* end-to-end.
> Every UI screen and backend route maps back to one of these IDs.
> Add new ideas at the top of the relevant section, never delete; mark
> deprioritized as `[deferred]`.

Legend (Status column):
- ✅ shipped
- 🟡 partial / scaffolded
- 🟥 not built
- 🔭 deferred (post-MVP)

Legend (Layer):
- BE = backend (DB schema + API route)
- FE = frontend (UI / hook)
- INF = infra (S3, Stripe, Resend, cron, etc.)
- AI = model integration

---

## A. Global / Cross-Cutting Foundations

These are **prerequisites** for the whole Site Walk feature surface.
They live in Global Settings, not inside a Walk session.

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| A1  | Company Identity (name, address, website, hi-res logo PNG) | BE+FE | 🟡 | `organizations.brand_settings` jsonb has keys; no UI form, no `address` top-level column. |
| A2  | Personal Profile (name, title, phone, digital signature image) | BE+FE | 🟡 | `brand_settings.signature_url`, `contact_*`. No personal-vs-org separation. |
| A3  | Global Address Book (org-wide directory of external contacts) | BE+FE | 🟡 | `org_contacts` table exists + `/api/contacts` routes; no merged "directory picker" UI. |
| A4  | Address-Book → Project assignment | BE | ✅ | `contact_projects` join table. |
| A5  | Project intake form — Core (name, location, scope) | BE+FE | 🟡 | `projects.name`+`description`; **no dedicated `location`/`address`/`scope` columns** — currently in `metadata` jsonb. |
| A6  | Project intake form — Team & Stakeholders (multi-select from address book) | BE+FE | 🟡 | `project_stakeholders` + `project_members` + `project_collaborator_invites` exist; no picker UI. |
| A7  | Project tier-gated tabs (Budget / Schedule / Storage allocation) | BE+FE | 🟡 | Budget + Schedule routes exist; no tier-gating UI nor entitlement read in form. |
| A8  | Ad-hoc "Start Walk Now" — unassigned session | BE+FE | 🟥 | Sessions today require a project. Need nullable `project_id` on `site_walk_sessions` + post-walk attach flow. |
| A9  | Post-walk "Attach to Project / Create New" prompt | FE | 🟥 | UI flow only; depends on A8. |
| A10 | Per-tier storage allocation enforcement | BE+INF | 🟥 | No quota check on uploads. |

---

## B. Uploads, Additions & Flexibility

10 missing basics + 5 high-value additions per UX lead, plus everything I've already wired.

### B.1 Basics

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| B1  | Native OS camera-roll multi-select / drag-drop | FE | 🟥 | `<input type="file" multiple capture/>` + drag-drop zone. |
| B2  | HEIC / ProRAW → JPEG/WebP auto-conversion | FE+INF | 🟥 | Use `heic2any` client-side or Sharp on a pre-signed-URL Lambda; today browsers can't render HEIC. |
| B3  | Client-side video compression before upload | FE | 🟥 | `ffmpeg.wasm` or MediaRecorder transcode. |
| B4  | Document scanning (auto-crop + perspective correct) | FE+AI | 🟥 | OpenCV.js or a server-side call. |
| B5  | 360° media ingest (equirectangular detection) | FE+BE | 🟥 | Detect 2:1 aspect + EXIF `ProjectionType`. |
| B6  | File-type validation w/ user-friendly errors | FE | 🟥 | Show "DWG not supported, please export PDF". |
| B7  | Upload-queue UI ("3/50, pause, cancel") | FE | 🟥 | Hook into existing offline queue + new in-progress tracker. |
| B8  | Background uploading (survives app sleep) | FE+INF | 🟥 | Service Worker `BackgroundFetch API` (Chrome) + iOS workaround (resume on next foreground). |
| B9  | Categorization taxonomy (Discipline picker on upload) | BE+FE | 🟥 | New `discipline` enum + lookup on org. |
| B10 | Cloud-drive imports (Google Drive / OneDrive / Dropbox) | BE+INF | 🟥 | OAuth + file-picker SDKs. |

### B.2 High-value adds

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| B11 | AI auto-tagging (HVAC / Drywall / etc.) | AI | 🟥 | OpenAI Vision or a lightweight local model on S3 trigger. |
| B12 | EXIF / GPS extraction → retroactive map placement | FE+BE | 🟥 | `exifr` client-side; write to `site_walk_items.metadata.gps`. |
| B13 | Markup component library (AEC symbols) | FE | 🟥 | Pre-saved SVG palette consumed by the canvas. |
| B14 | Voice-command capture ("Slate, take a photo and flag critical") | FE+AI | 🟥 | Whisper-streaming + intent parser. |
| B15 | Template slots — required checklist before walk-complete | BE+FE | 🟥 | New `walk_templates` table + slot satisfaction check on close. |

---

## C. The Simple Walk & Data Collection (Field UX)

### C.1 Basics

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| C1  | Hardware volume-button → snap photo | FE | 🟥 | iOS PWA limitation; works in native wrapper only. Document caveat. |
| C2  | Live voice-to-text preview while recording | FE+AI | 🟥 | Streaming Whisper or browser SpeechRecognition fallback. |
| C3  | High-contrast "Glare Mode" toggle | FE | 🟥 | Tailwind theme switch + bigger tap targets. |
| C4  | Gesture nav (swipe between Camera / Note / Voice) | FE | 🟥 | `@use-gesture/react`. |
| C5  | Quick-location selector (predefined zone tap) | BE+FE | 🟥 | Per-project `zones` table. |
| C6  | Battery-saver mode (dim UI, lower fps) | FE | 🟥 | Detect `Battery API` + reduce WebGL frame rate. |
| C7  | Screen-lock prevention (wake lock) | FE | 🟥 | `navigator.wakeLock.request('screen')`. |
| C8  | Sticky settings (priority, discipline persist across items) | FE | 🟥 | Persist in draft store. |
| C9  | Draft review screen ("Save session?") | FE | 🟥 | Final summary modal. |
| C10 | One-tap quick capture (skip metadata) | FE | 🟥 | Big floating shutter; defer metadata to later edit. |

### C.2 High-value adds

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| C11 | Apple Watch / wearable trigger | INF | 🔭 | Companion native app required. |
| C12 | Audio-only walk mode → AI parses into items | AI | 🟥 | Whisper transcript → GPT-4o item extractor. |
| C13 | Auto-grouping by time/location | BE+FE | 🟥 | Server-side clustering on `site_walk_items.created_at` + GPS. |
| C14 | Vibration haptics on save / fail | FE | 🟥 | `navigator.vibrate()`. |
| C15 | Offline proximity warnings (dead-zone pre-warn) | FE | 🔭 | Needs cellular signal heuristic; deferred. |

---

## D. Projects, Plan Versioning & Asset Libraries

### D.1 Basics

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| D1  | Plan version control (Rev 1 → Rev 2 link) | BE+FE | 🟡 | `site_walk_plans` has `version` field; no parent/child linkage. |
| D2  | Pin migration tool (bulk-copy unresolved pins to new rev) | BE+FE | 🟥 | New endpoint `/api/site-walk/plans/[id]/migrate-pins`. |
| D3  | Standardized overlay assets (title blocks, watermarks) | BE+FE | 🟥 | Per-org SVG asset library. |
| D4  | Zone mapping (geofenced zones on plan) | BE+FE | 🟥 | New `plan_zones` table. |
| D5  | Baseline vs. actual side-by-side mode | FE | 🟥 | Two-pane viewer using existing `usePlanViewer`. |
| D6  | Folder structures (Building > Floor > Phase) | BE+FE | 🟡 | `project_folders` exists; not surfaced for plans. |
| D7  | Asset/equipment QR pinning | BE+FE | 🟥 | New `equipment_assets` table + QR generator. |
| D8  | Plan alignment tool (rotate/scale overlay) | FE | 🟥 | Affine transform stored in `site_walk_plans.transform jsonb`. |
| D9  | Measurement calibration (set known scale) | BE+FE | 🟥 | `pixels_per_unit` on plan. |
| D10 | Archive old plan versions | BE+FE | 🟡 | Need `is_archived` column. |

### D.2 High-value adds

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| D11 | "Time-travel" chronological slider | FE | 🟥 | Time-bounded query against `site_walk_pins.created_at`. |
| D12 | BIM / Revit / Navisworks 2D export pull | INF | 🔭 | Forge API integration. |
| D13 | Company-wide sticker packs (custom markup palettes) | BE+FE | 🟥 | Org-scoped extension of B13. |
| D14 | AI auto-alignment (detect walls between revs) | AI | 🔭 | Heavy compute; deferred. |
| D15 | Project-health heat map | FE | 🟥 | Density overlay using current pin coords. |

---

## E. Deliverables & Findings Presentation

### E.1 Basics

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| E1  | Custom cover pages (full-bleed photo + text) | BE+FE | 🟥 | New deliverable template type. |
| E2  | Auto-generated linked Table of Contents | BE | 🟥 | PDF generator addition. |
| E3  | Layout grids (1-up / 2-up / 4-up) | BE | 🟥 | PDF template variants. |
| E4  | Map-view summary (mini-map per item) | BE+FE | 🟥 | Render plan crop alongside item in PDF. |
| E5  | CSV / Excel export | BE | 🟥 | `xlsx` generator + new endpoint. |
| E6  | Summary statistics block (open/closed/critical counts) | BE | 🟥 | Aggregate at deliverable build time. |
| E7  | Localized formatting (metric/imperial, date formats) | FE | 🟥 | i18n locale per user/org. |
| E8  | Legal disclaimer / appendable text blocks | BE | 🟥 | Org-level template field. |
| E9  | Signature blocks (digital sign-off) | BE+FE | 🟡 | `brand_settings.signature_url` exists; no sign-off workflow. |
| E10 | Brand theming on exports (color + logo injection) | BE | 🟡 | `brand_settings.primary_color` + `logo_url` available; not wired into PDF generator. |

#### E.1.x — In-flight delegated tasks

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| E10a | Site Walk PDF email mode (Resend attachment) | BE | 🟥 | Outside-AI prompt at `prompts/CURRENT.md` (PR #27d.2). Awaiting deliverable. |

### E.2 High-value adds

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| E11 | Interactive client portal (SlateDrop + filter) | BE+FE | 🟡 | SlateDrop scaffolded; Site Walk integration pending. |
| E12 | AI executive summary generator | AI | 🟥 | GPT call over deliverable JSON → 3-paragraph summary. |
| E13 | Auto-generated MP4 video tour from photos | INF+AI | 🔭 | FFmpeg + transitions; defer to v2. |
| E14 | Interactive before/after web slider | FE | 🟥 | Embeddable web component. |
| E15 | Auto-generated OAC meeting agenda | BE+AI | 🟥 | Filter by priority + format. |

---

## F. Client Interaction, Notifications, Logging

### F.1 Basics

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| F1  | Guest commenting (no license) | BE+FE | 🟡 | `viewer_comments` table referenced; no UI. |
| F2  | Approval workflow (Accept / Reject / RFI) | BE+FE | 🟥 | New `deliverable_approvals` table. |
| F3  | Granular per-link permissions (view/comment/edit) | BE | 🟥 | Extend `share_token` with `permission_level`. |
| F4  | Threaded replies under items | BE | 🟡 | `parent_id` exists in `viewer_comments`. UI absent. |
| F5  | @mention system | BE+FE | 🟥 | New mention parser + notification trigger. |
| F6  | Email notification toggles per user | BE+FE | 🟥 | New `notification_preferences` table. |
| F7  | Read receipts on shared deliverables | BE | 🟡 | `share_view_count` exists; no per-recipient receipt. |
| F8  | In-app notification center (bell icon) | BE+FE | 🟥 | New `notifications` table + realtime channel. |
| F9  | Status-change audit log per item | BE+FE | 🟥 | Append to `site_walk_item_history`. |
| F10 | Audit-trail export | BE | 🟥 | Per-item timeline → CSV. |

### F.2 High-value adds

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| F11 | Magic-link login for guests | BE+INF | 🟥 | Supabase OTP email. |
| F12 | SMS notifications (Twilio) | INF | 🟥 | New env + Twilio account. |
| F13 | Real-time typing indicators on comments | BE+FE | 🟥 | Reuse the new Supabase Broadcast layer. |
| F14 | "Action Required" client dashboard | FE | 🟥 | Filtered view of approvals + RFIs. |
| F15 | Automated follow-ups (reminder cron) | BE+INF | 🟥 | Vercel cron. |

---

## G. Reports, Analytics, Multi-Project Roll-ups

### G.1 Basics

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| G1  | Cross-session querying ("all unresolved electrical") | BE | 🟥 | Indexed query layer. |
| G2  | Drag-and-drop report column builder | FE | 🟥 | Persisted layout JSON. |
| G3  | Filter by tags (#SafetyHazard) | BE+FE | 🟥 | Tag taxonomy. |
| G4  | Saved report templates ("Monthly Exec Report") | BE | 🟥 | New `report_templates` table. |
| G5  | Automated recurring reports (cron-driven email) | INF | 🟥 | Vercel cron + send route. |
| G6  | Data viz (pie + bar charts) | FE | 🟥 | Recharts. |
| G7  | Conditional formatting (red if past due) | FE | 🟥 | Renderer rules. |
| G8  | Multi-project roll-ups | BE | 🟥 | Org-wide aggregate endpoint. |
| G9  | Raw JSON / CSV dump | BE | 🟥 | Service-role export route. |
| G10 | Custom metric formulas (Cost × Quantity) | BE+FE | 🟥 | Stored expression evaluator. |

### G.2 High-value adds

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| G11 | Natural-language query bar | AI | 🟥 | Text-to-SQL via OpenAI tools. |
| G12 | Live dashboard share-links (evergreen) | BE+FE | 🟥 | Token-based read-only HTML. |
| G13 | White-labeled report subdomains | INF | 🔭 | Vercel domains API. |
| G14 | Predictive delay analytics | AI | 🔭 | Trained model required. |
| G15 | Subcontractor scorecards | BE+AI | 🟥 | Aggregate close-out times per stakeholder. |

---

## H. Canvas / Realtime / Markup (this chat's contributions)

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| H1  | `markup_data jsonb` on `site_walk_items` + `site_walk_pins` | BE | ✅ | Migration `20260423000002_canvas_markup_realtime.sql`. |
| H2  | `MarkupData v1` discriminated union (rect/ellipse/arrow/line/freehand/text) | BE+FE | ✅ | `lib/site-walk/markup-types.ts`. |
| H3  | `usePlanViewer` (page / zoom / pan / layers / clean-vs-marked) | FE | ✅ | `lib/hooks/usePlanViewer.ts`. |
| H4  | Long-press pin drop API w/ markup_data validation | BE | ✅ | `POST /api/site-walk/pins`. |
| H5  | PATCH pin (move + restyle + markup) | BE | ✅ | `PATCH /api/site-walk/pins/[id]`. |
| H6  | Pin UPDATE RLS policy | BE | ✅ | New in `20260423000002`. |
| H7  | Realtime `postgres_changes` on items + pins | BE+FE | ✅ | `useSiteWalkRealtime`, strictly typed filter. |
| H8  | Realtime **Broadcast** for cursor + pin drag (ghost rendering) | FE | ✅ | `sendCursorMove` / `sendPinDrag` + `onCursorMove` / `onPinDrag`. |
| H9  | Offline queue covers POST + PATCH + DELETE | FE | ✅ | `useSiteWalkOfflineSync.submitMutation`. |
| H10 | `patchPinPosition` / `patchPinMarkup` helpers | FE | ✅ | `lib/site-walk/pin-mutations.ts`. |
| H11 | Local `useUndoRedo<T>` history engine | FE | ✅ | `components/site-walk/canvas/useUndoRedo.ts`. |
| H12 | IndexedDB blob persistence for in-flight drafts | FE | ✅ | `lib/site-walk/draft-store.ts`. |
| H13 | DoubleDeleteModal (safe-delete) | FE | ✅ | Prior phase. |
| H14 | Konva (or Fabric) canvas component | FE | 🟥 | Next build. |
| H15 | PDF.js multi-page base layer | FE+INF | 🟥 | Next build. |
| H16 | Long-press gesture handler wired to API | FE | 🟥 | Depends on H14. |
| H17 | Cmd-Z / Cmd-Shift-Z keyboard binding for H11 | FE | 🟥 | Trivial wiring. |
| H18 | Multi-user cursor avatar overlay | FE | 🟥 | Consumes H8. |

---

## I. Auth / Sessions

| ID  | Feature | Layer | Status | Notes |
|-----|---------|-------|--------|-------|
| I1  | `withAppAuth("punchwalk", …)` wrapper | BE | ✅ | All Site Walk routes. |
| I2  | Session create / list / archive | BE | ✅ | `/api/site-walk/sessions/*`. |
| I3  | Session `project_id` nullable for ad-hoc walks (A8) | BE | 🟥 | Schema change required. |
| I4  | Magic-link guest viewer auth (F11) | BE | 🟥 | |

---

## Cross-Cutting Gaps to Surface to UX Lead

1. **No dedicated `address`, `website`, `brand_colors` columns** on `organizations` — everything is jsonb. UI form must edit `brand_settings` blob.
2. **No dedicated `location`, `address`, `scope`, `start_date`, `end_date`, `budget_total`, `client_id` columns** on `projects` — also jsonb. Need a structured ALTER if we want SQL filtering / reporting.
3. **No project ↔ address-book join for non-stakeholder roles** — `contact_projects` exists but is unused by any API today.
4. **No `discipline` taxonomy table** — needed for B9, F-search, G-rollups.
5. **No `notifications` table** — blocks F8.
6. **No `walk_templates` table** — blocks B15.
7. **No `is_ad_hoc` / nullable `project_id`** on `site_walk_sessions` — blocks A8.
8. **No tier-gating helper for project intake form** — must read `getEntitlements()` client-side.

---

## Backend Audit (snapshot)

See `slate360-context/dashboard-tabs/site-walk/BACKEND_AUDIT.md` for the
April 2026 audit of organizations / contacts / projects schema + API routes.
