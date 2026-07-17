# ASU Sun Deck — Moisture Analysis Methodology + Ground-Capture Protocol (LOCKED 2026-07-17)

Multi-AI round-6 consensus, triaged and adopted. This is the methods contract
for the analysis pass (P-E) and the future ground-capture mission. Read with
ASU_EXECUTION_PLAN_SONNET5.md.

## A. Moisture analysis (the analysis pass MUST follow this)

### A1. Candidate detection (deck field)
1. Deck mask + material mask (exclude metal, prefer concrete-only pixels).
2. Robust local background (moving median / low-order robust surface,
   3–7 m window, DISCLOSED) → residual r = T − T_bg.
3. Normalize by LOCAL MAD → z-map. Detect |z| > 2–3 (sign per hypothesis:
   under-slab moisture pre-dawn is typically WARMER by conduction; surface
   evaporation reads COOLER — state the expected sign per hypothesis).
4. FDR control (Benjamini–Hochberg q<0.05) across deck pixels — credibility
   upgrade, adopt.
5. Connected components: min area ≥ 0.25–1 m², compactness filter
   (4πA/P² — rejects linear thermal bridges/pipes), reject aspect >5:1.
6. MANDATORY per candidate: source-frame verification (real in the raw
   unstitched frame?) before it can rank Tier 1.

### A2. Drain-halo test (architect H6, ~4 ft halos)
- EXCLUDE the metal core (grate + flashing, r < 0.3 m): metal ε≈0.2 reflects
  cold sky pre-dawn → false extreme readings. Grate reported separately as
  "emissivity-confounded, not interpreted".
- Halo statistic on CONCRETE annuli 0.3–2.0 m; control rings matched on
  radius + sky-view + distance-to-edge (not radius alone); report mean
  residual ΔT per annulus with bootstrap CI; multiple-comparison correction
  (Holm) across ~15 drains.
- H6 signature = elevated 0.5–1.5 m band decaying outward; disclose if absent.

### A3. Slope/ponding — DEMOTED to supporting annotation
Photogrammetric DEM (no GCPs) is prone to low-frequency dome/bowl warp:
valid for LOCAL slope (2–3 m gradients) + local depression ponding zones;
NOT valid for global drainage paths or slope certification. Use smoothed
(1–2 m Gaussian) slope/aspect as a qualitative gravity-consistency note per
finding. The three REAL evidence legs are: (1) FDR-controlled thermal
anomaly, (2) emissivity-controlled drain halo, (3) dry-epoch differential
persistence (after re-flight). Disclose DEM vertical uncertainty.

### A4. Theory ranking — qualitative tiers + evidence table
Tiers: MOST CONSISTENT WITH DATA / PLAUSIBLE ALTERNATE / LESS CONSISTENT /
NOT ESTABLISHED. Never percentages.
**Cap rule (adopt): any unexcluded confounder caps a finding at "plausible".**
Per-finding evidence table columns: geometry+area · ΔT & z & FDR q · drain
proximity/halo stats · slope-context note · confounder screen results ·
dry-epoch persistence (pending) · source-frame verified · RDH-claim relation
· tier + one-line basis · next verification step.
Footer on every card: "Ranked professional opinion (ITC Level III). Not a
confirmation of moisture content or system failure. Engineer of record: RDH."

### A5. Confounder screen (run for EVERY finding before tiering)
| Confounder | Rule-in signature | Rule-out test |
|---|---|---|
| Sky-view cooling | pattern follows edges/parapets | SVF map from DEM; interior anomaly persists |
| Emissivity (paint/stain/patch) | matches visible material boundary | RGB ortho cross-ref; boundary mismatch |
| HVAC exhaust | near unit, wind-smeared | unit locations + wind record |
| Prior-day shading | matches structure shadow line | shadow model from DEM (sun pos previous afternoon) — until modeled, flag UNEXCLUDED (caps tier) |
| Surface water film | rain history, RGB sheen | dry-deck protocol + differential |
| Stitch/alignment artifact | follows seams/flight lines | source-frame inspector |

## B. Ground 360 capture protocol (Brian's future walk)
- **Clock-sync ritual first**: photograph a phone clock with BOTH the 360
  camera and the thermal camera (this is the key for pinning timed thermal
  shots to walk positions).
- Walk 0.5–0.8 m/s smooth ("ninja walk"), camera at/above head height on
  pole; dark plain clothing.
- Route: (1) perimeter loop (facade bases = aerial lock gold), (2) serpentine
  deck lanes 1.5–3 m spacing, (3) cross-ties every ~25 m, (4) revisit 3–5
  marked spots (loop closures; figure-8s), (5) interiors LAST.
- Doors/stairs: stop at threshold, look both ways slowly, walk through slow,
  turn and look back. Continuous video through every transition.
- Lock exposure if the camera allows; lights ON indoors; stay ≥0.5 m from
  walls (stitch seams); avoid harsh noon sun (overcast/golden hour ideal).
- Featureless rooms: lay tape crosses/AprilTags as temporary texture; blind
  rooms may need 3+ manual tie points (door-frame corners) — budget for it.
- Timed handheld thermal: stand still 1 s per shot; optional voice note.
- iPhone LiDAR: SKIP for v1 (deck merge is image-overlap, not LiDAR); only
  for a specific featureless interior room that fails photogrammetry, as a
  separate aligned layer.

### B2. Processing (when the walk happens)
Extract 1–2 fps (sharpness-filtered), equirect → 4-6 cube faces (90° FOV,
PINHOLE), mask nadir ~25-35% (operator) + stitch seam band, sequential +
spatial matching, register INTO the existing aerial model (continue mapper /
image_registrator — never rebuild from scratch; the aerial frame is already
metric ENU). Interiors bridge via door-transition frames; fallback manual tie
points via model_aligner. Target 2–5k new images max for the first merge.

## C. Splat retrain decisions (round 5+6 merged)
Floater suppression AT TRAINING TIME (absgrad/antialiasing + opacity/scale
regularization + sky handling) ranked above resolution by two of three
reviewers; add the 229 registered MAX visibles as training views (fills the
thermal-flight-covered areas Brian noticed blank); prune by view-accumulated
contribution with per-cell stratification; single-file budget stays ~800k,
hosted streaming (.ksplat chunked LOD) targets 1.5–3M.
