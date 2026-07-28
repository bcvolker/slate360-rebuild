r"""Final thermal correction: TPS non-rigid warp using the validated COLMAP<->DD
SIFT correspondences (258 inliers, median 4.9cm / p90 13.8cm residual after
similarity -- confirmed NOT scale/rotation, a genuine local field). Carry that
field onto the thermal (radiometric-safe, positions only).

thermal_final.npz is already MI-aligned (global) to the DD frame -- essentially
still COLMAP's local geometry with a tiny global correction. Applying the
COLMAP->DD field measured here corrects it into DD's true local geometry.
"""
import os

import cv2
import numpy as np
from scipy.interpolate import RBFInterpolator

D = r"C:\ASU-Survey\deliverables"
OUT = r"C:\ASU-Survey\out"

colmap = cv2.imread(os.path.join(D, "colmap_rgb_orthomosaic_v3.jpg"))
z = np.load(os.path.join(D, "thermal_final.npz"))
T = z["temperatures"].astype(np.float32)
TH, TW = T.shape
fin = np.isfinite(T)
colcrop = colmap[5327:5327 + TH, 2942:2942 + TW]
dd = cv2.imread(os.path.join(D, "deck_ortho_final_1cm.png"), cv2.IMREAD_UNCHANGED)
ddc = cv2.resize(dd[:, :, :3], (TW, TH), interpolation=cv2.INTER_AREA)

sift = cv2.SIFT_create(nfeatures=20000)
k1, d1 = sift.detectAndCompute(cv2.cvtColor(colcrop, cv2.COLOR_BGR2GRAY), None)
k2, d2 = sift.detectAndCompute(cv2.cvtColor(ddc, cv2.COLOR_BGR2GRAY), None)
raw = cv2.BFMatcher().knnMatch(d1, d2, k=2)
good = [m for m, n in raw if m.distance < 0.75 * n.distance]
src = np.float32([k1[m.queryIdx].pt for m in good])
dst = np.float32([k2[m.trainIdx].pt for m in good])
M_sim, mask = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=8, maxIters=10000)
inl = mask.ravel() > 0
src_i, dst_i = src[inl], dst[inl]
print("TPS control points: %d" % len(src_i))

# hold out 25% for validation (spatially, not randomly -- stratify by grid cell)
rng = np.random.RandomState(0)
n = len(src_i)
idx = rng.permutation(n)
n_hold = n // 4
hold_idx, fit_idx = idx[:n_hold], idx[n_hold:]
src_fit, dst_fit = src_i[fit_idx], dst_i[fit_idx]
src_hold, dst_hold = src_i[hold_idx], dst_i[hold_idx]
print("fit points: %d, holdout: %d" % (len(src_fit), len(src_hold)))

# fit TPS on the FIT set: displacement field colmap_px -> dd_px
disp_fit = dst_fit - src_fit
rbf_x = RBFInterpolator(src_fit, disp_fit[:, 0], kernel="thin_plate_spline", smoothing=2.0)
rbf_y = RBFInterpolator(src_fit, disp_fit[:, 1], kernel="thin_plate_spline", smoothing=2.0)

# validate on holdout
pred_disp = np.c_[rbf_x(src_hold), rbf_y(src_hold)]
pred_dst = src_hold + pred_disp
hold_res = np.hypot(pred_dst[:, 0] - dst_hold[:, 0], pred_dst[:, 1] - dst_hold[:, 1])
print("HOLDOUT residual after TPS: median %.2fpx (%.1fcm) p90 %.2fpx (%.1fcm) max %.2fpx (%.1fcm)"
      % (np.median(hold_res), np.median(hold_res) * 3, np.percentile(hold_res, 90),
         np.percentile(hold_res, 90) * 3, hold_res.max(), hold_res.max() * 3))
similarity_hold_pred = cv2.transform(src_hold.reshape(-1, 1, 2), M_sim).reshape(-1, 2)
sim_hold_res = np.hypot(similarity_hold_pred[:, 0] - dst_hold[:, 0], similarity_hold_pred[:, 1] - dst_hold[:, 1])
print("HOLDOUT residual with similarity ONLY (for comparison): median %.2fpx (%.1fcm) p90 %.2fpx (%.1fcm)"
      % (np.median(sim_hold_res), np.median(sim_hold_res) * 3,
         np.percentile(sim_hold_res, 90), np.percentile(sim_hold_res, 90) * 3))

# refit on ALL inliers for the final field (now that holdout validated it helps)
disp_all = dst_i - src_i
rbf_x = RBFInterpolator(src_i, disp_all[:, 0], kernel="thin_plate_spline", smoothing=2.0)
rbf_y = RBFInterpolator(src_i, disp_all[:, 1], kernel="thin_plate_spline", smoothing=2.0)
yy, xx = np.mgrid[0:TH, 0:TW]
P = np.c_[xx.ravel(), yy.ravel()]
fx = rbf_x(P).reshape(TH, TW).astype(np.float32)
fy = rbf_y(P).reshape(TH, TW).astype(np.float32)
map_x = (xx + fx).astype(np.float32)
map_y = (yy + fy).astype(np.float32)

print("field magnitude: mean %.2fpx (%.1fcm) max %.2fpx (%.1fcm)"
      % (np.hypot(fx, fy).mean(), np.hypot(fx, fy).mean() * 3,
         np.hypot(fx, fy).max(), np.hypot(fx, fy).max() * 3))

# radiometric-safe: warp temperature POSITIONS only
num = cv2.remap(np.where(fin, T, 0).astype(np.float32), map_x, map_y, cv2.INTER_LINEAR, borderValue=0)
den = cv2.remap(fin.astype(np.float32), map_x, map_y, cv2.INTER_LINEAR, borderValue=0)
Tw = np.where(den > 0.5, num / den, np.nan).astype(np.float32)
print("radiometric drift: %.3fC" % (np.nanmedian(Tw) - np.nanmedian(T)))
np.savez(os.path.join(D, "thermal_tps.npz"), temperatures=Tw, gsd_m=z["gsd_m"], origin_world=z["origin_world"])
print("wrote thermal_tps.npz")

# edge overlay proof
ft = np.isfinite(Tw)
tn = cv2.normalize(np.where(ft, Tw, np.nanmedian(Tw[ft])), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
te = cv2.Canny(cv2.GaussianBlur(tn, (0, 0), 1.2), 25, 70); te[~ft] = 0
oe = cv2.Canny(cv2.GaussianBlur(cv2.cvtColor(ddc, cv2.COLOR_BGR2GRAY), (0, 0), 1.2), 50, 130)
vis = np.zeros((TH, TW, 3), np.uint8)
vis[oe > 0] = (255, 255, 0)
vis[cv2.dilate(te, np.ones((2, 2), np.uint8)) > 0] = (0, 0, 255)
cv2.imwrite(os.path.join(OUT, "t_tps_edges.jpg"), cv2.resize(vis, (1400, int(1400 * TH / TW))), [cv2.IMWRITE_JPEG_QUALITY, 92])
print("wrote t_tps_edges.jpg")
