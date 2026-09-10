# Slate360 Twin 360 — where we are, what is in the way, and what we are asking for (2026-09-10)

Copy everything below the line into any AI assistant. It is written to stand alone; assistants
with access to the repository can additionally read `docs/design/TWIN360_MOBILE_REDESIGN.md`,
`docs/design/TWIN360_QUALITY_PANEL_PROMPT_2026-09-09.md`, `docs/research/CAPTURE_STUDIO.md`, and the
memory notes under the operator's Claude project. Please answer the numbered asks at the end
with specifics: tools, repositories, settings, numbers, and the reasoning behind each.

---

## 1. Who is asking and why it matters

Brian Volker is a solo founder (construction background, not a programmer) building Slate360, a
field-documentation platform for contractors. The near-term business: Brian personally walks
construction projects and delivers a browser-based, navigable, measurable digital twin that a
project manager can open from a link on a phone or in a Zoom call, drop pins and documents into,
and re-walk next month for progress. First pilot target: a university facilities/construction
group. Longer term: stadiums, arenas, businesses ("journeys"), and finally self-serve, where
customers buy the recommended equipment and walk their own projects. Monetization has to start
soon; this is not a research project. The competitors he is measured against are Matterport
(Pro3 LiDAR camera + cloud, ~$10k+ per year at scale) and Multivista (crews, photo documentation).
We must beat them on time-to-share, remote collaboration, price, and the ability to recapture.

Everything must stay free / open source, run locally on Brian's desktop (Windows 11, RTX 3090
24 GB, WSL Ubuntu 22.04, ~900 GB free) with a cloud-worker version later, and use only equipment
Brian owns: iPhone Pro (LiDAR, iOS 16+), Insta360 X4, DJI Mavic 3 Enterprise RTK and a 360 drone.
Possible small purchases: a phone gimbal, an X6 for low light. No more accounts or SaaS.

## 2. What exists today (all of it built in the last ~10 days, most of it in the last 48 hours)

### Phone capture app (Swift, ARKit, inside a Capacitor shell; TestFlight build 70)
- Photos mode: a still every 1 s (0.5/2/3 s selectable) at the sensor's full 12 MP
  (`ARSession.captureHighResolutionFrame`), with a per-still ARKit pose. Video mode records
  1920×1440 clips with pose keyframes. Live camera is 1× wide, locked.
- Exposure controls: AE/WB lock, and a shutter chip cycling AUTO → 1/120 → 1/250 → 1/500 (ISO
  compensates). Both persist across launches and are recorded in the capture manifest.
- LiDAR: raw `sceneDepth` (not the smoothed map), every second depth pixel, returns inside 5 m,
  real RGB per point sampled from the camera frame, 2 cm voxels, cap 3 M points; when the cap is
  reached the grid is re-binned at 1.5× the pitch instead of dropping points. Raw depth frames +
  confidence are also stored as evidence.
- Output per walk: photos (or clips), `lidar_capture.ply`, `lidar_poses.json` (v6: per-photo
  poses/intrinsics), `lidar_depth.s360depth`, `capture_bundle.json` (counts, settings, build).
  A 250-photo walk is ~1.1 GB.
- Upload: background URLSession, 4 parallel single-part uploads to Cloudflare R2 through
  presigned URLs; resumes on every foreground; the capture is moved into the app's Documents
  folder first, so it survives reinstalls and can be copied over USB (Apple Devices / Finder).
- Screens (rebuilt this week): Home = Scan · Continue · project cards with posters; New scan
  sheet (project defaults to last used, name prefilled); Project twins (rows by day, Saved/Ready
  filter, rename/move/delete); Saved twin = receipt (photos, clips, LiDAR points, poses, depth
  frames, duration, settings), "Copy capture ID", Scan again. No cloud-processing button on the
  phone by decision: the desktop builds and publishes back.

### Desktop "Capture Studio" (PowerShell WinForms UI + engine; free tools only)
Modes: Phone capture (paste capture ID → pulls photos+LiDAR+poses from the cloud, or drop the
USB-copied folder), 360 camera (raw .insv unwrapped with ffmpeg v360, or a stitched 8K equirect),
Photos or video. Stages, all automatic:
1. extract stills (ffmpeg; optional gamma for dark footage) → sharpness filter (Laplacian)
2. cameras: pycolmap SfM. 2D = one shared pinhole, sequential matching. 360 = each equirect is
   rendered into 4 side faces at 110° FOV, 2048 px, solved as a COLMAP rig (shared centre,
   fixed rotations). Gate: fail < 70 % registered, warn < 90 % or > 0.8 px.
3. train: Brush 0.3 (Rust/wgpu 3DGS) 30 000 steps, `--max-resolution 2560`, SH degree 3.
4. walk: metric alignment. With ARKit poses: robust Umeyama SIM3 COLMAP→ARKit (median residual
   5 cm on the kitchen), stations from the phone's path, floor from the LiDAR cloud. Without:
   data-driven up/floor from the camera path, stations every 0.7 m, ceiling lid at +2.2 m.
5. mesh: LiDAR cloud → Open3D Poisson → GLB (400 k faces) for measuring, plan and dollhouse.
6. pack: SPZ v3 (8-bit SH) of the FULL model, plus an 800 k-splat SH0 phone derivative.
7. publish: uploads the SPZ + sidecars (manifest, walk stations/floors, mesh, phone variant) into
   the phone's twin and mints a share link.

### Web viewer (Next.js on Vercel, Spark 2.1 Gaussian renderer in React Three Fiber)
Matterport-style: Inside (click the floor to walk, drag to look, ↑↓ 0.5 m steps, Shift+↑ next
station, Ctrl+↑ 15 cm nudge, scroll zoom), Dollhouse and Plan with a ceiling lid, Reality /
Hybrid / Geometry layers, Measure and Pins raycast on the LiDAR mesh (verified: 2.065 m on a
wall). Loads on desktop and phones (phones get the 800 k derivative). Source caps 2.5 M / 1 M
splats; Spark LOD carries frame rate.

### Cloud (existing, being demoted): Vercel + Supabase + R2, Trigger.dev → Modal GPU worker for the
older video-only pipeline. It stays for later parity; the desktop path is the quality path.

## 3. Results so far, with numbers

| Capture | Registration | Model | Held-out PSNR | Verdict |
|---|---|---|---|---|
| Kitchen, iPhone stills 1 s, 1920×1440 (Sep 8) | 183/189, 0.98 px | Brush 30k, 1.75 M splats | **29.8 dB** | Photo-real at the camera path; smears from viewpoints the camera never occupied; floaters outside the rooms |
| Same room, iPhone fast-shutter video | 64.6 %, 5 fragments | rejected by the gate | — | Stills beat video |
| Kitchen, Insta360 X4 8K, hand-held, 1/500 (Sep 9) | **572/572 faces, 1.05 px** | 613 k splats | **32.0 dB** | First 360 to pass; dark and noisy (ISO maxed), operator in frame |
| Classroom (AOB 205), X4 5.7K "low-pass" export, 4 faces at 1600 px | 48 % | fog | ~13 dB | Wrong export, wrong faces — fixed above |
| gsplat trainer A/B on the kitchen solve: AbsGrad / MCMC | same cameras | 1.9 M / 1.5 M | 25.7 / 26.6 dB | Brush kept |

The decisive finding of this week: the "blurry twin" everyone saw was mostly our own doing. The
publish step thinned 1.75 M → 800 k (−3.9 dB) and the viewer then downsampled to 500 k on desktop
/ 150 k on phones (250 k phone file: 20.4 dB). Removing those caps changed more than any training
change. What remains is capture physics: input resolution (now 12 MP), viewpoints (one lap at
one height), light (360 at 1/500 indoors), and floaters.

Losses this week worth knowing: a 250-photo walk was lost because a TestFlight install purged the
phone's temp folder mid-upload (fixed: captures now live in Documents); upload speed is bounded by
the home uplink (~0.2 MB/s, ~1 h per walk), hence the USB path.

## 4. What is in the way (ranked)

1. **Off-path smear and floaters.** The splat is sharp where the camera stood and melts a metre
   away; floaters outside the walked rooms ruin Dollhouse/Plan. We have LiDAR depth maps and poses
   for every still and have NOT yet used them in training or pruning. Every generic prune rule we
   tried (opacity, scale, statistical outlier, visibility count, camera-path crop) deleted real
   walls on these models.
2. **Clean overhead views.** Matterport's Dollhouse/Plan look clean because they come from a
   mesh. Ours are drawn from the splat. Plan: draw Dollhouse/Plan from the coloured LiDAR mesh and
   keep the splat for Inside.
3. **360 quality.** Registration is solved (100 %); light and operator-in-frame are not. Pole
   above head, 1/120–1/200, lights on. An X6 would help low light. Unknown: best trainer/camera
   model for equirect input (we render pinhole faces; gsplat now has 3DGUT for fisheye/rolling
   shutter).
4. **Upload logistics.** 1 GB per walk over residential uplinks. USB is the interim; a cloud
   worker later will not fix the uplink.
5. **Stairs / multiple floors / exteriors** are untested. The walk sidecar clusters floors by
   camera height; drones cover roofs; nothing yet joins them.
6. **Product surface.** The phone still opens into a generic platform shell; the twin screens
   are rebuilt but the shell, marketing pages, onboarding, billing and share/pins UX around them
   are not. The pilot cannot start until a contractor can go from link to pin to PDF without help.
7. **Money and time.** One person, no runway. Every month of polish without a paying pilot is a
   month too many.

## 5. The plan as it stands

- Capture SOP (phone): Photos, 1 s, 1/250 indoors (1/500 outdoors), AE lock, all lights on, two
  laps (chest and hip), a metre from surfaces, wide arcs at corners. 360 camera on a pole above
  the head for coverage of large rooms, aligned to the phone walk afterwards, never mixed into one
  training run.
- Training: depth-supervised 3DGS using our ARKit depth maps (candidates: DN-Splatter,
  gsplat with depth loss, 2DGS-Room / GaussianRoom-style geometric priors, LiDAR-guided methods).
  Floater removal by distance to the LiDAR mesh instead of statistics. Evaluate with held-out PSNR
  plus visual checks at off-path stations.
- Viewer: mesh-based Dollhouse/Plan; measurements and pins on the mesh; walkthrough from the
  splat; fine navigation already added.
- Product: strip the phone to Scan → Saved → Ready → Share; desktop studio one-click (done);
  share viewer with pins, documents, PDF export, progress compare; then pricing (per project /
  per walk), then the pilot.
- Cloud parity later: the desktop engine becomes the worker image.

## 6. What we are asking you

1. **Criticise the plan.** Where is it wrong, naive, or ordered badly for a solo founder who has
   to invoice within weeks? What would you cut?
2. **Off-path sharpness and floaters, concretely.** Given per-still ARKit poses, 12 MP stills,
   dense LiDAR depth maps and a metric mesh, what is the highest-leverage open-source method (with
   repository links and the exact flags) to (a) supervise geometry so views 1 m off the path stay
   sharp, and (b) remove floaters without deleting walls? Rank by expected gain on interiors and by
   effort on one RTX 3090 under WSL.
3. **Is there a fundamentally better representation for this product?** Compare 3DGS with mesh
   texturing from panoramas (what Matterport does), 2DGS/surfels, SuGaR-style mesh extraction,
   and hybrid "mesh for geometry + splat for looks". For a contractor's walkthrough with
   measurements, which delivers Matterport-like cleanliness soonest?
4. **360 pipeline.** For Insta360 X4/X6 walks: best trainer and camera model for equirect input
   today (native spherical in COLMAP 4.1, 3DGUT fisheye, per-lens fisheye without stitching),
   and the capture protocol that makes a single pole walk sellable.
5. **Capture kit.** Cheapest set of purchases that materially improves results (gimbal? X6?
   lights? a second phone at hip height?), and what to skip.
6. **Multi-level and exterior.** A practical method to join stairs/floors and drone exteriors
   into one twin without survey gear.
7. **Upload logistics.** Better field-to-desktop transfer than USB + residential Wi‑Fi for
   1–3 GB per walk; anything that avoids the phone holding the only copy.
8. **Go-to-market.** Given the above, define the minimum sellable deliverable for a university
   construction group pilot (what a PM actually clicks), a pricing model that undercuts Matterport
   without racing to zero, and the first three sales conversations Brian should have this month.
9. **Anything we are missing** — recent (2025–2026) papers, tools, or products that change this
   picture. Please cite.

Please be blunt. Vague encouragement is not useful; specific, testable recommendations are.
