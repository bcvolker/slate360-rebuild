r"""Ground-truth swipe montage: split crops (RGB | thermal) at real structural
landmarks, CURRENT displayed thermal (mosaic_v5) vs the NEW lossless base. Shows
exactly where the thermal sits relative to the map and what correction it needs
-- reliable, unlike the noisy cross-modal auto-metrics.
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
lo, hi = np.nanpercentile(T[fin], 2), np.nanpercentile(T[fin], 98)
x = np.clip((T - lo) / max(hi - lo, 1e-6), 0, 1)
x = np.nan_to_num(x)
heat = cv2.applyColorMap((x * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)

# landmarks in thermal-native px (4045x2711): building corners, HVAC, membrane
lms = {
    "L-bldg NW": (1180, 300), "L-bldg SE": (1620, 1470),
    "R-bldg NW": (2740, 660), "R-bldg SE": (3160, 1900),
    "membrane W": (1720, 830), "membrane E": (2720, 1050),
}
S = 260
tiles = []
for name, (cx, cy) in lms.items():
    x0, x1 = max(0, cx - S), min(TW, cx + S)
    y0, y1 = max(0, cy - S), min(TH, cy + S)
    cb = bgr[y0:y1, x0:x1].copy()
    ch = heat[y0:y1, x0:x1].copy()
    m = fin[y0:y1, x0:x1]
    blend = cb.copy()
    a = (m.astype(np.float32) * 0.55)[..., None]
    blend = (cb.astype(np.float32) * (1 - a) + ch.astype(np.float32) * a).astype(np.uint8)
    # left half RGB, right half blend, split line
    half = blend.shape[1] // 2
    comp = cb.copy()
    comp[:, half:] = blend[:, half:]
    cv2.line(comp, (half, 0), (half, comp.shape[0]), (0, 255, 0), 2)
    comp = cv2.resize(comp, (360, 360))
    cv2.putText(comp, name, (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 3)
    cv2.putText(comp, name, (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 1)
    tiles.append(comp)
row1 = np.hstack(tiles[:3])
row2 = np.hstack(tiles[3:])
cv2.imwrite(os.path.join(OUT, "t_swipe_montage.jpg"), np.vstack([row1, row2]),
            [cv2.IMWRITE_JPEG_QUALITY, 92])
print("wrote t_swipe_montage.jpg (left=RGB, right=RGB+thermal; look for edge continuity across the green line)")
