r"""Thermal->RGB alignment via BIG windows at distinctive features.

Prior attempts failed because small tiles lack structure for cross-modal
correlation. Large windows centered on the two buildings + membrane + HVAC
clusters DO have strong shared structure (a cool rectangle in thermal = a dark
roof rectangle in RGB; its gradient outline correlates reliably). Get one
high-confidence offset per window, then fit a global affine from the
(center, offset) pairs. Apply radiometric-safe (positions only).
"""
import os

import cv2
import numpy as np

D = r"C:\ASU-Survey\deliverables"
OUT = r"C:\ASU-Survey\out"

z = np.load(os.path.join(D, "mosaic_main_flight_v5.npz"))
T = z["temperatures"].astype(np.float32)
TH, TW = T.shape
fin = np.isfinite(T)
Tf = np.where(fin, T, np.nanmedian(T[fin]))

base = cv2.imread(os.path.join(D, "deck_ortho_final_1cm.png"), cv2.IMREAD_UNCHANGED)
bgr = cv2.resize(base[:, :, :3], (TW, TH), interpolation=cv2.INTER_AREA)
bgray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)


def grad(img):
    g = cv2.GaussianBlur(img.astype(np.float32), (0, 0), 3)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=5)
    gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=5)
    return cv2.normalize(np.hypot(gx, gy), None, 0, 255, cv2.NORM_MINMAX)


tg = grad(Tf)
bg = grad(bgray)

# big windows at distinctive shared features (thermal px)
feats = [
    ("L-bldg", 1400, 900, 520),
    ("R-bldg", 2950, 1250, 520),
    ("membrane", 2200, 950, 440),
    ("L-HVAC", 1500, 780, 320),
    ("R-HVAC", 2820, 1500, 320),
    ("NE-canopy", 3400, 550, 360),
]
pts_src, pts_dst, recs = [], [], []
for name, cx, cy, half in feats:
    x0, x1 = max(0, cx - half), min(TW, cx + half)
    y0, y1 = max(0, cy - half), min(TH, cy + half)
    if fin[y0:y1, x0:x1].mean() < 0.6:
        print("%-10s skipped (low coverage)" % name)
        continue
    a = bg[y0:y1, x0:x1].astype(np.float32)
    b = tg[y0:y1, x0:x1].astype(np.float32)
    win = cv2.createHanningWindow((a.shape[1], a.shape[0]), cv2.CV_32F)
    (dx, dy), resp = cv2.phaseCorrelate(a, b, win)
    print("%-10s @ (%4d,%4d)  offset (%.1f, %.1f)px = (%.0f, %.0f)cm  resp %.3f"
          % (name, cx, cy, dx, dy, dx * 3, dy * 3, resp))
    if resp < 0.06:
        continue
    # thermal feature is at (cx,cy)+? ; phaseCorrelate(a=rgb, b=thermal) gives the
    # shift of thermal vs rgb. To move thermal onto rgb, thermal pt (cx,cy) should
    # map to (cx - dx, cy - dy).
    pts_src.append([cx, cy])
    pts_dst.append([cx - dx, cy - dy])
    recs.append((name, dx, dy, resp))

pts_src = np.float32(pts_src)
pts_dst = np.float32(pts_dst)
print("\nusable tie-points: %d" % len(pts_src))
if len(pts_src) < 3:
    raise SystemExit("not enough tie-points to fit affine")

# offsets consistent? -> global shift; varying -> affine
offs = pts_src - pts_dst
print("offset spread px: dx std %.1f, dy std %.1f (low=uniform shift, high=affine/twist)"
      % (offs[:, 0].std(), offs[:, 1].std()))

M, inl = cv2.estimateAffinePartial2D(pts_src, pts_dst, method=cv2.RANSAC,
                                     ransacReprojThreshold=15)
if M is None:
    M = cv2.getAffineTransform(pts_src[:3], pts_dst[:3])
a = M[:, :2]
print("fitted similarity: scale %.4f  rot %.3f deg  trans px (%.1f, %.1f)  inliers %d/%d"
      % (np.sqrt(abs(np.linalg.det(a))),
         np.degrees(np.arctan2(M[1, 0], M[0, 0])), M[0, 2], M[1, 2],
         int(inl.sum()) if inl is not None else -1, len(pts_src)))

# radiometric-safe warp
num = cv2.warpAffine(np.where(fin, T, 0).astype(np.float32), M, (TW, TH),
                     flags=cv2.INTER_LINEAR, borderValue=0)
den = cv2.warpAffine(fin.astype(np.float32), M, (TW, TH),
                     flags=cv2.INTER_LINEAR, borderValue=0)
T_al = np.where(den > 0.999, num / den, np.nan).astype(np.float32)
print("radiometric: source [%.1f,%.1f] aligned [%.1f,%.1f] drift %.3fC"
      % (np.nanmin(T), np.nanmax(T), np.nanmin(T_al), np.nanmax(T_al),
         np.nanmedian(T_al) - np.nanmedian(T)))

np.savez(os.path.join(D, "mosaic_v5_aligned.npz"),
         temperatures=T_al, gsd_m=z["gsd_m"], origin_world=z["origin_world"])
np.save(os.path.join(D, "t_bigwin_affine.npy"), M)
print("wrote mosaic_v5_aligned.npz")
