# Twin 360 — Architecture Brief for External AI Strategic Review

**Date:** 2026-07-02
**Purpose:** Give reviewing AI platforms the EXACT current architecture, the rationale
for our decisions (including where we deliberately diverged from prior recommendations),
what now works, and the open problems — so they can critique at the strategic/architectural
level with full context. Emphasis: **very large commercial-construction interiors + exteriors**
where file size, upload time, processing speed, and metric accuracy are all critical.

---

## 1. Product & scale requirements

Twin 360 lets construction users produce navigable, measurable 3D "digital twins" of large
commercial structures from a phone, optionally augmented with more data:
- Primary capture: iPhone (ARKit + LiDAR where available) — video + LiDAR depth + camera poses.
- Optional additions: Insta360 (360 photo/video), drones (photo/video, exterior), external
  LiDAR/point clouds, GPS.
- Target scenes: whole floors / buildings — long continuous walkthroughs, often **multiple
  clips** to cover a space, sometimes **repeat visits** (progress over time).
- Deliverables: interactive web link (must stream fast on mobile browsers), file exports,
  and later: crop/cleanup, 2D floor plans, square-footage measurement, exterior/interior
  walkthroughs for stakeholders.
- Non-negotiables at scale: uploads must survive backgrounding/kill and finish reliably over
  cellular; processing must produce a model you can immediately SEE (centered, denoised);
  measurements must be metrically trustworthy.

## 2. Exact current architecture (as built)

**Mobile (native iOS, Capacitor shell):**
- Capture is a **native ARKit view controller** (Swift), NOT a web/getUserMedia screen. It
  owns the camera and, in one ARSession, records: HEVC video (AVAssetWriter), a voxel-downsampled
  LiDAR point cloud (.ply), and per-keyframe camera poses + intrinsics + gravity + GPS (.json).
- **Multi-clip within one walk = ONE continuous ARSession.** The shutter starts/ends a *clip*;
  the session never tears down between clips, so all clips share one world origin (registration-free
  concatenation). "Done" exports all clips.
- Backpressure: per-frame LiDAR voxel inserts are bounded (drop when the processing queue is
  behind) so a long walk can't build an unbounded backlog that stalls the save.
- On-device compression: HEVC video (~half of H.264); gzip on the .ply + poses (worker gunzips).
- **Upload = native background URLSession + R2/S3 multipart**, file-based parts (16 MiB, ~4
  parallel), per-part ETags persisted to disk → resume only missing parts across app
  relaunch/kill. Completely decoupled from the WebView. Cookies snapshotted before the AR
  session (a reclaimed WebView content process can't stall the upload).
- Ships via Codemagic → TestFlight (native code does NOT reach the device via web deploy).

**Backend / cloud:**
- Next.js on Vercel: presign/init/sign-parts/complete API routes; auth; job creation.
- Storage: Cloudflare R2 (S3-compatible multipart).
- Orchestration: Trigger.dev task `twin.gaussian_splat` → POSTs a job to a Modal endpoint;
  Modal posts an HMAC-signed callback to the API on progress/completion/failure.
- GPU processing: **Modal** (A10G), running **nerfstudio 1.1.5 / splatfacto** (gsplat backend).

**Processing pipeline (Modal worker), current:**
1. Download + gunzip assets.
2. **LiDAR pose bypass:** if ARKit poses are present + good, build nerfstudio `transforms.json`
   directly from the poses and time-match extracted video frames — **COLMAP is skipped entirely**
   (fast, robust on textureless drywall/corridors). COLMAP/GLOMAP is only the fallback.
3. **LiDAR depth prior:** the LiDAR .ply seeds splatfacto init (`ply_file_path`) — real geometry
   instead of random init → fewer floaters, faster convergence.
4. Train splatfacto (reduced iterations when the LiDAR prior is active; densification stopped
   at ~57% of iterations so the model doesn't explode into millions of gaussians).
5. Export .ply → clean + convert to **.spz** (Niantic's compressed splat format) via
   `@playcanvas/splat-transform`, with **escalating opacity filtering** (0.05→0.7) that removes
   low-opacity floaters until the model fits the converter's memory and stays small.
6. Bake a **framing/orientation manifest** (percentile-based center/radius + gravity-plane
   up-correction) the web viewer applies so the model opens centered and upright.
7. Upload .spz + manifest to R2; callback marks the job ready.

**Viewer:** Three.js-based splat viewer; token-gated share links; applies the framing manifest.

## 3. Decisions and rationale — including where we DIVERGED from recommendations

- **Background URLSession + R2 multipart, NOT tus.io.** We adopted the consensus. tus would add
  a server/proxy in front of R2; native S3 multipart matches our existing presign API. ✅ adopted.
- **Native-first capture, upload decoupled from the WebView.** Adopted. This fixed the "stuck at
  Saving / zero server contact" class of failures.
- **We did NOT adopt a wholesale OSS capture app.** Per advice, we borrowed patterns (posed-frame
  export à la NeRFCapture; background-transfer delegate patterns) but kept our own uploader,
  because R2 presign + Modal orchestration + our multi-clip model are already custom. ✅ aligned.
- **We bypass COLMAP by default (LiDAR poses → transforms.json).** This is our biggest speed/
  robustness win and a divergence from "run GLOMAP/COLMAP on all clips." We only fall back to
  COLMAP/GLOMAP when poses are missing/low-confidence. Rationale: ARKit poses on LiDAR devices
  are good enough to skip SfM for the common case, and SfM is the slow/fragile part on
  featureless interiors. **We want a reality check on this at building scale** (drift over long
  walks, multi-clip pose consistency).
- **We use the LiDAR cloud as a splat init prior**, not as the final model. Adopted the "LiDAR
  cheat code" idea.
- **Deferred (NOT yet built) from the consensus:** (a) a full local **SQLite capture-job queue**
  as source of truth with a native pending/failed/retry UI — we currently persist multipart
  ETags to disk (resumable) but do not yet have the richer job-queue+native-UI layer; (b)
  **auto-segmentation** of long recordings into ~90s chunks — we do multi-clip via manual shutter
  on one ARSession, but not automatic time/size segmentation. We deferred these as hardening
  because capture+upload now work; we want opinions on whether they're required BEFORE
  building-scale field use.
- **We did NOT switch to a monolithic OSS end-to-end pipeline.** We assemble nerfstudio +
  (optional) COLMAP/GLOMAP + Open3D on our own Modal orchestration.

## 4. What now works (verified on-device + in DB/logs, 2026-07-02)

- Native capture, save, and **background upload work** — fast, with a live percentage, survives
  advancing screens; a real capture reached the server and dispatched to Modal.
- The pipeline **produces completed models** (an earlier scan completed 100%).
- Root-caused + fixed this week: (a) the multi-minute "Saving" freeze (unbounded LiDAR-insert
  backlog + a main-thread watchdog that was dead while backgrounded + a stale-PTS finishWriting
  hang); (b) a processing failure where a **4.34M-gaussian / ~1GB** model crashed the .spz
  converter (WASM OOM) — fixed via escalating opacity filtering + earlier densification stop +
  pinned converter.

## 5. Open problems / questions at BUILDING scale (where we want strategic advice)

1. **Model-size explosion on large/complex scenes.** A single sunlit reflective subject trained
   to 4.34M gaussians / 1GB. Our current levers are post-hoc opacity filtering + stopping
   densification earlier. At whole-floor scale this will be far worse. What's the right way to
   keep a building-scale splat both accurate AND streamable — a hard gaussian budget, spatial
   **LOD / tiling** (stream by region as the viewer navigates), splatfacto-big vs vanilla,
   opacity/scale regularization tuning, or a fundamentally different representation for very
   large spaces?
2. **Multi-clip / multi-visit registration at scale.** One ARSession covers a single continuous
   walk. A building = many clips, possibly separate sessions/visits (progress over time). ARKit
   pose drift accumulates over long walks. What's the most robust, cheap path to fuse many
   clips/visits into one metric coordinate frame — Open3D multiway ICP seeded by ARKit poses +
   gravity, GLOMAP global BA, ARWorldMap relocalization, fiducial/April-tag anchors, or a hybrid?
   How do we detect and correct drift on a 10-minute corridor walk?
3. **Upload time/size for very long walks over cellular.** We have resumable parallel multipart +
   HEVC + gzip. At building scale (many GB), is manual multi-clip enough, or do we need automatic
   segmentation + a Wi-Fi-preferred deferred queue that uploads across hours/days? Optimal part
   size / parallelism for jobsite cellular?
4. **Processing speed & cost at scale.** A10G + nerfstudio. For whole-floor jobs, what's the
   speed/accuracy/cost sweet spot — bigger GPU, tiled parallel training, fewer iterations with a
   strong LiDAR prior, or a fast draft tier (OpenSplat) + a quality tier?
5. **Metric accuracy for measurements (square footage, walls with doors/windows).** A Gaussian
   splat is great to look at but not clean CAD geometry. Do we need a **parallel metric layer**
   (ARKit mesh / RoomPlan / the LiDAR point cloud / external LiDAR) for measurement, with the
   splat purely visual? Best practice to keep the two layers registered and to extract 2D floor
   plans (Open3D plane slice + OpenCV) at accuracy contractors will trust?
6. **Viewer performance for building-scale models in a browser share link.** Fast streaming of a
   large .spz on mobile — LOD, progressive/tiled loading, culling. Is .spz + Three.js the right
   stack at this scale, or do we need a tiled renderer (Potree-style for point clouds) alongside?
7. **Multi-modal fusion (drone exterior + 360 + external LiDAR).** How to fuse exterior drone
   photogrammetry (e.g. OpenDroneMap) and interior LiDAR into one coherent, correctly-scaled twin
   — shared control points, GPS+gravity, or manual alignment first?

## 6. The specific ask

Given the architecture above (and our divergences — COLMAP-bypass-by-default, one-ARSession
multi-clip, deferred SQLite queue/auto-segmentation), please compare against your earlier
recommendations and tell us: what would you change or add at the strategic/architectural level
to make building-scale capture reliable and building-scale models accurate, small, fast to
process, and instantly viewable (centered, denoised) — and where is our current approach likely
to break first as scenes get large?
