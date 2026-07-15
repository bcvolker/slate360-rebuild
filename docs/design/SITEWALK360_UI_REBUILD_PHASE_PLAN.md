# SITE WALK 360 — UI Rebuild Phase Plan (from 2026-07-14 feedback)

Read alongside `SITEWALK360_LOCK_SHEET.md` (decisions), `SITEWALK360_SONNET_BUILD_PLAN.md`
(original B0-B6 order/files), and `SITE_WALK_LEGACY_FEATURE_AUDIT_AND_GAP_PLAN.md` (the
exhaustive feature inventory + gap list this phase plan executes against).

**Guiding principle for every phase from here on (Brian, 2026-07-14):** reuse the legacy
capture-v2 engine and backend wholesale — don't rebuild working logic. Rebuild only the visual
layer to Field System tokens/style, consistently. Close every confirmed gap from the audit doc
along the way. Never silently drop a feature the legacy build had, even an obscure one.

## Phase 1 — Home screen redesign — SHIPPED 2026-07-14

Commits `fa68056a` (status bar root-cause fix + header icon), `dd2b417a` (layout/symmetry/
bounded lists). Codemagic build triggered same day.
- Status bar: real root cause found by inspecting the shipped IPA directly
  (`UIViewControllerBasedStatusBarAppearance=true` was overriding every prior fix) — replaced
  with a static baked-in `UIStatusBarStyleDarkContent`, removing the JS/Capacitor bridge from
  the equation entirely.
- Header: added a real icon mark (inline SVG pin+dot) next to the wordmark.
- Symmetric primary buttons (Quick walk / Start a walk in a project).
- Reordered: Recent walks + Active projects to the top in new bounded/expandable vertical
  lists (`SW360BoundedList` — fixed height, "Show more" expands in place, "See all" routes to
  the full screen); Calendar + People combined into one compact bottom row.
- Back-button audit: confirmed clean (every drill-down screen already has one; only the 5
  legitimate tab roots + login + a redirect-only page lack one, correctly).

**Open verification:** needs Brian's eyes on the new build to confirm the status bar is
actually fixed this time — this is the first fix diagnosed from the real shipped binary rather
than guessed, so confidence is meaningfully higher than the previous 4 attempts, but only
on-device confirms it.

## Phase 2 — Capture screen reskin (B2.5)

Reuse `components/capture-v2/**` wholesale (the canvas-shell path — confirmed the live default,
not the legacy fallback). Rebuild every visual surface to Field System tokens: top bar, bottom
rail, source picker sheet, ghost panel/picker, angle thumbs, stop filmstrip, markup toolbar.
Close these confirmed gaps from the audit while reskinning (cheap since the component is
already being touched):
- Render `CaptureV2SyncBadge` (session + per-item) somewhere in the reskinned chrome — it
  exists, just isn't mounted.
- Wire the walk-layers/past-walks pin filter control (state + query already work, `PlanToolbar`
  just needs a real button instead of a voided callback).
- Wire `PlanPickerSheet` into the live walk-start fork so 2+ ready plan sets get a real chooser
  instead of a silent auto-pick.
- Add Undo (soft-delete grace) on stop delete.
- Decide front/back camera switch + manual focus (confirm intentional rear-only, or add).

## Phase 3 — Data-entry / stop-review screen reskin (B2.7)

Reuse `CaptureV2NoteReviewScreen` and its hooks wholesale (notes, status/priority, assignee,
tags, voice memos, dictation, AI boost, angle strip, stop switcher). Rebuild to Field System.
Close these confirmed gaps:
- **AI note cleanup Keep/Edit/Use-original diff UI** — you already promised this; raw text is
  saved, just needs a UI surface.
- **Before/after review UI** — show the linked prior photo + unlink control in-screen (or link
  out to the existing Progression/Compare viewer rather than rebuilding it inline — cheaper,
  reuses working code).
- Add the Trade field to the mobile screen (exists in the data model + on desktop, missing here).
- Decide whether to add a Title field to mobile (desktop/legacy has one; canvas-shell mobile
  doesn't — confirm intentional or add).
- Surface capture-time metadata (GPS/compass/weather) as read-only context, at minimum on the
  photo viewer overlay.

## Phase 4 — Plan viewer + walk lifecycle reskin (B2.6 + remaining B2.4)

Landscape plan canvas, sheet navigation, pin popover, walk-start fork sheet (plan vs. camera
choice), End Walk / Exit modal. All reused from the legacy engine, rebuilt visually.

## Phase 5 — Assignment / verify / photo-proof loop reconnection (B3.6)

The highest-leverage gap in the whole audit: three pieces already exist (self-serve assignee
progress, GC verify/reject, photo-proof capture) and only one is connected. Wire them into one
state machine: open → in_progress → ready_for_review (photo proof required) → verified/rejected,
assigner-only close. This is largely wiring + reskinning existing components, not new logic.

## Phase 6 — Reports loop (B3.1-B3.4)

PDF visual polish (color-coded status/priority table, per-company grouping — the underlying data
already renders as text, this makes it a real table), branding per-deliverable overrides (org
defaults already work; the deliverable_branding override table is the missing layer), the three
link lenses (presentation/oversight/action), fix the weather-in-PDF type-mismatch bug found in
passing.

## Phase 7 — Video capture + narration (B3.5)

Gated on the physical-iPhone MediaRecorder compatibility spike — **schedule this with Brian
soon, nothing else in this phase can start first.** Spec already locked: 60s/720p capped,
non-destructive `audio_mode: original|muted|narration`, narration = the stop's voice memo
synced over muted video in the interactive link.

## Phase 8 — App Store submission package (B4)

Privacy manifest, legal pages (privacy/terms/support), permanent reviewer account with seeded
data, captioned screenshots, physical-device acceptance pass, submit.

## Phase 9 — Business layer (B5)

Org-member email invites, member visibility scoping (today everyone sees all org work), admin
console, entitlement unification (FORBIDDEN ZONE — Claude prepares migrations, Brian approves/
applies).

## Phase 10 — Desktop web app + marketing site + monetization (B6)

`app.sitewalk360.app` as a real desktop surface (left rail, upload-first, report editor),
`sitewalk360.app` marketing site, Stripe billing.

---

**Total: 10 phases, 1 shipped, 9 remaining.** Phases 2-3 are the biggest lift (the actual
capture/data-entry reskin, per Brian's direct request); Phases 5-6 are mostly reconnecting
already-built pieces rather than new development; Phase 7 is blocked on a physical-device test
only Brian can run; Phases 8-10 are later-stage packaging/business work.
