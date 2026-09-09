# Twin 360 — quality panel prompt (2026-09-09)

Copy everything below the line into ChatGPT / Gemini / Grok / Perplexity. It is self-contained.
Paste the answers back into the chat that produced this file; they get folded into the
Capture Studio engine and the phone app.

---

## Who we are and what we are building

Slate360 is a construction field-documentation platform. Contractors walk a job site with an
iPhone Pro (LiDAR) or an Insta360 X4 360° camera, and we turn each walk into a navigable
Gaussian-splat digital twin (Matterport-style: inside view, dollhouse, floor plan, click-to-walk,
measurements on a LiDAR mesh) that opens in any browser and on phones. Processing runs on our own
desktop (Windows 11, RTX 3090 24 GB, WSL Ubuntu 22.04) today and must move to a cloud GPU worker
with identical code later. Everything must be free / open source; no new SaaS accounts.

## Our pipeline today (works end to end, quality is the problem)

1. Capture app (Swift, ARKit): stills every 1 s (auto exposure locked, optional fixed shutter
   1/120–1/500 s, ISO compensates), or video clips at 1920×1440 30 fps. ARKit poses are recorded
   per still / per keyframe, plus a LiDAR point cloud (2 cm voxels, now capped at 3 M points) and
   raw depth maps. **Until today stills were saved at ARKit's live 1920×1440; the next build
   requests 12 MP (4032×3024) frames via `captureHighResolutionFrame`.**
2. SfM: pycolmap (SIFT, exhaustive/sequential matching), pinhole cameras. Gate: fail if < 70 %
   of images register. Kitchen walk: 183 / 189 stills registered, 0.98 px mean reprojection
   error, 55 901 points. The fast-shutter *video* pass of the same room registered only 64.6 %
   and split into 5 sub-models.
3. Training: Brush 0.3 (Rust/wgpu 3DGS trainer) 30 000 steps, `--max-resolution 1920`,
   SH degree 3 → 1 750 885 splats in 19.8 min.
4. Metric alignment: robust Umeyama SIM3 from COLMAP camera centres to the ARKit poses
   (median residual 5 cm). LiDAR cloud → Poisson mesh (Open3D) → GLB for measuring.
5. Packing: SPZ v3 (8-bit SH), plus a 250 k-splat SH0 derivative for phones. Viewer is
   Spark (three.js Gaussian renderer) in React.
6. Cleanup: we tried opacity cuts, scale cuts, statistical outlier removal, floor/ceiling clip,
   camera-path crop. **Every rule removed real wall/ceiling surface** on these models, so cleanup
   is currently off except a ceiling "lid" plane for the dollhouse view.

## What the results look like

- Standing at a capture position, surfaces the camera saw from ≥ 1 m look good (cabinets,
  ceiling, appliances). Anything the camera passed within ~0.5 m of (fridge front, counters)
  is smeared. Areas visited briefly (dining room seen from the kitchen doorway) are blurry.
- Outside the walked rooms there is a shell of milky floaters that ruins the dollhouse view.
- The model is heavy (77 MB SPZ, 1.75 M splats); phones need the thinned derivative.

## What we need from you

Answer each numbered item concretely. Prefer specific tools, papers and settings over
generalities. Assume we can run anything that builds on Linux + CUDA.

1. **Diagnose the smear / haze.** Given 189 stills at 1 s while walking, 1920×1440 (soon
   12 MP), 30 k steps in Brush at 1920 max resolution: what are the most likely causes, in
   order? (Candidates we suspect: input resolution, too few views of near surfaces, motion blur,
   rolling shutter, auto densification limits, no depth supervision, exposure differences.)
   What would you change first?

2. **Open-source trainers that use our LiDAR depth.** We have per-still ARKit poses, a metric
   LiDAR point cloud and raw depth maps. Which free trainers can take COLMAP + depth (or point
   cloud) supervision and produce a standard 3DGS PLY? Please rank by expected quality gain for
   interiors and by practicality on one RTX 3090 in WSL, and give the exact CLI flags or config
   for each: e.g. gsplat / Nerfstudio splatfacto with depth loss, DN-Splatter, 3DGS-MCMC, Taming
   3DGS, Gaussian Opacity Fields, 2DGS, Scaffold-GS, OpenSplat, Brush. Include anything newer
   (2025–2026) that we should know about. Which of them export a PLY we can convert to SPZ?

3. **Floater / haze removal that does not eat walls.** What works in practice for interiors:
   pruning by visibility count, by depth agreement with the LiDAR mesh, by "solid-angle"
   contribution, MCMC-style relocation, training-time floater losses? Give the method and the
   thresholds you would start with.

4. **Video capture that matches stills.** Our stills pass registered 96.8 %; the video pass of
   the same room registered 64.6 %. What frame-selection (sharpness / Laplacian variance,
   optical-flow spacing), exposure, shutter and codec settings make phone video usable for SfM
   + 3DGS? Which deblur-aware trainers (Deblur-GS, BAD-Gaussians, others) are worth it?

5. **360° camera pipeline.** For Insta360 X4 video / photos (equirectangular 8K): should we
   split into cube faces (we use 4–6 faces at 110° FOV) or use a spherical camera model (OpenSfM
   spherical, COLMAP with fisheye per lens)? Which trainers accept panoramas directly (OmniGS,
   ODGS, 360-GS, others)? What resolution per face and how many faces? How do we get metric
   scale without LiDAR (known height, markers, phone LiDAR walk in parallel)?

6. **Capture protocol for job sites.** Walking speed, distance from walls, overlap, loop
   closure, camera height variation, lighting, when to use a gimbal, when to use a 360 camera vs
   phone, using both at once (rig), drones for exteriors. Give a checklist a contractor can
   follow that maximizes 3DGS quality.

7. **Anything wrong with our numbers?** 1 s stills cadence, 2 cm voxels, 3 M point cap, 30 k
   steps, SH3 at 8-bit, 250 k splats for phones, 1 m "corridor" around the walked path for free
   movement in the viewer.

Please be specific and cite the repositories (GitHub URLs) you recommend.
