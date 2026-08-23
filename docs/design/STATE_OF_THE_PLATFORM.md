# Slate360 — State of the Platform

*2026-08-22 · Written to be handed to another AI platform for review or continuation.*

---

## Headline

**The processing pipeline works and is validated on real captures.** The gap is not
algorithms — it is that the platform grew as three separate products (twins, thermal, tours)
and now needs to become one operator console and one client portal.

That is much better news than it sounds. **Most of the hard parts are built.** What is
missing is unification, not invention.

| area | state |
|---|---|
| Capture app — capture screen | works |
| Capture app — everything after the capture screen | **poor, needs rebuild** |
| Twin processing pipeline | **works, validated, deployed** |
| Thermal processing | works (golden path) |
| 360 tour builder | backend deployed, P0 complete |
| Twin viewer | works — walk, dollhouse, floor plan, ceiling states |
| Measurement / take-off | works |
| Pinning + documents | **schema and tables exist**, needs surfacing |
| Sharing | **three separate systems** (twin / thermal / tour) — needs unifying |
| Operator dashboard | **does not exist** — the main gap |
| Client portal | **partially exists**, fragmented |
| Website | **sells the wrong business** |

---

## 1. Processing pipeline — what actually works

### Validated on a real capture (kitchen + dining, iPhone LiDAR + 360)

| check | result |
|---|---|
| Mesh diagonal vs LiDAR ground truth | **14.12 m vs 13.71 m** (ratio 1.03) |
| Storey height vs the 9 ft building standard | **2.781 m = 9.12 ft — 1.4% error** |
| Fusion residual to raw LiDAR | median **23.4 mm**, p95 173 mm |
| Floor plane, two independent derivations | 8 mm apart |
| Floor area, from floor triangles | 28.35 m² = **305 sq ft** |
| Vertices textured | **115,308 of 134,461 (85.8%)** |
| Walk stations derived | 10, one floor |
| Processing time | 3–6 min CPU for the measurable deliverable |
| **Compute cost** | **$0.05–0.15** measurable, $0.60–2.50 photoreal |

**201 tests passing** across the pipeline.

### Modules built and deployed

`interior_mesh` (TSDF fusion) · `interior_track` (orchestration) · `mesh_dollhouse` (floor and
ceiling detection, wall snapping, decimation) · `mesh_floorplan` (plan, openings, area
take-off) · `mesh_texture` (projective texturing with occlusion testing) · `mesh_accuracy`
(accuracy evidence without a tape measure) · `walk_stations` (navigation positions) ·
`mesh_registration` (scan-to-scan, 4-DOF) · `zone_planner` (large-site splitting) ·
`equirect_frames` (360 unwrapping) · `operator_mask` · `bake` · `gps_priors` · plus the
existing exterior photogrammetry path.

### What is genuinely still open in the pipeline

| item | status | difficulty |
|---|---|---|
| **360 alignment** — placing 360 frames in the LiDAR coordinate frame | unwrapping done, alignment unsolved | **hard**; ~60% automatic on textured sites, ~95% with printed AprilTags |
| **iPhone video frames as extra texture views** | not started | **easy, high value** — frames already exist in every capture ever taken |
| Multi-room / building scale (session graph) | not started | medium; well-understood |
| Georeferencing (`site_frame`) | not started | easy if observations are banked now |
| Zone splitting wired into jobs | code done and tested | easy |
| Scan-to-scan registration wired in | code done and tested | easy |
| AGPL dependency removal (MASK-2) | not started | medium; licence hygiene |

**Recently fixed and worth knowing about** — both were our bugs, not capture problems:
- Depth was hard-throttled to **2 Hz**, discarding 29 of every 30 frames ARKit delivered.
  Now distance-based (every 8 cm or 8°), roughly **3× the depth density**. Shipped to
  TestFlight.
- Back-facing normals left **26.7% of the mesh untextured**; now 14.2%.

---

## 2. Website — sells the wrong business

`slate360.ai` currently sells self-serve app subscriptions: Site Walk $787/yr, Pro $1,484,
bundle $3,476, free trials, credit packs, app-store badges. Headlines: *"Capture the site.
Keep the twin."* / *"Walk the job. It documents itself."*

The business is now **done-for-you services on contracts and POs**. A contractor landing on
that page concludes he is being asked to buy an app and do the work himself — the exact thing
he would hire someone to avoid.

**What it needs:**

| now | should be |
|---|---|
| "Start free trial" | "Request a site visit" |
| App tiers and pricing | Example projects, sample deliverables |
| "It documents itself" | "We document it for you" |
| App-store badges | Case study, live sample twin, contact |
| Product feature list | Service menu: twins · tours · thermal · technical builds |

**Rule for all client-facing copy:** describe outcomes and accuracy, never equipment. No
device or brand names anywhere. Accuracy is stated as verified/estimated with a residual;
what produced it is never mentioned.

Effort: **small.** This is content and layout on an existing site, and it is the
highest-leverage non-technical change available.

---

## 3. Operator dashboard — the main gap

**Does not exist.** Today the work is done across separate studio routes
(`/twin-studio`, `/thermal-studio`, `/tours`, `/digital-twins`) with no single place to run a
job end to end.

### What it must do

**One console covering all service lines:**

1. **Projects** — every job, its client, its captures, its deliverables, its status.
2. **Intake** — see what the phone captured (manifest of clips, depth, poses, photos with
   sizes and upload state), then drag in the files that never touched the phone: 360 `.insv`,
   drone footage, plans, PDFs. Explicit **"ready to process"** rather than the pipeline
   guessing.
3. **Processing** — dispatch, live status, failures with the reason.
4. **QC** — coverage ratio, storey height check, fusion residual, untextured fraction, per
   capture. **A failing scan must be obvious and re-shot, never shipped.**
5. **Assembly** — crop and trim the model, set the default view, choose which deliverables go
   out.
6. **Publish** — push into the client's portal.
7. **Access control** — who sees what, for how long.

**Existing pieces to build on:** the studio routes, `operations-console`, the processing job
tables, the QC metrics (already computed and returned by the pipeline).

Effort: **large.** This is the main internal build and the difference between a business and a
series of heroic efforts.

---

## 4. Client portal — partially exists, fragmented

### What already exists in the database

| table | purpose |
|---|---|
| `digital_twin_pins`, `digital_twin_pin_attachments`, `digital_twin_pin_comments` | **Pinning and documents — already modelled** |
| `digital_twin_share_tokens`, `digital_twin_share_views` | Twin sharing |
| `thermal_analysis_share_tokens`, `_share_views`, `_share_questions` | Thermal sharing |
| `tours`, `tour_scenes`, `tour_plan_pins`, `tour_analytics` | Tour builder |
| `site_walk_portal_boards`, `shared_links` | Portal fragments |

Routes exist at `/share/twin`, `/share/thermal`, `/share/deliverable`, `/view/[token]`.

### The problem

**Three parallel share systems**, one per product. A client with a twin, a thermal survey and
a tour on the same building gets three unrelated links and no project.

### What the portal must become

**One project, many deliverables, over time.**

1. **Project view** — the building, not the file. Everything about it in one place.
2. **Date / capture timeline** — every visit kept, immutable. Compare dates. Named milestones
   (`Rough-in`, `Covered`) as aliases on dates.
3. **Deliverable types side by side** — twin, tour, thermal, floor plan, take-off, documents.
4. **Pins that survive re-scanning** — a pin anchors to the **site**, never a triangle.
   Re-project within ~30 cm on a new scan; if it does not land, it stays in Documents flagged
   *needs a new home*. **Never deleted.**
5. **Documents panel** equal in status to the 3D — filterable list of every RFI, submittal,
   PO, photo, thermal image. Nobody should have to hunt a 3D model to find last week's RFI.
6. **Measurements** — saved, exportable, **frozen by default** across dates so a number used
   in a bid does not silently change.
7. **Reshare to their client** — a **share package**, not a naked link: which dates, which
   deliverables, which pin types, whether measuring is allowed, expiry, watermark.

Effort: **medium-large.** Much is built; the work is unifying it under a project and a
timeline.

---

## 5. What is left, in priority order

### Immediate — small, high value

1. **Reframe the website to service-led.** Non-technical, highest leverage.
2. **iPhone video frames as texture views.** Improves every capture already taken, no re-scan.
3. **Wire zone splitting and scan-to-scan registration** into jobs. Both written and tested.
4. **`site_frame` on every project**, identity by default. Cheap now; a known retrofit trap.

### Near — the internal build

5. **Operator dashboard v1** — projects, intake, processing, QC, publish.
6. **Project-first capture app.** A scan always belongs to a project; the scan list is scoped
   to the active project. The phone manifest must be visible from the desk.
7. **Model polish tools** — crop, trim, set default view. Needed before anything ships to a
   paying client.

### Then — the client-facing build

8. **Unify the three share systems** into one project-scoped portal.
9. **Timeline and date comparison.**
10. **Documents panel and site-anchored pins surfaced in the UI.**
11. **Share packages** with scoped permissions.

### Later — quality and reach

12. **360 alignment** (or the AprilTag path).
13. **Multi-room session graph.**
14. **Exterior and drone integration.**
15. **AGPL dependency removal.**
16. **Portal AI assistant.**

---

## 6. Honest assessment

**What is genuinely good:** the pipeline produces a metric, validated, measurable twin at
about ten cents of compute, and the accuracy is checkable against external references (storey
height to 1.4%, mesh diagonal to 3%). The measurement, floor plan and take-off work. The
viewer navigates properly. Pinning and sharing are modelled in the database rather than
hypothetical.

**What is genuinely weak:** everything between "the pipeline finished" and "the client is
looking at it." There is no operator console, the portal is three products wearing a trench
coat, the capture app is unusable past the capture screen, and the website advertises a
business that no longer exists.

**The single biggest risk is not technical.** It is that the pipeline keeps improving while
nothing becomes sellable. The measurable deliverable is already good enough to sell; the
missing piece is the ability to run a job end to end and hand a client a link.

**Recommended focus: stop improving the pipeline and build the operator dashboard.** The 360
fusion, multi-room and georeferencing work are real but none of them is what stands between
today and a first paid job.
