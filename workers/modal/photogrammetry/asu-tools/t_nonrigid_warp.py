r"""ISSUE B fix (the consensus approach): the thermal is perfectly locked to the
COLMAP orthophoto, but the DroneDeploy map differs from COLMAP LOCALLY & non-
uniformly (two photogrammetry pipelines -> region-varying differences a single
global transform cannot capture -- that residual is the 'twist'). So:

  1. Measure the dense COLMAP<->DD displacement RGB-to-RGB (reliable, same
     modality) on a grid.  This both proves non-rigidity and gives the field.
  2. Fit a smooth thin-plate-spline displacement field.
  3. SELF-CHECK: warp COLMAP by the field to match DD; the RGB-vs-RGB residual
     must COLLAPSE (proves the field + sign are right). Auto-flips sign if not.
  4. Apply the SAME field to the THERMAL (which lives in the COLMAP frame),
     positions only (num/den radiometric-safe), bringing it into the DD frame.
  5. Verify the warped thermal aligns to DD.

The DroneDeploy map stays pristine; only the (lower-res, already-resampled)
thermal is nudged. Temperatures are resampled, never invented.
"""
import os

import cv2
import numpy as np
from scipy.interpolate import RBFInterpolator

D = r"C:\ASU-Survey\deliverables"
OUT = r"C:\ASU-Survey\out"

z = np.load(os.path.join(D, "mosaic_main_flight_v5.npz"))
T = z["temperatures"].astype(np.float32)
TH, TW = T.shape
fin = np.isfinite(T)

colmap = cv2.imread(os.path.join(D, "colmap_rgb_orthomosaic_v3.jpg"))
colcrop = colmap[5327:5327 + TH, 2942:2942 + TW]                 # COLMAP, thermal frame
dd = cv2.imread(os.path.join(D, "deck_ortho_final_1cm.png"), cv2.IMREAD_UNCHANGED)
ddc = cv2.resize(dd[:, :, :3], (TW, TH), interpolation=cv2.INTER_AREA)  # DD, same frame


def prep(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    return g - cv2.GaussianBlur(g, (0, 0), 20)   # high-pass: kill exposure diff


gcol, gdd = prep(colcrop), prep(ddc)

# dense grid phase correlation: DD window vs COLMAP window
TS, STEP = 256, 96
src, disp, resp_all = [], [], []
for gy in range(0, TH - TS, STEP):
    for gx in range(0, TW - TS, STEP):
        a = gcol[gy:gy + TS, gx:gx + TS]
        b = gdd[gy:gy + TS, gx:gx + TS]
        if a.std() < 4 or b.std() < 4:
            continue
        win = cv2.createHanningWindow((TS, TS), cv2.CV_32F)
        (dx, dy), r = cv2.phaseCorrelate(a, b, win)   # shift of DD rel. COLMAP
        if r < 0.15 or abs(dx) > 60 or abs(dy) > 60:
            continue
        src.append([gx + TS / 2, gy + TS / 2])
        disp.append([dx, dy])
        resp_all.append(r)
src = np.array(src)
disp = np.array(disp)
print("grid matches: %d" % len(src))
med = np.median(disp, axis=0)
spread = np.median(np.hypot(disp[:, 0] - med[0], disp[:, 1] - med[1]))
print("global median shift: (%.1f, %.1f) px = (%.0f, %.0f) cm" % (med[0], med[1], med[0] * 3, med[1] * 3))
print("NON-uniform residual after removing global: %.2f px = %.0f cm  (>2px => non-rigid needed)"
      % (spread, spread * 3))

# fit TPS displacement field (smoothing regularizes wiggles)
rbf_x = RBFInterpolator(src, disp[:, 0], kernel="thin_plate_spline", smoothing=1.0)
rbf_y = RBFInterpolator(src, disp[:, 1], kernel="thin_plate_spline", smoothing=1.0)
yy, xx = np.mgrid[0:TH, 0:TW]
P = np.c_[xx.ravel(), yy.ravel()]
fx = rbf_x(P).reshape(TH, TW).astype(np.float32)
fy = rbf_y(P).reshape(TH, TW).astype(np.float32)


def residual(mapx, mapy):
    w = cv2.remap(gcol, mapx, mapy, cv2.INTER_LINEAR)
    TS2 = 256
    rs = []
    for gy in range(0, TH - TS2, 200):
        for gx in range(0, TW - TS2, 200):
            a = w[gy:gy + TS2, gx:gx + TS2]
            b = gdd[gy:gy + TS2, gx:gx + TS2]
            if a.std() < 4 or b.std() < 4:
                continue
            win = cv2.createHanningWindow((TS2, TS2), cv2.CV_32F)
            (dx, dy), r = cv2.phaseCorrelate(a, b, win)
            if r < 0.15:
                continue
            rs.append(np.hypot(dx, dy))
    return np.median(rs) if rs else 999


# self-check both signs: warp COLMAP by field, see which collapses residual
best = None
for sign in (+1, -1):
    mapx = (xx + sign * fx).astype(np.float32)
    mapy = (yy + sign * fy).astype(np.float32)
    res = residual(mapx, mapy)
    print("sign %+d -> COLMAP-warped vs DD residual %.2f px (%.0f cm)" % (sign, res, res * 3))
    if best is None or res < best[0]:
        best = (res, sign, mapx, mapy)
res, sign, mapx, mapy = best
print("chose sign %+d (residual %.2f px = %.0f cm)" % (sign, res, res * 3))

# apply SAME field to thermal (radiometric-safe num/den)
num = cv2.remap(np.where(fin, T, 0).astype(np.float32), mapx, mapy, cv2.INTER_LINEAR, borderValue=0)
den = cv2.remap(fin.astype(np.float32), mapx, mapy, cv2.INTER_LINEAR, borderValue=0)
T_w = np.where(den > 0.5, num / den, np.nan).astype(np.float32)
print("radiometric: src [%.1f,%.1f] warped [%.1f,%.1f] drift %.3fC"
      % (np.nanmin(T), np.nanmax(T), np.nanmin(T_w), np.nanmax(T_w),
         np.nanmedian(T_w) - np.nanmedian(T)))

np.savez(os.path.join(D, "mosaic_v5_nonrigid.npz"),
         temperatures=T_w, gsd_m=z["gsd_m"], origin_world=z["origin_world"])
print("wrote mosaic_v5_nonrigid.npz")

# proof overlay: warped thermal on DD map
fw2 = np.isfinite(T_w)
lo, hi = np.nanpercentile(T_w[fw2], 2), np.nanpercentile(T_w[fw2], 98)
x = np.clip((T_w - lo) / max(hi - lo, 1e-6), 0, 1)
x = np.nan_to_num(x)
heat = cv2.applyColorMap((x * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
al = (fw2.astype(np.float32) * 0.5)[..., None]
over = (ddc.astype(np.float32) * (1 - al) + heat.astype(np.float32) * al).astype(np.uint8)
cv2.imwrite(os.path.join(OUT, "t_nonrigid_proof.jpg"),
            cv2.resize(over, (1500, int(1500 * TH / TW))), [cv2.IMWRITE_JPEG_QUALITY, 90])
print("wrote t_nonrigid_proof.jpg")
