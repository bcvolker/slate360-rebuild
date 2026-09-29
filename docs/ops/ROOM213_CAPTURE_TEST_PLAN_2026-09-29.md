# Room 213 — small controlled capture test (Phase 3 field plan)

**Purpose.** Measure source-quality headroom. Is the plateau the X4 video source, or the processing? This is a
benchmark, not a production capture design: no rig, no new hardware, and nothing is merged.

## The bay (one fixed physical region)

**Location.** The window-wall bay at the **back of the room** (the end opposite the whiteboard / door / lectern).
- Start at the back corner where the window wall meets the back wall.
- Cover **the first two windows** from that corner.
- Go **4.0 m** along the window wall and **3.0 m** into the room.

**Required content, all inside the bay:**
- one full window with its reveal;
- the first table row parallel to the window wall, with its chairs (chair backs and slats) and one table-top edge;
- carpet between the wall and the table row;
- the ceiling-grid tiles and one light panel above;
- the wall and baseboard under the windows.

**Keep unchanged:**
- time of day: shoot ~10:30–11:30, as on 2026-09-21;
- blinds in the same state;
- all overhead lights on;
- furniture where it is.

Tape a sheet of A4 paper flat on the table top as a scale/alignment target, and leave it there for all three sets.

## Station grid (shared by sets B and C; set A walks the same lines)

Mark the stations with small pieces of painter's tape on the carpet. Measure with a tape from the back corner.
- **X** = distance out from the window wall.
- **Y** = distance along the window wall from the back corner.

| station | X (m) | Y (m) | station | X (m) | Y (m) | station | X (m) | Y (m) |
|---|---|---|---|---|---|---|---|---|
| S1 | 0.8 | 0.5 | S5 | 1.6 | 0.5 | S9 | 2.6 | 0.5 |
| S2 | 0.8 | 1.5 | S6 | 1.6 | 1.5 | S10 | 2.6 | 1.5 |
| S3 | 0.8 | 2.5 | S7 | 1.6 | 2.5 | S11 | 2.6 | 2.5 |
| S4 | 0.8 | 3.5 | S8 | 1.6 | 3.5 | S12 | 2.6 | 3.5 |

- The **X = 2.6** line is **behind** the chair row; it looks toward the window over the chairs. If a table blocks a
  station, move it ≤ 0.3 m along Y and write down the move.
- **Two heights at every station: H1 = 1.0 m** (lens centre) and **H2 = 1.6 m**. That gives 24 stations.

## Set A — X4 VIDEO CONTROL (same method as 2026-09-21)

- **Camera settings:** X4 in 360 video, **same mode as the original .insv (8K/5.7K, 30 fps)**, same exposure
  behaviour. High shutter if you set it before (≥ 1/120); otherwise leave auto as originally.
- **Mount:** selfie stick, as before.
- **Pass:** walk slowly (~0.3 m/s) along the three station lines X = 0.8, 1.6 and 2.6. Walk the full Y = 0.5 → 3.5
  and back. Do it at H2 = 1.6 m, then repeat all three lines at H1 = 1.0 m. About 2–3 minutes in total.
- **Record:** keep the original `.insv` + `.lrv`. Do not export or stitch.

## Set B — X4 HIGH-RESOLUTION STOPPED STILLS

**Settings:**
- X4 **Photo** mode at the **highest resolution (72 MP)**.
- **File format: RAW (DNG) + INSP** if offered. **NOT JPG-only**: the 2026-09-21 stills were in-camera-stitched
  5888×2944 JPEGs, which is exactly what we must avoid.
- **HDR / PureShot OFF**, so each still is one exposure.
- Fixed exposure if the app allows: ISO 100–200, shutter 1/60–1/120, WB fixed ~5000 K.
- **3 s timer.**

**Mount:** a **tripod** (or a light stand) with the camera on the stick, at the station height.

**Procedure:**
1. Place the camera at each of the 24 stations (12 × H1/H2).
2. Start the 3 s timer and step **behind the far table row / out of the bay**. You will still be in the 360 shot;
   that is fine, you are masked. Stay still until the shot finishes.
3. Oblique coverage comes automatically with a 360 camera.
4. Add **4 extra stations** tilted 30° down toward the carpet/baseboard at X = 0.8, Y = 1.0 / 3.0 (both heights).
   These give grazing views of the carpet and baseboard.

Expect ~28 stills.

## Set C — IPHONE HIGH-RESOLUTION STILL CONTROL

**Settings:**
- Main (1×) camera, **48 MP** (ProRAW Max or HEIF Max 48 MP).
- **Exposure/focus locked:** press and hold AE/AF lock on the wall, then leave it locked.
- Live Photo off, Night mode off, no zoom, no ultra-wide, no portrait.
- Tripod or braced handheld at a fast enough shutter.

**Views:** at each of the 12 stations, at **both heights**, shoot **5 views**:
1. straight at the window wall;
2. 35° left of it;
3. 35° right of it;
4. tilted up ~45° at the ceiling grid;
5. tilted down ~45° at the carpet / table edge.

Keep ≥ 60–70 % overlap between neighbouring shots. Expect ~120 photos.

**Close detail passes** (count as part of C):
- chair slats from 0.6 m;
- table edge from 0.5 m;
- window reveal from 0.8 m;
- baseboard from 0.5 m.

Take each **at 3 angles**.

## Hand-off

Put the three sets in one folder, with the originals untouched:
- `SetA_video/`
- `SetB_x4_stills/`
- `SetC_iphone/`

Send a note with any station that had to move. We upload, hash and process them.

## Set D — HYBRID processing condition (added 2026-09-29; no extra capture)

**Question.** Can the X4 video remain the fast primary capture while a small detail-photo pass restores fine texture?
Set D uses only material already captured in A and B/C; the physical plan is not expanded.

**Inputs.** Set A's X4 video (official workflow, as in Phase 1) plus a **deliberately small detail subset** of the
high-resolution stills. Start with the minimum useful subset, the iPhone close detail passes, in this order:
1. chair slats;
2. window reveal;
3. table edge;
4. baseboard / carpet;
5. ceiling grid.

That is about 15 photos (3 angles per feature), not all ~120.

**Prerequisite — check it first, and ABORT D if it fails.** Joint SfM (Spirula `sfm auto`, official flags) must show
all three of:
1. **separate cameras / intrinsics** for the iPhone images (their own folder camera, not an X4 fisheye model);
2. **joint registration** of the detail photos into the X4 model (all or nearly all registered, sensible reprojection
   error);
3. the **X4 rig solution uncorrupted**: dual-fisheye rig relative pose, camera count, per-lens intrinsics and X4
   reprojection error unchanged within tolerance vs the video-only Set A solve, and the X4 camera centres aligned to
   Set A within ~1 cm.

Training: same `360-camera` recipe, same 1 M cap and 30 k iterations.

**Decision criterion (A/B/C/D alike):** visible photographic fidelity and temporal stability at ordinary viewing
scale, plus preservation of genuine source detail at 1:1. Not Gaussian count or training PSNR.

## Processing (Phase 4 — defined now, run only after the capture)

- **Workflow:** all three sets go through the **same reference workflow** as the Phase 1 run: official Spirula
  Studio release v2026.9.24.
- **Frames and masks:** built-in extraction/masking for video; images as-is for stills; SAM masking of the operator
  for A and B.
- **Cameras:** Spirula SfM with **its own camera estimation per set**. X4 intrinsics are never reused for the iPhone.
- **Training:** the identical `train 360-camera` recipe for all three sets. Its pinhole warp is a no-op for iPhone
  images, so the recipe is truly identical.
- **Budget:** the same 1 M Gaussian cap and 30 k iterations for every set.
- **Renderer:** the same, for all comparisons.
- **Comparison cameras:** the three reconstructions are aligned with a similarity fit on the A4 target and
  shared-bay SfM points. Then the same pinhole views are rendered: 1280×720, 62° field of view, 6 feature targets
  plus 2 ordinary bay overviews.
- **Metrics:** SOURCE → native render is measured per set with the same definitions as the 2026-09-28 sheets.
