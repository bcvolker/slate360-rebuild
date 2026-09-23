"""Room 213 camera/ray audit on Modal (CPU only, no GPU, no training).
Reads the FROZEN views from the volume read-only; all COLMAP work happens in the container's /tmp;
returns a JSON summary. Nothing on the volume is written."""
import json
import math
import os
import sys
import time

import modal

app = modal.App("room213-camera-ray-audit")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = modal.Image.debian_slim(python_version="3.11").pip_install("pycolmap==4.1.1", "numpy")

LAYOUT = ([(y, 0) for y in (0, 45, 90, 135, 180, 225, 270, 315)]
          + [(y, 45) for y in (0, 90, 180, 270)] + [(y, -45) for y in (0, 90, 180, 270)])


@app.function(image=image, volumes={"/vol": vol}, cpu=32.0, memory=98304, timeout=4 * 3600)
def run(max_features: int = 4096, k_cross: int = 3, ang_within: float = 89.0, ang_cross: float = 80.0):
    import numpy as np
    import pycolmap

    def log(*a):
        print(time.strftime("%H:%M:%S"), *a)
        sys.stdout.flush()

    VIEWS = "/vol/inputs/cecc2763/views"
    W = "/tmp/audit"
    os.makedirs(W, exist_ok=True)
    DB = f"{W}/crops.db"
    MASKS = f"{W}/masks_colmap"
    PAIRS = f"{W}/pairs.txt"
    OUT = f"{W}/tri"
    doc = json.load(open(f"{VIEWS}/transforms.json"))
    frames = doc["frames"]
    info = {}
    for f in frames:
        n = f["file_path"].split("/")[-1]
        stem, v = n[:-4].split("_v")
        M = np.array(f["transform_matrix"], float)
        R = M[:3, :3].copy()
        R[:, 1] *= -1
        R[:, 2] *= -1
        info[n] = dict(stem=stem, v=int(v), R=R, C=M[:3, 3].copy(), fwd=R[:, 2].copy())
    names = sorted(info)
    stems = sorted(set(i["stem"] for i in info.values()))
    os.makedirs(MASKS, exist_ok=True)
    for n in names:
        src = f"{VIEWS}/masks/{n[:-4]}.png"
        dst = f"{MASKS}/{n}.png"
        if os.path.exists(src) and not os.path.lexists(dst):
            os.symlink(src, dst)
    by = {s: [n for n in names if info[n]["stem"] == s] for s in stems}

    def ang(a, b):
        return math.degrees(math.acos(max(-1.0, min(1.0, float(np.dot(info[a]["fwd"], info[b]["fwd"]))))))

    pairs = []
    within = cross = 0
    for si, s in enumerate(stems):
        A = by[s]
        for i in range(len(A)):
            for j in range(i + 1, len(A)):
                if ang(A[i], A[j]) < ang_within:
                    pairs.append((A[i], A[j]))
                    within += 1
        for k in range(1, k_cross + 1):
            if si + k >= len(stems):
                break
            for a in A:
                for b in by[stems[si + k]]:
                    if ang(a, b) < ang_cross:
                        pairs.append((a, b))
                        cross += 1
    with open(PAIRS, "w") as fh:
        for a, b in pairs:
            fh.write(f"{a} {b}\n")
    summary = {"pairs_within": within, "pairs_cross": cross, "pairs_total": len(pairs), "k_cross": k_cross,
               "max_features": max_features}
    log("pairs", summary)

    t0 = time.time()
    ro = pycolmap.ImageReaderOptions(camera_model="PINHOLE", camera_params="640,640,640,640", mask_path=MASKS)
    eo = pycolmap.FeatureExtractionOptions(num_threads=32, max_image_size=1280,
                                           sift=pycolmap.SiftExtractionOptions(max_num_features=max_features))
    pycolmap.extract_features(DB, f"{VIEWS}/images", camera_mode=pycolmap.CameraMode.SINGLE,
                              reader_options=ro, extraction_options=eo, device=pycolmap.Device.cpu)
    db = pycolmap.Database.open(DB)
    summary["keypoints"] = db.num_keypoints()
    summary["images"] = db.num_images()
    db.close()
    summary["extract_s"] = round(time.time() - t0)
    log("extracted", summary)

    t0 = time.time()
    mo = pycolmap.FeatureMatchingOptions(num_threads=32, use_gpu=False)
    po = pycolmap.ImportedPairingOptions(match_list_path=PAIRS, block_size=4000)
    pycolmap.match_image_pairs(DB, matching_options=mo, pairing_options=po, device=pycolmap.Device.cpu)
    db = pycolmap.Database.open(DB)
    summary.update(matched_pairs=db.num_matched_image_pairs(), verified_pairs=db.num_verified_image_pairs(),
                   inlier_matches=db.num_inlier_matches())
    try:
        pair_ids, geoms = db.read_two_view_geometries()
        imgs_db = {im.image_id: im.name for im in db.read_all_images()}
        w_inl, c_inl = [], []
        for pid, g in zip(pair_ids, geoms):
            id1, id2 = pycolmap.pair_id_to_image_pair(pid)
            n1, n2 = imgs_db[id1], imgs_db[id2]
            k = len(g.inlier_matches)
            (w_inl if info[n1]["stem"] == info[n2]["stem"] else c_inl).append(k)
        for lab, arr in (("within", w_inl), ("cross", c_inl)):
            a = np.array(arr) if arr else np.zeros(1)
            summary[f"inliers_{lab}"] = dict(pairs=len(arr), mean=float(a.mean()), median=float(np.median(a)),
                                             p10=float(np.percentile(a, 10)), zero_frac=float((a == 0).mean()))
    except Exception as exc:  # optional statistic; never abort the audit for it
        summary["inliers_error"] = f"{type(exc).__name__}: {exc}"
    db.close()
    summary["match_s"] = round(time.time() - t0)
    log("matched", {k: summary[k] for k in ("matched_pairs", "verified_pairs", "inlier_matches", "match_s")})

    t0 = time.time()
    db = pycolmap.Database.open(DB)
    cams = db.read_all_cameras()
    imgs = db.read_all_images()
    db.close()
    rec = pycolmap.Reconstruction()
    cam = cams[0]
    rec.add_camera_with_trivial_rig(cam)
    for im in imgs:
        i = info[im.name]
        Rw = i["R"].T
        t = -Rw @ i["C"]
        rec.add_image_with_trivial_frame(pycolmap.Image(name=im.name, camera_id=cam.camera_id, image_id=im.image_id))
        fr = rec.frame(rec.image(im.image_id).frame_id)
        fr.rig_from_world = pycolmap.Rigid3d(pycolmap.Rotation3d(Rw), t)
        rec.register_frame(fr.frame_id)
    os.makedirs(OUT, exist_ok=True)
    opts = pycolmap.IncrementalPipelineOptions()
    opts.triangulation.ignore_two_view_tracks = True
    rec = pycolmap.triangulate_points(rec, DB, f"{VIEWS}/images", OUT, clear_points=True, options=opts,
                                      refine_intrinsics=False)
    summary["triangulate_s"] = round(time.time() - t0)
    summary.update(points3D=rec.num_points3D(), observations=rec.compute_num_observations(),
                   mean_track=rec.compute_mean_track_length(), mean_reproj_px=rec.compute_mean_reprojection_error(),
                   obs_per_image=rec.compute_mean_observations_per_reg_image())
    log("triangulated", {k: summary[k] for k in ("points3D", "observations", "mean_track", "mean_reproj_px", "triangulate_s")})

    try:
        imgs = {i: rec.image(i) for i in rec.reg_image_ids()}
        meta = {i: (im.name[:-4].split("_v")[0], int(im.name[:-4].split("_v")[1])) for i, im in imgs.items()}
        centers = {i: np.asarray(im.projection_center()) for i, im in imgs.items()}
        tl, nst, angs, gaps = [], [], [], []
        err_v = {v: [] for v in range(16)}
        pts_st = {}
        img_obs = {i: 0 for i in imgs}
        err_img = {i: [] for i in imgs}
        for pid, p in rec.points3D.items():
            els = p.track.elements
            tl.append(len(els))
            st = set(meta[e.image_id][0] for e in els)
            nst.append(len(st))
            for s in st:
                pts_st[s] = pts_st.get(s, 0) + 1
            if len(st) > 1:
                C = np.array([centers[e.image_id] for e in els])
                r = p.xyz - C
                r /= np.linalg.norm(r, axis=1, keepdims=True)
                a = np.degrees(np.arccos(np.clip(r @ r.T, -1, 1)))
                angs.append(float(a.max()))
                ss = sorted(int(s) for s in st)
                gaps.append(ss[-1] - ss[0])
            for e in els:
                im = imgs[e.image_id]
                pt2 = np.asarray(im.points2D[e.point2D_idx].xy)
                proj = im.project_point(p.xyz)
                if proj is None:
                    continue
                d = float(np.linalg.norm(np.asarray(proj) - pt2))
                v = meta[e.image_id][1]
                err_v[v].append(d)
                img_obs[e.image_id] += 1
                err_img[e.image_id].append(d)
        tl = np.array(tl)
        nst = np.array(nst)
        angs = np.array(angs)
        gaps = np.array(gaps)

        def pct(a, q):
            return float(np.percentile(a, q)) if len(a) else None

        summary["tracks"] = dict(mean_len=float(tl.mean()), median_len=float(np.median(tl)), p95_len=pct(tl, 95),
                                 max_len=int(tl.max()), single_station=int((nst == 1).sum()),
                                 single_station_frac=float((nst == 1).mean()), ge2=int((nst >= 2).sum()),
                                 ge3=int((nst >= 3).sum()), ge5=int((nst >= 5).sum()), max_stations=int(nst.max()))
        summary["tri_angle_deg"] = dict(n=int(len(angs)), median=pct(angs, 50), p10=pct(angs, 10), p90=pct(angs, 90),
                                        lt1_5=float((angs < 1.5).mean()), lt3=float((angs < 3).mean()),
                                        gt10=float((angs > 10).mean()))
        summary["station_span"] = dict(median=pct(gaps, 50), p90=pct(gaps, 90), max=int(gaps.max()) if len(gaps) else None)
        summary["reproj_by_view"] = {
            f"v{v:02d}": dict(yaw=LAYOUT[v][0], pitch=LAYOUT[v][1], n=len(err_v[v]), mean=float(np.mean(err_v[v])),
                              median=float(np.median(err_v[v])), p95=pct(np.array(err_v[v]), 95))
            for v in range(16) if err_v[v]}
        grp = {"horizon": sum((err_v[v] for v in range(8)), []), "up": sum((err_v[v] for v in range(8, 12)), []),
               "down": sum((err_v[v] for v in range(12, 16)), [])}
        summary["reproj_by_group"] = {g: dict(n=len(e), mean=float(np.mean(e)), median=float(np.median(e)),
                                              p95=pct(np.array(e), 95)) for g, e in grp.items() if e}
        pts = np.array([pts_st.get(s, 0) for s in stems])
        io = np.array(list(img_obs.values()))
        summary["per_station_points"] = dict(median=float(np.median(pts)), min=int(pts.min()), max=int(pts.max()),
                                             lt500=int((pts < 500).sum()), values={s: int(pts_st.get(s, 0)) for s in stems})
        summary["per_crop_obs"] = dict(median=float(np.median(io)), min=int(io.min()), lt20=int((io < 20).sum()))
        st_err = {}
        for i, e in err_img.items():
            if e:
                st_err.setdefault(meta[i][0], []).extend(e)
        summary["per_station_mean_reproj"] = {s: float(np.mean(e)) for s, e in st_err.items()}
        summary["per_image_mean_reproj"] = {imgs[i].name: (float(np.mean(e)) if e else None) for i, e in err_img.items()}
    except Exception as exc:  # stats are secondary; always return the core summary
        import traceback
        summary['stats_error'] = f'{type(exc).__name__}: {exc}'
        summary['stats_traceback'] = traceback.format_exc()[-1500:]
    return summary


@app.local_entrypoint()
def main(id_file: str = "modal_call_id.txt"):
    call = run.spawn()
    open(id_file, "w").write(call.object_id)
    print("spawned", call.object_id)
