# Twin 360 — Capture SOP (field guide)

Status: **ACTIVE** · Last updated 2026-07-25 · Owner: Brian

Read this before capturing. Reconstruction quality is decided at capture time far more than at
processing time — roughly 80% capture, 20% training knobs. Every item below is either a
documented engine constraint or practitioner consensus; where sources conflict it says so.

**Universal rules, all devices**
- **Slow beats sharp gear.** Motion blur destroys reconstruction faster than mild underlap.
- **Lock exposure and white balance.** Auto-exposure drift across a walk makes the solver bake
  lighting changes in as geometry — a primary source of floaters.
- **Cover from multiple heights and angles.** A single pass at one height cannot reconstruct
  walls, ceilings, and floors.
- **Never rely on glass or mirrors.** Reflection and transmission produce false geometry.
- **Close the loop.** Return near your start point so the solver can tie the ends together.

---

## iPhone (LiDAR) — interior walkthroughs

| Setting | Value |
|---|---|
| Walk speed | 0.5–0.8 m/s (slow stroll) |
| Corners / doorways | Pause ~1 s |
| Overlap | 70–80% |
| Exposure / WB | **Locked**. HDR off |
| Orientation | Landscape |
| Lighting | All lights on |
| Clip length | Under ~4 min per clip; use multiple clips |
| Clip-to-clip | Re-scan the last doorway/corner for 30–50% overlap; **hard floor ~20%** |

The app keeps one AR session alive across clips, so clips share a world origin and need no
registration — but only if you don't force-quit between them. If the HUD warns "Low overlap,"
back up and re-scan the area you just left.

---

## DJI Mini-class drone — exteriors

**Shoot stills, not video.** Rolling shutter on consumer drones is the dominant quality killer,
and stills are independently rejectable when one comes out blurry.

| Setting | Value |
|---|---|
| Overlap | ≥80% forward / 60–70% side (85/80 for best results) |
| Pattern | Nadir grid **plus** oblique facade orbits — nadir alone reconstructs walls poorly |
| Oblique angle | 30–45° gimbal pitch |
| Orbits | Low / mid / high rings around the structure |
| Shutter | Fast; fixed white balance |
| Altitude | Set from the ground resolution you need, not a fixed number |

If you must shoot video: slow, smooth flight, ~1/1000 s shutter, highest bitrate, then extract
1–3 sharp frames per second and discard fast turns and stationary stretches.

**Corners:** always fly past each corner so adjacent faces appear together in some frames.

---

## Antigravity A1 (360 drone) — exteriors only

| Setting | Value |
|---|---|
| Resolution | 8K/30 in daylight; 5.2K/60 when light is weak |
| Shutter | 1/2000 bright sun; 1/1000 overcast |
| Exposure | EV −0.7, auto ISO, **fixed white balance** |
| Codec | H.265, high bitrate |
| Low orbit | ~1–1.5 m AGL, close to walls |
| Mid orbit | ~2–3 m AGL, slightly wider |
| Roof | Overhead snake pattern |
| Context | Wide spiral descent at ~2× the building's extent |
| Clip | 3–5 min, return near the start before stopping |

> **Hard limitation:** the A1's obstacle avoidance **cannot be disabled**, forcing a 5–7 m
> standoff. Close-detail facade work is out of reach — treat it as a context/exterior tool, and
> capture facade detail with the phone or the Mini.

Its "30–50% overlap" guidance refers to adjacent lanes in continuous full-sphere video. That is
**not** the same measure as still-photo forward/side overlap — don't mix the two numbers.

---

## Insta360 X4 / X5 — interiors

| Setting | Value |
|---|---|
| Resolution | 8K/30 daylight interiors; 5.7K/60 under artificial light |
| Codec | H.265, high bitrate |
| White balance | Fixed |
| Standoff | 0.5–1 m from walls and objects |
| Walk speed | 1–1.5 m/s; slower in narrow or dim areas |
| Trajectory | Low / mid / high perimeter + a diagonal centre pass, then repeat mid-height in reverse |
| Clip | One continuous 2–4 min loop (up to 6 min acceptable) |

**Export rules — these matter more than the settings above:**
- **Prefer a stitched equirectangular export** (Insta360 Studio → equirect). Raw `.insp`/`.insv`
  are *dual-fisheye* — two circular images side by side, not yet stitched — and are a different
  projection entirely. The pipeline now accepts and reprojects them, but stitched equirect is the
  better-tested path; use raw only if you cannot stitch.
- If you must export stitched MP4: **Direction Lock ON** (preserves the spatial metadata), and
  **disable Horizon Leveling, Tilt Recovery, and Vibration Reduction** — stabilization warps
  equirectangular frames and injects geometric noise the solver cannot undo.
- Hold the camera overhead or on a pole. The system masks the nadir rather than cropping the
  floor away, so keep your body directly under the camera and consistent.

*Unresolved:* published guidance conflicts on shutter (1/500 vs 1/800–1/1000) and in-camera
sharpness (Low vs High). Both variants are on the benchmark list to test — until then, 1/500 and
Low sharpness is the safer default indoors.

---

## A note on panorama types

Not every 2:1 image is a full sphere, and not every 360 file is equirectangular:

| Source | What you get | How the pipeline treats it |
|---|---|---|
| Insta360 stitched export | Full 360×180 equirectangular, 2:1 | Reprojected as `equirect` |
| Insta360 raw `.insp` / `.insv` | **Dual-fisheye**, unstitched | Reprojected as `dfisheye` |
| DJI "Sphere" pano mode | Full equirectangular, 2:1 | Reprojected as `equirect` |
| DJI wide / 180° pano | 2:1 but *partial* coverage | Detected as 2:1 → treated as equirect; verify the result |
| Ordinary drone or phone photo | Rectilinear | Never reprojected |

The pipeline picks the projection from the file itself (extension for Insta360 raw, frame ratio
otherwise), so both a DJI sphere pano and an Insta360 file work without you flagging anything.
If a partial (non-spherical) panorama ever reconstructs badly, that is the case to report — it is
the one type aspect ratio alone cannot distinguish.

---

## Bridging drone exterior + phone interior

This is the hardest capture in the system and the one most likely to fail silently.

1. **Open all doors before you start** and don't move them mid-capture.
2. Approach the doorway **obliquely from several exterior positions** so the frame, jambs,
   threshold, and nearby ground appear from multiple angles.
3. **Walk the threshold continuously and slowly** — do not stop and start a new clip at the door.
4. Make sure transition frames **see into both spaces at once**.
5. Loop the entry vestibule before branching deeper inside.
6. Add **ground-level exterior passes with the phone or 360** that overlap what the drone saw.
   This is what actually bridges the aerial and ground viewpoints.
7. **Never bridge through a window.** Use the open door.

> Expect exterior and interior to register as separate blocks that are then aligned, not as one
> seamless solve. A peer-reviewed experiment using 360 imagery to bridge perspective blocks
> measured **4–6× worse metric accuracy** than perspective imagery — so use a panorama bridge for
> orientation and continuity, never as the source for measurements.

---

## What accuracy to promise

iPhone LiDAR is **estimating-grade, not survey-grade**. Published 2024–2026 studies cluster at
**RMSE ≈ 4–5 cm at room scale** (one façade study at 13.6 cm), against terrestrial laser scanners
at 1.4–4.5 cm. Error grows with distance and scan size; glass and reflective surfaces dominate it.

**Safe customer language:** "±2–5 cm typical at room scale. Verify long diagonals, openings, and
any fabrication-critical dimension with a laser measure." Never claim permit-grade or survey-grade.
