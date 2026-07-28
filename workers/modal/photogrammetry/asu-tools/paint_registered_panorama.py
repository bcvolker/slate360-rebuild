r"""THE alignment step: paint every registered thermal frame through the DEM
into the ortho's own 3cm grid. Exact RGB<->thermal overlay by construction.

Chain per output cell: ENU(x, y, DEM z) -> MAX camera (COLMAP 6-DoF pose,
SIMPLE_RADIAL forward distortion) -> MAX px -> rig H^-1 -> IRX px -> bilinear
temp sample. Composite = per-pixel MEDIAN across overlapping frames (round-5
consensus: median master grid; moisture emphasis via display recipes only).

Output: deliverables\panorama_registered.npz
  temperatures (float32, NaN outside), count (uint8), same frame as the
  thermal v5 canvas (origin_world, gsd 0.03) == viewer deck crop.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, r"C:\s360\workers\modal\thermal-analysis")
from flir_fff_decode import decode_flir

DELIV = r"C:\ASU-Survey\deliverables"
MEDIA = Path(r"C:\ASU-Survey\102MEDIA")

z5 = np.load(DELIV + r"\mosaic_main_flight_v5.npz")
TH, TW = z5["temperatures"].shape
GSD = float(z5["gsd_m"])
t_x0, t_y0 = [float(v) for v in z5["origin_world"]]

dem_z = np.load(DELIV + r"\dem_v3.npz")
DEM = dem_z["dem"].astype(np.float32)
DX0, DY1 = [float(v) for v in dem_z["origin"]]
DG = float(dem_z["gsd_m"])
DH, DW = DEM.shape
ground_z = float(np.nanmedian(DEM))

rig = json.load(open(DELIV + r"\rig_irx_to_max.json"))
H_i2m = np.array(rig["H_irx_to_max_fullres"])
H_m2i = np.linalg.inv(H_i2m)

# camera 5 = MAX_102 (SIMPLE_RADIAL)
F, CX, CY, K = 3023.4165194323559, 2000.0, 1500.0, 0.0081244768075551237
MW, MH = 4000, 3000

# poses of registered MAX frames
poses = {}
lines = [l for l in open(DELIV + r"\reg_images.txt") if not l.startswith("#")]
for i in range(0, len(lines), 2):
    p = lines[i].split()
    if len(p) < 10 or not p[9].startswith("MAX_102/"):
        continue
    w, x, y, zz = [float(v) for v in p[1:5]]
    t = np.array([float(v) for v in p[5:8]], np.float32)
    R = np.array([
        [1-2*(y*y+zz*zz), 2*(x*y-w*zz), 2*(x*zz+w*y)],
        [2*(x*y+w*zz), 1-2*(x*x+zz*zz), 2*(y*zz-w*x)],
        [2*(x*zz-w*y), 2*(y*zz+w*x), 1-2*(x*x+y*y)]], np.float32)
    poses[p[9].split("/")[1]] = (R, t, -R.T @ t)
print("poses:", len(poses), flush=True)

# output cell ENU coordinates
xs = t_x0 + (np.arange(TW, dtype=np.float32) + 0.5) * GSD
ys = -(t_y0 + (np.arange(TH, dtype=np.float32) + 0.5) * GSD)

idx_chunks, t_chunks = [], []
n_painted = 0
for fi, (max_name, (R, t, C)) in enumerate(sorted(poses.items())):
    irx_name = max_name.replace("MAX_", "IRX_")
    if not (MEDIA / irx_name).exists():
        continue
    temps, _p, _ = decode_flir(MEDIA / irx_name)
    temps = temps.astype(np.float32)
    ih, iw = temps.shape  # 512 x 640

    # footprint bbox: IRX corners -> MAX px -> undistort(iter) -> ground plane
    ic = np.array([[0, 0, 1], [iw, 0, 1], [0, ih, 1], [iw, ih, 1]], np.float64).T
    mc = H_i2m @ ic
    mu = mc[0] / mc[2]
    mv = mc[1] / mc[2]
    xn = (mu - CX) / F
    yn = (mv - CY) / F
    for _ in range(4):  # invert radial distortion (small k)
        r2 = xn*xn + yn*yn
        xn = ((mu - CX) / F) / (1 + K*r2)
        yn = ((mv - CY) / F) / (1 + K*r2)
    dirs = (R.T @ np.stack([xn, yn, np.ones(4)])).astype(np.float32)
    s = (ground_z - C[2]) / dirs[2]
    gx, gy = C[0] + s*dirs[0], C[1] + s*dirs[1]
    M = 3.0
    ca = int(np.clip((gx.min() - M - t_x0)/GSD, 0, TW-1))
    cb = int(np.clip((gx.max() + M - t_x0)/GSD, 0, TW-1))
    ra = int(np.clip((-(gy.max() + M) - t_y0)/GSD, 0, TH-1))
    rb = int(np.clip((-(gy.min() - M) - t_y0)/GSD, 0, TH-1))
    if cb - ca < 2 or rb - ra < 2:
        continue
    X, Y = np.meshgrid(xs[ca:cb], ys[ra:rb])
    dc = np.clip(((X - DX0)/DG).astype(np.int32), 0, DW-1)
    dr = np.clip(((DY1 - Y)/DG).astype(np.int32), 0, DH-1)
    Z = np.nan_to_num(DEM[dr, dc], nan=ground_z)
    P = np.stack([X.ravel(), Y.ravel(), Z.ravel()])
    Xc = R @ P + t[:, None]
    zc = np.maximum(Xc[2], 1e-6)
    xn2, yn2 = Xc[0]/zc, Xc[1]/zc
    d = 1.0 + K*(xn2*xn2 + yn2*yn2)
    u = F*xn2*d + CX
    v = F*yn2*d + CY
    # MAX px -> IRX px
    denom = H_m2i[2, 0]*u + H_m2i[2, 1]*v + H_m2i[2, 2]
    iu = (H_m2i[0, 0]*u + H_m2i[0, 1]*v + H_m2i[0, 2]) / denom
    iv = (H_m2i[1, 0]*u + H_m2i[1, 1]*v + H_m2i[1, 2]) / denom
    ok = ((Xc[2] > 1.0) & (iu >= 0) & (iu < iw-1.001) & (iv >= 0)
          & (iv < ih-1.001))
    if not ok.any():
        continue
    iu, iv = iu[ok], iv[ok]
    x0i = iu.astype(np.int32); y0i = iv.astype(np.int32)
    fx = (iu - x0i).astype(np.float32); fy = (iv - y0i).astype(np.float32)
    tv = ((temps[y0i, x0i]*(1-fx) + temps[y0i, x0i+1]*fx) * (1-fy)
          + (temps[y0i+1, x0i]*(1-fx) + temps[y0i+1, x0i+1]*fx) * fy)
    rows, cols = np.meshgrid(np.arange(ra, rb), np.arange(ca, cb),
                             indexing="ij")
    flat = (rows.ravel().astype(np.int64)*TW + cols.ravel())[ok]
    idx_chunks.append(flat.astype(np.int64))
    t_chunks.append(((tv + 100.0) * 50.0).astype(np.uint16))  # 0.02C steps
    n_painted += 1
    if fi % 40 == 0:
        print("[%d/%d] %s samples %.1fM" % (fi, len(poses), irx_name,
              sum(len(c) for c in idx_chunks)/1e6), flush=True)

idx = np.concatenate(idx_chunks); del idx_chunks
tq = np.concatenate(t_chunks); del t_chunks
print("total samples %.1fM from %d frames" % (len(idx)/1e6, n_painted),
      flush=True)
# sort by (cell, temp) so the middle of each cell block is the median
order2 = np.lexsort((tq, idx))
idx = idx[order2]
tq = tq[order2]
del order2
starts = np.flatnonzero(np.r_[True, idx[1:] != idx[:-1]])
ends = np.r_[starts[1:], idx.size]
cells = idx[starts]
mid = starts + (ends - starts) // 2
pano = np.full(TH*TW, np.nan, np.float32)
pano[cells] = tq[mid].astype(np.float32) / 50.0 - 100.0
count = np.zeros(TH*TW, np.uint8)
count[cells] = np.minimum(ends - starts, 255)
pano = pano.reshape(TH, TW)
count = count.reshape(TH, TW)
fin = np.isfinite(pano)
print("coverage %.1f%% of canvas, median overlap %d, span %.1f..%.1f C"
      % (fin.mean()*100, np.median(count[count > 0]),
         np.nanpercentile(pano, 1), np.nanpercentile(pano, 99)), flush=True)
np.savez_compressed(DELIV + r"\panorama_registered.npz",
                    temperatures=pano, count=count, gsd_m=GSD,
                    origin_world=[t_x0, t_y0], n_frames=n_painted)
print("saved panorama_registered.npz")
