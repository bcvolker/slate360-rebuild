# Interior Capture SOP — the highest-leverage thing you can do

One page. Follow it and the twin gets better than any code change we have queued.

**Why this document exists:** the kitchen twin's remaining roughness — streaked walls, the
"melting" left wall, the jagged arch — is sparse and low-confidence depth, not a processing
bug. The walk was one pass at normal speed. The LiDAR reaches ~5 m and degrades badly at
grazing angles, so a wall glanced at from across the room is measured far worse than one
walked past at a metre. No amount of code recovers a surface the sensor barely touched.

## Why tuning cannot substitute for this (measured 2026-08-22)

Four TSDF settings run on the same kitchen capture:

| voxel / min confidence | coverage | fusion residual median / p95 | untextured |
|---|---|---|---|
| **12 mm / conf >= 1 (default)** | 1.030 | **23.4 / 172.8 mm** | 14.2% |
| 12 mm / conf >= 2 | 1.007 | 32.1 / **480.2 mm** | 7.3% |
| 8 mm / conf >= 1 | 1.030 | **21.4 / 161.3 mm** | 16.2% |
| 8 mm / conf >= 2 | 1.025 | 30.6 / 483.3 mm | 9.4% |

Filtering to high-confidence depth only made it **worse** — p95 residual nearly tripled,
because discarding that much depth leaves the mesh not covering regions the LiDAR genuinely
measured. That was the leading theory for the streaked walls and it is wrong.

Halving the voxel bought ~9% on median residual and cost 2 points of untextured coverage.
Real, but modest, and the residual stays near two voxels whichever way it is set:
**resolution-limited, not error-limited.** The capture is the lever.

---

## Before you start

- **Lock exposure and white balance.** Auto-exposure between frames makes texture blend badly
  and hurts feature matching later.
- **Charge both devices.** A session that dies mid-walk is a lost capture; ARKit does not
  resume into the same frame.
- **Turn lights on. All of them.** Flat, bright, even. Dark corners are where depth
  confidence dies.

## The iPhone LiDAR walk — this makes the geometry

1. **Start recording a video clip.** Depth only accumulates while recording. This has bitten
   us before — the capture screen can look right while no depth is written.
2. **Walk at 0.5–0.8 m/s.** Slower than feels natural. Roughly one step per second.
3. **Stay 0.5–1.0 m from the wall you are measuring.** This is the single biggest factor.
   Do not measure a far wall by looking at it from across the room — walk over to it.
4. **Pause ~2 seconds at every corner**, facing into the corner. Corners are where planes
   meet, where the floor plan gets its geometry, and where a clean gravity reading comes from.
5. **Sweep the phone up and down** as you walk — the ceiling needs the camera pointed at it,
   not just the LiDAR near it.
6. **Close the loop.** Finish by walking back through where you started, past the same
   corner. This is what lets drift be detected and corrected.
7. **Two heights if the room is tall** — one at chest height, one lower for under-cabinet
   and toe-kick detail.

Target for a kitchen-sized room: **4–6 minutes**, not 90 seconds.

## The 360 walk — this adds texture detail, not geometry

Same visit, immediately after.

1. **Same route as the phone walk.** Different routes are why fusing them is hard.
2. Camera on the pole, **high pass first** (above head height). This sees ceiling and upper
   walls the phone struggles with.
3. Same 0.5–0.8 m/s, same pauses at corners.
4. **Walk behind the pole, never beside it.** You are always in the nadir; that is maskable.
   Beside the pole you are on a wall, which is not.
5. Close the same loop.
6. **Keep the raw `.insv` file.** Do not export from Insta360 Studio for us — export applies
   stabilisation that rewrites orientation and can strip the telemetry we need.

## Two things that cost nothing and are expensive to add later

These are about *observations*, not processing. Maths can be applied retroactively;
observations cannot be recovered.

1. **Sync gesture.** With both devices recording, give the pole one sharp rotation, or clap
   in view of both. Two seconds. It is what lets the two captures be time-aligned later.
2. **Note one anchor point.** Anything that fixes the building on Earth — an RTK point, a
   printed control marker, or just letting the phone take a GPS fix outside the front door
   before you go in.

## If the site is bare drywall (new construction, classrooms)

Painted walls have almost no features. Matching there is genuinely hard, and this is the
cheapest fix available:

- **Print three AprilTags on A4 paper** and tape them to different walls at different
  heights. They cost nothing, they are unmistakable to a camera, and they do not care that
  the wall is featureless. Remove them after the scan.
- Aim the walk so every pass sees a doorway, window, cabinet run or outlet — the structure
  is what carries the alignment, not the paint.

## What good looks like when you get back

The processing reports these. If they are off, re-scan rather than shipping:

| check | good |
|---|---|
| COVERAGE-1 ratio vs the LiDAR cloud | ≥ 0.7, ideally ~1.0 |
| Storey height vs a standard (8/9/10 ft) | within ~5 cm |
| Fusion residual, median | under ~25 mm |
| Untextured vertices | under ~15% |

## What this will not fix

- **Glass and mirrors.** The LiDAR sees through or past them. They stay wrong or absent, and
  that is a sensor limit, not a setting.
- **Anything past ~5 m** with nothing between you and it.
- Matterport Pro3-grade geometry. That is a survey-grade laser. This pipeline is
  estimating-grade, which is what is being sold — a laser governs.
