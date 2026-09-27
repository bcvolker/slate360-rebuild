"""Room 213 presentation data (deterministic, read-only on the golden PLY).

Frames
  F  file frame: the PLY's own coordinates (golden sha256 below). Pins are stored here.
  V  viewer/room frame: V = R_corr * FLIP * F, FLIP = diag(1,-1,-1) (the viewer's pi-about-x mesh
     rotation) and R_corr = the manifest correction_quaternion (levelling, ~2.6 deg about x).
     y up, walls axis-aligned. Crop boxes, walkable area and cameras are defined in V.
All inclusion tests use Gaussian CENTRES (Spark's SDF edits are evaluated at splat centres too).

Usage: python scripts/ops/room213_presentation_data.py <golden.ply> <out_dir>
"""
import hashlib, json, sys
import numpy as np

PLY, OUT = sys.argv[1], sys.argv[2]
QUAT = (0.0228, 0.0, 0.00017, 0.99974)  # manifest correction_quaternion (x, y, z, w)

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 22), b""):
            h.update(b)
    return h.hexdigest()

def load(path):
    f = open(path, "rb"); hdr = b""
    while True:
        l = f.readline(); hdr += l
        if l.strip() == b"end_header": break
    props = [l.split()[-1].decode() for l in hdr.splitlines() if l.startswith(b"property")]
    n = int([l for l in hdr.splitlines() if l.startswith(b"element vertex")][0].split()[-1])
    return np.fromfile(f, dtype=np.dtype([(p, "<f4") for p in props]), count=n)

def rot(q):
    x, y, z, w = np.array(q) / np.linalg.norm(q)
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                     [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                     [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])

d = load(PLY)
F = np.stack([d["x"], d["y"], d["z"]], 1).astype(np.float64)
V = (F * np.array([1.0, -1.0, -1.0])) @ rot(QUAT).T
op = 1 / (1 + np.exp(-d["opacity"].astype(np.float64)))
smax = np.exp(np.stack([d["scale_0"], d["scale_1"], d["scale_2"]], 1).astype(np.float64)).max(1)
x, y, z = V.T

def peak(v, mask, lo, hi, step=0.02):
    h, e = np.histogram(v[mask], bins=np.arange(lo, hi, step)); c = (e[:-1] + e[1:]) / 2
    return float(round(c[np.argmax(h)], 3))

dense = op > 0.3
mid = dense & (y > -1.6) & (y < 0.3)
walls = {"x_min": peak(x, mid, -7, -5), "x_max": peak(x, mid, 4, 6),
         "z_min": peak(z, mid, -5, -3), "z_max": peak(z, mid, 3.5, 5.5)}
inner = dense & (x > walls["x_min"] + 0.5) & (x < walls["x_max"] - 0.5) & (z > walls["z_min"] + 0.5) & (z < walls["z_max"] - 0.5)
floor = peak(y, inner, -2.4, -1.5)
ceiling = peak(y, inner, 0.2, 1.2)
room = {"min": [walls["x_min"], floor, walls["z_min"]], "max": [walls["x_max"], ceiling, walls["z_max"]]}

def outside(lo, hi):
    return ((V < np.array(lo)) | (V > np.array(hi))).any(1)

lo, hi = np.array(room["min"]), np.array(room["max"])
t1 = outside(lo - 1.0, hi + 1.0)
t035 = outside(lo - 0.35, hi + 0.35)
counts = {"N": int(len(V)), "outside_room_plus_1.0": int(t1.sum()), "outside_room_plus_0.35": int(t035.sum()),
          "shell_0.35_to_1.0": int((t035 & ~t1).sum())}

# Walkable grid (UX aid, not survey geometry): floor cells inside the walls with no dense splats in the
# obstacle band (knee to above table height), dilated by a body radius.
CELL = 0.1
gx0, gz0 = walls["x_min"], walls["z_min"]
nx = int(np.ceil((walls["x_max"] - gx0) / CELL)); nz = int(np.ceil((walls["z_max"] - gz0) / CELL))
band = dense & (y > floor + 0.25) & (y < floor + 1.15)
ix = np.floor((x[band] - gx0) / CELL).astype(int); iz = np.floor((z[band] - gz0) / CELL).astype(int)
ok = (ix >= 0) & (ix < nx) & (iz >= 0) & (iz < nz)
occ = np.zeros((nz, nx), np.int32); np.add.at(occ, (iz[ok], ix[ok]), 1)
blocked = occ >= 4  # table tops are smooth and sparsely splatted; chairs dominate the density

def dilate(mask, r):
    pad = np.pad(mask, r); out = np.zeros_like(mask)
    for dz in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dz * dz <= r * r:
                out |= pad[r + dz:r + dz + mask.shape[0], r + dx:r + dx + mask.shape[1]]
    return out

def erode(mask, r):
    return ~dilate(~mask, r)

furniture = erode(dilate(blocked, 2), 2)  # closing: merge each table + its chairs into one footprint
walk = ~dilate(furniture, 3)  # 0.3 unit body radius
WALL_INSET = 4  # 0.4 unit from each wall
walk[:WALL_INSET, :] = walk[-WALL_INSET:, :] = False; walk[:, :WALL_INSET] = walk[:, -WALL_INSET:] = False

# Furniture footprints (connected components of the closed obstacle mask), for pin anchoring and review.
labels = np.zeros((nz, nx), np.int32); cur = 0; rows = []
for sz in range(nz):
    for sx in range(nx):
        if furniture[sz, sx] and not labels[sz, sx]:
            cur += 1; stack = [(sz, sx)]; labels[sz, sx] = cur; cells = []
            while stack:
                cz, cx = stack.pop(); cells.append((cz, cx))
                for dz, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    a, b = cz + dz, cx + dx
                    if 0 <= a < nz and 0 <= b < nx and furniture[a, b] and not labels[a, b]:
                        labels[a, b] = cur; stack.append((a, b))
            if len(cells) >= 40:
                cz = np.array([c[0] for c in cells]); cx = np.array([c[1] for c in cells])
                rows.append({"cells": len(cells), "x": [round(gx0 + cx.min() * CELL, 2), round(gx0 + (cx.max() + 1) * CELL, 2)],
                             "z": [round(gz0 + cz.min() * CELL, 2), round(gz0 + (cz.max() + 1) * CELL, 2)]})

bits = np.packbits(walk.astype(np.uint8).ravel())
import base64
out = {"golden_sha256": sha256(PLY), "correction_quaternion": QUAT, "frame_note": __doc__.split("Usage")[0].strip(),
       "room_V": room, "walls_V": walls, "counts_centres": counts,
       "walk_grid": {"x0": gx0, "z0": gz0, "cell": CELL, "nx": nx, "nz": nz, "floor_y": floor,
                     "bits_b64": base64.b64encode(bits.tobytes()).decode(), "walkable_cells": int(walk.sum())},
       "table_blobs_V": sorted(rows, key=lambda r: (r["z"][0], r["x"][0]))}
json.dump(out, open(OUT + "/room213-presentation-data.json", "w"), indent=1)
np.save(OUT + "/tier1_outside_room_plus_1.0_idx.npy", np.nonzero(t1)[0].astype(np.int32))
print(json.dumps({k: out[k] for k in ("golden_sha256", "room_V", "walls_V", "counts_centres")}, indent=1))
print("walkable", out["walk_grid"]["walkable_cells"], "of", nx * nz, "| table blobs", len(rows))
for r in out["table_blobs_V"]: print("  blob", r)
