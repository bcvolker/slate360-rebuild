# ASU Sun Deck — Delivery Plan (revised 2026-07-16)

**FOCUS RULE (Brian): the deck/concrete surface is the survey subject.** Building
roofs and steel beams appear in the data and remain included, but accuracy,
analysis, and acceptance gates are all measured ON THE DECK. Roof/beam
imperfections in stitched products are acceptable; deck imperfections are not.
This helps us: the deck is FLAT — the well-conditioned case for every remaining
registration step.

Data root: `C:\ASU-Survey` (never `.tmp`). Cloud: Modal app
`slate360-photogrammetry`, volume `asu-rgb-flights`. State detail in memory file
`slate360-thermal-studio-v2-rebuild.md` + `THERMAL_LIVE_VIEWER_SPEC.md`.

## Done (foundation proven)
- Thermal decode (251+89 frames, absolute °C) · COLMAP sparse 917/917 · metric
  ENU alignment at thermal origin (0.43 m median) · dense 18.6M-pt cloud ·
  ortho v1 (geometry proven; render quality poor) · viewer mockup v3 (shared
  georef frame, wipe, hover w/ NO DATA, source-frame inspector demo) · drain
  drawings in hand (repair sheet 1 = labeled drain map; RDH sheet 33 = EJ/markup).

## The build queue (in order — each step unblocks the next)

1. **Ortho quality pass — DONE 2026-07-16 (v3)**: median-of-top-N per cell +
   DEM nearest-valid fill (100% finite) + RGB nearest-valid fill capped 12px
   (the cloud paints only ~15% of the 128MP canvas; empty pixels are a
   connected speckle sea, so component-size inpaint could never fire) + 3px
   median. Deck black-void 59% (v1) → 0.04% (v3); deck features crisp.
   `colmap_rgb_orthomosaic_v3.jpg` + `dem_v3.npz` in deliverables; swapped
   into viewer P1 assets.
2. **DONE 2026-07-17: thermal poses + rig + REGISTERED PANORAMA SHIPPED.**
   image_registrator: 229/251 MAX 6-DoF poses. Rig IRX→MAX solved via
   template-init + gradient-ECC (scale 3.12, centered; visually verified,
   qc_rig_*.jpg). tools\paint_registered_panorama.py projects every frame
   through dem_v3 into the ortho 3cm grid, per-pixel median of ~10 overlaps
   (66M samples) → panorama_registered.npz → viewer chapters + hover grid.
   Wipe QC (qc_wipe_*.jpg): deck features coincide; roofs show expected
   parallax ghosting (deck-first rule tolerates). TRUE-ORTHO also shipped
   (ortho_hires_v2.jpg, 2cm, gain-compensated, deck void 0.16%) and is the
   viewer base map. AWAITING Brian's swipe verdict + formal tie-point RMSE.
   Original plan (superseded):
   a. Primary: 2D-match each paired MAX visible against the finished ortho
      (nadir-vs-nadir; the deck's flatness makes this well-conditioned) → pose
      from homography + known altitude.
   b. Secondary: `image_registrator` into the 3D model for frames where (a) is
      weak. Note: no usable factory rig calibration exists (the M3T profile is
      the wrong camera) — solve the IRX↔MAX rig map once from image pairs.
3. **Thermal projection → aligned radiometric panorama** (same day as 2):
   project through the DEM (deck plane dominates). Produce BOTH chapters from
   one grid: A = raw Ironbow untuned; B = tuned/pattern layer (populates fully
   after analysis). Gate: wipe-test vs ortho ON DECK FEATURES (EJ straight,
   score lines continuous, drains coincident) + numeric EJ straightness check.
   v5 retires only after this passes Brian's eye.
4. **DONE 2026-07-19 (deadline path): drains SHIPPED as plan locations.**
   15 drains color-extracted from repair sheet AE102X (blue dot isolate),
   georeferenced via rotation-from-north-rosette (-79 deg) + known scale
   (1"=10' @150dpi ~= 2cm/px) + translation voting with deck-validity
   scoring. Labeled "plan location, not field-verified, +/-0.3-0.6 m" with
   dashed uncertainty circles (round-10 consensus labeling). Viewer layer
   wired + THERMAL-ON-TERRAIN drape shipped (PHOTO|HEAT toggle on TERRAIN
   tab). ODM abandoned for deadline (still meshing at T-minus; becomes
   post-deadline upgrade). Original plan (superseded):
   **Drain callout layer** (parallel, ~half day): extract drain symbols from
   repair sheet 1 (leader-follow + glyph-cluster per external consensus; human
   verify pass mandatory — reviewer page, keyboard accept/reject); one
   control-point alignment onto the ortho → drain boxes/halos land georeferenced.
   Also powers the drain-centered halo analysis (architect H6).
5. **Splat training** (1 GPU overnight, after 2-3): gsplat from the aligned
   model (+ registered nadir visibles for top-down coverage). Deliverable file
   ~2 days out; appears on the 3D tab when viewer phase-2 wires it. Framed as
   aerial fly-around.
6. **DONE 2026-07-19: ANALYSIS SHIPPED (locked methodology).**
   toolsnalyze_deck.py: concrete-only deck mask (brightness band 115-192
   excludes membrane AND white low-e surfaces — first pass without the
   ceiling put every hit on canopies/HVAC, caught by QC), 5m robust local
   background, local-MAD z-map, BH-FDR q<0.05 (z_thr 2.21), area/shape
   filters, confounder screen w/ cap rule. RESULT: 14 findings (2 warm, 12
   cool), headline = intense cool anomalies (-6..-7C, F1/F5) clustered
   within 4m of DRAIN 6 which independently shows the strongest halo effect
   (-1.76 sigma), plus F3 1.1m from drain 3 (halo -0.63): coherent
   drain-proximate moisture story in evidence language. findings.json,
   drain_halos.json, pattern_layer.png. Viewer: 14 color-coded map markers +
   clickable finding cards (fly-to), disclosed threshold/reference/single-
   epoch text. Original plan (kept for reference): **Analysis pass** (after 3+4; context now largely in hand — RDH report +
   repair sheets): deck-field moisture detection w/ recipes, drain-halo radial
   profiles, EJ-line signatures, pattern layer + callouts + plain-language
   findings (replaces mockup placeholders). Sq-ft via drawing scale.
   **SLOPE INTEGRATION (Brian 2026-07-16 — slope is an analysis input, not a
   nuisance):** (a) per-pixel slope/aspect from the SMOOTHED DEM → every plume
   gets a gravity cross-check (downslope-trailing = coherent; upslope = artifact
   or pressurized source → flag); (b) ponding basins via depression filling →
   the three-evidence overlay (predicted ponding ∩ thermal signature ∩ drain);
   (c) as-built slope-direction map vs RDH H3/H4 negative-slope claims and vs
   repair-sheet-3 designed slopes — whole-deck test of their point findings.
   Framing rule: "photogrammetric relative topography" — slope DIRECTION and
   basins at ≥0.5 m scale, never code-compliance slope certification (no GCPs).
   Projection-wise slope is already handled (thermal projects through the DEM;
   no flat-deck assumption exists anywhere in the pipeline).
7. **Real viewer build P1 — v1 SHIPPED 2026-07-16** (`C:\ASU-Survey\deliverables\
   THERMAL_VIEWER_P1.html`, builders in `C:\ASU-Survey\viewer\build_assets_p1.py`
   + `build_viewer_p1.py`). Working: pan/zoom engine (drag/wheel-to-cursor/
   pinch/±/FIT/dblclick/keys), Compare|Blend exclusive modes, Chapter A raw
   (full envelope −21..57°C) | B tuned (2-98 pctl 9.2–27.9°C, DEFAULT) with
   recipe-disclosure chip, null-safe hover+tap temps, dynamic scale bar,
   source-frame inspector, layer rail (drain layer stubbed PENDING), honest
   findings empty-state + locked template preview, single-epoch banner, coach
   marks, insignia v5 boot+watermark, mobile sheet+pinch. Unwired tabs hidden.
   Verified headless (fit/zoom/wipe/hover/NO DATA/chapters/modes/inspector all
   pass). Remaining in P1: Brian eye-pass; P2 wires 3D/360 when assets land.
   Original scope note (Brian
   2026-07-16: build while waiting on processing to save time). P1 does NOT
   need the corrected panorama to begin: shell + MAP tab + wipe/blend modes +
   hover/tap temps + layers + finding cards build against the CURRENT assets
   (COLMAP ortho + v5 thermal + temp grid, already georef-matched); the
   corrected pano and real findings swap in as data files when ready — that is
   the whole point of the config-driven design. Build to
   THERMAL_LIVE_VIEWER_SPEC §§1-3d, 6b, **6c (round-2 rules: Chapter-B-default
   landing, locked finding-card template + banned words, recipe disclosure,
   pattern legend, evidence stack, three-evidence layer, exclusive
   Compare/Blend modes, distinct pin affordances, hidden unwired tabs, mobile
   bottom tabs, coach marks, sq-ft strip, single-epoch banner)**. P2 wires
   3D/360 tabs when splat/spheres assets land.
8. **DONE 2026-07-19: REPORT TAB SHIPPED.** Full report document in-viewer:
   NDT-framing synopsis, executive summary (auto-populated from findings.json),
   theory-vs-evidence matrix (architect drain-membrane / RDH expansion-joint /
   transient-alternative scored against deck-pattern, drain-clustering, halo,
   drainage evidence), what-is-not-established, next-steps (dry re-flight),
   methodology+limitations, certification block w/ seal+signature, print/
   save-as-PDF (window.print + print CSS -> light theme). Drain overlay system
   also shipped (opacity slider + edit/place tool + ENU billboards on map/
   thermal/3D/terrain). REMAINING: host the link. 3D/terrain quality = post-
   deadline OpenMVS-on-dense-cloud track (ODM timed out, exit 124). Original:
   **PDF + branding**: signature photo still pending from Brian; insignia done.

## Standing gates
- Every stitched/aligned product: wipe-test + deck-feature checks before Brian
  sees it labeled "fixed". No auto-extracted drain point ships unverified.
- Hover readouts: NO DATA outside coverage, everywhere, always.
- The stitched pano is no longer a single point of failure (pattern layer +
  source-frame inspector carry presentation/credibility independently).


## Cross-track audit reconciliation (2026-07-19, external Kimi-assisted pass)

`docs/design/MAP_MODEL_FIX_EXECUTION_PLAN.md` covers three tracks; only **Phase 9**
is ASU. Phases 0-8/10 (Site Walk plan maps, PWA cache, Twin viewer/native iOS,
location consistency) are a SEPARATE workstream -- valuable, but explicitly
POST-ASU. Do not interleave them with the survey deadline.

CONFIRMED CORRECT (adopted):
- `patch_ortho.py` is OBSOLETE -- already applied; its anchor targets the old
  implementation. Do not re-run. Archive as historical evidence.
- `georef_app.py` reads a STALE hardcoded path (`/data/work/ortho/dem.npz`).
  Shipped products are `dem_v3.npz` + the true-ortho path. Must accept an
  explicit NPZ path before it is trusted for validation.
- ASU acceptance surface is `C:\ASU-Surveyiewer\` + its generated
  deliverable. `ThermalTwinOverlayMap.tsx` is the Thermal Studio GPS-pin MVP --
  the WRONG surface. Do not wire ASU into it.
- Remaining ASU delivery gates: host the share link, Brian's wipe eye-pass, and
  a formal tie-point RMSE (still outstanding -- promised, not yet measured).
- Moonshot key had a doubled `sk-sk-` prefix (independently confirmed by direct
  401 test). Kimi tooling is non-functional until corrected.

SUPERSEDED BY NEWER EVIDENCE (2026-07-19 late):
- The plan calls ODM "an optional post-deadline experiment." That framing is now
  outdated in one important respect: the ROOT CAUSE of every ODM failure was
  found -- ODM discards the COLMAP model and rebuilds its own dense cloud at
  **247M points / 6.9 GB** (vs our COLMAP 18.6M / 502 MB). That is why renderdem
  thrashed at 38 GB / 37 CPU-hours and Poisson returned a degenerate 36 KB mesh.
  Parameter tuning (octree depth, dem-resolution) could never fix it.
- RESOLUTION: Poisson run DIRECTLY on the COLMAP cloud produced a real mesh in
  ~1 min -> 2.66M verts / 5.31M faces -> voxel-cluster decimated to 441,376
  faces / 216,570 verts -> **coverage.glb, 8.8 MB, glTF 2.0 with COLOR_0 vertex
  colors** (deliverables\coverage.glb; tools\mesh_from_colmap.py +
  tools\mesh_post.py). This is the 3D product; ODM is no longer on the path.
- Mesh carries vertex colors, NOT photo-projected texture. Reads as a clean
  solid model, not photoreal. Photo texturing = post-deadline upgrade.


## 2026-07-19 late — 3D SHIPPED + alignment measured + deliverable assembled

- **coverage.glb wired into TERRAIN.** Minimal in-viewer GLB parser (POSITION +
  COLOR_0 + indices; no three.js). UV derived from WORLD XY so the photo map and
  thermal drape register on real geometry with no UV attribute. Modes:
  PHOTO | HEAT | 3D COLOR. Parser + frame alignment verified headless in Node
  (deck frame proven inside mesh bounds). DEM heightfield retired.
- **Formal tie-point RMSE measured** (tools	ie_point_rmse.py):
  9 auto-matched deck control points, median 40.8 cm, RMSE 39.4 cm, p95 57.5 cm,
  systematic bias only (-4.0, +3.3) cm. Offsets point in RANDOM directions and
  bias is ~0 => most of the residual is cross-modal template-matching error, not
  a real shift. Reported in the REPORT tab as a CONSERVATIVE UPPER BOUND with
  explicit "not survey stake-out accuracy" language. Artifacts:
  alignment_rmse.json, qc_tie_points.jpg.
- **Deliverable assembled**: deliverables\ASU_DELIVERABLE\ = index.html +
  coverage.glb + tiles\ (108 MB). This folder is the hosting unit -- the HTML
  must stay next to coverage.glb and tiles\.

REMAINING: host the folder; Brian's drain-plan fit (COPY FIT numbers) to bake in;
photo-texturing the mesh + splat retrain = post-deadline upgrades.
