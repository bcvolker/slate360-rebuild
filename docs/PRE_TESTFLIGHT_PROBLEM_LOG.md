# Slate360 — Pre-TestFlight Problem Log (Jun 29 2026)

Master log from a full start-to-finish UX audit (read-only code trace of all 6 journeys). Use this for
the pre-launch testing phase. ✅ = fixed this session; ⬜ = open; 📱 = must verify on a real iPhone.

## CRITICAL (blocks/derails the core flow)
- ✅ **Mobile deliverable dead-end.** The standalone Site Walk deliverables list only opened a
  deliverable when `share_token` existed — a freshly-generated draft (common post-capture path) had no
  open button. **Fixed (e12f7f87):** the card now links to the owner viewer `/site-walk/deliverables/[id]`
  always; the external share link is secondary. (`app/site-walk/(act-3-outputs)/deliverables/page.tsx`)
- ⬜ **Generate routes to a list, not the deliverable.** `CaptureV2GenerateDeliverableSheet.tsx:82` routes
  to a list after generating. Fix: return the new id and route to the owner viewer/editor so "generate"
  visibly produces something. (Mitigated by the list fix above, but the direct landing is better.)

## POLISH (degrades, doesn't block)
- ✅ **No Start-a-Twin on project home.** Added a "Start a Twin" quick-action tile (gated on `showTwins`,
  threads `?projectId=&mode=project`). (`components/projects/ProjectOverviewTab.tsx`)
- ✅ **Off-token status colors** on the deliverables list (`bg-yellow-700`/`bg-green-700`) → Graphite-Glass
  tokens.
- ⬜ **"Walk with drawings" and "Upload a drawing" both → `/plans`** (`ProjectOverviewTab.tsx`). Two labels,
  one destination — differentiate or merge.
- ⬜ **Two deliverable viewer components.** Public `/share/deliverable/[token]` uses `SharedDeliverableDocument`;
  owner `/view/[token]` + `/site-walk/deliverables/[id]` use `ViewerClient`. Consolidate so a viewer fix
  reaches both. (`app/share/deliverable/[token]/page.tsx:62`)
- ⬜ **Twin submit diverges native vs web.** Native advances in-component (upload/credit-gate/queue,
  `TwinCaptureFlow.tsx:310-380`); web routes to `/digital-twin/capture/review` (`:201`). Two submit
  experiences — dual-path test coverage needed; consider unifying.
- ⬜ **Every "create project" CTA → `/projects` hub, not the wizard** (`DashboardHomeContent.tsx:98,127`;
  `MobileAppRootContent.tsx:166`) — one extra hop on every create.
- ⬜ **SlateDrop hidden as an app tile but linked as a quick action** (`mobile-launcher-apps.ts:159`
  `inScope:false` vs `MobileAppRootContent.tsx:167`) — inconsistent discoverability.
- ⬜ **No top-level desktop `(dashboard)/slatedrop` route** — desktop SlateDrop is only project-scoped;
  `/slatedrop` exists under `(mobile)` + `site-walk`. Confirm desktop nav never dead-links a bare `/slatedrop`.

## Dashboard (management, not list — Brian's bar)
- ⬜ The desktop dashboard is informational (continue-card, counts, recent) but **not yet management-
  actionable** (no inline create/assign/triage). Aligns with the planned management-dashboard rebuild
  (`docs/design/DASHBOARD_PLANNING_AND_GAP_ANALYSIS.md`). Awaiting Brian's full spec.

## App-shell redesign (Brian — on the list)
- ⬜ **Redo all three shells** (Slate360, Site Walk, Twin 360) to ONE Graphite-Glass grammar (accent-only
  diff). Audit noted: inconsistent CTA labels ("New Walk" / "Start a Walk" / "New Work" / "New project"),
  SlateDrop reachable 3+ ways with different chrome, no single capture→review→deliver spine. Untracked
  panel design docs to review: `docs/design/SLATE360_DESKTOP_SHELL_ECOSYSTEM.md`,
  `SLATEDROP_FILE_MANAGER_DESIGN.md`, `DELIVERABLE_VIEWER_ARCHITECTURE.md`.

## 📱 Must verify on a real iPhone (cannot test in static trace)
- Site Walk camera capture (photo/360/voice) + the **blob lifecycle in post-capture review** (previews not broken).
- **Twin native ARKit/LiDAR capture** + the new **SwiftUI HUD** (commit d077bf98) — needs a Codemagic build.
  HUD hardening to confirm/finish on device: Dynamic-Island top inset (host zeroes `safeAreaRegions`),
  background-pause (pause ARSession + skip HUD pushes when backgrounded), 60pt touch targets for Light(48)/Done(56).
- Twin native vs web submit divergence on hardware.
- Portrait-hold, 48–72px targets, back/forward state retention through capture→review→deliver.
