r"""Extract the drain markers from the AE102X slab plan (page 0):
  blue dot  = moisture observed on drain mat
  red dot   = NO moisture observed
Return centroids (plan px) + status, and render a clean transparent overlay of
just the dots (no PDF background) for georeferencing and viewer use.
"""
import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"
img = cv2.imread(DELIV + r"\drainplan_p0_hi.png")
H, W = img.shape[:2]
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

# the notes + legend live in the right panel of the sheet -- exclude it so the
# legend swatches and red annotation text are never mistaken for drains
PANEL_X = int(W * 0.72)

blue = cv2.inRange(hsv, (100, 120, 80), (135, 255, 255))
red = cv2.inRange(hsv, (0, 120, 80), (10, 255, 255)) | \
      cv2.inRange(hsv, (160, 120, 80), (180, 255, 255))
blue[:, PANEL_X:] = 0
red[:, PANEL_X:] = 0

# real drain discs are ~50-60px at 200dpi -> area ~2000-6000, round and solid.
# Row-of-small-symbols and thin red leader text fall below the area / fill bar.
AMIN, AMAX = 3500, 30000


def dots(mask, name):
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    n, lbl, stats, cent = cv2.connectedComponentsWithStats(mask)
    out = []
    for i in range(1, n):
        a = stats[i, cv2.CC_STAT_AREA]
        w, h = stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]
        if not (AMIN <= a <= AMAX):
            continue
        ar = max(w, h) / max(min(w, h), 1)
        fill = a / max(w * h, 1)
        if ar > 1.6 or fill < 0.55:      # round, solid discs only
            continue
        out.append((float(cent[i][0]), float(cent[i][1]), int(a)))
    print(name, len(out), "dots")
    return out


bd = dots(blue, "blue(moist)")
rd = dots(red, "red(dry)")

overlay = np.zeros((H, W, 4), np.uint8)
recs = []
for x, y, a in bd:
    recs.append({"x": x, "y": y, "status": "moisture"})
for x, y, a in rd:
    recs.append({"x": x, "y": y, "status": "dry"})
# number by reading order (top row first, then left-to-right)
recs.sort(key=lambda r: (round(r["y"] / 220), r["x"]))
for i, r in enumerate(recs, 1):
    r["id"] = i
    c = (60, 130, 250, 255) if r["status"] == "moisture" else (230, 90, 60, 255)
    cv2.circle(overlay, (int(r["x"]), int(r["y"])), 26, c, -1)
    cv2.circle(overlay, (int(r["x"]), int(r["y"])), 26, (255, 255, 255, 255), 4)

cv2.imwrite(DELIV + r"\drain_dots_overlay.png", overlay)
import json
json.dump({"w": W, "h": H, "drains": recs},
          open(DELIV + r"\drains_plan_px.json", "w"), indent=1)
print("total", len(recs), "-> drains_plan_px.json + drain_dots_overlay.png")

# quick-look: dots burned onto the plan for a sanity check
vis = img.copy()
for r in recs:
    c = (60, 130, 250) if r["status"] == "moisture" else (230, 90, 60)
    cv2.circle(vis, (int(r["x"]), int(r["y"])), 30, c, 4)
    cv2.putText(vis, str(r["id"]), (int(r["x"]) + 32, int(r["y"])),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 5)
    cv2.putText(vis, str(r["id"]), (int(r["x"]) + 32, int(r["y"])),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 2)
cv2.imwrite(r"C:\ASU-Survey\out\drain_detect_check.jpg",
            cv2.resize(vis, (1900, int(1900 * H / W))),
            [cv2.IMWRITE_JPEG_QUALITY, 90])
print("wrote out/drain_detect_check.jpg")
