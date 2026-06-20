# Research Synthesis & Locked Technical Decisions (Prompts I–N + Report Layouts)

Status: **planning** (no app code). Distills 5+ independent external-AI passes on prompts
I–N plus the CEO's new dual-report-layout requirement. Companion to `FEATURE_SPECS.md`.

**How to read this:** where the external AIs independently agreed → **locked (high confidence)**.
Where they disagreed → **resolved** using what's actually in the repo (the repo audit wins ties).

---

## 1. Consensus — locked, high confidence

| Area | Decision | Key libraries (✓ = already in repo) |
|---|---|---|
| **Unified player** | Shell + **adapter** pattern. Unify at the **chrome + gesture layer**, NOT the renderer. One transparent gesture layer → normalized intents (rotate/pan/zoom/next/prev/reset) → active adapter. Per-slot serializable state (Zustand). Container-level fullscreen with iOS portal fallback. Token-gated manifest of signed URLs. | `@use-gesture/react`, `screenfull`, `@react-spring/web`, Zustand ✓ |
| **Splats** | **Stay on Spark + R3F.** Harden framing; bake orientation upstream. | `@sparkjsdev/spark` ✓, `@react-three/fiber`+`drei` ✓ |
| **360 / tours** | Keep **Photo Sphere Viewer** (already integrated); drive its camera imperatively from the shared gesture layer. | `@photo-sphere-viewer/core` ✓ (+ virtual-tour, markers, gyroscope plugins) |
| **Video** | Native `<video>`; add `hls.js` for adaptive; `plyr`/`video.js` only if needed. | `hls.js` (add) |
| **Galleries** | Embla or PhotoSwipe behind the same chrome. | `embla-carousel-react` or `photoswipe` (add) |
| **File manager** | **Keep & polish custom SlateDrop.** Don't adopt a library. | `@dnd-kit/core`, `@radix-ui/react-context-menu`, `@tanstack/react-virtual` (add) |
| **Notifications** | **One `notification_events` table → fan-out via Trigger.dev → channels** (in-app realtime + Resend + Twilio + Web Push). Per-user prefs in a real table. Throttle/dedupe/quiet-hours. Idempotency keys. In-app is the reliability baseline. | `web-push` (add), Trigger.dev ✓, Resend ✓, Twilio ✓, Supabase Realtime ✓ |
| **Calendar** | **Tokenized per-user ICS subscribe feeds** (`webcal://`). No sync engine. Stable UID + bump SEQUENCE; RRULE for recurrence; UTC or VTIMEZONE; CRLF + 75-octet folding (library handles). | `ical-generator` (add), `add-to-calendar-button` (add) |
| **Reports** | **One React template → web + PDF via Puppeteer/Playwright**, run in **Trigger/Modal (never a Vercel route)**. `printBackground`, `networkidle0`, `break-inside:avoid`, `@page` margins. | `puppeteer`/`playwright` + `@sparticuz/chromium` (add), `sharp` ✓ |

**Universal through-lines all of them endorsed:**
- **Heavy/ambiguous work goes upstream** — bake splat orientation+bounds in the Modal worker; run
  Puppeteer in Trigger/Modal. (Matches our existing architecture rule.)
- **Trigger.dev is the universal queue** — splat/content pipelines today; notification fan-out and
  PDF generation tomorrow.
- **Unify at chrome/gesture, reuse the player everywhere** — same `SlatePlayer` embeds in reports
  and SlateDrop previews.

---

## 2. Resolved disagreements (with rationale)

1. **360 + video: separate engines vs one R3F canvas** → **Separate engines, unified at the
   chrome/gesture layer.** Some AIs proposed rendering everything inside one Three.js scene. We
   reject that: Photo Sphere Viewer is already integrated and battle-tested; native/`hls.js` video
   handles scrubbing, codecs, captions, and accessibility far better than a WebGL video texture.
   Forcing them into R3F discards working code and fights each engine. The consistency users feel
   comes from shared chrome + one gesture grammar, not a shared renderer.
2. **Splat engine: Spark vs mkkellogg/GaussianSplats3D** → **Stay on Spark.** It's already at
   `2.1.0`, is actively developed by World Labs, and the mkkellogg author himself now points to
   Spark. Use mkkellogg's centering code as a **reference**, and adopt **SuperSplat (PlayCanvas,
   free)** as an **offline tool** to fix orientation/cleanup before export. No engine migration.
3. **Report PDF: Puppeteer vs @react-pdf** → **Puppeteer/Playwright primary** (true web↔PDF parity,
   premium photo-heavy layouts, real CSS). Keep `@react-pdf` only as an optional path for simple
   email-attachment docs. Deprecate the legacy `jsPDF` export.

---

## 3. Corrections — research claims vs repo reality (don't rebuild what exists)

- **Splat framing is already sophisticated.** `lib/digital-twin/splat-bounds.ts` already does
  **percentile-trimmed world-space bounds (2nd–98th)** and we have overview + interior navigation.
  So the splat task is **"harden + bake orientation upstream,"** not "build framing from scratch."
- **The off-center bug** is most cleanly fixed by **baking `up_axis` + `normalize_matrix` + bounds
  in the Modal worker at ingest** and having the viewer read them — deterministic, instant, kills
  the 180° problem at the source.
- **Media viewers already exist**: Photo Sphere Viewer (`TourPanoViewer`), native video,
  model-viewer (GLB), plus a vertical document renderer (`SharedDeliverableDocument`) AND a
  horizontal slideshow (`DeliverableSlideshow`) AND Q&A threads. → **Unify, don't rebuild.**
- **`folder_permissions` exists but is DORMANT** (table + `check_stakeholder_folder_permission`
  SQL function present; nothing calls them). Wiring this is the **highest-value** SlateDrop work.
- **The service worker (`app/sw.ts`) is a kill-switch** that unregisters — it **must be redesigned
  before Web Push can work.** This is a prerequisite, not a feature.
- **Notification prefs live in Supabase `user_metadata`** today — must move to a **real table** so
  fan-out can query preferences across users server-side.

---

## 4. NEW: Unified Report Architecture (vertical + horizontal + voice + files + comms)

The CEO's requirement maps cleanly onto a **block model** the repo is already half-built for.

**A report = an ordered list of BLOCKS.** Block types:
- text / heading, photo, **before/after pair**, callout, divider
- **media-embed** → renders via the unified `SlatePlayer` (twin / 360 / tour / video / gallery)
- **voice-memo** → audio player + transcript
- **embedded-file** → any SlateDrop file (preview via the player; download gated by permission)

**Two RENDER MODES from the same blocks (CEO requirement):**
- **Vertical (document):** scroll; **single-column OR side-by-side two-column** layout. Best for
  detailed reports with inline voice memos and embedded files. (Generalizes
  `SharedDeliverableDocument`.)
- **Horizontal (cinematic):** one block per slide, swipe/arrow/keyboard, full-bleed. Best for
  presentations. (Generalizes `DeliverableSlideshow`.)
- The sender picks a default; the viewer can toggle. Both are token-gated share links.

**Three OUTPUTS from the same blocks:**
- Interactive **web link** (either mode, embedded interactive media live).
- **PDF** (Puppeteer, vertical layout; interactive media degrade to poster + "view interactive"
  link/QR).
- **Email / SMS** delivery (Resend / Twilio — already wired).

**Two-way communication (CEO requirement) on BOTH layouts:** a comment/Q&A thread attached to the
report (optionally per-block). The owner can **reply back**; the external party is notified by
email/push via the new notification service. This is the existing Q&A loop, made bidirectional and
available in both vertical and horizontal modes.

**Voice memos** (high-impact, low-effort, repeatedly recommended): hold-to-record `.m4a` during
capture or report editing → upload → **Modal Whisper transcription** (token-metered) → the
voice-memo block shows the player **and** the transcript (also feeds photo notes).

---

## 5. Prerequisite blockers (sequence these FIRST)

1. **Redesign the service worker** (replace the kill-switch with a real Serwist SW + `push` /
   `notificationclick` handlers; bump version so old clients update) — blocks Web Push.
2. **Wire `folder_permissions`** (call the existing SQL check in SlateDrop routes; filter the tree
   by `can_view`) — blocks the permission UI and secure external intake.
3. **Move notification prefs to a real table** — blocks notification fan-out.
4. **Bake splat orientation + bounds in the Modal worker** — cleanest twin-centering fix.
5. **Pick one canonical share route** (`/view/[token]`) to host the unified `SlatePlayer` and the
   report renderer, consolidating today's per-media share routes.

---

## 6. Consensus library shortlist (add list)

`@use-gesture/react`, `screenfull`, `@react-spring/web`, `hls.js`, `embla-carousel-react` (or
`photoswipe`), `@dnd-kit/core`, `@radix-ui/react-context-menu`, `@tanstack/react-virtual`,
`web-push`, `ical-generator`, `add-to-calendar-button`, `puppeteer`(+`@sparticuz/chromium`) or
`playwright`. **Offline tool:** SuperSplat (orientation/cleanup). **Reference only:**
mkkellogg/GaussianSplats3D (centering), Novu (notification architecture), `@cubone/react-file-manager`
(callback contract).

---

## 7. What else we need to perfect (open items)

- **Report block schema** — finalize the block types + per-block metadata (this is the contract the
  web renderer, PDF renderer, and editor all share). Worth a dedicated mini-spec.
- **Voice-memo transcription**: auto-transcribe on upload (costs tokens) vs on-demand. (Lean: auto,
  cheap via Whisper, high value.)
- **Per-block comments vs report-level only** for the two-way thread.
- **Content Studio material is a SEPARATE app track.** The large FFmpeg/LUT/transitions/subtitles/
  export-aspect-ratio body of wisdom is captured for that workstream — it is not part of the
  viewers/reports/files/notifications/calendar scope and shouldn't blur this plan.
- **Offline capture queue** + **share analytics** (view tracking) — noted, later phase.

---

## 8. Merged build order (consolidated from all passes)

0. **Prereqs/quick wins:** create `/app/slatedrop/page.tsx`; redesign SW; bake splat orientation in
   worker; pick `/view/[token]`.
1. **Unified `SlatePlayer` shell** + gesture router + chrome + fullscreen; video/image/gallery +
   Photo Sphere adapters; token manifest.
2. **Splat adapter** in the player: recenter/orbit/walk controls + read baked bounds/orientation.
3. **Report block model** → vertical + horizontal renderers + voice-memo & embedded-file blocks +
   two-way comments.
4. **Notification fan-out service** (events table, prefs table, in-app realtime bell, Resend) →
   then Web Push (post-SW).
5. **SlateDrop**: wire `folder_permissions`, permission-assignment UI, copy, external intake, mobile.
6. **Report PDF** via Puppeteer in Trigger/Modal; deprecate jsPDF.
7. **Calendar**: ICS subscribe feeds + add-to-calendar; reminders via notifications.
