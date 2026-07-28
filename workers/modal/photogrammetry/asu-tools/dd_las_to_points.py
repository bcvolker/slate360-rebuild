r"""Convert the DroneDeploy LAS (22.7M pts, EPSG:6405 State Plane ft, RGB) to a
compact quantized binary for the TERRAIN tab point-cloud renderer.

- pyproj EPSG:6405 -> geographic -> local topocentric ENU (the verified chain).
- z: recentered so the deck plane sits near 0 (consistent with dd_mesh.glb).
- Voxel decimation: 6cm on/near the deck window, 20cm outside -> ~2-3M points.
- Layout: uint16 x,y,z quantized over the bbox + uint8 r,g,b, stride 9 padded
  to 10 bytes (2-byte alignment for SHORTs). Meta JSON carries bbox + count.
- LAS RGB is 16-bit -> proper /257 conversion, not a cast.
"""
import json
import os

import laspy
import numpy as np
from pyproj import Transformer

SRC = r"C:\ASU-Survey\models\points.las"
D = r"C:\ASU-Survey\deliverables"
ANCHOR_LAT, ANCHOR_LON = 33.4277667, -111.9322333

f = laspy.read(SRC)
x, y, zft = np.asarray(f.x), np.asarray(f.y), np.asarray(f.z)
r16, g16, b16 = np.asarray(f.red), np.asarray(f.green), np.asarray(f.blue)
print("points:", len(x))

to_geo = Transformer.from_crs("EPSG:6405", "EPSG:4326", always_xy=True)
to_enu = Transformer.from_pipeline(
    f"+proj=pipeline +step +proj=cart +ellps=GRS80 "
    f"+step +proj=topocentric +ellps=GRS80 +lat_0={ANCHOR_LAT} +lon_0={ANCHOR_LON} +h_0=0")
lon, lat = to_geo.transform(x, y)
e, n, _ = to_enu.transform(lon, lat, np.zeros_like(lon))
u = zft * 0.3048
u -= np.median(u)          # deck-relative height
print("ENU e %.1f..%.1f  n %.1f..%.1f  u %.1f..%.1f"
      % (e.min(), e.max(), n.min(), n.max(), u.min(), u.max()))

# voxel decimation: fine on deck window, coarse outside
X0, Y0, X1, Y1 = -66.66, -70.04, 54.69, 11.29
on_deck = (e >= X0 - 10) & (e <= X1 + 10) & (n >= Y0 - 10) & (n <= Y1 + 10)


def voxel_keep(ee, nn, uu, size):
    key = (np.floor(ee / size).astype(np.int64) * 73856093
           ^ np.floor(nn / size).astype(np.int64) * 19349663
           ^ np.floor(uu / size).astype(np.int64) * 83492791)
    _, first = np.unique(key, return_index=True)
    return first


idx_deck = np.nonzero(on_deck)[0]
idx_out = np.nonzero(~on_deck)[0]
kd = idx_deck[voxel_keep(e[idx_deck], n[idx_deck], u[idx_deck], 0.06)]
ko = idx_out[voxel_keep(e[idx_out], n[idx_out], u[idx_out], 0.20)]
keep = np.concatenate([kd, ko])
print("kept: deck %d + context %d = %d" % (len(kd), len(ko), len(keep)))

e, n, u = e[keep], n[keep], u[keep]
r8 = np.clip((r16[keep].astype(np.uint32) + 128) // 257, 0, 255).astype(np.uint8)
g8 = np.clip((g16[keep].astype(np.uint32) + 128) // 257, 0, 255).astype(np.uint8)
b8 = np.clip((b16[keep].astype(np.uint32) + 128) // 257, 0, 255).astype(np.uint8)
if r16.max() <= 255:      # some LAS store 8-bit in the 16-bit fields
    r8 = r16[keep].astype(np.uint8)
    g8 = g16[keep].astype(np.uint8)
    b8 = b16[keep].astype(np.uint8)
    print("LAS color was 8-bit already")

mins = np.array([e.min(), n.min(), u.min()], np.float64)
exts = np.array([e.max() - e.min(), n.max() - n.min(), u.max() - u.min()], np.float64)
q = np.empty((len(e), 3), np.uint16)
for i, arr in enumerate([e, n, u]):
    q[:, i] = np.clip((arr - mins[i]) / exts[i] * 65535, 0, 65535).astype(np.uint16)

N = len(q)
rec = np.zeros(N, dtype=[("xyz", "<u2", 3), ("rgb", "u1", 3), ("pad", "u1")])
rec["xyz"] = q
rec["rgb"] = np.stack([r8, g8, b8], 1)
rec.tofile(os.path.join(D, "dd_points.bin"))
json.dump({"count": int(N), "stride": 10, "min": mins.tolist(), "extent": exts.tolist()},
          open(os.path.join(D, "dd_points_meta.json"), "w"))
print("WROTE dd_points.bin %.1f MB (%d pts, stride 10)" % (N * 10 / 1e6, N))
