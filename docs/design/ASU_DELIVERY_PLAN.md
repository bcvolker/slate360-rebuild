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

1. **Ortho quality pass** (hours) — median-of-top-N per cell + DEM median filter
   + small-hole inpaint in worker `ortho()`. Output: solid presentation RGB map
   + clean DEM. Gate: hole-free over the DECK (roof gaps acceptable).
2. **Thermal poses — deck-optimized** (the key step, ~1 day):
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
4. **Drain callout layer** (parallel, ~half day): extract drain symbols from
   repair sheet 1 (leader-follow + glyph-cluster per external consensus; human
   verify pass mandatory — reviewer page, keyboard accept/reject); one
   control-point alignment onto the ortho → drain boxes/halos land georeferenced.
   Also powers the drain-centered halo analysis (architect H6).
5. **Splat training** (1 GPU overnight, after 2-3): gsplat from the aligned
   model (+ registered nadir visibles for top-down coverage). Deliverable file
   ~2 days out; appears on the 3D tab when viewer phase-2 wires it. Framed as
   aerial fly-around.
6. **Analysis pass** (after 3+4; context now largely in hand — RDH report +
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
7. **Real viewer build P1** (parallel with 5-6): shell + MAP tab + wipe + hover
   + layers per THERMAL_LIVE_VIEWER_SPEC (incl. §3c source-frame inspector +
   pattern-layer wipe target, §6b shared-frame rules). P2: 3D/360/FIND tabs.
8. **PDF + branding**: signature photo still pending from Brian; insignia done.

## Standing gates
- Every stitched/aligned product: wipe-test + deck-feature checks before Brian
  sees it labeled "fixed". No auto-extracted drain point ships unverified.
- Hover readouts: NO DATA outside coverage, everywhere, always.
- The stitched pano is no longer a single point of failure (pattern layer +
  source-frame inspector carry presentation/credibility independently).
