# Twin 360 — Current Project Setup & Processing Pipeline (Technical Report)

Compiled 2026-07-24 from: this repository's code (workers, Trigger tasks, API routes, iOS plugin,
migrations, ops scripts), the `docs/` + `docs/design/` document set, `docs/TWIN360_CAPTURE_GAPS.md`
(authoritative ledger), `CLAUDE.md`, and the archived multi-AI planning conversations under
`public/uploads/chat docs/`. Facts are documentation-only — no advice. Anything not recoverable from
these sources is listed in §10.

---

## 1. Project overview and goals

- **What Twin 360 is:** the Slate360 app that turns phone capture (+ LiDAR when present, + auxiliary
  360/drone/GPS sources) into a cloud-reconstructed **3D Gaussian-splat digital twin** of a
  construction site, delivered as a shareable browser link. North star (from
  `docs/design/TWIN360_MASTER_BUILD_PLAN.md`): "a clean, editable, measurable, AI-assisted 3D digital
  twin that ships as a shareable link, an embed, a downloadable file for design software, a 2D plan
  with real square footage, a fly-through video, or a VR/Vision Pro walkthrough."
- **Founding premise** (archived chats): a unified indoor + outdoor twin — "walking the
  exterior/interior with a phone, then a 360 camera, then flying a drone" — everything captured
  in-app: "avoid having them use other apps … utilize as much as the camera and Lidar as possible
  inside the digital twin app."
- **Positioning decided in-chat:** "Interactive Construction Walkthrough & Visual Coordination
  Platform," explicitly NOT survey-grade. Competitors framed: Matterport (indoors-only, hardware
  centric), DroneDeploy (struggles indoors), Polycam/Luma ("zero construction context").
- **Target platforms:** iOS App Store app (Capacitor shell `ai.slate360.app`, remote URL
  `https://www.slate360.ai`; TestFlight via Codemagic) + cloud backend (Vercel Next.js →
  Trigger.dev → Modal GPU workers → Cloudflare R2 + Supabase). Desktop (browser) = author/edit
  workstation; phone = capture. Accent: `--twin360-blue #3D8EFF`.
- **Desired end-user capabilities** (built ✅ / planned ⬜ / partial ⚠️):
  - ✅ Walk-through capture (ARKit + LiDAR multi-clip), cloud reconstruction, token-gated share
    viewer with orbit/walk/measure/pin/comment, progression compare, desktop non-destructive splat
    editor, reprocess/versions/publish loop.
  - ⚠️ Floor-plan PNG (generated per model, no UI surfaces it); cinematic camera path (editor works,
    MP4 export TODO); white-label branding (wiring incomplete); 360 photo input (filename-heuristic
    gated); download (`.spz` only).
  - ⬜ 2D vector plans + square footage, RoomPlan measurement layer, destructive "bake" of edits,
    `.ply`/`.glb`/CAD exports, embed route, mobile editing, 360-video ingest, multi-capture merge,
    AI assistant, WebXR/Vision Pro, georeferencing (column exists, always `{}`).
- **Tier/entitlement model:** access gated by `profiles.is_digital_twin_approved` (CEO-granted,
  fail-closed) → `org_feature_flags.standalone_digital_twin`; quality `high` requires
  `org_app_subscriptions.digital_twin === "pro"`; credit-metered processing
  (`credits = max(1, round(8 + GB×35))` + per-asset-kind surcharges).

## 2. Current data inputs and capture methods

### Devices
- **iPhone with LiDAR (primary, in use):** native Swift plugin
  `ios/App/App/Plugins/LiDARCapture/` (11 files, ~3,700 LOC). One `ARSession` produces
  simultaneously: HEVC video, LiDAR depth, camera poses, gravity, optional GPS/heading.
- **iPhone/other phones without LiDAR (fallback, in use):** web capture
  (`hooks/useTwinCaptureSession.ts` + `useTwinVideoRecorder.ts`) via `MediaRecorder`
  (`video/webm;codecs=vp9` → `webm` → `mp4`); same multi-clip metaphor; photo intervals 0.5/1/2 s.
- **Insta360 X4 (owned, field-tested):** Brian's dual-camera field test (iPhone + X4) is the basis
  of `TWIN360_WORKFLOW_REBUILD_SONNET5.md`. Export rule: equirectangular, stabilization OFF, high
  bitrate, never raw `.insv` (stitch in Insta360 Studio first). X3 appears in the rig-offset prior
  (`OFFSET_PRIOR = [0.0, −0.10, 0.0]` m, phone ~10 cm below 360 center). X5 is used on the Ground
  (Site Walk) side.
- **Drones:** planned as a *source type*, not a capture mode. Named: DJI Mavic 3 Enterprise, DJI
  Avata ("deferred — not FAA-registered yet"), **DJI Mini 5 Pro (Brian's own)** with a written 3D
  capture flight plan (`THERMAL_STUDIO_V2_2_BUILD_SPECS.md` §N5: daylight, 45° top-down grid at
  70–80% overlap + 2 orbit rings + POI orbits, 150–300 photos). The only executed drone
  photogrammetry in the record is the ASU thermal-track dataset (917 DJI photos, 3 waypoint flights
  + 8 onboard-stitched spheres + `.MRK` position files) — processed in the experimental
  photogrammetry worker, not the Twin pipeline.
- **"Anti-Gravity" 360 drone:** Insta360's drone sub-brand ("Antigravity A1 — confirmed real,
  shipping; 55 MP stills / 8K 360 video"). Status in repo: an **unverified camera-profile stub** in
  `docs/design/TOUR_BUILDER_PLAN.md` pending a sample file. No hardware in hand, no Twin-side plan.

### Native capture procedure (as implemented)
- **Multi-clip = segments of ONE continuous `ARSession`** (shipped 2026-07-02, commit 5c6cf286):
  shutter starts/ends a clip, session never pauses → all clips share one world origin →
  "registration-FREE concatenation." Clip cap 240 s default (auto-close, capture continues).
- Keyframes every **0.5 s**: `transform_4x4` (column-major c2w), intrinsics {fx, fy, cx, cy},
  gravity, optional GPS/heading, `clip_index`. Poses JSON **schema v4** with `clips[]` timing.
- LiDAR: `smoothedSceneDepth` (~256×192, intrinsics rescaled), every 3rd pixel, accept 0.1–8.0 m,
  **2 cm voxel dedup**, 500k point cap, confidence gate `medium`, grey placeholder color (no RGB
  per point — known Week-2 item).
- Video: HEVC ~5.5 Mbps, ~30 fps, native `imageResolution` (no downscale — intrinsics must match).
- Overlap coaching: clips 2+ first 6 s duplicate-voxel ratio < 15% → "Low overlap" HUD warning.
- Guardrails: start blocked < 1.5 GB disk or < 15% battery; auto-finalize on thermal `.critical`,
  < 750 MB disk, or < 10% battery; 12 s clip-finalize and 45 s export watchdogs.
- Modes: video (default) + timed photos (0.5/1/2/3 s or manual). Exposure lock is disabled on the
  ARKit path (breaks VIO); torch works.
- Capture SOP documented for users: 0.5–0.8 m/s walk, pause ~1 s at corners/doorways, 70–80%
  overlap, lock AE/WB, all lights on, no HDR, landscape.

## 3. Data reception and upload flow

- **Arrival:** presigned direct-to-R2 (S3 API). Two paths:
  - Files < 8 MiB → `POST /api/digital-twin/upload/single` (presign phase → client PUT → finalize
    phase). Presign expiry 900 s.
  - Files ≥ 8 MiB → S3 multipart: `upload/init` (part size clamped 8–64 MiB; native requests
    16 MiB) → `sign-part` (web, one at a time) or `sign-parts` (native, batches of 200, 6 h expiry)
    → PUT parts → `upload/complete` (strict part-count check, ETags recorded in
    `digital_twin_multipart_parts`) / `abort`.
- **Native uploader (post-2026-07-01 rebuild):** background `URLSession`
  (`ai.slate360.twin.upload.bg`), 4 parallel connections, from-file uploads, on-disk ETag manifest
  under Application Support, `resumePendingUploads()` on app launch (resumes only missing parts),
  per-part retry ×5 with capped backoff, 300 s request / 24 h resource timeouts. Auth = Supabase
  cookies harvested from the WKWebView cookie store. Web uploader is sequential-part,
  tab-must-stay-open, 3 retries/part.
- **Formats produced by capture:** `twin_capture_clipN.mp4` (HEVC), `twin_photo_N.jpg`,
  `lidar_capture.ply.gz` (binary PLY, xyz + rgb), `lidar_poses.json.gz` (v4). PLY/poses gzipped
  natively; worker gunzips by magic-byte detection.
- **Formats accepted at upload (any source):** kind inferred from content-type/extension
  (`inferTwinAssetKind`): video/*→`video`; ply/las/laz/e57/pcd/xyz/pts→`ply_lidar`;
  obj/glb/gltf/fbx/stl→`lidar_mesh`; kml/gpx/geojson; `panorama_360`; image/*→`photo`; json
  containing "poses"→`lidar_poses`. Worker itself accepts videos {mp4, mov, m4v, webm, mkv, avi}
  and images {jpg, jpeg, png, webp, tif, tiff, heic, heif}; anything else errors.
- **Pre-upload validation:** entitlement check, storage quota check, credit pre-check at job
  creation. No content validation (no blur/quality rejection at upload). 360 detection is currently
  a **filename heuristic** ("360"/"pano" in name, `twin-review-media.ts:37`) — documented bug.
- **Storage layout:** `orgs/{orgId}/digital-twin/{spaceId}/{captureId}/{Date.now()}_{filename}` in
  R2 bucket `slate360-storage`; models at `…/{spaceId}/models/{jobId}.spz`. Every asset also
  bridges into SlateDrop (`03_Digital_Twin/{Clips,LiDAR,Models,Source_Assets,Deliverables}`) and
  `unified_files`.
- **DB:** `digital_twin_spaces` → `digital_twin_captures` (status machine
  draft→…→uploaded→processing→ready/failed) → `digital_twin_capture_assets` →
  `digital_twin_processing_jobs` → `digital_twin_models`. Known integrity bug (2026-07-08 field
  test): the same 262.9 MB video registered 3× as separate asset rows (no dedup/fingerprint, no
  all-assets-ready gate) — fix planned as slice M2.

## 4. Current processing pipeline (step-by-step)

### Orchestration
1. `POST /api/digital-twin/jobs` — validates (only `output_format: "spz"` accepted; quality
   `standard|high`, `high` is pro-gated), pre-checks credits, inserts job `queued`, fires
   Trigger.dev task `twin.gaussian_splat`.
2. `src/trigger/twin-gaussian-splat.ts` (maxDuration 120 s, dispatch-only) — partitions assets
   (media kinds vs `lidar_poses` vs `ply_lidar`; **`.find()` = single PLY/poses only — multi-clip
   LiDAR beyond the merged file would be dropped, TWIN-002**), marks job `processing`, POSTs payload
   to `MODAL_TWIN_ENDPOINT` (`https://bcvolker--reconstruct.modal.run`), stores `x-modal-run-id`.
   `speed` hardcoded `"standard"`.
3. Modal worker `workers/modal/twin-gaussian-splat/worker.py` (~2,700 lines) runs the job; HMAC-
   signed callbacks to `/api/digital-twin/jobs/callback` (completion) and
   `/api/twin/jobs/{id}/progress` (20 s heartbeat, stages upload/align/train/optimize/export,
   pct clamped 1–99).
4. Callback (`lib/twin/job-callback.ts`): idempotent; deducts credits (idempotency key
   `dt-job:{id}`); inserts `digital_twin_models` row (`is_primary` only if first model);
   auto-publishes `published_model_id` only when the space had zero models; bridges to SlateDrop;
   honors `retain_raw === false`; usage event; notification.
5. Backstops: Vercel cron `recover-stale-twin-jobs` every 15 min (stale ≥ 45 min); hourly R2
   cleanup cron.

### Modal worker (app `slate360-twin-gaussian-splat`)
- **Infra:** GPU **A10G (24 GB)**, timeout **7200 s**, `retries=0`, Debian-slim py3.10 image with
  ffmpeg + **COLMAP (apt)** + Node 20; `torch 2.4.1+cu121`, `torchvision 0.19.1`,
  **nerfstudio 1.1.5**, **gsplat 1.4.0** (prebuilt pt24cu121 wheels), opencv-headless,
  `@playcanvas/splat-transform@2.7.1` (npm). (`requirements.txt` is stale/decorative.)
- **Stage 1 — ingest:** videos → sharpness-scored frame extraction (AF4): ffmpeg candidates at
  4 fps, keep sharpest per 0.5 s bucket (~2 effective fps) by variance-of-Laplacian, blur floor
  30.0 (relaxed if < 3 frames). 360-flagged **stills** → 12 perspective views via ffmpeg
  `v360` (30° yaw steps, 1600×1200). Photos normalized to JPEG. Hard floor: ≥ 3 images.
- **Stage 2 — alignment:** `ALIGNMENT_STRATEGY = "colmap_first"` (env-overridable). Runs
  `ns-process-data images --matching-method sequential|exhaustive --no-gpu --num-downscales 2`
  under xvfb (sequential when any video present). Writes `orientation_override: "up"` into
  `transforms.json`. The **ARKit-pose COLMAP-bypass path exists but is OFF**: A/B rounds showed
  bypass trainPSNR ~9–14.7 vs COLMAP ~23.3 (nearest-keyframe pose-assignment error); reactivation
  deferred to a "Round 6" optimization track. LiDAR poses/PLY still feed:
  - **Q1 metric scale:** median pairwise ARKit-vs-COLMAP trajectory-segment ratio (tolerance
    0.25 s, ≥ 5 pairs, residual ≤ 0.15, factor ∈ [0.01, 100]); R7 fixed the
    `frame_00NNN`-rename join bug that silently zeroed it.
  - **Q2 orientation:** Kabsch/SVD on ARKit gravity → `Y_UP_MEASURED`; fallback floor-PCA gated on
    planarity ≥ 0.6 and tilt < 45° (fix for the upside-down bug), else `UNKNOWN`/identity.
  - **R8.1:** representative capture pose → viewer opens at the captured view.
- **Stage 3 — training:** `ns-train splatfacto` with `--max-num-iterations`
  {draft 15k, standard 30k, high 45k} (speed fast ×0.65, slow ×1.35; PLY-seeded ×0.70),
  `--pipeline.model.use-scale-regularization True`, `--cull-alpha-thresh 0.1`,
  `--stop-split-at ≈ 57% of iterations` (anti-explosion), tensorboard, hard timeout 3600 s,
  heartbeat 45→84%.
- **Stage 4 — optimize/export:** `ns-eval` (PSNR, best-effort) → `ns-export gaussian-splat` → PLY →
  single-pass cleanup `crop_recenter_and_cap_ply`:
  1. **SOR** (cKDTree, k=16, 2.0σ; skipped if > 20% would drop),
  2. **percentile crop + recenter** (5–95 clip → median center; 3–97 → core radius × 1.35; skipped
     if > 60% removal),
  3. **2M splat hard cap** (seeded RNG),
  4. **metric-scale bake in log space** (R7.2 — fixed the linear-multiply-on-log-scales "giant
     blob" bug),
  5. **0.5 m metric spike clamp** (R8.3b).
- **Stage 5 — SPZ conversion:** `@playcanvas/splat-transform … --spz-version 3` with escalating
  opacity filters (0.05/0.15/0.30) + scale ≤ 0.3 caps; saliency top-N fallback (1.5M/750k/350k)
  when the WASM writer OOMs.
- **Ready gate (AF1), pre-upload:** fail if PSNR < 17, splats < 20k, SPZ < 1 MiB, or 3M+ splats
  co-occurring with low PSNR → failure callback → **no model row, no credit charge**.
- **Outputs to R2:** `{jobId}.spz` (v3, gzip NGSP), `{jobId}.manifest.json` (bounds, up-axis,
  correction quaternion, initial/fallback/orbit cameras, interior entry point at eye height 1.6 m,
  metric flag), `{jobId}.floorplan.png` (waist-slice 0.3–1.8 m XZ projection, 1024², canvas
  `#0B0F15`), optional `{jobId}.transforms.json` debug.

### Interior vs exterior combination — current state
- **Not combined today.** One capture → one job → one model. Drone/360 files can be uploaded as
  additional assets and are fed into the same COLMAP solve as generic media (drone videos are
  effectively filtered out of the LiDAR frame-matching by the 2 s matcher window). Cross-capture
  merge (joint COLMAP over `capture_ids[]`, "the dual-camera differentiator") is planned slice P2;
  interior/exterior distinction exists only as a viewer heuristic (sky-ratio classifier, orbit vs
  walk framing) and in the measurement-tier design (RoomPlan interior = measured; drone/point-cloud
  exterior footprint = estimated ±5–20 cm).

### Experimental second pipeline (not wired to the app)
- `workers/modal/photogrammetry/` — hand-run research tools on the ASU dataset volume: raw COLMAP
  (feature_extractor → spatial + sequential matcher with guided matching → mapper with GPU BA →
  `model_aligner` against GPS ENU refs (±3 m) → undistort → PatchMatch stereo → fusion), true-ortho
  functions (1–3 cm GSD), and a **custom gsplat training loop** (torch 2.1.2, sh_degree 2,
  0.8·L1 + 0.2·(1−SSIM), metric ENU frame preserved). Also `odm_runner.py` running
  `opendronemap/odm:3.5.4` (16 CPU / 96 GB / 23 h; `--pc-quality high --feature-quality high
  --mesh-size 600000 --mesh-octree-depth 11 --dsm --gltf`) — **ODM is no longer on the path** (see §6).

## 5. Outputs currently produced

- **Primary model:** `.spz` v3 (gzip, NGSP magic) Gaussian splat — the only downloadable format.
  Sidecars: viewer manifest JSON, floor-plan PNG (no UI consumer), debug transforms.
- **Viewer consumption:** Spark (`@sparkjsdev/spark ^2.1.0`) on three.js/R3F; SPZ streamed through
  authenticated or share-token routes; render caps 150k splats mobile / 500k desktop (deterministic
  stride downsample before first GPU upload; LOD disabled deliberately); manifest correction
  quaternion applied over a baked π X-flip.
- **Quality characteristics (measured, from `quality_metrics` on real jobs):** best-ever
  phone+LiDAR walk PSNR **28.97** (metric scale applied, measured orientation, ~19.7k floaters
  removed by SOR) — declared the visual-quality baseline; typical good COLMAP runs ~23–29;
  scene-typical bar stated as ~23–25; failure gate at 17. Scale recovery is **non-deterministic
  run-to-run** on identical data (`residual_too_high` on a rerun of the 28.97 capture). Splats are
  visual twins, **not a measurement source**; the 3D measure tool is labeled "approximate"
  (real-world units post-Q1; tape-measure verification pending).
- **Delivered to clients today:** token-gated share link `/share/twin/{token}` (roles
  view/annotate/download, optional password/expiry/max-views, view analytics, `?embed=1` chromeless
  mode, branding snapshot) rendering the interactive splat viewer with measure/pin/comment; plus a
  SlateDrop deliverable link-row (`03_Digital_Twin/Deliverables`, stable per-space sentinel).
  Structural flaw documented 2026-07-05: "processing-complete flows directly to share with no
  review step … and no export path beyond a raw `.spz`" (review gate since added as Slice 1;
  exports still `.spz`-only — "useless to architects").

## 6. Known failures and limitations

### Reconstruction failures (documented, with root causes)
- **ARKit-bypass garbage era:** original bypass run PSNR 9.48 with a **4M-splat densification
  explosion**; subsequent fixes (world-space PLY convention, Swift depth-intrinsics rescale, no-flip
  pose pass-through, roll-hypothesis rejection at PSNR 11.64) never beat COLMAP → bypass disabled
  (`colmap_first`), broken-era fleet reprocessed via `reprocess-broken-era-twins.mjs` (AF8).
- **"Giant blob" bug (R7):** metric scale factor was linearly multiplied onto **log-encoded**
  gaussian scales (exponentiating on-screen size), coupled with a silent COLMAP filename-join bug
  that zeroed scale recovery. Both fixed + unit-tested; "model looks like a blob" (BUG-3) is
  *mitigated, not fully closed*.
- **Car-interior test (canonical bad case):** upside-down (PCA up-axis guess on floor-less scene —
  now confidence-gated), off-center (bounds computed on floater-laden raw PLY — now percentile
  crop), floaters (glass/reflective/textureless + tiny baseline), 360 not helping (see below).
- **360 video is ingested wrong:** equirect frames are fed to COLMAP **as flat pinhole images** =
  "garbage"; only stills hit the perspective slicer, and 360 *detection* is a filename heuristic —
  "most real 360 photos silently mis-ingested." The archived chats' claim that Nerfstudio would
  "perfectly un-warp equirectangular" did not survive contact with the implementation. Fix planned
  (P1: aspect-ratio detection + per-frame unwrap); until then the X4 workflow is blocked.
- **SPZ v4 crisis (pre-2026-06-09):** models exported as SPZ v4 silently failed to render (Spark
  reads gzip v3 only) → fleet audit (`verify-twin-spz.mjs`), in-place v4→v3 conversions, worker now
  pins `--spz-version 3`.
- **Floaters:** endemic pre-cleanup; handled by SOR + crop + opacity/scale filters in-worker and a
  legacy in-place patch script; DN-Splatter depth supervision listed as the "biggest floater-killer"
  (not built).
- **The month-long "frozen pipeline":** `MODAL_TWIN_ENDPOINT` was the placeholder
  `https://api.example.com` in Vercel — jobs queued forever ("green buttons do nothing"); plus the
  frozen-at-5% progress bug (no heartbeat; `job_stage` column + progress route added).
- **Upload failure (CEO field report):** 2-minute LiDAR clip failed to upload — ephemeral
  in-memory serial uploader died on screen lock; rebuilt 2026-07-01 as background resumable
  multipart. Separate 2026-07-08 bug: triplicate asset registration made a ~1-min video import take
  25+ minutes.
- **Drone photogrammetry (ASU flights, thermal track):** **ODM failed** — it discards the COLMAP
  model and rebuilds a 247M-point/6.9 GB dense cloud (vs COLMAP's 18.6M/502 MB), thrashing 38 GB
  RAM/37 CPU-hours and yielding a degenerate 36 KB Poisson mesh; "parameter tuning could never fix
  it"; resolved by Poisson directly on the COLMAP cloud (~1 min, 8.8 MB GLB). **COLMAP itself
  registered 917/917 images successfully** on that dataset in the experimental worker.
- **Capture-side physics limits** (from chats/docs): Phoenix sun blowout (zero-data white pixels →
  holes; ND filters/−EV/locked AE-WB), auto-exposure drift → "floating, foggy artifacts,"
  reflective/glass/mirrors, textureless drywall, occluded rafters need drone orbits, splats bake
  lighting (no relighting), 300 MB splat files crash old-phone Safari (→ SPZ + render caps).

### Structural limitations (current)
- One capture per model; no multi-source or cross-capture fusion; no georeferencing; multi-clip
  LiDAR merged only because clips share one ARSession (dispatcher still single-PLY, TWIN-002 open).
- `.spz`-only export; edits are non-destructive overlays that don't reach downloads (no bake);
  embed was "falsely marketed" (copy fixed 2026-07-05; route not built).
- iOS 26.4+ Apple-acknowledged LiDAR VIO drift regression → ARKit poses treated as priors only.
- Reprocess is CLI-only ops tooling from a user's perspective pre-Slice-0; `speed` tiers
  unreachable from the product UI; A10G/`retries=0` means a container kill posts no callback
  (cron backstop).

## 7. Editing, cropping, dissection, unfolding, and 2-D plan capabilities

### Exists today
- **Desktop splat editor** (`DesktopSplatEditor` + tool rail + layers): non-destructive
  **`edit_list`** of SplatEdit SDF operations stored on the model row (source file never mutated);
  crop/erase/slice/transform; **Y-axis clipping "sweep"** (`createSweepEdit`); pick-to-place;
  saved via `/api/digital-twin/models/[id]/edit-list`. Desktop-only, gated by
  `NEXT_PUBLIC_DIGITAL_TWIN_DESKTOP`.
- **3D measurements:** `TwinMeasureTool` two-point distances in real-world units (post-Q1),
  labeled approximate; pins, comments, viewpoints, clip planes, sun studies all have schema +
  viewer support.
- **Viewer "Move" toggle** (shipped 2026-06-30): screen-space drag-to-reposition for off-center
  models (app + share viewers; desktop viewport still lacks it).
- **Floor plan:** raster `floorplan.png` per model (waist-height slice) — generated + stored,
  **zero UI consumers**.
- **Camera path:** cinematic keyframe editor (`camera_path` jsonb); MP4 export not built.

### Attempted/designed but not built
- **Bake** (apply `edit_list` destructively server-side → new model version) — designed (D2),
  planned via a new Modal stage.
- **Section cuts / "open like a book/accordion" dissection** — designed (P3 of
  `TWIN_PLATFORM_ROADMAP.md` + `FLOORPLAN_MEASUREMENT_SPLAT_EDIT.md`): arbitrary clip
  planes/boxes as Spark SplatEdit volumes (three.js `clippingPlanes` don't affect Spark's shader),
  ceiling-cut dollhouse, draggable X/Z section, explode-by-floor, double-sided 2 m "accordion"
  slice. Not implemented.
- **2D vector plans + square footage** — locked hybrid design: **RoomPlan** two-pass same-session
  capture (iOS 17+, `stop(pauseARSession:false)`, `StructureBuilder`, accuracy tier
  measured ±2–5 cm) + **Open3D RANSAC** exterior footprint (estimated ±5–15 cm) + Konva 2D plan
  editor at `/digital-twin/twins/[id]/plan`; partial-capture rule "Mark Gaps, Don't Fake
  Completion" (amber hatch, never fabricate); wall area = L×H − openings; confidence tiers
  measured/estimated/inferred ("inferred never for contract"). **Zero RoomPlan Swift code exists
  yet.**
- **SuperSplat embed** (in-app floater cleanup/crop) — planned, not integrated.
- Ruled out: clip trimming (destroys registration overlap — review keeps reorder + remove only),
  automatic CAD alignment (manual sliders for MVP), splat-derived measurements.

## 8. Architecture and tech stack summary

- **Frontend/app:** Next.js 15.5 / React 19 / TypeScript 5 / Tailwind 4; Capacitor 8 iOS+Android
  shells (remote-URL, `webDir: public`); Zustand+zundo, Zod, Radix, Framer Motion; Serwist PWA;
  design system "Graphite Glass" (tokens only, `--twin360-blue`).
- **3D:** three.js 0.184 + @react-three/fiber 9 + drei 10; **@sparkjsdev/spark 2.1** splat
  renderer (`<sparkRenderer>`/`<splatMesh>` R3F intrinsics); photo-sphere-viewer for panos.
- **Native iOS:** Swift/SwiftUI `LiDARCapture` Capacitor plugin (ARKit, AVAssetWriter,
  background URLSession); Codemagic CI → TestFlight; build stamped `SlateBuildCommit`.
- **Backend:** Vercel (Next.js API routes, crons), **Trigger.dev v4** (project
  `proj_ydquoejbfqidzbjioyno`; env synced from `.env.local` at deploy time — Modal endpoint changes
  require a Trigger redeploy), **Modal** GPU workers (profile `bcvolker`; twin worker on A10G,
  endpoint `https://bcvolker--reconstruct.modal.run`), HMAC-SHA256 worker callbacks
  (`GPU_WORKER_SECRET_KEY`).
- **Data:** Supabase Postgres (prod ref `hadnfcenpcfaeclczsmm`; additive-only migrations; RLS
  everywhere; realtime job status) — `digital_twin_*` table family (spaces, captures, assets,
  models, processing_jobs, multipart uploads/parts, measurements/pins/comments/viewer
  states/clip_planes/viewpoints/alignments/sun_studies/punch_annotations, share_tokens/views,
  usage_events). **Cloudflare R2** `slate360-storage` via AWS SDK v3 S3 API (AWS S3 fallback);
  DB deletes do not remove blobs; hourly cleanup cron.
- **Third-party services:** Stripe + RevenueCat (billing), Resend/Nodemailer (email), Sentry,
  PostHog, Upstash (rate limiting), Google Maps/Leaflet.
- **Python worker stack:** nerfstudio 1.1.5 (Apache-2.0), gsplat 1.4.0 (Apache-2.0), COLMAP
  (BSD-3, apt build), torch 2.4.1 (BSD-3), ffmpeg (LGPL/GPL build, subprocess-only),
  @playcanvas/splat-transform (MIT). **AGPL exposure is confined to the experimental
  `opendronemap/odm:3.5.4` container** (hand-run, not in the product pipeline). No
  LICENSE/NOTICE/SBOM file exists in the repo. Planned-not-installed OSS: RoomPlan (Apple SDK),
  Open3D (MIT), Shapely (BSD-3), Konva (MIT), SuperSplat (MIT), IfcOpenShell (LGPL-3.0).

## 9. What has already been tested or ruled out

| Approach / tool | Outcome |
|---|---|
| ARKit-pose COLMAP bypass (5 experiment rounds) | **Ruled out as default** — PSNR 9–14.7 vs COLMAP 23.3; kept dormant behind `ALIGNMENT_STRATEGY` for a future optimization round |
| Roll-correction hypothesis (R5 ARM-G) | **Rejected** (PSNR 11.64) |
| Separate ARSession per clip | **Ruled out** — #1 multi-clip failure mode; replaced by single-session segments (shipped) |
| Clip trimming in review | **Removed by decision** (destroys registration overlap) |
| React/WebView HUD over ARKit | **Infeasible** — camera interruption, 150–400 ms bridge latency, 850 MB+/thermal-critical at 120 s; all Capacitor AR-overlay plugins abandoned; native SwiftUI HUD built instead |
| Ephemeral in-memory serial uploader | **Failed in the field** (screen-lock death); replaced by background resumable multipart |
| tus.io / Apple WWDC23 resumable uploads | **Ruled out** (~10-AI consensus; R2 speaks neither) |
| OpenDroneMap/ODM | **Ruled out** ("no longer on the path") — 247M-point dense rebuild pathology; COLMAP+direct Poisson used instead |
| Meshroom / WebODM / Luma / Polycam / Scaniverse as user-facing tools | Never adopted (Meshroom never even evaluated in-repo; Polycam/Scaniverse stopgap explicitly rejected — everything must stay in-app) |
| 360 video as SfM input (equirect-as-pinhole) | **Failed** — produces garbage; stills-first strategy + planned unwrap |
| Filename-based 360 detection | **Failed** — to be replaced by ~2:1 aspect detection (GPano confirming-only; Insta360 Studio strips it) |
| PCA up-axis guessing on floor-less scenes | **Failed** (180° flips) — now confidence-gated + gravity-first |
| Bounds from raw PLY | **Failed** (floater-skewed framing) — percentile bounds shipped |
| SPZ v4 export | **Failed** (Spark incompatible) — v3 pinned + fleet converted |
| Metrics-only acceptance | **Banned** (R7.5 permanent visual gate — a share link must be opened in a browser before "done") |
| Survey-grade positioning / GCP certification | **Ruled out** (liability; disclaimer mandated) |
| Automatic CAD alignment | **Deferred** (manual transform sliders for MVP) |
| True 3D progression morph across captures | **Ruled out as promise** ("research-grade — do not promise") |
| Draco compression for PLY/poses | **Deferred** (lossy + worker dependency); native gzip shipped |
| Trigger-side heavy compute / on-device reconstruction | Never pursued — architecture principle: heavy work is cloud-only (Trigger dispatches, Modal computes) |
| Modal endpoint smoke (E2E) | `e2e-twin-one-shot.mjs` proves upload→job→Trigger→Modal→callback→model→share end-to-end, including a real walkthrough video |

## 10. Gaps and missing information

Items not recoverable from this repository/session — needed to complete the record:

1. **Prior-conversation content not persisted here.** This report covers only what is in the repo
   (code, docs, archived chat exports) and this session. Any Twin 360 detail discussed in other
   chats that never landed in a doc/commit is absent. Notably, `MEMORY.md` (referenced by
   `CLAUDE.md` and `SESSION_HANDOFF.md` as a cross-session index) **does not exist in this repo**;
   two archived chat files (`Digital Twin Gemini Plan.txt`, `Digital Twin Grok Comprehensive
   Plan.txt`) are 0 bytes.
2. **"The recent drone photogrammetry flight" with COLMAP producing unusable results:** the repo
   records the opposite on the only executed drone dataset (ASU: COLMAP succeeded 917/917; **ODM**
   was the failure). If a *different* recent drone flight failed in COLMAP (e.g., a Twin-side or
   Mini 5 Pro flight), that dataset, its symptoms, and its logs are not in the record — please
   supply flight date, image count, tool versions, and failure mode.
3. **"360 drones by Anti-Gravity":** only a camera-profile stub for the Antigravity A1 exists
   (Tour Builder doc). Whether hardware has been acquired/flown, and any resulting footage or
   failures, is unrecorded.
4. **What happened when 360 video was combined** — the repo documents the *mechanism* of the
   failure (equirect-as-pinhole) and the car-interior test, but no per-run artifacts (which
   capture, which model IDs, visual results) for X4 360-video attempts beyond the 2026-07-08 field
   test narrative. Capture/model IDs for those runs would complete the failure log.
5. **Whether Meshroom or WebODM were ever actually run** on Slate360 data (no trace in-repo).
6. **Production env-var values as currently deployed** (e.g., current `MODAL_TWIN_ENDPOINT`,
   `ALIGNMENT_STRATEGY` override state on Modal, `NEXT_PUBLIC_DIGITAL_TWIN_DESKTOP` in prod) —
   verifiable only from Brian's machine/Vercel, not from this clone.
7. **Current TestFlight build state** — whether the HUD-match build (commit e8a20b22) and
   TWIN-001-era native code have shipped to Brian's device, and results of the pending on-device
   validations (splat orientation fixture test, thermal envelope on 5–8 min captures, tape-measure
   accuracy check).
8. **Open product decisions flagged for Brian** (from the UX plan): reprocess pricing, bake
   versioning/storage policy, v1 export formats, embed tier policy, square-footage disclaimer
   wording, clip-length final values (90 s target vs current 240 s native cap).
9. **Insta360 X4 ingest specifics** — confirmed export settings used in the field test (bitrate,
   resolution, stabilization state) and whether any X4-origin model exists in prod.
10. **RoomPlan track status** — locked design exists; no implementation start date, no decision
    recorded on iOS 17 deployment-target handling beyond the `@available` guard plan.
