"""Align a new-capture condition's SfM (metric, gravity-up, ground z=0) to the OFFICIAL reference SfM (same conventions):
coarse yaw + xy by floor-plan occupancy correlation, then trimmed similarity ICP on sparse points. Writes cond->ref and
cond->golden similarities (golden via the verified golden->ref fit). Usage: python align_cond.py <sparse dir> <out.json>"""
import json, sys, numpy as np, pycolmap, cv2
from scipy.spatial import cKDTree
def pts(p, maxe=1.5):
    r = pycolmap.Reconstruction(p); return np.array([q.xyz for q in r.points3D.values() if q.error < maxe])
A = pts(sys.argv[1]); R = pts("../p5/refsparse")
def occ(P, ext, res=0.05):
    m = (P[:, 2] > 0.3) & (P[:, 2] < 2.0); xy = P[m, :2]
    H, _, _ = np.histogram2d(xy[:, 0], xy[:, 1], bins=[np.arange(ext[0], ext[1], res), np.arange(ext[2], ext[3], res)])
    return np.log1p(H).astype(np.float32)
lo, hi = np.percentile(R[:, :2], 1, 0) - 3, np.percentile(R[:, :2], 99, 0) + 3; ext = (lo[0], hi[0], lo[1], hi[1])
OR = occ(R, ext); best = None
ca = np.median(A[:, :2], 0)
for yaw in np.radians(np.arange(0, 360, 1.0)):
    c, s = np.cos(yaw), np.sin(yaw); Rz = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
    Ar = (A - [ca[0], ca[1], 0]) @ Rz.T + [np.median(R[:, 0]), np.median(R[:, 1]), 0]
    OA = occ(Ar, ext)
    (dx, dy), resp = cv2.phaseCorrelate(OR, OA)
    if best is None or resp > best[0]: best = (resp, yaw, dx, dy, Rz)
resp, yaw, dx, dy, Rz = best
t0 = np.array([np.median(R[:, 0]), np.median(R[:, 1]), 0]) - Rz @ np.array([ca[0], ca[1], 0]) - np.array([dx * 0.05, dy * 0.05, 0])
s, Rm, t = 1.0, Rz, t0
def umeyama(X, Y):
    mx, my = X.mean(0), Y.mean(0); U, S, Vt = np.linalg.svd((Y - my).T @ (X - mx)); D = np.diag([1, 1, np.sign(np.linalg.det(U @ Vt))])
    Rr = U @ D @ Vt; sc = np.trace(np.diag(S) @ D) / ((X - mx) ** 2).sum(); return sc, Rr, my - sc * Rr @ mx
tree = cKDTree(R); log = []
for thr in [0.5, 0.3, 0.2, 0.12, 0.08, 0.05, 0.04, 0.03, 0.03]:
    d, idx = tree.query((s * (Rm @ A.T)).T + t, k=1); sel = d < thr
    if sel.sum() < 1000: break
    s, Rm, t = umeyama(A[sel], R[idx[sel]]); log.append({"thr": thr, "n": int(sel.sum()), "median_d": float(np.median(d[sel]))})
g = json.load(open("../p5/golden_to_ref_similarity.json")); sg, Rg, tg = g["s"], np.array(g["R"]), np.array(g["t"])
# cond -> golden: X_g = (1/sg) Rg^T (X_ref - tg), X_ref = s Rm X_c + t
Sc = s / sg; Rc = Rg.T @ Rm; tc = Rg.T @ (t - tg) / sg
out = {"coarse": {"yaw_deg": float(np.degrees(yaw)), "phase_resp": float(resp)}, "icp": log,
       "cond_to_ref": {"s": float(s), "R": Rm.tolist(), "t": t.tolist()}, "cond_to_golden": {"s": float(Sc), "R": Rc.tolist(), "t": tc.tolist()}}
json.dump(out, open(sys.argv[2], "w"), indent=1); print(json.dumps({k: out[k] for k in ("coarse", "icp")}, indent=0), "scale", s)
