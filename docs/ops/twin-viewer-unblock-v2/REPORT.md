# Twin viewer unblock v2

Job `79a4f0ac-32e9-4358-bda0-e1a7461510e1`. Preview: `/preview/twin-metric?job=79a4f0ac-32e9-4358-bda0-e1a7461510e1`

EXACT_FRAME_SIM3 was not changed. TSDF was not recomputed. X4 V2 was not used. `main` was not merged.

## Gaussian inventory

See `GAUSSIAN_INVENTORY.md`.

**Real V1 checkpoint: not recovered.** `06_gaussian.py` trained scale/quat/opacity in GPU RAM, then wrote xyzrgb only. `/home/rian_/route_b_x4` has images + COLMAP sparse + `gaussian.log`. No `.pt/.pth/.ckpt`.

V1 PLY properties: `x y z red green blue` (53,944 verts).

A real trained Gaussian **does** exist on the iPhone Route C path (`gsplat_out/MASTER_RAW.ply`, 1,049,505 primitives, full `opacity/scale_*/rot_*/f_dc_*/f_rest_*`). That is not Route B V1. Reality does not load it.

Recreation script prepared, not executed: `scripts/ops/recreate-x4-v1-gaussian.py` (dataset present; default refuses without `--execute`).

## GLB validator

Independent `inspect_glb` (magic `glTF`, version 2, JSON chunk + BIN chunk, **no data-URI buffer**):

| File | Bytes | JSON chunk | BIN chunk |
|---|---|---|---|
| `geometry.glb` / measurement | 103,477,204 | 972 | 103,476,204 |
| `geometry-display.glb` | 22,890,796 | 960 | 22,889,808 |
| `geometry-nav.glb` | 5,753,964 | 956 | 5,752,980 |

`npx @gltf-transform/cli inspect` could not run on this Windows host (sharp blocked by App Control). Open3D/ASSIMP data-URI failure is gone: JSON is ~1 KB, not the whole file.

Worker `metric_tsdf.py` now writes binary GLB via `glb_binary.py` and will never emit a data-URI container.

## Mesh derivatives (existing 15 mm mesh, no TSDF rerun)

Source: 3,316,842 tris, 13,343 components, largest 2,973,191 (89.6%).

| Product | Role | Tris | Components | Size |
|---|---|---|---|---|
| geometry-measurement.glb | measurement truth | 3,316,842 | 13,343 | 98.7 MB |
| geometry-display.glb | visible Geometry | 742,509 | 431 (largest 690,012) | 21.8 MB |
| geometry-nav.glb | collision only | 195,441 | **1** | 5.5 MB |

Display: drop tiny islands, Taubin, quadric to ~750k. Nav: largest component only, then simplify. Coordinates/scale preserved.

## Nav route

Inside uses a capsule against **geometry-nav.glb only**. WASD + drag look; tap-to-move; slide; 22 cm step; floor lock to the fitted plane; Reset → island.

Automated capture used station jumps (island → fridge → opening). **Mode-switch camera jump: 0.** Full WASD snag loop was not a recorded 30s walk; unit tests cover slide. No teleport stuck the camera.

## FPS / load (Playwright 1440×900, local)

| | |
|---|---|
| Page goto | **6.5 s** (display GLB cached in this run) |
| Geometry FPS | **56.3** |
| Reality FPS | n/a (asset unavailable, no fake splat) |
| Mode switch jump | **0** |
| Appearance overlay | present |

## Screenshots / recording

`docs/ops/twin-viewer-unblock-v2/screenshots/`

- 01-geometry-island.png — human-eye kitchen, fridge + cabinets + opening
- 02-geometry-fridge.png — fridge, arch, dining through opening
- 03-walk-through-arch.png — through the opening
- 08-mobile-inside.png — 390px Geometry
- twin-walkthrough-proof.webm

04–07 Reality/Hybrid **not captured** (no true V1 Gaussian).

## PASS / FAIL

**PARTIAL PASS** (Geometry + Nav). **FAIL Reality.**

| Gate | Result |
|---|---|
| Geometry recognizable as kitchen | **Pass** (noisy 15 mm, ceiling holes remain) |
| Geometry ≥30 FPS | **Pass** (~56) |
| Kitchen route no collision trap | **Partial** — capsule on 1-component nav mesh; capture used station jumps |
| Binary GLB validates | **Pass** (independent header/chunk inspect) |
| Preview does not hang on Loading mesh | **Pass** locally (6.5 s, staged loader) |
| Reality = true trained V1 attributes | **Fail** — checkpoint never serialized |
| Reality recognizable kitchen | **Fail** — overlay only |
| Reality ≥24 FPS | **Fail** — no splat loaded |
| Mode switch zero jump | **Pass** (0) |

## Remaining blocker

Route B V1 trained Gaussian **attributes were never written to disk**. Recreate with `scripts/ops/recreate-x4-v1-gaussian.py --execute` (exact V1 settings, save `.pt` + `export_splats`), then apply existing EXACT_FRAME_SIM3 to centers **and** anisotropic scale/rotation. Do not synthesize ellipsoids. Do not use V2 or Route C iPhone MASTER_RAW as V1.

Display mesh still shows 15 mm noise and ceiling voids. That is the TSDF, not the camera.
