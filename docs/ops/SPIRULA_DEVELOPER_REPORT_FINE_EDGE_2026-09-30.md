# Spirula Studio v2026.9.24: a sharp, mutually consistent close-range edge renders about 2.3× broader

## Question

**Is this behaviour expected in v2026.9.24? Is there an existing supported setting, change or newer revision meant to preserve fine detail like this?**

## Setup (all official, unmodified)

**Trainer:** `spirula-2026.9.24-ubuntu-vulkan-x86_64.zip`, binary sha256 `7e584142e7a9dd6cd8fb3e494a7b0085a26689907885ad57229cb8f4ec81cf97`. Source tag v2026.9.24 = `183b2c6df72f42ecb9a0500cdad96749847da171`. Run on an NVIDIA L40S (Ubuntu 24.04, Vulkan).

**Capture:** Insta360 X4, 8K 360 video (`.insv`: 2× 3840² HEVC lens tracks, 29.97 fps, shutter 1/100–1/200 s). One walking pass through a classroom: 256 s, 12 out-and-back passes between desk rows.

**Pipeline (CLI equivalent of the GUI defaults):**
1. `sam extract -s 15 -k 3 --sync -q 95` → 510 frame pairs.
2. `sam mask` (border) + `sam track` (SAM 3, "person; hand; backpack; shadow of person").
3. `sfm auto --quality high --data-type video --camera-model thin-prism-fisheye --camera-mode folder --mapper flat --features sift --matcher bruteforce --manifest <dual-fisheye rig, .insv telemetry> --metric-gps horizontal --masks` → 1016/1020 images, 665,307 points, 1.13 px.
4. `train 360-camera` with defaults → 30k steps, 1M cap.

The full resolved config is in `resolved_config_A.json`. The densification-relevant values:

| Setting | Value |
|---|---|
| `use_revised_densification` | true |
| `densify_loss_map_mode` | ssim_cs |
| `densify_accum_mode` | avg |
| `densify_score_mode` | mean |
| `densify_score_power` | 0.4 |
| `growth_factor` | 1.05 |
| `refine_every` | 100 |
| `refine_start_iter` / `refine_stop_iter` / `refine_stop_num_iter` | 500 / 14000 / 2500 |
| `min_opacity` | 0.005 |
| `max_screen_size` | 0.3 |
| `warp_to_pinhole` | true |
| `use_ppisp` / `use_bilateral_grid` | true / true |

## Observation

**Target:** a table-top corner with dark edge banding (planar), seen from 0.8–1.0 m in 4 training images. All measurements are on the exact training-face pixels (1718², f = 859), in camera space, against the native render at the same camera. The render comes from the release binary: `--init-ply`, 0 iterations, eval-mode filename.

| Quantity | Value |
|---|---|
| Edge width 10–90% in each training image | **2.12 px** (range 1.6–2.3 px across the 4 views) |
| Same edge in never-trained neighbouring video frames (±1 frame, decoded from the original `.insv`) | 1.03× the training-image width, so the source sharpness is repeatable |
| Agreement of the 4 close views on the table plane | **0.57 px** median |
| Width expected if the renderer merely averaged that disagreement | **≈2.6 px** |
| Native render at the same cameras | **4.79 px** (×2.3). Edge position is right to within 0.7 px after a ≤1.1 px shift. |
| Same effect elsewhere | armrest 2.30 → 3.70 px close; far views ×1.35–1.6 |

**Figures:**
- `fig1_training_vs_render_no_alignment.png`: training pixels | render | difference, with no alignment. Symmetric difference lines on both sides of each edge mean broadening, not displacement. Surface texture is absent in the render.
- `fig3_table_lineage.jpg`: original lens crop | training face | render.

## What we tried (each change isolated, official recipe otherwise unchanged)

1. **More close views:** the same data plus 90 extra frame pairs from `sam extract -s 8 -k 3` inside the close passes, which took the table's close views from 4 to about 20. The table edge came out **5.01 px (no change)**. A cable target elsewhere did improve (`fig2_A_vs_more_close_views.png`).
2. **Earlier, on a different build and an earlier capture of the same room** (source `fd1afca1`): a 3M global cap improved LPIPS by about 5%, but gave no visible close-range sharpening.

## Measurements of refinement (read-only instrumented replay of the same run; the model is not used)

The same source was built with a dump-only patch, which copies means, scales, opacity, radii and `accum_buffer` before and after the draw at refine steps. It replays with an identical splat-count trajectory: 665,307 → 1M reached at **step 1401**.

Gaussians within 3 cm of the table edge (`refinement_score_history.json`):

| Step | Score rank among live splats | Score ÷ room median | Parents drawn: observed / expected from score share |
|---|---|---|---|
| 600–1400 | **83–96th percentile** | ×1.3–1.7 | ≈1 per event, matching expectation |
| 2000–14000 | 68–84th | ×1.1–1.3 | 0–2 per event |

Over the 14 sampled events: 9 parents observed vs 12.1 expected. A cable target elsewhere ranked lower (21–79th percentile).

Final Gaussians near the table (`gaussians_near_targets_*.json`): 23 within 3 cm, longest axis median 8.2 mm (p10 3.8 mm), none under 2 mm. The whole room: median longest axis about 9.5 mm; about 3.5% of splats are under 3 mm.

## Minimal reproduction

- **Data:** the `.insv` (6.7 GB) and our workspace (images, masks, sparse, manifest) can be shared on request.
- **Steps:**
  1. The four commands above with the release binary. The frame, mask and SfM stages take about 20 min on an L40S; training takes 28 min.
  2. Render the trained PLY at the 4 close training cameras.
  3. Measure the 10–90% width of the table-banding edge profile along the gradient normal in the training face against the render.
- **Camera list and edge locations:** `edge_measurements_A.json` (per view: tag, distance, widths, position errors).

## Environment

Ubuntu 24.04 container, NVIDIA L40S 46 GB, Vulkan. The same results were reproduced with a CUDA build of the same source commit (used only for the instrumented replay).
