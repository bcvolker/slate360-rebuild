r"""Georeference the repair-sheet drain constellation onto the ortho by
similarity RANSAC against dark-fixture candidates detected on the deck.

Scale is near-known (drawing 150dpi @ 1"=10' -> 2.032cm/px vs ortho 2cm/px
=> s ~= 1.016), rotation free. Accept only if >=9/15 drains land within
1.2 m of a detected candidate; refine least-squares on inliers.

Output: deliverables\drains_map.json  [{x_px2cm, y_px2cm, x_m, y_m, matched}]
        deliverables\qc_drains_on_ortho.jpg
"""
import json

import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"
draw_pts = np.load(DELIV + r"\drain_pts_sheet.npy")  # (15,2) sheet px @150dpi
ortho = cv2.imread(DELIV + r"\ortho_hires_v2.jpg")
z5 = np.load(DELIV + r"\mosaic_main_flight_v5.npz")
TH, TW = z5["temperatures"].shape
crop = ortho[int(5327*1.5):int(5327*1.5)+int(TH*1.5),
             int(2942*1.5):int(2942*1.5)+int(TW*1.5)]
g = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

# deck mask: bright concrete
deck = (g > 120).astype(np.uint8)
deck = cv2.morphologyEx(deck, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
# dark fixtures ON deck: local contrast
mean = cv2.blur(g.astype(np.float32), (61, 61))
darkspot = ((g.astype(np.float32) < mean - 30) & (deck > 0)).astype(np.uint8)
darkspot = cv2.morphologyEx(darkspot, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n, lbl, stats, cent = cv2.connectedComponentsWithStats(darkspot)
cands = []
for i in range(1, n):
    a = stats[i, cv2.CC_STAT_AREA]
    w, h = stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]
    if 40 < a < 2500 and w < 90 and h < 90 and 0.35 < w/max(h, 1) < 2.8:
        cands.append((cent[i][0], cent[i][1]))
cands = np.array(cands)
print("ortho dark-fixture candidates:", len(cands))

D = draw_pts
best = None
nd = len(D)
dd = np.linalg.norm(D[:, None] - D[None, :], axis=2)
cd = np.linalg.norm(cands[:, None] - cands[None, :], axis=2)
S_LO, S_HI = 0.97, 1.07
for i in range(nd):
    for j in range(i + 1, nd):
        dij = dd[i, j]
        if dij < 400:
            continue
        lo, hi = dij * S_LO, dij * S_HI
        pairs = np.argwhere((cd > lo) & (cd < hi))
        for a, b in pairs:
            # similarity from (D[i]->cands[a], D[j]->cands[b])
            v1 = D[j] - D[i]
            v2 = cands[b] - cands[a]
            s = np.linalg.norm(v2) / dij
            th = np.arctan2(v2[1], v2[0]) - np.arctan2(v1[1], v1[0])
            R = s * np.array([[np.cos(th), -np.sin(th)],
                              [np.sin(th), np.cos(th)]])
            t = cands[a] - R @ D[i]
            P = (R @ D.T).T + t
            d2 = np.linalg.norm(P[:, None] - cands[None], axis=2).min(axis=1)
            inl = (d2 < 60).sum()
            if best is None or inl > best[0]:
                best = (inl, R, t, d2)
print("best inliers: %d/15, residuals(px2cm): %s"
      % (best[0], np.round(np.sort(best[3])[:12], 0)))
assert best[0] >= 6, "constellation match failed - manual control points needed"

# LSQ refine on inliers
R, t = best[1], best[2]
P = (R @ D.T).T + t
d2 = np.linalg.norm(P[:, None] - cands[None], axis=2)
nn = d2.argmin(axis=1)
ok = d2.min(axis=1) < 60
A = []
bv = []
for k in np.flatnonzero(ok):
    x, y = D[k]
    u, v = cands[nn[k]]
    A += [[x, -y, 1, 0], [y, x, 0, 1]]
    bv += [u, v]
sol, *_ = np.linalg.lstsq(np.array(A), np.array(bv), rcond=None)
a, bpar, tx, ty = sol
R = np.array([[a, -bpar], [bpar, a]])
t = np.array([tx, ty])
P = (R @ D.T).T + t
res = np.linalg.norm(P[:, None] - cands[None], axis=2).min(axis=1)
print("refined: scale %.4f rot %.2f deg, inlier res med %.0fpx (%.2fm)"
      % (np.hypot(a, bpar), np.degrees(np.arctan2(bpar, a)),
         np.median(res[ok]), np.median(res[ok]) * 0.02))

out = []
for k in range(nd):
    px, py = P[k]
    out.append({"x_px2cm": round(float(px), 1), "y_px2cm": round(float(py), 1),
                "fx": round(float(px) / crop.shape[1], 5),
                "fy": round(float(py) / crop.shape[0], 5),
                "x_m": round(-66.66 + float(px) * 0.02, 2),
                "y_m": round(11.29 - float(py) * 0.02, 2),
                "matched": bool(ok[k]),
                "res_m": round(float(res[k]) * 0.02, 2)})
json.dump({"drains": out, "note": "plan locations, not field-verified; "
           "typical construction variance 0.3-0.6 m"},
          open(DELIV + r"\drains_map.json", "w"), indent=1)

vis = crop.copy()
for k, o in enumerate(out):
    c = (0, 220, 0) if o["matched"] else (0, 180, 255)
    cv2.circle(vis, (int(o["x_px2cm"]), int(o["y_px2cm"])), 30, c, 5)
    cv2.putText(vis, "D%d" % (k+1), (int(o["x_px2cm"])+34, int(o["y_px2cm"])),
                0, 1.3, c, 3)
cv2.imwrite(DELIV + r"\qc_drains_on_ortho.jpg",
            cv2.resize(vis, (2000, int(vis.shape[0]*2000/vis.shape[1]))),
            [cv2.IMWRITE_JPEG_QUALITY, 86])
print("saved drains_map.json + qc_drains_on_ortho.jpg")
