# Site Walk (legacy) — Exhaustive Feature Audit & SW360 Gap Plan

**Date:** 2026-07-14. **Method:** three parallel deep-research passes over the legacy capture
engine (`components/capture-v2/**`, default-on canvas-shell path), the stop-review/data-entry
screen (`CaptureV2NoteReviewScreen` = the design docs' "Note & assign"), and everything else
(walk lifecycle, offline/sync, assignment/verify loop, setup wizard, dead code). ~200 distinct
items catalogued. This document is the source of truth for what SW360 must NOT silently drop
when it reskins the capture engine — read this before B2.5 (capture reskin) or any further
report/assignment work.

**Headline finding:** almost everything in the legacy capture + data-entry screens (photo/360/
voice/note capture, ghost mode, +Angle, thumbnails, plan pins, AI note cleanup, offline queue)
is real, working code that SW360 already inherits for free by launching into the same engine
(confirmed by the 2026-07-13 feature-parity audit). The NEW information in this pass is:
(1) several places where the CODE doesn't match what the LOCKED design docs already promised,
(2) a surprising number of fully-built, zero-importer dead features, and (3) the assignment/
verify-then-close loop is far more fragmented than assumed.

---

## PART 1 — Confirmed gaps vs. your own LOCKED design intent (highest priority)

These are places where a design doc (`SITEWALK360_SONNET_BUILD_PLAN.md`, `SITEWALK360_PIVOT_PLAN.md`)
already promised a specific behavior, and the actual code does something less.

1. **AI note cleanup has no Keep/Edit/Use-original diff UI.** Build plan B2.7 explicitly says
   "AI Clean-for-report: raw kept, Keep/Edit/Use-original with diff." The code (`useCaptureItems.ts`)
   silently overwrites the notes textarea with the AI-cleaned text. Raw text + provenance ARE
   preserved server-side (`metadata.note_raw`, `metadata.ai_provenance`) but nothing in the UI
   ever shows the user a diff or lets them revert. **This is the single most concrete "we said
   we'd build X, we built half of X" finding in the whole audit.**
2. **Before/after review UI doesn't exist.** Build plan B2.8 says "Auto-link `before_item_id`,
   unlinkable in review, before|after side-by-side after capture." The link IS created and saved
   at capture time (ghost-mode selection), but the Note & Assign review screen has zero UI for
   it — no "linked to [prior photo]" indicator, no side-by-side, no unlink control. (A *separate*
   dedicated Progression/Compare viewer screen does this well — see Part 2 item 7 — it's just not
   reachable from the stop-review screen itself.)
3. **Walk-layers / past-walks pin toggle is wired server-side but has no UI control.** Rev 6 lock:
   "walk layers (per-walk pin toggles over pristine plan masters)." The filter state and query
   logic exist in `PlanViewerLeaflet.tsx`, but `PlanToolbar.tsx` explicitly voids the callback
   (`void onChangeFilter`) — there is no button/control anywhere for the user to change it from
   "show all walks' pins." Confirmed dead, not just unstyled.
4. **No persistent sync-status indicator visible while capturing.** `CaptureV2SyncBadge` (session
   + per-item variants) is fully built but not rendered anywhere inside `NoPlansCaptureCanvas`/
   `WithPlansCaptureCanvas`. A user capturing offline today has no on-screen signal that anything
   is queued.
5. **PlanPickerSheet (multi-plan-set chooser) is built but unreachable.** When a project has more
   than one "ready" plan set, the canvas silently auto-picks the newest one — there's no UI to
   choose between them, even though a full Clean-vs-Additive picker component with "N prior pins"
   badges already exists (`PlanPickerSheet.tsx`). Self-acknowledged as pending work in
   `SW360_PATHMAP.md`.
6. **Undo delete-stop doesn't exist.** B1.5 called for "Add Undo (soft-delete grace)." Delete is a
   real confirm-dialog hard action with no recovery path.
7. **No Dynamic Type / accessibility font-scaling handling**, despite B2.7 calling for "bounded
   scrolling for Dynamic Type." What exists is keyboard-aware scroll padding — genuinely useful,
   but not the same thing as accessible text sizing (fixed `rows={5}`, fixed `min-h` throughout).
8. **Capture-time metadata (GPS/compass/weather/pitch/roll) is never shown to the user anywhere**
   in the review screen — captured, stored, used internally by ghost-mode matching, but invisible
   to the person actually doing the documentation. Not explicitly promised by a design doc, but a
   real field-documentation UX gap worth deciding on.

## PART 2 — Fully built, real backend + UI, but silently disconnected (wiring work, not new dev)

These aren't gaps in capability — the code exists and works — they're gaps in *discoverability*.
Each is cheap to reconnect relative to building from scratch, and each represents real
functionality Brian may not know still exists.

1. **The Ball-in-Court verify/reject loop is fragmented across 3 pieces, only 1 of which is live:**
   - `AssignmentPanel` (LIVE) — assignee can self-progress Ack → Start → Done. **No photo-proof
     requirement enforced**, and **no GC/assigner-side verify or reject control anywhere.**
   - `WorkflowItemCard` (DEAD, zero importers) — a complete item-level verify UI: status dropdown,
     Resolve/Verify buttons, backed by real `verified_by`/`verified_at` columns.
   - `ResolutionCapture` (DEAD, zero importers) — the actual photo-proof mechanism: side-by-side
     before/after capture, S3 upload, linked item creation, auto-resolves the parent.
   This matters directly for B3.6 (the locked "open→in_progress→ready_for_review→verified|
   rejected, only the assigner closes, photo-proof required" state machine) — **the pieces to
   build this already exist and are better-scoped than starting fresh; they just need to be
   reconnected into one flow**, not re-invented.
2. **"Certified Evidence export"** — a fully-built ZIP export (SHA-256 verification script,
   README, 1.5GB/1000-file caps) with a real API route and **zero UI callers anywhere**. Directly
   relevant to the evidentiary-chain-of-custody plan already locked elsewhere in the docs.
3. **`TemplateManager`** — real checklist/template CRUD with an "apply to session" mode. Zero
   importers. Worth knowing this exists before anyone considers building punch/photo-log
   templates from scratch.
4. **`ProjectInbox`** — a real per-project **Supabase Realtime** feed of new items with priority
   dots. Zero importers. This is meaningfully more than what SW360's current Inbox does (push vs.
   poll) — worth considering for a future Inbox upgrade.
5. **`DeliverableDefaultsForm`** (legacy Setup wizard) — per-project report auto-fill: client
   name/email, project number, default deliverable type, scope of work, inspector license. This
   is genuinely richer project-settings depth than what SW360's new project tabs have today.
   Candidate for porting into the SW360 Reports or Team tab.
6. **`StartWalkForm`** (legacy Setup wizard) — 7 walk types (Punch List/Progress/Inspection/
   Proposal/General/Safety/Proof of Work) + inline plan upload before launch. Home's current
   walk-start flow only ever creates "general" walks — this richer taxonomy exists but isn't
   reachable from Home.
7. **Progression + Compare viewer screens** (`/site-walk/progression`, `/site-walk/items/[id]/
   compare`) — real, working before/after and multi-step-chain viewers, grouped by location. This
   is likely where the "before/after side-by-side" gap noted in Part 1 item 2 should actually
   route TO, rather than being rebuilt inline in the review screen.
8. **Weather is captured correctly but its only display (a PDF cell) is likely broken** — a type
   mismatch (`ViewerMetadata.weather` typed as `string`, actual value is a structured object) means
   `Weather: [object Object]` or similar is the probable real-world output. Small, concrete bug.

## PART 3 — Genuinely nonexistent (decide build-vs-skip, don't hunt for phantom code)

- **Video capture mode** — does not exist anywhere in the legacy engine. This is a from-scratch
  build (already scoped as B3.5 in the locked plan — see Part 4).
- **Front/back camera switch, manual/tap-to-focus** — camera is hardcoded rear-facing; no focus
  control. May be an intentional simplification for a construction-documentation use case
  (rear camera is almost always what's wanted) — flagging for an explicit decision, not
  assuming it's a bug.
- **Onboarding / coach marks** — zero first-run tooltips anywhere in the legacy flow.
- **Conflict detection in offline sync** — the type system has a `"conflict"` status that no code
  path ever produces; sync treats HTTP 409 as silent success. Last-writer-wins in practice.
- **Individual retry/discard for a permanently-failed sync item** — only a count is shown, no
  per-item recovery action.

## PART 4 — Video / audio-removal / narration requirement (your latest ask)

**Good news: this is already fully specified**, in `SITEWALK360_LOCK_SHEET.md` rev 6 and
`SITEWALK360_SONNET_BUILD_PLAN.md` B3.5 — it just hasn't been built yet (gated behind a
physical-iPhone `MediaRecorder` compatibility spike, which only you can run). The existing spec
already covers exactly what you described:
- **60s max · 720p · capped bitrate (~19MB/clip)**, one video OR one photo-set per stop.
- **`audio_mode: original | muted | narration`**, chosen per clip at review, non-destructive
  (never re-encodes/discards the original audio track — it's a playback-mode flag, not a
  destructive strip). "Remove the audio" = the `muted` mode.
- **Narration** = the stop's voice memo synced over the muted video at playback time in the
  interactive link, with a fallback to a separate player if sync proves unreliable, captions/
  transcript shown, never auto-plays sound.
- Cloud transcode (Trigger + CPU worker) to a fast-start iOS-safe MP4 + poster, hash both
  original and derivative for evidentiary integrity.

**One real gap Part 1's data-entry audit surfaced that's directly relevant here:** the design
doc describes ONE mic button that "records/replaces a voice memo at review (also the narration
track)" — but the actual code has **two separate, unrelated mic controls** (dictation-that-types-
into-the-notes-field, and a standalone voice-memo recorder) and **no narration-track concept
anywhere in the capture/review screens today**. This isn't a blocker for B3.5 (narration is a
*playback-time* feature of the deliverable viewer, not something that needs to exist in the
capture screen yet) — but when B3.5 is built, use the existing standalone voice-memo recorder
(already real, already has playback/transcript/delete) as the narration source, not the dictation
mic.

**Next step on video specifically:** the physical-device MediaRecorder gate is the literal first
task — nothing else in B3.5 can start until that spike either passes or fails on your phone.

---

## Prioritized build order (proposed)

1. **Assignment/verify loop reconnection** (Part 2 #1) — highest leverage, all three pieces exist,
   this is wiring + a bit of UI, not new development. Directly unblocks B3.6's photo-proof
   verify-then-close requirement.
2. **AI note cleanup Keep/Edit/diff UI** (Part 1 #1) — you already promised this; it's a
   self-contained addition to one screen.
3. **Sync status indicator in the live capture canvas** (Part 1 #4) — cheap (component exists),
   high trust-value (users should always know if something's queued offline).
4. **Multi-plan-set picker** (Part 1 #5) — component exists, needs wiring into the live fork.
5. **Weather PDF bug fix** (Part 2 #8) — small, concrete, low-risk.
6. **Physical-device video gate** (Part 4) — blocks all of B3.5, needs your iPhone, should be
   scheduled soon since it's a hard dependency for a marquee feature.
7. Everything else in Parts 1-3 — lower urgency, sequence into B2.5 (capture reskin) and B3
   (reports loop) as those phases come up.

## Full raw inventories

The three research passes produced ~130 additional granular, file:line-cited items beyond the
gaps summarized above (every existing working control, exact component names, exact API routes).
That level of detail lives in this session's research output rather than duplicated here to keep
this document navigable — ping Claude in a follow-up session to re-surface the full raw list for
any specific screen if you need line-level detail while reskinning it.
