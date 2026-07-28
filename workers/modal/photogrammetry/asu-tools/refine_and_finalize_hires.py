r"""Phase 1 continued: translation-only refinement of dd_hires_placed_1cm.jpg
against the currently-proven base (deck_ortho_dd_filled_1cm.jpg -- verified in
Phase 0T to align correctly with the thermal via independent structural-edge
correlation). This absorbs the WGS-84/NAD83(2011)+GPS datum offset (2-4 m class
error) that the exact reprojection above cannot know about.

Then: white nodata -> alpha (kills the "PDF backing" look), and write the final
1cm deck-frame base for the tile pyramid + build_assets_p2.
"""
import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"

new = cv2.imread(DELIV + r"\dd_hires_placed_1cm.jpg")  # un-refined placement -- one correction, not stacked
ref = cv2.imread(DELIV + r"\deck_ortho_dd_filled_1cm.jpg")
assert new.shape == ref.shape, (new.shape, ref.shape)
H, W = new.shape[:2]

gnew = cv2.cvtColor(new, cv2.COLOR_BGR2GRAY).astype(np.float32)
gref = cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY).astype(np.float32)

# Whole-image phase correlation is a single noisy sample. A grid of many small
# tiles, keeping only strong-response ones and taking the ROBUST MEDIAN, is far
# more reliable -- this caught a ~31cm residual the whole-image pass missed
# entirely (measured dy=-17.9px vs the grid's dy=-31px on the same pair).
TS = 200
tile_recs = []
for gy in range(0, H - TS, TS):
    for gx in range(0, W - TS, TS):
        a = gref[gy:gy + TS, gx:gx + TS]
        b = gnew[gy:gy + TS, gx:gx + TS]
        if a.std() < 12 or b.std() < 12:
            continue
        hw = cv2.createHanningWindow((TS, TS), cv2.CV_32F)
        (tdx, tdy), tresp = cv2.phaseCorrelate(a, b, hw)
        if tresp < 0.15:
            continue
        tile_recs.append((tdx, tdy, tresp))
tile_recs = np.array(tile_recs)
print("grid measurement: %d usable tiles (resp>0.15)" % len(tile_recs))

if len(tile_recs) >= 20:
    dx, dy = float(np.median(tile_recs[:, 0])), float(np.median(tile_recs[:, 1]))
    mag = np.hypot(tile_recs[:, 0] - dx, tile_recs[:, 1] - dy)
    print("grid median shift: dx=%.2f dy=%.2f px (%.1fcm, %.1fcm)" % (dx, dy, dx, dy))
    print("residual after this shift: median %.2f px (%.1f cm), p90 %.2f px (%.1f cm)"
          % (np.median(mag), np.median(mag), np.percentile(mag, 90), np.percentile(mag, 90)))
    resp = 1.0  # trust the grid result; skip the single-sample gate below
else:
    print("WARNING: too few usable tiles (%d) -- falling back to ECC" % len(tile_recs))
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        _, warp = cv2.findTransformECC(
            cv2.GaussianBlur(gref, (0, 0), 3), cv2.GaussianBlur(gnew, (0, 0), 3),
            warp, cv2.MOTION_TRANSLATION,
            (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6))
        dx, dy = -warp[0, 2], -warp[1, 2]
        print("ECC translation: dx=%.2f dy=%.2f px" % (dx, dy))
    except cv2.error as e:
        print("ECC also failed (%s) -- shipping with ZERO refinement, flag for manual review" % e)
        dx, dy = 0.0, 0.0

# cv2.phaseCorrelate(gref, gnew) returns the shift of gnew RELATIVE TO gref, i.e.
# gnew(x,y) = gref(x-dx,y-dy). To align gnew onto gref we must shift gnew by
# (-dx,-dy) -- empirically verified (the +dx,+dy sign left the ~32cm offset
# completely unchanged; -dx,-dy took it to 8.9cm). Do not trust the sign from
# memory on this call -- verify empirically, as done here.
M = np.array([[1, 0, -dx], [0, 1, -dy]], np.float32)
refined = cv2.warpAffine(new, M, (W, H), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))
print("applied shift (-dx,-dy) = (%.2f, %.2f) px to align new onto ref" % (-dx, -dy))

# second pass: squeeze any residual the first correction left behind
gref2 = gref
gnew2 = cv2.cvtColor(refined, cv2.COLOR_BGR2GRAY).astype(np.float32)
tile_recs2 = []
for gy in range(0, H - TS, TS):
    for gx in range(0, W - TS, TS):
        a = gref2[gy:gy + TS, gx:gx + TS]
        b = gnew2[gy:gy + TS, gx:gx + TS]
        if a.std() < 12 or b.std() < 12:
            continue
        hw = cv2.createHanningWindow((TS, TS), cv2.CV_32F)
        (tdx, tdy), tresp = cv2.phaseCorrelate(a, b, hw)
        if tresp < 0.15:
            continue
        tile_recs2.append((tdx, tdy))
tile_recs2 = np.array(tile_recs2)
if len(tile_recs2) >= 20:
    dx2, dy2 = float(np.median(tile_recs2[:, 0])), float(np.median(tile_recs2[:, 1]))
    mag2 = np.hypot(tile_recs2[:, 0] - dx2, tile_recs2[:, 1] - dy2)
    print("2nd pass: %d tiles, residual shift dx=%.2f dy=%.2f px, spread median %.2f p90 %.2f px"
          % (len(tile_recs2), dx2, dy2, np.median(mag2), np.percentile(mag2, 90)))
    if abs(dx2) > 1.5 or abs(dy2) > 1.5:
        M2 = np.array([[1, 0, -dx2], [0, 1, -dy2]], np.float32)
        refined = cv2.warpAffine(refined, M2, (W, H), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))
        print("applied 2nd-pass shift (%.2f, %.2f) px" % (-dx2, -dy2))

# white nodata -> alpha
gray = cv2.cvtColor(refined, cv2.COLOR_BGR2GRAY)
alpha = np.where(gray >= 250, 0, 255).astype(np.uint8)
alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))  # kill white-speck noise
rgba = cv2.cvtColor(refined, cv2.COLOR_BGR2BGRA)
rgba[:, :, 3] = alpha
cv2.imwrite(DELIV + r"\deck_ortho_hires_1cm.png", rgba)
print("wrote deck_ortho_hires_1cm.png  coverage %.1f%%" % (100 * (alpha > 0).mean()))

# also a JPEG (no alpha, white->mid-gray so JPEG tiles don't show harsh white
# seams where old and new content border) for the tile pyramid, which composites
# onto a black canvas via CSS opacity, not alpha -- so bake transparency as the
# EXISTING toned/DD-filled base showing through instead of flat white/gray.
fallback = cv2.imread(DELIV + r"\deck_ortho_dd_filled_1cm.jpg")
a3 = (alpha.astype(np.float32) / 255.0)[..., None]
composited = (refined[:, :, :3].astype(np.float32) * a3
              + fallback.astype(np.float32) * (1 - a3)).astype(np.uint8)
cv2.imwrite(DELIV + r"\deck_ortho_hires_filled_1cm.jpg", composited,
            [cv2.IMWRITE_JPEG_QUALITY, 93])
print("wrote deck_ortho_hires_filled_1cm.jpg (for tiles: hi-res + old-base fallback in gaps)")
