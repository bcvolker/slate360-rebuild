r"""M2 verify + finalize: confirm the lossless placement aligns to the proven
base (sign check), then produce the final map source. The new lossless flight
covers ~95% of the frame (same southern gap as before), so fill the remaining
fringe from the prior merged base (lossy fill in a <5% fringe is fine; the deck
itself is all lossless new pixels).
"""
import os

import cv2
import numpy as np

D = r"C:\ASU-Survey\deliverables"

new = cv2.imread(os.path.join(D, "deck_ortho_lossless_placed_1cm.png"), cv2.IMREAD_UNCHANGED)
ref = cv2.imread(os.path.join(D, "deck_ortho_merged_1cm.png"), cv2.IMREAD_UNCHANGED)
H, W = new.shape[:2]

gn = cv2.cvtColor(new[:, :, :3], cv2.COLOR_BGR2GRAY).astype(np.float32)
gr = cv2.cvtColor(ref[:, :, :3], cv2.COLOR_BGR2GRAY).astype(np.float32)
an = new[:, :, 3] > 0
TS = 200
recs = []
for gy in range(0, H - TS, TS):
    for gx in range(0, W - TS, TS):
        if an[gy:gy + TS, gx:gx + TS].mean() < 0.98:
            continue
        a = gr[gy:gy + TS, gx:gx + TS]
        b = gn[gy:gy + TS, gx:gx + TS]
        if a.std() < 12 or b.std() < 12:
            continue
        win = cv2.createHanningWindow((TS, TS), cv2.CV_32F)
        (dx, dy), resp = cv2.phaseCorrelate(a, b, win)
        if resp < 0.15:
            continue
        recs.append((dx, dy))
recs = np.array(recs)
mag = np.hypot(recs[:, 0], recs[:, 1])
print("lossless vs proven base: %d cells, residual median %.2f cm p90 %.2f cm  bias dx,dy %.2f,%.2f"
      % (len(recs), np.median(mag), np.percentile(mag, 90),
         np.median(recs[:, 0]), np.median(recs[:, 1])))

# fill fringe from prior base
a3 = (an.astype(np.float32))[..., None]
filled = (new[:, :, :3].astype(np.float32) * a3
          + ref[:, :, :3].astype(np.float32) * (1 - a3)).astype(np.uint8)
out = cv2.cvtColor(filled, cv2.COLOR_BGR2BGRA)
out[:, :, 3] = ((an | (ref[:, :, 3] > 0)).astype(np.uint8)) * 255
cv2.imwrite(os.path.join(D, "deck_ortho_final_1cm.png"), out, [cv2.IMWRITE_PNG_COMPRESSION, 3])
print("wrote deck_ortho_final_1cm.png  coverage %.1f%%" % (100 * (out[:, :, 3] > 0).mean()))
