r"""T-track: align the displayed thermal (mosaic_v5) to the RGB base.

mosaic_v5 is internally fairly straight but globally offset from the RGB base
(~60-120cm, T0 finding). The two rooftop buildings are unambiguous structures
present in BOTH: cool (low-T) rectangles in thermal, dark gravel roofs in RGB.
Register thermal->RGB via those building masks (robust; gradient/MI correlation
was too noisy). Then warp TEMPERATURE POSITIONS ONLY with the num/den validity
trick so NaNs never bleed and values are never invented.

Emits an aligned mosaic + before/after building-mask IoU + a residual field so
we can decide global-suffices vs needs-piecewise honestly.
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
bgray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

# --- thermal building mask: cool (low-T) large compact blobs within the deck ---
deck_med = np.nanmedian(T[fin])
cool = (fin & (T < deck_med - 1.5)).astype(np.uint8)
cool = cv2.morphologyEx(cool, cv2.MORPH_OPEN, np.ones((15, 15), np.uint8))
cool = cv2.morphologyEx(cool, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
n, lbl, st, ct = cv2.connectedComponentsWithStats(cool)
tmask = np.zeros_like(cool)
for i in range(1, n):
    if st[i, cv2.CC_STAT_AREA] > 30000:
        tmask[lbl == i] = 255

# --- RGB building mask: dark gravel roofs, large blobs ---
roof = ((bgray < 105) & (bgray > 25)).astype(np.uint8)
roof = cv2.morphologyEx(roof, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
roof = cv2.morphologyEx(roof, cv2.MORPH_OPEN, np.ones((21, 21), np.uint8))
n, lbl, st, ct = cv2.connectedComponentsWithStats(roof)
rmask = np.zeros_like(roof)
for i in range(1, n):
    if st[i, cv2.CC_STAT_AREA] > 40000:
        rmask[lbl == i] = 255


def iou(a, b):
    a = a > 0
    b = b > 0
    return (a & b).sum() / max((a | b).sum(), 1)


print("building-mask IoU before: %.3f" % iou(tmask, rmask))

# register thermal mask -> rgb mask via ECC on the (blurred) masks
tf = cv2.GaussianBlur(tmask.astype(np.float32), (0, 0), 9)
rf = cv2.GaussianBlur(rmask.astype(np.float32), (0, 0), 9)
warp = np.eye(2, 3, dtype=np.float32)
try:
    cc, warp = cv2.findTransformECC(
        rf, tf, warp, cv2.MOTION_AFFINE,
        (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 500, 1e-7), None, 5)
    print("ECC on masks converged cc=%.4f" % cc)
    a = warp[:, :2]
    print("scale %.4f rot %.3f deg  translation px (%.1f, %.1f)"
          % (np.sqrt(abs(np.linalg.det(a))),
             np.degrees(np.arctan2(warp[1, 0], warp[0, 0])), warp[0, 2], warp[1, 2]))
except cv2.error as e:
    print("ECC failed:", e)
    raise

tmask_w = cv2.warpAffine(tmask, warp, (TW, TH), flags=cv2.INTER_NEAREST)
print("building-mask IoU after:  %.3f" % iou(tmask_w, rmask))

# radiometric-safe warp of temperatures
valid = fin.astype(np.float32)
num = cv2.warpAffine(np.where(fin, T, 0).astype(np.float32), warp, (TW, TH),
                     flags=cv2.INTER_LINEAR, borderValue=0)
den = cv2.warpAffine(valid, warp, (TW, TH), flags=cv2.INTER_LINEAR, borderValue=0)
T_al = np.where(den > 0.999, num / den, np.nan).astype(np.float32)

# integrity: aligned temps must stay within source range
src_lo, src_hi = np.nanmin(T), np.nanmax(T)
al_lo, al_hi = np.nanmin(T_al), np.nanmax(T_al)
print("radiometric range: source [%.1f, %.1f]  aligned [%.1f, %.1f]"
      % (src_lo, src_hi, al_lo, al_hi))
print("median drift: %.3f C" % (np.nanmedian(T_al) - np.nanmedian(T)))

np.savez(os.path.join(D, "mosaic_v5_aligned.npz"),
         temperatures=T_al, gsd_m=z["gsd_m"], origin_world=z["origin_world"])
np.save(os.path.join(D, "t_align_affine.npy"), warp)

# overlay proof
finA = np.isfinite(T_al)
lo, hi = np.nanpercentile(T_al[finA], 2), np.nanpercentile(T_al[finA], 98)
x = np.clip((T_al - lo) / max(hi - lo, 1e-6), 0, 1)
x = np.nan_to_num(x)
heat = cv2.applyColorMap((x * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
al = (finA.astype(np.float32) * 0.5)[..., None]
over = (bgr.astype(np.float32) * (1 - al) + heat.astype(np.float32) * al).astype(np.uint8)
cv2.imwrite(os.path.join(OUT, "t_aligned_over_base.jpg"),
            cv2.resize(over, (1600, int(1600 * TH / TW))), [cv2.IMWRITE_JPEG_QUALITY, 90])
print("wrote t_aligned_over_base.jpg + mosaic_v5_aligned.npz")
