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
