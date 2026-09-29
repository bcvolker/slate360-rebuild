"""GOLDEN vs G1 Gaussian-distribution comparison (diagnostic only). Frame = COLMAP sparse/0 world (scene transform identity).
Room shell from geom.json (up, wall axes) + solved planes. Usage: python gauss_compare.py golden.ply g1.ply out.json [pts_uvh.npy]"""
import json, sys
import numpy as np
from scipy.spatial import cKDTree

G = json.load(open("geom.json")); c0, up, a1, a2 = (np.array(G[k]) for k in ("c0", "up", "a1", "a2"))
FLOOR, CEIL = -1.866, 0.638
WALLS = {"u_lo": (a1, -5.2), "u_hi": (a1, 6.12), "v_lo": (a2, -3.9), "v_hi": (a2, 4.42)}   # plane: coord = value; room side toward 0
SH_C0 = 0.28209479177387814


def read_ply(p):
    with open(p, "rb") as f:
        hdr = b""
        while not hdr.endswith(b"end_header\n"): hdr += f.readline()
        props = [l.split()[-1].decode() for l in hdr.splitlines() if l.startswith(b"property")]
        n = int([l for l in hdr.splitlines() if l.startswith(b"element vertex")][0].split()[-1])
        a = np.frombuffer(f.read(n * 4 * len(props)), dtype=np.float32).reshape(n, len(props))
    return {k: a[:, i] for i, k in enumerate(props)}


def stats(p, pts=None):
    X = np.stack([p["x"], p["y"], p["z"]], 1).astype(np.float64)
    s = np.exp(np.stack([p["scale_0"], p["scale_1"], p["scale_2"]], 1)); ss = np.sort(s, 1)
    op = 1 / (1 + np.exp(-p["opacity"])); rgb = np.clip(0.5 + SH_C0 * np.stack([p["f_dc_0"], p["f_dc_1"], p["f_dc_2"]], 1), 0, 1)
    lum = rgb @ [0.2126, 0.7152, 0.0722]
    h = (X - c0) @ up; u = (X - c0) @ a1; v = (X - c0) @ a2
    q = lambda x, w=None: {k: float(np.percentile(x, k2)) for k, k2 in (("p10", 10), ("p50", 50), ("p90", 90), ("p99", 99))}
    inroom = (u > -5.2) & (u < 6.12) & (v > -3.9) & (v < 4.42) & (h > FLOOR) & (h < CEIL)
    out = {"n": int(len(X)), "n_in_room_box": int(inroom.sum()),
           "scale_max": q(ss[:, 2]), "scale_min": q(ss[:, 0]), "anisotropy_max_over_min": q(ss[:, 2] / np.maximum(ss[:, 0], 1e-9)),
           "flatness_mid_over_min": q(ss[:, 1] / np.maximum(ss[:, 0], 1e-9)), "opacity": q(op),
           "opacity_frac_gt_0.9": float((op > 0.9).mean()), "opacity_frac_lt_0.1": float((op < 0.1).mean())}
    surf = {}
    lateral = lambda: (h > FLOOR + 0.15) & (h < CEIL - 0.15)
    planes = {"floor": (h - FLOOR, (u > -5.0) & (u < 5.9) & (v > -3.7) & (v < 4.2)),
              "ceiling": (CEIL - h, (u > -5.0) & (u < 5.9) & (v > -3.7) & (v < 4.2))}
    for k, (ax, val) in WALLS.items():
        crd = (X - c0) @ ax; d = (val - crd) if val > 0 else (crd - val)          # >0 = inside the room
        other = v if ax is a1 else u; lim = (-3.7, 4.2) if ax is a1 else (-5.0, 5.9)
        planes[k] = (d, lateral() & (other > lim[0]) & (other < lim[1]))
    for k, (d, sel) in planes.items():
        band = sel & (np.abs(d) < 0.3)
        if band.sum() < 100: continue
        w = op[band]; dd = d[band]; sb = ss[band]; lb = lum[band]
        front = np.abs(dd) < 0.03; behind = dd < -0.03; near = np.abs(dd) < 0.1
        # normal of each splat's thinnest axis vs the plane normal (surface alignment)
        surf[k] = {"n_band_0.3": int(band.sum()), "opacity_mass_band": float(w.sum()),
                   "thickness_opw_std_within_0.1": float(np.sqrt(np.average(dd[near] ** 2, weights=w[near]))) if near.any() else None,
                   "opacity_mass_frac_behind_0.03": float(w[behind].sum() / w.sum()),
                   "opacity_mass_frac_front_0.03": float(w[front].sum() / w.sum()),
                   "lum_front_opw": float(np.average(lb[front], weights=w[front])) if front.any() else None,
                   "lum_behind_opw": float(np.average(lb[behind], weights=w[behind])) if behind.any() else None,
                   "large_splats_scale_gt_0.05_within_0.1": int((near & (sb[:, 2] > 0.05)).sum()),
                   "large_splats_lum_mean": float(lb[near & (sb[:, 2] > 0.05)].mean()) if (near & (sb[:, 2] > 0.05)).any() else None,
                   "scale_max_p50_within_0.1": float(np.median(sb[near][:, 2])) if near.any() else None,
                   "flatness_p50_within_0.1": float(np.median(sb[near][:, 1] / np.maximum(sb[near][:, 0], 1e-9))) if near.any() else None}
    out["surfaces"] = surf
    if pts is not None:
        tree = cKDTree(pts); free = inroom & (h > FLOOR + 0.25) & (h < CEIL - 0.25) & (u > -4.8) & (u < 5.7) & (v > -3.5) & (v < 4.0)
        dist, _ = tree.query(X[free], k=1)
        out["floaters"] = {"n_free_space_candidates": int(free.sum()),
                           "n_op_gt_0.2_dist_gt_0.3": int(((dist > 0.3) & (op[free] > 0.2)).sum()),
                           "n_op_gt_0.2_dist_gt_0.5": int(((dist > 0.5) & (op[free] > 0.2)).sum())}
    return out


if __name__ == "__main__":
    pts = None
    if len(sys.argv) > 4:
        import pycolmap
        pts = np.array([p.xyz for p in pycolmap.Reconstruction(sys.argv[4]).points3D.values()])
    res = {}
    for tag, path in (("golden", sys.argv[1]), ("g1", sys.argv[2])):
        if path != "-": res[tag] = stats(read_ply(path), pts)
    json.dump(res, open(sys.argv[3], "w"), indent=1)
    print(json.dumps(res, indent=1)[:3000])
