# SITE WALK 360 — LOCK SHEET & OPTIMIZED BUILD PLAN (rev 5, 2026-07-12)

One page of decided things + the build order. Supersedes screen/UX details in earlier
revs; the pivot rationale, audits, and business model stay in
`docs/design/SITEWALK360_PIVOT_PLAN.md`. Paste this to any AI panel as current truth.

## LOCKED DECISIONS

**Brand**
- **Reticle/crosshair mark RETIRED (Brian, rev 5):** reads as a gun sight — no optical-
  device geometry anywhere in the brand. Logo directions are pins/paths/plans/360:
  **L1 Waypoints** (numbered stops on a dotted path; current stop carries a red pin-dot)
  recommended, **L2 Plate** (SW monogram tile) as app-icon fallback, plus L3 Sheet+pin,
  L4 pano Sweep, L5 Degree wordmark. Brian picks L1–L5. Wordmark rule: "SITE WALK" bone
  on dark / charcoal on light, "360" in Site Green, red only inside the mark. Dark,
  light, one-color, and icon variants required.
- **Red restraint:** red appears ONLY as the logo pin-dot + record/destructive/error.
  Never the interaction color.
- Palette: **THE FIELD SYSTEM (final)** — charcoal `#14171B` / iron `#1C2127` chrome,
  warm bone `#F2EFE9` text/paper, silver `#C9D1D9` neutrals, signal red `#E23D2E`
  (dot/destructive only), and **Site Green in two contrast-verified variants of one
  hue: `#00B878` on dark (6.96:1 on charcoal) · `#007A52` on light (4.69:1 on bone)** —
  a single mid-green (#12A150) fails WCAG on bone (2.93:1), so dual tokens are law.
  BANNED: navy, amber. Dual-surface: dark capture chrome, light paper plan/report
  surfaces. Status = shape + label always. Final hue check on-device in sunlight +
  colorblind sim during B0.
- App portrait-locked; plan viewer + 360 viewer unlock to landscape on those screens only.
- Delight budget: crisp shutter/haptic feedback, visible saving, friendly language,
  satisfying completion states — no confetti, mascots, or decorative animation.

**Navigation** — `Home · Projects · ◉ Capture · Inbox · Reports`
- Inbox = **inbound/actionable only**: assigned items, questions, notifications.
  Unsent reports = Reports → Drafts (Home shows a reminder). Account behind avatar.
- Files/Docs live inside each project: tabs `Walks · Plans · Docs · Team · Reports`.
  Plans tab = floor plans/drawings only (PDF, rasterized, honest
  Processing/Ready/Failed+retry); Docs = everything else (contracts, specs, permits).
  Storage brand (SlateDrop) invisible to users.
- Home is role-aware: paid = Start/Resume/Attention/Assigned; collaborator lands on
  assigned work only, no create/billing surfaces.

**Capture state model (timing corrected)**
`LIVE_READY → [◎ Rephoto: pick → align] → shutter → CAPTURED_STOP → [+ Angle] → next`
- **Rephoto is PRE-shutter**, always visible in the idle viewfinder on project walks
  (disabled + "attach to a project" hint on quick walks). UI name is "Rephoto" — not
  "ghost."
- **+ Angle is POST-first-shot only**, on the confirm strip: `＋ Angle · Add info ·
  → Next stop`. Angles inherit the stop's pin/note/assignment. Rephoto never appears on
  the post-capture strip.
- Rephoto picker: large previews ranked **same plan-pin first** (pins ARE the indoor
  positioning), then heading/tilt/lens similarity, then GPS distance shown WITH its
  recorded accuracy (never fake "3 ft"), then date; radius widening 5/15/30 ft → pin →
  project; match-confidence label, "why suggested" shown.
- Align overlay: opacity slider + heading arrow + tilt bubble; auto-links
  `before_item_id` (unlinkable in review); after capture, stop review opens with
  before|after side-by-side. Ships staged: pin+heading first; tilt once pitch/roll
  metadata lands (compass/orientation already recorded in `lib/site-walk/metadata.ts`;
  add pitch/roll + lens/zoom in B1); distance coaching only when defensible.
- HUD keeps: numbered stop carousel (autosave, jump back/return), flashlight, END WALK
  always visible (neutral outline, NOT a second accent) forking **Pause & resume later /
  End & review**, mini plan chip (current walk's pins only).
- **Launch capture rail = PHOTO (default) · 360 · MORE…** (voice/note under More).
  **Video is NOT a working capture-v2 mode — post-launch**, not in launch UI. Voice is
  primarily attached at review today — don't market it as a first-class camera mode.
  Photo-on-photo pins = post-launch (V2 support is partial).
- **Novice labels (primary UI copy):** "Match prior photo" (Rephoto as secondary name),
  "Add photo to this stop" (Angle), "Note & assign" (Add info), "Past walks" (layers),
  "Assigned to" (ball in court), "Plans & drawings" / "Project files" (Plans/Docs).
  Jargon ("lens", "layer", "ball in court") never appears on primary controls.
- **Sync truth chip, always visible during walks:** All saved → Uploading → Waiting for
  signal → Needs attention. **Undo** after deleting a pin or stop.
- First-run: 3 coach marks max (capture, match prior photo, add note) + 1 rotate-for-plan
  hint; guided first-project creation (3 fields); collaborator first-open lands on
  Assigned only. No mock data in production accounts — the seeded demo lives only in the
  App Review account.

**Plan viewer (launch scope)**
- Landscape unlock; plan owns ~92% of pixels; floating chrome; collapsible thumbnail
  edge strip (persists as chip on capture screen); sheet ‹ › in both bottom corners.
- Explicit **+ PIN crosshair button** (gloves) + long-press shortcut; grab-pin suspends
  pan; native gestures disabled; pin popover = Capture into · Move · Attach
  (photo/360/doc) · Delete; everything user-created is deletable.
- **Walk layers:** plan set = pristine master; each walk's pins on its own layer;
  capture shows current walk (prior dimmed, toggleable); Visits panel with per-walk
  toggles + date/walker/status filters; visit-qualified labels (no duplicate "01").
- **Offline sheet cache** with cached/not badge before leaving signal = launch req.
- Launch search = sheet number/name + recents + jump-to-pin. **OCR full-text search =
  post-launch.** Also deferred: hyperlink callouts, revision compare, markup suite
  (we are a documentation pin tool, not CAD).

**Reports & the switching loop**
- Launch templates: **Punch list + Photo log** (+ interactive link). Inspection,
  cinematic, before/after, proposal = post-launch.
- Every report: same 3 exits (PDF / email / share link); auto-files into the project;
  preserves plan pin, capture date/author, raw-note provenance.
- **Three link lenses** over the same immutable snapshot, one primary CTA each:
  - **Presentation** (client): view · per-stop Approve / Needs change (short text
    required) / Question / Comment · optional PDF download. Frozen snapshot.
  - **Oversight** (leadership): Visits panel, walk-layer toggles, coverage cover
    ("4 visits · Jul 2025–Jul 2026 · 47 stops"), voice playback, 360s. Live only if
    labeled with updated-time. Framed as "documented site activity," not surveillance.
  - **Action** (sub, ball-in-court): ONLY their items · **Mark complete requires photo
    proof** · Question · Can't-do with reason chip → GC verifies/closes; link status
    updates live so subs don't re-poke.
- Owner loop: responses land in Inbox (grouped, digested — "3 new on AOB 205");
  **owner replies from Inbox post back onto the same link's stop thread** (recipient
  gets pinged back to the same URL — never a new portal). Inbox ↔ comments ↔ assignment
  completion = ONE state machine.
- No account for recipients (name + email / magic-link for write actions); token
  expiry/revoke/max-view enforced; scoped links never leak other companies' items,
  internal notes, or member emails. Retire `/share/deliverable/[token]` → redirect to
  `/view/[token]`.
- Share links live on the product domain (`sitewalk360.app/v/…`) — every delivered
  report markets the brand.
- **Send picker asks one question — "Who is this for?" → Client · My leadership · A sub
  (their items only)** — mapping to Presentation/Oversight/Action internally. Lens
  jargon never reaches users.
- Honest framing: the three lenses are **new backend work** (role-scoped tokens, frozen
  snapshots vs labeled-live oversight, per-company filtering, owner reply inbox +
  unified threads, photo-proof uploads, ready/verified/rejected/reopened states,
  expiry/revocation enforcement) — not viewer styling. Budgeted as the bulk of B3.
- Oversight = "documented site activity," never "employee surveillance" — GPS/timestamps
  support an audit record, not tamper-proof attendance.
- Home shows ONE context-aware primary (Resume when work exists, else Start) + compact
  Inbox/Reports badges — never duplicate their full lists. Home's Start and the center
  Capture tab open the same flow. Global Reports and project Reports = one
  implementation with a project filter.

**Accessibility (launch requirements, not polish)**
- 44pt Apple minimum targets, 48pt for field controls; the 12px sheet-strip handle
  becomes a ≥44pt labeled "Sheets" control.
- Dynamic Type without clipping on Home/Projects/Inbox/Reports (capture HUD may stay
  fixed); VoiceOver names everywhere ("Match prior photo," never "ghost"); a list-based
  alternative to the plan canvas (pins/sheets as a navigable list) so gesture-only
  canvas isn't a trap; Reduce Motion honored (skip shutter pulse/dive animations);
  visible focus + keyboard support on desktop.
- Plan cache discipline: storage limits, download progress, cancellation, versioning,
  and eviction rules for large sets — "cache everything forever" is not a plan.

**Voice + AI**
- Voice memos are first-class stop media in links — but **sender reviews before they
  ship** (field audio can contain candid internal talk): at send time, an explicit
  "This walk has N voice memos — include?" prompt with per-memo preview/toggles; the
  report preview shows exactly which memos are in. Proper player (play/pause, ±15s,
  seek, speed, remembered position, one-at-a-time); token-scoped range-streamed audio,
  no public URLs; PDFs get transcripts, never pretend-audio. "Listen to the walk" is a
  differentiator vs every competitor PDF.
- AI = **formatting assistance only** (`format_only_no_new_facts`): raw note/transcript
  always stored; Keep / Edit / Use original with visible diff; never silent overwrite;
  never infer responsibility/completion/safety conclusions; discarded AI text never
  appears publicly; provenance (model/time/policy) carried through quick-gen, editor,
  viewer, PDF, evidence export. Mobile stop review gets one-tap "Clean for report";
  report generate gets "Boost all notes" with review-before-apply.

**Business (unchanged from pivot plan)**
- Web-only billing, no IAP, no purchase steering in iOS. Pro seat / Business
  (admin console, org branding) / Enterprise / free invited Collaborator
  (assigned-scope only, cannot create projects or reports).
- **Pricing NOT locked:** repo configures $79/$149; pivot proposes $29/$49. Brian
  decides after entitlement unification; nothing publishes before that.

## OPTIMIZED BUILD PLAN (B0–B6)

- **B0 · Brand lock (short, parallel):** tokens from the Reticle System, app icon,
  wordmark W1, splash. On-device sun/colorblind verification. No further logo rounds.
- **B1 · Core truth (the non-negotiable machinery):** plan-set status lifecycle +
  failure surfacing + camera escape; honor `plan=<id>` selection; session-scoped pins;
  offline pin-link surviving relaunch; delete-stop cleans pin; End Walk on plan canvas;
  server-side Pro gate on plan walks; PDF export button wired; presigned-logo rot fix;
  `/share/deliverable` → `/view` redirect; **plan + pins render in PDF and share
  viewer**; capture-metadata extension (pitch/roll, lens/zoom). Without B1 the rebrand
  is lipstick.
- **B2 · Standalone shell:** new route group + brand; portrait lock (+ viewer
  orientation unlock); role-aware Home / Projects (5 tabs incl. Plans vs Docs) / Inbox /
  Reports; capture reskin with the locked state model (Rephoto pre-shutter, Angle
  post-shot, carousel, flashlight); landscape plan viewer + walk layers + offline
  cache; stop-review fast path (one-screen core, finish-later, last-used defaults);
  Rephoto v1 (pin+heading ranking, opacity align).
- **B3 · Reports loop:** punch list + photo log PDF templates (beat the Procore
  sample: summary table, status colors, per-company grouping, plan thumbnail per item);
  branding wiring (the built-but-dormant `deliverable_branding` system + org branding
  editor); three link lenses + response contract + owner Inbox reply loop + per-company
  filtered distribution; voice defaults + real player; AI Keep/Edit on mobile.
- **B4 · Foundational App Store package:** new bundle ID/icons/splash booting straight
  into SW360 (zero non-SW modules reachable); privacy manifest + SW-only permission
  copy; in-app account deletion; `sitewalk360.app` pages (privacy/terms/support/how-it-
  works — the site also serves as the app's required companion); `app.sitewalk360.app`
  login; permanent seeded reviewer account; physical-iPhone acceptance gates;
  Codemagic → TestFlight → submit. (Submission does NOT wait for B5.)
- **B5 · Business layer:** org-member email invites; Admin/Member/Collaborator
  visibility scoping (member ≠ see-everything); admin console (roles, remove/
  deactivate, seats, branding); entitlement unification (tier vs modular — forbidden
  zone: Claude prepares, Brian applies); ball-in-court completion state machine
  hardening.
- **B6 · Public monetization + growth:** Stripe products/seat quantities (Brian-approved
  pricing); pricing page live; SEO intent pages (punch-list templates, comparisons);
  ASO (keyword name/subtitle, captioned screenshots: landscape plan + punch PDF +
  interactive 360 — those three sell the SKU); review prompt after first sent report.

**Acceptance gates (from panels, adopted):**
1. Physical iPhone: camera/360/voice/notes/Rephoto/angles/plan-landscape/offline-
   reconnect/permission-denial/resume/end — no data loss.
2. Full loop: capture → plan pin → punch report → real PDF → interactive link →
   recipient Q&A + photo-proof completion → auto-filed in project.
3. Voice loop: record multiple memos → include/exclude → frozen link → recipient plays/
   seeks/speeds/reads transcript → revoked link cannot fetch audio.
4. Role isolation: Admin sees org; Member sees own+membered; Collaborator sees only
   invited items, no purchase/admin surfaces anywhere.
5. Native package: SW360 identity only, no purchase steering, no unfinished modules,
   non-expiring reviewer flow.

**Phase naming: B0–B6 is the ONLY system.** Earlier A–D / R0–R8 numbering in
`SITEWALK360_PIVOT_PLAN.md` and old artifact revs is superseded — one naming system,
zero implementation ambiguity. B4 packaging prep (bundle ID, privacy manifest, legal
pages, account deletion, reviewer seeding) starts in parallel with B2/B3, not at the end.

## REV 6 ADDENDUM (Brian, 2026-07-12 — overrides anything above that conflicts)

- **NO RED IN THE BRAND, period.** The red dot is retired with the reticle. Logos are
  Site Green + neutrals only. **Panel-converged recommendation: the WALKLINE PLATE** —
  M1's route geometry simplified inside M2's plate, ONE mark everywhere (no separate
  fallback icon) + spaced "SITE WALK 360" wordmark. Alternatives M1/M2/M3/M4 remain in
  the artifact if Brian prefers a single-concept mark. Red survives in the product only
  as the platform-standard destructive/error semantic.
- **Video capture is IN, with guardrails (final spec):** physical-iPhone MediaRecorder
  spike GATES it; **60s max · 720p · capped bitrate (~19 MB/clip)**; one video OR one
  photo-set per stop (angles photo-only; no pins during recording); cloud transcode;
  hash original + derivative, both billed to pooled storage, quota enforced server-side;
  interactive links only (PDF = poster + transcript + secure link); sound =
  `original | muted | narration` per clip (no mixed audio at launch, never autoplay);
  narration = stop's voice memo synced over muted video, fallback to a separate player
  if sync is unreliable; **narrated slideshow** = per-stop audio as recipients advance.
  Video stays OFF the capture rail (inside MORE) until the gate passes — ships B3.5 or
  first post-submit update.
- **Voice memo recordable at stop review** (mic button) — for users who don't type;
  doubles as the narration track.
- **In-app assignment loop:** assign a responsible person on a stop → if subscriber/
  linked collaborator: notification → Inbox Assigned → complete w/ photo proof →
  Submit for review → assigner closes or returns. Non-subscribers: same loop via Action
  link. One state machine, two channels. Subscribers on the same job link into the
  project with their existing accounts (cross-org membership exists).
- **Google/location (corrected):** LAUNCH = Places autocomplete + map confirm + one-tap
  Navigate + opt-in "near this project — resume?" + **weather stamping** (source +
  observation time shown; contextual, never "certified"). Google Static Maps imagery
  must NOT be persisted/re-hosted (render at display time or use an original non-Google
  cover). Boundary drawing POST-LAUNCH via Terra Draw (Google Drawing Library retired
  May 2026); Street View post-launch. Project creation = name + address only, then a
  setup checklist (Plans · Files · Team · First walk). **One canonical project per job**
  — other subscribers join with scoped membership, never parallel projects.
- **Share links host: `share.sitewalk360.app`** on the main app project (viewer needs
  the app's APIs/security headers — never routed through the marketing project).
- **Assignment states:** open → in_progress → ready_for_review → verified/rejected
  (reason required); only the assigner closes; every transition logs actor+time; email +
  Inbox badge sufficient at submit if push isn't ready.
- **Desktop web app (app.sitewalk360.app) is a first-class surface** — made-for-desktop
  (left rail, multi-pane, drag-drop uploads replacing capture, report editor, plan
  manager, admin console, team oversight). Not a stretched phone app.
- Execution doc: **`docs/design/SITEWALK360_SONNET_BUILD_PLAN.md`** (B0–B6 slices with
  file references).

**Open (Brian only):** logo pick M1–M4 (M1 Walkline recommended) · green hue confirm
on-device in sun · pricing ($79/$149 repo vs $29/$49 proposed).

## REV 7 ADDENDUM (2026-07-13 — panel brief #2 answers, locked)

Two independent AI panels answered `SITEWALK360_UX_PANEL_BRIEF.md`'s four open IA
questions. Where they converged, that's the lock below; the one place they diverged
(Q3) is resolved explicitly.

- **Q1 — Home's remaining space:** a **"This week" strip** (upcoming milestones/
  deadlines/scheduled walks across ALL projects, from `calendar_events` +
  `schedule_milestones` + assignment due dates) + a compact **"People"** row — not
  weather/streaks/gamification. Links out to full calendar/contacts views. Both panels
  converged on this independently.
- **Q2 — already locked in rev 6** ("name + address only, then a setup checklist:
  Plans · Files · Team · First walk") — both panels' answers matched this exactly, no
  change needed. Reuse the existing Google Places picker; nothing else joins the
  creation form.
- **Q3 — Inbox triage model (the one divergence, now resolved):** personal triage
  (flag / mark-as-to-do / done-for-me) is a **separate layer from the formal GC-verify
  state machine** (open→in_progress→ready_for_review→verified/rejected stays untouched
  and assigner-only). Locking a **new additive `inbox_triage` table**
  (`user_id, item_kind, item_id, flagged, is_todo, done_for_me, created_at`) over
  adding columns directly to `site_walk_assignments`/`project_notifications` — triage
  state is inherently **per-viewing-user**, and `project_notifications` rows are not
  guaranteed 1:1 per recipient, so a column on that row would falsely flag/complete the
  item for every recipient instead of just the user who triaged it. A junction table
  also generalizes cleanly if a third inbox item kind (e.g. calendar reminders) is added
  later, without a fourth set of bolted-on columns. Prepare as an additive migration
  (Brian applies via Supabase Management API) when B-phase work reaches Inbox.
- **Q4 — Calendar/Contacts placement:** hybrid of **(b) Home strips** (Q1's "This
  week"/"People") **+ (d) multi-door dedicated screens** reached from the Home strip's
  "see all," the account menu, AND a project's Team tab linking back to the same global
  contact record. **Not** a 6th tab, **not** a Projects sub-tab segment. Reuse the
  existing Coordination Hub backend (`org_contacts`, calendar tables, `ContactsClient`,
  `CalendarEventSheet`) rather than inventing a new model.
- **Ghost mode / "Match prior photo" timing (Brian, 2026-07-13, confirms existing
  code is already correct — no change, just don't regress it):** Rephoto/ghost is
  **pre-shutter** and must search the **entire project's walk history**, not just the
  current session — a user may need to recall a photo from a walk weeks earlier to line
  up the same angle/tilt/distance for a before/after or progression comparison.
  "+Angle" is a **separate, post-shutter** action. The legacy `useGhostProgression.ts` +
  `CaptureCanvasGhostPanel/Picker/Button.tsx` already implement this correctly
  (confirmed by the feature-parity audit); whatever SW360 capture surface ships must
  reuse this as-is rather than re-deriving the timing model. **Disabled on quick
  (project-less) walks** — no history to match against.
- **Coordination Hub scope decision — needs Brian's call, not yet in B0–B6:** Contacts
  + Calendar are a real, fully-built subsystem (own migrations, own UI) that predates
  the SW360 pivot and is currently absent from every phase of the build plan. Q1/Q4
  above give it a Home-strip + multi-door surface *if* it's brought into SW360 — the
  open question is whether to fold it in (likely alongside B2.3 Team, or a dedicated
  phase) or intentionally leave it Slate360-legacy-only. Flagged by the feature-parity
  audit as the one item most likely to read as "silently forgotten" rather than
  "deliberately deferred" if left unresolved.
