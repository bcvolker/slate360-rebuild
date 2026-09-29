"""Recompute golden->reference similarity exactly as ref_render.align_and_render_v2 (pairs seed + trimmed ICP) and write
Spark pose files: poses_official.json (12 locked views + 4 walk poses in the REFERENCE frame) and poses_goldwalk.json."""
import json, re, sys, numpy as np, pycolmap
from scipy.spatial import cKDTree
sys.path.insert(0, "C:/s360-spirula-harden/workers/modal/room213-ref")
DD = "../dd"
gold = pycolmap.Reconstruction("../p1/fc_sparse"); ref = pycolmap.Reconstruction("refsparse")
print(gold.summary()[:120], ref.num_images(), ref.num_points3D())
demux = json.load(open("../p3/demux.json")); FPS = 30000 / 1001
STABLE = {1: (3.0, 17.0), 2: (23.0, 35.5), 3: (42.0, 52.5)}
exps = sorted({f"{d['video']}@{d['t']:.3f}" for d in demux}, key=lambda e: (e.split("@")[0], float(e.split("@")[1]))); rank = {e: i for i, e in enumerate(exps)}
gname = {(d["video"][:-5], d["lens"], d["t"], d.get("placement")): f"camera{d['lens'] + 1}/frame_{rank[f'{d['video']}@{d['t']:.3f}']:05d}" for d in demux}
gpose = {im.name.replace("_test", "")[:-4]: (np.asarray(im.cam_from_world().rotation.matrix()), np.asarray(im.cam_from_world().translation)) for im in gold.images.values()}
rpose = {}
for im in ref.images.values():
    m = re.match(r"(.+)/cam(\d)/(\d+)\.jpg", im.name)
    if m: rpose[(m[1], int(m[2]), int(m[3]))] = (np.asarray(im.cam_from_world().rotation.matrix()), np.asarray(im.cam_from_world().translation))
def umeyama(A, B):
    ma, mb = A.mean(0), B.mean(0); X, Y = A - ma, B - mb
    U, S, Vt = np.linalg.svd(Y.T @ X); D = np.diag([1, 1, np.sign(np.linalg.det(U @ Vt))]); Rm = U @ D @ Vt
    s = np.trace(np.diag(S) @ D) / (X ** 2).sum(); return s, Rm, mb - s * Rm @ ma
pairs = []
for (clip, lens, t, plc), gn in gname.items():
    if gn not in gpose: continue
    c = [(abs(k[2] / FPS - t), k) for k in rpose if k[0] == clip and k[1] == lens]
    if not c: continue
    dt, k = min(c); tripod = bool(plc) and clip.endswith("_020")
    if tripod and not (STABLE[plc][0] <= k[2] / FPS <= STABLE[plc][1]): continue
    if dt <= ((STABLE[plc][1] - STABLE[plc][0]) if tripod else 1.01 / FPS): pairs.append((gn, k))
Cg = np.array([-gpose[g][0].T @ gpose[g][1] for g, k in pairs]); Cr = np.array([-rpose[k][0].T @ rpose[k][1] for g, k in pairs])
keep = np.ones(len(pairs), bool)
for _ in range(5):
    s, Rm, t = umeyama(Cg[keep], Cr[keep]); res = np.linalg.norm((s * (Rm @ Cg.T)).T + t - Cr, axis=1); keep = res <= max(3 * np.median(res[keep]), 1e-6)
s, Rm, t = umeyama(Cg[keep], Cr[keep])
G = np.array([p.xyz for p in gold.points3D.values() if p.error < 1.5 and p.track.length() >= 4]); Rp = np.array([p.xyz for p in ref.points3D.values() if p.error < 1.5])
tree = cKDTree(Rp)
for thr in [0.10, 0.06, 0.04, 0.03, 0.02, 0.02, 0.015, 0.015]:
    d, idx = tree.query((s * (Rm @ G.T)).T + t, k=1); sel = d < thr; s, Rm, t = umeyama(G[sel], Rp[idx[sel]])
print("pairs", len(pairs), "icp n", int(sel.sum()), "median d", float(np.median(d[sel])), "scale", s)
json.dump({"s": float(s), "R": Rm.tolist(), "t": t.tolist()}, open("golden_to_ref_similarity.json", "w"), indent=1)
views = json.load(open(f"{DD}/poses_main.json")); man = json.load(open(f"{DD}/ds_manifest.json"))
walks = {w["name"]: w for w in man["walkPoses"]}
wl = [walks[f"walk/w_{k:05d}_eval.png"] for k in (0, 200, 400, 600)]
def tr(c2w, C): return (Rm @ np.array(c2w)).tolist(), (s * Rm @ np.array(C) + t).tolist()
off = [dict(name=v["name"], f=v["f"], **dict(zip(("c2w_R", "C"), tr(v["c2w_R"], v["C"])))) for v in views]
off += [dict(name=f"walk_{w['name'][7:12]}", f=640, **dict(zip(("c2w_R", "C"), tr(w["c2w_R"], w["C"])))) for w in wl]
json.dump(off, open(f"{DD}/poses_official.json", "w"))
json.dump([dict(name=f"walk_{w['name'][7:12]}", f=640, c2w_R=w["c2w_R"], C=w["C"]) for w in wl], open(f"{DD}/poses_goldwalk.json", "w"))
print("wrote", len(off))
