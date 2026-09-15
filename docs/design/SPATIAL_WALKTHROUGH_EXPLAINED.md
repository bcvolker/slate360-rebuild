# What a Spatial Walkthrough is — and how it's different from a 360 video, a Gaussian splat, and photogrammetry

Audience: Brian, and any agent (Cursor, Claude, or a future contributor) picking up this codebase. This is the concept document — read it before touching `lib/spatial-walkthrough/**`, `components/client-experience/**`, or anything under `docs/ops/spatial-media-delivery/`. It explains what we're building, why it's a distinct thing from the three technologies people usually confuse it with, how the operator gets removed from the final product, and why a contractor would pay for this.

---

## 1. The one-paragraph version

A **Spatial Walkthrough** is a recorded 360° video walk through a real space, turned into something a client can *navigate* — not just watch. The client drags to look around, scrubs a timeline to move through time, clicks a path marker to jump to a location, opens documents and RFIs that are pinned to exact spots in the space, and compares one visit against another. It is built from ordinary 360 video (an Insta360 X4 on a pole, or a 360 drone flight) — no LiDAR scanner, no photogrammetry rig, no reconstruction required. And critically: the person who captured it is never visible in the delivered product, achieved by *excluding* a region of the sphere from view, not by painting over them.

That's the whole idea. Everything below is detail.

---

## 2. Why this gets confused with three other things

People hear "360 walkthrough" and assume it's one of these. It's none of them, and the differences matter commercially, not just technically.

### 2.1 Plain 360 video (what you'd get from just uploading to YouTube 360 or Kuula)

A 360 video is a sphere of pixels per frame. You can look around while it plays. That's it. There is no concept of "this is Room 205," no way to jump to "the RFI location," no way to compare two visits, no way to attach a document to a spot in the room. It's a video with a mouse-drag camera. Slate360's Spatial Walkthrough *starts* from a 360 video — the raw capture is identical — but everything after that is new: naming time ranges as spaces, placing waypoints, pinning items and documents to exact yaw/pitch/timestamp coordinates, and giving the client a navigation layer on top of the footage.

### 2.2 Gaussian splat ("Reality" / "Twin" in this codebase)

A Gaussian splat is a *reconstruction* — millions of small 3D blobs (splats) fitted to a set of photos or video frames so that a computer can render the scene from **any** camera position, not just the positions where footage was recorded. This is what lets a "Twin" viewer do things a video walkthrough cannot: fly to a spot the camera never stood at, view the room from above (dollhouse), or view it top-down as a floor plan. It requires real reconstruction compute (Modal GPU workers, `workers/modal/twin-gaussian-splat/`), takes 20–40 minutes to process, and its accuracy is capped by how well the underlying geometry is understood — splats alone are **not** measurement-grade. Locked project rule: *"Geometry is measurement truth. Gaussian is appearance."* Measurements are taken against a LiDAR-derived mesh (TSDF), never against splat centers.

A Spatial Walkthrough needs none of this. It is not a reconstruction. The client can only look around from the positions the camera actually walked through — which is exactly what real estate tours, insurance documentation, and progress photos have always needed. This is also why it's fast: no GPU training job, no PSNR quality gates, no "did the reconstruction converge" risk. The video decodes and plays. It is either recorded well or it isn't.

### 2.3 Photogrammetry

Photogrammetry stitches many overlapping still photographs into a 3D mesh or point cloud, using structure-from-motion to solve camera positions. It needs dozens to hundreds of photos with real parallax between them (the AOB205 project's own locked lesson: *"walking parallax is the geometry source; stationary 360 stills are not"* — twenty stationary 360 stills taken from fixed tripod stations produced a mesh that was geometrically worthless even though every automated quality gate passed). Photogrammetry is a reconstruction technique like Gaussian splatting, just older and mesh-first instead of splat-first. Same relationship to a Spatial Walkthrough as splatting has: it's a different, heavier product with a different purpose (measurement and BIM-adjacent geometry), not a competitor to the walkthrough.

### 2.4 Side-by-side

| | Spatial Walkthrough | Plain 360 video | Gaussian splat / Twin | Photogrammetry |
|---|---|---|---|---|
| Input | One continuous 360 video walk (or drone flight) | Same | Many photos/video frames with parallax + (ideally) LiDAR poses | Many overlapping still photos |
| Output | Navigable video sphere + spaces + pins + path | A sphere you can look around in | A point-of-view-free 3D scene | A 3D mesh / point cloud |
| Can view from anywhere in the room? | No — only where the camera walked | No | Yes | Yes |
| Processing time | Minutes (encode + mask bake) | None | 20–40+ minutes on a GPU | Hours |
| Measurement-grade? | No — not its job | No | No, not from the splat alone | Yes, if properly registered |
| Client-facing "spatial" features | Path, spaces, pins, items, documents, visit compare | None | Dollhouse, orbit, walk, measure | Mesh/point cloud viewer |
| What it needs from the operator | Walk the space once, steadily | Same | Careful multi-pass capture, often locked exposure | Structured photo sets, overlap discipline |
| Commercial risk | Low — a video either played back correctly or didn't | Low | Medium-high — reconstruction can fail or come back low-quality | High — needs training/discipline to shoot correctly |

**The reason Slate360 ships the Spatial Walkthrough first, and treats the Twin as a separate, optional, harder product**, is exactly this table. A walkthrough is fast, cheap, reliable, and already commercially useful on its own. A Twin adds real value (fly-anywhere, measurement) but costs more, takes longer, and can fail. Selling both under one roof, but never forcing a client to wait on the harder one, is the whole product strategy.

---

## 3. Capture: how fast and easy this actually is

This is the part that makes the business model work — the capture step is genuinely low-skill and low-cost.

**Walking capture.** An Insta360 X4 (or comparable 360 camera) is mounted on a monopod/selfie stick, held straight overhead so the pole sits in the camera's own blind spot between its two lenses (the "invisible selfie stick" effect — see §4 for why this matters). The operator presses record and walks the space at a normal, steady pace (roughly 0.8–1 m/s), pausing for a second at doorways and turns. A typical floor or unit takes 5–15 minutes to walk. There is no need to stop and take individual photos, no tripod stations, no scanning software, no calibration step. It is genuinely as easy as "walk through holding a stick."

**Drone capture.** For exterior context — a building approach, a roof, a site perimeter — a 360 drone (DJI or similar with a 360 camera payload) flies the same kind of continuous pass. The output is the same shape of file (a continuous 360 video with a timeline), so it slots into the identical pipeline: ingest, spaces, edges, privacy bake, delivery. An aerial pass and a ground-floor walk become two clips joined by a "Take Off / Land" edge in the same project, on the same timeline model described in §6.

**What makes a capture unusable** is not lack of skill — it's a small number of concrete, fixable things: (a) the camera tilted off-vertical, producing a rolled horizon (fixed at export time with Insta360 Studio's Horizon Lock, or corrected at playback with a `sphereCorrection` on the sphere — never by faking it with a CSS rotation); (b) the pole held at an angle or a phone clamped to the side of it, which breaks the blind-spot geometry and puts the operator's arm in frame (§4); (c) rushing through doorways or turns, which blurs the exact moments a client is most likely to want to pause on.

None of this requires a trained scanning technician. It requires a person who can walk steadily and hold a stick level. That is the value proposition to Brian's own business model: he (or eventually a client's own site staff) captures in minutes, and the software does the rest.

---

## 4. How the operator is removed — and why it isn't blur, a logo, or AI

This is the single most release-critical piece of the whole feature, and it is worth being precise about, because "just blur them out" or "just put a logo there" are both wrong answers for a construction record, and "just paint in what's behind them" is worse than wrong — it's a fabrication a contractor could later rely on as fact.

### 4.1 The rule

From `docs/ops/spatial-media-delivery/OPERATOR_FREE_POLICY.md`, which governs every derivative shipped to a client or the public:

- **No generative fill.** Nothing is ever invented behind the operator. If real wall, floor, or ceiling exists there and it matters, it gets captured separately (see §4.4), never guessed.
- **No obvious mask.** No giant black rectangle, no blur, no branded logo patch, as a default. The client should simply not be able to *look* into the small sector where the operator stands — the same way nobody complains that a Matterport scan hides its own tripod at the nadir.
- **Smallest practical sector.** The excluded region is only as wide as the operator's actual footprint, not the whole rear hemisphere.
- **Fail toward skipping, not toward hiding more.** If the operator's footprint in a given moment would require excluding more than ~150° of yaw (e.g., a lowered or inverted camera going through a doorway), that time range is cut from the client/public file entirely rather than masking a dominant chunk of the frame.
- **The master file is never rewritten.** Whatever gets excluded is a *derivative* decision. The original recording stays intact for the internal/CEO-only record.

### 4.2 The two layers that make this work

There are two independent mechanisms, and both matter — one is a server-side guarantee, the other is a client-side experience decision:

**Layer 1 — the baked derivative (the real security boundary).** Before a walkthrough is ever shared with a client or published publicly, the server processes the master video and produces a client-safe derivative. In this derivative, the operator's sector for every moment in time is filled with a neutral tone — not blurred, not blacked out with a hard box, not logo'd — matching the policy above. This is computed from an authored, **time-varying** region (a "keyframe track": at each authored moment, a yaw center, a yaw width, and a pitch range describing where the operator currently is, interpolated smoothly between authored points so the excluded region moves naturally as the operator turns or the framing changes). This derivative is what gets served to any client-facing or public URL. **This is the actual safety guarantee** — even if every client-side control below were disabled, broken, or bypassed, the pixels a viewer could ever receive over the network never contain the operator.

**Layer 2 — the Field of Regard (the experience decision).** On top of the safe derivative, the viewer also declines to let the client's camera *rotate into* the excluded sector at all — instead of a client dragging their view and hitting a visible seam or fill color, the viewer treats that direction as simply not offered, the same way a photo booth doesn't let you walk behind its backdrop. This is implemented as a real "allowed viewing range" computed as the *complement* of the operator's sector (`lib/spatial-walkthrough/field-of-regard.ts`), padded generously beyond the baked region so that even the edges of what the camera can see (accounting for zoom / field-of-view) never approach the boundary of the masked area. If the operator's sector is small enough (a normal walking capture with the pole held correctly), this is barely noticeable — the client just never happens to look at their own capture stick. If the sector is unusually wide for a moment, the viewer prefers to skip that time range (§4.1) rather than lock down a large fraction of the sphere.

The relationship between the two layers is the important part to hold onto: **Layer 1 is what makes the file safe to send. Layer 2 is what makes looking at it feel natural rather than like hitting an invisible wall.** A bug in Layer 2 is a UX problem. A bug in Layer 1 is a privacy incident. They are graded, tested, and fixed completely separately for exactly this reason.

### 4.3 Why capture geometry does most of the work

The cheapest, most reliable fix is not software — it's how the rig is held. A 360 camera has two lenses facing opposite directions; where they stitch together, there is a natural blind cylinder running straight through the camera's own mounting point. A thin pole held **exactly vertical, directly below the camera**, sits inside that blind cylinder and is genuinely invisible in the final stitch — this is the well-known "invisible selfie stick" effect. The moment the pole is held at an angle, or a phone is clamped to the side of it (common when also capturing LiDAR for a Twin), the geometry breaks and the operator's arm and body appear in a wide sector that then has to be actively excluded. So the capture SOP (`docs/design/CAPTURE_SOP_INTERIOR.md`) matters as much as the software: pole vertical, camera held above head height, consistent height through doorways, walk at a steady pace. Good capture geometry means Layer 1's excluded sector is a small nadir cone and a narrow rear wedge — nearly unnoticeable. Bad geometry means a large, awkward sector that pushes the system toward skipping footage instead of showing it.

### 4.4 What happens when something a client actually needs is behind the operator

This is the honest edge case, and the policy is explicit about it: **the mask never gets wider to protect evidence, and nothing is ever invented to reveal it.** Instead, the fix happens at capture time — the operator stops, turns around, and captures that wall or condition directly (either as a few extra seconds of video with the pole vertical, or as a separate still), which then gets pinned to that exact location as its own item, addressable independently of the main walk. The record stays evidentiary — everything the client sees was actually photographed from that vantage point, nothing is a guess.

---

## 5. Why this is a valuable deliverable to a contractor

A general contractor, superintendent, or owner's rep does not want a video file. They want answers to questions like *"what did this hallway look like on the 12th, and is that crack in the drawing?"* — fast, without scrubbing through raw footage or flying someone back to site. A Spatial Walkthrough answers exactly that class of question:

- **"Show me exactly where."** A pin at a specific yaw/pitch/timestamp is unambiguous in a way a photo attached to an email thread never is — click it, and you're standing at that spot, looking at that wall, at that point in the recording.
- **"Show me the drawing for this."** Documents (an A201 sheet, a spec page, a submittal) are pinned to the same locations, so a click from the space takes you to the paperwork, and a click from the document list back to "3 places this drawing is referenced in the field" — closing the loop between paper and reality that a flat file share never does.
- **"Has this changed since last visit?"** Multiple dated captures of the same project let a client compare the same spot across visits — progress documentation and dispute resolution both live here.
- **"Ask a question, right here."** A client can raise a question anchored to an exact spot ("is the power drop at workstation 14 per RFI-27?"), and it lands as a real item in the contractor's inbox, not a lost email — turning the walkthrough into a two-way channel instead of a one-way video.
- **No software to install, no training required.** It's a link. It opens in a browser. A superintendent who has never used a BIM tool understands "drag to look around, click the path to move" in about five seconds — because it deliberately mirrors an interaction pattern the industry already knows from Matterport, without pretending to be a 3D scan it isn't.
- **It costs almost nothing to produce.** Because there is no reconstruction step, a walkthrough can be captured, processed, and delivered same-day. That turnaround is itself a selling point against traditional as-built photo documentation, which usually means someone manually organizing and emailing a folder of stills days later.
- **It's evidentiary.** No AI-invented content anywhere in the pipeline — every pixel a client ever sees was recorded by a real camera, at a real time, in a real place. In an industry where documentation can end up in a claims dispute, that's not a nice-to-have, it's the entire reason a contractor would trust the record.

The Twin (Gaussian splat / LiDAR mesh) sits alongside this as the *upsell*, not the entry point: once a client is already looking at the walkthrough and wants to fly around a specific room, measure a wall, or see a dollhouse view, that is when the harder, slower, more expensive reconstruction product earns its keep. Leading with the walkthrough means every project has a fast, cheap, reliable deliverable on day one, whether or not a Twin is ever ordered.

---

## 6. How it's built, end to end (for the engineering audience)

This section is the architecture summary — enough to orient a new contributor or agent; see the source files for ground truth.

1. **Capture.** A continuous 360 video file (from an X4 export, or a drone's 360 payload) is the source. `docs/ops/spatial-media-delivery/INSTA360_SOURCE_RULE.md` and `AOB205_IMPORT_CONTRACT.md` classify incoming files (`lib/spatial-walkthrough/source-class.ts`) — raw dual-fisheye `.insv` is rejected as not browser-playable; only a stitched 2:1 equirectangular video or still is accepted.
2. **Ingest.** The master is transcoded to a playback proxy, a poster frame is selected, and the file is registered as a `spatial_clips` row under a `spatial_walkthroughs` project record.
3. **Spaces and path.** The author (or, later, an automated pass) marks named time ranges as "spaces" (Lobby, Corridor, Room 205 — a *logical* segmentation of one continuous recording, not a requirement to cut the source file into pieces) and places waypoints along the timeline. Today, waypoints carry a timestamp plus an authored look-direction (`yaw`/`pitch`) — this is **PATH_LEVEL_1** per `docs/design/WALKTHROUGH_TRAJECTORY_PATH.md`: a real recorded viewpoint, not a metric 3D position. A future PATH_LEVEL_2, using a registered iPhone ARKit/LiDAR trajectory captured alongside the walk, would let the path be placed as true camera positions on a real plan — that is planned, not yet built, and the UI must never present PATH_LEVEL_1 stations as if they were metric coordinates.
4. **Multi-clip projects.** Separate recordings (an aerial pass, a pocket capture above a ceiling, a different floor) become separate clips joined by typed edges (Continue, Enter/Exit, Upstairs/Downstairs, Take Off/Land, View Inspection) — never a single fake continuous path where the physical capture wasn't continuous.
5. **Operator exclusion authoring.** The author scrubs to a moment the operator is visible, and places or adjusts a keyframe describing the operator's current sector (§4.2, Layer 1). Keyframes interpolate between authored points across the whole timeline.
6. **Privacy bake.** A server-side job renders the client/public derivative: the operator's sector, at every moment, is filled per the neutral-fill policy; any interval requiring too wide an exclusion is cut from the derivative entirely. This bake is a distinct artifact from the master — the master is never modified.
7. **Field of Regard.** The viewer computes the complement of the operator's sector, padded for the current field of view, and treats it as the boundary of where a viewer's camera is allowed to rotate — described in §4.2, Layer 2.
8. **Items, documents, comments.** Project items (RFIs, questions, punch items) and documents (drawings, specs, submittals) are pinned to one or more locations across one or more captures — the same drawing sheet can be referenced from a walkthrough at one timestamp and from a different visit's twin at a different point, because the reference is a location record, not a copy of the file.
9. **Delivery.** The finished experience is served through a branded, white-labeled client portal — the client's own logo and colors, project history across visits, documents, items, and a share/access model with password and expiry options. This is a **project-centric** delivery model, not a single-video link: a client account sees every capture across every visit for their project(s), not one walkthrough in isolation.

---

## 7. What to hold onto

If you remember three things from this document:

1. **A Spatial Walkthrough is a navigable video, not a 3D reconstruction.** It's fast, cheap, and reliable precisely because it doesn't try to be a Gaussian splat or a photogrammetry mesh — those are separate, heavier products (the Twin) for when a client needs to fly around a room or take a measurement.
2. **The operator disappears through exclusion, not alteration.** A server-baked neutral fill guarantees no client-facing file ever contains the operator's pixels; a client-side viewing-range limit makes that exclusion feel like a natural part of the space rather than a visible patch. Nothing is ever painted in to replace what's hidden.
3. **The commercial case is speed and trust.** Minutes to capture, minutes to process, zero invented content — a real, addressable, evidentiary record a contractor can put in front of an owner without hedging.
