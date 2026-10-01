# Room 213: cloud-native alternative trainer check (2026-09-30)

**Status: feasibility only.** Nothing installed, built or trained. Postshot remains on hold.

**Selection: ONE candidate, LichtFeld Studio with the `igs+` (ImprovedGS+) strategy.** It meets all ten hard
requirements. One benchmark run is proposed below, awaiting approval.

## Candidates (all verified against primary sources on 2026-09-30)

| | **1. LichtFeld Studio, `--strategy igs+`** | 2. NVIDIA 3DGRUT (3DGUT/3DGRT + MCMC or NHT) | 3. gsplat `simple_trainer` (MCMC or ADC+absgrad) |
|---|---|---|---|
| Repo / version | MrNeRF/LichtFeld-Studio. Latest tag **v0.5.3** (2026-06-24). `master` at **`c72a0d8554a33371ccd97df1e9fbe480d0981fdd`** (2026-09-30). The IGS+ source has 27 commits, the latest 2026-09-26 (`316413665d01`). | nv-tlabs/3dgrut, release v1.1.0 (2026-06-10), `main` `e6f4552b` (2026-09-22). Neural Harmonic Textures (NHT) added 2026-06. | nerfstudio-project/gsplat v1.5.3 (2025-07-04) |
| Method | ImprovedGS+ (Muñoz Vicente, arXiv 2603.08661, 2026-03). Builds on ImprovedGS and the Taming-3DGS budget curve. | 3DGUT (CVPR 2025) / 3DGRT. MCMC densification (Kheradmand 2024). NHT (Condor et al., arXiv 2604.01204). | 3DGS-MCMC, or classic ADC with the AbsGS gradient |
| Licence | **GPL-3.0**: the trainer runs server-side as an unmodified binary, and Slate360 code and output PLYs are unaffected. This is the same posture as Spirula (also GPL-3.0). Obligations apply only if we ship the binary to customers. | Apache-2.0 | Apache-2.0 |
| Linux / headless | Yes. `--headless` flag; Ubuntu 22.04+; `docker/Dockerfile` (`nvidia/cuda:*-devel-ubuntu24.04`). **No Linux binary is published, so it must be built from source** (CUDA 12.8+, GCC 14, CMake 3.30+, vcpkg). | Yes (Python, Hydra configs) | Yes (Python) |
| Modal | Feasible: build the Dockerfile as a Modal image (first build est. 45–90 min). | Already run on Modal (2026-09-22/23) | Feasible |
| Camera import | COLMAP (`-d`, `--images`). PINHOLE is native; `--undistort` handles distorted models. | COLMAP (pinhole, fisheye) | COLMAP |
| Resolution | `--max-width` default 3840, and `-r` default 1 ("auto"). **Our 1718² faces are kept at native size** (set `-r 1 --max-width 0` explicitly). | No hard cap. Example configs downsample ×2. | No cap |
| VRAM | Not documented. The paper used an RTX A4500 (20 GB) for Mip-NeRF360 at 1M. CPU image cache available (`--no-cpu-cache` to disable). | 5.9 GB (MCMC, measured) to 44 GB (GS, measured) | Moderate |
| Export | **PLY, SPZ, SOG**, standalone HTML | PLY, USD, NuRec. Default particle kernel is degree 4, measured **1.59× wider** in a degree-2 viewer. NHT is a neural per-primitive feature, **not consumable by Spark**. | PLY |
| Spark | Yes, directly. Standard 3DGS PLY when `--gut` and `--enable-mip` are off (both default off). | Needs a kernel conversion at export. NHT: no. | Yes |
| Difference from Spirula | **Large; see below.** | MCMC densification ≈ Spirula's relocation-under-cap. The difference is the renderer. | MCMC ≈ Spirula. ADC is the baseline that Spirula's revised densification already improves on. |
| Thin-structure evidence | Paper Fig. 1: an NMS edge map focuses densification on a "thinned structural backbone" (Bicycle). Mip-NeRF360 at a 1M budget: 28.79 dB vs MCMC, in 26.8% less time with 13.3% fewer Gaussians. **Moderate and indirect**: no independent thin-edge benchmark. | Our own 2026-09-23 runs: fine texture absent (GS 78k), and MCMC 1M at native fisheye was too slow to finish. Spirula beat it. | None specific |
| Effort | About 5–6 h (below) | Already tried. A rerun adds no new information. | About 4 h, but not a materially different method |
| L40S cost | Est. 40–90 min, **≈$3–5 per run** | — | — |
| **Verdict** | **Selected** | Rejected: already benchmarked on this room and lost to Spirula; MCMC is the same family; NHT can't be delivered in Spark. | Rejected: the brief excludes a bare framework; neither preset is materially different. |

## Why IGS+ is a credible test of "same pixels + same cameras → different algorithm"

The differences sit exactly where our diagnostics located the loss: a reasonably ranked target that still never refines.

| Mechanism | Spirula v2026.9.24 `360-camera` (measured) | LichtFeld `igs+` (from source at `c72a0d85`) |
|---|---|---|
| Growth schedule | 1.05× per event, **cap reached at step 1401** (665k → 1M). Afterwards only dead-splat relocation, until step 27,500. | **Taming-3DGS quadratic budget curve over the whole refine window** (`get_count_array`). Growth continues while the reconstruction is informative, not just the first 1.4k steps. |
| Parent choice | Proportional to the ssim_cs score (power 0.4). **Flat**: top decile only 1.3–1.7× the median, and table parents ≈1 per event. | **Hard filter** to the top 4× budget by error (`ERROR_CANDIDATE_FACTOR`), then weighted by error × (1 + 0.25 × Sobel+NMS edge score). This targets edges explicitly. |
| Split | Clone or relocate; no directed split | **Long-Axis Split** CUDA kernel: children placed along the principal axis. This addresses the 8 mm Gaussians straddling a 2 px edge. |
| Optimiser | Spirula defaults | Exponential scale-LR scheduler (0.020 → 0.002) and a higher position LR (1.28e-4) |
| Appearance | PPISP + bilateral grid per face | Off by default (exposure locked at 1/320 s, so this is a minor confound; noted) |
| Renderer | Vulkan rasteriser | CUDA rasteriser, standard EWA 3DGS |

**Caveat:** we have shown the table is *not* under-ranked (83–96th percentile). If the limit is optimisation or the loss
rather than allocation, the directed split and the schedule change still exercise it. A null result therefore also
narrows the cause.

## Proposed ONE-RUN benchmark: R213-LFS-IGS-1

**Inputs:** A's frozen inputs, made trainer-agnostic. The export is shared with the Postshot path, so it isn't wasted if that resumes.

1. On Modal (CPU), export A's **exact 5,080 training faces**. Use Spirula's own `warp_to_pinhole` output (1718², f = c = 859) rather than a re-warp, so the pixels are bit-identical.
2. Export a **PINHOLE COLMAP model** with A's poses and the 665,307 seed points.
3. Export masks in LichtFeld's convention (`--mask-mode`, `--invert-masks` as needed).
4. **Gate:** reproject the seed points into 20 faces and compare with Spirula's projection. Mismatch must be **≤0.05 px**, else stop.

**Build:** a Modal image from `docker/Dockerfile` at **`c72a0d85`**. The binary sha is recorded and the commit pinned.
- Smoke test: 300 steps on 50 faces, checking only that Gaussians grow and a PLY is written.

**Train (single run):**

```bash
LichtFeld-Studio -d <ws> --images images -o <out> --headless --strategy igs+ -i 30000 --max-cap 1000000 -r 1 --max-width 0 --mask-mode <mode>
```

- No test split: all 5,080 faces train, as in A.
- Settings match A: 30k steps, 1M cap, no PPISP or bilateral grid, no mip filter, no GUT.
- L40S.

**Evaluation:** the frozen harness, with the same cameras and scripts as A, CONTROL-930 and DENSE-CLOSE-1.
- Table close edge width (training 2.12 px; A 4.79 px)
- Armrest / thin-structure edge (training 2.30 px; A 3.70 px)
- Textured target (cable box)
- Never-trained neighbour frames (idx ±1/±2 from the `.insv`): retention at 1–2 / 2–4 px
- Gaussians near targets (count, size)
- Short moving novel-view sequence: SOURCE | SPIRULA A | LICHTFELD IGS+ clip
- Normal Room 213 viewing: one load of the exported PLY in the Spark viewer on a preview URL. No viewer code change; delivery check only.

**PASS (all required):**
- Table edge **≤3.2 px**, visibly sharper at the training cameras, the neighbours and the novel views.
- Armrest **≤3.7 px**.
- Neighbour retention not below A.
- No new floaters or ghosting in the moving clip.
- The Spark render matches the native render.

**FAIL:** table edge ≥4.3 px. Then stop: the limit is not Spirula-specific, and Postshot is the last external
comparison. A metric-only gain is not a pass.

**Budget:**
- Engineering about **5–6 h**:
  - export and reprojection gate ≈2 h (reusable for Postshot);
  - image build and smoke test ≈2 h;
  - evaluation ≈1–1.5 h.
- Compute **≈$8, cap $10**: build ≈$1, training ≈$3–5, renders and census ≈$1–2.
- Elapsed ≈1 day.

**STOP rules:**
- Stop if the build fails after **2 h** of effort.
- Stop if the reprojection gate fails.
- Stop if the smoke test shows no growth.
- No second run, no parameter changes, no partition.
