# 360 video → Gaussian splat — change list

Two tracks. Do not mix licenses.

| Track | Where | Trainer | When |
|---|---|---|---|
| **A. Research** | Desktop 3090 + GGPS folder | PanoLOG / GGPS (non-commercial) | PhD, outdoor 360, method experiments |
| **B. Product** | Desktop Postshot (2D first) then Modal `twin-gaussian-splat` | **gsplat** (Apache) | Customer links, X4/X6 later |

360 **video playback** is not the product. The walkthrough is a **splat**. Operator is excluded at **train** time.

GGPS trains on **stills**. Video is only a capture container: stitch, then extract frames.

---

## Capture (both tracks)

1. X4 (or later X6) on a **pole above the head**, lenses L/R, slow loops, lock WB/exposure.
2. Indoor: 8K/30 if light allows; 5.7K/60 if dim. One 2–4 min loop, close the path.
3. Export in Insta360 Studio: **stitched equirect**. Direction/horizon lock **ON**. Tilt recovery **OFF**. Vibration reduction **OFF**.
4. Keep the raw `.insv` as evidence. Do not train on dual-fisheye.
5. **Stills vs video:** shoot video in the field (easier). Pipeline converts to stills at 1–2 fps (sharpness filter). Optional: also shoot 360 stills at corners. GGPS and product SfM both want a **set of ERP images with overlap**, not a movie file.

---

## A. Desktop research pipeline (GGPS)

Do this only on the 3090. Wrapper prompt: `docs/research/DESKTOP_GROK_GGPS_APP_PROMPT.md`.

| # | Item | Today | Change |
|---|---|---|---|
| A1 | Code on disk | Laptop OneDrive `Desktop\ggps` | Desktop: same OneDrive path, USB copy (`scripts/research/copy-ggps-to-usb.ps1`), or `git clone https://github.com/Insta360-Research-Team/GGPS.git` |
| A2 | GPU env | Not on laptop | NVIDIA driver, CUDA, conda `PanoLOG`, compile rasterizer for **sm_86** (3090). WSL2 Ubuntu recommended for their bash scripts |
| A3 | Drop UI | None | Desktop Grok builds `scripts/research/ggps-drop-app` (research wrapper, no GGPS source copied into git) |
| A4 | Video → stills | Manual | ffmpeg 1–2 fps + blur reject inside the drop app |
| A5 | SfM | GGPS expects **openMVG** already done | Drop app must run OpenMVG or spherical COLMAP and write `reconstruction/` |
| A6 | Depth / sky (DAP) | Optional in GGPS | v1: `SKIP_DAP=1`. v2: DAP + `make_depth_scale.py` for outdoor |
| A7 | Train | `train_large.py` camera_type 3 | Indoor: coarse only. Outdoor large: then partition `_c4` |
| A8 | Output | `point_cloud.ply` | Inspect locally. Do **not** auto-upload to production R2 |
| A9 | Isolation | — | No import from Next.js / Trigger / `twin-gaussian-splat` |

---

## B. Desktop **product** pipeline (L0 then L1)

L0 is 2D (iPhone) + Postshot — `docs/design/LOCAL_SPLAT_PIPELINE.md`. Do that before 360 product work.

| # | Item | Today | Change |
|---|---|---|---|
| B1 | 2D hero | Not scripted on desktop until L0 ingest | Postshot → `.spz` → `scripts/local-splat/ingest-splat.mjs` |
| B2 | 360 in Postshot | Postshot is pinhole | Either feed **rig-locked** perspective frames, or skip Postshot for 360 and use a gsplat ERP trainer you write |
| B3 | Frame extract | None on desktop | Same ffmpeg stills as A4, but destination is product `images/` not GGPS |
| B4 | `.env.local` | Laptop only | Copy to desktop clone (never git) |
| B5 | Share link | Studio on Vercel | Ingest SPZ to R2 + `digital_twin_models`; phone QA |

---

## C. Cloud processing pipeline (Modal + Trigger) — product 360 splat

File of record: `workers/modal/twin-gaussian-splat/worker.py` + `equirect_frames.py` + `src/trigger/twin-gaussian-splat.ts`.

| # | Stage | Today | Change to get 360 **video** → splat |
|---|---|---|---|
| C1 | Ingest | Accepts images; equirect detected by 2:1 ratio | Add explicit `mediaKind=equirect_video`. Transcode `.insv` is **out of scope** on Modal (too heavy / Studio-specific). Require **pre-stitched equirect MP4 or stills** in R2 |
| C2 | Decode video | `EQUIRECT_VIDEO_FPS = 0.5` then v360 pinhole crops | Keep temporal sample 0.5–2 fps **as ERP stills**. Do not crop to pinhole as the *training* representation |
| C3 | Unwrap | `ffmpeg v360` rings (~8 video views) or 6 cube faces | **Stop** using those as independent COLMAP cameras. Replace with (pick one): (1) full ERP frames + spherical camera model in **gsplat**, or (2) cube/icosahedron faces with a **hard rig constraint** (one pose per timestamp) |
| C4 | COLMAP | `ns-process-data images` + `camera_model: OPENCV` | Spherical SfM or rig-constrained pycolmap. Inject IMU/gravity from `telemetry-parser` when `.insv` sidecar exists (`pose_priors.py` already has an unused prior path) |
| C5 | Camera opt | Metric profiles freeze cameras (`off`) | Keep frozen on 360. Do not enable `SO3xR3` on equirect jobs (collapse risk) |
| C6 | Trainer | `ns-train splatfacto` pinhole | Stay on **gsplat** (Apache). Add an equirect / lonlat camera model **you implement**, or train on rig pinholes. **Do not** link OmniGS / GGPS CUDA |
| C7 | Loss | Standard L1/SSIM on pinholes | If ERP: **latitude / solid-angle weights**. Independent math; do not copy GGPS `ssim_erp_weighted` |
| C8 | Operator | YOLO masks on pinhole views | Run person seg on ERP or on unwrapped views; inject `mask_path` into transforms. Prefer permissive weights if this ships. Camera above head still required |
| C9 | Nadir | Cube path often drops `down` | Keep floor: either ERP (has nadir) or a masked-but-present down face |
| C10 | Depth | `depth_evidence.py` exists | Optional; if used, **scale-align** to SfM before the loss |
| C11 | Sky sphere | None | Outdoor 360 only: far-sphere Gaussians + sky mask. Skip indoors |
| C12 | Partition | None | Rooms: single splat. Campus/site: later, frustum-free block assign (SSIM-drop test) on **gsplat** renders — do not port `data_partition.py` |
| C13 | Export | PLY → SPZ for Spark viewer | Unchanged. Viewer is `.spz` only |
| C14 | Trigger env | `syncEnvVars` from `.env.local` at **deploy** | After any Modal endpoint change, **redeploy Trigger**. `MODAL_SPATIAL_WALKTHROUGH_ENDPOINT` missing locally is a different task |
| C15 | Isolation | ODGS already split | GGPS never imported here. Research Modal app only if you later want PhD jobs in the cloud (separate app name, like `slate360-phd-odgs-slam`) |
| C16 | QA gate | Coverage / explosion heuristics | Add: interior camera (not orbit), non-spherical AABB vs LiDAR diagonal, no graphite-only canvas. Fail closed to Geometry/mesh if Reality is empty |

---

## Order of work

1. Desktop L0 (2D Postshot → share) — sellable link  
2. Desktop GGPS drop app — PhD 360 stills/video-as-stills  
3. Cloud C2–C8 — product 360 splat on gsplat, no GGPS code  
4. Cloud C10–C12 — outdoor extras  
5. User-facing cloud upload of 360 video — only after Brian’s local 360 splat looks like money  

---

## Explicit non-goals

- Playing the 360 recording as the client walkthrough  
- Fusing LiDAR + 360 before each path works alone  
- Shipping GGPS, Inria rasterizer, or YOLO-as-AGPL inside the SaaS  
- Buying X6/Luna before L0 is proven  
