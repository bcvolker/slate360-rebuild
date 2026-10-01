# Spatial Experience V3 — UX handoff (Claude)

Cursor owns application/data/integration on `feature/aob205-spatial-experience-v3`.
Claude owns visual polish on `C:\s360-ux` / `feature/aob205-ux-polish-v3`.
Same baseline: `0e4e2e31` / tag `safety/aob205-spatial-v3-baseline`.

Do not redesign IA. Keep Overview / Reality / Plan / History / Documents / Items.

## Capability gating

`lib/spatial-experience/capabilities.ts`

Show a client deliverable only if artifact exists, published, and entitled.
Twin additionally requires `qaStatus === accepted` AND `humanReviewAccepted === true`.
If Twin is hidden, omit the tile. No Coming soon / PSNR / processing copy.

## Branding

`lib/spatial-experience/brand.ts`

Paid default: small Slate360 mark + dominant client logo.
No client logo → Slate360 only.
Never invent initials. If initials render, they must have an accessible client name.

## Adaptive layout

Hide empty rails. Hero buttons only for live assets.
Test states A–E via `layoutStateGates`.

## Explore / Play

Explore is default. Play follows the recorded route at 1x / 1.5x / 2x.
Look-around stays free during Play. No cinematic path authoring.

## Path HUD

Local upcoming 3–5 cues only.
Desktop/tablet: ON, opacity ~0.28. Mobile: OFF.
Persist `sw-path-visible` / `sw-path-opacity`.

## Tap navigation

Lower/forward click uses `tapAdvance` cone selection.
Constrained to the recorded path. No 6DoF.

## Station transition

`stationNearWalk` builds High-res 360 + walk return (`t/yaw/pitch`).
Do not send clients through Tour Builder chrome.

## Question UX

Copy is **Ask a Question**, never Create RFI.
Guest: view / ask / reply. Admin/client: reply / resolve / manage.

## References index

`SpatialReferencesIndex`: Items / Questions / Documents, All Project.
Pinned documents also appear in Documents.

## Device variants

Resolver picks thumb/preview/standard/full etc. Never show those names.

## Plan raster

Overlay only when `plan_raster` exists. PDF is download/source only.
If raster is missing, show the intentional unavailable line — do not draw a PDF as an `<img>`.

## Screenshot routes

- `/preview/aob205`
- `/preview/aob205/walk`
- `/preview/aob205/stations`
- `/preview/aob205/plan`
- `/preview/aob205/items`
- `/portal/{token}`
- `/portal/{token}/reality`
- `/w/{token}`
