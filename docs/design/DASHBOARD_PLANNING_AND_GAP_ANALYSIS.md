# Slate360 Dashboard — Planning notes + Gap Analysis (Jun 29 2026)

**Status: PLANNING ONLY — do NOT build yet.** Brian will provide the authoritative dashboard
spec. This captures the *useful* signal from two older idea files (`dashboardideas.txt`,
`Dashbord3.txt`) so it isn't lost, with the stale/off-direction parts explicitly rejected.

## Hard framing (Brian, Jun 29)
- The Slate360 dashboard is a **MANAGEMENT / command-center**, not a project list. A project list
  is **~5% at most**. "Number of projects" is **one of the least important things** — do NOT feature
  it (it's the canonical example of a useless KPI to avoid).
- **App-centric now.** The product is Site Walk + Twin 360 (more apps later). The dashboard is the
  shared Slate360 entry point into those apps; it is NOT a generic "workspaces" grab-bag.
- **Form-factor optimized:** desktop dashboard ≠ mobile dashboard; each is designed for its device
  (apps now; desktop derived from the apps later).
- **Graphite Glass only.** Tokens, one accent per surface, no amber, no `rounded-full`, no hardcoded
  hex. The old files violate this and are NOT a visual reference.

## What is STALE / REJECTED in the two old files (do not copy)
- Orbitron headings, **light mode default**, fuchsia/amber/emerald literal colors → violates Graphite
  Glass. Reject.
- "Professions"/modules that aren't this product: **Athlete360, Geospatial/drone missions, Design
  Studio/VR, Content Studio** as first-class dashboard tiles → not the app-centric Site Walk + Twin
  360 focus. (Design/Content Studio are CEO-only/future; not dashboard headliners.)
- Pricing names ("Creator $79 / Modeling $199 / Business $499", "free/starter/pro/enterprise") →
  **superseded**; real model = two tiers per app (Site Walk, Twin 360) + bundle + a limited 14-day
  free tier (to be finalized in the pricing phase). Don't hardcode the old numbers.
- `react-icons`, `framer-motion`, `three.js` live 3D thumbnails, zustand `useDashboardStore` with
  `localStorage` persistence, a `/api/dashboard/session` mock bootstrap → **reference only**, not a
  drop-in; we use lucide + the existing server/entitlement stack, not a new client store of identity.
- "# active projects" stat, generic project-grid as the hero → **rejected** (the useless-KPI / list-
  as-dashboard anti-pattern Brian called out).

## What is USEFUL / on-direction (keep as intuition)
- **Command-center feel**, not an admin panel: lead with what the user *does next*, not counts.
- **"Continue where you left off"** (resume last project/walk/twin) — high-value, app-centric.
- **Deliverables / exports surface** front-and-center (shareable outputs) — aligns with our
  deliverable + SlateDrop work.
- **Communication / activity feed** ("Mission Feed"): client comments, processing-done alerts,
  @mentions — but Graphite-Glass, collapsible, no amber alert colors.
- **Tier = visible-but-locked** with contextual upgrade at the moment of intent (NOT hidden) — matches
  our locked entitlement rule.
- **Quick actions**: New project, upload, start walk / start twin — 1–2 clicks to value.
- **Usage meters** (storage / processing credits) as *minimal pills*, secondary — useful and tied to
  the real limits work (storage/processing/data/token costs), NOT giant charts.
- **Drag-file-to-create** and **one-click client share** — good north stars for later.

## Gap analysis (current dashboard vs the management-dashboard target)
Current: `app/(dashboard)/dashboard/page.tsx` → `DashboardHomeContent` (recent-projects widgets +
"Create a project" linking to the list). It is closer to a project-list landing than a command center.
- **GAP: no "resume / continue"** surface (last walk/twin/deliverable). Backend has sessions, twins,
  deliverables — needs a per-user "recent activity across apps" read.
- **GAP: no deliverables/exports surface** on the dashboard (we now have Site Walk + Twin deliverables
  in SlateDrop — a cross-app "recent deliverables" read is feasible).
- **GAP: no cross-app activity/comms feed** (Site Walk has `project_notifications`, deliverable Q&A,
  evidence events; Twin has job-outcome notifications — these could feed one feed).
- **GAP: no tier/usage surface** tied to `resolveModularEntitlements` + storage/credits.
- **GAP: app entry** — the dashboard should route into Site Walk / Twin 360 workspaces (the app
  switcher from [[slate360-slatedrop-and-desktop-shell]]), not just into a project.
- **LEGACY to overwrite:** per Brian, existing dashboard/project-hub screens may be fully replaced even
  where backend is sound — rebuild on the data, retire legacy pages, keep everything consistent.

## When we build it (process)
1. Get Brian's authoritative spec; lock it into this doc + a memory file.
2. Confirm the backend reads exist (recent-across-apps, deliverables, entitlement/usage, activity) —
   build any missing server endpoints first (plumbing before UI).
3. Build desktop + mobile variants to Graphite Glass; retire legacy dashboard/project-hub pages.
4. Use the agents heavily — esp. the user-ability / multi-app / create-project / entitlement testers —
   to find missing screens, dead buttons, and access-control gaps before calling it done.

See [[slate360-cross-app-project-pipeline]] (dashboard=management-not-list directive),
[[slate360-dashboard-workspaces]] (tabs = no-scroll workspaces),
[[slate360-slatedrop-and-desktop-shell]] (app switcher + desktop shell).
