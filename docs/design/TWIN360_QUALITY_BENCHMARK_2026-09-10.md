# Twin 360 quality benchmark and audit follow-up (2026-09-10)

Desktop session. Written after the "Twin 360 deep pipeline quality audit" (ChatGPT, 2026-09-10) so the
next person, human or AI, can see what was checked, what was true, and what changed.

## Why models "scored well but never looked better"

Every number we quoted (Brush PSNR, `brush-eval.py` held-out PSNR) is measured from the camera path.
A Gaussian splat is at its best exactly there. The defects a buyer sees (veils, ghosts, smears) show up
one step sideways, looking back, or from above, and no on-path number moves when they change.

**Rule from now on:** a change is "better" only when matched before/after renders at fixed off-path
viewpoints look better. PSNR is a regression check, not an acceptance test.

### The benchmark

`render-views.py` (desktop scratch, gsplat renderer) renders any PLY at fixed viewpoints derived from the
solved cameras of a job: five stations spread along the path, each with `path` (as captured), `back`
(turned 180°), `backside` (turned 150°, 0.6 m to the side), `side06` (0.6 m right), `side10yaw` (1 m right,
30° yaw) and `high` (0.4 m up, pitched down). `compose-pairs.py` builds side-by-side sheets. Output lives in
`C:\Users\Brian PC\Slate360Jobs\x4-bench` and the proof sheet is `proof_operator_masks_x4.jpg`.

## Audit items, checked against the code

| Audit claim | Verdict | What was done |
|---|---|---|
| Operator in every 360 back face trains into ghost splats | **True, and the biggest visible defect.** The published X4 twin had a brown smear filling the hallway archway behind each station. | Person segmentation (DeepLabV3-MobileNet) + nadir prior masks, Brush `masks/` folder. A/B on the frozen X4 solve: ghost gone, forward views identical. Wired into Capture Studio for every 360 job (`operator_masks.py`, `OperatorMasks` default on). |
| 8K unwrapped to 5760×2880 then faces upsampled to 2048 | **Half true.** The published X4 job trained from the stitched 7680×3840 mp4 at 2048-px 110° faces (0.87×, no upsample). Only the raw `.insv` path used 5760×2880. | `.insv` now unwraps at 2× lens width (8K → 7680×3840). Face size defaults to W·110/360 clamped 1536..2304, so 8K cuts 2304-px faces. |
| Poisson on the voxel cloud vs TSDF from per-frame depth | **True.** Poisson gave lumpy walls and a partial balloon. | `tsdf_mesh.py` (port of the cloud worker's `interior_mesh.py`) fuses `lidar_depth.s360depth` + poses; run-job prefers it and falls back to Poisson. Self-test passes. |
| Depth stream present but unused | **Worse than claimed:** stills walks never wrote it. The stream was only opened by the video writer, so every photo walk uploaded `depthEvidenceFrameCount: 0`. | Fixed in `15e18da3` (opened from the frame loop on stills walks; RGB stored at 256×192). Codemagic build triggered. The next phone walk on that build is the first with per-frame depth. |
| Veils survive the mesh-distance prune | True; needs the depth stream for a camera-ray consistency check. | Not started; blocked on the next walk. |
| Overhead views from the splat | Already mesh-based (Dollhouse/Plan draw the LiDAR mesh). | Nothing to do beyond TSDF. |
| Phone gets SH0 / LOD | By design (800k SH0 derivative for phones); desktop gets the full SH3 model. | Nothing to do. |
| One-height capture, no lateral coverage | True. | Recapture protocol below. |

## X4 kitchen A/B (frozen solve, 572/572 registered, 30k steps, 2048-px faces, SH3)

| | Baseline (published 09-09) | Operator masked |
|---|---|---|
| Splats | 613,343 | 601,797 |
| Held-out PSNR, every 8th image, full frame | 32.0 dB | 31.2 dB |
| Back-face ignore fraction | 0 | 7.5–17% per frame (person + nadir) |
| Hallway looking back | operator smear over rug and floor | clean rug, clean floor |
| Forward / side views | — | unchanged |

The PSNR drop is the operator pixels no longer being reproduced. It is the expected sign of the fix, and a
good example of why PSNR cannot be the acceptance test. The masked model was republished into the same twin
(space `05ffcf74-f4ee-4a52-9d5a-7cefc992e839`); the baseline PLY is kept as `gaussian.baseline.ply`.

## Recapture protocol (next walks)

Phone (Twin 360 app, build with the depth-stream fix):
1. Stills mode, AE lock, 1/250 in normal light, 12 MP stills.
2. Two laps: one at chest height, one at waist height, both slow. Keep 1–1.5 m from walls and furniture; a
   Gaussian splat cannot invent the side of a cabinet the camera never saw.
3. Turn corners in three steps, not one. Pause half a second at each doorway.
4. Do not walk backwards over the same line; loop.

X4 360:
1. Camera on a pole above head height, operator directly under the lens (the masks handle the rest).
2. Brighter than you think: 1/250 or auto in a dim room, not 1/500.
3. Same two-lap rule; the second lap 0.5 m to the side of the first.

## Open items

- Ray-consistency veil prune (needs the depth stream; first candidate: the next phone walk).
- Depth-supervised training (Brush has no depth loss; would need gsplat with the depth stream, and gsplat lost
  to Brush on appearance, so this is an experiment, not a plan).
- Before/after benchmark for the phone path once a depth-stream walk exists.
