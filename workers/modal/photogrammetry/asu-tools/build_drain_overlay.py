r"""Clean drain overlay for the MAP tab: drain dots (bold, numbered, colored by
moisture status) + faint building footprint outlines as an alignment guide.
Transparent background, no PDF clutter, cropped to content.

The building outlines are the guide: line them up to the map's rooftops once and
every drain sits in true position. Payload = the dots.
"""
import json

import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"
plan = cv2.imread(DELIV + r"\drainplan_p0_hi.png")
H, W = plan.shape[:2]
PANEL = int(W * 0.72)
hsv = cv2.cvtColor(plan, cv2.COLOR_BGR2HSV)

# magenta dashed building outlines
mag = cv2.inRange(hsv, (140, 60, 120), (175, 255, 255))
mag[:, PANEL:] = 0
# close the dashes into solid outlines, then keep sizeable building loops
mag = cv2.dilate(mag, np.ones((9, 9), np.uint8))
mag = cv2.morphologyEx(mag, cv2.MORPH_CLOSE, np.ones((35, 35), np.uint8))

overlay = np.zeros((H, W, 4), np.uint8)
# draw building outlines as thin translucent magenta
cnts, _ = cv2.findContours(mag, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
for c in cnts:
    if cv2.contourArea(c) < 60000:
        continue
    hull = cv2.approxPolyDP(c, 12, True)
    cv2.polylines(overlay, [hull], True, (220, 70, 220, 200), 5)

# drain dots
drains = json.load(open(DELIV + r"\drains_plan_px.json"))["drains"]
for d in drains:
    x, y = int(d["x"]), int(d["y"])
    col = (250, 130, 60, 255) if d["status"] == "moisture" else (60, 60, 240, 255)
    cv2.circle(overlay, (x, y), 34, col, -1)
    cv2.circle(overlay, (x, y), 34, (255, 255, 255, 255), 6)
    t = str(d["id"])
    (tw, th), _ = cv2.getTextSize(t, cv2.FONT_HERSHEY_SIMPLEX, 1.1, 3)
    cv2.putText(overlay, t, (x - tw // 2, y + th // 2),
                cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255, 255, 255, 255), 3, cv2.LINE_AA)

# crop to content (union of outlines + dots), pad a little
ys, xs = np.nonzero(overlay[:, :, 3])
x0, x1 = xs.min() - 40, xs.max() + 40
y0, y1 = ys.min() - 40, ys.max() + 40
crop = overlay[max(0, y0):y1, max(0, x0):x1]
cv2.imwrite(DELIV + r"\drain_overlay_clean.png", crop)
print("wrote drain_overlay_clean.png", crop.shape,
      "| dots", len(drains),
      "moist", sum(d["status"] == "moisture" for d in drains),
      "dry", sum(d["status"] == "dry" for d in drains))

# also store dot fractions WITHIN the cropped overlay, so the viewer can place
# interactive markers that ride the same transform as the image
recs = []
for d in drains:
    recs.append({"id": d["id"], "status": d["status"],
                 "ox": round((d["x"] - max(0, x0)) / crop.shape[1], 5),
                 "oy": round((d["y"] - max(0, y0)) / crop.shape[0], 5)})
json.dump({"w": crop.shape[1], "h": crop.shape[0], "drains": recs},
          open(DELIV + r"\drain_overlay_markers.json", "w"), indent=1)
print("wrote drain_overlay_markers.json")
