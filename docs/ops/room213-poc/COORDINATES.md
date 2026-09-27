# Room 213 POC — authoritative presentation coordinates

Source of truth: `scripts/ops/room213_presentation_data.py` → `lib/room213/presentation-data.json`
(run on the golden PLY, sha256 `7e7b5d18af92d5f4b751977d6d96f2251b896c46f1dbb37d356eed3dd0823a62`, 996,092 splats).
All inclusion tests use **Gaussian centres** — the same thing Spark's SDF edits evaluate.

## Frames

| Frame | Definition | Used for |
|---|---|---|
| **F** file | The golden PLY's own coordinates. | Spatial pin anchors (`source_frame: "file"`, bound to the sha). |
| model transform | `FLIP = diag(1,−1,−1)`: the viewer's π-about-x mesh rotation. | — |
| levelling | `R_corr` = manifest `correction_quaternion` (0.0228, 0, 0.00017, 0.99974) ≈ 2.6° about x. | — |
| **V** room/viewer | `V = R_corr · FLIP · F`. y up, walls axis-aligned. | Crops, cameras, walkable area, bounds. |

The crop/edit frame **is V**. Verified on screen on 2026-09-27 in the POC viewer (SparkRenderer at the scene
root, edits parented to the levelling group): keeping x < 0 removes the +x side; keeping z < 0 keeps the half that
Plan shows at the top (screen-up = −z); a y band of −1.95…−1.65 isolates the carpet.

## Bounds (V)

| Name | Value | Meaning |
|---|---|---|
| Room shell | x −6.21 … 4.97, y −1.81 (floor) … 0.67 (ceiling), z −3.69 … 4.39 | Wall/floor/ceiling density peaks (opacity > 0.3). |
| Presentation (tier 1) | room shell + 1.0 on every side | Kept in Walk. Hides 35,764 splats. |
| Dollhouse/Plan | walls + 0.2 in x/z, floor − 1.0, top cut at y 0.1 | Exterior views: open top, window/exterior halo removed. |
| Walk ceiling hidden | tier 1 with top at 0.45 | Optional (default: ceiling shown). |
| Navigation | walkable grid (0.1 cells): inside walls − 0.4, minus furniture footprints dilated 0.3 | UX/collision aid only, not survey geometry. |
| Source bounds | manifest `bounds` (percentile), unused at runtime | Nothing at runtime scans the million splats. |

## Reconciliation of earlier numbers

Every earlier count was correct for **its own** box. They disagreed because three different boxes, in two frames,
were quoted side by side:

| Count | Box | Frame |
|---|---|---|
| 35,371 (+1.0) / 46,884 (+0.35) → shell 11,513 | Report-2 walls x −6.0/5.0, file z −4.58/3.88, file y −0.67/+2.0 | F (≡ flip-only, no levelling) |
| 35,698 (+1.0) / 46,119 (+0.35) → shell **10,421** | ad-hoc walls −6.05/4.97, y −2.1…0.675, z −3.69/4.39 | V |
| **35,764 (+1.0) / 48,691 (+0.35) → shell 12,927** | authoritative room shell above | V |

- "~11,500 shell" was Report 2's shell quoted against my box. That was a mixing error. Astra's 10,421 is right for that box.
- **Wall intrusion:** the old live crop's +z edge was 4.375 against the +z wall peak at 4.39. That is **0.015**, not ~0.2; the 0.2 figure was a frame slip. It is obsolete now: the POC crop is rebuilt from the authoritative shell.
