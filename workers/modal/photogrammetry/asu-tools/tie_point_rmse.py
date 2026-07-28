r"""Formal thermal<->RGB alignment accuracy on the DECK (the promised gate).

Automated tie points: find corner-like features on the RGB deck, then locate the
same feature in the thermal image by normalized cross-correlation on gradient
magnitude (cross-modal safe). Report per-point offsets + RMSE in cm.

Client-facing language target (round-9 consensus): report in cm and compare to a
familiar object ("about the width of an expansion joint"), never "survey grade".
"""
import json

import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"
GSD = 0.03  # m per px in the shared thermal/ortho grid

z = np.load(DELIV + r"\panorama_registered.npz")
T = z["temperatures"].astype(np.float32)
TH, TW = T.shape
fin = np.isfinite(T)

ortho = cv2.imread(DELIV + r"\ortho_hires_v2.jpg")
oc = ortho[int(5327*1.5):int(5327*1.5)+int(TH*1.5),
           int(2942*1.5):int(2942*1.5)+int(TW*1.5)]
RGB = cv2.resize(cv2.cvtColor(oc, cv2.COLOR_BGR2GRAY), (TW, TH))

# deck-only region (same boundary as the analysis)
poly = np.array([[1450, 250], [4750, 180], [4950, 700], [4950, 2700],
                 [4300, 3050], [2050, 3600], [1450, 3300]], np.float32) * (TW/6067.0)
deck = np.zeros((TH, TW), np.uint8)
cv2.fillPoly(deck, [poly.astype(np.int32)], 1)
for bx0, by0, bx1, by1 in [(1850, 520, 3000, 2800), (3730, 800, 4750, 2600)]:
    cv2.rectangle(deck, (int(bx0*TW/6067), int(by0*TW/6067)),
                  (int(bx1*TW/6067), int(by1*TW/6067)), 0, -1)
valid = (deck > 0) & fin


def grad(img):
    g = cv2.GaussianBlur(img.astype(np.float32), (0, 0), 1.2)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, 3)
    gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, 3)
    m = np.sqrt(gx*gx + gy*gy)
    return m / (np.percentile(m, 99) + 1e-6)


Grgb = grad(RGB)
Tn = np.nan_to_num(T, nan=float(np.nanmedian(T)))
Gthr = grad(cv2.normalize(Tn, None, 0, 255, cv2.NORM_MINMAX))

# candidate tie features: strong corners on deck, well spread
corners = cv2.goodFeaturesToTrack(
    (Grgb*255).astype(np.uint8), maxCorners=400, qualityLevel=0.06,
    minDistance=120, mask=valid.astype(np.uint8))
print("corner candidates:", 0 if corners is None else len(corners))

W = 48       # template half-size (~1.4 m)
S = 20       # search radius (~60 cm)
pts = []
for c in (corners if corners is not None else []):
    x, y = int(c[0][0]), int(c[0][1])
    if x-W-S < 0 or y-W-S < 0 or x+W+S >= TW or y+W+S >= TH:
        continue
    tmpl = Grgb[y-W:y+W, x-W:x+W]
    if tmpl.std() < 0.05:
        continue
    win = Gthr[y-W-S:y+W+S, x-W-S:x+W+S]
    if not valid[y-W:y+W, x-W:x+W].all():
        continue
    res = cv2.matchTemplate(win.astype(np.float32), tmpl.astype(np.float32),
                            cv2.TM_CCOEFF_NORMED)
    _mn, mx, _ml, ml = cv2.minMaxLoc(res)
    dx, dy = ml[0]-S, ml[1]-S
    if mx < 0.35:                      # weak match -> reject
        continue
    if abs(dx) >= S or abs(dy) >= S:   # hit search edge -> unreliable
        continue
    pts.append((x, y, dx, dy, mx))

pts.sort(key=lambda p: -p[4])
pts = pts[:40]
print("accepted tie points:", len(pts))
if len(pts) < 8:
    raise SystemExit("too few reliable tie points")

d = np.array([[p[2], p[3]] for p in pts], float) * GSD * 100.0   # cm
mag = np.hypot(d[:, 0], d[:, 1])
rmse = float(np.sqrt((mag**2).mean()))
med = float(np.median(mag))
p95 = float(np.percentile(mag, 95))
bias = d.mean(axis=0)
print("offset cm: median %.1f  RMSE %.1f  p95 %.1f  max %.1f"
      % (med, rmse, p95, mag.max()))
print("systematic bias (E,N) cm: %.1f, %.1f" % (bias[0], bias[1]))

out = {"n_points": len(pts), "gsd_cm": GSD*100,
       "median_cm": round(med, 1), "rmse_cm": round(rmse, 1),
       "p95_cm": round(p95, 1), "max_cm": round(float(mag.max()), 1),
       "bias_cm": [round(bias[0], 1), round(bias[1], 1)],
       "points": [{"x": int(p[0]), "y": int(p[1]),
                   "dx_cm": round(p[2]*GSD*100, 1),
                   "dy_cm": round(p[3]*GSD*100, 1),
                   "score": round(p[4], 3)} for p in pts]}
json.dump(out, open(DELIV + r"\alignment_rmse.json", "w"), indent=1)

vis = cv2.cvtColor(RGB, cv2.COLOR_GRAY2BGR)
for p in pts:
    cv2.circle(vis, (p[0], p[1]), 22, (0, 220, 0), 2)
    cv2.arrowedLine(vis, (p[0], p[1]),
                    (int(p[0]+p[2]*6), int(p[1]+p[3]*6)), (0, 140, 255), 2)
cv2.imwrite(DELIV + r"\qc_tie_points.jpg",
            cv2.resize(vis, (2000, int(TH*2000/TW))),
            [cv2.IMWRITE_JPEG_QUALITY, 86])
print("saved alignment_rmse.json + qc_tie_points.jpg")
