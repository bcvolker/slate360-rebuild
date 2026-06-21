# Walks with Drawings — Multi-Type Pins, 360 Photos & Interactive Deliverables

Status: **spec + partial implementation**. Captures the rename + the pin-type / 360 vision
from field feedback, and records what already exists in the codebase so the remaining work
is scoped, not rebuilt.

## 0. Naming: "Walk with plans" → "Walk with drawings" (DONE)
Field users say "drawings," not "plans." Renamed in user-facing surfaces (the start sheet,
summary/orchestrator fallback labels, app metadata, sales tile, Pro pricing bullets,
entitlement doc-comment). Internal identifiers (`planSets`, `planPinFlow`, `project_type`,
`canWalkWithPlans`, route segments) are unchanged to avoid churn/regressions — only copy moved.

"Walks with drawings" is the **Site Walk Pro** capability. Marketing/home already gates it to
Pro (`lib/marketing/pricing-config.ts`) and entitlements gate it via
`effectiveTiers.site_walk === "pro"` (`lib/entitlements-modular.ts`).

## 1. What already exists (do NOT rebuild)
- **Item types**: `photo`, `photo_360`, `video`, `file` — plugin system in
  `lib/site-walk/capture-types/plugins/*` (`photo-360.plugin.tsx` is real).
- **Source picker** (`CaptureV2SourcePickerSheet` + `useCaptureV2SourcePicker` +
  `lib/capture-v2/source-picker-rows.ts`): rows = Take photo · Upload from camera roll ·
  Upload a file · **Add 360 photo** (the 360 row is gated by `photo360Entitled`, shows an
  "Upgrade" lock otherwise). `photo_360` selection routes to `persistNewStop("photo_360", …)`.
- **360 rendering**: `@photo-sphere-viewer/core` is installed; `PanoramaViewer.tsx`,
  `TourPanoViewer.tsx`, and `components/site-walk/viewer/ItemRenderers.tsx` already render
  panoramas. Public/deliverable stage = `components/external-portal/PublicItemStage.tsx`.
- **Plan (drawing) capture**: `WithPlansCaptureCanvas.tsx`, `PlanViewerLeaflet.tsx` +
  `PlanQuickActionMenu.tsx`; tapping/placing a pin opens a menu (or the source picker when
  `useSourcePickerFlow` is on). Pin markers come from
  `components/capture-v2/plan-canvas/plan-pin-marker-icon.ts` (Leaflet) and
  `components/site-walk/capture/PlanPin.tsx` (non-Leaflet fallback).

So the capture, upload, 360 ingest, and 360 viewing pieces are built. The **gap is visual +
plumbing**: pins all look the same, and the drawing long-press menu / deliverable click-through
aren't yet type-aware.

## 2. The drawing long-press menu (Pro) — target behavior
Long-press anywhere on the drawing drops a pin and opens **one** menu (reuse the source picker):
1. **Take photo** → capture screen, returns a photo pin.
2. **Upload from camera roll** → existing image becomes a photo pin.
3. **Upload a file** → PDF/doc/invoice/proposal becomes a **file pin**.
4. **Add 360 photo** (Pro + `photo360Entitled`) → equirectangular image becomes a **360 pin**.

Notes:
- Confirm `WithPlansCaptureCanvas` passes `photo360Entitled` and uses the source-picker flow so
  the 360 row actually appears for Pro users (the wiring exists; verify it's on for plan walks).
- 360 **capture** is native-only (camera can't shoot equirectangular in a PWA). For now the 360
  path is **upload an existing 360 image**; live 360 capture lands with the native shell.

## 3. Multi-type pins — distinct color + icon (NEW — main visible work)
A pin's appearance must encode its attached item type at a glance, on the drawing AND in
deliverables:

| Type | Color | Icon | Token |
|---|---|---|---|
| Photo | green `--graphite-primary` | camera dot | `pin.photo` |
| File (invoice/proposal/PDF) | neutral `--graphite-muted`/slate | paperclip / document | `pin.file` |
| 360 photo | blue `--twin360-blue` | **sphere/orbit glyph** | `pin.photo360` |
| Empty (placed, not captured) | dim outline | number only | `pin.empty` |

Implementation steps:
1. Add `item_type?: "photo" | "photo_360" | "file" | "video" | null` to `PlanViewerPin`
   (`components/site-walk/capture/PlanPin.tsx`).
2. Populate it wherever pins are mapped from items (`mapPlanPin` / `mergeFetchedPlanPins` and the
   session pin loaders) — join the pin's `item_id` to its item's type.
3. Branch `createPlanPinMarkerIcon` (Leaflet `divIcon` HTML) and `PlanPin.tsx` on `item_type`
   to render the color + a small inline SVG glyph (sphere for 360, paperclip for file). Keep the
   numbered label.
4. Centralize the color/icon map in a `plan-pin-type-tokens.ts` so capture + viewer +
   deliverable all read the same source (Graphite Glass tokens only — no amber; note `PlanPin.tsx`
   currently uses banned amber and should move to `--graphite-primary` during this pass).

## 4. Click-through (capture + deliverable) — NEW
- **In capture**: tapping a 360 pin opens the interactive `PanoramaViewer`; a file pin opens the
  file (PDF inline / download); a photo pin opens the photo viewer. Route by `item_type` in
  `onSessionPinTap` / `handleMarkerTap`.
- **In deliverables (recipient side)**: the shared report/exported view must render the same
  type-aware pins and make them clickable — 360 → embedded Photo Sphere viewer, file → open,
  photo → lightbox. Reuse `PublicItemStage` / `ItemRenderers`; ensure the deliverable pin layer
  passes `item_type` and renders an interactive (not static) pin map. This is the "interactive
  for whoever is looking at the deliverable and clicking the pins" requirement.

## 5. Marketing / home updates (Pro = walks with drawings)
- Pricing bullets now read "Walks with drawings — pin photos, files & observations…" and
  "Pin 360° photos on drawings — tap to explore them in an interactive viewer" (DONE).
- When the type-aware pins ship, add one screenshot/explainer on the Site Walk feature surface
  showing the three pin types on a drawing + the 360 viewer — Pro upsell. Keep Content/Design/
  Thermal studios out of any of this (App Store scope rule).

## 6. Phasing
- **P0 (shipped this pass):** rename to "walks with drawings"; capture quick-fixes (branded Back,
  "Next photo", clearer hint); pricing copy.
- **P1:** type-aware pin tokens + `item_type` on `PlanViewerPin` + marker rendering (capture).
  Verify the 360 row shows in the drawing menu for Pro.
- **P2:** type-aware click-through in capture (360/file/photo) + interactive pins in delivered
  reports (recipient side).
- **P3:** native live 360 capture (TestFlight shell); de-amber `PlanPin.tsx`.

## 7. Open decisions for Brian
- 360 for now = **upload an existing 360 image** (live capture is native-only). OK?
- File pins: any file type, or restrict to PDF/image/office docs for the report renderer?
- Pin distinction: color **and** icon (recommended) vs icon-only — confirm the sphere glyph for
  360 and a paperclip for files.
