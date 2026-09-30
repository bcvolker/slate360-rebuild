"""Build render/rectify view lists for a condition. Usage: python views_cond.py <cond> <sparse dir> <align json> <out json>"""
import json, sys, re, numpy as np, pycolmap
cond, sp, alj, out = sys.argv[1:5]
al = json.load(open(alj)); S, Rg, tg = al["cond_to_golden"]["s"], np.array(al["cond_to_golden"]["R"]), np.array(al["cond_to_golden"]["t"])
G = json.load(open("../p5/golden_to_ref_similarity.json")); s2, R2, t2 = G["s"], np.array(G["R"]), np.array(G["t"])
def g2c(c2w, C): return Rg.T @ np.array(c2w), Rg.T @ (np.array(C) - tg) / S          # golden -> cond
def g2r(c2w, C): return R2 @ np.array(c2w), s2 * R2 @ np.array(C) + t2                  # golden -> official ref
def c2g(c2w, C): return Rg @ np.array(c2w), S * Rg @ np.array(C) + tg                   # cond -> golden
def V(name, c2w, C, f, W=1280, H=720):
    R = np.array(c2w).T; return {"name": name, "R": R.tolist(), "t": (-R @ np.array(C)).tolist(), "f": float(f), "W": W, "H": H}
locked = json.load(open("../dd/poses_main.json")); man = json.load(open("../dd/ds_manifest.json")); W_ = {w["name"]: w for w in man["walkPoses"]}
gold_views = [dict(name=v["name"], c2w=v["c2w_R"], C=v["C"], f=v["f"]) for v in locked] + \
             [dict(name=f"walk_{k:05d}", c2w=W_[f"walk/w_{k:05d}_eval.png"]["c2w_R"], C=W_[f"walk/w_{k:05d}_eval.png"]["C"], f=640) for k in (0, 200, 400, 600)]
res = {"gold_frame": [V(v["name"], v["c2w"], v["C"], v["f"]) for v in gold_views],
       "cond_frame": [V(v["name"], *g2c(v["c2w"], v["C"]), v["f"]) for v in gold_views]}
# lineage: for each target, the condition's own source image nearest the target camera, view placed AT that image's centre
rec = pycolmap.Reconstruction(sp); ims = [(i.name, np.asarray(i.cam_from_world().rotation.matrix()), np.asarray(i.cam_from_world().translation)) for i in rec.images.values()]
TARGETS = {"white_wall": "carpet_a0_indep_f1280", "ceiling_grid": "chair_slats_a2_fixed_f640", "window_reveal": "carpet_a0_indep_f640",
           "chair_slats": "chair_slats_a2_fixed_f1280", "table_edge": "table_edges_a4_indep_f1280", "carpet": "carpet_a0_indep_f1280"}
byname = {v["name"]: v for v in gold_views}; lin_c, lin_g, lin_r, picks = [], [], [], []
for tname, vname in TARGETS.items():
    gv = byname[vname]; c2w_c, C_c = g2c(gv["c2w"], gv["C"]); fwd = c2w_c[:, 2]
    best = None
    for n, R, t in ims:
        C = -R.T @ t; ax = R.T @ np.array([0, 0, 1.0]); ang = np.degrees(np.arccos(np.clip(ax @ fwd, -1, 1)))
        if ang > 65: continue
        d = np.linalg.norm(C - C_c)
        if best is None or d < best[0]: best = (d, ang, n, C)
    d, ang, n, C = best
    name = f"lin_{tname}"
    lin_c.append(V(name, c2w_c, C, gv["f"])); cg = c2g(c2w_c, C); lin_g.append(V(name, *cg, gv["f"])); lin_r.append(V(name, *g2r(*cg), gv["f"]))
    picks.append({**V(name, c2w_c, C, gv["f"]), "image": n, "dist_m": float(d), "axis_angle_deg": float(ang)})
res["lineage"] = {"cond": lin_c, "golden": lin_g, "official": lin_r, "picks": picks}
res["cond_frame_all"] = res["cond_frame"] + lin_c
res["golden_all"] = res["gold_frame"] + lin_g
off_locked = [V(v["name"], *g2r(v["c2w"], v["C"]), v["f"]) for v in gold_views]
res["official_all"] = off_locked + lin_r
json.dump(res, open(out, "w"), indent=1)
print([(p["name"], p["image"], round(p["dist_m"], 2), round(p["axis_angle_deg"], 1)) for p in picks])
