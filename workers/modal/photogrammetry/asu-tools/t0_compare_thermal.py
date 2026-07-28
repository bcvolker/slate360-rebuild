r"""T0.1 -- render both candidate thermal mosaics standalone to decide which the
viewer should use. The asset builder currently loads mosaic_main_flight_v5.npz
(Jul 15); panorama_registered.npz (Jul 17) is newer and carries the per-pixel
`count` array the strip-repair needs. If the newer one is straighter, wiring it
in is a large free win before any warping.
"""
import os

import cv2
import numpy as np

D = r"C:\ASU-Survey\deliverables"
OUT = r"C:\ASU-Survey\out"


def render(npz, out):
    z = np.load(os.path.join(D, npz))
    T = z["temperatures"].astype(np.float32)
    TH, TW = T.shape
    fin = np.isfinite(T)
    lo, hi = np.nanpercentile(T[fin], 2), np.nanpercentile(T[fin], 98)
    x = np.clip((T - lo) / max(hi - lo, 1e-6), 0, 1)
    x = np.nan_to_num(x)
    heat = cv2.applyColorMap((x * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
    heat[~fin] = (30, 30, 30)
    cv2.imwrite(os.path.join(OUT, out),
                cv2.resize(heat, (1500, int(1500 * TH / TW))),
                [cv2.IMWRITE_JPEG_QUALITY, 92])
    print("rendered", npz, "->", out, "valid %.1f%%" % (100 * fin.mean()))


render("mosaic_main_flight_v5.npz", "t0_mosaic_v5.jpg")
render("panorama_registered.npz", "t0_panorama_reg.jpg")
