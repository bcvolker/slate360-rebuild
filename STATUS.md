# Slate360 Current Status
Last updated: 2026-08-23

## Main Hurdles (in priority order)

### 1. Digital Twin Pipeline
- Status: In progress (core works, validated on one real capture)
- What's finished: TSDF geometry from iPhone LiDAR, validated against ground truth
  (mesh 14.12 m vs LiDAR 13.71 m; storey height 9.12 ft vs 9 ft standard, 1.4% error;
  fusion residual 23.4 mm median). Floor plan, area take-off, dollhouse with three ceiling
  states, walk navigation, projective texturing (85.8% of vertices), accuracy reporting.
  201 tests passing. Deployed to Modal.
- What's currently blocked or incomplete: 360 video is NOT yet fused — alignment unsolved.
  iPhone video frames unused as texture. Multi-room / building scale not built.
  Georeferencing not built. Zone splitting and scan-to-scan registration are written and
  tested but not wired into jobs. Model crop/polish tools do not exist.
- Next concrete step: process the next test scan (new TestFlight build records depth every
  8 cm instead of every 0.5 s — roughly 3x prior density) and confirm the improvement.

### 2. Website Reframe (services model)
- Status: Not started
- What's finished: Nothing.
- What's still old SaaS language: All of it. slate360.ai still sells app subscriptions —
  Site Walk $787/yr, Pro $1,484/yr, bundle $3,476/yr, free trials, credit packs, app-store
  badges, "Walk the job. It documents itself."
- Next concrete step: rewrite to service-led — "Request a site visit", example projects,
  a live sample twin, no device or brand names anywhere.

### 3. Operator Dashboard
- Status: Not started
- What's finished: Nothing as a unified console. Separate studio routes exist
  (/twin-studio, /thermal-studio, /tours, /digital-twins, /operations-console) but there is
  no single place to run a job end to end.
- What's missing for a first usable version: projects, intake (phone manifest + drag-in of
  360/drone/plans), processing dispatch and status, QC review, deliverable assembly,
  publish, client access control.
- Next concrete step: scaffold projects + intake + processing status.

### 4. Client Portal
- Status: Partial and fragmented
- What's finished: Database schema for pins, pin attachments, pin comments, share tokens
  and share views. Tours with scenes, plan pins and analytics. Thermal share tokens and Q&A.
  Share routes exist at /share/twin, /share/thermal, /share/deliverable, /view/[token].
- What's still fragmented: three separate share systems, one per product. A client with a
  twin, a thermal survey and a tour on one building gets three unrelated links and no
  project. No timeline, no date comparison, no share packages, no documents panel.
- Next concrete step: unify under one project with a capture timeline.

## Other Movement
- Showcase twin: kitchen capture processed and viewable, but not client-ready — 14.2% of
  vertices untextured, no crop or polish tooling, 360 detail not yet fused.
- ASU / ARFQ paperwork: NOT started, and should not be until the conflict-of-interest
  position is checked — Brian is employed by the unit he intends to sell to.
- First paid capture / Line 4 jobs: none. Services have not started.
- Recent fixes worth noting: depth capture was hard-throttled to 2 Hz (now distance-based,
  shipped to TestFlight); back-facing normals left 26.7% of the mesh untextured (now 14.2%).

## Notes for next session
- Awaiting a new test scan with iPhone LiDAR + video + 360 video on the new build.
- Open recommendation: stop improving the pipeline and build the operator dashboard.
  Nothing left in the pipeline blocks a first paid job; the dashboard does.
- ASU conflict of interest is a blocking legal/ethics question, not a scheduling one.
