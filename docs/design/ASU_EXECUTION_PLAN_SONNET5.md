# ASU Sun Deck Survey — Complete Execution Plan (Sonnet-5 handoff, 2026-07-16)

This is the single authoritative execution doc for finishing the ASU Sun Devil
Stadium sun-deck moisture survey deliverable. Read it with:
- `docs/design/THERMAL_LIVE_VIEWER_SPEC.md` — LOCKED viewer spec (§0 non-negotiables,
  §6b/6c mockup + round-2 rules). Do not violate it.
- `docs/design/ASU_DELIVERY_PLAN.md` — step ledger with DONE markers.
- Memory: `slate360-thermal-studio-v2-rebuild.md` (ASU state block).

## Mission context (why this matters)

Brian (non-coder CEO, ITC Level III thermographer #140957677) is delivering a
sun-deck moisture survey to ASU leadership. RDH Building Science is engineer of
record (quoted ~$20k for thermal — this pipeline beats it). Audience =
executives. The deliverable is an interactive share link ("SpaceX/Tesla bar"):
100dvh, no page scroll, tabbed, pan/zoom everywhere, dark mission-control
design, hard data accessible, honest evidence language. This is PERSONAL USE
(metering off), and it doubles as the prototype for a new Slate360 deliverable
class.

**FOCUS RULE: the deck/concrete surface is the survey subject.** Roofs/beams
may be imperfect; the deck may not. The deck is flat — every remaining
registration step is well-conditioned because of this.

**EVIDENCE HONESTY (locked):** banned words in findings: confirmed / caused by
/ leaking / failed / defective. ΔT always vs a named reference. Recipe
disclosure chips. Single-epoch banner (one flight, 2026-07-15 pre-dawn;
dry-period re-flight planned as differential test). RDH is EOR.

## Environment + commands

- Data root: `C:\ASU-Survey` (NEVER work under `.tmp` — it got purged once).
  - `102MEDIA\` 251 IRX_*.JPG (radiometric FLIR) + 251 paired MAX_*.JPG (visible, same numbering)
  - `103MEDIA\` 89 + 89 (secondary flight)
  - 4 `DJI_2026…` folders — 917 daylight RGB photogrammetry photos (already on Modal)
  - 8 equirect spheres (12000×6000) at root — 360 tab material (P2)
  - `deliverables\` — all outputs (see Data map)
  - `tools\` — local pipeline scripts (recreated 07-16; keep everything here, commit algorithms to repo docs)
- Repo: `C:\s360`. Push to main after each verified slice (`git add <paths>` only, never `git add .`).
- Modal (profile `bcvolker`): app `slate360-photogrammetry`, volume `asu-rgb-flights`
  (`/images` = 917 photos, `/work` = COLMAP outputs). Worker:
  `workers/modal/photogrammetry/worker.py`. Deploy:
  `cd workers/modal/photogrammetry && PYTHONIOENCODING=utf-8 python -m modal deploy worker.py`.
  Run detached: `PYTHONIOENCODING=utf-8 python -m modal run --detach worker.py::<fn>`.
  Download: `MSYS_NO_PATHCONV=1 python -m modal volume get --force asu-rgb-flights /work/... <local>`.
- FLIR decode: `workers/modal/thermal-analysis/flir_fff_decode.py` (proven absolute °C;
  Planck R1=1143194.6 B=1476.99 O=-15665, emissivity 0.95).

### Traps (each cost real time — do not rediscover)
1. `PYTHONIOENCODING=utf-8` prefix on all Modal/Trigger CLI (cp1252 console crashes on ✓).
2. `MSYS_NO_PATHCONV=1` on `modal volume` paths (Git Bash mangles `/images` → `C:/Program Files/Git/images`).
3. COLMAP 4.1.0 flags are `FeatureExtraction.*` / `FeatureMatching.*` (NOT `SiftExtraction.*`).
4. NO factory rig calibration: `dji-mavic-3t.json` is the WRONG camera (ours = FLIR Systems AB IRX). Solve IRX↔MAX from data.
5. Browser screenshots of heavy pages time out on this machine — verify via DOM JS instead.
6. Bash heredocs with nested quotes break — use the Write tool for scripts.
7. `tsc --noEmit` globally OOMs the repo — scoped tsconfig only (not relevant to ASU work).
8. Modal detached runs survive local network drops — always `--detach` for long jobs.

## Data map (deliverables\)

| File | What | State |
|---|---|---|
| `mosaic_main_flight_v5.npz` | v5 thermal mosaic grid (temperatures, gsd_m=0.03, origin_world) | fallback; being replaced by registration |
| `colmap_rgb_orthomosaic_v3.jpg` | 11360×11324 ortho @3cm, deck void 0.04% | GATE PASSED |
| `dem_v3.npz` | DEM (100% finite) + `origin=[x0,y1]`, gsd | done |
| `registration_102.json` | per-MAX-frame H → ortho global px | step 2a in progress |
| `index_102MEDIA.json` | per-IRX min/mean/max/lat/lon/time | done |
| `npz/` | 251+89 per-frame decoded °C grids | done |
| `THERMAL_VIEWER_P1.html` | the interactive link, v1 | LIVE, iterating |
| `_viewer_assets*.json` | viewer asset bundles | rebuilt per data drop |
| `qc_*.jpg` | QC previews | evidence trail |

**Georef identity (proven):** `ortho[5327:, 5327+TH; 2942:2942+TW]` == thermal v5
frame pixel-for-pixel @3cm. Ortho origin `(-154.91, 171.09)` ENU; ENU anchored at
thermal origin lat/lon `33.4277667, -111.9322333`. Everything (ortho, DEM,
thermal grid, splat) shares this metric ENU frame — this is the whole alignment
strategy: **pre-register all rasters to one frame; the viewer never aligns, it
only displays.**

## Viewer architecture (P1 shipped 2026-07-16)

Built OUTSIDE the repo for iteration speed: `C:\ASU-Survey\viewer\`
- `build_assets_p1.py` — packages `_viewer_assets_p1.json` (ortho crop b64, chapter
  A/B thermal PNGs w/ alpha, null-safe temp grid, source frames, insignia v5 svg, render meta).
- `build_viewer_p1.py` — template → self-contained `THERMAL_VIEWER_P1.html`.
  Rebuild after ANY asset change: `cd C:\ASU-Survey\viewer && python build_assets_p1.py && python build_viewer_p1.py`.

Working in v1 (all DOM-verified): pan/zoom engine (drag/wheel-to-cursor/pinch/
±/FIT/dblclick/keys, zoom-aware scale bar, clamped pan), Compare|Blend exclusive
modes, Chapter A raw (full envelope) | B tuned (2–98 pctl, DEFAULT landing) +
recipe chip, null-safe hover/tap temps (NO DATA), source-frame inspector, layer
rail (drain stubbed), honest findings empty-state + locked template preview,
single-epoch banner, coach marks, insignia v5 boot+watermark (72px @12%
bottom-right; CLEAR ZONE rule — nothing overlaps it; sole exception = Brian's
signature in sign-off contexts), mobile bottom sheet + pinch. Unwired tabs
HIDDEN. Local preview: `python -m http.server 8799` in deliverables + browse.

**P1.2 (2026-07-16 late, Brian's UX round):** Brian OVERRULES hidden-unwired-tabs —
the left rail must be a prominent panel of sections. Shipped: 82px rail w/ 5
labeled tabs (MAP / THERMAL / 3D / PLANS / REPORT — unready ones show honest
status cards, never dead ends), THERMAL = IR-only view, full-res 4045px map,
click-anywhere→nearest raw source frame (all 251 embedded; desktop click,
mobile double-tap), isotherm threshold slider (grid-driven canvas), ΔT
differential chapter stub (unlocks after dry-baseline re-flight), mobile top
tab bar. Builders: `build_assets_p2.py` + `build_viewer_p2.py` (supersede p1).
Multi-AI round-3 consensus ADOPTED: DSP-SIFT flags + CLAHE + deck-mask for
registration retry if image_registrator underperforms; pose-graph anchor
propagation (4-DoF x,y,yaw); TPS control-point mosaic warp as deliverable-safe
fallback; drains = 6-8 control points + 2-3 held-out checks, AFFINE (all three
agreed; projective only if residuals show structure), uncertainty CIRCLES not
boxes (~±0.5m construction variance, labeled on hover); differential epoch =
top differentiator (stub shipped); evidence-locker crosshairs + briefing tour
+ per-finding evidence stack queued for P2/P3.

**P1.3/P1.4 (07-16 night, Brian's rounds 2-3):** frame boxes removed (click-anywhere
stays; green = drains only), inspector has its own zoom/pan (isolated from map),
raw chapter REMOVED (washed out, no value), 360 pins = BLUE SPHERE icons
(--blue #3D8EFF) opening a lib-free WebGL equirect viewer (7 on-deck spheres
embedded, drag-look + FOV zoom + pinch), provisional-alignment honesty chip,
PLAIN-LANGUAGE pass (audience = non-experts: "MOISTURE CONTRAST", "HEAT MAP",
"PHOTO MAP", "HEAT HIGHLIGHT", "MEASURED TEMPERATURE"; ΔT is a plain COMING-SOON
note, not a dead button — Brian: no unclickable controls without explanation).
Builders: build_assets_p3.py + build_viewer_p4.py (current chain).
**Round-4 AI consensus ADOPTED:** true-ortho = custom (shares engine w/ thermal),
nadir-dominant winner-take-all + exposure equalization (NO wide feather), output
stays 3cm; thermal composite = PER-PIXEL MEDIAN master grid + count/p10/p90 as
QC layers (moisture emphasis via display recipes, never bake low-percentile into
master); cross-modal rig = ECC-on-gradients + MI validation gate over 10-30
pairs, median of params; 22 unregistered frames = exclude transit, propagate
only deck-gap fillers (x,y,yaw graph); QC ship line = deck tie RMSE ≤10cm target
/ 25cm ceiling + zero EJ/drain breaks (three responses ranged 3-25cm); mobile =
current 20MB monolith risky on iPhone → later: async JSON-block parsing +
hosted tiles + offline zip (design asset paths for the split now); REPORT =
qualitative likelihood TIERS (most consistent / plausible / less consistent /
not established), NEVER percentages (unanimous — reads as false precision);
briefing/story mode = unanimous top addition (P2 priority #1, also answers
"what shows first when the link opens").
**Opening experience (proposed to Brian):** boot insignia → 15-second guided
intro (site fly-in on the 3D splat once live → key findings → how to explore)
→ lands on MAP; skippable; deep links bypass.

**Data contract rule: the viewer is config-driven.** New panorama, drain layer,
findings, splat = new data files + rebuild; viewer code changes only for new
interactions. Insignia source: `C:\s360\public\branding\level3-thermographer-insignia.svg`
(v5: top arc = BRIAN VOLKER only).

## Phases from here (execute in order; each has a gate)

### P-A: Thermal registration → aligned two-chapter panorama (ACTIVE)
Brian's #1 issue: thermal and RGB don't exactly overlap. Fix = paint thermal
through per-frame homographies into the ortho's own pixel grid (exact overlap
BY CONSTRUCTION).
1. `tools\register_max_to_ortho.py` (running): per MAX frame — GPS→ENU→ortho
   window (±1400px), CLAHE+RootSIFT(8000)+FLANN 0.8+USAC_MAGSAC 3px → H
   (MAX@1536w → ortho global px). Gates: ≥25 inliers (deck is dominant plane),
   implied center ≤20m from GPS, scale within [0.7,1.4]×median.
   v1 result: 0/251 at 40-inlier gate → tuned as above. If still <60% ok:
   fall back to matching MAX→MAX-mosaic then chain, or `image_registrator`
   into the COLMAP model (secondary path per ASU_DELIVERY_PLAN step 2b).
2. `tools\solve_irx_to_max.py` (NEXT): solve the constant IRX→MAX homography
   from ~10 spread frames (cross-modal: match IRX gradient/edge maps vs MAX
   via ECC or mutual-information grid search; thermal FOV is a centered subset
   of visible). Validate: warp IRX edges onto MAX, eye-check 3 pairs.
3. `tools\paint_registered_panorama.py` (NEXT): for each registered frame,
   H_map←IRX = H_map←MAX ∘ H_MAX←IRX; warp per-frame °C grid (deliverables\npz\)
   into the deck crop grid @3cm; composite = per-pixel MEDIAN of overlapping
   frames (offsets already ±4.7°C from v5 solve; median kills seams); output
   `panorama_registered.npz` (temps + coverage count).
4. GATE (wipe test): build QC overlays at 3 deck features (EJ line, score-line
   grid, drains) thermal-over-ortho at 50% + numeric EJ straightness; Brian
   eye-verifies before v5 retires. Then regenerate viewer assets from the new
   grid (chapters A/B + temp grid + hover) and rebuild viewer.
103MEDIA (89 frames) joins after 102 passes.

### P-B: Drain callout layer (parallel-safe)
Extract drain symbols from repair sheet 1 (leader-follow + glyph-cluster per
multi-AI consensus), georef via affine from ≥3 control points (EJ
intersections + drains VISIBLE in the ortho — do not trust a single point),
`drains.json` = [{id, x_m, y_m, label}]. MANDATORY human-verify pass: build
`drain_review.html` (ortho + candidate boxes, keyboard accept/reject) for
Brian. Only accepted drains ship. Wire into viewer drain layer (already
stubbed in the rail) + drain-halo ΔT readouts per architect H6 (~4ft radius
hypothesis).

### P-C: 3D tab — SHIPPED v1 (2026-07-17 early AM)
Training DONE (30k iters, loss ~0.06, 8.54M gaussians, `/work/splat/scene.ply`
= 1.4GB, local copy deliverables\splat_scene.ply). Web pipeline:
`viewer\convert_splat.py` prunes to ~800k via **DEM-surface filter** (keep
only gaussians within [-4,+3] m of dem_v3 at their (x,y) — 5.4M of 7.7M
in-bounds gaussians were mid-air floater fog; flat z-caps CANNOT separate
floaters from rooftops) + opacity/scale gates + deck-priority ranking →
25.6MB .splat (antimatter15 32B format). Renderer: self-contained WebGL1
instanced splatting in build_viewer_p5.py — EWA covariance (J·WΣWᵀ·Jᵀ; the
transposes MATTER, J·M·J renders black), **AA opacity compensation
sqrt(det0/det1) for the +0.3px dilation** (without it sub-pixel splats stack
into white fog at zoom-out), 16-bit counting sort back-to-front on view
change, orbit/pan/dolly + pinch. QC renders via a localhost PUT server
(viewer\put_server.py) since page screenshots time out. HTML now ~54MB —
desktop OK, REINFORCES the hosted-tiles/mobile split (B2 consensus).
Remaining P-C: Brian eye-pass (sizing/nav/zoom), quality iteration (denser
fill, exposure), thermal overlays per spec §3d.

### P-C-prior notes (training path)
`worker.py::splat` (nerfstudio splatfacto, A10G, ~2-4h): trains on the ALIGNED
model with pose normalization DISABLED (auto-scale/center/orient off) so the
splat lives in the same ENU frame. Export `.ply` → convert to `.splat`/SOG for
web. Viewer P2: 3D tab with antimatter15-style WebGL splat renderer (orbit +
zoom + fly), DEM-draped overlays per spec §3d (never tint gaussians;
depthWrite:false + polygonOffset + 5-15cm lift; CSS2D callouts). Deck-first
framing: aerial fly-around. GATE: Brian checks sizing, navigation, zoom-to-area.
If nerfstudio image build keeps failing, fall back to `gsplat` simple trainer
(write ~200-line trainer) or OpenSplat (has prebuilt binaries + COLMAP input).

**Round-5 consensus ADOPTED (07-17):** splat retrain later w/ floater control AT
TRAINING TIME (sky handling + opacity/scale reg + absgrad; data_factor 2-3) so
the DEM gate can tighten to −1.5/+1.0m; pruning = view-accumulated contribution
+ spatial stratification (top-k per ENU cell), DEM as hard mask not ranker;
web target 1.5-3M gaussians via chunked streaming (.ksplat/LOD, progressive
coarse→fine), 800k stays the single-file/mobile ceiling; HYBRID 3D = textured
mesh "COVERAGE" mode (Open3D Poisson + texture bake preferred over AGPL paths)
+ splat "PHOTOREAL" mode, composited mesh-depth-first (mesh depthWrite +
splat depthTest, never dual-transparent); ortho seams = per-image gain comp
(log-domain LSQ on overlaps) BEFORE winner-take-all, graph-cut only if quilt
remains; occlusion = grazing-angle reject >~50° for deck pixels; thermal QC
gate = 25-40 stratified deck ties, target RMSE ≤10cm / ship ≤20cm / fail >35cm
+ zero visible EJ/drain discontinuity at 4x wipe; client language = inches/
joint-width ("average agreement ~X cm, about the width of an expansion joint"),
source frames as verification path; NEVER "perfectly aligned"/"survey grade".

**P1.6 (07-17, Brian round + round-7 consensus):** TILE PYRAMID SHIPPED (the
real zoom-sharpness fix — unanimous: single flat JPEGs always zoom soft):
viewer\make_tiles.py → deliverables\tiles\L{z}\{x}_{y}.jpg (512px, 3 levels
@2cm now; L3 appends when ortho_deck_1cm lands), viewer loads via relative
<img> (file://-safe, graceful fallback to embedded base if tiles folder
missing — HTML must stay NEXT TO tiles\). Thermal embedded at native 4045px.
Tabs split per Brian: 3D = splat (restored default), TERRAIN = coverage mesh
(separate tab; both to be improved). Right rail simplified to 3 sections
(Compare / Layers / Findings; example card + verbose captions removed).
Insignia+SIGNATURE moved to LEFT rail bottom (98px rail, 74px seal, signature
across lower half, click → enlarged modal w/ cert caption). Builder chain:
build_viewer_p6.py.
**Round-7 astonish-layer triage (adopt order after tiles+mesh+drains):**
(1) Briefing auto-play (unanimous #1), (2) Evidence drawer per finding,
(3) A↔B truth flicker ("colors change, data doesn't"), (4) wet/dry timeline
stub (already partially shipped as note), (5) follow-the-water gravity trace
(MUST label "illustration, not measured flow"), (6) repair-scope ft²×scenario
ranges ("not a bid" disclaimer), (7) RDH claim scoreboard (collaborative
wording), (8) decision pins + Monday-morning one-pager export, (9) confounder
toggle + falsification panel (honesty-raising). REJECTED: fake moisture %,
single-number cost, fear timelines, sonification, VR. Standing gates from
round 7: sharpness gate (EJ crisp at 4×), cache-bust asset names when hosted,
Coverage texture must share the tile source with 2D, overlays unlock on
tiles+mesh (NOT on splat retrain).


**Round-8 adoptions (07-17 PM):** map softness = FINISHING chain (unanimous):
bilinear sampling SHIPPED in ortho_hires (was nearest-int), single-encode q96
+ USM on top tile levels (make_tiles_1cm.py), next = graph-cut seams + local/
Poisson exposure harmonization (the "color triangles"); splat retrain config
locked (factor 2-3 res, +229 nadir views, opacity/scale reg + antialiasing,
NO post-hoc mass pruning, keep 1.5-3M, importance=view-accumulated); 3D
coverage product = SCREENED POISSON textured mesh from fused.ply (heightfield
demoted to sketch); DD benchmark test matrix documented in responses. IA
consensus: findings-first (BRIEF/synopsis -> ranked findings -> free explore),
REPORT = theory-x-evidence matrix + next steps + certification AS CLOSING
MOMENT, opening copy drafts in round-8 responses (NDT framing, EOR retained);
tone softening: sentence case, warm charcoal panels, mono only for data,
"Findings/Evidence/Next steps" vocabulary, no boot theater. Feature top-6
consensus: briefing, evidence drawer, loupe, A-B flicker, one-pager export,
theory matrix (+ confounder toggle). Viewer P1.8: seal = compact popup card
w/ big close, all modals get .bigClose, RESET VIEW buttons on 3D/terrain,
build stamp + MAP DETAIL indicator (diagnosed Brian's tiles as WORKING ->
render was the gap).

### P-D: 360 tab (P2)
8 equirect spheres → pannellum-style WebGL viewer or three.js sphere; pin
sphere positions on the map (GPS from EXIF if present, else Brian places);
map pin ↔ 360 jump per spec §2.

### P-E: Analysis pass (after P-A + P-B)
Deck-field moisture detection w/ disclosed recipes; drain-halo radial ΔT
profiles; EJ-line signatures; SLOPE INTEGRATION per ASU_DELIVERY_PLAN step 6
(per-pixel slope/aspect from smoothed DEM → gravity cross-check per plume;
ponding basins via depression fill → three-evidence overlay = predicted
ponding ∩ thermal ∩ drains; as-built slope map vs RDH H3/H4). Framing:
"photogrammetric relative topography", never code-compliance slope. Findings
→ `findings.json` in the locked card template (banned words enforced) →
viewer FIND tab + callout pins. Hypotheses H1-H5 (RDH) + H6 (architect:
under-slab membrane failure, drain ~4ft halos, 1/16" film).

### P-F: Report + sign-off
PDF export matching viewer branding; Brian's signature photo (STILL PENDING —
white paper phone shot → transparent PNG → across seal lower half ~10°,
sign-off contexts only); insignia final size/opacity = Brian's visual call.

### P-G: Multi-AI critique round 3
After P-A..P-C land in the viewer, Brian relays a critique prompt (drafted in
chat 07-16) to the other platforms; verify every claim against real
code/data before adopting (they have invented flags and wrong cameras before).

## Standing gates
- Wipe test + deck-feature check before anything is called "fixed".
- Hover: NO DATA outside coverage, always. Radiometric grid is never modified
  by display tuning.
- No auto-extracted drain ships without Brian's accept/reject pass.
- Commit + push docs/worker changes after each slice; keep
  `ASU_DELIVERY_PLAN.md` step ledger current.
- Nothing is "done" until Brian verifies on his screen.
