# Twin web delivery + nav performance QA

Branch: `feature/twin-web-delivery-qa` (from `feature/twin-viewer-unblock-v2`).
Reconstruction, training, dashboard, and homepage were not touched.
No aesthetic redesign.

Harness: `/preview/twin-metric?job=79a4f0ac-32e9-4358-bda0-e1a7461510e1`
Capture: Playwright Chromium against local Next **dev** `http://127.0.0.1:3000` on 2026-09-01T19:25:35Z.
Raw JSON + screenshots: `docs/ops/twin-web-delivery-qa/`.

## Verdict

The kitchen Twin viewer can show a thumbnail, then `geometry-display.glb`, while `geometry-nav.glb` loads as the only collision mesh. Measurement geometry stays off the wire until Measure is armed on desktop. Reality does not hang when appearance is unavailable. Mode switches keep the camera (pose jump 0). First camera and Reset View land inside the scanned room at human eye height. Floor/ceiling clamp is on the walk capsule.

This is **not** a commercial Reality client yet: trained appearance is gated off (`KITCHEN_APPEARANCE_AVAILABLE = false`), so Reality is a banner on top of the display mesh. FPS below is geometry FPS in every mode.

## Requirements

| # | Gate | Result |
|---|---|---|
| 1 | Useful content before heavy assets finish | Pass. Thumbnail (`data-testid="first-useful-pixel"`) attaches at ~2.0–2.8 s wall; display GLB ready ~3.7–5.0 s. Marks: first-useful 2.3 s, geometry 3.2 s (desktop cold). |
| 2 | Measurement mesh never visible default or collision | Pass. `geometry-measurement.glb` is not requested until Measure is on **and** desktop. Role flags set `twinMeasureMesh` only; walk pick ignores it. |
| 3 | Nav mesh is the only collision mesh | Pass. Display is visual (`twinDisplayMesh`, `twinWalkSurface: false`). Nav is `twinNavMesh` + `twinWalkSurface`. Locomotion raycasts `userData.twinNavMesh` only. |
| 4 | Geometry display uses display mesh | Pass. Scene draws `geometry-display.glb` with role `"display"`. |
| 5 | Reality tolerates appearance load failure without hanging | Pass. Appearance URL is not fetched while the flag is false. Reality keeps the display mesh and shows `appearance-unavailable`. Hybrid without appearance stays on `geometry`. |
| 6 | Mode switch preserves camera transform exactly | Pass. `poseJump` Geometry→Reality and Geometry→Hybrid = **0** on all four passes. |
| 7 | First-load camera inside the scanned room | Pass. Start pose `{ x: 2.05, y: 0.005, z: -1.82, yaw: 0.28 }` = station `human` at `kitchenEyeY()` (floor −1.595 m + 1.6 m eye). |
| 8 | Reset View | Pass. Reset → station `island` `{ x: 2.22, y: 0.005, z: -2.45, yaw: 0.15 }`. |
| 9 | No floor/ceiling clip in normal walk | Pass (code + unit test). `clampWalkHeight` after nav-mesh floor snap. Ceiling cut Y = 1.1 m. |
| 10 | Mobile simplified controls, no extra expensive layer | Pass. Viewport <1024 px: DPR `[1,1]`, no MSAA, no directional light, no Dollhouse/Plan/Measure, measurement GLB not fetched. |

## Timing (wall clock vs marks)

Wall clock includes Playwright settle (800 ms after geometry-ready). `performance.mark` times are from navigation start inside the page.

| Pass | Viewport | Cache | TTFB (ms) | First useful (ms) | Geometry ready (ms) | Appearance |
|---|---|---|---:|---:|---:|---|
| desktop cold | 1440×900 | disabled | 477 | 2533 | 4964 | skipped (`missing`, 0 ms) |
| desktop warm | 1440×900 | allowed | 436 | 2632 | 3847 | skipped |
| mobile cold | 390×844 | disabled | 301 | 2789 | 3967 | skipped |
| mobile warm | 390×844 | allowed | 295 | 1995 | 3721 | skipped |

Desktop-cold **marks**: `twin-appearance-ready` 1476 ms (skip path), `twin-first-useful` 2339 ms, `twin-geometry-ready` 3178 ms.
Instrument load: display **1635 ms**, nav **1649 ms** (desktop cold); display **613 ms**, nav **499 ms** (desktop warm).

Warm is a **new Playwright context** with HTTP cache allowed. The GLB bodies still transfer in full (empty context cache). Shorter duration is Next/S3/proxy heat, not a same-tab reload.

## FPS per mode

R3F `useFrame` probe, ~0.5 s windows, vsync-capped.

| Pass | Geometry | Reality | Hybrid |
|---|---:|---:|---:|
| desktop cold | 60.0 | 60.0 | 60.0 |
| desktop warm | 60.0 | 60.0 | 60.0 |
| mobile cold | 60.0 | 60.0 | 60.0 |
| mobile warm | 60.0 | 58.0 | 60.0 |

Reality/Hybrid do not add Spark. These numbers are display-mesh FPS.

## Asset sizes

| Asset | Encoded bytes | Requested on first load |
|---|---:|---|
| `thumbnail.png` | 4,788 | yes |
| `geometry-display.glb` | 22,890,796 | yes (visual) |
| `geometry-nav.glb` | 5,753,964 | yes (collision only) |
| `geometry-measurement.glb` | — | no (`measureDeferred: true`) |
| `appearance-x4-v1.spz` | — | no (flag false; do not stream stub ellipsoids) |

## Network waterfall (desktop cold, filtered)

Dev bundles dominate TTFB→first JS. Asset proxy starts after the viewer chunk.

| Resource | Start (ms) | Duration (ms) | Transfer |
|---|---:|---:|---:|
| `layout.css` | 89 | 9 | 56 KB |
| `main-app.js` (dev) | 90 | 230 | 4.40 MB |
| `KitchenProofViewer` chunk (dev) | 529 | 859 | 2.37 MB |
| `thumbnail.png` | 1468 | 869 | 5.1 KB |
| `geometry-display.glb` (aborted Strict Mode) | 1476 | 2 | 0 |
| `geometry-nav.glb` (aborted Strict Mode) | 1476 | 2 | 0 |
| `geometry-display.glb` | 1477 | 1614 | 22.89 MB |
| `geometry-nav.glb` | 1477 | 1617 | 5.75 MB |

React Strict Mode double-mounts `useKitchenGlb` in dev: first fetch aborts (`transfer` 0), second completes. Production will not double-fetch.

Asset route `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`. `useKitchenGlb` no longer sends `cache: "no-store"`.

## Errors

| Pass | JS pageerrors | WebGL console errors |
|---|---:|---:|
| desktop cold | 0 | 0 |
| desktop warm | 0 | 0 |
| mobile cold | 0 | 0 |
| mobile warm | 0 | 0 |

## Memory

Chrome `performance.memory` JS heap only (not GPU).

| Pass | Used (MB) | Total (MB) |
|---|---:|---:|
| desktop cold | 269 | 296 |
| desktop warm | 255 | 284 |
| mobile cold | 249 | 269 |
| mobile warm | 249 | 273 |

## Camera / collision notes

- Inside walk is owned by `KitchenLocomotionRig`. `NavigationRig` sets `driveCamera={nav.mode !== "inside"}` so the two rigs do not fight.
- Walk pick: `twinNavMesh` then `twinWalkSurface`. Metric pick: measure then display (never nav as a measurement surface).
- Mobile HUD: Reality / Hybrid / Geometry + Inside + Reset. Dollhouse, Plan, Measure omitted.

## What this does **not** claim

- Appearance quality or SPZ streaming into Spark. That path is intentionally off until a persisted Gaussian exists.
- Production bundle size. Dev `main-app.js` is 4.4 MB uncompressed-on-the-wire here.
- Mesh visual quality. TSDF holes/noise are reconstruction, out of scope.
- GPU VRAM. Heap numbers are JS only.

## How to recapture

Dev server on :3000, then:

```bat
node scripts/ops/capture-twin-delivery-qa.mjs http://127.0.0.1:3000
```
