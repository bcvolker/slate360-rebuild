# Twin 360 — laptop session brief (2026-09-10)

Paste this whole file as the first message of the laptop Claude session. It says what the desktop
session owns, what the laptop session may work on, and the state of everything so far.

---

## 0. Two sessions, one repo — the rules

There are two Claude Code sessions on the same GitHub repo (`bcvolker/slate360-rebuild`, branch
`main` deploys to www.slate360.ai, which the iPhone app loads live).

**The desktop session (Windows, RTX 3090, WSL) owns and is the only session allowed to touch:**
- `C:\s360-studio` (branch `feat/capture-studio`): the Capture Studio engine and UI —
  `scripts/local-splat/**` (run-job.ps1, sfm.py, clean_ply.py, align_arkit.py, lidar_mesh.py,
  walk_from_colmap.py, pack_spz.py, ingest-splat.mjs, pull-capture.mjs).
- The 3D viewer internals: `components/digital-twin/MeshTwinViewer.tsx`, `MeshSplatLayer.tsx`,
  `mesh-body.tsx`, `walkthrough-rig.tsx`, `walk-floor-plane.tsx`, `splat-viewer-constants.ts`,
  `use-viewer-gestures.ts`, `hooks/useWalkthroughNavigation.ts`, `hooks/useWalkthroughKeys.ts`,
  `hooks/useSplatBytes.ts`, `lib/digital-twin/walkthrough-*.ts`, `lib/digital-twin/splat-*.ts`,
  `lib/digital-twin/twin-manifest.ts`, `lib/digital-twin/share-walk*.ts`.
- The iPhone capture plugin: `ios/App/App/Plugins/LiDARCapture/**`, `ios/App/App/Info.plist`,
  `capacitor.config.ts`.
- All processing (Brush, COLMAP, meshes), all publishing to R2, and all Codemagic / TestFlight builds.

**The laptop session must never:** run Capture Studio jobs, trigger Codemagic builds, upload models,
edit the paths above, run `git push` to `main` directly, or run cloud processing (Modal / Trigger).
It works on a branch `feat/laptop-<topic>`, rebases on `origin/main` before every push, and opens a
PR. The desktop session merges. If a task needs a desktop-owned file, the laptop writes the request
into `docs/design/LAPTOP_REQUESTS.md` instead of editing.

Gates before every laptop push: scoped typecheck (temp tsconfig that `extends ./tsconfig.json`,
`incremental: false`, includes only the touched globs — a bare `tsc` OOM-crashes),
`npm run guard:architecture`, `npm run guard:file-size-regression` (new files < 300 lines),
`npm run guard:design` (no hex colours; tokens only), and `vitest` for touched pure modules.

## 1. What Slate360 Twin 360 is, and what was built (2026-09-08 → 09-10)

Slate360 is a construction field-documentation platform; Twin 360 turns a phone or 360-camera walk
into a navigable, measurable browser twin (Matterport-style) that a project manager opens from a
link. Brian is a solo founder; the pilot target is a university construction group; everything
must be free / open source and processed on the desktop.

### Phone app (Swift/ARKit inside Capacitor; TestFlight builds 63 → 70 this week)
- Photos mode: a 12 MP still every 1 s (0.5/2/3 s selectable) with a per-still ARKit pose; AE/WB
  lock; shutter chip AUTO → 1/120 → 1/250 → 1/500; settings persisted and recorded.
- LiDAR: raw depth, colour per point, 2 cm voxels, 3 M cap that re-bins at 3 cm when hit, plus raw
  depth frames as evidence. Photos mode records LiDAR (it did not before).
- Saves: the capture is moved to the app's Documents/Captures folder before upload (survives
  reinstalls, visible over USB via the Apple Devices app and in the Files app). Uploads resume on
  every foreground. A 250-photo walk is ~1.1 GB; a home uplink moves it at ~0.2 MB/s, so USB is
  the fast path.
- The native shell now opens on the app home (`/app`), not the marketing site; it tags its user
  agent `Slate360App`.
- Twin screens rebuilt (`docs/design/TWIN360_MOBILE_REDESIGN.md`): Home = Scan · Continue ·
  project cards with posters; New scan sheet (project defaults to last used, name prefilled,
  creates the twin then launches capture into it); Project twins (rows by day, Saved/Ready filter,
  rename/move/delete); Saved twin = receipt (photos, clips, LiDAR points, poses, depth frames,
  duration, settings), Copy capture ID, Scan again, auto-refresh while uploading. Decision: no
  cloud-processing button on the phone; the desktop builds and publishes back.
- Backend for those screens: capture receipt written at upload-complete
  (`digital_twin_captures.capture_metadata.summary`), poster per twin
  (`/api/digital-twin/spaces/[id]/poster`), rename/delete route, 24 h cleanup of abandoned
  drafts, backfill endpoint.

### Desktop Capture Studio (PowerShell UI + engine, all free tools)
Modes: Phone capture (paste capture ID or drop the USB-copied folder), 360 camera (raw .insv
unwrapped with ffmpeg, or a stitched 8K equirect), Photos or video. Stages, automatic: extract
(optional brighten) → sharpness filter → pycolmap SfM (2D: shared pinhole; 360: 4 faces at 110°,
2048 px, as a rig; gate fail < 70 %) → Brush 0.3, 30k steps at 2560 px → metric alignment
(Umeyama SIM3 to ARKit, ~5–6 cm) or camera-path walk → LiDAR Poisson mesh (GLB) → prune floaters
by distance to the mesh (never within 12 cm of it) → pack SPZ (full model, never thinned) + 800k
SH0 phone file → publish into the phone's twin with all sidecars → share link.

### Web viewer (Next.js on Vercel; Spark 2.1 Gaussian renderer)
Inside (click the floor, drag to look, ↑↓ 0.5 m, Shift+↑ next station, Ctrl+↑ 15 cm nudge),
Dollhouse and Plan now drawn from the coloured LiDAR mesh (north-up), Reality / Hybrid / Geometry
layers, Measure and Pins on the mesh (verified 2.065 m), WebGL gate for software renderers, phones
get the small file at DPR 1. Source caps 2.5 M / 1 M splats; Spark LOD carries frame rate.

## 2. Results so far (numbers)

| Capture | Registration | Model | Held-out PSNR | Link |
|---|---|---|---|---|
| Kitchen, iPhone stills at 1920×1440, one lap (Sep 8) | 183/189, 0.98 px | 1.75 M splats | 29.8 dB | /share/twin/vjBRRORnHFflyz5sOgxNT0lyEv1Cd_jO |
| Kitchen, iPhone 12 MP, two laps, 1/500 (Sep 9) | 261/272 | 2.27 M → 2.01 M after prune | 26.1 dB at 4032 px (not comparable to the 1920 px number) | /share/twin/AD7Sdiy9MBWk0TmKX05I5zs9YiiK46Ut |
| Kitchen, Insta360 X4 8K, hand-held, 1/500 (Sep 9) | 572/572, 1.05 px | 613 k | 32.0 dB | /share/twin/oLuPPUPKXzOfhOclApkXo7ekudbSqgBM |

Key measured facts: the "blurry twin" was mostly self-inflicted (publish thinning −3.9 dB, viewer
downsample to 500k/150k, phones served 250k = 20.4 dB) and is fixed; gsplat AbsGrad/MCMC lost to
Brush by 3 dB on the same solve; stills beat video (96.8 % vs 64.6 % registration).

## 3. What is still not right (the screenshots from 2026-09-10, 00:30)

1. **Veils near the camera.** At many stations the left/right edges of the Inside view are filled
   with translucent smears. They survive the mesh-distance prune because their centres sit within
   35 cm of a real surface; the near-camera rule caught only 104 of them. Root cause: one-height,
   one-direction observations of surfaces the operator passed at arm's length. Fix under way on the
   desktop: depth-supervised training with the ARKit depth maps, and a prune by camera-ray
   consistency (a splat that occludes the LiDAR surface from the training cameras is a veil).
2. **Off-path smear.** Fridge face, the dining archway, anything seen from where no photo was taken.
   Same fix, plus capture coverage (second lap must hug surfaces at 0.5–1 m).
3. **LiDAR mesh is lumpy and partial.** Poisson on a 1.5 M-point cloud gives thick, bulbous walls
   and holes where LiDAR never got within 5 m. Fix: TSDF fusion from the raw depth frames instead of
   Poisson on the cloud, plus walking the far walls closer. Dollhouse/Plan will look like Matterport
   only when the mesh does.
4. **360 walk is dark and the operator is in frame.** Light and pole position, not the solver.
5. **Upload speed / reliability.** Bounded by the home uplink; USB path exists from build 70.
6. **Phone shell around the twin screens** is still the generic platform (Site Walk / 360 Tours /
   quick actions / portal card). See §4.

## 4. Laptop session task list (non-interfering, in priority order)

Each task lists the files it may touch. Stay inside them.

1. **Strip the phone shell to the twin.** `app/(mobile)/**` (except `app/(mobile)/digital-twin/**`),
   `components/mobile-system/**`, `components/studio-ui/StudioAppShell.tsx`, `app/digital-twin/layout.tsx`.
   Goal: after login the app lands on Twin 360 Home; remove the "Your apps" chooser, "360 Tours ready
   when you are", quick actions, and the SlateDrop portal card from the phone; keep a way to reach
   Projects, SlateDrop and Account from the bottom bar. Single-operator product for now.
   Acceptance: fresh login on a phone → Twin Home in ≤ 2 taps; no marketing copy anywhere in the shell.
2. **Share sheet on the twin.** New `components/digital-twin/twin/TwinShareSheet.tsx` and a client
   helper; server: `app/api/digital-twin/spaces/[spaceId]/share-tokens/route.ts` (exists — extend,
   do not replace). Link with role (view / annotate), expiry, copy, QR. Wire into the Saved/Ready
   twin screens via a new button; do not touch the viewer.
3. **Share viewer chrome, not the 3D.** `components/digital-twin/TwinShareViewer.tsx`,
   `TwinShareWalkthrough.tsx` (props only), `WebglGate.tsx`, `WalkthroughControls.tsx`:
   the first-visit hint ("Drag to look · tap a ring to walk", auto-dismiss after the first gesture,
   remembered per token), the hardware-acceleration message copy, idle-fade of the bottom bar, a
   single 44 px bottom bar on phones that never covers the floor. Do not change camera maths,
   layers, or the splat/mesh components.
4. **Pins and documents.** `components/digital-twin/hybrid/**`, `hooks/useHybridPinTool.ts`,
   `app/api/digital-twin/pins/**`: a pin can carry a note, a photo, and a PDF from SlateDrop; the
   share viewer lists pins in a side panel; export a one-page PDF of pins with the poster. The
   viewer's raycast stays as is.
5. **Pricing and pilot pages.** `app/(public)/**`, `app/(dashboard)/**` copy: replace the marketing
   home with the real product (walk → link → pins → measure → recapture), a pricing page (per
   project / per walk, undercut Matterport), and a one-page pilot brief for a university
   construction group. No new SaaS, no Stripe changes (forbidden zone).
6. **Desktop Twin Studio index.** `components/dashboard-desktop/TwinStudioIndexContent.tsx`,
   `DashboardTwinsContent.tsx`: project → twins → open link / share / download SPZ, using the same
   hub loader and states as the phone.
7. **Tests only, no code:** `edge-case-hunter` style tests for `lib/twin/capture-summary-pure.ts`,
   `lib/digital-twin/twin-hub-state.ts`, and the spaces PATCH/DELETE routes.

Not for the laptop: anything in §0's desktop list, anything under `workers/**`, `src/trigger/**`,
entitlements/billing/middleware/migrations (forbidden zones for everyone).

## 5. Desktop session plan (so the laptop knows what is coming)

1. Depth-supervised training on the 0910 kitchen (ARKit depth maps + poses already on disk).
2. TSDF mesh from raw depth frames replacing Poisson; cleaner Dollhouse/Plan; measure stays.
3. Veil prune by ray consistency against the mesh.
4. Re-walk protocol: second lap 0.5–1 m from every wall, 1/250, lights on; X4 on a pole at
   1/120–1/200 for coverage, aligned to the phone walk.
5. Phone live warnings (stride, blur, exposure clip, wall distance, coverage) in a later build.

Contact points: the desktop session writes progress into `docs/design/TWIN360_STATE_AND_ASK_2026-09-10.md`
and the memory notes; the laptop session appends requests to `docs/design/LAPTOP_REQUESTS.md`.
