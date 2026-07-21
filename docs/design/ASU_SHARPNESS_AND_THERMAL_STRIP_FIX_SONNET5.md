# ASU viewer — final fix plan: map sharpness + thermal strip repair (Sonnet 5 execution doc)

Status: LOCKED (2026-07-21, consolidated from 4 external AI reviews). Supersedes the
open items in ASU_VIEWER_REBUILD_PLAN.md for the MAP-sharpness and thermal tracks.
Repo: C:\ASU-Survey (not a git repo; deliverable workspace). Viewer chain:
build_assets_p1→p2→p3→p4 → build_viewer_p6.py → tools/publish_deliverable.py.

## Diagnosis (settled — do not relitigate)

**Map softness:** ~1 cm/px IS the native GSD (100 ft AGL, consumer RGB sensor:
0.8–1.3 cm/px physically; both independent DD exports measure 1.01 / 1.08 cm/px).
DroneDeploy's viewer is not serving finer data; it is serving the SAME data
undamaged. Our chain damages it: JPEG-in-TIFF source → cv2.warpAffine INTER_CUBIC
placement (place_hires_v2_tif.py) → 1–2 more INTER_CUBIC translation warps
(refine_and_finalize_hires.py) → resize + re-encode in tiling. Three resamples of
an already-JPEG source = the observed mush at L3.

**Thermal kinks:** baked into the temperature mosaic at flight-strip boundaries
(verified: standalone render shows the kinks with no map underneath; the per-pixel
`count` array shows parallel flight-line bands; kinks fall on band boundaries).
Sequential strip-to-strip registration accumulated error. Repair = per-strip
geometric correction against the RGB ortho; temperatures are repositioned, never
invented. Re-stitch (Metashape) is the post-deadline fallback only.

## Track M — map sharpness (Sonnet 5 executes; M0 is Brian)

**M0 (BRIAN, in DroneDeploy):** Export → Orthomosaic → **GeoTIFF**, Resolution =
**Max Available / Native** (never a cm preset), Projection **EPSG:6405** if offered,
"Tiled" only if the single-file export fails. Also open the **Map Processing
Report** and read the "GSD / Resolution" number — that is the authoritative ceiling.
Send Claude the new file + that number. (If API access exists: POST /v2/exports
with resolution:0, file_format:geotiff — equivalent.)

**M1 — lossless intake (works on the existing TIFF today; do not wait for M0):**
Decode dd_hires_ortho_v2.tif ONCE to a lossless working master (tifffile → PNG or
LZW TIFF). Every later step reads the lossless master. No JPEG anywhere in the
working chain (final delivery copies may compress).

**M2 — ONE warp, not three.** Compose placement affine × refinement translation
into a SINGLE 2×3 matrix and warp the lossless master ONCE with
`cv2.warpAffine(..., flags=cv2.INTER_LANCZOS4)` (alpha: INTER_NEAREST). The
refinement shift is already known (dd_v2: −(−10.79), −(13.87) px; re-measure after
M0 with the grid-median method in tools/refine_and_finalize_hires.py — 200px tiles,
resp>0.15, median). Delete/bypass the stacked-warp path.
- If instead we adopt native-grid serving (tile the export's own pixel grid and
  place the LAYER with an affine in the viewer): superior, but a bigger viewer
  change — only do this if the single-warp result still fails the M4 gate.

**M3 — tiles:** finest level = raw byte copy of the warped master into 512px PNG
tiles (no resize call at all on L3; assert `np.array_equal` between one tile and
the master crop). Coarser levels: INTER_AREA halving, PNG. make_tiles.py already
does PNG+alpha; add the L3 no-resize path + the assert.

**M4 — the acutance gate (proves where blur enters; 30 min):** same 64×64 crop of
one drain in: (a) DD export master, (b) post-warp master, (c) L3 tile, using
`cv2.Laplacian(gray).var()`. Ship rule: (b) ≥ 0.90×(a), (c) == (b) exactly.
If (a) itself is soft vs Brian's DD screenshot at matched scale → the export is
the ceiling; report honestly and stop chasing.

**M5 — display:** add `image-rendering:-webkit-optimize-contrast` (crisp at
≥1:1) on tile/layer images; verify device-pixel 1:1 at max zoom (report "source
texels per device pixel" in the MAP DETAIL HUD). Optional screen-only unsharp on
the luma channel, OFF by default, only after M4 passes.

**Expectation set with Brian:** past 1:1 device-pixels-per-source-pixel, further
zoom is magnification, same as DroneDeploy. Compare at matched scale bars.

## Track T — thermal strip repair (Sonnet 5 executes)

**T0 — 1-hour diagnostics before any warping:**
1. Confirm WHICH npz the viewer displays: build_assets_p2.py loads
   `mosaic_main_flight_v5.npz`; diagnostics in this session used
   `panorama_registered.npz`. Render BOTH standalone; if panorama_registered is
   straighter, wiring it in may be a large free win. (External review flagged
   tools/paint_registered_panorama.py + COLMAP poses as a possible cheap re-paint
   path — verify that script exists before promising it.)
2. Produce `breaks.json` — the measurable defect list:
   - Long straight RGB lines: `cv2.createLineSegmentDetector` (or Canny+HoughLinesP,
     minLineLength≈200px) on the RGB base downsampled to the thermal grid.
   - Along each line, at each sample: search ±10 thermal px along the normal for
     the strongest compatible thermal gradient (Scharr) → signed offset d(s).
   - Flag jump >2 thermal px (6 cm) within <1 m of arc; cluster with DBSCAN
     (eps≈30px) → expect ~8–9 clusters; record {x, y, offset_px, offset_cm,
     nearest count-band boundary} + a diagnostic crop per break.

**T1 — strip segmentation:** smooth the `count` array (gaussian σ≈8), Scharr
gradient magnitude → seam ridges; connected-components between seams →
strip label raster (expect 8–12). Feather zone = ±20 px around seams.

**T2 — per-strip alignment to RGB, jointly constrained:**
- Work in GRADIENT domain both sides (Scharr magnitude, blurred σ≈2, normalized
  u8) — never raw intensity (thermal↔RGB textures differ).
- Per strip: `cv2.findTransformECC(rgb_grad, therm_grad, M, cv2.MOTION_AFFINE,
  criteria(500,1e-6), inputMask=strip_mask)`. Start from identity; similarity
  (4-DOF) first if affine diverges.
- JOINT consistency pass: solve all strip transforms together with
  `scipy.optimize.least_squares(..., loss="huber")`: residuals = (per-strip ECC
  control residuals) + (overlap-zone continuity between adjacent strips) +
  (small-transform prior). Anchor the best central strip. NO unconstrained TPS;
  B-spline (itk-elastix, Mattes MI, strong bending penalty, ~8–12 m knot spacing)
  only if a strip is internally bent after affine — expected unnecessary.

**T3 — radiometric-safe warp:** warp temperature POSITIONS only, per strip, with
the num/den validity trick so NaNs never bleed:
`num = remap(where(valid,T,0)); den = remap(valid.astype(f32));
T_out = num/den where den>0.999 else NaN` (bilinear). Feather-blend strips in the
±20 px seam zones by validity-weighted average of the overlapping warped strips.
Masks/count warped nearest-neighbor. Output `panorama_strips_fixed.npz`
(temperatures, count, strip_id, displacement field). Originals preserved untouched.

**T4 — ship gates (all three must pass; numbers go in the methods panel):**
1. Dense grid: phaseCorrelate on 128px gradient windows, 50% overlap, deck-only,
   resp>0.12 → offsets in cm (thermal px = 3 cm). Gate: median ≤3 cm, p95 ≤6 cm,
   no confident window >9 cm, no jump across any strip boundary >1 thermal px.
2. Edge coherency: fraction of RGB Canny edge px within 1 px of a thermal edge
   ≥85% on deck structures.
3. Swipe montage for Brian/leadership: 12 split-crops (4 corners, membrane ends,
   the former break sites from breaks.json, 2 drains) saved to out/swipe_gate_<build>.jpg.
   Every former break must be visibly gone.
Radiometric integrity: assert no output temperature outside [min,max] of its
source strip neighborhood; report before/after distribution drift (<0.1 °C median);
statement: "positions corrected to the RGB orthomosaic; temperatures bilinear-
resampled, never synthesized."

**T5 — wire in:** point build_assets_p2.py at panorama_strips_fixed.npz, rebuild
p2→p6, publish_deliverable.py, re-verify gates in the live build.

**Honest bound for Brian:** thermal pixels are 3 cm; "perfect swipe" is defensibly
"no systematic offset beyond ~1 thermal pixel anywhere" — sub-pixel claims are not
possible and will not be made.

## Order of execution

1. T0 (diagnostics + which-npz check) — may shrink T1–T3 dramatically.
2. M1–M4 on the existing TIFF (do not wait for Brian's re-export).
3. T1–T5 strip repair to gates.
4. M0 re-export arrives → re-run M1–M4 intake on it (better source, same pipeline).
5. Full rebuild + publish + swipe montage → Brian sign-off.

Rejected from the reviews (with reason): "raw GSD is 3 cm" (wrong sensor math);
TPS-first warping (rubber-sheet risk, two reviews concur); bit-identical histogram
gate (impossible under any resampling — replaced by the T4 integrity checks);
"secret sub-1cm export tier" (no evidence; three reviews concur it doesn't exist).
