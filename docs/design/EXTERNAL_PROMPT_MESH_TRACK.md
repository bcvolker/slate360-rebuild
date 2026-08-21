# External Prompt — clean interior MESH from walking 360 video (BSD/MIT only)

Self-contained. Copy everything below the line. Written 2026-08-21.

---

ROLE: Principal reconstruction engineer. We need a concrete, buildable recipe for producing a
**clean interior mesh** from walking 360° video, using **only permissively-licensed OSS**
(BSD/MIT/Apache — **no GPL, no AGPL, no CC-BY-NC**; this runs inside a commercial SaaS worker,
so copyleft is disqualifying and OpenMVS/ODM are already banned for this reason).

# Context

A one-person construction-documentation company scans rooms and building exteriors for
contractors and delivers interactive web twins. Capture hardware: **Insta360 X4** (operator
walks with it on a selfie stick, held high or low), an **iPhone with LiDAR** (optional,
sold as an accuracy upcharge), and a **DJI Avata 360 drone** for high exterior work.

Current stack (all self-hosted): Modal GPU workers · COLMAP · nerfstudio splatfacto 1.1.5 ·
gsplat 1.4.0 · Open3D · numpy/scipy · `@playcanvas/splat-transform` · Cloudflare R2 ·
Supabase · a web viewer with orbit + walk navigation, share tokens, and a splat editor.

The existing pipeline unwraps 360 frames into perspective views (`ffmpeg v360`, rings at
pitch 0/±35°, 110°×94° FOV) and produces a **Gaussian splat**. Three independent audits just
concluded that the splat must NOT be the walkable building, and that we need a **mesh** layer
for: dollhouse view, floor plan, floor selector, walk collision, and measurement. A separate
COLMAP dense + Poisson path already exists in an exterior/photogrammetry worker (BSD).

Measured reality on one room (ASU classroom, ~41' × 30', 1,225 sq ft):
- **20 stationary 360 stills** → 320 views → PSNR 29.68 but geometrically worthless (the 16
  views per still share one optical centre — zero baseline, degenerate for triangulation).
- **Walking 360 video, same room** → 573/784 views registered, PSNR **20.97** — 8.7 dB LOWER,
  but measured anisotropy is far healthier (median axis ratio 4.48 vs 7.87).
- Best-ever result to date: **iPhone + LiDAR walking capture, PSNR 28.97, visually good.**

So: walking video gives real parallax; PSNR is anti-correlated with geometric quality on this
capture class; and we now need mesh, not just splat.

# What we need answered

## 1. The mesh recipe
Give a concrete, ordered pipeline from **walking 360 video → clean interior mesh**, naming
tools, key parameters, and expected failure modes at each step. Cover specifically:
- Whether to mesh from **COLMAP dense (patch_match_stereo + stereo_fusion)** or from
  another permissive MVS, and whether COLMAP's PatchMatch is even appropriate for
  360-derived perspective views with a moving camera.
- **Poisson vs Delaunay vs TSDF** for a room interior. Poisson tends to balloon closed
  surfaces around open doorways; Delaunay leaves holes. What actually works for a room?
- Whether to reconstruct from the **unwrapped perspective views** or to keep the
  equirectangular frames and use a spherical-aware method.
- Handling **textureless drywall, glossy floors, whiteboards, and windows** — the four
  surfaces that dominate a classroom and defeat photometric stereo.
- Whether **iPhone LiDAR** (when present) should drive a TSDF fusion instead, with the
  360 imagery used only for texture — and what the quality delta is.

## 2. Post-processing to "dollhouse quality"
What specific steps turn a raw MVS mesh into something a client can look at?
- Planar / Manhattan-world cleanup (wall snapping, right-angle regularisation) — name
  permissive implementations, not papers.
- Ceiling removal / roof cut for the dollhouse view, and how to detect the ceiling plane
  robustly when the capture is a single room vs a multi-room floor.
- Floor-plane detection and **per-floor segmentation** for a floor selector.
- Hole filling, island removal, decimation targets for a web viewer (we currently ship
  ~1.5M faces for exteriors; what's right for an interior room?).
- Texturing: what permissive texturing path (we currently have a `mesh_texturer` step) and
  how to avoid seams/ghosting from a moving 360 camera.

## 3. OPERATOR REMOVAL — hard requirement
The operator is **in the capture**, walking, holding the camera on a stick either **high
overhead or low near the floor**. He must not appear in the deliverable and must not leave
holes, smears, or ghost geometry.

We already do person-segmentation masking of the **training images** for the splat path
(currently YOLOv8-seg, which is AGPL and being replaced). Tell us:
- How operator masking must differ for a **mesh/MVS** path vs a splat path — masks in SfM,
  in dense stereo, in fusion, in texturing? At which stages must the mask be applied?
- Whether masking causes **holes in the floor directly beneath the operator**, and how to
  fill them (the operator occludes the floor he is standing on in every frame).
- Whether the pole/stick and the operator's hand/arm need separate treatment from the body.
- Whether a **low-held camera** (operator above the camera) is materially harder than
  **high-held** (operator below), and what the practical guidance should be.
- Permissively-licensed segmentation options (Apache/MIT/BSD) that match or beat YOLO-seg
  for person+held-object masking at 1600×1200. Name specific models/weights and their
  licences.
- Whether **inpainting** masked regions before reconstruction is a good idea or a trap.

## 4. Periodic stills
The operator can take **periodic 360 stills** during the walk (stopping briefly) in addition
to continuous video. Given that stills are sharper but stationary:
- Do sharp stills materially improve a mesh/MVS result, or only texture quality?
- What is the right ratio and spacing (e.g. one still every N metres) if they help?
- Should stills and video frames be mixed in one SfM solve, or should stills be used only
  for texture baking onto a video-derived mesh?
- Does the operator standing still for a still make his removal harder (he is stationary
  and consistent across the exposure) or easier?

## 5. The camera-rig question
Our 16 unwrapped views per 360 frame are currently solved as **16 independent 6-DOF
cameras**. An audit suggested constraining them as a **rig** (shared optical centre, known
relative rotations). Is that worth implementing in COLMAP, what is the actual mechanism
(`--ImageReader.*`, rig config, or a custom database write), and how much does it improve
the solve for walking video specifically (where real parallax already exists between frames)?

## 6. Deliverables from you
- A step-by-step pipeline with tool names, parameters, and licences.
- The operator-masking plan, stage by stage.
- Honest expected quality vs Matterport (which uses an active depth sensor per station).
- What to do when there is **no LiDAR** vs **with LiDAR**.
- Anything in the above that you think is wrong.

Be concrete and blunt. Prefer things that exist and are permissively licensed over
state-of-the-art papers with no usable implementation.
