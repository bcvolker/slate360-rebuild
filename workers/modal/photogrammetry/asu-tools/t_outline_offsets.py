r"""Measure the thermal->RGB offset at each building by overlaying their OUTLINES
(thermal cool-rectangle vs RGB dark-roof), so the offset is readable directly.
Then fit whatever transform the offsets imply (uniform shift vs affine).
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
bgray = cv2.cvtColor(cv2.resize(base[:, :, :3], (TW, TH), interpolation=cv2.INTER_AREA),
                     cv2.COLOR_BGR2GRAY)

deck_med = np.nanmedian(T[fin])
cool = (fin & (T < deck_med - 2.0)).astype(np.uint8)
cool = cv2.morphologyEx(cool, cv2.MORPH_OPEN, np.ones((13, 13), np.uint8))
cool = cv2.morphologyEx(cool, cv2.MORPH_CLOSE, np.ones((31, 31), np.uint8))

roof = ((bgray < 110) & (bgray > 20)).astype(np.uint8)
roof = cv2.morphologyEx(roof, cv2.MORPH_CLOSE, np.ones((31, 31), np.uint8))
roof = cv2.morphologyEx(roof, cv2.MORPH_OPEN, np.ones((25, 25), np.uint8))


def big_boxes(mask, n=2, amin=40000):
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for c in sorted(cnts, key=cv2.contourArea, reverse=True):
        if cv2.contourArea(c) < amin:
            break
        r = cv2.minAreaRect(c)
        boxes.append((r[0], r, c))  # center, rect, contour
        if len(boxes) >= n:
            break
    return boxes


tb = big_boxes(cool)
rb = big_boxes(roof)
print("thermal building centers:", [(round(c[0]), round(c[1])) for c, _, _ in tb])
print("rgb building centers:    ", [(round(c[0]), round(c[1])) for c, _, _ in rb])

# match thermal boxes to rgb boxes by nearest center (left/right)
tb.sort(key=lambda b: b[0][0])
rb.sort(key=lambda b: b[0][0])
pts_src, pts_dst = [], []
for (tc, _, _), (rc, _, _) in zip(tb, rb):
    dx, dy = rc[0] - tc[0], rc[1] - tc[1]
    print("building: thermal (%.0f,%.0f) -> rgb (%.0f,%.0f)  offset (%.0f,%.0f)px = (%.0f,%.0f)cm"
          % (tc[0], tc[1], rc[0], rc[1], dx, dy, dx * 3, dy * 3))
    pts_src.append(tc)
    pts_dst.append(rc)

vis = cv2.cvtColor(bgray, cv2.COLOR_GRAY2BGR)
for _, r, c in tb:
    cv2.drawContours(vis, [cv2.boxPoints(r).astype(int)], -1, (0, 0, 255), 4)  # thermal red
for _, r, c in rb:
    cv2.drawContours(vis, [cv2.boxPoints(r).astype(int)], -1, (255, 255, 0), 4)  # rgb cyan
cv2.putText(vis, "RED=thermal bldg   CYAN=RGB bldg", (30, 50),
            cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
cv2.imwrite(os.path.join(OUT, "t_outline_offsets.jpg"),
            cv2.resize(vis, (1500, int(1500 * TH / TW))), [cv2.IMWRITE_JPEG_QUALITY, 92])
print("wrote t_outline_offsets.jpg")
