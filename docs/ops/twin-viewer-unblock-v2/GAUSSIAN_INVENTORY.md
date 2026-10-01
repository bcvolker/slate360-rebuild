# Gaussian asset inventory — KitchenAprilTags

Search date: 2026-08-31. No V1 checkpoint recovered.

## Route B V1 (X4 independent) — NOT a renderable Gaussian

Path: `.../Runs/2026-08-31T16-46-route-b-x4-independent/`

Trainer: `06_gaussian.py` (gsplat, frozen cameras, 25k steps, 53,944 primitives, PSNR 27.94 dB on 20 train-distribution views). Parameters `means/scales/quats/opac/rgbs` lived in GPU RAM. Export wrote **xyzrgb only**. No `torch.save`.

| File | Bytes | Header properties |
|---|---|---|
| `x4_gaussian_raw.ply` | 3,575,886 | ascii, 53944 verts, `x y z red green blue` |
| `x4_gaussian_in_arkit.ply` | 3,605,924 | same (centers SIM3'd; **old** SIM3, not EXACT_FRAME) |
| `x4_sparse.ply` | 3,593,531 | same — COLMAP init, not trained |
| `x4_sparse_in_arkit.ply` | 3,622,998 | same |
| `x4_sparse_points.npz` | 1,456,986 | xyz init only |
| `GAUSSIAN_RESULTS.json` | — | n=53944, psnr=27.936, no checkpoint path |

Training dir `/home/rian_/route_b_x4`: images, `sparse/0`, `database.db`, `gaussian.log`. **No `.pt/.pth/.ckpt`. No `point_cloud/`. No `iteration_*`.**

Exact-frame rescue `.../2026-08-31T17-32-exact-frame-anchor-rescue/x4_gaussian_in_arkit.ply`: **same xyzrgb header**, 53,944 verts (EXACT_FRAME centers only).

Web fake (forbidden): `tmp/kitchen-proof/x4_gaussian_v1_web.ply` has `scale_*/rot_*/opacity/f_dc_*` **synthesized from NN spacing**. Not used.

## Route C iPhone gsplat — real trained Gaussian, WRONG capture path for V1 Reality

`.../route-c-iphone-metric/gsplat_out/MASTER_RAW.ply` (247,684,658 bytes), 1,049,505 verts:

`x y z f_dc_0..2 f_rest_0..44 opacity scale_0..2 rot_0..3`

This is a real gsplat export (`export_splats`) of the **iPhone metric** appearance, not Route B V1. PART F forbids substituting it for V1.

## X4 V2

Do not use. Desktop folder `2026-08-31T18-x4-quality-gaussian-v2` is not a readable run tree from this machine (WSL mount collision). Docs report a proper V2 PLY; it is out of scope.

## Checkpoints

No `.pt/.pth/.ckpt` for Route B V1 anywhere under `/home/rian_`, KitchenAprilTags runs, or `C:\s360\tmp`.

## A2 recreation (prepared, not executed)

Dataset preserved: COLMAP sparse + images at `/home/rian_/route_b_x4`, config in `06_gaussian.py` / `scripts/ops/recreate-x4-v1-gaussian.py`. Invoke `--execute` only after this inventory. Default is dry-run.
