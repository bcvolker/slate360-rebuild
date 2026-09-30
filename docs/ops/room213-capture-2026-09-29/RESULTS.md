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
