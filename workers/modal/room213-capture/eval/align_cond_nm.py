"""Non-metric variant of align_cond.py (for SfM models with gauge 'metric 0'): level (vertical axis = the axis with least camera
spread, sign so cameras sit nearer the ceiling), prescale by floor-to-ceiling span vs the reference, then yaw x scale sweep of
floor-plan occupancy phase correlation, then trimmed similarity ICP (scale free). Usage: python align_cond_nm.py <sparse> <out.json>"""
import json, sys, numpy as np, pycolmap, cv2
from scipy.spatial import cKDTree
r = pycolmap.Reconstruction(sys.argv[1]); P = np.array([q.xyz for q in r.points3D.values() if q.error < 1.5])
Cm = np.array([i.projection_center() for i in r.images.values()])
R = np.array([q.xyz for q in pycolmap.Reconstruction("../p5/refsparse").points3D.values() if q.error < 1.5])
ax = int(np.argmin(Cm.std(0))); up = np.zeros(3); up[ax] = 1
h = (P - np.median(Cm, 0)) @ up
if np.percentile(h, 98) > -np.percentile(h, 2): up = -up; h = -h          # cameras nearer ceiling -> floor is the far side
def plane(Q, n0, it=3000, tol=None):                                        # RANSAC plane with normal within 30 deg of n0
    rng = np.random.default_rng(0); tol = tol or 0.004 * np.ptp(Q @ n0); best = (0, n0)
    for _ in range(it):
        a, b, c = Q[rng.choice(len(Q), 3, replace=False)]; n = np.cross(b - a, c - a); nn = np.linalg.norm(n)
        if nn < 1e-12: continue
        n /= nn; n = n if n @ n0 > 0 else -n
        if n @ n0 < 0.87: continue
        k = (np.abs((Q - a) @ n) < tol).sum()
        if k > best[0]: best = (k, n)
    return best
fl = P[h < np.percentile(h, 12)]; cl = P[h > np.percentile(h, 88)]
kf, nf = plane(fl, up); kc, nc = plane(cl, up); up = (nf * kf + nc * kc) / np.linalg.norm(nf * kf + nc * kc)
print("floor/ceiling plane normals", nf.round(4), nc.round(4), "angle between %.2f deg" % np.degrees(np.arccos(np.clip(nf @ nc, -1, 1))))
h = (P - np.median(Cm, 0)) @ up
e1 = np.eye(3)[(ax + 1) % 3]; e1 = e1 - (e1 @ up) * up; e1 /= np.linalg.norm(e1); e2 = np.cross(up, e1)
R0 = np.stack([e1, e2, up]); span = np.percentile(h, 98) - np.percentile(h, 2); rs = np.percentile(R[:, 2], 98) - np.percentile(R[:, 2], 2)
s0 = rs / span; t0 = -s0 * R0 @ np.median(Cm, 0); t0[2] = -s0 * np.percentile(h, 2) + np.percentile(R[:, 2], 2)
A = (s0 * (R0 @ P.T)).T + t0
def occ(Q, ext, res=0.05):
    m = (Q[:, 2] > 0.3) & (Q[:, 2] < 2.0); xy = Q[m, :2]
    H, _, _ = np.histogram2d(xy[:, 0], xy[:, 1], bins=[np.arange(ext[0], ext[1], res), np.arange(ext[2], ext[3], res)])
    return np.log1p(H).astype(np.float32)
lo, hi = np.percentile(R[:, :2], 1, 0) - 3, np.percentile(R[:, :2], 99, 0) + 3; ext = (lo[0], hi[0], lo[1], hi[1])
OR = occ(R, ext); best = None; ca = np.median(A[:, :2], 0); cr = np.array([np.median(R[:, 0]), np.median(R[:, 1]), 0])
for k in np.linspace(0.85, 1.15, 13):
    for yaw in np.radians(np.arange(0, 360, 1.0)):
        c, s = np.cos(yaw), np.sin(yaw); Rz = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
        Ar = k * ((A - [ca[0], ca[1], 0]) @ Rz.T); Ar[:, 2] = A[:, 2] * k; Ar += cr
        (dx, dy), resp = cv2.phaseCorrelate(OR, occ(Ar, ext))
        if best is None or resp > best[0]: best = (resp, yaw, dx, dy, Rz, k)
resp, yaw, dx, dy, Rz, k = best
# X = k*Rz*(A - [ca,0]) (z scaled too) + cr - d   ->  similarity on A
s, Rm = k, Rz; t = cr - k * Rz @ np.array([ca[0], ca[1], 0]) - np.array([dx * 0.05, dy * 0.05, 0])
def umeyama(X, Y):
    mx, my = X.mean(0), Y.mean(0); U, S, Vt = np.linalg.svd((Y - my).T @ (X - mx)); D = np.diag([1, 1, np.sign(np.linalg.det(U @ Vt))])
    Rr = U @ D @ Vt; sc = np.trace(np.diag(S) @ D) / ((X - mx) ** 2).sum(); return sc, Rr, my - sc * Rr @ mx
tree = cKDTree(R); log = []
for thr in [0.5, 0.3, 0.2, 0.12, 0.08, 0.05, 0.04, 0.03, 0.03]:
    d, idx = tree.query((s * (Rm @ A.T)).T + t, k=1); sel = d < thr
    if sel.sum() < 1000: break
    s, Rm, t = umeyama(A[sel], R[idx[sel]]); log.append({"thr": thr, "n": int(sel.sum()), "median_d": float(np.median(d[sel]))})
# compose: X_ref = s Rm (s0 R0 P + t0) + t
S_ = s * s0; R_ = Rm @ R0; T_ = s * Rm @ t0 + t
g = json.load(open("../p5/golden_to_ref_similarity.json")); sg, Rg, tg = g["s"], np.array(g["R"]), np.array(g["t"])
out = {"prelevel": {"up_axis": ax, "s0": float(s0)}, "coarse": {"yaw_deg": float(np.degrees(yaw)), "k": float(k), "phase_resp": float(resp)}, "icp": log,
       "cond_to_ref": {"s": float(S_), "R": R_.tolist(), "t": T_.tolist()},
       "cond_to_golden": {"s": float(S_ / sg), "R": (Rg.T @ R_).tolist(), "t": (Rg.T @ (T_ - tg) / sg).tolist()}}
json.dump(out, open(sys.argv[2], "w"), indent=1); print(json.dumps({k_: out[k_] for k_ in ("prelevel", "coarse", "icp")}, indent=0), "total scale", S_)
