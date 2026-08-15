# External Audit Prompt V2 — full-system review (self-contained, no repo access needed)

Supersedes EXTERNAL_AUDIT_PROMPT.md (which covered only the twin pipeline). Copy everything
below the line into an external AI platform. Written 2026-08-15.

---

ROLE: Independent principal engineer auditing a production construction-documentation
platform. You have NO code access — everything needed is stated here. Judge the system as
designed. Do not propose wholesale vendor/stack swaps. Say plainly where it is wrong.

# 0. The business

Slate360 sells professional reality-capture documentation of commercial construction sites
(warehouses, data centers, academic/medical/office). The operator captures on site; a cloud
pipeline produces interactive digital twins and field-walk deliverables; clients receive
branded, token-gated web links they can re-share to their own stakeholders. Positioning is
"workflow tool," estimating-grade only, never survey-grade. One non-programmer operator +
AI engineers; every change must be A/B-verifiable.

Two products share one backend:
- **Twin 360** — multi-clip ARKit + LiDAR capture → cloud Gaussian-splat reconstruction.
- **Site Walk** — photo / 360 / voice / note field walks → PDF + interactive deliverables.

Stack: Next.js on Vercel · Supabase Postgres · Cloudflare R2 · Trigger.dev orchestration ·
Modal GPU workers · Capacitor iOS shell with native Swift ARKit plugin · Codemagic →
TestFlight.

# 1. Twin pipeline — current state

## Reconstruction (interior splat track), in order
- **Ingest**: phone video → sharpness-scored frame selection (variance-of-Laplacian,
  candidates 2 fps, best-per-2s bucket). 360 `.insv` → both lens streams hstacked to
  dual-fisheye → sharpest-per-bucket → ffmpeg v360 unwrap to perspective views: rings at
  pitch 0/±35°, explicit 110°×94° FOV, 1600×1200 (16 views/still, 8/video frame). Nadir and
  zenith excluded by ring geometry.
- **Operator masking (MASK-1, promoted)**: YOLOv8s-seg person segmentation (conf 0.35,
  12 px dilation) over every extracted view; masked pixels excluded from the training loss
  via nerfstudio per-frame `mask_path` (all-or-nothing satisfied with white fill masks).
  View CULLING was tested and REJECTED — it fragmented COLMAP's sequential match chain
  (registration 91 → 55/56 across two replicates, PSNR 25.30 → 22.5). Masks-only held
  registration at 91 with PSNR 25.58 vs 25.30 baseline.
- **Alignment**: vanilla COLMAP via nerfstudio `ns-process-data`, sequential matching for
  video. A pose-prior arm (ARKit positions + gravity as covariance-weighted priors in
  pycolmap) was A/B'd and CLOSED (18.26 vs 25.53). An ARKit-bypass path exists but is
  demoted (14.7 vs 25.5 — nearest-keyframe assignment error).
- **Metric scale**: recovered post-hoc by comparing the COLMAP trajectory against the ARKit
  trajectory (median pairwise-segment ratio, timestamp-matched) + measured-gravity
  orientation. No LiDAR/ARKit data ⇒ NO absolute scale.
- **Training**: nerfstudio splatfacto 1.1.5, "baseline" profile promoted. "quality" arm
  (bilateral grid, antialiased raster, denser densification) measured 22.74; "visual" arm
  (adds SO3xR3 camera refinement) 21.41 — both CLOSED, and visual is additionally flagged
  non-metric (camera deltas are not written back, so the splat frame diverges from the pose
  solution).
- **Export**: SPZ (500k splats desktop / 150k mobile via deterministic stride downsample),
  floater crop, `edit_list` crop boxes applied in all viewers, vector floor plan + openings
  (net wall area minus doors/windows) → SVG/DXF.

## Exterior (photogrammetry mesh track)
Drone photos → COLMAP → mesh decimated to 1.5M faces → texture (8192 px cap for WebGL,
capped-3200 retry arm) → ~98 MB GLB + orthomosaic. Alignment cache verified: 18 min rerun
vs 5.5 h cold. Melting on thin/vertical structure acknowledged. Direction **EXT-SPLAT**:
sell splat walkthroughs (ground 360 walk + 360 stills + drone orbits at 2–3 heights) as the
exterior walkthrough product; mesh/ortho stays the measurement product; DroneDeploy /
RealityCapture output can be imported as a model version (planned, not built).

## Delivery (built)
Twin Studio operator cockpit (Produce / Clean / Plan / Deliver): version history with
per-arm quality metrics, splat editor with crop boxes, floor-plan tab, share-token
management. Client share links: token-gated, branding snapshot at mint, view limits, orbit
mode (drag / zoom / double-click-retarget) and walk mode (click-to-move glide + WASD,
ground-plane, bounds-clamped). Camera-synced progression compare across versions. Pin
attachment schema live for document / image / panorama_360 / thermal / link / proposal /
invoice types (authoring UI not built).

## Measured evidence (real captures)
- Kitchen (360 `.insv` only): 17.22 → 25.30 (sharpness selection) → 25.58 (masking).
- Hero recipe (iPhone + LiDAR, one session, ≤2 min clips, slow closed loop): **28.97** —
  best ever. A rerun of the SAME capture produced 26.77 with `scaleSkipped=residual_too_high`.
- Car test (phone video orbit, no LiDAR): 158/161 views registered, 23.31.
- Self-recorded caveat: masked-eval PSNR scores kept pixels only, so cross-arm PSNR
  comparisons are paired with a human visual gate before promotion.

## Shipped in the last 24 hours
1. **E1 — bake `edit_list` into the downloadable SPZ.** Clients previously downloaded the
   original uncleaned file while every viewer rendered the crops on top. New Modal
   `bake_model` function: spz → ply → numpy edit-chain → ply → spz → R2 sibling key →
   HMAC-signed callback. The bake replicates the viewer's shader chain exactly (three.js
   inverse-TRS decompose including its shear loss, the shader's SDF primitives, the crop
   double-invert cancellation as actually rendered, softEdge partial alpha folded into the
   opacity logit, displacement). Freshness = sha256 of the serialized edit_list; any change
   marks the bake stale. Downloads serve baked only when fresh; live viewers keep the RAW
   file because they apply edits at render time (baked would double-apply). Verified live
   end-to-end: 435,468 → 396,057 splats in 20 s, hash-fresh.
2. **Upload-queue hardening (native)**: every capture file now rides the background
   URLSession engine (parallel PUTs, 5 retries with re-sign, on-disk manifests resuming
   across relaunches); registration order video → LiDAR/poses sidecars → photos; per-asset
   failure isolation. Fixes a real field failure where a serial inline photo loop died on
   photo 3 and the LiDAR sidecars never registered at all.
3. **Per-photo ARKit pose keyframes (poses JSON v6)** + a worker-side filename join, so
   timed stills now carry pose priors.
4. **Operator-masking correction**: culling disabled by default on the registration-collapse
   evidence above.
5. **Dead-band layout fix** in the new Site Walk app (see §3).

## Locked build order (reordered 2026-08-15 after two independent external audits)
Trust first, then quality, then fusion:
1. **E1 bake** — DONE (above).
2. **VALID-1 + GATE-1** — per-job QC JSON (Umeyama on trajectories — never free-scale ICP on
   curves; half-scene independent scale cross-check; residual-vs-distance drift profile;
   model-vs-own-reference test) + hard gates: jobs missing poses/PLY or with a skipped scale
   ship as UNSCALED (badge, measurement UI hidden); scaled jobs badge SCALE ANCHORED.
3. **MASK-2** — replace AGPL-3.0 Ultralytics YOLO with a permissive-license segmenter
   (the project's own rule bans AGPL; ODM was rejected for exactly this).
4. **Phase C** — LiDAR depth supervision via a vendored gsplat trainer (splatfacto 1.1.5
   cannot do depth loss).
5. **MEAS-1** — collision mesh beside every splat; picks/measures raycast the mesh, never
   the splat. Tape-validation gate before client-visible.
6. **FUSE** — cross-capture fusion (one COLMAP model over iPhone frames + 360 views, LiDAR
   anchoring scale) — LAST, gated on scale-still-applied + drift-not-worse + overlap-band
   visual check.
7. Then a committed 100% rebuild of the desktop dashboard/listing UI.

Accuracy language: the numeric tolerance (±2–5 cm) is REMOVED from client chrome until
VALID-1 prints a per-job number. Net wall area from the openings module stays operator-only
until tape-validated on ≥3 LiDAR twins.

# 2. Capture apps — current state and the gap this audit must address

## Twin 360 native capture (Swift, ARKit) — exists
`TwinARKitCaptureViewController` runs one ARSession with `smoothedSceneDepth ?? sceneDepth`.
Per frame it unprojects depth (every 3rd pixel, confidence-gated, 0.1–8 m) into a voxel
point cloud, and every N seconds records a keyframe (camera transform, intrinsics,
resolution, GPS/heading). Video clips are recorded to disk. `capturePhoto()` grabs a
full-res still from the live AR frame and — as of this week — also records a pose keyframe
tagged with that photo's filename. A binary `S360DEPTH1` sidecar format already exists
(per-record: timestamp, width, height, 16-bit depth, confidence, optional RGB) and is
uploaded as depth evidence. Export writes video + PLY point cloud + poses JSON + depth
sidecar.

**Gap A (Twin):** the app has two capture modes (video-clip walk, timed photos) but the
per-photo path does not persist a per-photo depth snapshot — depth exists only as the
session-wide voxel cloud and the rolling evidence stream. Nothing yet ties "this exact JPEG"
to "this exact depth map + intrinsics" as a self-contained measurable unit.

## Site Walk capture — exists, but is WEB
Site Walk capture is a React/Capacitor web flow using `getUserMedia` (V2 canvas) plus native
file pickers (V1). It has NO access to ARKit. Known hard constraint in this codebase: **ARKit
cannot share the camera with `getUserMedia`** — that conflict is why Twin 360 went
native-led in the first place.

Existing Site Walk capture features (a new build must not regress these): live viewfinder
with torch and pinch-zoom; native picker and camera-roll paths; up to 8 additional angles per
stop; 360 photo (entitlement-gated); file attachments as stops; text notes; voice memos with
real audio upload + transcription; Web-Speech dictation; plan-pin capture on rasterized plan
sheets (Leaflet, drag/move/filter); file pins placed ON a photo via long-press; a full markup
engine (freehand/box/circle/arrow/text, select-move-resize-recolor, 14-deep undo/redo,
pinch-zoom, persisted as versioned `markup_data`); ghost/before-after overlay with
GPS-proximity progression picker and device-orientation alignment; tagging (classification,
trade, priority, status, assignee, due date, cost impact) with carry-forward between stops;
AI note formatting that preserves the verbatim raw note plus provenance; offline queueing via
IndexedDB with a replay sync manager; client-side image compression; capture-time SHA-256
plus an append-only evidence chain; SlateDrop folder bridging; and one-tap deliverable
generation (slideshow, before/after, status report, punch list, photo log, field report).
Per-item metadata already includes GPS (lat/lon/accuracy/altitude/heading), device
orientation (alpha/beta/gamma + compass heading), weather, timestamps, device info, and
content hash.

**Gap B (Site Walk): there is NO measurement or dimensioning capability anywhere in Site
Walk.** An exhaustive search found only pinch-gesture math and GPS proximity. The markup
schema is versioned with a `coordSpace` field (`image | plan_pct | viewport`) and its own
comment anticipates dimensions being added later, but no dimension shape kind exists.

**What the operator wants:** every Site Walk photo should carry LiDAR depth so a contractor
can measure from the photo — distance point-to-point, window/door width and height,
rectangles/areas — with multiple named measurements per photo that can be edited, deleted,
and included in deliverables.

# 3. Site Walk 360 — the new standalone app

A pivot is in progress: Site Walk ships as its own branded app (`/sw360` route tree, its own
design tokens, its own header + 5-tab bottom nav: Home · Projects · ◉Capture · Inbox ·
Reports) on the shared backend, deliberately sharing NO chrome with the parent product.

Status: an 11-phase plan exists. **Phase 1 (Home) shipped. Phase 2 (capture screen reskin)
is in progress with no code landed. Nine phases remain.** Shipped screens: Home, Projects
(+ per-project Walks/Plans/Docs/Team/Reports tabs), Inbox, Calendar, Contacts, Account,
Branding, Login. Reports is an explicit stub. **The Capture tab is only a launcher — it
hands off to the legacy web capture flow.** So the new app has a real shell and real list
screens but none of its own capture experience.

A layout defect was just fixed: the shell reserved 76 px of bottom padding for a nav bar
whose intrinsic height had shrunk to ~48 px, leaving a ~27 px dead band on every screen
(~43 px of visible empty space under the last card on Home once the page's own padding was
counted). Root cause: two independently-maintained numbers with no automated guard. Both now
derive from one constant, the nav has an explicit border-box height of 3rem + safe-area, and
the shell was changed from `min-h-[100dvh]` (which meant its `overflow-y-auto` never
engaged and the reserve became trailing document space) to a definite height with the main
region as the real scroller.

Three docs referenced as required reading by other docs **do not exist** (a build plan, a
pivot plan, and a UX panel brief), so the phase plan is the only live execution record.

# 4. Your audit tasks

Answer each explicitly. Rank by impact-per-cost. Be concrete about acceptance tests.

1. **Pipeline correctness.** Verdict each promotion/closure against its stated evidence
   (vanilla COLMAP over pose-priors; baseline over quality/visual; masks-only over culling;
   ARKit-bypass demotion; E1's shader-parity bake approach). Flag any conclusion the
   evidence does not support, and any place where a "parity with current rendering" decision
   (e.g. baking the crop double-invert exactly as rendered) preserves a bug rather than
   fixing it.
2. **Does the remaining order actually finish the pipeline?** Given the locked order
   (VALID-1/GATE-1 → MASK-2 → C → MEAS-1 → FUSE → dashboard rebuild), what is MISSING
   entirely — not merely mis-ordered — before this can be sold to a general contractor for
   a warehouse or data center? Name failure modes for large repetitive interiors (rack
   aisles, ceiling grids, raised floors, glass, low-texture drywall, moving plant/PPE,
   long open loops, multi-floor) and say which planned item covers each, or that none does.
3. **Twin app capture fix (Gap A).** Design the per-photo depth unit: what exactly should be
   written at photo-snap time so a still is independently measurable (depth map + confidence
   + intrinsics + pose + the resolution mapping between a full-res JPEG and a 256×192 depth
   map), what file format and size budget, how it uploads without regressing the newly
   hardened queue, and how the cloud should validate it. Also: should video-mode and
   photo-mode remain separate modes at all, or is one unified session better?
4. **Site Walk LiDAR + measurement (Gap B) — the main design ask.** Given that Site Walk
   capture is web `getUserMedia` and ARKit cannot share the camera, specify the path to
   photo+LiDAR in Site Walk. Cover: (a) native vs web architecture decision and migration
   risk given the extensive existing web feature set listed in §2; (b) exactly what is
   captured and stored per photo; (c) the measurement math and its honest error bounds at
   1 m / 3 m / 8 m, including depth-map resolution limits, edge/discontinuity behavior at
   window and door frames, and confidence handling; (d) the measurement UX — how a user
   places a distance, a width/height, a rectangle/area; how measurements are named, listed,
   edited, deleted, and how many per photo; how they render on the photo and survive
   markup/zoom; (e) the data model (where measurements live relative to the existing item +
   versioned markup schema, and whether they belong in the markup envelope or their own
   table); (f) how they flow into deliverables (PDF, interactive share) and what the
   client-facing accuracy language must say; (g) what must be REFUSED — which measurements
   the system should decline to produce rather than produce badly.
5. **New app completion (§3).** Critique the 11-phase plan for a capture-first field app
   where the capture screen is phase 2 of 11 and everything else is shell. What is the
   minimum path to a shippable standalone app? Specifically: should the new app rebuild
   capture, or wrap/reskin the existing web capture; how should the legacy feature list in
   §2 be protected from regression (what acceptance harness); and does the missing-docs
   situation warrant reconstructing them before more phases land?
6. **Cross-cutting risk.** Where do the twin pipeline, the Twin app, the Site Walk app, and
   the new standalone app duplicate work or contradict each other? What single change would
   most reduce total system risk?
7. **License and compliance.** Any component that would fail a diligence review, and the
   cheapest clean replacement.

Do not flatter. If something is architecturally wrong, say so plainly and say what breaks.
