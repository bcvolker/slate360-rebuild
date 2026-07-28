r"""Test the 22.58m (753px) Y-offset hypothesis: the thermal origin_world y is
-11.29 but the map frame was placed at Y1=+11.29 -> map & thermal are 22.58m
apart in Y. Overlay thermal shifted by -753/+753 px on the map; whichever aligns
the buildings confirms the fix (a single frame-Y correction, not a warp).
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
base = cv2.imread(os.path.join(D, "deck_ortho_final_1cm.png"), cv2.IMREAD_UNCHANGED)
bgr = cv2.resize(base[:, :, :3], (TW, TH), interpolation=cv2.INTER_AREA)

SHIFT = int(round(22.58 / 0.03))
print("testing shift of %d px" % SHIFT)


def overlay(dy, tag):
    M = np.float32([[1, 0, 0], [0, 1, dy]])
    Tt = cv2.warpAffine(np.where(fin, T, np.nan).astype(np.float32), M, (TW, TH),
                        flags=cv2.INTER_NEAREST, borderValue=np.nan)
    ft = np.isfinite(Tt)
    lo, hi = np.nanpercentile(Tt[ft], 2), np.nanpercentile(Tt[ft], 98)
    x = np.clip((Tt - lo) / max(hi - lo, 1e-6), 0, 1)
    x = np.nan_to_num(x)
    heat = cv2.applyColorMap((x * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
    a = (ft.astype(np.float32) * 0.5)[..., None]
    over = (bgr.astype(np.float32) * (1 - a) + heat.astype(np.float32) * a).astype(np.uint8)
    cv2.putText(over, tag, (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 0, 0), 6)
    cv2.putText(over, tag, (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (255, 255, 255), 2)
    return cv2.resize(over, (900, int(900 * TH / TW)))


a = overlay(-SHIFT, "thermal shifted UP %d px" % SHIFT)
b = overlay(+SHIFT, "thermal shifted DOWN %d px" % SHIFT)
c = overlay(0, "no shift (current)")
cv2.imwrite(os.path.join(OUT, "t_yshift_test.jpg"), np.vstack([c, a, b]),
            [cv2.IMWRITE_JPEG_QUALITY, 90])
print("wrote t_yshift_test.jpg (current / up / down)")
