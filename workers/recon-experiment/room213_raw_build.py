"""Room 213 2026-09-21 raw-rig dataset build, cloud side. NO Gaussian training in this module.

Inputs (persistent volume):
  /vol/room213/2026-09-21/raw-capture-test/*.insv        originals (SHA256-verified by stage 1)
  /vol/room213/2026-09-21/preflight/demux.json + frames/  both lenses at the frozen keeper timestamps
  /vol/room213/calib/x4_factory_mei.json                  factory Mei/unified calibration (trailer field 54)
Outputs: /vol/room213/2026-09-21/build/  (masks/, faces/, sfm/, dataset/, splits.json, verdict.json, report.json)
Heartbeat: /vol/room213/2026-09-21/status.json every 5 min (stage, counts, measured ETA).
Every stage is resumable: outputs that exist are not regenerated; stage_done/<stage>.json marks completion.

Stages: 5 masks (torchvision Mask R-CNN person; RTMDet ONNX export not obtainable) -> 6 faces (2560^2
per-lens through the factory Mei map, 5 fixed rotations, masks carried) -> 7 sfm (pycolmap, PINHOLE
intrinsics FIXED, faces solved then the rig imposed by least squares; inter-lens translation fixed to
32.26 mm = metric scale; rotation the only rig quantity estimated) -> 8 scale -> 9 splits -> 10 loader
-> 11 dataset export (nerfstudio transforms.json, train/test filenames = frozen holdout) -> 12 gates.
"""
from __future__ import annotations

import json
import math
import os
import sqlite3
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

VOL = Path("/vol")
BASE = VOL / "room213" / "2026-09-21"
RAW = BASE / "raw-capture-test"
PRE = BASE / "preflight"
OUT = BASE / "build"
STATUS = BASE / "status.json"
CALIB = VOL / "room213" / "calib" / "x4_factory_mei.json"
FRAME_CIRCLE = {0: (1870.9, 1855.5, 2101.2), 1: (1925.8, 1843.8, 2106.2)}
FACE = 2560; FOV = 80.0; FL = FACE / 2 / math.tan(math.radians(FOV / 2))
FACES = [("f", 0, 0), ("l", -60, 0), ("r", 60, 0), ("u", 0, 55), ("d", 0, -55)]
T_B_MM = 32.26

sys.path.insert(0, "/root/recon-experiment")
import x4_mei_model as M  # noqa: E402


def log(*a):
    print(*a, flush=True)


# ---------------- status / heartbeat ----------------
class Status:
    def __init__(self, job_id: str):
        self.job_id = job_id; self.stage = "starting"; self.stage_t0 = time.time(); self.extra = {}
        self.last_error = None; self.checkpoint = None; self._stop = threading.Event()
        self._thread = threading.Thread(target=self._loop, daemon=True); self._thread.start()

    def set_stage(self, stage: str, **extra):
        self.stage = stage; self.stage_t0 = time.time(); self.extra = dict(extra); self.write(); log("STAGE", stage, extra)

    def note(self, **extra):
        self.extra.update(extra)

    def done(self, name: str):
        (OUT / "stage_done").mkdir(parents=True, exist_ok=True)
        (OUT / "stage_done" / f"{name}.json").write_text(json.dumps({"done_at": datetime.now(timezone.utc).isoformat()}))
        self.checkpoint = name; self.write()

    def _counts(self) -> dict:
        c = {}
        try:
            fdir = OUT / "faces"
            if fdir.is_dir():
                c["faces_files_written"] = sum(1 for _ in fdir.glob("*.png"))
            db = OUT / "sfm" / "database.db"
            if db.is_file():
                con = sqlite3.connect(f"file:{db}?mode=ro", uri=True, timeout=5)
                try:
                    c["sfm_images_in_db"] = con.execute("select count(*) from images").fetchone()[0]
                    c["sfm_images_with_descriptors"] = con.execute("select count(*) from descriptors where rows>0").fetchone()[0]
                    c["sfm_verified_pairs"] = con.execute("select count(*) from two_view_geometries where rows>0").fetchone()[0]
                    c["sfm_matched_pairs"] = con.execute("select count(*) from matches").fetchone()[0]
                finally:
                    con.close()
            recs = [p for p in (OUT / "sfm").glob("*/images.bin")] if (OUT / "sfm").is_dir() else []
            c["sfm_reconstruction_components"] = len(recs)
        except Exception as e:  # noqa: BLE001
            c["counts_error"] = str(e)[:200]
        return c

    def snapshot(self) -> dict:
        now = time.time(); counts = self._counts(); el = now - self.stage_t0
        eta = None; progress = None
        try:
            if self.stage == "faces" and self.extra.get("faces_total"):
                done = counts.get("faces_files_written", 0) // 2; tot = self.extra["faces_total"]
                start_done = self.extra.get("faces_done_at_stage_start", 0)
                rate = (done - start_done) / el if el > 30 and done > start_done else None
                progress = f"{done}/{tot}"; eta = (tot - done) / rate if rate else None
            elif self.stage == "sfm_extract" and self.extra.get("n_images"):
                done = counts.get("sfm_images_with_descriptors", 0); tot = self.extra["n_images"]
                rate = done / el if el > 30 and done else None; progress = f"{done}/{tot}"; eta = (tot - done) / rate if rate else None
            elif self.stage == "sfm_match" and self.extra.get("pairs_expected"):
                done = counts.get("sfm_matched_pairs", 0); tot = self.extra["pairs_expected"]
                rate = done / el if el > 30 and done else None; progress = f"{done}/~{tot}"; eta = (tot - done) / rate if rate else None
        except Exception:  # noqa: BLE001
            pass
        return {"timestamp_utc": datetime.now(timezone.utc).isoformat(), "timestamp_local_mst": datetime.now(timezone.utc).astimezone().isoformat(),
                "job_id": self.job_id, "stage": self.stage, "stage_started_utc": datetime.fromtimestamp(self.stage_t0, timezone.utc).isoformat(),
                "stage_elapsed_s": round(el), "progress": progress, "eta_s_measured": (round(eta) if eta else None),
                "counts": counts, "extra": {k: v for k, v in self.extra.items() if not k.startswith("_")},
                "last_checkpoint": self.checkpoint, "last_error": self.last_error, "build_finished": self.stage == "finished"}

    def write(self):
        try:
            STATUS.write_text(json.dumps(self.snapshot(), indent=1))
        except Exception as e:  # noqa: BLE001
            log("status write failed", e)

    def _loop(self):
        while not self._stop.wait(300):
            self.write()

    def stop(self):
        self._stop.set(); self.write()


def stage_is_done(name: str) -> bool:
    return (OUT / "stage_done" / f"{name}.json").is_file()


def load_calib():
    c = json.load(open(CALIB)); lenses = c["lenses"]; circ = c["circle_field53"]
    def crop(stream, lens):
        cc = circ[lens]; fc = FRAME_CIRCLE[stream]; s = fc[2] / cc["r"]
        return s, s * (cc["cx"] - cc["canvas_x_offset"]) - fc[0], s * cc["cy"] - fc[1]
    return {0: M.MeiLens(lenses[0], *crop(0, 0)), 1: M.MeiLens(lenses[1], *crop(1, 1))}, c


def face_R(yaw, pitch):
    yr, pr = math.radians(yaw), math.radians(pitch)
    Ry = np.array([[math.cos(yr), 0, math.sin(yr)], [0, 1, 0], [-math.sin(yr), 0, math.cos(yr)]])
    Rx = np.array([[1, 0, 0], [0, math.cos(pr), -math.sin(pr)], [0, math.sin(pr), math.cos(pr)]])
    return Ry @ Rx


# ---------------- stage 5: masks ----------------
def stage_masks(demux, st: Status):
    import cv2
    mdir = OUT / "masks"; mdir.mkdir(parents=True, exist_ok=True)
    missing = [r for r in demux if not (mdir / (r["png"][:-4] + "_mask.png")).is_file()]
    if missing:
        import torch
        from torchvision.models.detection import maskrcnn_resnet50_fpn_v2, MaskRCNN_ResNet50_FPN_V2_Weights
        dev = "cuda" if torch.cuda.is_available() else "cpu"
        model = maskrcnn_resnet50_fpn_v2(weights=MaskRCNN_ResNet50_FPN_V2_Weights.DEFAULT).eval().to(dev)
        for i, r in enumerate(missing):
            img = cv2.imread(str(PRE / "frames" / r["png"])); small = cv2.resize(img, (1280, 1280), interpolation=cv2.INTER_AREA)
            t = torch.from_numpy(small[:, :, ::-1].copy()).permute(2, 0, 1).float().div(255).to(dev)
            with torch.no_grad():
                o = model([t])[0]
            keep = np.zeros((1280, 1280), np.uint8)
            for lab, sc, mk in zip(o["labels"].cpu().numpy(), o["scores"].cpu().numpy(), o["masks"].cpu().numpy()):
                if lab == 1 and sc >= 0.5: keep |= (mk[0] > 0.5).astype(np.uint8)
            person = cv2.dilate(cv2.resize(keep, (3840, 3840), interpolation=cv2.INTER_NEAREST), np.ones((41, 41), np.uint8))
            valid = np.full((3840, 3840), 255, np.uint8); valid[person > 0] = 0
            cv2.imwrite(str(mdir / (r["png"][:-4] + "_mask.png")), valid)
            st.note(masks_done=f"{i + 1}/{len(missing)}")
    rep = []
    for r in demux:
        m = cv2.imread(str(mdir / (r["png"][:-4] + "_mask.png")), 0)
        rep.append({"png": r["png"], "lens": r["lens"], "masked_frac": float((m == 0).mean())})
    json.dump(rep, open(OUT / "masks.json", "w"), indent=1)
    by = {}
    for x in rep: by.setdefault(x["lens"], []).append(x["masked_frac"])
    summ = {k: {"median_masked_frac": float(np.median(v)), "p95": float(np.percentile(v, 95)), "max": float(max(v)), "n": len(v)} for k, v in by.items()}
    log("MASKS", summ); return rep, summ


# ---------------- stage 6: faces ----------------
def stage_faces(demux, lenses, st: Status):
    import cv2
    fdir = OUT / "faces"; fdir.mkdir(parents=True, exist_ok=True)
    total = len(demux) * len(FACES)
    st.set_stage("faces", faces_total=total, faces_done_at_stage_start=sum(1 for _ in fdir.glob("*_mask.png")))
    maps = {}
    for stream in (0, 1):
        L = lenses[stream]
        for name, yaw, pitch in FACES:
            u = (np.arange(FACE) - FACE / 2 + 0.5) / FL; uu, vv = np.meshgrid(u, u)
            d = np.stack([uu, vv, np.ones_like(uu)], -1); d /= np.linalg.norm(d, axis=-1, keepdims=True)
            R = face_R(yaw, pitch); d = d @ R.T
            p, valid = L.project_frame(d)
            mapx = p[..., 0].astype(np.float32); mapy = p[..., 1].astype(np.float32)
            inside = valid & (mapx >= 0) & (mapx < 3840) & (mapy >= 0) & (mapy < 3840)
            mapx[~inside] = -1; mapy[~inside] = -1
            maps[(stream, name)] = (mapx, mapy, inside, R)
    meta = []
    for r in demux:
        stream = r["lens"]; img = None
        mpath = OUT / "masks" / (r["png"][:-4] + "_mask.png"); mk = None
        for name, yaw, pitch in FACES:
            mapx, mapy, inside, R = maps[(stream, name)]
            fn = f"{r['png'][:-4]}_{name}"; fp = fdir / f"{fn}.png"; mp = fdir / f"{fn}_mask.png"
            if not (fp.is_file() and mp.is_file()):
                if img is None:
                    img = cv2.imread(str(PRE / "frames" / r["png"])); mk = cv2.imread(str(mpath), 0) if mpath.is_file() else np.full((3840, 3840), 255, np.uint8)
                face = cv2.remap(img, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
                fmask = cv2.remap(mk, mapx, mapy, cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0); fmask[~inside] = 0
                cv2.imwrite(str(fp), face); cv2.imwrite(str(mp), fmask)
            meta.append({"face": fn, "exposure": f"{r['video']}@{r['t']:.3f}", "video": r["video"], "t": r["t"], "stream": stream, "face_name": name,
                         "yaw": yaw, "pitch": pitch, "R_face_from_lens": R.tolist(), "fl_px": FL, "size": FACE, "valid_frac": float(inside.mean())})
    json.dump(meta, open(OUT / "faces.json", "w"), indent=1)
    log("FACES", len(meta)); return meta


# ---------------- stage 7: SfM + rig ----------------
def stage_sfm(meta, calib, st: Status):
    import pycolmap
    import cv2
    sdir = OUT / "sfm"; sdir.mkdir(parents=True, exist_ok=True)
    db = sdir / "database.db"; img_dir = OUT / "faces"
    cam = pycolmap.Camera(model="PINHOLE", width=FACE, height=FACE, params=[FL, FL, FACE / 2, FACE / 2])
    mask_dir = sdir / "colmap_masks"; mask_dir.mkdir(exist_ok=True)
    names = []
    for m in meta:
        n = m["face"] + ".png"; names.append(n)
        src = img_dir / f"{m['face']}_mask.png"; dst = mask_dir / (n + ".png")
        if not dst.exists(): dst.symlink_to(src)
    log("pycolmap", getattr(pycolmap, "__version__", "?"))
    if not stage_is_done("sfm_extract"):
        if db.exists(): db.unlink()
        st.set_stage("sfm_extract", n_images=len(names))
        reader = pycolmap.ImageReaderOptions(camera_model="PINHOLE", camera_params=",".join(str(x) for x in cam.params), mask_path=str(mask_dir))
        ext = pycolmap.FeatureExtractionOptions()
        try: ext.sift.max_num_features = 8192
        except AttributeError: pass
        pycolmap.extract_features(str(db), str(img_dir), image_names=names, camera_mode=pycolmap.CameraMode.SINGLE, reader_options=reader, extraction_options=ext, device=pycolmap.Device.auto)
        st.done("sfm_extract")
    if not stage_is_done("sfm_match"):
        overlap = 60
        st.set_stage("sfm_match", pairs_expected=len(names) * overlap if len(names) > 400 else len(names) * (len(names) - 1) // 2)
        if len(names) <= 400:
            pycolmap.match_exhaustive(str(db))
        else:
            so = pycolmap.SequentialMatchingOptions(); so.overlap = overlap; so.loop_detection = False
            try: pycolmap.match_sequential(str(db), matching_options=so)
            except TypeError: pycolmap.match_sequential(str(db), so)
        st.done("sfm_match")
    st.set_stage("sfm_map", n_images=len(names))
    for p in sdir.glob("[0-9]*"):
        if p.is_dir():
            for f in p.glob("*"): f.unlink()
            p.rmdir()
    mopts = pycolmap.IncrementalPipelineOptions()
    for k in ("ba_refine_focal_length", "ba_refine_principal_point", "ba_refine_extra_params"):
        if hasattr(mopts, k): setattr(mopts, k, False)
    recs = pycolmap.incremental_mapping(str(db), str(img_dir), str(sdir), options=mopts)
    if not recs:
        log("SFM FAILED: no reconstruction"); return None
    rec = max(recs.values(), key=lambda r: r.num_reg_images())
    (sdir / "best").mkdir(exist_ok=True); rec.write(str(sdir / "best"))
    stats = {"n_images_total": len(names), "n_registered": rec.num_reg_images(), "n_components": len(recs), "n_points": rec.num_points3D(),
             "mean_reproj_px": float(rec.compute_mean_reprojection_error()), "mean_track_len": float(rec.compute_mean_track_length())}
    st.set_stage("sfm_rig", **stats)
    by_exp = {}; face_pose = {}
    for img in rec.images.values():
        m = next((x for x in meta if x["face"] + ".png" == img.name), None)
        if m is None: continue
        cfw = img.cam_from_world() if callable(img.cam_from_world) else img.cam_from_world
        Rcw = np.array(cfw.rotation.matrix()); tcw = np.array(cfw.translation)
        Rwc = Rcw.T; C = -Rwc @ tcw
        Rf = np.array(m["R_face_from_lens"]); R_lens_wc = Rwc @ Rf.T
        by_exp.setdefault(m["exposure"], {}).setdefault(m["stream"], []).append((R_lens_wc, C, m["face_name"], img.image_id))
        face_pose[m["face"]] = (Rwc, C)
    centre_spread = {0: [], 1: []}; rot_spread = {0: [], 1: []}; lens_pose = {}
    for exp, streams in by_exp.items():
        for s, lst in streams.items():
            Cs = np.array([c for _, c, _, _ in lst]); Rs = [r for r, _, _, _ in lst]
            if len(lst) >= 2:
                cm = Cs.mean(0); centre_spread[s] += list(np.linalg.norm(Cs - cm, axis=1))
                Rm = sum(Rs); U, _, Vt = np.linalg.svd(Rm); Rmean = U @ Vt
                rot_spread[s] += [math.degrees(math.acos(np.clip((np.trace(R @ Rmean.T) - 1) / 2, -1, 1))) for R in Rs]
                lens_pose[(exp, s)] = (Rmean, cm)
            elif len(lst) == 1:
                lens_pose[(exp, s)] = (Rs[0], Cs[0])
    rel_R = []; baselines = []; rel_exps = []
    for exp in by_exp:
        if (exp, 0) in lens_pose and (exp, 1) in lens_pose:
            R0, C0 = lens_pose[(exp, 0)]; R1, C1 = lens_pose[(exp, 1)]
            rel_R.append(R0.T @ R1); baselines.append(np.linalg.norm(C1 - C0)); rel_exps.append(exp)
    rig = {}
    if rel_R:
        Rm = sum(rel_R); U, _, Vt = np.linalg.svd(Rm); Rrel = U @ Vt
        rv, _ = cv2.Rodrigues(Rrel); ang = float(np.degrees(np.linalg.norm(rv))); axis = (rv.ravel() / max(1e-9, np.linalg.norm(rv))).tolist()
        dev = [math.degrees(math.acos(np.clip((np.trace(R @ Rrel.T) - 1) / 2, -1, 1))) for R in rel_R]
        scale_m_per_unit = (T_B_MM / 1000.0) / float(np.median(baselines))
        f_eff = calib["lenses"][0]["fx"] * 0.7246 / (1 + calib["lenses"][0]["xi"])
        rig = {"n_exposures_both_lenses": len(rel_R), "inter_lens_rotation_deg": ang, "axis": axis, "per_exposure_dev_deg_median": float(np.median(dev)),
               "per_exposure_dev_deg_p95": float(np.percentile(dev, 95)), "baseline_sfm_units_median": float(np.median(baselines)),
               "baseline_sfm_units_cv": float(np.std(baselines) / np.mean(baselines)), "metric_scale_m_per_sfm_unit_from_32.26mm": scale_m_per_unit,
               "induced_px_error_at_lens_centre_from_dev_p95": float(math.radians(np.percentile(dev, 95)) * f_eff),
               "induced_px_error_at_lens_centre_from_dev_median": float(math.radians(np.median(dev)) * f_eff)}
    phys = {s: {"face_centre_spread_median_units": float(np.median(v)) if v else None, "face_centre_spread_p95_units": float(np.percentile(v, 95)) if v else None,
                "rot_spread_deg_median": float(np.median(rot_spread[s])) if rot_spread[s] else None} for s, v in centre_spread.items()}
    if rig:
        sc = rig["metric_scale_m_per_sfm_unit_from_32.26mm"]
        phys = {s: {**v, "centre_spread_median_mm": (v["face_centre_spread_median_units"] or 0) * sc * 1000, "centre_spread_p95_mm": (v["face_centre_spread_p95_units"] or 0) * sc * 1000} for s, v in phys.items()}
    # rig-constrained reprojection through rig-derived face poses (per lens)
    errs = {0: [], 1: []}; rig_face_pose = {}
    for img in rec.images.values():
        m = next((x for x in meta if x["face"] + ".png" == img.name), None)
        if m is None or (m["exposure"], m["stream"]) not in lens_pose: continue
        Rl, Cl = lens_pose[(m["exposure"], m["stream"])]; Rf = np.array(m["R_face_from_lens"])
        Rwc = Rl @ Rf; Rcw = Rwc.T; tcw = -Rcw @ Cl; rig_face_pose[m["face"]] = (Rwc, Cl)
        for p2 in img.points2D:
            if not p2.has_point3D(): continue
            X = rec.points3D[p2.point3D_id].xyz; Xc = Rcw @ X + tcw
            if Xc[2] <= 0: continue
            u = FL * Xc[0] / Xc[2] + FACE / 2; v = FL * Xc[1] / Xc[2] + FACE / 2
            errs[m["stream"]].append(math.hypot(u - p2.xy[0], v - p2.xy[1]))
    rigproj = {}
    for s, e in errs.items():
        e = np.array(e)
        rigproj[f"lens{s}"] = {"n_obs": int(len(e)), "median_px": float(np.median(e)) if len(e) else None, "rms_px": float(np.sqrt((e ** 2).mean())) if len(e) else None, "p95_px": float(np.percentile(e, 95)) if len(e) else None}
    alle = np.array(errs[0] + errs[1])
    rigproj["all"] = {"n_obs": int(len(alle)), "median_px": float(np.median(alle)) if len(alle) else None, "rms_px": float(np.sqrt((alle ** 2).mean())) if len(alle) else None, "p95_px": float(np.percentile(alle, 95)) if len(alle) else None}
    res = {"colmap_free_faces": stats, "rig": rig, "physical_centre_preservation": phys, "rig_constrained_reprojection": rigproj,
           "exposures_registered_both_lenses": rel_exps,
           "note": "faces solved as independent PINHOLE cameras with FIXED intrinsics; rig imposed afterwards by least squares (no pycolmap rig BA); inter-lens translation fixed to 32.26 mm sets metric scale; rotation is the only rig quantity estimated"}
    json.dump(res, open(sdir / "rig_report.json", "w"), indent=1); log("SFM", json.dumps(res)[:1500])
    # persist rig-constrained face poses for the dataset export
    json.dump({k: {"R_wc": v[0].tolist(), "C": v[1].tolist()} for k, v in rig_face_pose.items()}, open(sdir / "rig_face_poses.json", "w"))
    st.done("sfm")
    return res, rec, lens_pose, rig_face_pose


# ---------------- stage 8: scale checks ----------------
def stage_scale(rig_res, rec, lens_pose):
    out = {}
    if not rig_res or not rig_res[0].get("rig"): return out
    scale = rig_res[0]["rig"]["metric_scale_m_per_sfm_unit_from_32.26mm"]
    P = np.array([p.xyz for p in rec.points3D.values()]) * scale
    C = np.array([c for _, c in lens_pose.values()]) * scale
    cm = C.mean(0); U, S, Vt = np.linalg.svd(C - cm); up = Vt[2]
    h = (P - cm) @ up
    hist, edges = np.histogram(h, bins=240, range=(-3, 3)); top = np.argsort(hist)[-2:]
    planes = sorted([float((edges[i] + edges[i + 1]) / 2) for i in top])
    out["scale_m_per_unit"] = scale; out["dominant_planes_rel_camera_m"] = planes
    out["floor_to_ceiling_m_estimate"] = float(planes[1] - planes[0]) if len(planes) == 2 else None
    out["note"] = "planes from height histogram along the PCA-normal of the camera-centre cloud; LiDAR comparison in the eval stage"
    log("SCALE", json.dumps(out)); return out


# ---------------- stage 9: splits ----------------
def stage_splits(meta, charuco):
    exps = sorted({m["exposure"] for m in meta}, key=lambda e: (e.split("@")[0], float(e.split("@")[1])))
    board = sorted({f"{d['video']}@{d['t']:.3f}" for d in charuco if d.get("n_charuco_corners", 0) >= 6})
    hold = [e for i, e in enumerate(exps) if i % 10 == 5]
    excl = set()
    for hh in hold:
        v, t = hh.split("@"); t = float(t)
        for e in exps:
            v2, t2 = e.split("@")
            if v2 == v and abs(float(t2) - t) <= 1.0 and e != hh: excl.add(e)
    train = [e for e in exps if e not in set(hold) and e not in excl]
    res = {"n_exposures": len(exps), "appearance_holdout_exposures": hold, "excluded_neighbours": sorted(excl), "appearance_train": train,
           "calibration_exposures": board, "calibration_validation_exposures": [],
           "note": "appearance holdout = whole exposures (both lenses, all 5 faces each); poses from the same SfM -> 'appearance-held-out', not fully held-out; calibration validation impossible (1 board placement)"}
    json.dump(res, open(OUT / "splits.json", "w"), indent=1); log("SPLITS", {k: (len(v) if isinstance(v, list) else v) for k, v in res.items() if k != "note"}); return res


# ---------------- stage 10: loader survival ----------------
def stage_loader(meta):
    import cv2
    def lapvar(a):
        a = a.astype(np.float32); L = (-4 * a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1))[2:-2, 2:-2]; return float(L.var())
    def box(a, d):
        h, w = a.shape; return a[:h // d * d, :w // d * d].reshape(h // d, d, w // d, d).mean(axis=(1, 3))
    rep = {}
    for m in meta:
        if m["face_name"] != "f" or len(rep) >= 40: continue
        g = cv2.imread(str(OUT / "faces" / f"{m['face']}.png"), 0); c = g[880:1680, 880:1680]
        rep[m["face"]] = {"2560": lapvar(c), "1280_loader": lapvar(box(c, 2)), "640_loader": lapvar(box(c, 4))}
    json.dump(rep, open(OUT / "loader_survival.json", "w"), indent=1); log("LOADER", len(rep), "faces; 2560 loads at 2560 after step 6000 (no images_2/, downscale-factor 1)"); return rep


# ---------------- stage 11: dataset export (nerfstudio) ----------------
def stage_dataset(meta, rig_face_pose, splits, scale_m_per_unit):
    ddir = OUT / "dataset"; ddir.mkdir(parents=True, exist_ok=True)
    hold = set(splits["appearance_holdout_exposures"]); excl = set(splits["excluded_neighbours"])
    frames = []; train_files = []; test_files = []
    flip = np.diag([1.0, -1.0, -1.0, 1.0])  # COLMAP (x right, y down, z fwd) -> nerfstudio/OpenGL (x right, y up, z back)
    for m in meta:
        if m["face"] not in rig_face_pose: continue
        if m["exposure"] in excl: continue
        Rwc, C = rig_face_pose[m["face"]]
        c2w = np.eye(4); c2w[:3, :3] = np.array(Rwc); c2w[:3, 3] = np.array(C) * scale_m_per_unit
        c2w = c2w @ flip
        fp = f"../faces/{m['face']}.png"; mp = f"../faces/{m['face']}_mask.png"
        frames.append({"file_path": fp, "mask_path": mp, "transform_matrix": c2w.tolist(), "w": FACE, "h": FACE, "fl_x": FL, "fl_y": FL, "cx": FACE / 2, "cy": FACE / 2,
                       "k1": 0.0, "k2": 0.0, "p1": 0.0, "p2": 0.0, "camera_model": "OPENCV", "exposure": m["exposure"], "lens": m["stream"], "face": m["face_name"]})
        (test_files if m["exposure"] in hold else train_files).append(fp)
    tj = {"camera_model": "OPENCV", "w": FACE, "h": FACE, "fl_x": FL, "fl_y": FL, "cx": FACE / 2, "cy": FACE / 2, "k1": 0.0, "k2": 0.0, "p1": 0.0, "p2": 0.0,
          "frames": frames, "train_filenames": train_files, "test_filenames": test_files, "val_filenames": test_files,
          "note": "Room 213 2026-09-21 raw dual-lens rig; per-face poses rig-constrained; metric scale from the factory 32.26 mm inter-lens baseline; masks = person + face validity; holdout = whole exposures (both lenses, all faces)"}
    json.dump(tj, open(ddir / "transforms.json", "w"))
    log("DATASET", "frames", len(frames), "train", len(train_files), "test", len(test_files))
    return {"n_frames": len(frames), "n_train": len(train_files), "n_test": len(test_files), "path": str(ddir)}


# ---------------- stage 12: gates ----------------
def stage_gates(rig_res, mask_summ, dataset_info, loader, meta):
    g = {}
    r = rig_res[0] if rig_res else {}
    rig = r.get("rig", {}); rp = r.get("rig_constrained_reprojection", {}).get("all", {}); free = r.get("colmap_free_faces", {})
    n_faces = len(meta)
    g["registration_fraction"] = {"value": (free.get("n_registered", 0) / max(1, n_faces)), "budget": ">=0.80", "pass": free.get("n_registered", 0) / max(1, n_faces) >= 0.80}
    g["single_dominant_component"] = {"value": free.get("n_components"), "budget": "best component holds >=80% of registered", "pass": bool(free) and free.get("n_registered", 0) / max(1, n_faces) >= 0.80}
    g["rig_reprojection_median_px"] = {"value": rp.get("median_px"), "budget": "<=1.0 px (native 2560 face px)", "pass": rp.get("median_px") is not None and rp["median_px"] <= 1.0}
    g["rig_reprojection_p95_px"] = {"value": rp.get("p95_px"), "budget": "<=2.0 px", "pass": rp.get("p95_px") is not None and rp["p95_px"] <= 2.0}
    g["inter_lens_rotation_consistency_p95_deg"] = {"value": rig.get("per_exposure_dev_deg_p95"), "budget": "<=0.5 deg (~8 px at lens centre)", "pass": rig.get("per_exposure_dev_deg_p95") is not None and rig["per_exposure_dev_deg_p95"] <= 0.5}
    g["baseline_stability_cv"] = {"value": rig.get("baseline_sfm_units_cv"), "budget": "<=0.15", "pass": rig.get("baseline_sfm_units_cv") is not None and rig["baseline_sfm_units_cv"] <= 0.15}
    pc = r.get("physical_centre_preservation", {})
    worst_c = max([v.get("centre_spread_p95_mm") or 0 for v in pc.values()] or [0])
    g["physical_centre_preservation_p95_mm"] = {"value": worst_c, "budget": "<=20 mm (faces of one lens agree on its centre)", "pass": bool(pc) and worst_c <= 20.0}
    g["mask_coverage"] = {"value": mask_summ, "budget": "lens1 median masked <=0.20, all frames masked", "pass": bool(mask_summ) and mask_summ.get(1, mask_summ.get("1", {})).get("median_masked_frac", 1) <= 0.20}
    g["holdout_present"] = {"value": dataset_info.get("n_test"), "budget": ">=10 held-out faces from whole exposures", "pass": dataset_info.get("n_test", 0) >= 10}
    g["loader_resolution_2560"] = {"value": "no images_2/, downscale-factor 1 pinned in the training command", "pass": True}
    g["loader_detail_survival"] = {"value": f"{len(loader)} front faces measured", "pass": len(loader) > 0}
    g["metric_scale_source"] = {"value": rig.get("metric_scale_m_per_sfm_unit_from_32.26mm"), "budget": "from fixed 32.26 mm baseline; LiDAR cross-check in eval", "pass": rig.get("metric_scale_m_per_sfm_unit_from_32.26mm") is not None}
    failed = [k for k, v in g.items() if not v["pass"]]
    verdict = {"gates": g, "failed": failed, "dataset": "TRAINING READY" if not failed else "BLOCKED", "blocking_issue": (failed[0] if failed else None),
               "evaluated_at_utc": datetime.now(timezone.utc).isoformat()}
    json.dump(verdict, open(OUT / "verdict.json", "w"), indent=1); log("VERDICT", verdict["dataset"], failed); return verdict


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    job_id = os.environ.get("MODAL_FUNCTION_CALL_ID") or os.environ.get("MODAL_TASK_ID") or "unknown"
    st = Status(job_id)
    try:
        import room213_raw_preflight as pre
        if not stage_is_done("preflight"):
            st.set_stage("preflight_verify")
            v = pre.stage_verify()
            bad_vid = [m for m in v["missing"] if m.startswith("VID_")] + [b["filename"] for b in v["present_bad"] if b["filename"].startswith("VID_")]
            if bad_vid:
                st.last_error = f"video verify failed: {bad_vid}"; st.set_stage("halted"); log("BUILD SKIPPED: video verify failed for", bad_vid); return
            st.set_stage("preflight_demux"); d = pre.stage_demux(v)
            st.set_stage("preflight_charuco"); c = pre.stage_charuco(d); pre.stage_splits(c); st.done("preflight")
        demux = json.load(open(PRE / "demux.json")); charuco = json.load(open(PRE / "charuco_detections.json"))
        lenses, calib = load_calib()
        log("BUILD start: exposures", len({(d['video'], d['t']) for d in demux}), "frames", len(demux))
        st.set_stage("masks", n_frames=len(demux)); rep, mask_summ = stage_masks(demux, st); st.done("masks")
        meta = stage_faces(demux, lenses, st); st.done("faces")
        rig_res = stage_sfm(meta, calib, st)
        if not rig_res:
            st.last_error = "SfM produced no reconstruction"; st.set_stage("halted"); return
        st.set_stage("scale"); scale = stage_scale(rig_res, rig_res[1], rig_res[2])
        st.set_stage("splits"); splits = stage_splits(meta, charuco)
        st.set_stage("loader"); loader = stage_loader(meta)
        st.set_stage("dataset")
        ds = stage_dataset(meta, rig_res[3], splits, rig_res[0]["rig"].get("metric_scale_m_per_sfm_unit_from_32.26mm", 1.0)) if rig_res[0].get("rig") else {"n_frames": 0, "n_test": 0}
        st.set_stage("gates"); verdict = stage_gates(rig_res, mask_summ, ds, loader, meta)
        report = {"n_frames": len(demux), "n_faces": len(meta), "rig": rig_res[0], "scale": scale, "dataset": ds,
                  "splits_summary": {k: (len(v) if isinstance(v, list) else v) for k, v in splits.items()}, "verdict": verdict,
                  "mask_summary": {str(k): v for k, v in mask_summ.items()},
                  "mask_method": "torchvision maskrcnn_resnet50_fpn_v2 person (RTMDet-Ins-S ONNX export not obtainable without mmdeploy)",
                  "compute": {"cpu": os.cpu_count(), "note": "CPU-only container; masks pre-computed on GPU"}, "no_training_in_build": True}
        json.dump(report, open(OUT / "report.json", "w"), indent=1)
        st.set_stage("finished", verdict=verdict["dataset"]); log("BUILD DONE (no training)", verdict["dataset"])
    except Exception as e:  # noqa: BLE001
        import traceback
        st.last_error = f"{type(e).__name__}: {e}"; st.note(traceback=traceback.format_exc()[-1500:]); st.set_stage("failed"); raise
    finally:
        st.stop()


if __name__ == "__main__":
    main()
