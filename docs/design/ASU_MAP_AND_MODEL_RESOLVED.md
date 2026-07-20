# ASU sun-deck survey — 2D map + 3D/terrain: root cause and resolution

Status: **RESOLVED** (2026-07-19). Supersedes the open items in
`MAP_MODEL_FIX_EXECUTION_PLAN.md` for the map/model track.

## What was actually wrong

Two days of failures on the 2D map came from one architectural mistake: a
hand-rolled orthophoto blender. It picked a winner photo per pixel (nadir-
dominant, winner-take-all) and then tried to hide the joins with a
border-difference least-squares offset.

That cannot work, and four independent external reviews said so unanimously.
The border-difference solve constrains **only the seam pixels**. Each
photo footprint keeps its own uncorrected low-frequency illumination gradient
across its interior, so every footprint lands as a visibly distinct tonal
polygon no matter how well the borders match. The minimum correct algorithm is
three things together — full-overlap radiometric balance, graph-cut seam
placement, and multi-band blending — not a better version of the offset solve.

The 3D/terrain complaints had a **separate** cause that the map failure masked:
the mesh shader draped the (bad) nadir ortho onto geometry using world-XY UVs.
On the flat deck that is correct and looks fine. On vertical faces — the
stadium bowl, building facades — a top-down image stretched downward smears
into vertical streaks. That read as "unusable model" but the geometry was
never the problem.

## The fix

Stop hand-rolling photogrammetry finishing; use a tool that already implements
the correct algorithms. `colmap mesh_texturer` (COLMAP 4.1.1) does view
selection + seam levelling and consumes exactly the assets already on the
volume (`/data/work/dense` undistorted images + sparse model).

Pipeline (`tools/` in `C:\ASU-Survey`):

1. `texture_mesh.py decimate` — Open3D **quadric** decimation, 5.31M → 800k
   tris, largest-connected-cluster filter drops Poisson floating islands.
   (Voxel-cluster decimation was wrong: it rounds parapets and destroys the
   paint-line/drain-edge detail texture baking needs.)
2. `texture_mesh.py texture` — `colmap mesh_texturer` → `mesh.ply` +
   `texture.png` (16384×6480 atlas, per-**face** texcoords).
3. `make_textured_glb.py` — un-index (each triangle owns its 3 UVs, since glTF
   needs per-vertex UVs) → `coverage_textured.glb`, atlas → 8192-wide JPEG.
4. `ortho_deck_1cm_mesh.py` — nadir z-buffered raster of the textured mesh
   into the deck ENU frame at 1 cm → `deck_ortho_mesh_1cm.jpg`
   (12135×8133, **100 % coverage**). This inherits mesh_texturer's blending,
   so it is the orthophoto the custom blender could never produce.
5. `viewer/make_tiles.py <src> 0` — the `0` scale means "already the deck
   frame, no georef crop". Pyramid L0–L3, L3 = 12135×8133 real 1 cm.

## Frame identity (why this dropped in with no coordinate changes)

Deck frame == viewer MESH frame == thermal v5 canvas == coverage.glb world XY:

    x -66.66 .. 54.69 m   (121.35 m)
    y -70.04 .. 11.29 m   ( 81.33 m)

121.35 / 0.03 = 4045 px and 81.33 / 0.03 = 2711 px — the existing 3 cm crop
dimensions exactly. So the new render lands on the same georeferenced frame and
the wipe/hover/thermal-drape math is untouched.

## Viewer changes (`viewer/build_viewer_p6.py`)

- Mesh shader gained `attribute vec2 auv` + `uniform float uAtlas`. With the
  atlas bound it samples real per-triangle UVs; otherwise it falls back to the
  world-XY drape. Heat drape still uses world XY either way.
- Loader is best-first: fetch `coverage_textured.glb` when the page is
  **served**, else the embedded base64 vertex-coloured GLB. `fetch()` of a
  sibling file is blocked on `file://`, so the double-click-from-disk case must
  keep working with no network.
- Handles un-indexed primitives (`drawArrays`) and rescales the atlas if it
  exceeds `MAX_TEXTURE_SIZE`.

## Two bugs worth remembering

- **glTF JSON chunk pads with SPACES (0x20), not zeros** — only BIN pads with
  `\x00`. Padding JSON with NULs makes `TextDecoder` + `JSON.parse` throw
  "Unexpected non-whitespace character after JSON". Fixed in the generator;
  `tools/fix_glb_json_padding.py` repairs existing files. Note the stored chunk
  length *includes* the padding, so a naive patcher sees an aligned length and
  no-ops — strip the NULs first.
- **The p1→p3 asset chain does not produce every key `build_viewer_p6` needs.**
  `mesh`, `signature_b64`, `plan_b64`, `tiles_meta` were injected ad-hoc from a
  shell in an earlier session, so re-running p2/p3 silently dropped them and the
  build died on `KeyError: 'mesh'`. Now reproducible as
  `viewer/build_assets_p4.py`. Chain is **p1 → p2 → p3 → p4 → build_viewer_p6**.

## Verification (measured, not assumed)

- 2D map: visual inspection of the deck crop — no tonal polygons, no seams,
  uniform exposure; vehicles/HVAC/membrane/seating/vegetation all sharp.
- 1 cm deck render: 100 % coverage, 123,430 tris in frame.
- 3D/terrain: 800,000 tris load, atlas UVs bound. Framebuffer readback with the
  atlas ON vs OFF gives local detail roughness **8.07 vs 3.36** (2.4×), and the
  drape's washed-out flat mean (113,113,114) matches the smearing seen in the
  oblique renders. Atlas path confirmed to carry real per-face detail.
- Oblique renders (`tools/oblique_check.py`) are the honest geometry check a
  nadir view hides: deck flat and true, curbs/poles/vehicles/parapets crisp, no
  spikes, no floaters.
- Hosted folder `deliverables/ASU_DELIVERABLE/` served and confirmed: 800k
  tris, atlas bound, 4 tile levels.

## Still outstanding

- **Drain plan fit — needs Brian.** Only he can place it exactly:
  Layers → DRAIN PLAN → align → COPY FIT.
- Splat retrain (post-deadline): the post-hoc prune 8.5M → 800k destroyed
  opacity support; needs a retrain with absgrad in **both** rasterisation and
  `DefaultStrategy`.
