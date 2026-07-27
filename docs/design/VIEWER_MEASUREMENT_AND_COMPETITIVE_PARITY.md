# Viewer measurement, area/volume, and parity with DroneDeploy / Pix4D / Propeller

Status: **DESIGN** · 2026-07-27
Answers: can we measure from iPhone LiDAR? can clients measure from a share link? and does the
pipeline we are building actually support the toolset the competition ships?

Companion to `PIPELINE_V3_REVIEW_AND_ROADMAP.md`. The headline finding is in Part 4: **almost
every competitive feature is gated on deliverables we are already building, not on new viewer
work.** Get the DSM, COG and mesh out and most of this becomes UI.

---

## PART 1 — DroneDeploy interface audit

Catalogued from the supplied screenshot of `threed-viewer/mesh`, cross-checked against
DroneDeploy's published documentation. Items marked **[inferred]** are read from the icon and
position only and should be confirmed against a live account before being treated as a spec.

### 1.1 Top navigation

| Element | Function |
|---|---|
| `Home / Sun Deck /` | Breadcrumb: organisation → site → (map) |
| **Fly** | Mission planning / autonomous flight |
| **Upload** | Bring in imagery captured outside the app |
| **Explore** | The viewer — the screen shown |
| **Report** | Annotation/measurement report generation |
| **Progress AI** ↗ | Separate product surface (opens externally) |
| **Share** | Share link generation |
| ⬆ / ⚙ / 🔔 | Upload, settings, notifications |

### 1.2 View-mode tabs

**Exterior | Interior** — DroneDeploy explicitly separates aerial exterior from interior capture
in the same site. **This validates our federated architecture**: they did not solve
interior+exterior as one seamless model either. They present them as two modes of one site.

### 1.3 Left sidebar

| Section | Item | What it needs from the pipeline |
|---|---|---|
| *(top)* | Date / plan selector (`Jul 15, 2026 - Map Plan`) | Multiple captures per site, time-indexed |
| **Layers** | Overlays (0) | User-uploaded raster/vector overlays, georeferenced |
| **3D Map** | **Point Cloud** *(toggle)* | Streamable point cloud — **COPC** |
| | **3D Map** *(checkbox, active)* | Textured mesh — GLB/3D Tiles |
| | **Elevation** | **DSM raster** |
| | **Contours** | Contours derived from the DSM |
| **Media** | Map Photos (0/**530**) | Per-photo pose + footprint, clickable in 3D |
| **Markup** | Annotations (0) | Measurement/annotation store |
| | Field Notes (0) | Note store, distinct from measurements |
| **Apps + Integrations** | — | Third-party surface |
| *(bottom)* | **Export**, **Help** | Deliverable download |

### 1.4 Viewer toolbar — top centre

| Icon | Function |
|---|---|
| ▶ | Play a saved flythrough / animation **[inferred]** |
| 🎬 | Video export / cinematic capture **[inferred]** |
| 🔍 | Zoom to extent or inspect **[inferred]** |
| ⧉ | Split / compare view — side-by-side across dates **[inferred]** |
| ⛶ | Fullscreen |
| `HD` | Render-quality toggle |
| **`2D`** | Switch to the 2D orthomosaic map |
| 📷 | Snapshot to image |

Top-right: a **`TOP` view cube** — orientation gizmo with snap-to-axis views.

### 1.5 Viewer toolbar — right edge (the measurement stack)

This is the important one. DroneDeploy's documented "Annotation & Measurement Toolbox":

| Icon | Tool | Output | Underlying data |
|---|---|---|---|
| ↖ | **Select / navigate** | — | — |
| 📍 | **Location** (point) | Coordinates, elevation | DSM or mesh |
| ✏ | **Distance** | Length between 2+ points; **also drives the elevation profile / cross-section** | Mesh or DSM |
| ⬡ | **Area** | Planar area; **Surface Area** drapes over terrain | Mesh or DSM |
| **123** | **Count** | Tally of clicked instances | None — pure annotation |
| ⛰ | **Volume** | Stockpile / excavation volume | **DSM + a base plane** |
| ◎ | Section or panorama placement **[inferred]** | — | — |

Documented beyond what the screenshot shows: **Edge Annotations**, **AI Annotations** (custom
models producing **Area, Volume and Count** outputs), **Stockpile AI** (automatic boundary
detection, Enterprise only), and the **Annotation Report** (printable record of all measurements).

### 1.6 Where Pix4D and Propeller differ

- **Pix4D** competes on survey-grade precision with manual control — GCP workflows, camera
  self-calibration, quality reports. Its differentiator is *rigour*, not tooling breadth.
- **Propeller** competes on earthworks: volumes tied to fixed site boundaries so numbers are
  comparable between flights, plus their own GCP hardware (AeroPoints) and machine-mounted GNSS
  (DirtMate). Its differentiator is *consistency of the same measurement over time*.

**Read across all three, the pattern is clear.** The moat is not the measuring tools — those are
a weekend of UI work each. The moat is:
1. **A DSM you can trust**, because every volume and profile comes off it.
2. **Repeatable georeferencing**, so this month's volume is comparable to last month's.
3. **A defensible accuracy story**, which is why they all sell GCP workflows.

Our QC report card (Phase E1) attacks #3 directly, and is arguably a *better* answer than
"we support GCPs" because it reports what a given capture actually achieved.

**Where we can go where they cannot:** none of the three does interior LiDAR walkthroughs from a
phone as a first-class product in the same site as the drone data. DroneDeploy has an Interior
tab; it is not a metric interior twin. That gap is our opening.

---

## PART 2 — Can we measure from iPhone LiDAR? Yes, and here is exactly how

### 2.1 Why it works at all

The capture already produces everything measurement needs. Verified in
`TwinARKitCaptureViewController.swift`: a single `ARSession` emits, per frame, the camera
transform, intrinsics, LiDAR depth and a per-pixel confidence map — and ARKit's world frame is
**metric and gravity-aligned from the first frame**. There is no scale to recover and no up-axis
to guess, which is precisely the difference from a photo-only reconstruction.

So distance, area and volume are all **available in principle today**. What limits them is not
the sensor; it is three things we control.

### 2.2 The three real constraints

**(a) We currently measure against the wrong surface.** `TwinMeasureTool.tsx` picks two points and
returns `Math.hypot` between them — but it picks them **on the splat**. A splat is a cloud of
anisotropic blobs, so a "surface" pick lands wherever a blob happens to be dense. That is fine for
the current honest label (`"Approximate — for coordination, not survey"`) and wrong as a basis for
anything a trade prices.

> **Fix: ship a lightweight collision mesh alongside the splat and raycast against that.**
> The client keeps rendering the splat — it looks better — but every pick snaps to real geometry.
> This is the single highest-value viewer change in this document, and it is small.

**(b) Drift, not sensor precision, sets the error.** Measuring a door inside one room is a
centimetre-scale problem. Measuring between two ends of a 60 m corridor inherits everything ARKit
accumulated in between. **Measurements must therefore carry the QC context of the capture that
produced them**, not a global accuracy claim — which is exactly what the Phase E1 report card is
for.

**(c) Occlusion is invisible in a rendered view.** A wall behind a stack of material looks solid
in a splat. Our `openings.py` already refuses to subtract what it cannot see and reports
`unaccounted_m2`; the viewer needs to surface that same honesty at measurement time.

### 2.3 What each measurement needs, interior and exterior

| Measurement | Interior (iPhone LiDAR) | Exterior (drone) | Data required |
|---|---|---|---|
| **Distance** | ✅ Strong — metric from frame one | ✅ Strong | Any metric surface |
| **Height** (floor→ceiling, floor→soffit) | ✅ Strong — gravity is native | ✅ | Surface + gravity |
| **Planar area** (floor, wall, slab) | ✅ Strong | ✅ | Surface |
| **Floor area / square footage** | ✅ **Built** — `floorplan.py`, <1% on correct geometry | n/a | Room polygons |
| **Net wall area** (minus windows/doors) | ✅ **Built** — `openings.py`, 37 tests | ✅ facades | Wall planes + points |
| **Surface area** (draped over terrain) | ➖ Rarely wanted indoors | ✅ | Mesh or DSM |
| **Room volume** | ✅ Easy — floor polygon × measured height, or mesh-enclosed volume | n/a | Room polygons + heights |
| **Stockpile / excavation volume** | ➖ Not an interior use case | ✅ **The competitive one** | **DSM + base plane** |
| **Cut / fill vs a baseline** | ➖ | ✅ | **Two co-registered DSMs** |
| **Elevation profile / cross-section** | ✅ Useful for slab flatness | ✅ | DSM or mesh |
| **Count** | ✅ | ✅ | Nothing — annotation only |

### 2.4 How volume actually works — the one that needs new pipeline output

Every volume tool in every competitor is the same operation: **integrate the difference between a
surface and a base plane over a polygon.**

```
  volume = Σ over cells inside the polygon of  (DSM_height - base_height) × cell_area
```

Base-plane options are what distinguish the products, and all are cheap once the DSM exists:
- **Lowest point** — flat plane at the polygon's minimum
- **Triangulated / best-fit** — plane fitted to the polygon boundary; the right default for a
  stockpile on uneven ground
- **Custom elevation** — user-entered datum
- **Baseline surface** — a *previous* DSM, which is what turns volume into **cut/fill**

**We do not emit a DSM today.** That is the entire gap for volume, and it is one raster written
from the fused point cloud with GDAL — the same Phase A4 work that produces the COG and the LAZ.

---

## PART 3 — Client-facing measurement in the share link

Today `TwinShareToolStrip.tsx` gives an unauthenticated viewer: **view/orbit, pin, comment,
measure (two-point distance), interior/orbit toggle.** That is a real foundation — pins and
comments already persist against a share token — but the measurement half is one tool deep.

### 3.1 Target toolbar

Built on our own design system (Graphite Glass tokens, 48–72 px field targets, one accent per
surface, no `rounded-full`), **not** a copy of DroneDeploy's chrome:

```
  ┌─────────────────────────────────────────────┐
  │  ↖ Navigate                                  │  always
  │  ⟷ Distance          → length, + profile     │  needs collision mesh
  │  ⬡ Area              → planar + surface      │  needs collision mesh
  │  ⛰ Volume            → base-plane picker     │  needs DSM
  │  ↕ Height            → floor→ceiling         │  needs gravity (have it)
  │  123 Count           → tally                 │  no data dependency
  │  📍 Pin  💬 Comment                          │  already built
  │  ─────────────────────────────────────       │
  │  Layers: splat · mesh · cloud · elevation    │  needs the formats
  │  2D ortho  ·  Snapshot  ·  Export            │  needs COG
  └─────────────────────────────────────────────┘
```

### 3.2 Mobile is not a cut-down desktop

The viewer already adapts (150k splats mobile / 500k desktop). Measurement needs the same
treatment, and phones are genuinely worse at precise picking:

- **Tap-to-place, then drag-to-refine** with a magnifier loupe. Never require a precise first tap.
- **Snapping** to detected planes and edges does more for mobile accuracy than any UI polish.
- Distance / height / count are fine on a phone. **Volume base-plane editing is desktop-only** —
  the same call we already made for the editor.

### 3.3 Every measurement carries its provenance

A number with no context is a liability in construction. Each measurement stores and displays:

```
  12.47 m   ± ~3 cm       ESTIMATED
  measured on: mesh (not splat) · capture 4821 · loop closure 2.8 cm · no control points
```

This is the same four-state vocabulary as the QC card — `VERIFIED` / `ESTIMATED` /
`LOW CONFIDENCE` / `UNREGISTERED` — and it is what lets us honestly ship measurement to clients
without ever claiming survey grade.

---

## PART 4 — The finding that matters

**Nearly every competitive feature is gated on deliverables already at the top of the roadmap.**

| Feature | Blocked on | Already planned as |
|---|---|---|
| Volume, cut/fill | **DSM raster** | *new* — add to A4 |
| Elevation layer, contours | **DSM raster** | *new* — add to A4 |
| 2D map view, overlays | **COG ortho** | **A4** |
| Point cloud layer | **COPC** | **A4** |
| Reliable distance/area | **Collision mesh beside the splat** | *new* — E-track |
| Surface area | Mesh | **B3** |
| Floor area, net wall area | — | ✅ **built** |
| Count | — | UI only |
| Date compare, progress | Two captures in one site frame | **C1** |
| AI count/area/volume | Detection + pose clustering | **F** |
| Annotation report | Measurement store | E-track |

So the answer to *"will the pipeline support this later?"* is **yes — and the work is mostly
already scheduled.** Three additions to the plan, all small next to what they unlock:

- **A4b — DSM/DTM raster export.** Unlocks volume, cut/fill, elevation and contours in one step.
  This is the single highest-leverage addition in this document.
- **A4c — Collision mesh beside every splat.** Turns approximate picks into real measurement.
- **E9 — Measurement store + annotation report.** Persist measurements against a share token
  (pins and comments already do), then render them to a report.

**What we should not do is chase their toolbar.** The tools are commodity. The DSM, repeatable
georeferencing and a defensible accuracy story are the product — and the interior metric twin,
which none of the three ships, is where we are not competing on their terms at all.
