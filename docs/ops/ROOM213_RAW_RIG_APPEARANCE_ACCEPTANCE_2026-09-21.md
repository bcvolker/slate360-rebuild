# Room 213 raw-rig Stage 1 — frozen appearance acceptance criteria (pre-registered, 2026-09-21)

Frozen BEFORE any Stage-1 training run. Applies to the first raw dual-lens reconstruction versus the
historical K6 baseline (Studio-ERP → 1280 crops, frozen job `cecc2763`, `experiments/room213-exp6/ROOM213_K6_EXTENDED_CONTROL`).
Nothing here may be edited after the training command is issued; deviations are reported as such.

## Fixed comparison protocol

| Item | Frozen value |
|---|---|
| Feature views | the same Room 213 features the forensic audit and source gate used: ceiling grid/tile texture, chair mesh, window frame, signage/plaque, door hardware, tabletop/object edge, carpet, ChArUco sheet — at the same room locations (whiteboard wall, door corner, window bank, chair row) |
| Renderer | the existing QA renderer only (`render_ply_qa` → `gsplat.rendering.rasterization`, `sh_degree 3`, linear RGB clamp); same code path for K6 and raw-rig |
| Camera poses for renders | the four frozen QA poses in `workers/recon-experiment/visual-poses.json` (`A_on_path`, `B_off_path`, `C_dollhouse`, `D_overhead`) **plus** the appearance-holdout exposures' own face cameras (raw-rig) and their nearest K6 crop cameras, expressed in each model's frame after the metric alignment below |
| FOV / output size | 90° pinhole, **1280×1280** for the four QA poses (as always); for feature crops, **2560×2560 80°** faces rendered identically from both models, then the fixed ROI boxes from `room213-raw-capture-2026-09-21/measure_spec.json` (scaled ×2) |
| Metrics (secondary only) | PSNR / SSIM / LPIPS on the appearance holdout (both lenses, all faces); `lapvar`, `hf_ratio`, 10–90 % ESF width, local contrast per ROI with the forensic-audit code — reported, never decisive |
| Alignment for cross-model views | similarity (scale from the 32.26 mm rig baseline) → rigid; no deformable alignment; poses of one model are never refined against the other |

## Pass conditions (all required)

1. **Multiple near-field details visibly better** — at least 4 of the 7 feature classes show a human-visible gain
   in the raw-rig render over K6 at the same view, judged on the pixel-exact ROI crops (contact sheets, nearest-
   neighbour upscale, no sharpening). "Better" = resolved structure that K6 blurs (grid intersections, mesh slats,
   glyph strokes, hardware edges), not higher contrast.
2. **No meaningful far-field regression** — the four QA poses' far-field regions (opposite wall, window bank from
   the door corner) are not worse than K6 on both the crop review and PSNR/LPIPS of those regions (tolerance:
   LPIPS +0.02, PSNR −0.3 dB).
3. **No haze / soup / geometry instability** — dollhouse and overhead QA renders show no new floaters, no
   translucent haze in free space, no doubled walls; population and scale-tail stats (the Experiment-6
   instrumentation) show no oversized-Gaussian tail growth beyond K6's final state.
4. **No credit for sharpening, noise, or memorisation** — gains must appear on the appearance-holdout exposures,
   not only on training views; a gain that appears as increased Michelson contrast with no new resolved structure,
   or as grain, is scored as no gain. Holdout exposures never enter training or geometry refinement.
5. **HUMAN_VISUAL_VERDICT** remains `UNREVIEWED` until a human signs the crop review; metrics alone cannot pass.

## Non-negotiables for the training run itself (audit before pass/fail is even scored)

- Same K6 Splatfacto recipe and step count; no new tuning; camera optimizer off; faces never move independently.
- Input faces load at 2560 after step 6000 (no `images_2/`, `downscale-factor 1`); verified from the run's config.
- Dataset = the frozen build output (`/vol/room213/2026-09-21/build/`), unchanged; splits from `splits.json`.

Verdict vocabulary: `STAGE-1 APPEARANCE — PASS / FAIL / INCONCLUSIVE`. A FAIL on condition 3 alone is a hard FAIL.
