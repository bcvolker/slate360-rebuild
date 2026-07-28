r"""Generate gridded thermal + gridded RGB at matched size so corresponding
features can be identified BY EYE and their pixel coords recorded as manual
tie-points -- the only reliable cross-modal method left (all automatic
correlation failed: responses ~0, offsets inconsistent 54cm..924cm).
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
lo, hi = np.nanpercentile(T[fin], 2), np.nanpercentile(T[fin], 98)
x = np.clip((T - lo) / max(hi - lo, 1e-6), 0, 1)
x = np.nan_to_num(x)
heat = cv2.applyColorMap((x * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
heat[~fin] = (40, 40, 40)

base = cv2.imread(os.path.join(D, "deck_ortho_final_1cm.png"), cv2.IMREAD_UNCHANGED)
bgr = cv2.resize(base[:, :, :3], (TW, TH), interpolation=cv2.INTER_AREA)

W = 1500
sc = W / TW


def grid(img, tag):
    g = cv2.resize(img, (W, int(TH * sc))).copy()
    for gx in range(0, g.shape[1], 100):
        cv2.line(g, (gx, 0), (gx, g.shape[0]), (0, 200, 0), 1)
        cv2.putText(g, str(int(gx / sc)), (gx + 2, 16), cv2.FONT_HERSHEY_SIMPLEX,
                    0.4, (0, 255, 0), 1)
    for gy in range(0, g.shape[0], 100):
        cv2.line(g, (0, gy), (g.shape[1], gy), (0, 200, 0), 1)
        cv2.putText(g, str(int(gy / sc)), (2, gy + 14), cv2.FONT_HERSHEY_SIMPLEX,
                    0.4, (0, 255, 0), 1)
    cv2.putText(g, tag, (W - 260, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 4)
    cv2.putText(g, tag, (W - 260, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 1)
    return g


cv2.imwrite(os.path.join(OUT, "t_grid_thermal.jpg"), grid(heat, "THERMAL"),
            [cv2.IMWRITE_JPEG_QUALITY, 92])
cv2.imwrite(os.path.join(OUT, "t_grid_rgb.jpg"), grid(bgr, "RGB"),
            [cv2.IMWRITE_JPEG_QUALITY, 92])
print("wrote t_grid_thermal.jpg + t_grid_rgb.jpg  (coords shown are thermal-native px)")
