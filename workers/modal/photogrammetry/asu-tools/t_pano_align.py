r"""Phase 1: align the CLEAN 100ft-only thermal (panorama_registered.npz, built
from 102MEDIA via DEM projection -- no yellow blotch, no near-ground frames) to
the DroneDeploy map. MI global (translation+rotation) which is the only
cross-modal method that worked. Verify with EDGE overlays before AND after
(blends hid errors for days -- edges do not).
"""
import os

import cv2
import numpy as np

D = r"C:\ASU-Survey\deliverables"
OUT = r"C:\ASU-Survey\out"

z = np.load(os.path.join(D, "panorama_registered.npz"))
T = z["temperatures"].astype(np.float32)
TH, TW = T.shape
fin = np.isfinite(T)
dd = cv2.imread(os.path.join(D, "deck_ortho_final_1cm.png"), cv2.IMREAD_UNCHANGED)
ddc = cv2.resize(dd[:, :, :3], (TW, TH), interpolation=cv2.INTER_AREA)
og = cv2.cvtColor(ddc, cv2.COLOR_BGR2GRAY).astype(np.float32)


def edge_overlay(Tarr, name):
    f = np.isfinite(Tarr)
    tn = cv2.normalize(np.where(f, Tarr, np.nanmedian(Tarr[f])), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    te = cv2.Canny(cv2.GaussianBlur(tn, (0, 0), 1.2), 25, 70); te[~f] = 0
    oe = cv2.Canny(cv2.GaussianBlur(og.astype(np.uint8), (0, 0), 1.2), 50, 130)
    vis = np.zeros((TH, TW, 3), np.uint8)
    vis[oe > 0] = (255, 255, 0)
    vis[cv2.dilate(te, np.ones((2, 2), np.uint8)) > 0] = (0, 0, 255)
    cv2.imwrite(os.path.join(OUT, name), cv2.resize(vis, (1400, int(1400 * TH / TW))), [cv2.IMWRITE_JPEG_QUALITY, 92])


edge_overlay(T, "pano_edges_before.jpg")

# --- MI translation+rotation search ---
SC = 4
ogd = cv2.resize(og, (TW // SC, TH // SC), interpolation=cv2.INTER_AREA)
Td = cv2.resize(np.where(fin, T, -999).astype(np.float32), (TW // SC, TH // SC), interpolation=cv2.INTER_NEAREST)
find = Td > -900
Hd, Wd = ogd.shape
ogq = np.clip((ogd - ogd[find].min()) / (np.ptp(ogd[find]) + 1e-6) * 31, 0, 31).astype(np.int32)
Tq = np.zeros_like(ogq)
Tq[find] = np.clip((Td[find] - Td[find].min()) / (np.ptp(Td[find]) + 1e-6) * 31, 0, 31).astype(np.int32)


def mi(sx, sy, ang=0.0):
    M = cv2.getRotationMatrix2D((Wd / 2, Hd / 2), ang, 1.0); M[0, 2] += sx; M[1, 2] += sy
    tq = cv2.warpAffine(Tq.astype(np.float32), M, (Wd, Hd), flags=cv2.INTER_NEAREST, borderValue=-1)
    fm = cv2.warpAffine(find.astype(np.float32), M, (Wd, Hd), flags=cv2.INTER_NEAREST) > 0.5
    m = fm & (tq >= 0)
    if m.sum() < 500:
        return -1
    a = ogq[m]; b = tq[m].astype(np.int32)
    h = np.zeros((32, 32)); np.add.at(h, (a, b), 1); pab = h / h.sum()
    pa = pab.sum(1, keepdims=True); pb = pab.sum(0, keepdims=True); nz = pab > 0
    return float(np.sum(pab[nz] * np.log(pab[nz] / (pa @ pb)[nz])))


best = (-1, 0, 0)
for sy in range(-40, 41, 2):
    for sx in range(-40, 41, 2):
        v = mi(sx, sy)
        if v > best[0]:
            best = (v, sx, sy)
bv, bx, by = best
bestf = (bv, bx, by, 0.0)
for ang in np.arange(-2, 2.1, 0.5):
    for sy in np.arange(by - 3, by + 3.1, 0.5):
        for sx in np.arange(bx - 3, bx + 3.1, 0.5):
            v = mi(sx, sy, ang)
            if v > bestf[0]:
                bestf = (v, sx, sy, ang)
bv, bx, by, bang = bestf
fx, fy = bx * SC, by * SC
print("MI %.4f: shift (%.1f,%.1f)px=(%.0f,%.0f)cm rot %.1fdeg" % (bv, fx, fy, fx * 3, fy * 3, bang))

M = cv2.getRotationMatrix2D((TW / 2, TH / 2), bang, 1.0); M[0, 2] += fx; M[1, 2] += fy
num = cv2.warpAffine(np.where(fin, T, 0).astype(np.float32), M, (TW, TH), borderValue=0)
den = cv2.warpAffine(fin.astype(np.float32), M, (TW, TH), borderValue=0)
Tw = np.where(den > 0.5, num / den, np.nan).astype(np.float32)
np.savez(os.path.join(D, "thermal_final.npz"), temperatures=Tw, gsd_m=z["gsd_m"], origin_world=z["origin_world"])
print("wrote thermal_final.npz drift %.3fC" % (np.nanmedian(Tw) - np.nanmedian(T)))
edge_overlay(Tw, "pano_edges_after.jpg")
print("wrote pano_edges_before/after.jpg")
