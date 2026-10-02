# Directed Tour privacy: framing first (locked 2026-09-30)

**Rule:** the published view is the widest forward view that never includes the operator. Clients are look-locked to it, and every checkpoint still is framed inside it. Painting is a last resort, for a stray limb or reflection. A visible black area in anything a client sees is a failure, and it blocks publishing.

## Model

| Layer | What it is | Where |
|---|---|---|
| **Published view (look cone)**, primary | Per clip: forward heading (0–360, player convention), half-width (70 / 90 / 110 → 140° / 180° / 220°), floor (−15 / −30 / −45°), ceiling 80°. The operator walks behind the mast and under the camera, so a forward cone that stops short of straight down excludes them without painting. | `spatial_clips.look_cone` (migration `20260930160000`); `lib/spatial-tour/look-cone.ts` |
| **Stills** | A perspective frame (90°×56°, 1920×1020) rendered at the mark's direction, clamped so the **whole frame** stays inside the cone. Never a raw 360 frame. | `workers/modal/spatial-stills/worker.py` (ffmpeg `v360`), `src/trigger/spatial-tour-still.ts` |
| **Black-pixel measurement** | The worker measures the pure-black share (luma < 5) of every still. Above 0.25% blocks publishing. Calibrated on real data 2026-09-30: below-horizon blackout 18–31%, thin mask arc at the frame edge 0.3–2%, dark TV and cabinets 0%. | `spatial_checkpoint_marks.still_black_fraction`; `MAX_STILL_BLACK_FRACTION` |
| **Paint (operator patch)**, last resort | The existing bake. It is refused if any frame covers more than 12% of the sphere (a blackout, not a limb fix). The Tour blocks publishing if any painted sector reaches into the published view. | `app/api/spatial-walkthrough/[id]/privacy-bake/route.ts`; `paintSectors`, `paintVisibleInCone`, `MAX_PAINT_COVERAGE` |
| **Client look-lock** (C2) | The Tour viewer clamps view centres to `coneVisibleRange(cone)` with the client FOV inside it (PSV visible-range plugin, already used by the walkthrough player). | C2, light theme |

## Publish gate (server-enforced; `lib/spatial-tour/publish-checklist.ts`)

The checklist adds these items to the C1 checklist:
- **Published view set**: every clip with marks has a cone.
- **Privacy mask stays out of view**: no painted sector inside the cone, and no paint over 12% coverage.
- **No blacked-out areas in stills**: every still was measured, and each is at or under 0.25% pure black.
- **No operator or ugly mask in the published view**: the operator confirms it after looking at every still. This replaces the generic "privacy reviewed".

Changing a mark or the cone clears both review confirmations and re-extracts the stills. Privacy items stay unchecked until there are stills to judge, so nothing is ever "passed" vacuously.

## Capture SOP (printed on the capture card)
1. Mast a couple of feet ahead of you, camera above your head. Use the same heights every visit.
2. Walk the route in order, facing the way you walk. Forward is your direction of travel.
3. Keep yourself behind and under the camera, out of the published view. No masks: if you are in the view, the take is redone.
4. Pause two seconds at each checkpoint, facing its reference view.
5. Write down anything you could not reach or had to do differently.

## Internal capture: its bake is wrong for Tour
That capture's saved operator patch paints pitch −88°…+4° almost all the way round. That is a below-the-horizon blackout: 18% black in a forward, level still, and blocked by the gate (`docs/qa/c1-2-framing/still-gate-real-data.jpg`). The new bake guard would refuse it today.

For Tour use, either:
- **(a) Re-bake** with a tight patch (or the patch disabled), set a published view, and re-mark, or
- **(b) Discard** that capture for Tour.

It is a placeholder either way, and not the acceptance project.

## Files changed in C1.2
- New: `lib/spatial-tour/look-cone.ts` (+ test), `components/spatial-tour/operator/TourLookConePanel.tsx`, `supabase/migrations/20260930160000_spatial_tour_look_cone.sql`, this doc.
- Changed:
  - `lib/spatial-tour/{types,tour-store,publish-checklist}.ts` (+ test)
  - `app/api/projects/[projectId]/tour/{marks,visits/[walkthroughId]}/route.ts`
  - `app/api/spatial-walkthrough/[id]/privacy-bake/route.ts`
  - `components/spatial-walkthrough/studio/WalkthroughStudio.tsx` (shows why a bake was refused)
  - `src/trigger/spatial-tour-still.ts`, `workers/modal/spatial-stills/worker.py`
  - `components/spatial-tour/operator/{TourOperator,TourCheckpointList,CaptureCard}.tsx`
  - The harness mocks
