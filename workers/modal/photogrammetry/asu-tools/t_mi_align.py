r"""Mutual-information translation search -- the proper cross-modal metric for
thermal<->photo (phase correlation / ECC / edge correlation all failed). MI
measures statistical dependence, not intensity/gradient similarity, so it aligns
modalities that share STRUCTURE but not appearance. Coarse-to-fine brute search
over translation, deck-masked. Then a small rotation refine in case there's a
mild rotation too.
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
dd = cv2.imread(os.path.join(D, "deck_ortho_final_1cm.png"), cv2.IMREAD_UNCHANGED)
ddc = cv2.resize(dd[:, :, :3], (TW, TH), interpolation=cv2.INTER_AREA)
og = cv2.cvtColor(ddc, cv2.COLOR_BGR2GRAY).astype(np.float32)
Tf = np.where(fin, T, np.nan).astype(np.float32)

# downsample for speed
SC = 4
ogd = cv2.resize(og, (TW // SC, TH // SC), interpolation=cv2.INTER_AREA)
Td = cv2.resize(np.nan_to_num(Tf, nan=-999), (TW // SC, TH // SC), interpolation=cv2.INTER_NEAREST)
find = Td > -900
Hd, Wd = ogd.shape
ogd_q = np.clip((ogd - ogd[find].min()) / (np.ptp(ogd[find]) + 1e-6) * 31, 0, 31).astype(np.int32)
Td_q = np.zeros_like(ogd_q)
Td_q[find] = np.clip((Td[find] - Td[find].min()) / (np.ptp(Td[find]) + 1e-6) * 31, 0, 31).astype(np.int32)


def mi(shift_x, shift_y, ang=0.0):
    M = cv2.getRotationMatrix2D((Wd / 2, Hd / 2), ang, 1.0)
    M[0, 2] += shift_x
    M[1, 2] += shift_y
    tq = cv2.warpAffine(Td_q.astype(np.float32), M, (Wd, Hd), flags=cv2.INTER_NEAREST, borderValue=-1)
    fm = cv2.warpAffine(find.astype(np.float32), M, (Wd, Hd), flags=cv2.INTER_NEAREST) > 0.5
    m = fm & (tq >= 0)
    if m.sum() < 500:
        return -1
    a = ogd_q[m]
    b = tq[m].astype(np.int32)
    hist = np.zeros((32, 32))
    np.add.at(hist, (a, b), 1)
    pab = hist / hist.sum()
    pa = pab.sum(1, keepdims=True)
    pb = pab.sum(0, keepdims=True)
    nz = pab > 0
    return float(np.sum(pab[nz] * np.log(pab[nz] / (pa @ pb)[nz])))


# coarse search
best = (-1, 0, 0)
rng = range(-40, 41, 2)  # in downsampled px (x SC x 3cm = up to +-240cm)
for sy in rng:
    for sx in rng:
        v = mi(sx, sy)
        if v > best[0]:
            best = (v, sx, sy)
print("coarse best MI %.4f at shift (%d,%d) ds-px = (%.0f,%.0f)cm"
      % (best[0], best[1], best[2], best[1] * SC * 3, best[2] * SC * 3))

# fine search around best + rotation
bv, bx, by = best
bestf = (bv, bx, by, 0.0)
for ang in np.arange(-2, 2.1, 0.5):
    for sy in np.arange(by - 3, by + 3.1, 0.5):
        for sx in np.arange(bx - 3, bx + 3.1, 0.5):
            v = mi(sx, sy, ang)
            if v > bestf[0]:
                bestf = (v, sx, sy, ang)
bv, bx, by, bang = bestf
# convert to full-res thermal px
fx, fy = bx * SC, by * SC
print("fine best MI %.4f: shift (%.1f,%.1f)px=(%.0f,%.0f)cm rot %.1fdeg"
      % (bv, fx, fy, fx * 3, fy * 3, bang))

# apply full-res: rotate about center + translate, radiometric-safe
M = cv2.getRotationMatrix2D((TW / 2, TH / 2), bang, 1.0)
M[0, 2] += fx
M[1, 2] += fy
num = cv2.warpAffine(np.where(fin, T, 0).astype(np.float32), M, (TW, TH), borderValue=0)
den = cv2.warpAffine(fin.astype(np.float32), M, (TW, TH), borderValue=0)
Tw = np.where(den > 0.5, num / den, np.nan).astype(np.float32)
np.savez(os.path.join(D, "mosaic_v5_mi.npz"),
         temperatures=Tw, gsd_m=z["gsd_m"], origin_world=z["origin_world"])
print("wrote mosaic_v5_mi.npz drift %.3fC" % (np.nanmedian(Tw) - np.nanmedian(T)))

# edge proof
ft = np.isfinite(Tw)
tn = cv2.normalize(np.where(ft, Tw, np.nanmedian(Tw[ft])), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
te = cv2.Canny(cv2.GaussianBlur(tn, (0, 0), 1.2), 25, 70); te[~ft] = 0
oe = cv2.Canny(cv2.GaussianBlur(og.astype(np.uint8), (0, 0), 1.2), 50, 130)
vis = np.zeros((TH, TW, 3), np.uint8)
vis[oe > 0] = (255, 255, 0)
vis[cv2.dilate(te, np.ones((2, 2), np.uint8)) > 0] = (0, 0, 255)
cv2.imwrite(os.path.join(OUT, "t_mi_proof.jpg"),
            cv2.resize(vis, (1400, int(1400 * TH / TW))), [cv2.IMWRITE_JPEG_QUALITY, 92])
print("wrote t_mi_proof.jpg")
