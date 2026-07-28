r"""Phase 0T.3 -- measure current thermal-vs-base misalignment at real structural
landmarks, in the EXACT assets the live viewer uses (not an idealized re-render).

Base:    deck_ortho_dd_filled_1cm.jpg resampled to (TW,TH) -- this is byte-for-byte
         what build_assets_p2.py bakes into imgOrtho, and what make_tiles.py tiles
         (same source, no crop). So this measurement reflects what ships.
Thermal: panorama_registered.npz temperatures, native (TW,TH) = (4045,2711),
         identity onto this same frame (no separate warp -- this is the fixed
         reference per the accepted registration).

Method: pick landmarks at real structural edges (roof/HVAC/membrane corners) visible
in BOTH the RGB edge map and the thermal edge map (thermal has a real temperature
discontinuity at these physical edges). For each landmark, local phase-correlation
in a small window gives an independent offset estimate. Fit translation vs the full
set; report residual pattern per the decision tree (uniform=placement bug,
smooth gradient=scale/CRS, region-varying=internal break).
"""
import json

import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"

z = np.load(DELIV + r"\panorama_registered.npz")
T = z["temperatures"].astype(np.float32)
TH, TW = T.shape
print("thermal grid", TW, TH)

base_full = cv2.imread(DELIV + r"\deck_ortho_dd_filled_1cm.jpg", cv2.IMREAD_GRAYSCALE)
base = cv2.resize(base_full, (TW, TH), interpolation=cv2.INTER_AREA)
print("base (as imgOrtho will show it)", base.shape)

fin = np.isfinite(T)
Tf = np.where(fin, T, np.nanmedian(T[fin]))
# thermal edge magnitude (Sobel) -- real structural edges show up as strong
# temperature gradients (roof/membrane/HVAC boundaries)
tgx = cv2.Sobel(Tf, cv2.CV_32F, 1, 0, ksize=5)
tgy = cv2.Sobel(Tf, cv2.CV_32F, 0, 1, ksize=5)
tmag = cv2.normalize(np.hypot(tgx, tgy), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

bgx = cv2.Sobel(base.astype(np.float32), cv2.CV_32F, 1, 0, ksize=5)
bgy = cv2.Sobel(base.astype(np.float32), cv2.CV_32F, 0, 1, ksize=5)
bmag = cv2.normalize(np.hypot(bgx, bgy), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

cv2.imwrite(r"C:\ASU-Survey\out\p0t_thermal_edges.jpg", tmag)
cv2.imwrite(r"C:\ASU-Survey\out\p0t_base_edges.jpg", bmag)

# 8 distributed landmarks: pick by finding strong-edge clusters in a grid of cells,
# biased toward the two rooftop building masses + membrane strip (visible in both).
win = 180
cells = [(0.30, 0.18), (0.62, 0.15), (0.20, 0.45), (0.50, 0.42), (0.78, 0.45),
         (0.30, 0.72), (0.62, 0.75), (0.47, 0.30)]
recs = []
for i, (fx, fy) in enumerate(cells, 1):
    cx, cy = int(fx * TW), int(fy * TH)
    x0, x1 = max(0, cx - win), min(TW, cx + win)
    y0, y1 = max(0, cy - win), min(TH, cy + win)
    wt = tmag[y0:y1, x0:x1].astype(np.float32)
    wb = bmag[y0:y1, x0:x1].astype(np.float32)
    if wt.std() < 3 or wb.std() < 3:
        print("landmark %d: too flat, skipped" % i)
        continue
    hann = cv2.createHanningWindow((wt.shape[1], wt.shape[0]), cv2.CV_32F)
    (dx, dy), resp = cv2.phaseCorrelate(wb, wt, hann)
    recs.append({"id": i, "cx": cx, "cy": cy, "dx": dx, "dy": dy, "resp": float(resp)})
    print("landmark %2d @ (%4d,%4d)  offset (dx=%+.1f, dy=%+.1f) px  resp %.2f  = %.1fcm,%.1fcm"
          % (i, cx, cy, dx, dy, resp, dx * 3, dy * 3))

good = [r for r in recs if r["resp"] > 0.10]
print("\nusable landmarks: %d / %d" % (len(good), len(recs)))
if good:
    dxs = np.array([r["dx"] for r in good])
    dys = np.array([r["dy"] for r in good])
    print("dx: mean %.1f std %.1f px  (%.1f cm, std %.1f cm)"
          % (dxs.mean(), dxs.std(), dxs.mean() * 3, dxs.std() * 3))
    print("dy: mean %.1f std %.1f px  (%.1f cm, std %.1f cm)"
          % (dys.mean(), dys.std(), dys.mean() * 3, dys.std() * 3))
    print("residual pattern:", "UNIFORM (pure translation)" if dxs.std() < 3 and dys.std() < 3
          else "VARIES BY REGION (not a simple translation)")

json.dump(recs, open(DELIV + r"\p0t_landmarks.json", "w"), indent=1)

# annotated crops for visual confirmation -- burn both edge maps + offset vector
vis = cv2.cvtColor(base, cv2.COLOR_GRAY2BGR)
tcol = cv2.applyColorMap(tmag, cv2.COLORMAP_HOT)
blend = cv2.addWeighted(vis, 0.5, tcol, 0.5, 0)
for r in recs:
    c = (0, 255, 0) if r["resp"] > 0.10 else (0, 0, 255)
    cv2.circle(blend, (r["cx"], r["cy"]), 8, c, -1)
    cv2.putText(blend, str(r["id"]), (r["cx"] + 12, r["cy"]),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    if r["resp"] > 0.10:
        ex, ey = int(r["cx"] + r["dx"] * 5), int(r["cy"] + r["dy"] * 5)
        cv2.arrowedLine(blend, (r["cx"], r["cy"]), (ex, ey), (0, 255, 255), 3, tipLength=0.3)
cv2.imwrite(r"C:\ASU-Survey\out\p0t_landmark_map.jpg",
            cv2.resize(blend, (1700, int(1700 * TH / TW))), [cv2.IMWRITE_JPEG_QUALITY, 90])
print("wrote out/p0t_landmark_map.jpg (offset vectors exaggerated 5x)")
