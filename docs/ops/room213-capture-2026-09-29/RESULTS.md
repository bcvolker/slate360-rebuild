# Room 213 new capture (2026-09-29): running results

This is a live ledger. Each condition gets added here as it finishes.
Protected references (never modified):
- **Golden PLY:** 7e7b5d18…
- **R213-OFFICIAL-REF:** 0053c500…

## Stage 0: CLOUD_INGEST_VERIFIED
- All 32 of 32 originals were re-hashed in the cloud with SHA-256; every size and hash matched (14,395,147,415 bytes). The laptop may be disconnected.
- iPhone photos from capture 2a44da14 (9/21): 419 of 419 copied, sizes matched against the database, SHA-256 recorded.

## Stage 1: classification
Details are in `capture_manifest.json` and `source_probe.json`.

| File | Role | Notes |
|---|---|---|
| 079 | **A** (primary) | 256 s, ~1/128, full pass |
| 077, 078, 080 | A+ | 1/200; 080 is a low viewpoint |
| 092 | E | Timelapse, held |
| 11 × 72MP JPEGs | B stills | In-camera stitched |

- The DNGs are raw files of the stitched panorama, so Spirula cannot use them.
- On matched content, the faster shutter showed no material difference in detail or noise.

## Condition A: 079 only, official Spirula v2026.9.24, unchanged defaults

**Reconstruction**
- 1016 of 1020 frames registered.
- 665k points.
- Mean reprojection error 1.13 px (reference: 1.28 px).
- 1M splats, trained in 2866 s.

**Alignment to the official reference**
- 503k points within 3 cm; median 1.4 cm.
- Scale 0.997.
- A static-only ICP fit and a brute-force offset search both confirm the alignment.

**Visual result**
- **Against its own 9/29 source frames** (`A/A_lineage_*.jpg`): faithful. Mid-band NCC is about 0.87–0.91 on the ceiling, chairs and table.
- **On the 9/21 walk path** (`A/walk_all_small.jpg`, `A/A_walk_00200_half.jpg`): not better than official. Chairs are smudged, tables are streaky, and one window is smeared.
- **Confounds:** A is a single pass with 1020 frames (official has 1694), and the walk path lies off A's trajectory. The furniture was rearranged and the light is warmer on 9/29, so the locked 9/21 comparisons are only valid for static architecture.

**Verdict:** A alone does NOT beat R213-OFFICIAL-REF.

## Condition B: 11 X4 72MP panoramas alone (equirectangular, official `--data-type individual`)
- SfM registered only 4 of 11 stills (227 points). This is PARTIAL and not trainable.
- This is a limitation of the official workflow. As briefed, no custom conversion path was built.

## X4-only hybrid registration gate (AX6 = A + 6 panoramas, official workflow)
The panoramas were added as a third camera (`EQUIRECTANGULAR` 11904×5952) through the official `--manifest` camera prefix. All of A's SfM flags were unchanged.

**Selected panoramas:** 083, 084, 086, 088, 089, 091.

**Registration**

| Check | A | AX6 |
|---|---|---|
| Images registered | 1016/1020 | 1022/1026 (all 6 stills) |
| Points | 665k | 661k |
| Reprojection error (mean / median) | 1.134 / 0.974 px | 1.140 / 0.981 px |
| Rig relative rotation | Exact | Exact |
| Rig baseline | 2.79 cm | 2.80 cm |

**Stability of A's video cameras** (after similarity, scale 1.002)
- Median shift 0.6 mm, p95 2.5 mm, maximum 7.9 mm.
- Rotation median 0.02°, maximum 0.11°.

**Per-still tie strength**

| Still | Observations | Shared with video tracks | Median track length |
|---|---|---|---|
| 083 (~1.8 m high) | 203 | 75% | 4.0 |
| 084 (~1.8 m high) | 244 | 79% | 4.5 |
| 086 | 584 | 100% | 5.0 |
| 088 | 676 | 100% | 13.0 |
| 089 | 814 | 97% | 10.0 |
| 091 | 809 | 97% | 5.0 |

**Verdict: HEALTHY.** The stills tie into the video tracks rather than forming a separate island, and A's geometry did not move.

AX6 training was spawned with the same `360-camera` defaults.

### AX6c: the trained X4-only hybrid (clean rerun)
- **Why a rerun.** The first AX6 train failed at startup: linking A's frame folders (instead of copying them) dropped `.jpg` from the SfM image names. AX6c copies the frames byte-for-byte and runs the unchanged official workflow.
- **SfM.** 1024/1026 images registered: video 1018/1020, stills 6/6. 668k points, 1.137 / 0.977 px (mean / median). Trained 1M splats in 1749 s.
- **Alignment.** 504k points within 3 cm of the official reference, median 1.4 cm, which is the same as A.
- **9/21 walk path** (`walk_official_golden_A_AX6c_C.jpg`, `AX6c/walk_crop_00200_*`): visually the same as A. No visible gain.
- **Lineage at A's own source frames.** Same as A (mid-band NCC: ceiling 0.90, chairs 0.91, table 0.88).
- **At the 6 panorama stations** (`stations/`): 5 views per station (4 headings + 1 looking 25° down), 1280×720, each compared to the rectified 72MP panorama.

  | Model | Median mid-band NCC | Median fine-band energy |
  |---|---|---|
  | A | 0.63 | 0.60 |
  | AX6c | 0.68 | 0.60 |
  | Official | 0.28 | — |
  | Golden | 0.26 | — |

  - AX6c is slightly better on structure; visually it is indistinguishable from A. Fine-band energy is unchanged at about 60% of the panorama. AX6c was trained on these exact panoramas, so this is a best-case view for it.
  - Official and Golden score low mainly because of the day change (furniture, light). The stations also sit about 0.85 m high, below the 9/21 pole height, so they are off Official/Golden's trajectory.
  - A and AX6c are visibly sharper than Official at these low positions (carpet, door). That reflects capture viewpoint, not the method.
- **Verdict: AX6c ≈ A.** The 72MP panoramas register natively and do no harm, but they add no visible detail.

### Condition C: 419 iPhone photos (9/21), official `--data-type individual`, default opencv lens
- **SfM.** 419/419 registered, 412k points, 0.95 px mean. Trained 1M splats in 1515 s.
- **Frame is not metric.** No telemetry: gauge "metric 0, up cameras+exif". Needed a non-metric alignment.
- **First alignment slipped one window bay** (about 1.5 m; `C/C_align_bayslip.json`, `C/C_topdown.jpg`).
  - Found with the D1 photos, which register independently against metric A.
  - Re-anchored on those 5 photos and ICP-refined (`eval/align_C_anchor.py`): 82% of points within 3 cm, median 1.8 cm.
- **Verdict: C < Official, clearly.** On the 9/21 walk it shows large black holes where the iPhone walk didn't cover, plus smeared chairs and floaters.
- It fits its own photos well (lineage NCC 0.84–0.92), but it isn't a candidate.

### D1 registration gate: A + 5 iPhone photos from 9/21, official workflow, iPhone camera = opencv
- **Photo selection.** The first target-based picks were near-duplicates and were replaced by 5 spread-out photos (`D1_pick.json`), chosen by farthest-point sampling over position and heading among the photos with the most points.
- **Registration.**
  - 1021/1025 images registered, including the iPhone photos at 5/5.
  - The iPhone focal length was estimated from scratch at 2761 px (C found 2860).
  - 100% of each photo's observations are shared with video tracks.
- **Stability of A's video cameras.** Median shift 0.8 mm, maximum 5 mm.
- **Verdict: HEALTHY.** Training spawned. The chairs are known to differ between days, and the lighting too; this is what D1 tests.
