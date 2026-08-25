# Mapping the 360 video onto the LiDAR — what is left, in plain terms

*2026-08-25. Written because the next steps were unclear.*

---

## The problem in one sentence

To paint 360 footage onto the LiDAR mesh, we must know **where the 360 camera was standing,
in the same coordinate system as the LiDAR** — and the 360 camera records no position at all.

The iPhone knows where it was every moment (ARKit tracks it). The Insta360 does not. It
records pictures and nothing about where it was when it took them.

---

## What changed on 2026-08-25, and it is a big deal

On this capture, the phone and the 360 camera were **mounted together on one pole and walked
through the space at the same time.**

That was not asked for, and it makes the problem dramatically easier.

**Before** — two separate walks, different routes, different times:
> "Where was the 360 camera in each of ~400 frames?" — 400 unknowns, solved by matching
> pictures to pictures, which fails on painted walls.

**Now** — one rigid pole, one walk:
> "The 360 camera is bolted a fixed distance above the phone. What is that fixed offset?"
> — **one** unknown, reused for every frame.

The phone already knows its position 387 times along the walk. If the 360 camera is rigidly
attached, its position is the phone's position plus a constant offset. Solve that constant
once, and every 360 frame is placed.

This is how professional rigs work: a known geometry, not clever image matching. **It is
roughly the difference between solving four hundred puzzles and solving one.**

---

## What is still missing, and why

Two unknowns remain.

### 1. Time alignment — which 360 frame matches which phone moment

Both devices recorded, but they were started separately and their clocks do not agree. We know
the phone's position at each of its timestamps, and we have 360 frames at their own timestamps
— but not which lines up with which.

**How it gets solved:** both devices recorded the same physical motion. When the pole turned a
corner, the phone's tracking recorded a turn and the 360 camera's internal motion sensor
recorded the same turn. Line those two motion signals up and the time offset falls out —
the same way you sync two video tracks by their audio.

**What this needs:** reading the motion data out of the `.insv` file. It is in there — the
file format has a section for it. We have confirmed the file structure is present on your
actual captures, but not yet read the motion data itself. The tool for it (`telemetry-parser`,
open source and commercially usable) needs a build dependency added to the processing image.
About an hour of work.

### 2. The rig offset — how the camera sits relative to the phone

How far above, how far forward, and which way it faces relative to the phone.

**Two ways to get it, and the first is better:**

**a. Measure it.** With the phone and camera in the mount, measure the vertical distance
between the phone's rear camera lens and the centre of the 360 camera. A tape measure and two
minutes. Also note whether the 360 camera faces the same way as the phone or is rotated. **If
you always use the same mount, this is measured once, ever.**

**b. Solve it.** The maths can recover it from the data — it is a standard problem called
hand-eye calibration. But a measured number is a check on the solved one, and having both is
how you know it worked.

---

## What you can do, in order of value

### 1. Measure the mount — 2 minutes, once

With the phone and 360 camera in the pole mount as you use them:

- **Vertical distance** from the centre of the phone's rear camera to the centre of the 360
  camera. To the nearest half-centimetre.
- **Forward/back offset**, if the camera is not directly above the lens.
- **Rotation**: does the 360 camera's front face the same direction as the phone's rear
  camera, or is it turned?
- **A photo of the assembled rig** from the side and from above.

That single measurement turns a hard estimation problem into arithmetic. It is the highest
value two minutes available on this project.

### 2. On the next capture, add a sync gesture — 2 seconds

With **both devices already recording**, give the pole one sharp twist — about a quarter turn
and back, quickly. Then walk normally.

That produces a sharp, unmistakable spike in both devices' motion records, which makes time
alignment trivial and verifiable rather than inferred. Two seconds at the start of every
capture.

### 3. Keep doing exactly what you did this time

Both devices on one pole, recording together, one walk. That is the right method and it should
become standard.

---

## What happens on my side

1. **Read the 360 motion data** — add the parser to the processing image. ~1 hour.
2. **Solve the time offset** by correlating motion between the two devices.
3. **Apply the rig offset**, measured or solved, to place every 360 frame.
4. **Verify before trusting it** — check that the placement agrees with the parts of the mesh
   the phone already textured well. If the 360 says a cabinet edge is somewhere the phone says
   it is not, the alignment is wrong and gets rejected rather than painted.
5. **Paint the 360 detail** onto surfaces, using the existing texturing.

**Realistic expectation.** With a rigid mount and a sync gesture, this should work. Without a
measured offset it can still be solved, but with less certainty and no independent check.

**What it will and will not fix.** It adds sharper detail on surfaces the phone saw poorly —
ceilings, upper walls, anything grazed at an angle. It does **not** create geometry. Glass,
mirrors, and anything the LiDAR never reached stay as they are.

---

## The other thing worth doing first

The 2026-08-25 capture came back **37.3% untextured**, up from 14.2% — because on the pole the
phone's camera saw proportionally less of what the LiDAR measured.

There is a fix that needs no 360 work at all: **the phone's own video.** It recorded 231
seconds of video, roughly 6,900 frames, against 387 depth keyframes. Those frames are already
uploaded and unused.

That is likely a bigger improvement than the 360 fusion, it needs no new capture, and it works
on every scan already taken. **It should come first.**

---

## For a 360-only capture, with no LiDAR

For the drone, or any site where only 360 footage exists, this is a **different pipeline**, not
a variation of this one.

With no depth sensor there is no measured geometry, so it cannot be a measurable twin. The
options are a navigable 360 tour — which needs no geometry and is straightforward — or
photogrammetry from the 360 video, which produces geometry of unknown scale unless something
of known size is in the scene, and is the approach that already failed once on interiors.

**The honest answer:** 360-only should be sold as a *tour*, not a twin, unless there is a
separate source of scale and geometry. That is a real product with real buyers, and it is far
better than a twin nobody can measure.

---

## MEASURED RESULT — video texturing, 2026-08-25

Four AI platforms independently recommended "use the unused iPhone video frames
first," ahead of any 360 work. It was built (`video_texture.py`, M7-C), deployed,
and run against the 2026-08-25 kitchen (capture `45daa2c3`, 387 keyframes, 231 s).

**The recommendation was the wrong priority. The real defect was a truncation bug.**

| run | frames used | views/vertex | untextured |
|---|---|---|---|
| before | 200 | 21.1 | **37.3%** |
| stills, truncation fixed | 387 | 29.5 | **20.0%** |
| stills + video | 784 (397 video) | 63.0 | **19.7%** |

`bake_vertex_colors` capped frames at 200 by *truncation* — `frames[:200]`. Frames
arrive in capture order, so it kept the start of every walk and discarded the end.
Fixing that one line, with no video involved, cut untextured from 37.3% to 20.0%.

Adding 397 posed video frames on top bought **0.3 percentage points**, for roughly
3x the texture compute plus a 135 MB download and an ffmpeg decode.

### Why video cannot help coverage — this is structural, do not retry it

A video frame is posed by interpolating between the keyframes bracketing it, and it
is only accepted when those keyframes are close in space (12 cm / 12 deg). So every
accepted video frame sits *between two keyframes*, metres from nothing the keyframes
did not already see. It adds view density, not view angles.

The frames that would add coverage are exactly the ones in the wide-motion gaps —
and those are correctly rejected, because there we do not know where the camera was.

Confirmed by where the remaining grey actually is: spread evenly across every height
band of the room (15–30% per band, top quarter holds 38.6% of it). It is not a
ceiling problem or a floor problem. It is surface no camera was ever pointed at —
occluded backs of cabinets, behind fixtures, wall exteriors the TSDF closed over.

### Standing conclusions

1. **Video texturing stays OFF by default.** It is opt-in via `videoKeys` in the
   `interior` payload; the in-job track does not pass it. Do not enable it for the
   0.3 points. It remains built and deployed for the case where stills are missing.
2. **The remaining ~20% will not be closed by post-processing.** It closes by
   capture technique (point the camera at what must be textured) or by a genuinely
   new viewpoint — which is what the 360 camera is actually for.
3. A time-based gate on pose interpolation is wrong. Measured on this capture,
   brackets longer than 1 s carry a median **29.5 cm** of travel while brackets
   under 0.3 s carry 8.2 cm. Gate on motion.
