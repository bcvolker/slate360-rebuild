"""Displacement vs blur at close-range edges (camera space, training coordinates). DIAGNOSTIC ONLY.
For each close observation: strong edge points are picked on the exact training face (GT) within a 112 px window around
the target; along each point's GT gradient direction, 1-D profiles are sampled (+-8 px, 0.25 px step) in
  GT | never-trained neighbour frames (+-1, registered for their own parallax) | render UNALIGNED | render ALIGNED
(ALIGNED = one global 2-D shift <= 3 px for A, found by band-pass phase correlation on the same window; recorded, never
used in any quality score). Per profile: sub-pixel 50% position and 10-90% width after plateau normalisation.
Outputs per target/group: edge position error (render - GT, px), width ratios render/GT and neighbour/GT.
Usage: python analyze_edges.py <run dir> <sparse dir> <out json>"""
import json, sys
from pathlib import Path
import cv2, numpy as np, pycolmap

RUN, SP, OUTJ = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
import os; MODEL = os.environ.get("MODEL", "A")
P = json.load(open(RUN / "prep.json")); rec = pycolmap.Reconstruction(SP)


def gray(x): return cv2.cvtColor(np.ascontiguousarray(x, np.float32), cv2.COLOR_RGB2GRAY) * 255.0
def band(g, k): s = 2.0 ** k; return cv2.GaussianBlur(g, (0, 0), s / 2) - cv2.GaussianBlur(g, (0, 0), s)
def shift(i, dx, dy): return cv2.warpAffine(i, np.float32([[1, 0, dx], [0, 1, dy]]), i.shape[::-1], flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
def reg(mov, ref, m, lim):
    a, b = band(ref, 1) + band(ref, 2), band(mov, 1) + band(mov, 2); a = a * m; b = b * m
    (dx, dy), _ = cv2.phaseCorrelate(a.astype(np.float32), b.astype(np.float32), cv2.createHanningWindow(a.shape[::-1], cv2.CV_32F))
    return (-dx, -dy) if np.hypot(dx, dy) <= lim else (0.0, 0.0)


def edge_points(g, m, n_max=250):
    gs = cv2.GaussianBlur(g, (0, 0), 1.0); gx, gy = cv2.Sobel(gs, cv2.CV_32F, 1, 0), cv2.Sobel(gs, cv2.CV_32F, 0, 1); mag = np.hypot(gx, gy)
    thr = np.percentile(mag[m], 92); pts = []
    ys, xs = np.where((mag > thr) & m)
    order = np.argsort(-mag[ys, xs])
    for i in order:
        y, x = ys[i], xs[i]; d = np.array([gx[y, x], gy[y, x]]) / (mag[y, x] + 1e-9)
        # non-maximum along the gradient + spacing
        a = mag[int(round(y + d[1])), int(round(x + d[0]))] if 1 <= y < g.shape[0] - 1 and 1 <= x < g.shape[1] - 1 else 0
        b = mag[int(round(y - d[1])), int(round(x - d[0]))] if 1 <= y < g.shape[0] - 1 and 1 <= x < g.shape[1] - 1 else 0
        if mag[y, x] < a or mag[y, x] < b: continue
        if any((y - p[0]) ** 2 + (x - p[1]) ** 2 < 16 for p in pts): continue
        pts.append((y, x, d))
        if len(pts) >= n_max: break
    return pts


SS = np.arange(-8, 8.001, 0.25)
def profile(g, y, x, d):
    px = (x + SS * d[0]).astype(np.float32).reshape(1, -1); py = (y + SS * d[1]).astype(np.float32).reshape(1, -1)
    return cv2.remap(g, px, py, cv2.INTER_LINEAR).ravel()


def pos_width(p):
    lo, hi = np.percentile(p[:12], 50), np.percentile(p[-12:], 50); c = hi - lo
    if abs(c) < 10: return None
    s = (p - lo) / c
    mid = np.where((s[:-1] - 0.5) * (s[1:] - 0.5) <= 0)[0]
    if len(mid) == 0: return None
    i = mid[np.argmin(np.abs(SS[mid]))]; x50 = SS[i] + (0.5 - s[i]) / (s[i + 1] - s[i] + 1e-9) * 0.25
    sm = np.maximum.accumulate(np.clip(s, 0, 1)); w = np.interp(0.9, sm, SS) - np.interp(0.1, sm, SS)
    return float(x50), float(w), float(abs(c))


res = {}
for tn, T in P["targets"].items():
    rows = []
    for o in T["observations"]:
        f = RUN / tn / f"{o['tag']}_train_face.npy"
        if not f.exists(): continue
        grp = "CLOSE" if o["px_per_mm_train"] >= 0.9 else ("FAR" if o["px_per_mm_train"] <= 0.55 else "MID")
        gt = gray(np.load(f)); cy, cx = int(o["face_px"][1] - o["face_bbox"][1]), int(o["face_px"][0] - o["face_bbox"][0]); H = 56
        m = np.zeros(gt.shape, bool); m[max(10, cy - H):min(gt.shape[0] - 10, cy + H), max(10, cx - H):min(gt.shape[1] - 10, cx + H)] = True
        if m.sum() < 400: continue
        rd = cv2.imread(str(RUN / tn / MODEL / f"{o['render_view']}_face_crop.png"), 0)
        if rd is None or rd.shape != gt.shape: continue
        rd = rd.astype(np.float32); sa = reg(rd, gt, m.astype(np.float32), 3.0); rda = shift(rd, *sa)
        nbs = []
        for dd in (-1, 1):
            q = RUN / tn / "adj" / f"{o['tag']}_d{dd:+d}.npy"
            if q.exists():
                nb = gray(np.load(q)); nbs.append(shift(nb, *reg(nb, gt, m.astype(np.float32), 70.0)))
        E = {"gt": [], "unal": [], "al": [], "nb": []}
        for y, x, d in edge_points(gt, m):
            g0 = pos_width(profile(gt, y, x, d))
            if g0 is None or g0[1] <= 0: continue
            ru, ra = pos_width(profile(rd, y, x, d)), pos_width(profile(rda, y, x, d))
            nn = [pos_width(profile(nb, y, x, d)) for nb in nbs]
            if ru is None or ra is None: continue
            E["gt"].append(g0); E["unal"].append(ru); E["al"].append(ra); E["nb"].append([v for v in nn if v])
        if len(E["gt"]) < 8: continue
        g = np.array(E["gt"]); u = np.array(E["unal"]); a = np.array(E["al"])
        nbw = [v[0][1] for v in E["nb"] if v]; nbp = [v[0][0] for v in E["nb"] if v]
        gi = [i for i, v in enumerate(E["nb"]) if v]
        rows.append({"tag": o["tag"], "grp": grp, "dist_m": o["dist_m"], "px_mm": o["px_per_mm_train"], "n_edges": len(g), "align_shift_px": float(np.hypot(*sa)),
                     "pos_err_unaligned_px_med_abs": float(np.median(np.abs(u[:, 0] - g[:, 0]))), "pos_err_aligned_px_med_abs": float(np.median(np.abs(a[:, 0] - g[:, 0]))),
                     "width_gt_px": float(np.median(g[:, 1])), "width_render_unaligned_px": float(np.median(u[:, 1])), "width_render_aligned_px": float(np.median(a[:, 1])),
                     "width_ratio_render_gt": float(np.median(a[:, 1] / g[:, 1])), "width_ratio_of_medians": float(np.median(a[:, 1]) / np.median(g[:, 1])),
                     "width_ratio_neighbour_gt": float(np.median(np.array(nbw) / g[gi, 1])) if nbw else None,
                     "pos_err_neighbour_px_med_abs": float(np.median(np.abs(np.array(nbp) - g[gi, 0]))) if nbp else None,
                     "contrast_ratio_render_gt": float(np.median(a[:, 2] / g[:, 2]))})
    # SfM local reprojection of tracked points near the target, in the observing close cameras (planar-free)
    X = np.array(T["X"]); near = [p for p in rec.points3D.values() if np.linalg.norm(p.xyz - X) < 0.06]
    errs = {}
    for p in near:
        for el in p.track.elements:
            im = rec.images[el.image_id]; cam = rec.cameras[im.camera_id]; cw = im.cam_from_world()
            uv = np.asarray(cam.img_from_cam((np.asarray(cw.rotation.matrix()) @ p.xyz + np.asarray(cw.translation))[None]))[0]
            e = float(np.linalg.norm(uv - np.asarray(im.points2D[el.point2D_idx].xy)))
            if not np.isfinite(e): continue
            dist = float(np.linalg.norm(np.asarray(im.projection_center()) - p.xyz))
            errs.setdefault("close" if dist < 1.1 else "far", []).append(e)
    sfm = {k: {"n_obs": len(v), "reproj_native_px_median": float(np.median(v)), "p90": float(np.percentile(v, 90))} for k, v in errs.items()}
    summ = {}
    for gname in ("CLOSE", "MID", "FAR"):
        rr = [r for r in rows if r["grp"] == gname]
        if not rr: continue
        keys = [k for k in rr[0] if k not in ("tag", "grp") and all(r.get(k) is not None for r in rr)]
        summ[gname] = {"n_views": len(rr), **{k: float(np.median([r[k] for r in rr])) for k in keys}}
    res[tn] = {"summary": summ, "sfm_track_reprojection_near_target": sfm, "per_view": rows}
    print(f"\n== {tn}  SfM track reprojection near target (native px): {sfm}")
    for gname, s in summ.items():
        print(f"  {gname}: views {s['n_views']} d {s['dist_m']:.2f} m  edges/view {s['n_edges']:.0f}  align shift {s['align_shift_px']:.2f} px")
        print(f"     edge position |render-GT|: unaligned {s['pos_err_unaligned_px_med_abs']:.2f} px -> aligned {s['pos_err_aligned_px_med_abs']:.2f} px;  |neighbour-GT| {s.get('pos_err_neighbour_px_med_abs', float('nan')):.2f} px")
        print(f"     edge width 10-90%: GT {s['width_gt_px']:.2f} px, render {s['width_render_aligned_px']:.2f} px -> ratio (median of ratios / ratio of medians) {s['width_ratio_render_gt']:.2f} / {s['width_ratio_of_medians']:.2f}; neighbour/GT {s.get('width_ratio_neighbour_gt', float('nan')):.2f}; contrast render/GT {s['contrast_ratio_render_gt']:.2f}")
json.dump(res, open(OUTJ, "w"), indent=1)
