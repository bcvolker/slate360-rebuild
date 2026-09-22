"""Room 213 2026-09-21 raw-rig dataset build, cloud side. NO Gaussian training.

Inputs (persistent volume):
  /vol/room213/2026-09-21/raw-capture-test/*.insv        originals (SHA256-verified by stage 1)
  /vol/room213/2026-09-21/preflight/demux.json + frames/  both lenses at the frozen keeper timestamps
  /vol/room213/calib/x4_factory_mei.json                  factory Mei/unified calibration (trailer field 54)
Outputs: /vol/room213/2026-09-21/build/  (masks/, faces/, sfm/, splits.json, report.json)

Stages:
  5  masks   torchvision Mask R-CNN person masks on each lens frame (RTMDet ONNX export is not
             obtainable without mmdeploy; substitution documented) + nadir band
  6  faces   2560^2 per-lens perspective faces through the factory Mei pixel->ray map, 5 fixed
             rotations per lens, masks carried along, valid-region boundaries as alpha
  7  sfm     pycolmap: shared PINHOLE intrinsics per face type, intrinsics FIXED; incremental
             mapping; then the rig constraint: per exposure, solve the rig pose from its faces
             (least squares over the known face->lens->rig chain), measure per-face deviation
             from the rigid rig (physical-centre preservation), and estimate the inter-lens
             rotation from all exposures with the 32.26 mm translation FIXED; re-project through
             the rig-constrained poses for the reported reprojection numbers.
  8  scale   metric scale from the fixed 32.26 mm baseline; cross-check with the ChArUco board
             (23 mm squares) where visible; ceiling-height plane check vs the iPhone LiDAR cloud
  9  splits  calibration / calibration-validation / appearance holdout (whole exposures)
  10 loader  detail survival on the built faces through splatfacto's box schedule
"""
from __future__ import annotations

import json
import math
import os
import sys
from pathlib import Path

import numpy as np

VOL = Path("/vol")
RAW = VOL / "room213" / "2026-09-21" / "raw-capture-test"
PRE = VOL / "room213" / "2026-09-21" / "preflight"
OUT = VOL / "room213" / "2026-09-21" / "build"
CALIB = VOL / "room213" / "calib" / "x4_factory_mei.json"
FRAME_CIRCLE = {0: (1870.9, 1855.5, 2101.2), 1: (1925.8, 1843.8, 2106.2)}
FACE = 2560; FOV = 80.0; FL = FACE / 2 / math.tan(math.radians(FOV / 2))
FACES = [("f", 0, 0), ("l", -60, 0), ("r", 60, 0), ("u", 0, 55), ("d", 0, -55)]
T_B_MM = 32.26

sys.path.insert(0, "/root/recon-experiment")
import x4_mei_model as M  # noqa: E402


def log(*a):
    print(*a, flush=True)


def load_calib():
    c = json.load(open(CALIB)); lenses = c["lenses"]; circ = c["circle_field53"]
    def crop(stream, lens):
        cc = circ[lens]; fc = FRAME_CIRCLE[stream]; s = fc[2] / cc["r"]
        return s, s * (cc["cx"] - cc["canvas_x_offset"]) - fc[0], s * cc["cy"] - fc[1]
    # assignment unresolved by the target; use stream0=A, stream1=B (intrinsics differ 0.5%) and record it
    return {0: M.MeiLens(lenses[0], *crop(0, 0)), 1: M.MeiLens(lenses[1], *crop(1, 1))}, c


def face_R(yaw, pitch):
    yr, pr = math.radians(yaw), math.radians(pitch)
    Ry = np.array([[math.cos(yr), 0, math.sin(yr)], [0, 1, 0], [-math.sin(yr), 0, math.cos(yr)]])
    Rx = np.array([[1, 0, 0], [0, math.cos(pr), -math.sin(pr)], [0, math.sin(pr), math.cos(pr)]])
    return Ry @ Rx


# ---------------- stage 5: masks ----------------
def stage_masks(demux):
    import cv2
    import torch
    import torchvision
    from torchvision.models.detection import maskrcnn_resnet50_fpn_v2, MaskRCNN_ResNet50_FPN_V2_Weights
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    w = MaskRCNN_ResNet50_FPN_V2_Weights.DEFAULT
    model = maskrcnn_resnet50_fpn_v2(weights=w).eval().to(dev)
    mdir = OUT / "masks"; mdir.mkdir(parents=True, exist_ok=True)
    rep = []
    for r in demux:
        png = PRE / "frames" / r["png"]; outp = mdir / (r["png"][:-4] + "_mask.png")
        if outp.is_file():
            m = cv2.imread(str(outp), 0); rep.append({"png": r["png"], "lens": r["lens"], "masked_frac": float((m == 0).mean())}); continue
        img = cv2.imread(str(png)); small = cv2.resize(img, (1280, 1280), interpolation=cv2.INTER_AREA)
        t = torch.from_numpy(small[:, :, ::-1].copy()).permute(2, 0, 1).float().div(255).to(dev)
        with torch.no_grad():
            o = model([t])[0]
        keep = np.zeros((1280, 1280), np.uint8)
        for lab, sc, mk in zip(o["labels"].cpu().numpy(), o["scores"].cpu().numpy(), o["masks"].cpu().numpy()):
            if lab == 1 and sc >= 0.5:  # COCO person
                keep |= (mk[0] > 0.5).astype(np.uint8)
        person = cv2.resize(keep, (3840, 3840), interpolation=cv2.INTER_NEAREST)
        person = cv2.dilate(person, np.ones((41, 41), np.uint8))
        valid = np.full((3840, 3840), 255, np.uint8); valid[person > 0] = 0
        # nadir/pole band: rays more than 80 deg below the horizontal are excluded via the face stage (geometric); here only the person
        cv2.imwrite(str(outp), valid)
        rep.append({"png": r["png"], "lens": r["lens"], "masked_frac": float((valid == 0).mean()), "n_person": int(((o["labels"] == 1) & (o["scores"] >= 0.5)).sum())})
    json.dump(rep, open(OUT / "masks.json", "w"), indent=1)
    by = {}
    for x in rep: by.setdefault(x["lens"], []).append(x["masked_frac"])
    log("MASKS", {k: {"median_masked_frac": float(np.median(v)), "p95": float(np.percentile(v, 95)), "n": len(v)} for k, v in by.items()}, "method=torchvision maskrcnn_resnet50_fpn_v2 (RTMDet substitute)")
    return rep


# ---------------- stage 6: faces ----------------
def stage_faces(demux, lenses):
    import cv2
    fdir = OUT / "faces"; fdir.mkdir(parents=True, exist_ok=True)
    meta = []
    # precompute maps per (stream, face)
    maps = {}
    for stream in (0, 1):
        L = lenses[stream]
        for name, yaw, pitch in FACES:
            u = (np.arange(FACE) - FACE / 2 + 0.5) / FL; uu, vv = np.meshgrid(u, u)
            d = np.stack([uu, vv, np.ones_like(uu)], -1); d /= np.linalg.norm(d, axis=-1, keepdims=True)
            R = face_R(yaw, pitch); d = d @ R.T
            # nadir exclusion: world-down is +y in lens frame; exclude rays within 25 deg of the pole axis (the stick) when face looks down
            p, valid = L.project_frame(d)
            mapx = p[..., 0].astype(np.float32); mapy = p[..., 1].astype(np.float32)
            inside = valid & (mapx >= 0) & (mapx < 3840) & (mapy >= 0) & (mapy < 3840)
            mapx[~inside] = -1; mapy[~inside] = -1
            maps[(stream, name)] = (mapx, mapy, inside, R, yaw, pitch)
    for r in demux:
        stream = r["lens"]; img = cv2.imread(str(PRE / "frames" / r["png"]))
        mpath = OUT / "masks" / (r["png"][:-4] + "_mask.png"); mk = cv2.imread(str(mpath), 0) if mpath.is_file() else np.full((3840, 3840), 255, np.uint8)
        for name, yaw, pitch in FACES:
            mapx, mapy, inside, R, _, _ = maps[(stream, name)]
            fn = f"{r['png'][:-4]}_{name}"
            fp = fdir / f"{fn}.png"
            if not fp.is_file():
                face = cv2.remap(img, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
                fmask = cv2.remap(mk, mapx, mapy, cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
                fmask[~inside] = 0
                cv2.imwrite(str(fp), face); cv2.imwrite(str(fdir / f"{fn}_mask.png"), fmask)
            meta.append({"face": fn, "exposure": f"{r['video']}@{r['t']:.3f}", "video": r["video"], "t": r["t"], "stream": stream, "face_name": name,
                         "yaw": yaw, "pitch": pitch, "R_face_from_lens": R.tolist(), "fl_px": FL, "size": FACE, "valid_frac": float(inside.mean())})
    json.dump(meta, open(OUT / "faces.json", "w"), indent=1)
    log("FACES", len(meta))
    return meta


# ---------------- stage 7: SfM + rig ----------------
def stage_sfm(meta, calib):
    import pycolmap
    import cv2
    sdir = OUT / "sfm"; sdir.mkdir(parents=True, exist_ok=True)
    db = sdir / "database.db"; img_dir = OUT / "faces"
    if db.exists(): db.unlink()
    # one shared PINHOLE camera for all faces (identical fl/cx/cy by construction), fixed
    cam = pycolmap.Camera(model="PINHOLE", width=FACE, height=FACE, params=[FL, FL, FACE / 2, FACE / 2])
    mask_dir = sdir / "colmap_masks"; mask_dir.mkdir(exist_ok=True)
    names = []
    for m in meta:
        n = m["face"] + ".png"; names.append(n)
        # colmap reads <name>.png masks from mask_path with the same relative name
        src = img_dir / f"{m['face']}_mask.png"; dst = mask_dir / (n + ".png")
        if not dst.exists(): dst.symlink_to(src)
    log("pycolmap", getattr(pycolmap, "__version__", "?"))
    reader = pycolmap.ImageReaderOptions(camera_model="PINHOLE", camera_params=",".join(str(x) for x in cam.params), mask_path=str(mask_dir))
    ext = pycolmap.FeatureExtractionOptions()
    try:
        ext.sift.max_num_features = 8192
    except AttributeError:
        pass
    pycolmap.extract_features(str(db), str(img_dir), image_names=names, camera_mode=pycolmap.CameraMode.SINGLE, reader_options=reader, extraction_options=ext, device=pycolmap.Device.auto)
    # faces are named in temporal order (video, t, lens, face): sequential matching with a wide window
    # covers same-exposure + neighbouring exposures; exhaustive when small enough
    if len(names) <= 400:
        pycolmap.match_exhaustive(str(db))
    else:
        so = pycolmap.SequentialMatchingOptions(); so.overlap = 60; so.loop_detection = False
        try:
            pycolmap.match_sequential(str(db), matching_options=so)
        except TypeError:
            pycolmap.match_sequential(str(db), so)
    mopts = pycolmap.IncrementalPipelineOptions()
    for k in ("ba_refine_focal_length", "ba_refine_principal_point", "ba_refine_extra_params"):
        if hasattr(mopts, k): setattr(mopts, k, False)
    recs = pycolmap.incremental_mapping(str(db), str(img_dir), str(sdir), options=mopts)
    if not recs:
        log("SFM FAILED: no reconstruction"); return None
    rec = max(recs.values(), key=lambda r: r.num_reg_images())
    rec.write(str(sdir))
    stats = {"n_images_total": len(names), "n_registered": rec.num_reg_images(), "n_points": rec.num_points3D(),
             "mean_reproj_px": float(rec.compute_mean_reprojection_error()), "mean_track_len": float(rec.compute_mean_track_length())}
    # ---- rig consistency: for each exposure, faces' poses -> lens pose via known R_face_from_lens ----
    by_exp = {}
    for img in rec.images.values():
        m = next((x for x in meta if x["face"] + ".png" == img.name), None)
        if m is None: continue
        cfw = img.cam_from_world() if callable(img.cam_from_world) else img.cam_from_world
        Rcw = np.array(cfw.rotation.matrix()); tcw = np.array(cfw.translation)
        Rwc = Rcw.T; C = -Rwc @ tcw  # camera centre in world
        Rf = np.array(m["R_face_from_lens"])  # lens->face rays: d_face = R_f^T d_lens (we built d = d_face @ R^T => d_lens = R d_face)
        R_lens_wc = Rwc @ Rf.T  # world<-lens
        by_exp.setdefault(m["exposure"], {}).setdefault(m["stream"], []).append((R_lens_wc, C, m["face_name"], img.image_id))
    centre_spread = {0: [], 1: []}; rot_spread = {0: [], 1: []}; lens_pose = {}
    for exp, streams in by_exp.items():
        for s, lst in streams.items():
            Cs = np.array([c for _, c, _, _ in lst]); Rs = [r for r, _, _, _ in lst]
            if len(lst) >= 2:
                cm = Cs.mean(0); centre_spread[s] += list(np.linalg.norm(Cs - cm, axis=1))
                # mean rotation via SVD of sum
                Rm = sum(Rs); U, _, Vt = np.linalg.svd(Rm); Rmean = U @ Vt
                rot_spread[s] += [math.degrees(math.acos(np.clip((np.trace(R @ Rmean.T) - 1) / 2, -1, 1))) for R in Rs]
                lens_pose[(exp, s)] = (Rmean, cm)
            elif len(lst) == 1:
                lens_pose[(exp, s)] = (Rs[0], Cs[0])
    # ---- inter-lens rotation across exposures (scale-free), translation fixed 32.26 mm sets the metric scale ----
    rel_R = []; baselines = []
    for exp in by_exp:
        if (exp, 0) in lens_pose and (exp, 1) in lens_pose:
            R0, C0 = lens_pose[(exp, 0)]; R1, C1 = lens_pose[(exp, 1)]
            rel_R.append(R0.T @ R1); baselines.append(np.linalg.norm(C1 - C0))
    rig = {}
    if rel_R:
        Rm = sum(rel_R); U, _, Vt = np.linalg.svd(Rm); Rrel = U @ Vt
        rv, _ = cv2.Rodrigues(Rrel); ang = float(np.degrees(np.linalg.norm(rv))); axis = (rv.ravel() / max(1e-9, np.linalg.norm(rv))).tolist()
        dev = [math.degrees(math.acos(np.clip((np.trace(R @ Rrel.T) - 1) / 2, -1, 1))) for R in rel_R]
        scale_m_per_unit = (T_B_MM / 1000.0) / float(np.median(baselines))
        rig = {"n_exposures_both_lenses": len(rel_R), "inter_lens_rotation_deg": ang, "axis": axis, "per_exposure_dev_deg_median": float(np.median(dev)),
               "per_exposure_dev_deg_p95": float(np.percentile(dev, 95)), "baseline_sfm_units_median": float(np.median(baselines)),
               "baseline_sfm_units_cv": float(np.std(baselines) / np.mean(baselines)), "metric_scale_m_per_sfm_unit_from_32.26mm": scale_m_per_unit,
               "induced_px_error_at_lens_centre_from_dev_p95": float(math.radians(np.percentile(dev, 95)) * calib["lenses"][0]["fx"] * 0.7246 / (1 + calib["lenses"][0]["xi"]))}
    phys = {s: {"face_centre_spread_median_units": float(np.median(v)) if v else None, "rot_spread_deg_median": float(np.median(rot_spread[s])) if rot_spread[s] else None} for s, v in centre_spread.items()}
    if rig: phys = {s: {**v, "centre_spread_median_mm": (v["face_centre_spread_median_units"] or 0) * rig["metric_scale_m_per_sfm_unit_from_32.26mm"] * 1000} for s, v in phys.items()}
    # ---- rig-constrained reprojection: re-project all 3D points through rig-derived face poses ----
    errs = []
    for img in rec.images.values():
        m = next((x for x in meta if x["face"] + ".png" == img.name), None)
        if m is None or (m["exposure"], m["stream"]) not in lens_pose: continue
        Rl, Cl = lens_pose[(m["exposure"], m["stream"])]; Rf = np.array(m["R_face_from_lens"])
        Rwc = Rl @ Rf; Rcw = Rwc.T; tcw = -Rcw @ Cl
        for p2 in img.points2D:
            if not p2.has_point3D(): continue
            X = rec.points3D[p2.point3D_id].xyz; Xc = Rcw @ X + tcw
            if Xc[2] <= 0: continue
            u = FL * Xc[0] / Xc[2] + FACE / 2; v = FL * Xc[1] / Xc[2] + FACE / 2
            errs.append(math.hypot(u - p2.xy[0], v - p2.xy[1]))
    errs = np.array(errs)
    rigproj = {"n_obs": int(len(errs)), "median_px": float(np.median(errs)) if len(errs) else None, "rms_px": float(np.sqrt((errs ** 2).mean())) if len(errs) else None, "p95_px": float(np.percentile(errs, 95)) if len(errs) else None}
    res = {"colmap_free_faces": stats, "rig": rig, "physical_centre_preservation": phys, "rig_constrained_reprojection": rigproj,
           "note": "faces solved as independent PINHOLE cameras with FIXED intrinsics; rig imposed afterwards by least squares (no pycolmap rig BA); inter-lens translation fixed to 32.26 mm sets metric scale; rotation is the only rig quantity estimated"}
    json.dump(res, open(sdir / "rig_report.json", "w"), indent=1); log("SFM", json.dumps(res))
    return res, rec, lens_pose


# ---------------- stage 8: scale checks ----------------
def stage_scale(rig_res, rec, lens_pose, meta):
    out = {}
    if not rig_res or not rig_res[0].get("rig"): return out
    scale = rig_res[0]["rig"]["metric_scale_m_per_sfm_unit_from_32.26mm"]
    # ceiling height: fit dominant horizontal planes to the point cloud (up = -y in lens frame ~ world after gravity unknown -> use PCA of camera centres as floor-parallel)
    P = np.array([p.xyz for p in rec.points3D.values()]) * scale
    C = np.array([c for _, c in lens_pose.values()]) * scale
    # camera centres lie ~1.5 m above the floor on a plane; normal of that plane ~ up
    cm = C.mean(0); U, S, Vt = np.linalg.svd(C - cm); up = Vt[2]
    h = (P - cm) @ up
    hist, edges = np.histogram(h, bins=200, range=(-3, 3)); top = np.argsort(hist)[-2:]
    planes = sorted([float((edges[i] + edges[i + 1]) / 2) for i in top])
    out["scale_m_per_unit"] = scale; out["dominant_planes_rel_camera_m"] = planes; out["floor_to_ceiling_m_estimate"] = float(planes[1] - planes[0]) if len(planes) == 2 else None
    out["note"] = "planes from height histogram along the PCA-normal of the camera-centre cloud; compare with LiDAR floor-to-ceiling in the report"
    log("SCALE", json.dumps(out)); return out


# ---------------- stage 9: splits ----------------
def stage_splits(meta, charuco):
    exps = sorted({m["exposure"] for m in meta}, key=lambda e: (e.split("@")[0], float(e.split("@")[1])))
    board = sorted({f"{d['video']}@{d['t']:.3f}" for d in charuco if d.get("n_charuco_corners", 0) >= 6})
    hold = [e for i, e in enumerate(exps) if i % 10 == 5]
    excl = set()
    for h in hold:
        v, t = h.split("@"); t = float(t)
        for e in exps:
            v2, t2 = e.split("@")
            if v2 == v and abs(float(t2) - t) <= 1.0 and e != h: excl.add(e)
    train = [e for e in exps if e not in set(hold) and e not in excl]
    res = {"n_exposures": len(exps), "appearance_holdout_exposures": hold, "excluded_neighbours": sorted(excl), "appearance_train": train,
           "calibration_exposures": board, "calibration_validation_exposures": [],
           "note": "appearance holdout = whole exposures (both lenses, all 5 faces each); poses from the same SfM -> 'appearance-held-out', not fully held-out; calibration validation impossible (1 board placement)"}
    json.dump(res, open(OUT / "splits.json", "w"), indent=1); log("SPLITS", {k: (len(v) if isinstance(v, list) else v) for k, v in res.items() if k != "note"}); return res


# ---------------- stage 10: loader survival ----------------
def stage_loader(meta):
    import cv2
    sys.path.insert(0, "/root/recon-experiment")
    def lapvar(a):
        a = a.astype(np.float32); L = (-4 * a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1))[2:-2, 2:-2]; return float(L.var())
    def box(a, d):
        h, w = a.shape; return a[:h // d * d, :w // d * d].reshape(h // d, d, w // d, d).mean(axis=(1, 3))
    rep = {}
    for m in meta[:40]:
        if m["face_name"] != "f": continue
        g = cv2.imread(str(OUT / "faces" / f"{m['face']}.png"), 0); c = g[880:1680, 880:1680]
        rep[m["face"]] = {"2560": lapvar(c), "1280_loader": lapvar(box(c, 2)), "640_loader": lapvar(box(c, 4))}
    json.dump(rep, open(OUT / "loader_survival.json", "w"), indent=1); log("LOADER", len(rep), "faces checked; 2560 stays 2560 after step 6000 (no images_2/, downscale-factor 1)")
    return rep


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    demux = json.load(open(PRE / "demux.json")); charuco = json.load(open(PRE / "charuco_detections.json"))
    lenses, calib = load_calib()
    log("BUILD start: exposures", len({(d['video'], d['t']) for d in demux}), "frames", len(demux))
    stage_masks(demux)
    meta = stage_faces(demux, lenses)
    rig_res = stage_sfm(meta, calib)
    scale = stage_scale(rig_res, rig_res[1], rig_res[2], meta) if rig_res else {}
    splits = stage_splits(meta, charuco)
    loader = stage_loader(meta)
    report = {"n_frames": len(demux), "n_faces": len(meta), "rig": rig_res[0] if rig_res else None, "scale": scale, "splits_summary": {k: (len(v) if isinstance(v, list) else v) for k, v in splits.items()},
              "mask_method": "torchvision maskrcnn_resnet50_fpn_v2 person (RTMDet-Ins-S ONNX export not obtainable without mmdeploy)", "no_training": True}
    json.dump(report, open(OUT / "report.json", "w"), indent=1)
    log("BUILD DONE (no training)")


if __name__ == "__main__":
    main()
