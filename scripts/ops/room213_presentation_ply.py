"""Derive the Room 213 PRESENTATION PLY from the golden PLY (golden is only read, never modified).

Removal sets (Gaussian indices into the golden file; union is deduplicated and sorted):
  tier1_exterior  centre outside the room shell + 1.0 (already hidden by the viewer crop in every mode)
  perimeter       centre kept by the Dollhouse crop (walls + 0.2) but the 2-sigma ellipsoid extent overshoots
                  the wall planes (x/z) by more than --overshoot: the long faint streaks fanning out of the
                  walls, which no centre-based crop can remove without deleting the walls themselves
  extra lists     optional .npy index lists (e.g. visually approved tier-2 floaters), --extra name=path

Retained records are copied byte-for-byte (no decode/re-encode). Writes <out>/<name>.ply,
<name>.removed.npy and <name>.json (hashes, per-set counts, overlaps, parameters). With --complement SET the
removed SET is also written as <name>-SET.ply (byte-identical rows): the viewer shows it only in Walk, where those
faint wall splats carry real interior appearance, so Walk renders golden-minus-exterior exactly.

Usage: python scripts/ops/room213_presentation_ply.py golden.ply out_dir name [--overshoot 0.25] [--extra k=path.npy ...]
"""
import argparse, hashlib, json
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("golden"); ap.add_argument("out"); ap.add_argument("name")
ap.add_argument("--overshoot", type=float, default=0.25)
ap.add_argument("--extra", action="append", default=[])
ap.add_argument("--complement", action="append", default=[],
                help="removal set(s) to ALSO write as a separate complement PLY (e.g. perimeter: shown only in Walk)")
a = ap.parse_args()

QUAT = (0.0228, 0.0, 0.00017, 0.99974)
ROOM_LO = np.array([-6.21, -1.81, -3.69]); ROOM_HI = np.array([4.97, 0.67, 4.39])  # V frame, presentation-data.json
GOLDEN_SHA = "7e7b5d18af92d5f4b751977d6d96f2251b896c46f1dbb37d356eed3dd0823a62"

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 22), b""): h.update(b)
    return h.hexdigest()

def rot(q):
    x, y, z, w = np.array(q) / np.linalg.norm(q)
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])

assert sha256(a.golden) == GOLDEN_SHA, "input is not the golden Room 213 PLY"
with open(a.golden, "rb") as f:
    hdr = b""
    while True:
        l = f.readline(); hdr += l
        if l.strip() == b"end_header": break
    body_offset = f.tell()
props = [l.split()[-1].decode() for l in hdr.splitlines() if l.startswith(b"property")]
assert all(l.split()[1] == b"float" for l in hdr.splitlines() if l.startswith(b"property")), "expects float properties"
n = int([l for l in hdr.splitlines() if l.startswith(b"element vertex")][0].split()[-1])
dt = np.dtype([(p, "<f4") for p in props])
d = np.fromfile(a.golden, dtype=dt, count=n, offset=body_offset)

M = rot(QUAT) @ np.diag([1.0, -1.0, -1.0])
V = np.stack([d["x"], d["y"], d["z"]], 1).astype(np.float64) @ M.T
qw, qx, qy, qz = (d[f"rot_{i}"].astype(np.float64) for i in range(4))
nq = np.sqrt(qw*qw + qx*qx + qy*qy + qz*qz); qw, qx, qy, qz = qw/nq, qx/nq, qy/nq, qz/nq
R = np.stack([np.stack([1-2*(qy*qy+qz*qz), 2*(qx*qy-qz*qw), 2*(qx*qz+qy*qw)], -1),
              np.stack([2*(qx*qy+qz*qw), 1-2*(qx*qx+qz*qz), 2*(qy*qz-qx*qw)], -1),
              np.stack([2*(qx*qz-qy*qw), 2*(qy*qz+qx*qw), 1-2*(qx*qx+qy*qy)], -1)], 1)
s = np.exp(np.stack([d["scale_0"], d["scale_1"], d["scale_2"]], 1).astype(np.float64))
ext = 2 * np.sqrt(np.einsum("nij,nj->ni", np.einsum("ij,njk->nik", M, R) ** 2, s ** 2))

sets = {}
sets["tier1_exterior"] = ((V < ROOM_LO - 1.0) | (V > ROOM_HI + 1.0)).any(1)
margin = np.array([0.2, 1.0, 0.2])
kept_dollhouse = ((V >= ROOM_LO - margin) & (V <= ROOM_HI + margin)).all(1)
overshoot = np.maximum(np.maximum((V + ext) - ROOM_HI, ROOM_LO - (V - ext)), 0)[:, [0, 2]].max(1)
sets["perimeter"] = kept_dollhouse & (overshoot > a.overshoot)
for e in a.extra:
    k, path = e.split("=", 1)
    m = np.zeros(n, bool); m[np.load(path)] = True; sets[k] = m

removed = np.zeros(n, bool)
for m in sets.values(): removed |= m
removed_idx = np.nonzero(removed)[0].astype(np.int32)
overlaps = {f"{i}&{j}": int((sets[i] & sets[j]).sum()) for i in sets for j in sets if i < j}

out_ply = f"{a.out}/{a.name}.ply"
keep = ~removed
new_hdr = hdr.replace(f"element vertex {n}".encode(), f"element vertex {int(keep.sum())}".encode())
with open(out_ply, "wb") as f:
    f.write(new_hdr)
    f.write(d[keep].tobytes())  # raw rows, byte-identical to the golden records
np.save(f"{a.out}/{a.name}.removed.npy", removed_idx)
complements = {}
for k in a.complement:
    m = sets[k]
    path = f"{a.out}/{a.name}-{k}.ply"
    comp_hdr = hdr.replace(f"element vertex {n}".encode(), f"element vertex {int(m.sum())}".encode())
    with open(path, "wb") as f:
        f.write(comp_hdr)
        f.write(d[m].tobytes())
    np.save(f"{a.out}/{a.name}-{k}.idx.npy", np.nonzero(m)[0].astype(np.int32))
    complements[k] = {"file": f"{a.name}-{k}.ply", "sha256": sha256(path), "splats": int(m.sum()), "bytes": int(len(comp_hdr) + m.sum() * dt.itemsize)}
info = {"name": a.name, "golden_sha256": GOLDEN_SHA, "output_sha256": sha256(out_ply), "output_bytes": int(len(new_hdr) + keep.sum() * dt.itemsize),
        "before": n, "removed": int(removed.sum()), "after": int(keep.sum()), "sets": {k: int(v.sum()) for k, v in sets.items()},
        "overlaps": overlaps, "complements": complements, "params": {"overshoot": a.overshoot, "room_V": [ROOM_LO.tolist(), ROOM_HI.tolist()], "wall_margin": 0.2, "extent": "2-sigma along V axes", "extra": a.extra},
        "edit_version": "room213-presentation-v1"}
json.dump(info, open(f"{a.out}/{a.name}.json", "w"), indent=1)
print(json.dumps(info, indent=1))
