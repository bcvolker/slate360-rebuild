r"""Phase 0T root-cause fix: DECK_CLIP was a 7-point polygon hand-traced once
against an OLDER base image's proportions (_deck6067, coords in a 6067x4066
space) and never recomputed when the base/frame changed. That single stale
polygon is what produced every symptom in the screenshot: it chops through the
west building, overshoots past the east building, and its SE corner spills onto
the bleachers -- looking exactly like "detached thermal island" / "bloom on
bleachers" / "jagged boundary", even though the underlying thermal-to-base
registration measures correctly (see phase0t_landmark_diag.py + p0t_full_overlay
edge comparison: buildings/HVAC/membrane land on the right structures).

Fix: derive the clip polygon from the thermal layer's OWN true coverage mask
(isfinite(temperatures)) -- the ground truth the thermal already renders with
alpha=0 outside of -- instead of a hand-traced approximation. This can never go
stale again: it is recomputed from data every build, not carried as a magic
constant.
"""
import json

import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"
# mosaic_main_flight_v5.npz is the file the viewer ACTUALLY displays as the
# thermal layer (build_assets_p2 loads it). An earlier version of this script
# used panorama_registered.npz -- a DIFFERENT mosaic with a different (63.9% vs
# 60.6%) footprint -- so the clip didn't match the displayed thermal's real
# coverage. Deriving the clip from the displayed file is the fix.
z = np.load(DELIV + r"\mosaic_main_flight_v5.npz")
T = z["temperatures"].astype(np.float32)
TH, TW = T.shape
mask = np.isfinite(T).astype(np.uint8) * 255

# close small holes (stitch seams) so the outline is one clean boundary, not
# fragmented by pixel-level gaps
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))

cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
c = max(cnts, key=cv2.contourArea)
peri = cv2.arcLength(c, True)
# simplify to a clean polygon -- enough vertices to follow the real boundary
# shape (this deck outline has ~7-9 natural corners), not so many that the
# CSS polygon() clip-path becomes unwieldy
poly = cv2.approxPolyDP(c, 0.012 * peri, True).reshape(-1, 2)
print("coverage area %.1f%% of canvas, contour pts %d -> simplified to %d verts"
      % (100 * mask.mean() / 255, len(c), len(poly)))

# frame fractions (0..1), independent of any pixel resolution
frac = [(float(x) / TW, float(y) / TH) for x, y in poly]
json.dump({"tw": TW, "th": TH, "poly_frac": frac},
          open(DELIV + r"\deck_clip_poly.json", "w"), indent=1)
print("wrote deck_clip_poly.json:", frac)

# visual proof: draw the NEW polygon vs the OLD stale one on the overlay
over = cv2.imread(r"C:\ASU-Survey\out\p0t_full_overlay.jpg")
oh, ow = over.shape[:2]
old6067 = [[1450, 250], [4750, 180], [4950, 700], [4950, 2700], [4300, 3050],
           [2050, 3600], [1450, 3300]]
CW, CH = 6067.0, 4066.0
oldpts = np.array([[x / CW * ow, y / CH * oh] for x, y in old6067], np.int32)
newpts = np.array([[fx * ow, fy * oh] for fx, fy in frac], np.int32)
cv2.polylines(over, [oldpts], True, (0, 0, 255), 3)   # red = old/stale
cv2.polylines(over, [newpts], True, (0, 255, 0), 3)   # green = new/correct
cv2.putText(over, "RED = old stale clip   GREEN = new (from real coverage)",
            (20, oh - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
cv2.imwrite(r"C:\ASU-Survey\out\p0t_deckclip_fix_proof.jpg", over,
            [cv2.IMWRITE_JPEG_QUALITY, 92])
print("wrote out/p0t_deckclip_fix_proof.jpg")
