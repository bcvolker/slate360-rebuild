# Room 213 blank viewer + open-source reuse investigation — 2026-09-26

Remote session (Claude Code on the web, Brian away from desk). Branch: `claude/room213-viewer-oss-eval-ybh46o`,
based on `preview/room213-walk` @ `feaf12b`. **Not merged to main.** No GPU work, no R2 credentials used or exposed.

**Environment limits of this session (important for reading the claims below):**
- The session's network policy blocks `slate360.ai` and `vercel.com`, so the live preview could not be opened,
  deployment logs could not be read, and no Vercel URL could be verified.
- No R2 credentials were available (and none were sought), so the 247 MB master PLY could not be fetched.
  **No fidelity A/B was run.** Every renderer comparison below is source analysis, not measurement.

---

## 1. Blank viewer: root cause assessment

### What the preview did (feaf12b)
`/preview/room213` → `Room213Viewer` → `SplatLabWalkViewer` → `SplatViewerCore` → `SplatViewerScene`:
1. The manifest comes from `/preview/room213/asset?kind=manifest.json` after a 404 from the authenticated
   generic manifest route (expected).
2. `useSplatBytes` fetches `/preview/room213/asset?kind=ply`. That route does a `GetObjectCommand` on R2 and
   **streams the whole 247 MB PLY through a Vercel function** (`maxDuration = 300`).
3. The bytes go to Spark (`fileBytes`, `extSplats: true`, LoD off) → `onLoad` → overlay removed.

### Findings
| # | Finding | Evidence |
|---|---|---|
| F1 | **247 MB media proxied through a server function.** Vercel's documented function payload limit is 4.5 MB, and only streamed responses are exempt. The transfer is also bounded by `maxDuration` (300 s ⇒ needs ≥0.83 MB/s sustained from R2 → Vercel → phone), and every view pays function time and egress twice. A function killed mid-stream still returns **status 200 with a shortened body**. | `app/preview/room213/asset/route.ts`; Vercel docs (limits page) |
| F2 | **No completeness check.** On a stream that ended early, the old `useSplatBytes` quietly handed Spark `prealloc.slice(0, loaded)`, a truncated PLY with its original header vertex count. Depending on where the cut fell, Spark either failed inside its worker (overlay sits at 100 %, then the 60 s decode timeout) or decoded a partial or garbage model. | old `hooks/useSplatBytes.ts` |
| F3 | **Phone memory.** 247 MB buffer + Spark worker decode + 1M ExtSplats + ext accumulators. An iOS Safari tab that exceeds its budget is killed and reloaded, so it looks like "page loads, model never appears". | `use-spark-profile-check.ts` accumulator readout; not measured on device |
| F4 | The overlay/error UI exists, but it used generic text ("Loading 3D twin…") and nothing reported "decoded but drawing 0 splats". | `splat-viewer-loading-overlay.tsx` |
| F5 | Ruled out: the service worker. `app/sw.ts` is a kill switch with **no fetch handler**. `SWRegistrar` reloads the page **once** per new deploy (first visit), which restarts the download once. It does not loop. | `app/sw.ts`, `components/providers/SWRegistrar.tsx` |
| F6 | Ruled out: CSP. `connect-src` already allows `https://*.r2.cloudflarestorage.com`. | `next.config.ts:76` |

**Verdict: most likely F1 + F2**, meaning the 247 MB function proxy cut off or stalled with no visible error, and F3 on iPhone.
**This is not proven**, because the preview could not be opened from this session. The patched build names the failing
stage on screen, so one visit by Brian will tell us which it is.

### Fix on this branch
- `route.ts`: new `kind=ply-url` → `{ url, bytes, expiresInSec }`, a **15-minute presigned GET for one fixed key**
  (HeadObject supplies the exact size). No credentials leave the server. `kind=ply` stays as the **fallback** proxy and
  now sends `Cache-Control: no-transform` so Content-Length stays exact.
- `useSplatBytes(url, onProgress, signedUrlEndpoint)` flow:
  1. Try the direct R2 download first.
  2. If that fails **for any reason (incl. CORS)**, fall back to the proxy.
  3. Either way, reject a body shorter than the declared size, and reject a binary PLY whose header arithmetic says it is truncated (`lib/digital-twin/splat-download.ts`).
  4. Log `[useSplatBytes] direct|proxy download complete: N bytes`.
- Visible stages: **"Downloading model — XX %"** → **"Preparing model…"** → **"Rendering…"** (until the first live
  renderer check). A real error card appears on failure. An alert appears if the renderer reports **0 active splats**.
- Tests: `lib/digital-twin/splat-download.test.ts` (truncation, missing Content-Length, header check).
- Local headless Chromium run (no R2 in sandbox): the page showed "Downloading model…", then "This model didn't load —
  Could not download the model (HTTP 500)", then Try again. The direct→proxy fallback fired as designed. It is never blank.

### Part 2: direct R2 delivery checks
| Item | Status |
|---|---|
| Presigned GET, short TTL, single key | Implemented (15 min, fixed key, GET only). |
| Content-Length | Safelisted CORS response header; also returned by the signing endpoint, so progress and integrity don't depend on it. |
| Range | Not needed (single full GET). R2 supports Range; SOG streaming later will use it. |
| **CORS** | **Likely blocks preview origins today.** `scripts/ops/verify-digital-twin-r2-cors.mjs` only requires `slate360.ai` + `localhost:3000`. Until a preview origin is added, the direct path fails and the viewer falls back to the proxy (same delivery as before, but now integrity-checked and never silent). |
| Safari | Presigned R2 GET + `fetch` streaming works in Safari 15+. The phone memory ceiling (F3) remains; the real cure is a smaller delivery format (see SOG, §4). |

Suggested bucket CORS rule to add (desktop, Brian's R2 creds or Cloudflare dashboard). This is a **GET/HEAD-only rule**, so PUT
rules stay as they are:
```json
{ "AllowedOrigins": ["https://slate360-rebuild-git-preview-room213-walk-slate360.vercel.app"],
  "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"],
  "ExposeHeaders": ["Content-Length", "Content-Type", "ETag", "Accept-Ranges", "Content-Range"], "MaxAgeSeconds": 3600 }
```
(Whether R2 accepts a `https://*.vercel.app` wildcard is UNVERIFIED. Use exact origins.)

---

## 2. SuperSplat viewer (playcanvas/supersplat-viewer v1.35.2, 2026-09-25, MIT). Verified in source.
- **WebGPU** is the default, with **WebGL2 fallback** (engine `graphics-device-create`). WebGPU sorts on the GPU; WebGL sorts on the CPU.
- **Radial sorting** is always on (`viewer.ts:445`).
- **Budgets**: mobile 1M/2M, desktop 2M/4M (performance/quality), `?budget=`. Render resolution is capped at 1080 px mobile and 2160 px desktop.
- **highPrecisionRendering** (`?hpr`): a float16/32 intermediate target. It only applies when post-effects are on.
- **Formats**:
  - Loaded: PLY, compressed PLY, SOG, `meta.json`, and streamed SOG `lod-meta.json` (progressive: coarsest LOD first).
  - **Not loaded:** SPZ. It would need the engine's separate parser, which the viewer doesn't register.
- **Walk**:
  - A first-person capsule with ground-follow, gravity and wall collision.
  - Collision comes from `.voxel.json` or `.collision.glb` (made by splat-transform).
  - **Walk is only enabled when collision data exists and the scene is ≥5 m in X/Z.**
- **Input**:
  - Touch: orbit, pinch, tap, plus an on-screen joystick.
  - WASD/mouse, trackpad and gamepad.
- **Annotations**: read-only authored hotspots (`settings.annotations[]`) with `selectAnnotation()`. **Runtime editing is not supported.**
- **npm embedding**: `@playcanvas/supersplat-viewer/viewer` exports `createViewer({container, contentUrl, collisionUrl, settings, ui:false, budget, …})`. The handle gives us:
  - observable `state`: `cameraMode` orbit/anim/fly/walk, `walkAllowed`, …
  - `frameScene()`, `resetCamera()`, `toggleWalk()`, `setMoveInput()`, `requestFullscreen()`, `destroy()`
  - raw `app` access
- **URL loading**: `?content=`, `?collision=`, `?settings=`, `?webgl`, `?noui`, …
- **Engine blur term:** PlayCanvas **always adds +0.3 px² to the 2D covariance** (`gsplatCorner.js:78-90`, and the WebGPU
  compute path). This is the same low-pass we *removed* from Spark for Spirula 3dgut (Spirula 3dgut trains with no 2D
  dilation). **Out of the box, SuperSplat would re-introduce the blur that cost carpet detail.** It is also a
  centre-Jacobian (EWA) projector like Spark, so it cannot remove the remaining trainer-vs-viewer gap either. A fair B arm
  needs the +0.3 removed via an engine shader-chunk override (MIT, small patch).
- **Mapping to Slate360 UI needs:**
  - Dollhouse default = orbit with an authored initial camera.
  - Walk = `toggleWalk()` (needs collision voxels).
  - Reset = `resetCamera()`; fullscreen = `requestFullscreen()`.
  - Touch and desktop are both covered.
  - Pins, floorplan and source-photo links stay ours, as a DOM overlay projected through `viewer.app`'s camera.
- **What it could replace in Slate360:**
  - `SplatOverviewNavigation`, `SplatInteriorNavigation`, walk-step/eye-height/ground-ray helpers, the LOD/budget code
    and mobile downsampling. That is roughly the navigation half of `components/digital-twin/splat-viewer-*`.
  - It **cannot** replace our edit-list crop (`dollhouse_edit_list`), the render-profile assertion, or the manifest orientation.
    Those would have to be re-expressed: orientation via splat-transform `-r` at publish, crop via `-B` at publish, or a
    PlayCanvas-side equivalent.

## 3. Spark `focalAdjustment` (installed 2.1.0; latest 2.2.0)
Verified in `src/shaders/splatVertex.glsl`:
- `:190` `scaledRenderSize = renderSize * focalAdjustment`
- the covariance is built in scaled pixels
- `:219-241` blur is added
- `:265` offsets are divided back by `scaledRenderSize`

In real pixels the drawn footprint is **trained covariance + blur / f²**, so f only divides the blur and shrinks the
`maxPixelRadius` clamp by f. **With the Spirula 3dgut profile (blur 0, preBlur 0), f = 1.25/1.5/2 is a mathematical no-op**
on normal views; only very large close-up splats (clamped at 512/f px) can change, and they get *truncated*, not sharpened.

**Verdict: the A/B is not justified as a fidelity lever.** At most, run a 1-view sanity check (expect bit-identical) during the
desktop session. It cannot close the 0.4–0.5 px baseboard gap.

The remaining gap most plausibly comes from projection:
- **Spark:** centre-point Jacobian projection.
- **Trainer (3DGUT):** per-ray evaluation.

Spark's `enableRayEval` exists only as commented-out code (2.1.0, 2.2.0, main). This is a hypothesis, UNVERIFIED by measurement.

Two cheap renderer-only probes remain for shimmer (0.50 vs 0.14). Both are hypotheses:
- Spark's sort runs asynchronously (GPU depth readback → worker sort), so order can lag the camera during motion. Spark already defaults `sortRadial: true`, so radial ordering is not the difference.
- PlayCanvas on WebGPU sorts on the GPU per frame.

## 4. splat-transform (v3.6.6, 2026-09-25, MIT). Verified CLI.
**Conversion and formats**
- PLY→SOG (`out.sog` or `out/meta.json`).
- **Streamed SOG** = `lod-meta.json` + `{lod}_{i}/` chunks. Build it with `--decimate`/`--decimate-adaptive` per level, then `--tag-lod`. A single-command multi-level build is UNVERIFIED.
- SPZ read/write (v3/v4).

**Editing**
- Merge = list multiple inputs.
- Transforms: `-t`, `-r`, `-s` (uniform only).

**Filters**
- `-N` NaN, `-V` value, `-B` box, `-S` sphere, `-H` SH bands.
- `-F` floaters and `-C` cluster (both need a GPU).

**QA**
- `--stats text|json` gives per-column stats + `fillRatio`.
- `--info`.

**Collision**
- `.voxel.json` (needs a GPU) or `--collision-mesh` → `.collision.glb`.

**Other outputs**
- `.html` viewer export, `.csv`, `.glb`, `.webp` renders.

**SOG is lossy:**
- Positions: 16-bit log-quantised.
- Rotations: 3×8-bit.
- Scales and DC colour: 256-entry codebooks.
- Opacity: 8-bit.
- Higher-order SH: k-means palette of ≤64k entries.

PLY→SOG runs on CPU Node (k-means has a CPU fallback). Floaters, cluster, voxel and lod-errors need a WebGPU/Dawn adapter.

### Fidelity gate (required before any SOG production use)
Run the same PLY and the same matched cameras (the existing `workers/modal/room213-detail-diag` harness) through the **same renderer and
profile**:
- **A** = master PLY
- **B** = PLY→SOG (and B' = streamed SOG at full LOD)

Pass only if **all** hold on golden Room 213:
1. Carpet coherent gain (f = 640) ΔB−A ≥ −0.01. Today corrected Spark scores 0.52.
2. Baseboard 10–90 % edge width ΔB−A ≤ +0.10 px.
3. Motion shimmer ΔB−A ≤ +0.02.
4. Fine-band incoherent ratio (f = 1280) does not rise.
5. Brightness: mean ΔE00 ≤ 1.0 and p95 ≤ 3.0 over masked pixels.
6. `--stats` of B vs A: the opacity/scale histograms match (KS p > 0.01); no NaN/Inf.

Fail any one → keep PLY delivery. If SH or scale codebooks are the culprit, re-test with `-H` or larger codebooks.

## 5. Spirula v2026.9.24 code diff (pin `fd1afca1`, 2026-09-22 → tag `183b2c6d`)
- **The "improved SfM for sequential datasets with repetitive features" is already in our pin.** Commits `35ce723b` and `c579f7ef` predate `fd1afca1`, and `src/sfm/map/Mapper.h` / `src/sfm/core/Sequence.h` are unchanged pin→tag.
  - What it does: a `--sequence`-declared neighbour-first seed and registration order, near-inlier PnP ranking, a relaxed ratio gate, and an audit that cannot overturn a neighbour-supported pose.
  - The failure it targets is **image-level folding onto a repeated structure**.
  - It is inactive unless a sequence is declared.
- **Room 213 never showed image-level folding.**
  - The repeated-feature problems were feature-level tails (ceiling grid, chair mesh, carpet). Native-fisheye COLMAP registered 242/242 in one component.
  - The limits were the Mei ray model at wide field angles, then the X4 HEVC source ("CAPTURE CHANGE").
- **Changed pin→tag:**
  - fisheye border detection (`src/app/FrameMask.cpp`)
  - mask editor (GUI, SAM prompts, saved SVG masks)
  - SceneAlign auto-align with ground levelling by default (changes only the output frame)
  - `.insp/.lrv` (half-crop into cam0/cam1, fisheye self-calibration)
  - config key `convert_initial_point_cloud_color` → `point_color_*` (**upgrade risk** for our configs)
- **Classification:**
  - Room 213: none materially relevant (only the config-key upgrade risk).
  - Future Slate360:
    - sequential mapper: walks through repeated rooms, corridors or floors
    - `.insp` support: the recommended next capture is X4 tripod stills
    - border detection and the mask editor
    - auto-align
  - Not relevant: MCP.
- **Recommendation: no Room 213 re-run.** An optional future camera-only A/B (at the pin, since the code is identical) would be:
  - B = `spirula sfm auto --rig dual-fisheye=cam0,cam1 --sequence cam0,cam1` on the 242 raw frames
  - A = the FullCircle COLMAP 3.12.6 solution, scored by leave-one-out landmarks + baseline CV

  It is a pipeline-replacement question, not a detail fix.

## 6. Spirula MCP
- **Code:** `tools/gui_mcp.py` (≈300 lines, stdio) forwards to a loopback HTTP automation API (`127.0.0.1:7777`, token file, `SS_GUI_AUTOMATION=1`) exposed by the ImGui app. It needs a display (Xvfb works).
- **Tools:** `gui_launch`, `gui_state`, `gui_tree`, `gui_click`, `gui_move`, `gui_drag`, `gui_scroll`, `gui_key`, `gui_text`, `gui_wait`, `gui_screenshot`.
- **No semantic job API:** no dataset, SfM, train, mask or render calls. It is widget clicking.
- **Maturity:** about 6 days old, no tests, and a stale default exe path.
- **Verdict:** not suitable for dataset creation, reconstruction launch or batch jobs; use the Spirula CLI/manifest from Modal. Possible later use: screenshot-based visual QA only.

## 7. License review
| Component | License | Use |
|---|---|---|
| supersplat-viewer | MIT | OK to embed/modify |
| PlayCanvas engine (`playcanvas`) | MIT | OK |
| splat-transform | MIT | OK (CLI in workers) |
| `@adobe/spz` | ISC | OK |
| `webgpu` (Dawn bindings) 0.4.0 | latest MIT; 0.4.0 UNVERIFIED | check before shipping |
| Spark (`@sparkjsdev/spark`) | MIT | current |
| **Spirula** | **GPL-3.0** | OK as a separate process on our servers (not AGPL, not NC). **Do not link or bundle into distributed apps.** |
| SAM 3 weights (Spirula download) | **Meta custom license — flag** | avoid commercially without legal review; SAM 2.1 (Apache-2.0) is the safe alternative |
| ALIKED / LightGlue / LoMa / Metric3D / MoGe | BSD-3 / Apache-2.0 / MIT / BSD-2 / MIT | OK |
| Spirula `SS_ENABLE_PATENTED` build | AVC/HEVC patent exposure | avoid |

## 8. Reuse-first architecture (realistic, all permissive except Spirula-as-a-service)
```
capture → Spirula (GPL, server-side process on Modal) → MASTER PLY (lossless, retained in R2)
       → splat-transform (MIT, Modal CPU/GPU): --stats QA gate, -r/-B orient+crop, -N/-F clean,
         → SOG / streamed SOG (only after the fidelity gate), .voxel.json / .collision.glb
       → Viewer: PlayCanvas engine via supersplat-viewer createViewer(ui:false) OR keep Spark
       → Slate360: projects, captures, dates/history, pins/comments, source imagery, permissions,
         contractor portal, branding/UI, presigned delivery
```
- **Adopt directly:**
  - splat-transform for `--stats` QA, collision voxels, transforms and filters.
  - The presigned-R2 delivery pattern (this branch).
- **Needs modification:**
  - supersplat-viewer/engine: remove the +0.3 blur for 3dgut models; add our DOM overlay for pins; express our dollhouse crop as publish-time `-B` or a runtime filter.
  - SOG: gated by §4.
- **Remains custom:**
  - everything in the Slate360 column
  - the provenance → render-profile assertion (`spark-render-profile.ts`)
  - the manifest/orientation contract
  - the viewer UI shell (`SplatWalkBar`)

## 9. Top 3 next actions
1. **Brian opens the patched preview on iPhone + desktop**, reports the on-screen stage, and gets the console line
   `[useSplatBytes] direct|proxy download complete`. This proves the actual root cause.
2. **Add the preview origin to R2 CORS (GET/HEAD)** so the direct path is used; re-open and confirm `direct`.
3. **Desktop renderer A/B on the existing harness**:
   - A = corrected Spark.
   - B = PlayCanvas engine with the +0.3 removed (hpr on, aa off).
   - Plus a single focalAdjustment 1.0-vs-2.0 sanity view (expect identical).
   - Same PLY, same cameras; score detail, edge width and shimmer.

## 10. Desktop work queue (when Brian returns)
1. Fast-forward the preview branch to this fix so the stable URL gets it (it is based on `preview/room213-walk`; not main):
   `git fetch origin && git push origin origin/claude/room213-viewer-oss-eval-ybh46o:preview/room213-walk`
2. `npx vercel env ls preview`: confirm `R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_ENDPOINT/R2_BUCKET` exist for **Preview**
   (if they are Production-only, the viewer shows "HTTP 500" and that is the whole story).
3. Pull the preview function logs for `/preview/room213/asset` (duration, bytes, errors):
   `npx vercel logs <preview-url>`.
4. Add the CORS rule above (Cloudflare dashboard → R2 → slate360-storage → CORS), then re-run
   `node scripts/ops/verify-digital-twin-r2-cors.mjs`.
5. Room 213 phone memory: if iPhone still reloads after direct delivery, test `?model=golden` against a splat-transform
   `-H 0/1` (fewer SH) PLY *as a diagnostic only*, and queue a SOG fidelity-gate run (§4).
6. Renderer A/B (§9.3) on `workers/modal/room213-detail-diag` (`spark/index.html`: add `focal` param; new PlayCanvas page).
