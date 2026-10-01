# R213-LFS-IGS-1 result: **`LICHTFELD_NO_MATERIAL_IMPROVEMENT`** (the run degenerated)

**One run, as contracted. Stopped. No second schedule, no tuning, no Postshot.**

## What ran

- LichtFeld Studio `c72a0d85`, exe sha256 `12d1e135…`.
- Upstream `eval/improvedGSplus_optimization_params.json` with `--steps-scaler 5`, i.e. 150,000 iterations (pre-run contract: `ROOM213_LFS_IGS1_PREFLIGHT_2026-09-30.md`).
- A's exact 5,080 faces at 1718² with masks and cameras; one L40S.
- Completed normally: exit 0, **7,391 s (2 h 3 min)**, peak VRAM 8.5 GB, final 999,999 Gaussians.
- The population followed the planned schedule exactly (764,560 at 10k, 998,604 at 70k, 1M at 75k).

## Result: the trained model is degenerate

**Native LichtFeld render** at the frozen cameras. The render is LichtFeld's own eval path with all learning rates zero; the PLY was unchanged to 2.4e-7, and the same path rendered the smoke model correctly (NCC 0.97).

- Every view is a **flat colour field with scattered single-splat specks**.
- The table, the armrest, the textured target and the whole room are absent (`close_crops_source_A_lichtfeld.jpg`, `normal_view_A_vs_lichtfeld.jpg`).
- The frozen edge harness found **no measurable edges** at the table or armrest close views. T_mix had 1 view with 9 edges, which is noise.

**PLY statistics** (`workers/modal/room213-lichtfeld/plystat.py`) show the model itself is broken, not the renderer:

| | LichtFeld final, 150k | LichtFeld at 5.5k (load check) | Spirula A |
|---|---|---|---|
| Gaussians with longest axis > 1 m | **115,872** | 502 | 7,137 |
| Largest Gaussian | **111 km** | 19.5 m | 26.6 m |
| Position 1–99% (x) | **−11.7 … +12.9 m** | −6.0 … +5.9 m | −6.0 … +5.9 m |
| Opacity p50 / p90 | **0.10 / 0.10** | 0.21 / 0.68 | 0.15 / 0.56 |
| Large and opaque (> 0.3 m, > 0.3) | **41,771** | 3,256 | 3,410 |

**When it went wrong:** the same recipe was healthy at 5,500 iterations. The load check had a median training PSNR of 21.8 dB over all 5,080 images, and its geometry stayed inside the room. The collapse happened later in the 150k run, into a room-filling fog of huge, low-opacity Gaussians. Its per-iteration loss sat at about 0.15–0.40 throughout; it is single-image and too noisy to date the collapse.

**Cause: not determined.** No diagnostic runs were allowed. These are hypotheses only, untested:

1. The ×5 step scaling stretches the scale learning-rate decay (0.02 → 0.002) over 150k steps and the opacity resets to every 15k steps. The recipe was tuned at 30k on scenes of 100–300 images; this may leave scales unstable for too long. The opacity p90 is exactly 0.10, which is consistent with resets that never recovered.
2. A unit or scale interaction with this metric scene, which is about 12 m across. The scene-scale-dependent learning rates were never exercised at this length on Mip-NeRF360-scale scenes.

## Classification against the contract

- **Table edge:** not measurable, no reconstruction. Source 2.12 px, A 4.79 px.
- **Armrest:** not measurable. Source 2.30 px, A 3.70 px.
- **Textured target, never-trained neighbours, moving clip, overall view:** all absent or degenerate.
- **→ `LICHTFELD_NO_MATERIAL_IMPROVEMENT`.**

What this means and does not mean:
- This IGS+ configuration, the documented recipe exposure-matched to A, **did not produce a usable model** on Room 213 within the declared budget.
- It says **nothing** about whether IGS+ preserves fine detail differently. Like the ROI run, it is not evidence that the softening is or is not Spirula-specific.
- The Spark check was not run, because native did not pass.

## Verified before training (all passed; see the pre-run report)

| Check | Result |
|---|---|
| Conversion round-trip | 1e-11 px |
| Images and masks | 5,080 + 5,080, all at 1718² |
| Loaded table pixels vs A's float faces | bit-identical to the export; 51.5 dB; edge width ×0.98–1.02 |
| Smoke refinement event | correct |
| Checkpoint and PLY | reload works |

## Spend

- All LichtFeld Modal apps: **≈ $13.6**.
  - Builds ≈ $2.9, three attempts (SourceForge outage and dev-only stub checks).
  - Export and gates ≈ $0.8.
  - Smoke, load checks, full run and renders ≈ $9.9.
- Against the $10 cap for smoke + full + evaluation: **≈ $9.9, at the cap**. About $1.5 of it was a stalled first load check (single-threaded volume copy, GPU idle), since fixed.
- The full run took 2 h 3 min, not the 30–50 min estimated. The rate fell from about 110 it/s at 700k Gaussians to about 16 it/s at 1M with full SH.

## Artifacts

All under `docs/ops/room213-lfs-igs1-2026-09-30/`:
- figures: `close_crops_source_A_lichtfeld.jpg` (rows: T_table o06, o07, T_chair o07, T_mix o05; columns: source | Spirula A | LichtFeld) and `normal_view_A_vs_lichtfeld.jpg`;
- measurement data: `edges_LFS.json` and the pre-run checks.

The volume holds the full model and logs under `conditions/LFS_IGS1/runs/full` and the native renders under `capture/renders/cp1_LFS` and `lfsv_LFS`.

**Stopped for review.**
