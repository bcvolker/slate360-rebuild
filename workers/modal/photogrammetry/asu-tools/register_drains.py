r"""Register the drain plan (AE102X) to the deck ortho frame via building-mask
alignment, then map every drain dot into the frame.

The plan and ortho building clusters clearly correspond but are related by a
~90deg rotation + the ortho's tilt + a scale. So search rotation+scale, and at
each candidate use FFT phase correlation for the best translation, scoring by
mask overlap (IoU). No hand-picked tie-points -> no wrong-guess misalignment.

Coordinate bookkeeping:
  drain full-plan px (8400-wide render)
    -> plan_mask px      (* 1200/6048, plan cropped to 0.72*8400 then to 1200w)
    -> [T]  ortho_mask px
    -> frame 1cm px      (* 12135/1200)
    -> fractional frame  (/12135, /8133)
"""
import json

import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"
OUT = r"C:\ASU-Survey\out"

P = cv2.imread(OUT + r"\plan_mask.jpg", 0)
O = cv2.imread(OUT + r"\ortho_mask.jpg", 0)
P = (P > 128).astype(np.float32)
O = (O > 128).astype(np.float32)
Hc, Wc = 1400, 1600                       # common canvas
canvasP = np.zeros((Hc, Wc), np.float32)
canvasO = np.zeros((Hc, Wc), np.float32)
canvasP[:P.shape[0], :P.shape[1]] = P
canvasO[:O.shape[0], :O.shape[1]] = O

# centroid of plan content (for rotation about its own center)
ys, xs = np.nonzero(canvasP)
pcx, pcy = xs.mean(), ys.mean()
Of = np.fft.rfft2(canvasO)

best = None
for ang in range(0, 360, 2):
    for s in np.arange(0.7, 1.9, 0.06):
        M = cv2.getRotationMatrix2D((pcx, pcy), ang, s)
        Pw = cv2.warpAffine(canvasP, M, (Wc, Hc))
        if Pw.sum() < 500:
            continue
        # FFT cross-correlation -> best integer shift
        Pf = np.fft.rfft2(Pw)
        cc = np.fft.irfft2(Of * np.conj(Pf), s=(Hc, Wc))
        idx = np.unravel_index(np.argmax(cc), cc.shape)
        dy = idx[0] if idx[0] < Hc // 2 else idx[0] - Hc
        dx = idx[1] if idx[1] < Wc // 2 else idx[1] - Wc
        Ps = np.roll(np.roll(Pw, dy, 0), dx, 1)
        inter = (Ps * canvasO).sum()
        union = ((Ps + canvasO) > 0.5).sum()
        iou = inter / max(union, 1)
        if best is None or iou > best[0]:
            best = (iou, ang, s, dx, dy)

iou, ang, s, dx, dy = best
print("best IoU %.3f  ang %d  scale %.2f  shift (%d,%d)" % (iou, ang, s, dx, dy))

# full plan->frame transform as a 2x3 matrix, composed in mask space:
#   plan_mask --R(ang,s about pcx,pcy)--> --T(dx,dy)--> ortho_mask
R = cv2.getRotationMatrix2D((pcx, pcy), ang, s)
T = np.array([[1, 0, dx], [0, 1, dy]], np.float32)


def h(m):
    return np.vstack([m, [0, 0, 1]])
plan_to_ortho_mask = (h(T) @ h(R))[:2]

drains = json.load(open(DELIV + r"\drains_plan_px.json"))["drains"]
FW, FH = 12135, 8133
out = []
for d in drains:
    # full-plan px -> plan_mask px
    mx, my = d["x"] * 1200 / 6048, d["y"] * 1200 / 6048
    fx, fy = (plan_to_ortho_mask @ [mx, my, 1])
    # ortho_mask px -> frame 1cm px -> fractional
    frx, fry = fx * FW / 1200, fy * FH / 1200
    out.append({"id": d["id"], "status": d["status"],
                "fx": round(frx / FW, 5), "fy": round(fry / FH, 5)})

json.dump({"drains": out, "iou": round(float(iou), 3)},
          open(DELIV + r"\drains_frame.json", "w"), indent=1)
print("mapped", len(out), "drains -> drains_frame.json")

# proof overlay on the ortho
ortho = cv2.imread(DELIV + r"\deck_ortho_dd_filled_1cm.jpg")
vis = cv2.resize(ortho, (1600, int(1600 * FH / FW)))
for d in out:
    px, py = int(d["fx"] * 1600), int(d["fy"] * 1600 * FW / FH)
    c = (60, 130, 250) if d["status"] == "moisture" else (40, 40, 230)
    cv2.circle(vis, (px, py), 13, c, -1)
    cv2.circle(vis, (px, py), 13, (255, 255, 255), 2)
    cv2.putText(vis, str(d["id"]), (px + 14, py + 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
cv2.imwrite(OUT + r"\drains_on_ortho_check.jpg", vis, [cv2.IMWRITE_JPEG_QUALITY, 90])
print("wrote out/drains_on_ortho_check.jpg")
