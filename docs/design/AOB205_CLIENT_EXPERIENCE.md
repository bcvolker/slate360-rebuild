# AOB205 Client Experience — handoff

Branch: `feature/aob205-client-ux` (from `feature/aec-commercial-walkthrough-v2`).
Harness: `/preview/aob205/*`. Screenshots: `docs/ops/aob205-client-ux/{desktop,mobile}`.
Capture: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 node scripts/ops/capture-aob205-client-ux.mjs`.

## What this is

The contractor-facing experience for one project, built as reusable components
over one data contract (`lib/client-experience/types.ts`) and rendered on the
real AOB205 capture via a fixture (`lib/client-experience/aob205-fixture.ts`).
Nothing here touches reconstruction workers, Trigger, Modal or the database.

## Navigation architecture

```
/preview/aob205               Overview        hero · Reality tiles · History · Open items · Documents · Activity
/preview/aob205/reality       Reality         published modalities only (walkthrough · twin · 360)
/preview/aob205/walk          Walkthrough     immersive · dock · panel {Plan, Spaces, Items, Share}
/preview/aob205/plan          Plan            sheet is the stage · visit selector · items panel
/preview/aob205/stations      360 Docs        immersive · prev/next · panel {Plan, Stations, Items, Share}
/preview/aob205/twin          Reality twin    immersive · modes {Walk, Orbit, Overview, Top, Reset} · panel {Plan, Items, Share}
/preview/aob205/history       History         visits with their modalities
/preview/aob205/documents     Documents       files + which items reference them + "Open on plan"
/preview/aob205/items         Items           list
/preview/aob205/items/[id]    Item            full ItemPanel (same component as every in-viewer drawer)
```

Deep links carry state: `walk?t&yaw&pitch&item&panel`, `stations?s&yaw&pitch&item&panel`,
`plan?u&v&item&visit`, `twin?item&panel`. Every spatial reference on an item
resolves through `hrefForRef()` to one of these, so an item is addressable from
plan, walkthrough, station and twin with the same panel.

## Components (`components/client-experience/`)

| File | Role |
|---|---|
| `ce.css` | The visual language. Token-derived (`--ce-*` from Graphite vars). Accent only on interactive/selected state. Immersive dock + panel; mobile = bottom sheet. |
| `ProjectShell.tsx` | Shared bar: client mark, project, view · date, primary nav, share, back. `immersive` floats it over a viewer. |
| `ProjectOverview.tsx`, `ModalityTiles.tsx`, `ProjectLists.tsx` | Overview, Reality index, History, Documents, Items. |
| `WalkViewer.tsx` | Photo Sphere Viewer video sphere. Forward/back navigation marker from `nextWaypointFor(t, yaw)`. Item pins within ±6 s. |
| `WalkExperience.tsx` | Dock (play · prev/next space · timeline · time · current space · Plan · Items · Share · zoom), panel, mobile Tools. |
| `PlanCanvas.tsx` | Pan/zoom sheet with SVG overlay: walk path, waypoints, stations, items, approximate current position. Constant-size markers. |
| `PlanExperience.tsx` | Plan mode page. |
| `StationViewer.tsx` / `StationExperience.tsx` | High-res ERP station with neighbour arrows, item pins, filmstrip, other-visit entry. |
| `TwinExperience.tsx` | Client chrome over `SplatViewerCore` (`quiet` prop added: no byte counts / point-cap notices). Walk mode click-to-move uses the core's floor-derived eye placement. |
| `ItemPanel.tsx` | One item presentation for every entry point. |
| `ViewerPanel.tsx` | Side panel (desktop) / bottom sheet (mobile). |

## Design decisions

- **Imagery dominates.** The overview hero is a real AOB205 station crop; modality tiles are real thumbnails; no stat-card wall.
- **One dock, one panel.** Every immersive view has exactly one control dock and one secondary surface. Plan, Spaces, Items and Share are tabs in that surface, not separate overlays.
- **Same shell everywhere.** Project identity, view label · date, back arrow, nav and share are identical across walkthrough, plan, stations and twin.
- **Navigation markers are derived, not authored.** The single forward marker sits at the path's forward yaw and offers the next waypoint; turning around flips it to "back". No marker clutter.
- **No processing vocabulary.** The twin shows nothing about confidence, PSNR, cameras or point caps. `SplatViewerCore` got a `quiet` prop for this.
- **Mobile is its own layout.** At ≤760 px the dock is play · timeline · time · Tools; everything else is in the bottom sheet. Chapter picker removed.
- **Operator handling in the preview proxy** is a blurred nadir band (bottom 24 %) — no black rectangles, no view clamping. The operator is still visible looking straight back at low camera height; capture SOP (pole above head) is the real fix.

## Real-data dependencies (Cursor / data integration)

Replace `aob205Experience` with a loader that fills `ProjectExperience` from:

| Field | Source |
|---|---|
| `walkthrough.videoUrl/posterUrl/durationS` | `spatial_clips.public_proxy_key / public_poster_key` via the public media route |
| `walkthrough.waypoints (t, u, v, space)` | `spatial_waypoints` + a plan registration (needs `plan_locator` or `xyz` → sheet u/v). Currently **authored approximate**. |
| `plan` | new `spatial_plan_sheets` (sheet PDF raster, width/height, focus region) — not in schema yet |
| `stations` | new `spatial_stations` (ERP key, sheet u/v, visit, neighbours) — not in schema yet |
| `twin.splatUrl` | `/api/share/twin/<token>/splat` (or the preview asset route pattern) |
| `items / documents / comments / activity` | `spatial_project_items`, `_documents`, `_comments`, `_activity`, `_locators` — migration `20260830200000` **not yet applied to prod** |
| `brand` | `spatial_org_themes` + token `branding_snapshot` |
| `visits` | derived from `captured_at` across walkthroughs/stations until a visit entity exists |

Local-only asset: `public/preview/aob205/walk-proxy.mp4` (gitignored; 45 s, 1920×960, nadir-blurred). Regenerate with the ffmpeg command in the session notes or let the desktop processor supply the real proxy.

## Known UX defects / not done

- **Twin Fly mode** is not implemented — `SplatViewerCore` exposes orbit + interior only. Top view is an orbit pose from above, not a true plan projection.
- **Twin quality** is the published model's (PSNR 20.97). The chrome is ready; the model is not. A retrain above baseline is a processing task.
- **Station arrows** are placed at authored yaws; plan-registered headings (`northYaw`) are not derived from data.
- **Compare across visits** opens the other visit's first station; there is no same-view side-by-side yet.
- **Share** copies a deep link; token minting is not wired in the harness.
- **Comment posting** is a form with no backend (tables not applied).
- **Twin item location** ("Open location" for `twin` refs) lands on the twin but does not fly the camera to `xyz` (no public camera-to-point API on the core yet).
