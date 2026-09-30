# Room 213: stationary vs walking X4 video, from existing data only (2026-09-30)

**Scope:** no training, no capture, no Spirula changes.

- **Data:** tripod clip `VID_20260921_105956_00_020` vs walking clips `021` and `075`. All three are from 9/21 and all three are registered in one SfM, R213-OFFICIAL-REF.
- **Code:**
  - `workers/modal/room213-forensic/analyze_sv.py`
  - `insv_exposure.py` (trailer reader)
  - `prep_v6` / `native_orthos_v6`
- **Artifacts:** `docs/ops/room213-stationary-vs-walking-2026-09-30/`.
- **Cost:** CPU only, under $1.

## Classification: `VIDEO_INFORMATION_LIMIT_LIKELY` (at 1/320 s and 0.9–3 m)

At the same shutter and matched distance, stationary X4 video carries **no materially more** real, cross-frame-consistent detail than walking X4 video. What limits detail is per-pixel information (noise, codec, optics), measured in pixels, so the physically resolvable feature size grows linearly with distance.

**One qualification.** The 9/29 captures (A / A+ / AX6c) were shot at **1/100 s**, not 1/320. Their estimated motion blur is about 3× higher. I could not confirm the cost of that on the ground, because the cross-date comparison was blocked by rearranged furniture.

## 1. Is 020 genuinely stationary and comparable?

**Yes.**
- **Stationary:** the SfM camera centre stays fixed to within about 1 mm across each window. Placement 1 is 3.5–16.4 s, placement 2 is 23.5–35.4 s, placement 3 is 42.5–52.5 s. The placements are 1.1 m apart at a pole height of 1.57 m.
- **Comparable:** same X4 (serial IBMEA24069A4BV) and firmware (v1.9.21), same 8K dual-track 3840² HEVC, "standard" colour profile, same day, minutes apart.
- **Shutter:** read from the `.insv` trailers (record 4, one entry per frame):

  | Clip | Shutter |
  |---|---|
  | 020 | fixed 1/320 s |
  | 021 | fixed 1/320 s |
  | 075 | fixed 1/320 s |
  | 079 (9/29) | 1/100 s median (p10 1/200) |

  The 9/29 ledger's "1/128" was an average.
- **ISO:** not in the trailer records I decoded. Unknown.

## 2. Targets (fixed surfaces only, same day)

| Target | Surface | Seen by |
|---|---|---|
| **T_board** | ChArUco sheet on the front whiteboard (fixed for the whole 9/21 session) | all three tripod placements, at **0.87 / 1.99 / 3.12 m** |
| **T_floor** | carpet, z = 0 plane | tripod placements 1 and 2 |
| **T_ceiling** | tile + T-bar | tripod placements 1–3 |

No furniture was used. The tripod's other-lens crops outside the valid lens circle (masked out in training) were excluded after the contact sheets showed them.

## 3. Measurements

"Coherence" below is the median NCC per octave band on a shared ortho grid after sub-pixel registration. **Same-view** means tripod frames at an identical viewpoint, which measures pure repeatability (noise and codec) with no geometry involved.

| | T_board (0.5 mm texel) | T_floor (carpet) | T_ceiling (tile) |
|---|---|---|---|
| **Bands (mm)** | 0.5-1 / 1-2 / 2-4 / 4-8 / 8-16 | same | same |
| **Tripod, same view** | 0.41 / 0.62 / 0.83 / 0.95 / 0.92 | 0.17 / 0.33 / 0.67 / 0.91 / 0.97 | 0.00 / 0.00 / 0.01 / 0.01 / 0.24 (texture below noise) |
| **Tripod, cross view** | 0.19 / 0.37 / 0.68 / 0.92 / 0.90 | 0.18 / 0.33 / 0.62 / 0.89 / 0.96 | ≈0 |
| **Walking, cross view (scale-matched)** | 0.62 / 0.77 / 0.90 / 0.97 / 0.96 | 0.12 / 0.23 / 0.49 / 0.78 / 0.91 | 0.02 / 0.05 / 0.17 / 0.45 / 0.73 |
| **Tripod vs walking (scale-matched)** | 0.58 / 0.74 / 0.89 / 0.97 / 0.94 | 0.13 / 0.25 / 0.52 / 0.81 / 0.93 | 0.01 / 0.02 / 0.11 / 0.36 / 0.65 |
| **Local misregistration (median, train px)** | S1 0.76, S2 1.70, S3 1.07, **W 0.23** | S1 1.50, S2 0.19, **W 0.72** | S 2.9–6.4 (the tile-plane proxy is poor), W 1.13 |
| **Edge width 10–90% (train px)** | S1 2.4, S2 1.3, S3 1.6, W 2.1 | S 2.2–2.5, W 2.5 | the edge is physically about 8 mm wide in both |

**Matched viewpoints** (tripod placement vs the nearest walking frame looking at the same target):
- **Board, S1 (0.87 m) vs walking 0.30 m away (0.87 m):**
  - NCC **0.58 / 0.75 / 0.91 / 0.97**;
  - fine-band energy walking 11.3 / 17.4 vs tripod 10.4 / 16.0: **walking equal or higher**;
  - estimated walking blur 0.3 px.
- **Floor, S2 (1.66 m) vs walking 0.33 m away (1.95 m):** NCC 0.13 / 0.29 / 0.62 / 0.89 / 0.97, the same as tripod-vs-tripod cross view. Walking energy is 0.75–0.9× the tripod's, consistent with the walking frame being 17% farther away.
- **Board, S3 (3.12 m) vs walking (3.61 m):** the walking frame is softer. It is also 16% farther away.

**Motion** (from SfM poses at 0.5 s intervals; blur is an upper bound in lens-centre px, target at 1.5 m):

| Clip | Speed | Rotation | Blur p50 / p90 |
|---|---|---|---|
| 9/21 walks at 1/320 | 0.46–0.52 m/s | 6°/s median, 18–26°/s p90 | **1.5–1.6 / 1.9–2.4 px** |
| 9/29 079 at 1/100 | 0.44 m/s | 8°/s median, 28°/s p90 | **5.1 / 8.2 px** (it would be 1.6 at 1/320) |
| Tripod 020 | stationary | | ≈0 |

**Cross-date check** (same carpet patch in the 9/29 walk frames):
- At 0.69 px/mm, coherence was 0.19 / 0.34 / 0.64 / 0.92 / 0.98 with a 0.18 px offset. That is not worse in pixel terms than 9/21.
- The farther 9/29 views fell about 7 px off with no correlation, which is consistent with furniture occluding the patch.
- **Inconclusive:** the estimated 3× blur penalty is not confirmed on the ground.

## 4. Does the "2–3 training pixel" falloff hold?

**Partly: it depends on surface contrast, not on motion.**
- The finest band still agreeing at NCC ≥ 0.5, in training px:

  | Surface | Tripod | Walking |
  |---|---|---|
  | High-contrast print (board) | ≈0.5 px | ≈0.4 px |
  | Carpet | ≈1.1 px | ≈1.7 px |
  | Near-textureless ceiling tile | ≈2.3–2.8 px | 0.9 px, only because walking views were farther and the band sits on the T-bar |

- 10–90% edge widths are **1.3–2.5 training px at every distance**. The resolving limit is fixed in pixels.
- So the physically resolvable size ≈ (px limit) × distance / 859 px/rad:

| Distance | Training px size | Carpet-like texture needs (≈1.5–2.5 px) | High-contrast edge (≈0.5–1 px) |
|---|---|---|---|
| 0.9 m | 1.05 mm | 1.6–2.6 mm | 0.5–1 mm |
| 1.5 m | 1.75 mm | 2.6–4.4 mm | 0.9–1.8 mm |
| 2.0 m | 2.3 mm | 3.5–5.8 mm | 1.2–2.3 mm |
| 3.0 m | 3.5 mm | 5.2–8.7 mm | 1.7–3.5 mm |

- **For comparison, the 72 MP stills:** the unstitched photo lens is 1571 px/rad (1.46× the video's 1079), with 1331 px/rad training faces (1.55× the video's 859). On the 9/29 carpet the stitched panorama agreed with the video consensus at 0.62 in the 1–2 mm band, where video pairs managed 0.32.

## 5. Other stationary segments

None usable.
- The walking clips 021, 075 and 079 contain 0–0.2% near-stationary frames (<3 cm/s and <1°/s).
- The 9/29 timelapse 092 is stationary but in a different capture mode and not registered in any SfM, so it was not used.

## 6. What this means for the next physical step

- **A (motion is the limit):** not supported at 1/320 s.
- **B (video information limit):** supported. At matched distance, walking and tripod video match. Detail is set by pixels per mm (distance) and per-pixel quality.
- **Capture implication (recommendation, not yet approved):** the product capture should **lock the shutter at ≥1/320 s**, as on 9/21, not the automatic 1/100 s of 9/29.
- **The biggest in-product lever is camera-to-surface distance.**
- **SV adds little beyond what clip 020 already shows.** Keep 1–2 stationary positions as a sanity check at the locked shutter, or drop SV.
- **Add a close W pass** at 0.8–1.0 m from the target surfaces.
- **The home 6-photo `.insp` preflight is still the right next physical action.** It is cheap, has to happen before the S positive control, and the S control is still needed: it is the only condition that tests whether finer, consistent information becomes model detail.
