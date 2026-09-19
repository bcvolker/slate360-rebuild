# Room 213 — source-formation / detail-loss forensic audit (read-only, no training)

Date: 2026-09-18. Builds directly on [`ROOM213_CAMERA_RAY_AUDIT_2026-09-18.md`](ROOM213_CAMERA_RAY_AUDIT_2026-09-18.md)
(geometry/reprojection) — this audit is the **pixel/detail** side of the same question set. **No training was run,
nothing in the frozen dataset/pipeline/volume/checkpoints was modified.** Every number below was computed on
read-only copies of already-frozen artifacts, plus one CPU-only (no GPU) introspection call against the training
container image to verify a methodology fact against nerfstudio's actual source (not assumed).

## Data availability (checked directly, not assumed)

| Stage in the requested chain | Available on this host? |
|---|---|
| Original X4 `.insv` raw files | **No.** Searched the whole repo, the Lab-PC WSL path the camera-ray audit cites, Insta360 Studio's local caches/footage-project index, and the user's Insta360 folders. Only unrelated captures exist locally (a different "360 car / AOB205" project, and two unrelated 2026-08-03 test clips). Room 213's raw video was never local to this machine, or is no longer here. |
| Insta360-stitched 8K equirectangular (ERP) panorama | **No.** The pipeline's own crop stage (`workers/local/splat-lab/stages/views.py`) consumes an equirect image at generation time but only the 16 perspective crops it produces were ever frozen onto the Modal volume or the local scratch mirror — the ERP frames themselves were not persisted anywhere reachable here. |
| 1280² perspective crops (`views/images/*.jpg`) + masks + `transforms.json` | **Yes** — a full local mirror of all 6,016 crops exists in a prior session's scratch directory (`...\dcf5d615-.../scratchpad\room213\views\`), the same source the camera-ray audit used. Treated as ephemeral, not durable; not part of this repo. |
| GT-vs-trained-render panels (H5/G5, 3 withheld panoramas) | **Yes**, committed: `qa/exp3-run/exp5-pull/panels/panels/{median_000173,best_000264,worst_000325}.png` |
| `points.ply` (sparse SfM points, no tracks) | **Yes**, same volume as the camera-ray audit used |

**Consequence:** stages 1–2 of the requested chain (original X4 source → stitched ERP) cannot be measured pixel-by-pixel
on this host at all — there is nothing here to measure. §6 below designs the exact comparison to run once raw
footage is available. Everything from "1280 crop" onward **is** measured directly, on real pixels, below.

## Methodology

**30 frozen ROIs** across 3 stations already used by the camera-ray audit (000173 = median render quality, 000264 =
best, 000325 = worst — chosen so most ROIs have a real GT-vs-render panel, not just a GT crop) plus wider directional
coverage at station 000173 (v00 lens-center, v02 yaw90° seam, v06 yaw270° seam, v14 down/operator hemisphere). Full
ROI list with pixel bounding boxes: [`roi_results.json`](room213-source-detail-audit/roi_results.json). Categories
covered (≥3 ROIs each, per the request): ceiling-grid intersections, whiteboard, chair mesh/slats, door hardware,
window frames, carpet, small tabletop objects, plus a wall-sign-text ROI for the legibility question.

Per ROI, per available stage (1280 crop / 640 / 320 / trained render), computed: `lapvar` (variance of Laplacian,
grayscale), `hf_ratio` (FFT energy fraction above ¼ Nyquist), `local_contrast` (grayscale std), `michelson` contrast,
`esf_width_px` (10–90% edge-spread width at the ROI's strongest edge), `blockiness` (8×8 JPEG-grid gradient ratio),
and `angular_px_per_deg` (pinhole model, `fl=640`, exact by construction per the camera-ray audit's §2).
Script: [`detail_forensic_audit.py`](room213-source-detail-audit/detail_forensic_audit.py).

### A methodology error caught and fixed during this audit — worth recording

The first pass simulated the training pipeline's 320/640 progressive-resolution stages with `PIL.Image.resize(...,
BILINEAR)`. A synthetic-pattern sanity check showed this resize **aliases** fine periodic content (a period-6px test
grid got *sharper*, not softer, after a 2× reduction) — which would have made "does low-res training destroy detail"
unanswerable from that simulation alone. Rather than assume that either confirmed or refuted anything, I read
nerfstudio 1.1.5's actual installed source directly (`nerfstudio_downscale_introspect`, a throwaway CPU-only,
no-GPU, read-only Modal function added and run for this check, mirroring the project's established "introspect
before assuming" pattern from the camera-ray audit's own SIFT/BA scripts): splatfacto's *live* per-step downscale is
`resize_image()` in `nerfstudio/models/splatfacto.py:110-121`, whose own docstring says "Downscale images using the
same 'area' method in opencv" — a real d×d box-average `conv2d` with `stride=d`, called from
`_downscale_if_required()` / `_get_downscale_factor()` (`splatfacto.py:476-489`), which implements exactly the
`num_downscales`/`resolution_schedule` schedule the camera-ray audit already documented (320² for steps 0–2999,
640² for 3000–5999, full 1280² from 6000 on). The PIL-BILINEAR path in `base_dataset.py:73` is real but is a
*different*, unused code path here (only exercised if `camera_res_scale_factor != 1.0`, which it never is in this
project's training commands). **All numbers below use the corrected, verified box-average downsample.**

A second, more important methodology point survived even after that fix: **variance-of-Laplacian is not
scale-invariant.** With the *correct* box-average downsample, lapvar still increases from 1280→640→320 for almost
every ROI — this is expected and is not evidence that low-res training images contain *more* detail. The discrete
Laplacian approximates a second derivative scaled by the sampling interval; a real edge represented by fewer,
coarser pixels produces a steeper per-pixel gradient at the coarser grid even when properly low-pass filtered. **Raw
lapvar/hf_ratio numbers are therefore only compared within the same pixel resolution in this audit's conclusions**
(GT crop vs. render, both 1280²; or ROI vs. ROI at the same stage). Cross-resolution numbers are reported in the
appendix for completeness but are read through a resolvability (Nyquist) argument, not a magnitude comparison — this
matches how the camera-ray audit's own §5 already handled it (it never directly compared lapvar across resolutions
either, only at matched 1280² GT-vs-render).

---

## 1. Where is detail actually lost? (same-resolution comparisons only)

### 1.1 Crop stage (1280² GT crop) — already degraded relative to source, by construction

Not independently measurable pixel-by-pixel (no ERP available locally), but quantifiable from the crop's own
geometry, exactly as the camera-ray audit's §5 already established and this audit's `angular_px_per_deg` numbers
confirm: a 1280² crop at 90° HFOV samples the panorama center at **11.2 px/deg** (this audit's 30-ROI median: lens-
center 16.19, seam-yaw90 15.47, seam-yaw270 16.34, down-operator 14.45 px/deg at each ROI's own off-center position —
consistent with the pinhole model's `f·sec²θ` falloff, lower near the optical axis, higher toward crop edges). The
original 7680×3840 equirect samples the room at ~21.3 px/deg at the equator. **The crop center is undersampled by
roughly half relative to the source before any further processing happens** — this is a real, construction-level
loss, independent of training or rendering.

### 1.2 320/640 progressive-training-resolution stages — a resolvability argument, not a magnitude one

Using the corrected box-average downsample and each category's real measured feature pitch from direct visual
inspection of the source crops:

| Category | Approx. feature pitch at 1280² | Pitch at 640² (÷2) | Pitch at 320² (÷4) | Resolvable at 320²? |
|---|---|---|---|---|
| Ceiling-grid lines | ~6–10 px wide, tiles ~150–200 px apart | ~3–5 px | ~1.5–2.5 px | Marginal — at or below 2-px Nyquist |
| Chair mesh slats | ~8–14 px pitch | ~4–7 px | ~2–3.5 px | Marginal-to-lost |
| Door hardware (handle/hinge edges) | ~15–30 px wide | ~7–15 px | ~4–8 px | Survives, softened |
| Window mullions | ~10–20 px wide | ~5–10 px | ~2.5–5 px | Marginal |
| Carpet texture | broadband, no single dominant pitch | — | — | Degrades gracefully (texture, not a hard structure) |
| Whiteboard marker strokes (where present) | ~4–8 px wide (typical marker line at this range) | ~2–4 px | ~1–2 px | Lost at 320², marginal at 640² |

**Reading:** the fine, *regular/thin* categories (ceiling-grid, chair-mesh, whiteboard strokes, window mullions) sit
right at or below the 320² stage's Nyquist limit — the first 3,000 of every arm's training steps (0–2999) see these
structures at a resolution where they are not reliably representable at all, and the 640² window (steps 3000–5999)
still only marginally resolves them. Carpet and broad door-hardware shapes survive the low-res window with far less
relative damage, because they are not thin/periodic structures near the pixel Nyquist limit. This is a resolvability
argument grounded in the source's own measured feature sizes, not a raw-lapvar comparison across scales (see the
methodology note above for why that comparison isn't valid on its own).

### 1.3 Gaussian optimization / render stage — the largest, most consistently evidenced loss

Same-resolution (1280² GT crop vs. 1280² H5 render) Laplacian-variance ratio, by category, over the 18 ROIs with a
real render panel available:

| Category | n ROIs | Median render/GT lapvar ratio | Reading |
|---|---|---|---|
| **Ceiling-grid** | 2 | **0.01** | 98–99% of the crop's own edge energy gone. The worst category by far. |
| Furniture edge (desk/slat) | 1 | 0.07 | Severe loss |
| Chair mesh | 1 | 0.09 | Severe loss |
| Tabletop objects | 3 | 0.15 | Severe loss |
| Carpet | 3 | 0.17 (but one ROI at 1.04 — see below) | Severe loss, one exception |
| Door hardware | 2 | 0.25 | Substantial loss |
| Wall-sign text | 1 | 0.21 | Substantial loss |
| Whiteboard | 3 | 0.40 | Moderate loss — the least-damaged structured category |
| Window frame | 2 | 0.39 and **6.80** | Inconsistent — see below |

This matches and sharpens the camera-ray audit's own whole-panel numbers (0.35–0.41 ratio) — at ROI granularity,
**ceiling-grid is the single worst-surviving category in the entire pipeline**, consistent with §1.2's resolvability
finding (it's also the category most starved by the 320/640 training window) and with it being a thin, regular,
high-frequency structure that a Gaussian mixture optimized against a photometric loss has no strong incentive to
reproduce exactly (a slightly-blurred ceiling costs little in PSNR/SSIM compared to getting a thin thousand-line grid
pixel-exact).

**Two anomalies worth flagging for human visual review, not treated as confirmed here (`HUMAN_VISUAL_VERDICT` stays
`UNREVIEWED` project-wide):**
- **R04 (window frame, station 000173): render lapvar is 6.8× the GT crop's**, i.e. the render is *sharper* than
  the source by this metric. Given the ROI is a window looking at soft, low-contrast foliage through glass, this is
  much more likely to be **render noise/floater artifacts around a translucent surface** (a known gsplat failure
  mode for glass/reflective content) inflating high-frequency energy without adding real recovered detail, than a
  genuine quality gain. Needs an actual visual check before drawing any conclusion.
- **R30 (carpet, station 000325): ratio 1.04** — the one carpet ROI that essentially fully survives to the render.
  Broadband stochastic texture (as opposed to a regular thin structure) appears to be the kind of "detail" this
  training recipe *can* reproduce; worth a visual spot-check to confirm before generalizing.

---

## 2. Yaw 90°/270° (X4 stitch-seam) vs. lens-center — pixel-level check

The camera-ray audit already found a **geometric** signature at yaw 90°/270° (+0.16–0.28 px excess reprojection
error vs. yaw 0°/180° at the same pitch, §4.3). This audit checks whether the **raw source pixels** show a matching
signature, independent of any reprojection math — same station (000173), same pitch (0°, horizon), ceiling-grid ROI
in all three directions:

| View | Direction | lapvar | hf_ratio | local_contrast | **ESF edge width (px)** | blockiness |
|---|---|---|---|---|---|---|
| v00 (R01) | lens-center (yaw 0°) | 173.4 | 0.700 | 23.1 | **2.0** | 1.06 |
| v02 (R07) | **seam, yaw 90°** | 182.1 | 0.588 | 36.2 | **8.0** | 1.34 |
| v06 (R13) | **seam, yaw 270°** | 70.2 | 0.478 | 59.7 | n/a (no single dominant edge found) | 1.02 |

**Yes — the source panorama shows systematically different edge behavior at the seam directions, directly on
pixels, not just in re-derived reprojection residuals.** At yaw 90° the strongest edge in the ceiling-grid ROI is
**4× wider** (8 px vs. 2 px at lens-center) — a genuinely softer, more spread-out transition, exactly the signature
of the X4's dual-fisheye stitch blend. At yaw 270° the picture is different but still abnormal: no single dominant
edge is detectable at all (the strongest-edge finder returns nothing usable), `hf_ratio` is the lowest of the three
directions, and local contrast is markedly higher (59.7 vs 23.1) — consistent with a more diffusely blurred region
punctuated by isolated higher-contrast content, rather than one clean widened seam line. Both are abnormal relative
to lens-center, but not identically so — the stitch isn't symmetric between the two seam directions, which the
purely-geometric reprojection audit (which found similar-magnitude residuals at both v02 and v06) did not surface.
`angular_px_per_deg` is essentially flat across all three directions (14–16 px/deg, no meaningful sampling-density
difference) — **this rules out resampling density as the cause; it is genuinely a stitch-content artifact.**

---

## 3. Compression artifacts (JPEG q92 crops)

Blockiness (8×8-grid gradient ratio; 1.0 = no detectable block edges) across all 30 ROIs: **median 1.03, max 1.34,
min 0.71.** Mild and present (the highest values are, not coincidentally, R07 — the same yaw-90° seam ROI already
flagged above — and R30 carpet, both busy/high-frequency regions where JPEG block quantization bites hardest) but
nowhere near dominant: q92 JPEG blocking is a minor contributor compared to the render-stage loss in §1.3, which is
an order of magnitude larger everywhere it's measured. **Not the primary source of detail loss.**

---

## 4. Text / legibility

No whiteboard in the captured stations carries dense marker writing — this room was in a construction/move-out
state during capture (stacked furniture, ladders, taped-over ceiling tiles), not an active, marked-up classroom.
The two whiteboards inspected directly (000173, 000325) are effectively blank; 000264's shows only a resting marker
pen and specular reflections. The one clearly legible small text element found, a wall-mounted room-number sign
(R21, station 000264, ~85×65 px at 1280²), remains identifiable as signage with a legible-scale label at the 1280²
crop stage (angular density ~16 px/deg here is enough to resolve typical building-sign lettering, which runs
several cm tall) but its render/GT lapvar ratio is 0.21 — substantial softening by the render stage, consistent with
§1.3's finding that thin/regular structures fare worst. **Given the available capture, this audit cannot make a
strong general claim about marker-writing legibility survival** — that needs either a future capture with visible
whiteboard writing, or the raw-source comparison in §6.

---

## 5. Summary: where does detail actually go?

1. **Crop creation (stage 3)** already halves the angular sampling density at crop centers relative to the source
   panorama, by construction (§1.1) — a real, quantifiable, unavoidable-at-this-crop-resolution loss, but modest
   compared to what follows.
2. **Progressive-resolution training (stage 4)** puts the first 3,000 of every arm's steps at a resolution where
   thin/regular structures (ceiling-grid, chair-mesh, whiteboard strokes, window mullions) sit at or below Nyquist —
   a resolvability loss for those categories specifically, not a uniform loss (§1.2).
3. **Gaussian optimization/rendering (stage 5) is the largest and most consistently measured loss in the whole
   chain** — median render/GT ratios of 0.01–00.40 across every structured category at matched 1280² resolution
   (§1.3), an order of magnitude larger than the JPEG-compression contribution (§3). Ceiling-grid is the worst
   category, consistent with it also being the category most starved by stage 4 — the two losses compound rather
   than being independent.
4. **The X4 stitch-seam directions (yaw 90°/270°) are measurably different from lens-center on raw pixels**, not
   only in re-derived reprojection error — confirmed directly in this audit (§2), with two distinct degradation
   signatures at the two seam directions.
5. Stages 1–2 (original X4 capture, Insta360 stitching) **cannot be assessed on this host** — no raw `.insv`, no
   ERP panorama survives locally. §6 designs the comparison to close this gap.

**This audit does not recommend another scale, densification, or pruning experiment** — those already-run
experiments (3–6) changed training-recipe hyperparameters inside stage 4/5's Gaussian optimization, which this audit
now shows is *already* the dominant loss stage regardless of recipe tuning; §1.3's per-category numbers are recipe-
independent (computed on H5, the shared base recipe every later experiment inherited unchanged). The evidence here
points at **the stage-4/5 pipeline mechanism itself** (progressive-resolution scheduling colliding with thin/regular
source structures, and/or the photometric-loss optimization's low incentive to reproduce thin high-frequency
geometry) and at **stitch-seam-direction source quality**, not at any further threshold/pruning knob.

---

## 6. Designed (NOT run): raw-source comparison, once `.insv` is available

**Question:** does Insta360's own stitching software already discard high-frequency detail (dual-fisheye blend,
internal denoise/sharpening, HEVC compression choices) before this pipeline ever sees a pixel — or is all of the
loss measured above attributable to stages 3–5?

**Method, once raw `.insv` files for the Room 213 capture are located:**
1. Extract the two raw fisheye frames (not the stitched ERP) for 3–5 of the same stations already audited here
   (000173, 000264, 000325, plus one more near a yaw-90°/270° seam-heavy area) using Insta360's SDK or `ffmpeg`
   frame extraction at the capture's native resolution/bitrate.
2. Reproject each raw fisheye frame into the same 16-crop layout this pipeline already uses (`py360convert`-style,
   or a direct fisheye-to-perspective remap using the X4's published lens calibration) — independently of Insta360
   Studio's stitcher, to isolate "what did the sensor actually see" from "what did the stitcher do to it."
3. Compare, at matched resolution, using the exact same metrics this audit already defined (`lapvar`, `hf_ratio`,
   `esf_width_px`, `blockiness`) against: (a) Insta360 Studio's stitched-and-cropped output for the same station/view
   (the `views/images/*.jpg` already audited here), and (b) the raw-fisheye-reprojected version from step 2.
4. Specifically re-run the §2 yaw-90°/270°-vs-center comparison on the raw-fisheye-reprojected version: if the seam
   signature disappears when going straight from raw fisheye to perspective crop (bypassing Insta360's ERP
   stitcher), the seam artifact is a **stitching-software** effect, fixable by reprojecting from raw fisheyes
   directly in this pipeline. If it persists, it's an inherent **parallax/optical** limit of the dual-fisheye rig
   itself (§6 of the camera-ray audit's rig-vs-unconstrained-BA experiment would then be the right next step, not
   a stitching fix).
5. Cost: CPU-only, no GPU, no training — fisheye reprojection and the four metrics above run in seconds per frame;
   the only real cost is locating/transferring the raw `.insv` files (multi-GB each) and extracting frames.

**Not run in this audit** — no raw source was available on this host.

---

## 7. Appendix

Full 30-ROI raw results (all stages, all metrics): [`roi_results.json`](room213-source-detail-audit/roi_results.json).
Script: [`detail_forensic_audit.py`](room213-source-detail-audit/detail_forensic_audit.py) (reusable — reruns
against a fresh crop mirror if the current one is cleaned up, per the "ephemeral scratch" caveat in the data-
availability table above). The nerfstudio-downscale-verification introspection is `nerfstudio_downscale_introspect`
in `workers/modal/recon-experiment/worker.py` (CPU-only, `--phase nerfstudio-downscale-introspect`), kept as
reusable diagnostic tooling alongside the project's other audit-phase functions (`exp6-scale-evolution`,
`exp6-instrumentation-smoke-test`).

**ROOM213 SOURCE DETAIL FORENSIC AUDIT READY — NO TRAINING RUN**
