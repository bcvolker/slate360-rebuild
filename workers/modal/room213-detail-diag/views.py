"""Room 213 detail diagnostic: the matched camera set and the rectified source references (CPU, local).

Cameras are existing frozen target views (photorealism push, experimental/spirula-hardened/photoreal/frozen_targets.json,
exported locally as target_poses.json): pinhole 1280x720, cx=640, cy=360, f=640 or f=1280, placed at a REAL source-camera
centre (so a rotation-only rectification of that source is valid; no parallax).

Conventions (identical for Spirula, Spark and the reference):
  * world = COLMAP sparse/0 frame (Spirula train_from_world = identity, verified in scene_transform.json).
  * OpenCV camera axes (x right, y down, z forward). Pixel (i, j) centre = (i + 0.5, j + 0.5) in continuous coords.
  * COLMAP images.txt stores world->camera: q = rotation R_w2c = R_c2w^T, t = -R_w2c C.
Reference resampling: each output pixel = mean of 4x4 sub-pixel rays, each bilinearly sampled from the source fisheye
(OPENCV_FISHEYE / Kannala-Brandt k1..k4, the solve's own intrinsics) at continuous coordinate minus 0.5 (cv2.remap
samples integer coordinates at pixel centres). Valid = every sub-ray lands inside the source mask (colmap keep AND lens
border), so occluders (operator, pole) and out-of-lens rays are excluded, never filled."""
import json
import math
import sys
from pathlib import Path

import numpy as np

W, H = 1280, 720
SS = 4
VIEW_TAGS = ["carpet_a0_indep", "carpet_a5_indep", "carpet_a3_indep", "table_edges_a4_indep",
             "carpet_a0_fixed", "chair_slats_a2_fixed"]
FOCALS = (640, 1280)


def qvec_to_R(q):
    w, x, y, z = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
                     [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
                     [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]])


def R_to_qvec(R):
    from scipy.spatial.transform import Rotation as Rot
    x, y, z, w = Rot.from_matrix(R).as_quat()
    q = np.array([w, x, y, z])
    return q if q[0] >= 0 else -q


def read_colmap(sparse):
    cams, imgs = {}, {}
    for ln in (sparse / "cameras.txt").read_text().splitlines():
        if ln and not ln.startswith("#"):
            p = ln.split(); cams[int(p[0])] = (p[1], int(p[2]), int(p[3]), [float(x) for x in p[4:]])
    lines = (sparse / "images.txt").read_text().splitlines()
    for i in range(0, len(lines)):
        p = lines[i].split()
        if len(p) == 10 and not p[0].startswith("#") and p[9].endswith(".png"):
            imgs[p[9]] = (qvec_to_R([float(x) for x in p[1:5]]), np.array([float(x) for x in p[5:8]]), int(p[8]))
    return cams, imgs


def kb_project(Xc, prm):
    fx, fy, cx, cy, k1, k2, k3, k4 = prm
    x, y, z = Xc[..., 0], Xc[..., 1], Xc[..., 2]
    r = np.hypot(x, y); th = np.arctan2(r, z)
    thd = th * (1 + k1 * th ** 2 + k2 * th ** 4 + k3 * th ** 6 + k4 * th ** 8)
    s = np.where(r > 1e-12, thd / np.maximum(r, 1e-12), 0.0)
    return fx * x * s + cx, fy * y * s + cy


def rectify(img, mask, Rc2w, f, Rsrc_w2c, prm):
    import cv2
    acc = np.zeros((H, W, 3), np.float64); ok = np.ones((H, W), bool)
    uu, vv = np.meshgrid(np.arange(W, dtype=np.float64), np.arange(H, dtype=np.float64))
    for sy in range(SS):
        for sx in range(SS):
            u = uu + (sx + 0.5) / SS; v = vv + (sy + 0.5) / SS
            d = np.stack([(u - W / 2) / f, (v - H / 2) / f, np.ones_like(u)], -1) @ Rc2w.T   # world ray dir
            Xc = d @ Rsrc_w2c.T
            xs, ys = kb_project(Xc, prm)
            mx, my = (xs - 0.5).astype(np.float32), (ys - 0.5).astype(np.float32)
            acc += cv2.remap(img, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
            mk = cv2.remap(mask, mx, my, cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
            ok &= (mk > 127) & (Xc[..., 2] > -1e9)
    return np.clip(np.round(acc / (SS * SS)), 0, 255).astype(np.uint8), ok


def build(target_poses_json, src_root, out_dir):
    import cv2
    src_root, out_dir = Path(src_root), Path(out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    cams, imgs = read_colmap(src_root / "sparse" / "0")
    tp = {p["tag"]: p for p in json.load(open(target_poses_json))}
    views = []
    for tag in VIEW_TAGS:
        for f in FOCALS:
            p = tp[f"{tag}_f{f}"]
            sv = p["sourceView"].replace("_fixedeval", "_train")      # fixedeval is a bit-identical duplicate
            Rs, ts, cid = imgs[sv]
            Csrc = -Rs.T @ ts; Rc2w = np.array(p["c2w_R"]); C = np.array(p["C"])
            img = cv2.imread(str(src_root / "images" / sv)); mask = cv2.imread(str(src_root / "masks" / sv), 0)
            ref, ok = rectify(img, mask, Rc2w, f, Rs, cams[cid][3])
            name = f"{tag}_f{f}"
            cv2.imwrite(str(out_dir / f"ref_{name}.png"), ref)
            cv2.imwrite(str(out_dir / f"valid_{name}.png"), ok.astype(np.uint8) * 255)
            Rw2c = Rc2w.T; t = -Rw2c @ C
            views.append({"name": name, "tag": tag, "f": f, "W": W, "H": H, "cx": W / 2, "cy": H / 2,
                          "sourceView": sv, "sourceCamera": cid, "c2w_R": Rc2w.tolist(), "C": C.tolist(),
                          "w2c_qvec": R_to_qvec(Rw2c).tolist(), "w2c_t": t.tolist(),
                          "centreVsSourceCentre": float(np.abs(C - Csrc).max()),
                          "validFraction": float(ok.mean())})
            print(name, "centre diff", views[-1]["centreVsSourceCentre"], "valid", round(ok.mean(), 3))
    json.dump({"W": W, "H": H, "supersample": SS, "views": views}, open(out_dir / "views.json", "w"), indent=1)


if __name__ == "__main__":
    build(*sys.argv[1:4])
