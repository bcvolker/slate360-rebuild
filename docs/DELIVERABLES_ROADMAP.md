# Deliverables Roadmap & Parked Work

Last updated: 2026-06-23
Owner: Brian (CEO)

Purpose: a single place to track what the Site Walk **deliverables** system ships
now vs. what is intentionally parked for later, so nothing is forgotten. Born out
of the app/desktop split audit.

## App-store scope (important)

Only **Site Walk** and **Twin 360** are submitted to the iOS / Android app stores.
All other apps (Thermal Studio, etc.) are **website-only, for internal/CEO use for
now** and are not part of the store submission or the "keep it lightweight for
mobile" constraint. Prioritize Site Walk + Twin 360 mobile performance accordingly.

## Doctrine recap

- Mobile app = **capture + light interaction + one-tap deliverables + view/share**.
- Desktop/web = rich authoring, interactive deliverables, anything heavy.
- Heavy generation must be offloaded (Trigger → Modal), never run in the request
  or on-device. PDF/photo embedding that needs image bytes should not block mobile.

## Deliverables: status

### Shipped — light-lift, one-tap, mobile-safe
These generate server-side from already-captured items into a templated
`ViewerItem[]` block array (no image bytes fetched in-request). The hosted token
viewer renders real photos and is itself a click-through slideshow.

| Type | deliverable_type | Output | Notes |
|---|---|---|---|
| Status report | `status_report` | hosted | Open/resolved summary. Pre-existed; now has a UI trigger. |
| Punch list | `punchlist` | hosted | Outstanding items by priority + status. |
| Photo log | `photo_log` | hosted | Chronological photo gallery. |
| Field report | `field_report` | hosted | Full chronological record of the walk. |
| Slideshow | `cinematic_presentation` | presentation | Client-facing click-through photo deck (cover + photos). Reuses the existing viewer. |
| Before / after | `report` | presentation | v1: pairs Ghost-mode `before_item_id`/`item_relationship` links into a click-through Before → After deck. Cross-walk "before" photos supported (media route authorizes by content reference). Slider / side-by-side compare is a later iteration. |

Generation entry point for Before/After: `POST /api/site-walk/sessions/[id]/before-after`.

Generation entry points:
- `POST /api/site-walk/sessions/[id]/status-report`
- `POST /api/site-walk/sessions/[id]/quick-deliverable` (`type` = punchlist | photo_log | field_report | slideshow)
- Mobile UI: `CaptureV2GenerateDeliverableSheet` on the walk-review screen.

### Already exists (do not rebuild)
- **Click-through slideshow viewer**: `app/view/[token]/ViewerClient.tsx` — full-screen
  stage, prev/next, arrow keys, thumbnail strip. Any photo deliverable opens as a
  slideshow when shared.
- **Send by link via email + SMS**: `POST /api/site-walk/deliverables/send` handles
  `recipient_email` and `recipient_phone` (Twilio via `lib/sms.ts`). Share/Publish +
  Send + Q&A controls live in `components/projects/ProjectDeliverablesTab.tsx`.

## Parked — later / not forgotten

### P1 — Contact picker for "Send" (the net-new piece of the slideshow request)
Goal: when sending a deliverable link, pick recipients from a contact list instead
of typing email/phone every time.
- **Slate360 contacts (SHIPPED, desktop):** the deliverable Send panel has a "From
  contacts" picker that loads the org's saved contacts (`org_contacts` via
  `/api/contacts`), searchable, and fills the recipient email/phone on select.
  (Mobile-side send surface still pending.)
- **Phone contacts (later / native):** the Web Contacts API (`navigator.contacts`)
  is Chrome-Android only — **iOS Safari does not support it**. On iOS this requires a
  native bridge in the wrapped app, so it belongs in the native-capability phase, not
  the web app. Document as a native task for the Site Walk app shell.
- A **mobile Send surface**: today Send lives in the desktop project Deliverables tab.
  For "send from the user's phone," add a Send action to the mobile deliverable view.

### P1 — Voice memos + AI Boost inside link deliverables (requested)
Goal: when building a deliverable that has a share link, the subscriber can
**optionally** attach voice memos, and use an **AI Boost** button to clean field
notes into report-ready prose — but must **review and approve** the result before
it is written into the deliverable. Never mandatory; never auto-applied silently.

What already exists (primitives — confirmed in code):
- The hosted viewer already renders `voice` items with an `<audio controls>` player
  + transcript (`components/site-walk/viewer/ItemRenderers.tsx`), so voice memos can
  appear in a shared link today if included in the deliverable content.
- Voice memos: recorded → S3 → Whisper transcription (`/api/site-walk/transcribe`),
  transcript stored on the item.
- AI Boost: `POST /api/site-walk/notes/format` rewrites raw notes into professional
  bullets + suggested classification/priority and **returns the cleaned text for
  review** — currently wired only at capture time (NoteCaptureBar / useCaptureItems),
  i.e. the user already verifies before it's saved.

Status — SHIPPED:
1. ✅ Optional "Include voice memos" toggle in the mobile generate sheet → voice
   items (audio + transcript) appended to quick-deliverable content; the view media
   route now serves voice audio via `audio_s3_key`.
2. ✅ AI Boost on the desktop project Deliverables tab ("Boost notes"): calls
   `POST /api/site-walk/deliverables/[id]/boost-notes` which returns a before/after
   proposal **without saving**; the user reviews each block and taps **Approve &
   apply** (PATCH content; re-publishes the pinned version if already shared) or
   **Discard**. Verify-before-it-lands, as required.

Still open:
- Mobile-side AI Boost review (today the review UI is desktop-only; mobile generates).
- The desktop `components/site-walk/reports/ReportBuilderClient.tsx` is still a static
  wireframe (blocks: photos/notes/plan/weather, no state) — full block authoring is a
  separate later build.

### P2 — Heavy / desktop-only deliverable types (web, post-launch)
Kept in the enum; **not** offered on mobile. Surface on desktop/web only, build as
demand warrants. Where rendering is heavy, offload to Trigger → Modal.
- `report` (block-editor authoring) — desktop only.
- `proposal`, `estimate`, `rfi`, `inspection_package`, `safety_report` — document
  deliverables needing real line-item authoring.
- `client_portal`, `kanban_board` — interactive hosting (config columns exist:
  `portal_config`, `kanban_config`; renderers not built).
- `virtual_tour`, `tour_360`, `model_viewer` — 3D/360 media; require Modal rendering.
- `media_gallery`, `spreadsheet_export`, `proof_of_work`, `client_review` — utility /
  niche; low near-term value.
- `custom` — keep as an escape hatch.

### P3 — Known limitations to revisit
- **PDF image embedding is placeholder-only** (`/api/site-walk/deliverables/[id]/export`
  emits `[Image: …]`). Photo-heavy PDFs won't show photos until real embedding is added
  (fetch S3 → base64 → `addImage`), ideally offloaded. The hosted viewer is the
  recommended delivery path meanwhile (it shows real photos).
- **`async_job_status` / `async_job_progress`** columns already exist on
  `site_walk_deliverables` — pre-wired for offloaded generation when needed.
- Legacy `components/site-walk/SessionReviewClient.tsx` is **dead code** (imported
  nowhere); the live mobile review surface is capture-v2. Candidate for removal.

## Related audit work items (separate from deliverables)
From the app/desktop split audit; tracked here so they aren't lost.
1. **Desktop "Create walk from photos"** (after-the-fact bulk import) — not started.
2. **Two-way real-time field assistance** — one-way monitor exists; desktop→field
   presence/comments/markup not built. Scope minimal feature before building.
3. **Thermal → project hub linkage** — `project_id` column already exists on
   `thermal_analysis_sessions`; only UI wiring remains. **Web-only / CEO use — not
   app-store-blocking**, so lower priority than Site Walk + Twin 360 store readiness.
