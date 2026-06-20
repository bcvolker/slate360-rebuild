# Slate360 — Brief for external AI design/architecture review

Paste everything below the line into another AI assistant (ChatGPT, Gemini, etc.)
to get recommendations on navigation, missing pages, UI fixes, and feature/flow
simplification for the two mobile apps. It is self-contained — the other tool
does not have the codebase, so it relies on this description.

---

You are a senior product designer + mobile architect. I run **Slate360**, a
field-operations platform for construction/AEC teams. It is a mobile-first web
app (Next.js PWA, dark "graphite-glass" UI) with three "app shells" the user
moves between:

1. **Slate360** — the home/launcher shell (projects, files/SlateDrop, activity, account).
2. **Site Walk** — walk a job site and capture geotagged photos/notes; can run a
   "walk with plans" (capture against an uploaded PDF floor plan, pin-on-plan) or
   a "quick walk" (camera only). Produces reports/deliverables.
3. **Twin 360** — reality-capture / digital-twin capture and viewing.

### Hard architectural constraints (do not violate in recommendations)
- The mobile apps are **capture + light interaction only**. Heavy compute
  (digital-twin reconstruction, thermal/site-walk processing) is dispatched to
  the cloud (orchestrator → GPU workers) from server APIs — never on device. Do
  not propose on-device/WASM/GPU heavy processing.
- Auth is org-scoped; data lives in a Postgres/Supabase backend with row-level
  security. Photos are in object storage, served via signed/proxied URLs.
- Tiering exists: some orgs are "workspace" tier (ad-hoc walks only), others
  "project" tier (walks scoped to a project).

### Current problems I want you to solve (from real user testing on iPhone)

**A. Top-bar / navigation is inconsistent and weak.**
- Multiple different header components exist; back buttons vary in size and
  behavior; sometimes you can't reliably go back, and there's no consistent way
  to jump between the three shells. Branding (logo) disappears on many screens.
- I've started fixing this with: one header that always shows the Slate360
  brand, a single 40px back button on every sub-route, and an "app switcher"
  control. I want your independent take on the *ideal* mobile nav model for a
  3-shell app: header vs. bottom-nav responsibilities, how to show "which app am
  I in," breadcrumbs, and how to make back/exit predictable in a full-screen
  capture mode.

**B. Walk creation & "walk from a project" are hard to reach on mobile.**
- The project-creation wizard works but is hard to find on mobile; starting a
  walk *scoped to a specific project* is only easy on desktop. I want a clean
  mobile flow: pick/create project → (optionally upload plan) → start walk.

**C. Too much test data, no easy cleanup.**
- A month of throwaway "quick walks" piled up; deleting them one-by-one (with
  name-match confirmations) is painful on a phone. I've added a bulk "clear test
  walks" tool. Suggest the right UX for destructive bulk actions on mobile
  (multi-select, undo windows, archive-vs-delete, guard rails).

**D. Ghost mode (Site Walk) needed a real definition.**
- Intent: at the current spot, surface prior photos taken *near here across all
  walks in the project* (different walks, possibly months apart) via GPS/EXIF
  geotags, in a scrollable large-thumbnail gallery. The user picks a prior shot,
  overlays it at adjustable opacity, matches the angle/distance, and re-shoots —
  for before/after & progression reports. I just built the first version
  (GPS-nearby fetch + thumbnail picker + opacity overlay). Recommend
  improvements: angle/compass matching aids, grouping by date, handling no-GPS
  indoors, pairing shots into before/after sets, and exporting progression
  reports.

**E. Legacy/off-brand screens.**
- I removed an off-brand amber "choose plan vs camera" screen (now auto-selected)
  and identified leftover test-project cards showing on back navigation.
  Recommend a process to prevent orphaned/legacy screens (feature flags, route
  inventory, dead-code detection) and what *should* occupy those entry points.

### What I want back from you
1. **Navigation model**: a concrete spec for the unified top bar + bottom nav
   across all three shells, including capture full-screen mode, with a small
   wireframe description per screen state (home, sub-route, capture, review).
2. **Missing pages/flows**: list the screens a field app like this should have
   that I'm likely missing, prioritized.
3. **UI simplification**: where I'm overcomplicating; what to merge/cut.
4. **Feature recommendations** for Site Walk and Twin 360, ranked by
   effort-vs-impact, respecting the "capture-only on device" constraint.
5. **Ghost-mode UX**: detailed interaction design for the progression picker.

Ask me clarifying questions first if anything is ambiguous, then give a
prioritized, concrete plan.
