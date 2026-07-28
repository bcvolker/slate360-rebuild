r"""T0.1 continued: (1) compare frame metadata of the two thermal mosaics,
(2) measure the DISPLAYED thermal (mosaic_main_flight_v5) against the RGB base
with the grid-correlation method, to answer 'is the displayed thermal actually
twisted, and where'. Also builds an overlay for visual confirmation.
"""
import os

import cv2
import numpy as np

D = r"C:\ASU-Survey\deliverables"
OUT = r"C:\ASU-Survey\out"

for f in ["mosaic_main_flight_v5.npz", "panorama_registered.npz"]:
    z = np.load(os.path.join(D, f))
    print(f, "gsd_m", float(z["gsd_m"]), "origin_world", list(z["origin_world"]))

# --- measure displayed thermal (mosaic_v5) vs RGB base ---
z = np.load(os.path.join(D, "mosaic_main_flight_v5.npz"))
T = z["temperatures"].astype(np.float32)
TH, TW = T.shape
fin = np.isfinite(T)

base = cv2.imread(os.path.join(D, "deck_ortho_merged_1cm.png"), cv2.IMREAD_UNCHANGED)
base = cv2.resize(base[:, :, :3], (TW, TH), interpolation=cv2.INTER_AREA)
bg = cv2.cvtColor(base, cv2.COLOR_BGR2GRAY).astype(np.float32)

Tf = np.where(fin, T, np.nanmedian(T[fin]))


def grad(img):
    g = cv2.GaussianBlur(img.astype(np.float32), (0, 0), 2)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    m = np.hypot(gx, gy)
    return cv2.normalize(m, None, 0, 255, cv2.NORM_MINMAX)


tg = grad(Tf)
bgg = grad(bg)

TS = 128
recs = []
for gy in range(0, TH - TS, TS // 2):
    for gx in range(0, TW - TS, TS // 2):
        if fin[gy:gy + TS, gx:gx + TS].mean() < 0.7:
            continue
        a = bgg[gy:gy + TS, gx:gx + TS]
        b = tg[gy:gy + TS, gx:gx + TS]
        if a.std() < 6 or b.std() < 6:
            continue
        win = cv2.createHanningWindow((TS, TS), cv2.CV_32F)
        (dx, dy), resp = cv2.phaseCorrelate(a, b, win)
        if resp < 0.12:
            continue
        recs.append((gx + TS / 2, gy + TS / 2, dx, dy, resp))

recs = np.array(recs)
print("\nDISPLAYED thermal (mosaic_v5) vs RGB base -- %d usable cells" % len(recs))
if len(recs):
    mag = np.hypot(recs[:, 2], recs[:, 3]) * 3  # thermal px = 3 cm
    print("offset cm: median %.1f  p90 %.1f  p95 %.1f  max %.1f"
          % (np.median(mag), np.percentile(mag, 90),
             np.percentile(mag, 95), mag.max()))
    print("directional bias dx,dy px: %.2f, %.2f"
          % (np.median(recs[:, 2]), np.median(recs[:, 3])))
    # residual after removing the global median shift = the "twist" component
    rx = recs[:, 2] - np.median(recs[:, 2])
    ry = recs[:, 3] - np.median(recs[:, 3])
    res = np.hypot(rx, ry) * 3
    print("NON-uniform (twist) residual after removing global shift: median %.1f cm  p90 %.1f cm"
          % (np.median(res), np.percentile(res, 90)))
    np.save(os.path.join(D, "t0_mosaicv5_vs_base_field.npy"), recs)

# overlay for eyes
lo, hi = np.nanpercentile(T[fin], 2), np.nanpercentile(T[fin], 98)
x = np.clip((T - lo) / max(hi - lo, 1e-6), 0, 1)
x = np.nan_to_num(x)
heat = cv2.applyColorMap((x * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
a = (fin.astype(np.float32) * 0.5)[..., None]
over = (base.astype(np.float32) * (1 - a) + heat.astype(np.float32) * a).astype(np.uint8)
cv2.imwrite(os.path.join(OUT, "t0_mosaicv5_over_base.jpg"),
            cv2.resize(over, (1600, int(1600 * TH / TW))), [cv2.IMWRITE_JPEG_QUALITY, 90])
print("wrote t0_mosaicv5_over_base.jpg")
