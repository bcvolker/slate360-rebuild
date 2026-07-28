r"""T0 decision: does a SINGLE global transform align the displayed thermal
(mosaic_v5) to the RGB base, or is piecewise strip repair needed?

mosaic_v5 rendered standalone looks internally straight (crisp rectangles), but
overlaid on the RGB base it's offset -- suggesting a global registration error,
not internal twist. If a global affine/similarity fit leaves small residual, the
thermal fix is a one-shot global warp (fast). If residual stays large and
spatially structured, it's genuinely piecewise (strips) and needs T1-T3.

Method: ECC MOTION_AFFINE in the gradient domain (thermal<->RGB textures differ,
so raw intensity won't correlate; gradients do). Then measure the residual
displacement field after applying the global fit.
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
                  cv2.COLOR_BGR2GRAY).astype(np.float32)


def grad_u8(img):
    g = cv2.GaussianBlur(img.astype(np.float32), (0, 0), 2)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    return cv2.normalize(np.hypot(gx, gy), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)


tg = grad_u8(Tf)
bgg = grad_u8(bg)


def resid_field(warped_grad, label):
    TS = 128
    recs = []
    for gy in range(0, TH - TS, TS // 2):
        for gx in range(0, TW - TS, TS // 2):
            if fin[gy:gy + TS, gx:gx + TS].mean() < 0.7:
                continue
            a = bgg[gy:gy + TS, gx:gx + TS].astype(np.float32)
            b = warped_grad[gy:gy + TS, gx:gx + TS].astype(np.float32)
            if a.std() < 6 or b.std() < 6:
                continue
            win = cv2.createHanningWindow((TS, TS), cv2.CV_32F)
            (dx, dy), resp = cv2.phaseCorrelate(a, b, win)
            if resp < 0.12:
                continue
            recs.append((dx, dy))
    recs = np.array(recs)
    if len(recs) < 5:
        print(label, "-- too few cells (%d)" % len(recs))
        return
    mag = np.hypot(recs[:, 0], recs[:, 1]) * 3
    print("%s: %d cells | offset cm median %.1f p90 %.1f max %.1f"
          % (label, len(recs), np.median(mag), np.percentile(mag, 90), mag.max()))


# baseline (identity)
resid_field(tg, "identity (no fit)")

# global affine via ECC (mask to valid deck)
mask = (fin & (cv2.GaussianBlur(fin.astype(np.float32), (0, 0), 3) > 0.5)).astype(np.uint8)
warp = np.eye(2, 3, dtype=np.float32)
try:
    cc, warp = cv2.findTransformECC(
        bgg, tg, warp, cv2.MOTION_AFFINE,
        (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6),
        inputMask=None, gaussFiltSize=5)
    print("\nECC affine converged, cc=%.4f" % cc)
    print("affine matrix:\n", warp)
    a = warp[:, :2]
    scale = np.sqrt(abs(np.linalg.det(a)))
    rot = np.degrees(np.arctan2(warp[1, 0], warp[0, 0]))
    print("~scale %.4f  ~rotation %.3f deg  translation px (%.1f, %.1f)"
          % (scale, rot, warp[0, 2], warp[1, 2]))
    tg_w = cv2.warpAffine(tg, warp, (TW, TH), flags=cv2.INTER_LINEAR)
    resid_field(tg_w, "after global affine")
    np.save(os.path.join(D, "t0_global_affine.npy"), warp)
except cv2.error as e:
    print("ECC failed:", e)
