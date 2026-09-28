# Room 213 POC — fidelity, state and transitions (2026-09-28)

Branch `preview/room213-poc`. The pass started from `0f8b967d`. The golden PLY (sha256 `7e7b5d18…`) is untouched.

## 1. Golden control

`/preview/room213/control` (local development only; 404 on Vercel and in production) renders the golden PLY
through the minimum Spark stack:
- SparkRenderer with the Spirula 3DGUT profile and LoD off;
- one SplatMesh (`extSplats`, `lod:false`) in the levelling group, rotated π;
- fixed PerspectiveCamera (FOV 62, near 0.05, far 500);
- fixed DPR;
- no crop, edits, pins, UI, adaptive DPR or post-processing.

`window.__ctrl.info()` reports:
- CSS size, drawing buffer, DPR, FOV, focal length in px;
- projection and camera matrices;
- live `accumExtSplats` / `blurAmount` / `preBlurAmount`;
- sort state.

**Result.** The full viewer (Walk) equals the control at matched DPR and camera once both are settled. Mean absolute
difference was 0.09–0.18 grey levels and p99 = 0 at 3 poses × DPR 1 and 2; the residue is the pin plaques. The
stationary viewer path adds no softness.

## 2. Pixel ratio

DPR sweep at the Walk entry (CSS 1280×800, dsf 2; buffers 1280×800 → 2560×1600). Values are ROI Laplacian
variance / mean gradient, all ROIs resampled to one common grid:

| ROI | 1.0 | 1.25 | 1.5 | 2.0 |
|---|---|---|---|---|
| whiteboard edge | 74 / 5.90 | 124 / 6.78 | 128 / 6.98 | 245 / 8.43 |
| chair backs | 43 / 6.13 | 66 / 6.60 | 74 / 6.73 | 159 / 7.70 |
| table edge | 33 / 6.13 | 49 / 6.61 | 56 / 6.83 | 116 / 7.71 |
| window frames | 8 / 1.82 | 13 / 2.10 | 16 / 2.19 | 49 / 3.09 |
| ceiling grid | 80 / 2.50 | 86 / 2.79 | 90 / 2.92 | 130 / 3.84 |
| projector | 26 / 4.90 | 44 / 5.30 | 50 / 5.43 | 134 / 6.37 |

Any drop below 2 on a DPR-3 phone visibly softens the model.

**AdaptiveDpr is removed.** It stepped DPR down (to 1.5, then 1.25) and never back up. Its decision was also
unstable: the Canvas `dpr={[1,2]}` prop is re-applied on parent re-renders. An injected p90 = 49 ms load produced
no stable downgrade in the probe. DPR is now fixed at min(devicePixelRatio, 2) for the session. `?probe=1&dpr=N`
pins it for tests.

## 3. Softness after movement = depth-sort latency

Spark displays a newly generated splat buffer at once. Its back-to-front **order** arrives only after an
asynchronous sort: a GPU depth readback, then a worker sort of about 54 ms for 996k splats. Until that sort
finishes, the new viewpoint is blended in the previous viewpoint's order, which reads as ghosting or softness.
This is a Spark design property, not a viewer bug.

Measured sort latency:
- In-app Chromium (real compositor): **146–308 ms**.
- Headless: 0.2–38 s. The readback fence queues behind unthrottled frames there, so headless timings are not
  representative.

Mitigation:
- Every camera jump (view switch, Reset, View in room) happens under the fade cover.
- The cover lifts only when **the renderer's own state** says the frame is final. The following must all hold for 2
  frames:
  - no sort running or pending;
  - the display buffer is current;
  - the buffer origin is the camera position;
  - the sort centre is the camera position.
- There is no readiness timer. An 8 s failsafe exists only against hangs, and is logged as `FAILSAFE`, separately
  from `SETTLED`.
- In-app, every transition finished `SETTLED` in 160–306 ms (including the 180 ms fade).
- Continuous Walk movement still shows a sub-second catch-up after each stop. That is a VIEWER TRADEOFF of the
  asynchronous sort; the internal panel (`?internal=1`) shows `sort last/max` so it can be read on an iPhone.

## 4. Profile validation

`lib/room213/fidelity.ts` checks the hash-bound golden asset against `SPIRULA_3DGUT_PROFILE`'s constants, never
against the resolved profile, so a fallback to Spark defaults can no longer validate against itself. It requires:
- Spirula 3DGUT lineage from the verified revision;
- live `accumExtSplats=true`, `enableExtSplats=true`, `blurAmount=0` and `preBlurAmount=0`.

A failure shows the recipient a reduced-quality notice; the reasons appear only in `?internal=1`.

The provenance read no longer caches a failure: the cached function throws, and the next request retries.

## 5. Camera state

- Reset stays in the current mode.
- Walk jumps (Reset, View in room, NaN recovery) bump `walkPose.epoch`. The Walk rig cancels any step tween and
  held input before its next frame.
- Verified sequences, all ending exactly on the entry pose with roll 0 and world-up:
  - tap then Reset;
  - Reset mid-tween;
  - View in room then Reset;
  - held movement then Reset;
  - triple Reset.
- Reset in Plan stays in Plan (orthographic, up −z).

## 6. FOV

The earlier verified viewer (`4fc4c19c`) entered Walk at `clamp(60/zoom, 28, 78)` = **78°** (zoom 0.450).
The POC uses 62°: it is narrower, so pixels per degree are about 1.3× higher. The old viewer's perceived sharpness
was not an FOV effect. FOV is unchanged in this pass.

## 7. Pins

- Plaques now stand 10 cm off the surface (was 3 cm). The semi-transparent wall layers were drawing over them:
  about 20 px visible and washed out, now the full plaque of about 48 px.
- MIN size is 40 px.
- The selected scale is applied inside the clamp.
- Off-screen pins are no longer hittable.
