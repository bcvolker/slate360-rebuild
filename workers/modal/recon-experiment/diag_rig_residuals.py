"""Read-only residual diagnostics on a finished Room 213 rig-BA reconstruction (no pipeline change).
Usage: modal run workers/modal/recon-experiment/diag_rig_residuals.py --hyp H1_stream0=A [--outdir rig_ba_v2]
Outputs (volume, next to the rec): residual_diag.json, tail_sheet.png (top residuals, crops with predicted point).
Answers: residual vs original SENSOR radius/row (Mei projection the faces were built with), residual vs rig speed
(motion/timing), tail categorisation (mask boundary / extreme periphery / ordinary), per walk x lens x face x radius.
"""
import modal

app = modal.App("room213-rig-residual-diag")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = (modal.Image.debian_slim(python_version="3.10").pip_install("pycolmap==4.2.0", "numpy", "opencv-python-headless", "scipy")
         .add_local_dir("workers/recon-experiment", remote_path="/root/recon-experiment"))


@app.function(image=image, volumes={"/vol": vol}, timeout=1800, cpu=8.0, memory=32 * 1024)
def diag(hyp: str, outdir: str = "rig_ba_v2") -> dict:
    import json, math, re, sys, collections
    import numpy as np, cv2, pycolmap
    from pathlib import Path
    from scipy.stats import spearmanr
    sys.path.insert(0, "/root/recon-experiment")
    import room213_raw_build as B
    OUT = B.OUT; hdir = OUT / outdir / hyp
    rec = pycolmap.Reconstruction(str(hdir / "rec"))
    meta = json.load(open(OUT / "faces.json")); by_face = {m["face"]: m for m in meta}
    lenses, calib = B.load_calib()
    FACE_IDX = {n: i for i, (n, _, _) in enumerate(B.FACES)}; face_rot = {n: B.face_R(y, p) for n, y, p in B.FACES}
    demux = json.load(open(B.PRE / "demux.json"))
    # exposure time per frame + walk
    frame_meta = {}
    for im in rec.images.values():
        m = by_face[im.name[6:-4]]; frame_meta[im.frame_id] = (m["exposure"], m["video"], float(m["t"]))
    walk_of = {fid: v.split("_00_")[1].split(".insv")[0] for fid, (e, v, t) in frame_meta.items()}
    # rig centres and speed (m/s) to the temporal neighbour in the same video
    C = {fid: -np.asarray(f.rig_from_world.rotation.matrix()).T @ np.asarray(f.rig_from_world.translation) for fid, f in rec.frames.items() if f.has_pose()}
    by_video = collections.defaultdict(list)
    for fid, (e, v, t) in frame_meta.items(): by_video[v].append((t, fid))
    speed = {}
    for v, lst in by_video.items():
        lst.sort()
        for i, (t, fid) in enumerate(lst):
            cands = []
            for j in (i - 1, i + 1):
                if 0 <= j < len(lst):
                    t2, f2 = lst[j]; dt = abs(t2 - t)
                    if 0 < dt <= 6: cands.append(np.linalg.norm(C[fid] - C[f2]) / dt)
            speed[fid] = float(min(cands)) if cands else None
    # per-observation residuals + labels + original sensor coordinates
    pts = {pid: np.asarray(p.xyz) for pid, p in rec.points3D.items()}
    rows = []
    for im in rec.images.values():
        m = by_face[im.name[6:-4]]; s = m["stream"]; fn = m["face_name"]
        cfw = im.cam_from_world(); R = np.asarray(cfw.rotation.matrix()); t = np.asarray(cfw.translation)
        idx = [(i, p.point3D_id) for i, p in enumerate(im.points2D) if p.has_point3D()]
        if not idx: continue
        X = np.array([pts[pid] for _, pid in idx]); xy = np.array([np.asarray(im.points2D[i].xy) for i, _ in idx])
        Xc = X @ R.T + t; z = np.where(Xc[:, 2] > 1e-9, Xc[:, 2], np.nan)
        u = B.FL * Xc[:, 0] / z + B.FACE / 2; v = B.FL * Xc[:, 1] / z + B.FACE / 2
        e = np.hypot(u - xy[:, 0], v - xy[:, 1]); e = np.where(np.isnan(e), 1e4, e)
        d = np.stack([(xy[:, 0] - B.FACE / 2 + 0.5) / B.FL, (xy[:, 1] - B.FACE / 2 + 0.5) / B.FL, np.ones(len(xy))], 1); d /= np.linalg.norm(d, axis=1, keepdims=True)
        dl = d @ face_rot[fn].T; p_f, valid = lenses[s].project_frame(dl)
        cx, cy, cr = B.FRAME_CIRCLE[s]; srad = np.hypot(p_f[:, 0] - cx, p_f[:, 1] - cy)
        depth = np.where(np.isnan(z), -1.0, Xc[:, 2])
        for k in range(len(e)):
            rows.append((e[k], s, FACE_IDX[fn], im.frame_id, xy[k, 0], xy[k, 1], u[k], v[k], srad[k], p_f[k, 1], depth[k], im.image_id, idx[k][0]))
    A = np.array([r[:11] for r in rows], dtype=np.float64); ids = [(r[11], r[12]) for r in rows]
    e, lens, face, frame, x, y, pu, pv, srad, srow, depth = A.T
    frad = np.hypot(x - B.FACE / 2, y - B.FACE / 2)
    walk = np.array([walk_of[int(f)] for f in frame]); spd = np.array([speed.get(int(f)) if speed.get(int(f)) is not None else np.nan for f in frame])
    def dist(mask):
        q = e[mask]; return {"n": int(len(q)), "median": float(np.median(q)) if len(q) else None, "p95": float(np.percentile(q, 95)) if len(q) else None, "p99": float(np.percentile(q, 99)) if len(q) else None}
    out = {"hypothesis": hyp, "n_obs": int(len(e)), "overall": dist(np.ones(len(e), bool))}
    out["by_sensor_radius_px"] = {f"{a}-{b}": {"all": dist((srad >= a) & (srad < b)), "lens0": dist((srad >= a) & (srad < b) & (lens == 0)), "lens1": dist((srad >= a) & (srad < b) & (lens == 1))}
                                  for a, b in ((0, 800), (800, 1300), (1300, 1700), (1700, 1950), (1950, 2200))}
    out["by_sensor_row_px"] = {f"{a}-{b}": {"lens0": dist((srow >= a) & (srow < b) & (lens == 0)), "lens1": dist((srow >= a) & (srow < b) & (lens == 1))} for a, b in ((0, 768), (768, 1536), (1536, 2304), (2304, 3072), (3072, 3840))}
    out["by_face_radius_px"] = {f"{a}-{b}": dist((frad >= a) & (frad < b)) for a, b in ((0, 400), (400, 800), (800, 1280), (1280, 1900))}
    out["by_depth_m"] = {f"{a}-{b}": {"all": dist((depth >= a) & (depth < b)), "lens0": dist((depth >= a) & (depth < b) & (lens == 0)), "lens1": dist((depth >= a) & (depth < b) & (lens == 1))}
                         for a, b in ((0, 1), (1, 2), (2, 3), (3, 5), (5, 8), (8, 1e9))}
    out["by_depth_x_face_radius"] = {f"d{a}-{b}_r{c}-{d_}": dist((depth >= a) & (depth < b) & (frad >= c) & (frad < d_)) for a, b in ((0, 2), (2, 5), (5, 1e9)) for c, d_ in ((0, 600), (600, 1280), (1280, 1900))}
    out["residual_in_mm_at_depth"] = {"median_mm": float(np.median(e[(depth > 0) & (e < 1e4)] * depth[(depth > 0) & (e < 1e4)] / B.FL * 1000)), "p95_mm": float(np.percentile(e[(depth > 0) & (e < 1e4)] * depth[(depth > 0) & (e < 1e4)] / B.FL * 1000, 95))}
    out["by_walk_x_lens"] = {f"{w}_lens{ln}": dist((walk == w) & (lens == ln)) for w in sorted(set(walk)) for ln in (0, 1)}
    out["by_face_x_lens"] = {f"{n}_lens{ln}": dist((face == i) & (lens == ln)) for n, i in FACE_IDX.items() for ln in (0, 1)}
    # motion: per-exposure median residual vs rig speed
    per_frame = {}
    for f in np.unique(frame):
        mk = frame == f
        per_frame[int(f)] = {"speed_m_s": speed.get(int(f)), "walk": walk_of[int(f)], "median_lens0": float(np.median(e[mk & (lens == 0)])) if np.any(mk & (lens == 0)) else None,
                             "median_lens1": float(np.median(e[mk & (lens == 1)])) if np.any(mk & (lens == 1)) else None, "p95_all": float(np.percentile(e[mk], 95))}
    sp = np.array([v["speed_m_s"] for v in per_frame.values() if v["speed_m_s"] is not None and v["median_lens1"] is not None])
    m1 = np.array([v["median_lens1"] for v in per_frame.values() if v["speed_m_s"] is not None and v["median_lens1"] is not None])
    m0 = np.array([v["median_lens0"] for v in per_frame.values() if v["speed_m_s"] is not None and v["median_lens1"] is not None and v["median_lens0"] is not None])
    bins = {"static_<0.05": sp < 0.05, "slow_0.05-0.3": (sp >= 0.05) & (sp < 0.3), "walk_0.3-0.8": (sp >= 0.3) & (sp < 0.8), "fast_>0.8": sp >= 0.8}
    out["motion"] = {"n_frames_with_speed": int(len(sp)), "spearman_speed_vs_lens1_median": (float(spearmanr(sp, m1)[0]) if len(sp) > 5 else None),
                     "spearman_speed_vs_lens0_median": (float(spearmanr(sp, m0)[0]) if len(m0) > 5 else None),
                     "by_speed_bin_lens1_median_of_frame_medians": {k: {"n": int(v.sum()), "median": float(np.median(m1[v])) if v.any() else None, "p90": float(np.percentile(m1[v], 90)) if v.any() else None} for k, v in bins.items()},
                     "speed_percentiles_m_s": [float(np.percentile(sp, q)) for q in (10, 50, 90)] if len(sp) else None}
    out["per_frame"] = per_frame
    # tail categorisation: top 1% residuals
    thr = np.percentile(e, 99); tail = np.where(e >= thr)[0]
    mask_cache = {}
    def mask_dist(image_id, xx, yy):
        name = rec.image(int(image_id)).name[6:-4]
        if name not in mask_cache:
            mk = cv2.imread(str(OUT / "faces" / f"{name}_mask.png"), 0); mask_cache[name] = cv2.distanceTransform((mk > 0).astype(np.uint8), cv2.DIST_L2, 3) if mk is not None else None
        dt = mask_cache[name]
        return float(dt[int(np.clip(yy, 0, B.FACE - 1)), int(np.clip(xx, 0, B.FACE - 1))]) if dt is not None else np.nan
    cats = collections.Counter(); tail_rows = []
    for k in tail:
        md = mask_dist(ids[k][0], x[k], y[k]); periph = srad[k] > 1950; behind = e[k] >= 1e4
        cat = "behind_camera" if behind else ("mask_boundary_<25px" if md < 25 else ("extreme_sensor_periphery_>1950px" if periph else "ordinary_scene"))
        cats[cat] += 1; tail_rows.append((float(e[k]), int(lens[k]), walk[k], int(face[k]), float(srad[k]), md, cat, ids[k], float(x[k]), float(y[k]), float(pu[k]), float(pv[k])))
    out["tail_top1pct"] = {"threshold_px": float(thr), "n": int(len(tail)), "categories": dict(cats),
                           "by_lens": dict(collections.Counter(int(lens[k]) for k in tail)), "by_walk": dict(collections.Counter(walk[k] for k in tail)),
                           "by_face": dict(collections.Counter(int(face[k]) for k in tail)), "n_frames_holding_tail": int(len(set(int(frame[k]) for k in tail))),
                           "top_frames": [{"frame": int(f), "n_tail": int(n), "walk": walk_of[int(f)]} for f, n in collections.Counter(int(frame[k]) for k in tail).most_common(10)]}
    # contact sheet: 24 largest finite residuals (crop 160 px around observation; green = observed, red = predicted)
    tail_rows.sort(key=lambda r: -r[0] if r[0] < 1e4 else 0)
    tiles = []
    for r in [tr for tr in tail_rows if tr[0] < 1e4][:24]:
        name = rec.image(int(r[7][0])).name[6:-4]; img = cv2.imread(str(OUT / "faces" / f"{name}.png"))
        if img is None: continue
        cx_, cy_ = int(r[8]), int(r[9]); h = 120
        crop = img[max(0, cy_ - h):cy_ + h, max(0, cx_ - h):cx_ + h].copy()
        ox, oy = cx_ - max(0, cx_ - h), cy_ - max(0, cy_ - h)
        cv2.circle(crop, (ox, oy), 6, (0, 255, 0), 2)
        px_, py_ = int(r[10] - max(0, cx_ - h)), int(r[11] - max(0, cy_ - h))
        if 0 <= px_ < crop.shape[1] and 0 <= py_ < crop.shape[0]: cv2.circle(crop, (px_, py_), 6, (0, 0, 255), 2); cv2.line(crop, (ox, oy), (px_, py_), (0, 0, 255), 1)
        crop = cv2.resize(crop, (240, 240)); cv2.putText(crop, f"{r[0]:.0f}px L{r[1]} {r[2]} {B.FACES[r[3]][0]} r{int(r[4])}", (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
        cv2.putText(crop, r[6][:26], (4, 232), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1); tiles.append(crop)
    if tiles:
        while len(tiles) % 6: tiles.append(np.zeros_like(tiles[0]))
        sheet = np.vstack([np.hstack(tiles[i:i + 6]) for i in range(0, len(tiles), 6)]); cv2.imwrite(str(hdir / "tail_sheet.png"), sheet)
    # random mid-tail sheet (residual 20-50 px) to see what "ordinary" bad observations look like
    mid = np.where((e > 20) & (e < 50))[0]; rng = np.random.default_rng(0); tiles = []
    for k in rng.choice(mid, min(18, len(mid)), replace=False) if len(mid) else []:
        name = rec.image(int(ids[k][0])).name[6:-4]; img = cv2.imread(str(OUT / "faces" / f"{name}.png"))
        if img is None: continue
        cx_, cy_ = int(x[k]), int(y[k]); h = 120; crop = img[max(0, cy_ - h):cy_ + h, max(0, cx_ - h):cx_ + h].copy(); ox, oy = cx_ - max(0, cx_ - h), cy_ - max(0, cy_ - h)
        cv2.circle(crop, (ox, oy), 6, (0, 255, 0), 2); px_, py_ = int(pu[k] - max(0, cx_ - h)), int(pv[k] - max(0, cy_ - h))
        if 0 <= px_ < crop.shape[1] and 0 <= py_ < crop.shape[0]: cv2.circle(crop, (px_, py_), 6, (0, 0, 255), 2)
        crop = cv2.resize(crop, (240, 240)); cv2.putText(crop, f"{e[k]:.0f}px L{int(lens[k])} {walk[k]} {B.FACES[int(face[k])][0]} r{int(srad[k])}", (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1); tiles.append(crop)
    if tiles:
        while len(tiles) % 6: tiles.append(np.zeros_like(tiles[0]))
        cv2.imwrite(str(hdir / "midtail_sheet.png"), np.vstack([np.hstack(tiles[i:i + 6]) for i in range(0, len(tiles), 6)]))
    json.dump(out, open(hdir / "residual_diag.json", "w"), indent=1); vol.commit()
    slim = {k: v for k, v in out.items() if k != "per_frame"}
    return slim


@app.local_entrypoint()
def main(hyp: str = "H1_stream0=A", outdir: str = "rig_ba_v2"):
    import json
    print(json.dumps(diag.remote(hyp, outdir), indent=1))
