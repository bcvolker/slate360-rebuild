# Twin 360 — prompts for the outside AI panel (2026-09-09)

Three prompts, one per problem. Paste each into a separate chat and attach the screenshots
named under it. Return the answers to the desktop Claude session verbatim; it will reconcile them
against the code.

Shared context block (paste at the top of every prompt):

> Slate360 turns iPhone (photos + LiDAR) and Insta360 X4 captures of construction interiors into
> Gaussian-splat digital twins. Pipeline today: frames → pycolmap (SIFT, CPU) camera solve; for
> 360 video the equirect frames are rendered to four 90° cube faces that share one rig pose →
> Brush 0.3 (Apache) trains the splat on an RTX 3090 (7k–30k steps) → PLY → SPZ v3 with 8-bit
> spherical harmonics → viewer is Spark 2.1 (@sparkjsdev/spark) inside React Three Fiber on
> Next.js/Vercel, served as a token share link. Viewer modes: Inside (stand at a capture station,
> drag to look, click a floor ring or press ↑ to step), Dollhouse, Plan; a ceiling cut hides splats
> above 2.4 m in Dollhouse/Plan. Two test models: (a) a kitchen from 295 iPhone 1× video frames
> at 1920×1440, 15k steps, 237k splats, 10.5 MB; (b) a school cafeteria from a 158 s 5.7K
> "low-pass" stitched X4 video, 2 stills/s, 4 faces at 1600 px, 604 of 1260 faces registered
> (48%), 7k steps, 355k splats. Users are contractors and inspectors; the output must be sharp,
> accurate and navigable on desktop and phone, and a field user needs to know before leaving the
> site whether the capture was good enough.

---

## Prompt 1 — Viewer: navigation, cross-browser loading, mobile

Attach: `prod-kitchen-inside.png`, `prod-360-inside.png`, the Edge screenshot of the kitchen,
and a phone screenshot of a share link.

> You are a principal engineer who has shipped a Matterport- or Zillow-3D-class web viewer.
> Review our walkthrough viewer against that bar and give concrete, prioritised changes.
>
> What we have: Spark 2.1 SplatMesh (PackedSplats, LOD off, hard cap 500k splats desktop / lower
> on mobile) in React Three Fiber; camera is pinned to capture stations (one per ~0.7 m of the
> walk) and can never rest elsewhere; drag = look, wheel/pinch = field of view (not dolly), click
> on an invisible floor plane = walk to the nearest station within 4 m, ↑/↓ = step to the station
> in the look direction, Dollhouse/Plan = overhead poses with a plane SplatEdit hiding the ceiling.
> A 10 MB model reaches first frame in 5–7 s on a desktop.
>
> Problems: testers describe the viewer as "mostly still" and cannot tell how to move; on one
> desktop Chrome it showed nothing until hardware acceleration was working; on phones we have not
> tuned anything.
>
> Answer these, with specifics we can implement:
> 1. Navigation affordances: what should the first 10 seconds teach, without a tutorial? Cursor,
>    hover states, floor-ring design, transition timing, what happens on tap on a wall, what
>    happens on double-click, keyboard map, on-screen hint copy. Compare to Matterport's exact
>    behaviours and say which to copy and which to skip.
> 2. Station-to-station transition: we lerp position and yaw over 600 ms with smoothstep. Is that
>    right for splats (no imagery cross-fade)? Should the field of view or the splat opacity
>    change during the move?
> 3. Mobile: recommended splat budget per device class, DPR policy, touch grammar (one-finger look,
>    tap to walk, two-finger pinch FOV), and how to keep 60 fps on an iPhone 13 with a 250k-splat
>    model in Spark. Should we ship a separate mobile SPZ (fewer splats, SH0) and how would you
>    pick it?
> 4. Cross-browser: WebGL 2 required — what fallbacks are realistic (WebGL 1, software), what
>    should the page say when the GPU is disabled, and how to detect Safari/iOS memory limits
>    before decoding a 13 MB SPZ.
> 5. Dollhouse/Plan for splats: without a mesh, what makes an overhead splat view legible
>    (ceiling cut height, floater suppression, background, station markers, north-up plan,
>    optional floor-plan raster)? Concrete rendering settings please.
>
> Format: numbered recommendations, each with the change, the reason, and how to verify it.

---

## Prompt 2 — Reconstruction quality: sharpness, artifacts, cleanup

Attach: `prod-kitchen-inside.png`, `prod-kitchen-after-click.png`, `prod-360-inside.png`,
`prod-360-dollhouse.png`, plus one or two of the original kitchen frames if available.

> You are a Gaussian-splatting practitioner who has taken interior captures from "fuzzy demo" to
> client-deliverable quality. Diagnose our two results and prescribe a training and cleanup
> recipe we can run locally (free tools only: pycolmap, Brush or gsplat, Python).
>
> Kitchen (iPhone, 295 frames from 1× video at 1920×1440, 15k Brush steps): walls and cabinets
> read sharp from the capture path, but there are large translucent floaters near the camera path
> edges and haze at room boundaries; the Plan view from above is a smear.
>
> Cafeteria (X4 360 video, 5.7K low-pass stitched, 2 stills/s → 4 cube faces of 1600 px, 48% of
> faces registered, 7k steps): everything is soft, chairs are ghosted, ceiling lights bloom.
>
> Questions:
> 1. Rank the causes of softness for each model: input resolution and motion blur, low-pass
>    filtering of the 360 source, cube-face resolution, SIFT/CPU solve error (0.7–1.1 px), too few
>    steps, densification settings, SH degree, and the 8-bit SPZ quantisation. Which two fixes buy
>    the most?
> 2. Give a Brush (or gsplat) recipe for interiors: steps, learning rates, densification start/stop
>    and thresholds, opacity reset, SH degree schedule, resolution schedule, and anything that
>    specifically suppresses near-camera floaters and "sky" haze in indoor scenes.
> 3. 360 specifically: is rendering 4 side faces at 1600 px the right decomposition of a 5.7K
>    equirect? Would 6 faces, overlapping faces, higher face resolution, or training directly with
>    an equirect camera model do better? How to lift 48% registration to >90% on a walking clip?
> 4. Cleanup: propose an automatic post-training pass (opacity/scale pruning, statistical outlier
>    removal on centres, floor/ceiling plane clipping, camera-frustum-based floater removal) and
>    the interactive tools a non-technical operator needs (crop box, erase brush, plane slice,
>    "remove everything not seen from at least N cameras").
> 5. Quality gate: what numeric checks (registered fraction, mean reprojection error, PSNR on
>    held-out frames, splat count per m², floater ratio) should a pipeline compute so a field
>    user is told "good / redo" before processing, and what thresholds?
>
> Format: ranked list, then a concrete parameter table, then the cleanup algorithm as pseudocode.

---

## Prompt 3 — Capture methodology and hardware for detailed interiors

Attach: `prod-360-inside.png` (to show what the 360 video produced) and a photo of the X4 and
the iPhone if handy.

> You advise survey and reality-capture crews. We need a repeatable capture method for interior
> Gaussian splats that gives full coverage above and below furniture, sharp detail, and metric
> LiDAR geometry, with the operator knowing on site whether the capture is good. Devices available:
> iPhone 15 Pro (1× wide, LiDAR, ARKit poses, exposure/WB lock, fast shutter 1/120 s, timed stills
> every 0.5–3 s or video), Insta360 X4 (8K photo interval mode, 5.7K/8K video), a monopod, and
> the option of a rig with two or three cameras. Processing is a local pycolmap + Brush pipeline;
> the LiDAR point cloud is processed separately for geometry.
>
> Questions:
> 1. Phone + 360 at once on one rig: does mixing a wide pinhole camera with a 360 camera in one
>    SfM solve help or hurt, and if we keep them as separate solves, how do we register them?
> 2. Rig geometry: forward+backward phones, or high+low cameras, or a single camera with a two-pass
>    walk at two heights — which gives better coverage above and below counters and tables for the
>    least field time? Give a walking pattern (speed, spacing, heights, pauses at doorways/corners,
>    how to handle windows and mirrors).
> 3. X4: photo interval mode versus video for splats; recommended settings (8K interval, shutter
>    priority, ISO cap, HDR off, pole height, walking speed) and how far apart stations should be
>    in a 25 m room.
> 4. What can the phone tell the operator live that predicts a good result (translation between
>    keyframes, blur estimate, coverage heat-map on the LiDAR mesh, exposure clipping, tracking
>    quality) and what thresholds should trigger a "slow down / go back" warning?
> 5. Time budget: for a 30 m² kitchen and a 600 m² cafeteria, how long should a good capture take
>    with each method, and what does the client-visible result look like at each budget?
>
> Format: a recommended method per space size, a checklist the operator follows, and the live
> warnings to implement, with thresholds.
