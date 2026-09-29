# Room 213 — Stage 1 Spark delivery gate for the OFFICIAL reference model (2026-09-29)

## Classification: **SPARK_MINOR_DEGRADATION**

Spark **preserves** the official model's structural and coherence improvement at ordinary viewing scale:
- solid walls, straight window reveals;
- clean carpet at w_00000, where golden-in-Spark still shows the smeared patch;
- no stair-step edges.

One known discrepancy **remains**: extra fine grain on large flat walls. It is the same size as with golden, so it is
a property of the Spark path, not of the model. It shows as a faint stipple on white walls at ordinary scale.
Brightness shifts are small.

**Nothing was retrained, changed in Spark, merged or deployed.** Both models are frozen:
- official PLY sha `0053c500…47ba`;
- golden `7e7b5d18…3a62`.

## Method

**Spark path.** The **same production Spark path** used for golden:
- harness `workers/modal/room213-detail-diag/spark` (the app's `@sparkjsdev/spark` 2.1.0 and three 0.184.0);
- `cond=combined`, LoD off: `accumExtSplats` true, `blurAmount` 0, `preBlurAmount` 0;
- 1280×720 at DPR 1;
- each job in a fresh page, rendered after sort and hash settle.

The effective settings were read back from the renderer (`spk_official_combined_lod0__info.json`).

**Harness control.** Golden was re-rendered at the 12 locked views and came out **pixel-identical** to the earlier
golden Spark renders (max difference 0).

**Cameras.** Identical to the native official renders: the golden→reference similarity (10 same-instant pairs plus
ICP on 14,148 points, 5 mm median, scale 1.0293) recomputed locally, bit-for-bit the same fit
(`golden_to_ref_similarity.json`). Poses: `poses_official.json`.

**Native reference.** Spirula v2026.9.24's own render (`--init-ply`, 0 iterations) at the same cameras.

## Evidence — OFFICIAL native vs OFFICIAL Spark (same pixels)

| view | mid-band NCC (structure) | fine-band NCC | fine energy Spark / native | pixel MAD / RMSE | signed bias (B, G, R) |
|---|---|---|---|---|---|
| walk w_00000 | 0.984 | 0.88 | 1.08 | 2.6 / 3.5 | −0.3 / −0.2 / −0.2 |
| walk w_00200 | 0.990 | 0.95 | 1.11 | 2.5 / 3.6 | −0.2 / +0.2 / +0.1 |
| walk w_00400 | 0.987 | 0.92 | 1.14 | 2.5 / 3.5 | −0.8 / −1.1 / −1.2 |
| walk w_00600 | 0.990 | 0.95 | 1.05 | 3.1 / 4.2 | −0.0 / −0.5 / −1.0 |
| chair slats | 0.992 | 0.97 | 1.10 | 3.8 / 5.3 | +0.6 / +0.4 / +0.8 |
| ceiling grid | 0.990 | 0.91 | 1.08 | 2.6 / 3.6 | −2.1 / −1.6 / −1.8 |
| window reveal | 0.983 | 0.78 | 1.20 | 2.5 / 3.5 | −1.8 / −1.9 / −1.8 |
| carpet | 0.988 | 0.80 | 1.16 | 3.7 / 4.4 | −4.8 / −2.8 / −2.6 |
| **white wall** | 0.861 | **0.36** | **2.74** | 2.1 / 2.6 | −1.3 / −1.5 / −2.2 |

**Structure is preserved.** Mid-band NCC is 0.98–0.99 on every target and walk view. Fidelity to the source is
unchanged. Peak mid-band NCC vs the source, native → Spark:

| target | native → Spark |
|---|---|
| ceiling | 0.905 → 0.898 |
| window | 0.825 → 0.839 |
| chairs | 0.923 → 0.921 |
| carpet | 0.871 → 0.862 |

Ceiling edge 5.95 → 6.27 px (source 6.38); chair edge 4.23 → 4.05 px (source 4.25).

**Wall grain persists.**

| model | white-wall fine-band std, native → Spark |
|---|---|
| official | 0.42 → 1.16 |
| golden | 0.46 → 1.21 (earlier) |

- Source: 1.51.
- The official Spark grain is **not** native texture: fine NCC to native is 0.36.
- The official model's different primitive (3DGS rather than 3DGUT) did **not** remove it. The earlier attribution
  stands: splat-attached, Spark-side, cause not isolated.

**Gap to native, compared with golden.** The official native→Spark gap is **smaller** than golden's:
- walk MAD 2.5–3.1, RMSE 3.5–4.2, bias ≤ 1.2 levels;
- golden was MAD 3.9, RMSE 5.4, bias −2.7 to −3.6 full-frame, and −5 to −7 on the white wall.

**Visual** (`spark_walk_*.png`: native | Spark | golden-Spark context; `spark_target_*.png`: 1:1 source | native |
Spark | golden-Spark):
- Official-in-Spark keeps the clean walls and reveals and the uncorrupted carpet.
- Golden-in-Spark at w_00000 still shows the smeared carpet patch.
- The only visible Spark-added change is a faint grain on large white walls.

**Not tested here.** Spark motion stability. These are static settled frames; the iPhone motion dark-mark issue from
the POC was not re-tested with the official model.

## Stage 2 status

Spark does not block the reference. Per your instruction, the Phase-3 field capture plan is **approved as written**,
with processing condition **Set D (hybrid)** added to `ROOM213_CAPTURE_TEST_PLAN_2026-09-29.md`, including its
abort-first prerequisite. The physical capture plan is unchanged.

**Stopped here:** no reconstruction experiment was started. Awaiting review.
