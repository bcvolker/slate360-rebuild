# Twin 360 Capture + Upload — Root Cause & Fix Plan (2026-07-01)

CEO on-device report: (1) capture HUD has a heavy black bottom dock with a near-invisible
Done button, looks nothing like Site Walk, and the exposure/capture-speed controls are gone;
(2) a 2-minute LiDAR clip **failed to upload** (too slow/unreliable) — so LiDAR + viewer
couldn't even be tested; (3) My Twins is legacy slop.

## Capture HUD (native Swift — ships via Codemagic TestFlight)
- **Done button invisibility — FIXED** (commit c74aae3b): was blue-on-blue @ 0.45 opacity on the
  dark dock → now white check on a defined blue-tinted pill, 1.5px border, ≥0.85 opacity always.
- **Exposure / capture-speed controls — architectural, not a regression.** The capture controller
  documents (`TwinARKitCaptureViewController.swift:229-231`) that **ARKit owns camera exposure
  under ARWorldTrackingConfiguration** (`exposureLockEnabled:false`), and frame rate is ARKit-driven.
  The manual exposure/interval controls the CEO remembers came from the **web getUserMedia photo
  path**, not the native LiDAR path — they can't be user-controlled on LiDAR without breaking
  tracking. DECISION NEEDED: accept ARKit-managed exposure on LiDAR (recommended) + add capture
  *guidance* (coverage/lighting/tracking cues) instead of manual sliders; keep manual controls only
  on the non-LiDAR RGB fallback.
- **Heavy black dock vs Site Walk** — the dock is `canvas.opacity(0.85)` (deliberate: `.ultraThinMaterial`
  washed out over bright camera). Align with Site Walk grammar: lighter scrim + hug content; needs
  on-device iteration (can't verify without TestFlight). TODO next native pass.

## Upload — WHY the 2-min clip failed (root cause, `TwinUploader.swift`)
A 2-min capture = **3 files, ~150–400MB+**: `twin_capture.mp4` (8 Mbps H.264 ≈ 120MB/2min,
`TwinARKitCaptureViewController.swift:652`), `lidar_capture.ply` (tens–hundreds MB), `lidar_poses.json`.
The uploader is fundamentally not built for this:
1. **No background URLSession** — session is `.ephemeral` (`TwinUploader.swift:77-83`); zero
   `URLSessionConfiguration.background` / `beginBackgroundTask` in the codebase. Lock the screen or
   background the app mid-upload → iOS suspends the process → in-flight PUT dies. A multi-minute
   upload almost guarantees a lock event. **This is the smoking gun.**
2. **No resume** — 3 in-process retries then the ENTIRE multipart session is thrown away and
   restarts from part 1 next time. Completed part ETags are never persisted across launches (even
   though the server already stores `digital_twin_multipart_uploads`/`_parts` and `complete` is
   idempotent — the progress is just discarded client-side).
3. **Serial parts** — `for partNumber in 1...totalParts` (`:192`), one at a time, each re-hitting
   Vercel to sign a part → PUT. Never saturates the uplink.
4. **60s stall ceiling** (`timeoutIntervalForRequest=60`) → hard failure on congested cellular.
5. **In-memory** — `uploadTask(from: Data)` + `Data(contentsOf:.mappedIfSafe)` — memory pressure on
   large captures (also blocks background upload, which requires `uploadTask(with:fromFile:)`).

## LOCKED consensus (~10 AI platforms, 2026-07-01)
Near-unanimous, code-grounded agreement. **The server-side resumable infrastructure ALREADY
EXISTS** (`digital_twin_multipart_uploads` + `digital_twin_multipart_parts` tables + sign-part/
complete/abort routes; the web `useMultipartTwinUpload` uses it). The native `TwinUploader` just
doesn't — so this is *making the iOS client use what's there* + background session + HEVC, NOT
building from scratch.
- **Transport: Background URLSession + existing R2/S3 multipart. NOT tus.io** (needs a tus server/
  proxy in front of R2 — extra hop, and TUSKit's own docs discourage chunking under background).
  **NOT Apple WWDC23 resumable** (needs a server speaking the IETF draft R2 doesn't implement).
  9/10 platforms agree.
- **Upload from FILE** (`uploadTask(with:fromFile:)`), never in-memory `Data` — mandatory for
  background continuation + fixes memory crashes. Slice each part to a temp file on disk.
- **Persist part ETags** (SQLite/manifest) → on relaunch, resume ONLY missing parts. Never
  discard completed parts on failure; retry per-part with backoff, not whole-file restart.
- **Parallel parts** (3–4 concurrent) + **bigger parts** (16–25 MiB, not 8) + drop the 60s
  request timeout (set `timeoutIntervalForResource` to hours).
- **HEVC video — SHIPPED this turn** (AVAssetWriter → `AVVideoCodecType.hevc` @ 5.5 Mbps; worker
  ffmpeg decodes HEVC natively). ~120MB → ~65MB. Ranked #1 (hours, ★★★★★) by nearly every platform.
- **gzip PLY + poses** (5–20×, lossless, trivial worker gunzip). **Draco deferred** (lossy + needs
  worker decode dep; not worth it at this scale).
- **Don't adopt tus/capture apps wholesale** — build the client uploader; optionally adopt the
  **polyform manifest format** (nerfstudio-toolchain interop). NeRFCapture/Record3D = references only.

**Ranked build order:** HEVC (done) → background URLSession + file-based parts → persist ETags/
resume missing only → parallel parts + 16MiB → gzip PLY/poses → (optional) batch sign-parts +
register-part/status server endpoints for cross-device recovery.

### SHIPPED 2026-07-01 — resumable background uploader (needs fresh Codemagic build)
The full consensus uploader is implemented:
- **Server (live on next Vercel deploy):** `POST /api/digital-twin/upload/sign-parts` (batch
  pre-sign, **6h expiry** so URLs outlive background schedules); `upload/init` accepts
  `partSizeBytes` (clamped 8–64 MiB; native asks for **16 MiB**, web unchanged at 8).
- **Native (rides next TestFlight build):**
  - `TwinUploadSession.swift` — singleton **background URLSession** engine
    (`ai.slate360.twin.upload.bg`, `isDiscretionary=false`, `sessionSendsLaunchEvents=true`,
    4 parallel connections, 300s/24h timeouts). Parts are sliced to disk files and sent via
    `uploadTask(with:fromFile:)` — screen-lock/backgrounding no longer kills uploads.
  - `TwinUploadSupport.swift` — on-disk manifest (`Application Support/TwinUploads/<uploadId>/`)
    persisting `{partNumber → ETag}` after every part; relaunch resumes ONLY missing parts.
    Engine POSTs `upload/complete` itself (works from a background wake too).
  - `TwinUploader.swift` — rewritten as the per-capture orchestrator (16 MiB parts, per-part
    retry w/ re-sign + backoff ×5; singles path unchanged for <8 MiB files).
  - `LiDARCapturePlugin.load()` → `resumePendingUploads()` finishes interrupted uploads at
    every launch; `AppDelegate` implements `handleEventsForBackgroundURLSession`.
- Still TODO from the ranked list: gzip PLY/poses (+ worker gunzip → Modal redeploy), overlap
  coaching, multi-clip registration stage.

## Fix plan (ranked — "think outside the box" per CEO)
1. **Resumable multipart + parallel parts** (no server change; biggest reliability+speed; moderate
   native work). Persist `{partNumber, etag}` to disk keyed by `s3UploadId`; on relaunch upload only
   missing parts. Upload 3–4 parts concurrently (S3/R2 is designed for it; ~40% faster). Read chunks
   from file offsets (already uses `FileHandle.seek`).
2. **On-device compression** (biggest payload cut — the LiDAR-specific win). Video → **HEVC/H.265**
   (`AVVideoCodecType.hevc`, ~half size) — VERIFY the Modal worker ffprobe/decode accepts HEVC first.
   Point cloud/poses → **Google Draco** (points down to single-digit KB at aggressive quantization,
   ~60ms, mobile-friendly) or at minimum gzip the PLY + JSON (5–20×). Worker must decode.
3. **Background URLSession** (`background(withIdentifier:)`, `uploadTask(with:fromFile:)`,
   `URLSessionTaskDelegate`, `isDiscretionary=false`) — the correct long-term foundation so
   lock/background no longer kills uploads. Largest refactor: **kills the current synchronous
   semaphore design** (`syncRequest`), so schedule after 1–2 prove the contract.

Alternatives evaluated: **tus.io + TUSKit** (resumable, Vimeo/Google-proven, but poor custom-
background-URLSession support + needs a tus server shim in front of R2 — competes with #3 rather
than composing). **Apple resumable upload tasks** (WWDC23 s.10006, IETF draft, most Apple-native but
needs a server speaking the draft).

## OSS references (put all solutions on the table — CEO ask)
- **NeRFCapture** (github.com/jc211/NeRFCapture) — OSS ARKit app: posed images + LiDAR depth,
  offline + streaming modes. Directly relevant to poses+depth packaging.
- **Record3D** — iPhone LiDAR capture, compact depth+RGB export; reference for efficient depth packaging.
- **Polycam polyform** (github.com/PolyCam/polyform) — documented raw LiDAR export format; key lesson:
  **globally optimized poses server-side** rather than trusting drifting raw ARKit poses (relevant to
  our `lidar_poses.json` — pairs with the worker gravity/COLMAP work).
- **Google Draco** (google.github.io/draco) — point-cloud compression.
- **Nerfstudio custom-data docs** — canonical formats these apps upload into.

## Multi-clip registration — LOCKED consensus (~10 platforms)
1. **Keep ONE ARSession alive across clips** = the single biggest lever. If the session isn't torn
   down between clips, all clips share one world origin → registration is FREE (concatenate poses +
   clouds). Coach the user to stay in the capture screen between clips. **Do this first.**
2. **Separate sessions → Open3D multiway ICP + pose-graph, seeded by ARKit poses + the gravity
   quaternion we already compute** (gravity locks pitch+roll → ICP only solves yaw+translation →
   fast + robust). NOT global COLMAP as default (slow, fails on textureless drywall/corridors).
3. **ARKit ARWorldMap relocalization** at capture (save clip 1's map, `initialWorldMap` for clips
   2–5) → best-case zero-compute native alignment.
4. **COLMAP/GLOMAP only as fallback** when ICP confidence is low (symmetric hallways, <15% overlap).
5. **Overlap coaching at capture**: bounding-box/voxel overlap % + ghost of prior clip; require
   ≥30% overlap, warn <15% (reuse the HUD status-row + bottom-rail caption — no floating UI).
6. **Feed the merged .ply as splat init** (`--ply` / `lidarPlyKey` = merged cloud) → kills the
   "cloud of floaters" artifact. Free quality win.
7. New Modal stage `register_clips()` **between upload and splatfacto**; processing screen gains an
   "Aligning clips" stage (fits the existing staged checklist — honest progress).
OSS: **Open3D** (`registration_icp` point-to-plane + `global_optimization` pose graph) = the
workhorse; TEASER++ = outlier-heavy fallback; Kabsch/SVD = manual 3-point alignment safety net;
GLOMAP/COLMAP = last-resort BA. No turnkey OSS solves iPhone multi-clip end-to-end — compose
ARWorldMap (capture) + Open3D multiway (server).

## Multi-clip LiDAR overlap (CEO question: how do multiple clips' LiDAR overlap + become useful)
Today each clip = its own PLY + poses. To fuse multiple clips into one twin: register each clip's
point cloud into a shared frame. Two paths: (a) **COLMAP/global bundle adjustment** across all clips'
frames (Polycam's approach — robust, server-side, slow); (b) **ICP alignment** (Open3D) of overlapping
point clouds using ARKit poses as priors. Prompt to external platforms below. The worker already
computes a gravity `correction_quaternion`; multi-clip needs a cross-clip registration stage before
splat training.

## What ships without TestFlight (web)
- **My Twins rebuild** — mobile `twins/page.tsx` rows are thin (title + status text only). Upgrade to
  real cards: name + project line + real status chip (READY blue / PROCESSING / FAILED) + last-activity
  date; tap → viewer (already forks to processing/failed). Thumbnail needs a `preview_url` source added
  to `loadDigitalTwinHubData` + `HubTwin` (absent today) — placeholder until then. The DESKTOP
  `DashboardDomainWorkspace`-driven twins page is the worse "legacy slop" (stat-card band + redundant
  Active/Completed/All tabs + project-name-as-string) but is `redirect("/dashboard")` under APP_STORE_MODE.
