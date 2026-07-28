r"""Per-tile displacement field: NEW mesh ortho vs OLD true-ortho.

The thermal panorama was aligned against the OLD orthophoto
(colmap_rgb_orthomosaic_v3.jpg), and Brian accepted that alignment. Swapping the
base map to a nadir render of the Poisson mesh kept the frame (origin checks to
<1 cm via registration_102.json) but may have moved image CONTENT, because a
Poisson surface is smoothed and any geometric error displaces where texture
lands.

So: is the new map globally shifted, globally scaled, or locally warped? Phase
correlation on a grid of tiles answers it directly instead of by argument.
"""
import json

import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"

reg = json.load(open(DELIV + r"\registration_102.json"))
OX, OY = reg["origin"]
G = reg["gsd"]
R0, C0 = 5327, 2942
TW, TH = 4045, 2711
print("thermal frame world x0=%.4f y1=%.4f  ex=%.2f ey=%.2f"
      % (OX + C0 * G, OY - R0 * G, TW * G, TH * G))

old = cv2.imread(DELIV + r"\colmap_rgb_orthomosaic_v3.jpg", cv2.IMREAD_GRAYSCALE)
old = old[R0:R0 + TH, C0:C0 + TW]
new = cv2.imread(DELIV + r"\deck_ortho_mesh_1cm.jpg", cv2.IMREAD_GRAYSCALE)
new = cv2.resize(new, (TW, TH), interpolation=cv2.INTER_AREA)
print("old crop", old.shape, "new resampled", new.shape)

TS = 256
rows, cols = [], []
recs = []
for gy in range(0, TH - TS, TS):
    for gx in range(0, TW - TS, TS):
        a = old[gy:gy + TS, gx:gx + TS].astype(np.float32)
        b = new[gy:gy + TS, gx:gx + TS].astype(np.float32)
        # skip flat/empty tiles -- correlation is meaningless there
        if a.std() < 12 or b.std() < 12:
            continue
        win = cv2.createHanningWindow((TS, TS), cv2.CV_32F)
        (dx, dy), resp = cv2.phaseCorrelate(a, b, win)
        if resp < 0.12:
            continue
        recs.append((gx + TS / 2, gy + TS / 2, dx, dy, resp))

recs = np.array(recs)
print("usable tiles:", len(recs))
dx, dy = recs[:, 2], recs[:, 3]
mag = np.hypot(dx, dy)
print("displacement px (3cm):  median %.2f  p90 %.2f  max %.2f"
      % (np.median(mag), np.percentile(mag, 90), mag.max()))
print("displacement cm:        median %.1f  p90 %.1f  max %.1f"
      % (np.median(mag) * 3, np.percentile(mag, 90) * 3, mag.max() * 3))
print("mean shift (dx,dy) px:  %.2f, %.2f" % (dx.mean(), dy.mean()))
print("residual after removing mean shift: median %.2f px (%.1f cm)"
      % (np.median(np.hypot(dx - dx.mean(), dy - dy.mean())),
         np.median(np.hypot(dx - dx.mean(), dy - dy.mean())) * 3))

# is it a scale/affine effect? fit dx,dy as linear in (x,y)
X = np.c_[recs[:, 0], recs[:, 1], np.ones(len(recs))]
for name, d in (("dx", dx), ("dy", dy)):
    coef, *_ = np.linalg.lstsq(X, d, rcond=None)
    pred = X @ coef
    print("%s = %.3e*x + %.3e*y + %.3f   resid median %.2f px"
          % (name, coef[0], coef[1], coef[2],
             np.median(np.abs(d - pred))))

np.save(DELIV + r"\ortho_disp_field.npy", recs)
print("saved ortho_disp_field.npy")
