# Reference — Standalone 3D Property Viewer (build prompt, preserved verbatim)

**Status:** REFERENCE ONLY — not scheduled into a phase. Preserved so the exact
build (or a Slate360-restyled rebuild) can be reproduced later without
re-deriving the gotchas below. Brian built a working version of this at
`C:\lolo-preview\site-aerial` (live demo: https://aerial-360-example.vercel.app)
for a different project; this doc is the prompt he'd hand another AI to
reproduce it, restyled for Slate360.

**Where this plugs into the locked plan:** this is a strong reference
implementation for pieces of [TWIN_SERVICE_STUDIO_PLAN.md](TWIN_SERVICE_STUDIO_PLAN.md)
— the measurement toolset (Distance/Area/Volume/Count), the annotation panel
pattern, the 360-pin-on-model pattern (relevant to the pin-attachment design in
§4 of that plan), and the elevation-shader mode. It is NOT the Spark/Gaussian-
splat viewer stack Slate360 uses (this reference is three.js + GLTFLoader +
Pannellum against a textured mesh, not `@sparkjsdev/spark` against a `.spz`) —
treat it as a pattern/UX reference and a source of reusable math
(`measure-math.ts` triangle/plane/volume logic translates directly regardless
of renderer), not a drop-in component library.

**Reference-repo paths only resolve on Brian's machine.** A remote/cloud
session reading this doc must NOT assume `C:\lolo-preview\site-aerial` exists
locally — ask Brian to zip and share the assets, or work from this prompt text
alone.

---

## Original build prompt (verbatim)

Build a single-page 3D property viewer as a Next.js (App Router, TypeScript, Tailwind) app, deployed to Vercel. A fully working reference implementation exists at `C:\lolo-preview\site-aerial` — read it and reuse its logic freely (especially `components/AerialViewer.tsx`, `components/PanoOverlay.tsx`, `components/aerial/*`, `lib/aerial/measure-math.ts`, `lib/aerial/measure-types.ts`). A live example is at https://aerial-360-example.vercel.app/. Rebuild it with our own styling/colors/typography — all behavior identical, only the design skin changes.

### Assets (use these same files while building)

- Processed, web-ready (copy directly into `public/aerial/`): `C:\lolo-preview\site-aerial\public\aerial\` — `model.glb` (4.6 MB Draco-compressed photogrammetry mesh), `pano-1.jpg` … `pano-5.jpg` (8192×4096 equirectangular aerial 360s, ~4.5 MB each), plus `pano-N-cover.jpg` thumbnails.
- Raw originals if reprocessing is ever needed: `C:\Users\bcvol\OneDrive\Desktop\3d model tukee and panos` (52 MB OBJ + five 8192² texture maps + five 12000×6000 panos). Pipeline used: sharp for downscales; `obj2gltf` → `gltf-pipeline -d` for the Draco GLB (177 MB → 4.6 MB).

### Core stack

three.js (imperative, not react-three-fiber) with GLTFLoader + DRACOLoader (decoder from `https://www.gstatic.com/draco/versioned/decoders/1.5.6/`), OrbitControls with damping, and three-mesh-bvh (mandatory — see gotchas). Pannellum from CDN for the 360 viewer.

### Layout

- Full-viewport dark canvas; model is the hero. Header top-left: small eyebrow label + title + one-line controls hint. Top-right: a "concept demo" chip and a pill group with 3D Model / Elevation / Reset view modes.
- Right edge: thin vertical icon rail (collapsible to a single button via chevron): Navigate · Place · Distance · Area · Count · Volume, then a divider, an Annotations list toggle (with count badge), and the collapse chevron. Icon-only, ~36px hit targets, tooltips carry the how-to hints.
- Annotations panel opens beside the rail: one row per item (title + value lines + trash icon), Clear All, closeable, with footer honesty note: "Distances, areas & volumes are approximate — for coordination, not survey. Volume is stockpile-style above a fitted base plane."
- Bottom filmstrip of the five 360 thumbnails: numbered badges (1–5), "360°" chips, hidden scrollbar with soft edge-fade mask, wheel-to-horizontal-scroll, touch swipe. Exactly one caption line below it: "Tap a thumbnail or a marker on the model to step inside a 360° view." No other persistent bottom messaging.
- Compact elevation legend (bottom-left, only in Elevation mode): a small collapsed chip (mini ramp + "0–55 ft" + "i"); expanding reveals the full ramp with tick labels, Low/High range sliders that live-recolor the model (they drive the shader's uMin/uMax), contour-interval key, and a one-line relative-elevation disclaimer.

### Model handling

Photogrammetry GLBs are Z-up — rotate root `x = -PI/2`, then center on origin with the base at y=0. Swap all materials to `MeshBasicMaterial` with the same texture map (photogrammetry looks correct unlit). Frame the camera at a three-quarter aerial angle, targeting slightly below model center so the model rides high in frame and doesn't crowd the filmstrip. Add a subtle dark ground disc + faint grid.

### Elevation mode

ShaderMaterial coloring by world Y — rainbow ramp (indigo→blue→cyan→green→yellow→orange→red, DroneDeploy-style), gentle hillshade term, and white contour lines via `fract`/`fwidth` at auto-picked "nice" intervals (minor + bold major every 5×). Units: scene meters → display feet.

### 360 pins

Five sprite markers snapped to the terrain (downward raycast per position), each a canvas-drawn icon: dark disc, white ring, bright-blue orbit ellipses, "360°" text, and a numbered badge (bright blue fill, dark number — dark-on-light for legibility). Clicking opens the pano. Never raycast sprites directly — pair each with an invisible sphere collider mesh. Gentle scale pulse in the render loop.

### 360 overlay (Pannellum)

Full-screen spherical viewer per pano — `orientationOnByDefault: false` (else phone gyro hijacks the view), no default UI chrome, custom top bar (heavy gradient + text shadows so titles survive bright sky), persistent "360° · drag to explore · pinch or scroll to zoom" badge, close/back buttons, Escape closes. For multi-room tours use one Pannellum instance with all scenes registered and `sceneFadeDuration` for crossfades — never destroy/recreate per photo.

### Measurement tools

Raycast against the terrain mesh; short-click vs drag discriminated by <300 ms and <6 px movement so orbiting never mis-fires a tool:

- **Navigate** — default; also handles pin clicks.
- **Place** — click drops a temp marker and opens a small "Name this place" card (input with "Place N" placeholder, shows relative elevation, Save/Cancel, Enter/Esc). Saved name becomes both the in-scene floating label and the panel row title.
- **Distance** — two clicks → line + floating value label; panel shows 3D length and horizontal length (ft).
- **Area** — click 3+ vertices (live polyline while drawing); clicking the first vertex again auto-closes (16 px screen-space threshold), ✓/Enter also work; renders closed loop + translucent fill; reports plan area (sq ft), perimeter, and elevation range inside the outline ("Elevation 8–22 ft (Δ 13.6 ft)" via grid-sampled raycasts).
- **Volume** — same polygon flow; fits a least-squares base plane to the outline, grid-samples terrain height inside (48×48 raycasts), integrates; reports Net / Fill / Cut in yd³ and ft³.
- **Count** — each click adds a small numbered marker; ✓/Enter finishes into one "Count N · X items" entry (singular/plural handled).
- While drawing: a floating chip shows "Tool · N points" with ✓ (disabled until valid) and ✕; Escape cancels. Switching tools cancels a draft (count auto-finishes).
- Numbering resets: track live counts per kind; when the last item of a kind is deleted (or Clear All), that kind's sequence resets to 1. Deleting an item removes its scene objects and disposes geometries/materials/textures.
- In-scene value labels are canvas-texture sprites (rounded pill, accent border, white text).

### Critical gotchas (each cost real debugging time)

1. `three-mesh-bvh` is required: `computeBoundsTree()` on every terrain geometry after load, `Mesh.prototype.raycast = acceleratedRaycast`, `raycaster.firstHitOnly = true`. Without it, volume's ~2,300 raycasts against a 700k-triangle mesh freeze the browser for 30+ seconds.
2. Every `CanvasTexture` needs `tex.colorSpace = THREE.SRGBColorSpace` or icon colors render darker than the same hex in HTML/CSS and won't match your UI.
3. Sprite raycasting is unreliable — use invisible sphere colliders.
4. Keep top/bottom UI scrims light (`from-black/40`-ish); heavy gradients make the frame look unevenly dark.
5. Number badges: dark text on bright fill, never white-on-light-blue.
6. Vercel: generic project names may already be squatted by strangers — after deploying, run `vercel inspect` and confirm the actual alias serves your content before sharing any URL.

### Honesty rule

All readouts are relative/coordination-grade (unregistered model, no GCPs). Keep the disclaimer in the panel footer and label elevations "relative." No survey-grade claims anywhere.

### Notes from Brian on portability

The reference-repo paths in the prompt only resolve if the other chat runs on this same machine — if it's a cloud/remote chat, tell it to ignore the local paths (zip the assets somewhere reachable instead). Since Slate360 is where the 3D models will actually live long-term, this project should add model-switching (a manifest of models rather than one hardcoded GLB) — the prompt's architecture supports that cleanly, just parameterize the asset paths.

---

## When to actually build this for Slate360

Not scheduled — this is a reference asset. Candidates for when it becomes relevant:
- **Phase F3** (Plan tab, floor plans/areas) could borrow the Area/Volume math for a
  measurement cross-check UI, translated onto the Spark viewer's coordinate space.
- **Phase G** (client portal) could reuse the annotation-panel and filmstrip UX patterns
  for the portal's pin/photo-explorer surfaces.
- If a **standalone exterior/aerial product** is ever scoped (separate from the interior
  splat service), this prompt is close to a direct rebuild — restyle to Graphite Glass /
  Twin blue, parameterize the GLB/pano set per the model-switching note above, and swap
  the accuracy disclaimer to match Slate360's locked estimating-grade language.
