r"""The real residual: the thermal is UNIFORMLY shifted ~20-40px from the map
(hidden by 50%-blend overlays where filled building rects still overlapped; the
sharp edge overlay revealed it). Measure the shift by cross-correlating the
BINARY EDGE maps (structural -> correlate cross-modally where raw
gradients/intensities do NOT), then apply it as a translation to the thermal
(radiometric-safe). Report the residual field after, to see if a pure shift
suffices or a mild non-rigid remainder exists.
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
dd = cv2.imread(os.path.join(D, "deck_ortho_final_1cm.png"), cv2.IMREAD_UNCHANGED)
ddc = cv2.resize(dd[:, :, :3], (TW, TH), interpolation=cv2.INTER_AREA)

og = cv2.cvtColor(ddc, cv2.COLOR_BGR2GRAY)
tn = cv2.normalize(np.where(fin, T, np.nanmedian(T[fin])), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
oe = cv2.Canny(cv2.GaussianBlur(og, (0, 0), 1.2).astype(np.uint8), 50, 130).astype(np.float32)
te = cv2.Canny(cv2.GaussianBlur(tn, (0, 0), 1.2), 25, 70).astype(np.float32)
te[~fin] = 0
# soften edges so correlation has gradient to lock onto
oe = cv2.GaussianBlur(oe, (0, 0), 3)
te = cv2.GaussianBlur(te, (0, 0), 3)

win = cv2.createHanningWindow((TW, TH), cv2.CV_32F)
(dx, dy), resp = cv2.phaseCorrelate(oe, te, win)
print("global edge-map shift: dx=%.1f dy=%.1f px = (%.0f, %.0f) cm  resp %.3f"
      % (dx, dy, dx * 3, dy * 3, resp))

# apply -(dx,dy) to move thermal onto map (verify sign by residual)
def apply_shift(sx, sy):
    M = np.float32([[1, 0, sx], [0, 1, sy]])
    num = cv2.warpAffine(np.where(fin, T, 0).astype(np.float32), M, (TW, TH), borderValue=0)
    den = cv2.warpAffine(fin.astype(np.float32), M, (TW, TH), borderValue=0)
    return np.where(den > 0.5, num / den, np.nan).astype(np.float32)


def edge_residual(Tt):
    ft = np.isfinite(Tt)
    tn2 = cv2.normalize(np.where(ft, Tt, np.nanmedian(Tt[ft])), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    te2 = cv2.GaussianBlur(cv2.Canny(cv2.GaussianBlur(tn2, (0, 0), 1.2), 25, 70).astype(np.float32), (0, 0), 3)
    te2[~ft] = 0
    (ddx, ddy), r = cv2.phaseCorrelate(oe, te2, win)
    return np.hypot(ddx, ddy), r


best = None
for sx, sy in [(-dx, -dy), (dx, dy)]:
    Tt = apply_shift(sx, sy)
    res, r = edge_residual(Tt)
    print("shift (%.1f,%.1f) -> residual %.2f px (%.0f cm) resp %.2f" % (sx, sy, res, res * 3, r))
    if best is None or res < best[0]:
        best = (res, sx, sy, Tt)
res, sx, sy, Tt = best
print("chose shift (%.1f, %.1f) px, residual %.2f px = %.0f cm" % (sx, sy, res, res * 3))

np.savez(os.path.join(D, "mosaic_v5_shifted.npz"),
         temperatures=Tt, gsd_m=z["gsd_m"], origin_world=z["origin_world"])
print("wrote mosaic_v5_shifted.npz  drift %.3fC" % (np.nanmedian(Tt) - np.nanmedian(T)))

# edge proof after shift
ft = np.isfinite(Tt)
tn2 = cv2.normalize(np.where(ft, Tt, np.nanmedian(Tt[ft])), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
te2 = cv2.Canny(cv2.GaussianBlur(tn2, (0, 0), 1.2), 25, 70)
te2[~ft] = 0
oe2 = cv2.Canny(cv2.GaussianBlur(og, (0, 0), 1.2).astype(np.uint8), 50, 130)
vis = np.zeros((TH, TW, 3), np.uint8)
vis[oe2 > 0] = (255, 255, 0)
vis[cv2.dilate(te2, np.ones((2, 2), np.uint8)) > 0] = (0, 0, 255)
cv2.imwrite(os.path.join(OUT, "t_edge_shift_proof.jpg"),
            cv2.resize(vis, (1400, int(1400 * TH / TW))), [cv2.IMWRITE_JPEG_QUALITY, 92])
print("wrote t_edge_shift_proof.jpg")
