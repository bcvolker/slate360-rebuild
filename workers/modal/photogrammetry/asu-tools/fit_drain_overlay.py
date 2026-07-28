r"""Best-effort automatic fit of the drain-plan overlay onto the DroneDeploy map.

Registers the plan's BUILDING OUTLINES (magenta, extracted from the overlay) to
the map's building footprints by searching rotation x scale x translation for
maximum mask overlap (IoU). Buildings are the only structure shared by an
architectural line drawing and a photo, so they are the alignment handle; the
drain dots ride along.

Emits planT { x%, y%, rot, s } in the viewer's units so the MAP drain layer
opens already close, and reports IoU honestly -- this is a starting fit for
visual checking, not a verified survey registration.
"""
import json
import os

import cv2
import numpy as np

D = r"C:\ASU-Survey\deliverables"
OUT = r"C:\ASU-Survey\out"

# ---- plan building outlines (magenta) from the overlay ----
ov = cv2.imread(os.path.join(D, "drain_overlay_clean.png"), cv2.IMREAD_UNCHANGED)
OH, OW = ov.shape[:2]
b, g, r = ov[:, :, 0].astype(int), ov[:, :, 1].astype(int), ov[:, :, 2].astype(int)
a = ov[:, :, 3] > 0
mag = ((r > 150) & (b > 150) & (g < 120) & a).astype(np.uint8) * 255
# close the outline strokes into filled building shapes
mag = cv2.morphologyEx(mag, cv2.MORPH_CLOSE, np.ones((45, 45), np.uint8))
plan_fill = np.zeros_like(mag)
cnts, _ = cv2.findContours(mag, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
for c in cnts:
    if cv2.contourArea(c) > 30000:
        cv2.drawContours(plan_fill, [c], -1, 255, -1)
print("plan building mask: %.2f%% of overlay" % (100 * (plan_fill > 0).mean()))

# ---- map building footprints (dark gravel roofs) ----
dd = cv2.imread(os.path.join(D, "deck_ortho_final_1cm.png"), cv2.IMREAD_UNCHANGED)
FH, FW = dd.shape[:2]
gray = cv2.cvtColor(dd[:, :, :3], cv2.COLOR_BGR2GRAY)
valid = dd[:, :, 3] > 0
roof = ((gray < 108) & (gray > 22) & valid).astype(np.uint8) * 255
roof = cv2.morphologyEx(roof, cv2.MORPH_CLOSE, np.ones((61, 61), np.uint8))
roof = cv2.morphologyEx(roof, cv2.MORPH_OPEN, np.ones((41, 41), np.uint8))
map_fill = np.zeros_like(roof)
cnts, _ = cv2.findContours(roof, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
for c in cnts:
    if cv2.contourArea(c) > 200000:
        cv2.drawContours(map_fill, [c], -1, 255, -1)
print("map building mask: %.2f%% of frame" % (100 * (map_fill > 0).mean()))

# work small for the search
SC = 8
pw, ph = OW // SC, OH // SC
mw, mh = FW // SC, FH // SC
plan_s = cv2.resize(plan_fill, (pw, ph), interpolation=cv2.INTER_AREA)
map_s = cv2.resize(map_fill, (mw, mh), interpolation=cv2.INTER_AREA)
plan_b = (plan_s > 127).astype(np.uint8)
map_b = (map_s > 127).astype(np.uint8)
map_area = map_b.sum()

best = None
for rot in np.arange(-100, -79, 1.0):          # around the known ~-90 deg
    for s in np.arange(0.45, 0.95, 0.02):
        M = cv2.getRotationMatrix2D((pw / 2, ph / 2), rot, s)
        w = cv2.warpAffine(plan_b, M, (pw, ph), flags=cv2.INTER_NEAREST)
        if w.sum() < 100:
            continue
        # translate via centroid match, then score IoU
        ys, xs = np.nonzero(w)
        my, mx = np.nonzero(map_b)
        dx = mx.mean() - xs.mean()
        dy = my.mean() - ys.mean()
        T = np.float32([[1, 0, dx], [0, 1, dy]])
        wt = cv2.warpAffine(w, T, (mw, mh), flags=cv2.INTER_NEAREST)
        inter = int((wt & map_b).sum())
        union = int((wt | map_b).sum())
        iou = inter / max(union, 1)
        if best is None or iou > best[0]:
            best = (iou, rot, s, dx, dy)

iou, rot, s, dx, dy = best
print("best IoU %.3f  rot %.1f deg  scale %.3f  shift(ds-px) %.1f,%.1f" % (iou, rot, s, dx, dy))

# convert to viewer planT units:
#   planOverlay is width:100% of the frame, transform-origin 50% 50%,
#   transform: translate(-50%,-50%) translate(x%,y%) rotate(rot) scale(s_view)
# the overlay's natural display width == frame width, so a plan pixel maps to
# (FW/OW) frame px before scale; our search scale is in downsampled plan px.
s_view = s * (OW / FW) * (FW / OW)      # search space already shares SC on both
# centre offset in frame px -> percent of frame
cx_plan = (pw / 2 + dx) * SC * (FW / (mw * SC))
cy_plan = (ph / 2 + dy) * SC * (FH / (mh * SC))
x_pct = (cx_plan - FW / 2) / FW * 100.0
y_pct = (cy_plan - FH / 2) / FH * 100.0
planT = {"x": round(float(x_pct), 2), "y": round(float(y_pct), 2),
         "rot": round(float(rot), 1), "s": round(float(s_view), 3),
         "iou": round(float(iou), 3)}
json.dump(planT, open(os.path.join(D, "plan_fit.json"), "w"), indent=1)
print("wrote plan_fit.json:", planT)

# visual proof: warped plan buildings (red) over map buildings (cyan)
M = cv2.getRotationMatrix2D((pw / 2, ph / 2), rot, s)
w = cv2.warpAffine(plan_b, M, (pw, ph), flags=cv2.INTER_NEAREST)
T = np.float32([[1, 0, dx], [0, 1, dy]])
wt = cv2.warpAffine(w, T, (mw, mh), flags=cv2.INTER_NEAREST)
vis = np.zeros((mh, mw, 3), np.uint8)
vis[map_b > 0] = (255, 255, 0)
vis[wt > 0] = (0, 0, 255)
vis[(wt > 0) & (map_b > 0)] = (255, 255, 255)
cv2.imwrite(os.path.join(OUT, "drain_fit_proof.jpg"),
            cv2.resize(vis, (1300, int(1300 * mh / mw))), [cv2.IMWRITE_JPEG_QUALITY, 90])
print("wrote drain_fit_proof.jpg (cyan=map buildings, red=plan buildings, white=overlap)")
