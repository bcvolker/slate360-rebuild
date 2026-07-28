r"""T0 visual: RGB base edges (cyan) vs displayed-thermal edges (red) on one
image. Parallel-but-offset everywhere = uniform shift (easy global fix).
Diverging/crossing in places = real twist (needs piecewise). This is the
reliable read; the cross-modal phase-correlation numbers are too noisy to trust.
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

base = cv2.imread(os.path.join(D, "deck_ortho_merged_1cm.png"), cv2.IMREAD_UNCHANGED)
bg = cv2.cvtColor(cv2.resize(base[:, :, :3], (TW, TH), interpolation=cv2.INTER_AREA),
                  cv2.COLOR_BGR2GRAY)

# strong edges only
be = cv2.Canny(cv2.GaussianBlur(bg, (0, 0), 1.5).astype(np.uint8), 60, 140)
tnorm = cv2.normalize(Tf, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
te = cv2.Canny(cv2.GaussianBlur(tnorm, (0, 0), 1.5), 25, 70)
te[~fin] = 0

vis = np.zeros((TH, TW, 3), np.uint8)
vis[be > 0] = (255, 255, 0)      # cyan = RGB (BGR)
te_d = cv2.dilate(te, np.ones((2, 2), np.uint8))
vis[te_d > 0] = (0, 0, 255)      # red = thermal
cv2.imwrite(os.path.join(OUT, "t0_edges_rgb_vs_thermal.jpg"),
            cv2.resize(vis, (1700, int(1700 * TH / TW))), [cv2.IMWRITE_JPEG_QUALITY, 92])
print("wrote t0_edges_rgb_vs_thermal.jpg (cyan=RGB base, red=thermal)")

# zoom crops on the two buildings for close read
for name, (x0, y0, x1, y1) in {
    "leftbldg": (1150, 300, 1700, 1500),
    "rightbldg": (2650, 600, 3250, 1950),
}.items():
    c = vis[y0:y1, x0:x1]
    cv2.imwrite(os.path.join(OUT, "t0_edges_%s.jpg" % name),
                cv2.resize(c, (700, int(700 * c.shape[0] / c.shape[1]))),
                [cv2.IMWRITE_JPEG_QUALITY, 92])
    print("wrote t0_edges_%s.jpg" % name)
