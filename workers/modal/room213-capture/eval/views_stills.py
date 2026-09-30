"""Station views at each X4 72MP panorama position (AX6c frame): 4 horizontal headings + 1 pitched 25 deg down, 1280x720 f=640.
Emits the same world views in the A, official-ref and golden frames (via each model's verified similarity to the official ref)."""
import json, numpy as np, pycolmap
def sim(j): a = json.load(open(j)); return a["cond_to_ref"]["s"], np.array(a["cond_to_ref"]["R"]), np.array(a["cond_to_ref"]["t"])
sX, RX, tX = sim("AX6c_align.json"); sA, RA, tA = sim("A_align.json")
G = json.load(open("../p5/golden_to_ref_similarity.json")); s2, R2, t2 = G["s"], np.array(G["R"]), np.array(G["t"])
rec = pycolmap.Reconstruction("AX6csparse")
def V(name, c2w, C, f=640, W=1280, H=720):
    R = np.array(c2w).T; return {"name": name, "R": R.tolist(), "t": (-R @ np.array(C)).tolist(), "f": float(f), "W": W, "H": H}
out = {k: [] for k in ("AX6c", "A", "official", "golden", "picks")}
for im in sorted(rec.images.values(), key=lambda i: i.name):
    if "x4stills" not in im.name: continue
    st = im.name.split("_")[-1][:3]; Cx = np.asarray(im.projection_center())
    Cr = sX * RX @ Cx + tX                                    # ref frame (z up, metric)
    for hd in (0, 90, 180, 270, "d"):
        yaw = np.radians(0 if hd == "d" else hd); pitch = np.radians(25 if hd == "d" else 0)
        fwd = np.array([np.cos(yaw) * np.cos(pitch), np.sin(yaw) * np.cos(pitch), -np.sin(pitch)])
        right = np.cross(fwd, [0, 0, 1.0]); right /= np.linalg.norm(right); down = np.cross(fwd, right)
        c2w_r = np.stack([right, down, fwd], 1)               # camera x=right, y=down, z=fwd (OpenCV)
        name = f"st{st}_{hd}"
        c2w_x = RX.T @ c2w_r; out["AX6c"].append(V(name, c2w_x, Cx))
        out["A"].append(V(name, RA.T @ c2w_r, RA.T @ (Cr - tA) / sA))
        out["official"].append(V(name, c2w_r, Cr))
        out["golden"].append(V(name, R2.T @ c2w_r, R2.T @ (Cr - t2) / s2))
        out["picks"].append({**V(name, c2w_x, Cx), "image": im.name})
json.dump(out, open("stills_views.json", "w"), indent=1); print(len(out["picks"]), "views")
