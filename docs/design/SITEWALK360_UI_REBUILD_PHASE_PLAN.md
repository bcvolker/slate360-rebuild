# SITE WALK 360 — UI Rebuild Phase Plan (from 2026-07-14 feedback)

Read alongside `SITEWALK360_LOCK_SHEET.md` (decisions), `SITEWALK360_SONNET_BUILD_PLAN.md`
(original B0-B6 order/files), and `SITE_WALK_LEGACY_FEATURE_AUDIT_AND_GAP_PLAN.md` (the
exhaustive feature inventory + gap list this phase plan executes against).

**Guiding principle for every phase from here on (Brian, 2026-07-14):** reuse the legacy
capture-v2 engine and backend wholesale — don't rebuild working logic. Rebuild only the visual
layer to Field System tokens/style, consistently. Close every confirmed gap from the audit doc
along the way. Never silently drop a feature the legacy build had, even an obscure one.

## Phase 1 — Home screen redesign — SHIPPED, CONFIRMED 2026-07-15

Commits `fa68056a`, `dd2b417a`, `65f825dd`, `641b50f7`. Three Codemagic builds across two
rounds of on-device feedback.

**Round 1** (`fa68056a`, `dd2b417a`): status bar root-cause fix (confirmed working on-device
2026-07-15 — `UIViewControllerBasedStatusBarAppearance=true` was the real bug, found by
inspecting the shipped IPA directly); header icon mark; symmetric primary buttons; Recent
walks/Active projects moved to the top; Calendar+People combined at the bottom.

**Round 2** (`65f825dd`, `641b50f7`, after Brian flagged the redesign still looked like
"pills" and washed-out): replaced individually-carded list items with one bounded tinted
container per section + full-width divided rows (`SW360ExpandableSection`); single bordered
"N total · Open/Close" toggle instead of competing "Show more"/"See all" links; "This week"
renamed "Schedule"; stronger contrast across every card (Needs attention, Assigned to you,
Schedule/People, Reports list, Inbox); back buttons added to all 4 non-Home tab roots (Inbox/
Capture/Reports/Projects); button label "Start a walk in a project" -> "Start a walk from a
project"; Inbox's legacy `/projects/{id}/deliverables` link translated to the SW360 reports
route. **Backend**: added the missing assignment-completion notification (assignee marks
done -> assigner now gets a project_notifications row, previously didn't exist despite
creation-time notifications already working); added a real two-way reply panel
(`SW360DeliverableQAPanel`) wired to a previously-fully-built-but-zero-UI-callers
authenticated Q&A route, so stakeholder feedback on a deliverable can now be read and replied
to from inside SW360, not just received as a one-way alert. Logo/icon mark redesign still
deferred per Brian.

**Status: Phase 1 complete and confirmed** (status bar verified on-device). Remaining known
gap: per-item viewer comments (`viewer_comments`, distinct from whole-deliverable questions)
still have no owner-reply route — only the deliverable-question thread got two-way reply in
this round.
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

## Phase 4 — Project workspace deepening (Brian, 2026-07-15)

The project detail tabs exist (Walks/Plans/Docs/Team/Reports) but Brian wants them to carry a
real project's full working life. Grounded in what the audits confirmed already exists:

- **Merge Plans + Docs into one "Documents" tab.** UI-level merge only: one tab, with a
  "Plans & drawings" group pinned at the top (plan sets are NOT ordinary files — they feed the
  rasterize pipeline and the walk-with-plans pin canvas, so they keep their upload/status/
  start-walk affordances) and the SlateDrop file browser below for everything else
  (contracts/specs/permits). Frees a tab slot for Schedule or Activity later.
- **Team tab becomes a real collaboration hub:** (1) linked contacts — the `contact_projects`
  join table + `StakeholderPicker` pattern from the legacy setup wizard already associate
  org_contacts with a project; surface that here so the project's people list includes
  non-user stakeholders, not just accounts. (2) Per-project communication — the legacy
  `ProjectInbox` component (real-time Supabase feed of project activity, fully built, ZERO
  importers) is the natural engine for a project-scoped activity/comms feed. (3) Collaborator
  assignment incl. **cross-company**: the pivot audit's strongest finding — cross-company
  collaborator invites (email/SMS/QR, 14-day tokens, cross-org fast path, collaborator-aware
  RLS) are ALREADY production-grade and already surfaced via CollaboratorInviteModal on this
  tab; what's needed is making the invite/join experience first-class (roles shown, pending
  states, resend) rather than a single button.
- **Project settings depth:** port the legacy `DeliverableDefaultsForm` fields (client
  name/email, project number, inspector license, scope of work, default report type) into the
  SW360 project workspace so reports auto-fill — richer than what the tabs hold today.

## Phase 5 — Plan viewer + walk lifecycle reskin (B2.6 + remaining B2.4)

Landscape plan canvas, sheet navigation, pin popover, walk-start fork sheet (plan vs. camera
choice), End Walk / Exit modal. All reused from the legacy engine, rebuilt visually.

## Phase 6 — Assignment / verify / photo-proof loop reconnection (B3.6)

The highest-leverage gap in the whole audit: three pieces already exist (self-serve assignee
progress, GC verify/reject, photo-proof capture) and only one is connected. Wire them into one
state machine: open → in_progress → ready_for_review (photo proof required) → verified/rejected,
assigner-only close. This is largely wiring + reskinning existing components, not new logic.

## Phase 7 — Reports loop (B3.1-B3.4)

PDF visual polish (color-coded status/priority table, per-company grouping — the underlying data
already renders as text, this makes it a real table), branding per-deliverable overrides (org
defaults already work; the deliverable_branding override table is the missing layer), the three
link lenses (presentation/oversight/action), fix the weather-in-PDF type-mismatch bug found in
passing.

## Phase 8 — Video capture + narration (B3.5)

Gated on the physical-iPhone MediaRecorder compatibility spike — **schedule this with Brian
soon, nothing else in this phase can start first.** Spec already locked: 60s/720p capped,
non-destructive `audio_mode: original|muted|narration`, narration = the stop's voice memo
synced over muted video in the interactive link.

## Phase 9 — App Store submission package (B4)

Privacy manifest, legal pages (privacy/terms/support), permanent reviewer account with seeded
data, captioned screenshots, physical-device acceptance pass, submit.

## Phase 10 — Business layer: org tiers, oversight & admin (B5, expanded 2026-07-15)

Brian's requirements, mapped against the pivot audit's findings:
- **Org-level oversight** (leaders see every walk their employees do): ironically the easy
  half — today EVERY member already sees all org work because member visibility scoping is
  missing entirely. The real build is the inverse: role-based scoping (Member = own walks +
  membered projects; Admin/leader = org-wide), fixing the org-wide reads in
  `lib/site-walk/load-hub-data.ts` / `lib/projects/access.ts`.
- **Bulk seat licensing by email**: org-member email invites don't exist yet
  (`/api/org/members/invite` only attaches pre-existing accounts) — needs an `org_member`
  invitation type reusing the production-grade collaborator-invite plumbing (tokens, Resend,
  pending state, accept path), plus a bulk paste-emails flow in the admin console.
- **Permissions / admin-only sections**: the schema already has per-member `permissions` jsonb
  (enterprise) with no admin surface. Billing/subscription/seat management must be gated to
  admin role — regular employees never see payment surfaces. Account screen splits into
  "everyone" (profile, sign-out) vs "admin" (branding, billing, seats, member management).
- **Entitlement unification** (FORBIDDEN ZONE — prepare only, Brian approves/applies): the
  dual legacy-tier vs modular systems conflict must be resolved before seats can be sold.

## Phase 11 — Desktop web app + marketing site + monetization (B6)

`app.sitewalk360.app` as a real desktop surface (left rail, upload-first, report editor),
`sitewalk360.app` marketing site, Stripe billing.

---

**Total: 11 phases — 1 complete, Phase 2 in progress, 9 ahead.** Phases 2-3 are the biggest
lift (the actual capture/data-entry reskin); Phase 4 (project workspace) and Phase 6
(assignment loop) are mostly reconnecting already-built pieces; Phase 8 is blocked on a
physical-device test only Brian can run; Phases 9-11 are packaging/business work. Cross-company
collaboration is NOT a future phase — the backend is already production-grade; Phase 4 just
makes it first-class in the UI.
