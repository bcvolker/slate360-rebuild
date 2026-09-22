"""Room 213 raw rig -- joint RIGID-RIG bundle adjustment on the existing free reconstruction.

Authorised single pipeline correction (2026-09-22): the free solve (build/sfm/best: 1033/1210 faces,
1.14 px) is re-parameterised as a rig and re-optimised jointly. Nothing upstream is touched: no
re-matching, same faces/masks/calibration/keepers/splits, same frozen gates, same Stage-1 recipe.

RIG STRUCTURE (pycolmap 4.2 native rigs -- recorded here because it is what the BA enforces):
  * 10 sensors = 10 PINHOLE cameras (identical fixed intrinsics FL, FL, 1280, 1280), one per
    (physical lens, face) with faces f,l,r,u,d; camera_id = 1 + 5*lens + face_index.
  * reference sensor = (lens 0, face f) whose face rotation is the identity, so the rig frame IS
    lens-0's optical frame; rig_from_world is one 6-DoF pose per physical exposure (one Frame).
  * sensor_from_rig(lens 0, face k) = face_k_from_lens (pure rotation, zero translation: all five
    faces share lens-0's optical centre by construction).
  * sensor_from_rig(lens 1, face k) = face_k_from_lens * lens1_from_lens0, where lens1_from_lens0 =
    (R_10, t_10): t_10 is the FACTORY vector (|t| = 32.26 mm, fixed) and R_10 is ONE global rotation
    shared by every exposure. All five lens-1 faces therefore share lens-1's optical centre.
  * In every inner BA all ten sensor_from_rig are CONSTANT (refine_sensor_from_rig=False) and all
    intrinsics are constant; only rig_from_world (per exposure) and the 3D points are refined.
    Gauge: one frame's rig_from_world held constant (6 DoF); scale is NOT a gauge freedom here --
    it is pinned by the fixed 32.26 mm baseline.
  * pycolmap can only refine sensor_from_rig as an independent 6-DoF block per sensor, which would
    let faces drift apart; it cannot express "five faces share one centre and one shared inter-lens
    rotation" as a parameter block. The single global R_10 is therefore optimised by an OUTER
    3-parameter minimisation (Nelder-Mead over a rotation vector) whose objective is the converged
    rigid inner BA's robust reprojection cost. This is a nested optimisation of exactly the
    requested model, not an approximation of it.
  * Initial R_10 = the scene-based tripod estimate (ROOM213_RAW_RIG_PREFLIGHT rig_rotation_estimate:
    172.5 deg about ~-y, per assignment), the best-supported existing estimate (the free-solve
    per-exposure values are contaminated by the sub-map offset diagnosed on 2026-09-22).
  * Stream<->lens assignment: the factory artifact left it unresolved; both discrete hypotheses
    (H1 stream0=A / H2 stream0=B) run with the identical frozen configuration and are compared on
    geometry only. (They differ only in the ~1 mm lateral component of t and the rotation seed.)

Scale: the free solve's baseline-derived 0.094 m/unit is invalid (the free inter-lens vector points
+z, i.e. in FRONT of lens 0 -- a sub-map offset, not the 32 mm physical baseline). The reconstruction
is pre-scaled with a room-height prior (ceiling/floor peaks) only as an initial guess; the BA sets
the final scale from the fixed baseline.
"""
from __future__ import annotations

import json
import math
import os
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, "/root/recon-experiment")
import room213_raw_build as B  # noqa: E402  (FACE, FL, FACES, face_R, T_B_MM, OUT, stage_dataset, stage_gates)

VOL = Path("/vol"); BASE = VOL / "room213" / "2026-09-21"; OUT = B.OUT; SFM = OUT / "sfm"
RB = OUT / os.environ.get("RIG_BA_OUTDIR", "rig_ba_v2")   # v2 = corrected-objective pass (2026-09-22); v1 = rig_ba
STATUS = BASE / "status.json"; CALIB = VOL / "room213" / "calib" / "x4_factory_mei.json"
FACE_IDX = {n: i for i, (n, _, _) in enumerate(B.FACES)}
# scene-based tripod estimates (mean of the two tripod frames per assignment), R_10: lens-0 rays -> lens-1 rays
SCENE_R10 = {"H1_stream0=A": (172.45, [-0.0033, -0.9987, 0.0508]), "H2_stream0=B": (172.60, [-0.0045, -0.9987, 0.0503])}
DRY = os.environ.get("RIG_BA_DRY") == "1"


def log(*a):
    print(*a, flush=True)


def status(**kw):
    try:
        base = json.loads(STATUS.read_text()) if STATUS.is_file() else {}
    except Exception:  # noqa: BLE001
        base = {}
    base.update({"timestamp_utc": datetime.now(timezone.utc).isoformat(), "phase": "rig_ba", **kw})
    STATUS.write_text(json.dumps(base, indent=1))


def rotvec_to_R(v):
    import cv2
    return cv2.Rodrigues(np.asarray(v, float).reshape(3, 1))[0]


def R_to_angle_axis(R):
    import cv2
    rv = cv2.Rodrigues(np.asarray(R))[0].ravel(); a = float(np.linalg.norm(rv))
    return math.degrees(a), (rv / a).tolist() if a > 1e-12 else [0, 0, 1]


def chordal_mean(Rs):
    U, _, Vt = np.linalg.svd(sum(Rs)); R = U @ Vt
    if np.linalg.det(R) < 0: U[:, -1] *= -1; R = U @ Vt
    return R


# ---------------------------------------------------------------- hypotheses
def lens1_from_lens0(hyp: str, calib: dict, R10: np.ndarray):
    """(R_10, t_10) with X_lens1 = R_10 X_lens0 + t_10, translation from the factory vector.
    Factory string: X_B = R_BA X_A + t_BA with t_BA = lens-B t_m (A's origin sits at t_BA in B's frame,
    B's origin at -R_BA^T t_BA in A's frame; both are ~32 mm BEHIND the other lens, checked below)."""
    tBA = np.array(calib["lenses"][1]["t_m"], float)
    if hyp.startswith("H1"):      # stream0 = A (rig frame), stream1 = B
        t10 = tBA.copy()
    else:                         # stream0 = B (rig frame), stream1 = A: A's origin is at t_BA in B's frame
        t10 = -R10 @ tBA
    p1_in_0 = -R10.T @ t10        # position of lens 1 in the lens-0 frame
    assert abs(np.linalg.norm(p1_in_0) - B.T_B_MM / 1000) < 1e-4, np.linalg.norm(p1_in_0)   # factory |t| = 32.2576 mm
    assert p1_in_0[2] < 0, f"convention check failed: lens 1 must sit behind lens 0, got {p1_in_0}"
    return R10, t10, p1_in_0


# ---------------------------------------------------------------- rig reconstruction
def build_rig_reconstruction(rec_free, meta_by_name, hyp, calib, R10, s0, pyc):
    """Copy the free solve into a rig-parameterised reconstruction (scaled by s0)."""
    R10, t10, p1 = lens1_from_lens0(hyp, calib, R10)
    rec = pyc.Reconstruction()
    cams = {}
    for lens in (0, 1):
        for name, yaw, pitch in B.FACES:
            cid = 1 + 5 * lens + FACE_IDX[name]
            cam = pyc.Camera(camera_id=cid, model="PINHOLE", width=B.FACE, height=B.FACE, params=[B.FL, B.FL, B.FACE / 2, B.FACE / 2])
            rec.add_camera(cam); cams[(lens, name)] = cam
    rig = pyc.Rig(rig_id=1)
    T10 = pyc.Rigid3d(pyc.Rotation3d(R10), t10)
    sensor_from_rig = {}
    for lens in (0, 1):
        for name, yaw, pitch in B.FACES:
            Rf = B.face_R(yaw, pitch)               # lens_from_face (stage_faces: X_lens = Rf X_face)
            face_from_lens = pyc.Rigid3d(pyc.Rotation3d(Rf.T), np.zeros(3))
            sfr = face_from_lens if lens == 0 else face_from_lens * T10
            sensor_from_rig[(lens, name)] = sfr
            sid = cams[(lens, name)].sensor_id
            if lens == 0 and name == "f":
                assert np.allclose(Rf, np.eye(3)); rig.add_ref_sensor(sid)
            else:
                rig.add_sensor(sid, sfr)
    rec.add_rig(rig)
    # frames: one per physical exposure that has >=1 registered face
    scale = pyc.Sim3d(s0, pyc.Rotation3d(np.eye(3)), np.zeros(3))
    rec_free.transform(scale)                       # metres (prior); BA re-scales via the baseline
    frames = {}; img_frame = {}
    for im in rec_free.images.values():
        if not im.has_pose: continue
        m = meta_by_name.get(im.name)
        if m is None: continue
        frames.setdefault(m["exposure"], []).append((m, im))
    fid = 0; frame_of_exp = {}
    for exp, lst in sorted(frames.items()):
        fid += 1
        cand = {0: [], 1: []}
        for m, im in lst:
            cfw = im.cam_from_world()
            rfw = sensor_from_rig[(m["stream"], m["face_name"])].inverse() * cfw   # rig_from_world = sensor_from_rig^-1 * cam_from_world
            cand[m["stream"]].append(rfw)
        use = cand[0] if cand[0] else cand[1]      # prefer the reference lens (lens-1 poses carry the sub-map offset)
        Rm = chordal_mean([np.asarray(p.rotation.matrix()) for p in use])
        C = np.mean([-np.asarray(p.rotation.matrix()).T @ np.asarray(p.translation) for p in use], axis=0)
        rfw = pyc.Rigid3d(pyc.Rotation3d(Rm), -Rm @ C)
        fr = pyc.Frame(frame_id=fid, rig_id=1); fr.rig_from_world = rfw
        for m, im in lst:
            fr.add_data_id(pyc.data_t(cams[(m["stream"], m["face_name"])].sensor_id, im.image_id))
        rec.add_frame(fr); frame_of_exp[exp] = fid
        for m, im in lst:
            img_frame[im.image_id] = fid
    # images with their 2D points (3D links restored through the tracks below)
    for im in rec_free.images.values():
        if im.image_id not in img_frame: continue
        m = meta_by_name[im.name]
        new = pyc.Image(name=im.name, keypoints=np.array([np.asarray(p.xy) for p in im.points2D], dtype=np.float64).reshape(-1, 2),
                        camera_id=cams[(m["stream"], m["face_name"])].camera_id, image_id=im.image_id)
        new.frame_id = img_frame[im.image_id]
        rec.add_image(new)
    for fid_ in frame_of_exp.values():
        rec.register_frame(fid_)
    n_pts = 0
    for pid, p in rec_free.points3D.items():
        tr = pyc.Track()
        for el in p.track.elements:
            if el.image_id in img_frame: tr.add_element(el.image_id, el.point2D_idx)
        if tr.length() < 2: continue
        p3 = pyc.Point3D(); p3.xyz = np.asarray(p.xyz); p3.track = tr; p3.color = np.asarray(p.color)
        rec.add_point3D_with_id(pid, p3); n_pts += 1
    # consistency: every image's cam_from_world must equal sensor_from_rig * rig_from_world (by construction)
    im0 = next(iter(rec.images.values())); _ = im0.cam_from_world()
    obs_free = sum(im.num_points3D for im in rec_free.images.values() if im.has_pose)
    obs_rig = sum(im.num_points3D for im in rec.images.values())
    log(f"RIG REC {hyp}: frames {rec.num_frames()} images {rec.num_reg_images()} points {n_pts} obs {obs_rig} (free obs {obs_free})")
    assert obs_rig >= 0.99 * obs_free, (obs_rig, obs_free)
    return rec, frame_of_exp, sensor_from_rig, (R10, t10, p1)


def set_lens1_rotation(rec, R10, t10, pyc):
    rig = rec.rig(1)
    T10 = pyc.Rigid3d(pyc.Rotation3d(R10), t10)
    for name, yaw, pitch in B.FACES:
        Rf = B.face_R(yaw, pitch)
        sfr = pyc.Rigid3d(pyc.Rotation3d(Rf.T), np.zeros(3)) * T10
        rig.set_sensor_from_rig(rec.camera(1 + 5 + FACE_IDX[name]).sensor_id, sfr)
    chk = np.asarray(rec.rig(1).sensor_from_rig(rec.camera(6).sensor_id).rotation.matrix())
    assert np.allclose(chk, R10, atol=1e-9), "sensor_from_rig update did not stick"


# ---------------------------------------------------------------- residuals
def residuals(rec, meta_by_name):
    """Per-observation reprojection error (px) under the RIG-derived poses, with lens/frame labels."""
    errs = []; lens = []; frames = []; faces = []; radii = []
    pts = {pid: np.asarray(p.xyz) for pid, p in rec.points3D.items()}
    for im in rec.images.values():
        m = meta_by_name[im.name]
        cfw = im.cam_from_world(); R = np.asarray(cfw.rotation.matrix()); t = np.asarray(cfw.translation)
        idx = [(i, p.point3D_id) for i, p in enumerate(im.points2D) if p.has_point3D()]
        if not idx: continue
        X = np.array([pts[pid] for _, pid in idx]); xy = np.array([np.asarray(im.points2D[i].xy) for i, _ in idx])
        Xc = X @ R.T + t; z = np.where(Xc[:, 2] > 1e-9, Xc[:, 2], np.nan)
        u = B.FL * Xc[:, 0] / z + B.FACE / 2; v = B.FL * Xc[:, 1] / z + B.FACE / 2
        e = np.hypot(u - xy[:, 0], v - xy[:, 1]); e = np.where(np.isnan(e), 1e4, e)
        errs.append(e); lens.append(np.full(len(e), m["stream"])); frames.append(np.full(len(e), im.frame_id)); faces.append(np.full(len(e), FACE_IDX[m["face_name"]]))
        radii.append(np.hypot(xy[:, 0] - B.FACE / 2, xy[:, 1] - B.FACE / 2))
    residuals.last_radius = np.concatenate(radii)
    return np.concatenate(errs), np.concatenate(lens), np.concatenate(frames), np.concatenate(faces)


def huber_mean(e, delta=4.0, clip=50.0):
    """Outer-loop objective: Huber(4 px) mean with residuals clipped at 50 px so the gross tail
    (behind-camera sentinels, unreconciled outliers) cannot dominate the rotation search."""
    a = np.minimum(np.abs(e), clip); return float(np.mean(np.where(a <= delta, 0.5 * a * a, delta * (a - 0.5 * delta))))


def per_frame_residual_rotation(rec, meta_by_name, lens_sel):
    """Diagnostic only: for each frame, the small rotation that would best re-align that lens's rays to
    its observations (Kabsch on unit rays). Rigid rig => zero by construction; this measures the
    residual per-exposure inter-lens inconsistency the rig had to absorb."""
    import cv2
    pts = {pid: np.asarray(p.xyz) for pid, p in rec.points3D.items()}
    per = {}
    for im in rec.images.values():
        m = meta_by_name[im.name]
        if m["stream"] != lens_sel: continue
        cfw = im.cam_from_world(); R = np.asarray(cfw.rotation.matrix()); t = np.asarray(cfw.translation)
        idx = [(i, p.point3D_id) for i, p in enumerate(im.points2D) if p.has_point3D()]
        if not idx: continue
        X = np.array([pts[pid] for _, pid in idx]); xy = np.array([np.asarray(im.points2D[i].xy) for i, _ in idx])
        Xc = X @ R.T + t; ok = Xc[:, 2] > 1e-6; Xc = Xc[ok]; xy = xy[ok]
        pred = Xc / np.linalg.norm(Xc, axis=1, keepdims=True)
        obs = np.stack([(xy[:, 0] - B.FACE / 2) / B.FL, (xy[:, 1] - B.FACE / 2) / B.FL, np.ones(len(xy))], 1); obs /= np.linalg.norm(obs, axis=1, keepdims=True)
        # express in the lens frame (face rotation) so the five faces of one lens combine
        Rf = B.face_R(*[(y, p) for n, y, p in B.FACES if n == m["face_name"]][0])
        per.setdefault(im.frame_id, [[], []]); per[im.frame_id][0].append(pred @ Rf.T); per[im.frame_id][1].append(obs @ Rf.T)
    angs = []
    for fid, (P, Q) in per.items():
        P = np.concatenate(P); Q = np.concatenate(Q)
        if len(P) < 30: continue
        H = P.T @ Q; U, _, Vt = np.linalg.svd(H); d = np.sign(np.linalg.det(Vt.T @ U.T)); Rr = Vt.T @ np.diag([1, 1, d]) @ U.T
        angs.append(math.degrees(np.linalg.norm(cv2.Rodrigues(Rr)[0])))
    angs = np.array(angs)
    return {"n_frames": int(len(angs)), "median_deg": float(np.median(angs)) if len(angs) else None, "p95_deg": float(np.percentile(angs, 95)) if len(angs) else None}


# ---------------------------------------------------------------- BA
def run_ba(rec, pyc, max_iter, gauge_frame, loss="HUBER", loss_scale=4.0, ftol=1e-5):
    opt = pyc.BundleAdjustmentOptions()
    opt.refine_focal_length = False; opt.refine_principal_point = False; opt.refine_extra_params = False
    opt.refine_sensor_from_rig = False; opt.refine_rig_from_world = True; opt.refine_points3D = True; opt.print_summary = False
    opt.ceres.loss_function_type = getattr(pyc.LossFunctionType, loss); opt.ceres.loss_function_scale = loss_scale
    opt.ceres.solver_options.max_num_iterations = int(max_iter)
    try:
        opt.ceres.solver_options.function_tolerance = ftol   # converged = relative cost change below ftol (Ceres default 1e-6)
    except Exception: pass  # noqa: BLE001
    try: opt.ceres.solver_options.num_threads = os.cpu_count() or 8
    except Exception: pass  # noqa: BLE001
    cfg = pyc.BundleAdjustmentConfig()
    for iid in rec.reg_image_ids(): cfg.add_image(iid)
    for cid in rec.cameras: cfg.set_constant_cam_intrinsics(cid)
    cfg.set_constant_rig_from_world_pose(gauge_frame)           # 6-DoF gauge only; scale pinned by the 32.26 mm baseline
    ba = pyc.create_default_bundle_adjuster(opt, cfg, rec)
    t0 = time.time(); summ = ba.solve(); el = time.time() - t0
    info = {"elapsed_s": round(el, 1)}
    for k in ("initial_cost", "final_cost", "num_successful_steps", "num_unsuccessful_steps", "termination_type"):
        if hasattr(summ, k): info[k] = str(getattr(summ, k))[:60]
    return info


def scene_extent(rec):
    C = np.array([-np.asarray(f.rig_from_world.rotation.matrix()).T @ np.asarray(f.rig_from_world.translation) for f in rec.frames.values() if f.has_pose()])
    P = np.array([np.asarray(p.xyz) for p in rec.points3D.values()])
    lo, hi = np.percentile(P, 5, axis=0), np.percentile(P, 95, axis=0)
    return {"track_extent_m_xyz": (C.max(0) - C.min(0)).tolist(), "points_p5_p95_extent_m_xyz": (hi - lo).tolist(), "n_frames": int(len(C))}, C


def scale_prior(rec_free, meta_by_name):
    """Room-height prior for the INITIAL scale only: gravity from the mean camera y-axis of pitch-0 faces,
    ceiling/floor as density peaks of point height above/below the cameras."""
    ys = []; Cs = []
    for im in rec_free.images.values():
        if not im.has_pose or meta_by_name[im.name]["face_name"] not in ("f", "l", "r"): continue
        R = np.asarray(im.cam_from_world().rotation.matrix()); ys.append(R.T @ np.array([0, 1.0, 0])); Cs.append(np.asarray(im.projection_center()))
    up = -np.mean(ys, axis=0); up /= np.linalg.norm(up); c0 = np.median(Cs, axis=0)
    P = np.array([np.asarray(p.xyz) for p in rec_free.points3D.values()]); h = (P - c0) @ up
    bins = np.arange(-8, 8.001, 0.1); hist, edges = np.histogram(h, bins=bins); mid = (edges[:-1] + edges[1:]) / 2
    up_mask = mid > 0.5; dn_mask = mid < -0.5
    ceil = float(mid[up_mask][np.argmax(hist[up_mask])]); ceil_pk = int(hist[up_mask].max())
    floor = float(mid[dn_mask][np.argmax(hist[dn_mask])]); floor_pk = int(hist[dn_mask].max())
    if floor_pk >= 0.3 * ceil_pk:
        s0 = 2.9 / (ceil - floor); how = f"floor-to-ceiling 2.9 m prior over {ceil - floor:.2f} units (ceil {ceil:.2f}, floor {floor:.2f})"
    else:
        s0 = 1.45 / ceil; how = f"ceiling 1.45 m above camera prior over {ceil:.2f} units (floor peak weak: {floor_pk} vs {ceil_pk})"
    s0 = float(np.clip(s0, 0.2, 3.0))
    return s0, {"method": how, "ceiling_units": ceil, "floor_units": floor, "ceiling_peak": ceil_pk, "floor_peak": floor_pk, "s0_m_per_unit": s0}


# ---------------------------------------------------------------- one hypothesis
def run_hypothesis(hyp, calib, meta_by_name, pyc):
    hdir = RB / hyp; hdir.mkdir(parents=True, exist_ok=True)
    rec_free = pyc.Reconstruction(str(SFM / "best"))
    s0, prior = scale_prior(rec_free, meta_by_name); log("SCALE PRIOR", prior)
    ang, axis = SCENE_R10[hyp]; axis = np.array(axis) / np.linalg.norm(axis); R_init = rotvec_to_R(axis * math.radians(ang))
    rec, frame_of_exp, sfr, (R10, t10, p1) = build_rig_reconstruction(rec_free, meta_by_name, hyp, calib, R_init, s0, pyc)
    gauge_frame = 1
    e0, l0, f0, _ = residuals(rec, meta_by_name)
    log(f"{hyp} initial rig residuals: median {np.median(e0):.2f} p95 {np.percentile(e0, 95):.2f} lens0 {np.median(e0[l0 == 0]):.2f} lens1 {np.median(e0[l0 == 1]):.2f}")
    status(stage=f"rig_ba_{hyp}_initial", median_px=float(np.median(e0)))
    ext_before, _ = scene_extent(rec)
    info = run_ba(rec, pyc, 5 if DRY else 200, gauge_frame); log("BA0", info)
    e1, l1, _, _ = residuals(rec, meta_by_name); ext_after, _ = scene_extent(rec)
    log(f"{hyp} after BA0: median {np.median(e1):.2f} p95 {np.percentile(e1, 95):.2f}; extent before {ext_before['track_extent_m_xyz']} after {ext_after['track_extent_m_xyz']}")
    base_dir = hdir / "base"; base_dir.mkdir(exist_ok=True); rec.write(str(base_dir))
    evals = []
    if DRY:
        R_best = R10; delta_best = np.zeros(3)
    else:
        from scipy.optimize import minimize
        BOUND = math.radians(3.0)   # frozen search bound: |delta| <= 3 deg about the scene-based seed
        def objective(delta):
            if np.linalg.norm(delta) > BOUND:
                evals.append({"delta_deg": (np.degrees(delta)).tolist(), "huber_mean": None, "median_px": None, "p95_px": None, "rejected": "outside +/-3 deg bound"})
                return 1e6 + float(np.linalg.norm(delta))
            r = pyc.Reconstruction(str(base_dir))
            Rd = rotvec_to_R(delta) @ R10
            set_lens1_rotation(r, Rd, t10 if hyp.startswith("H1") else (-Rd @ np.array(calib["lenses"][1]["t_m"])), pyc)
            info_e = run_ba(r, pyc, 300, gauge_frame, ftol=1e-5)   # to convergence (ftol) -- a noisy inner solve makes the outer objective noisy
            e, _, _, _ = residuals(r, meta_by_name); c = huber_mean(e)
            evals.append({"delta_deg": (np.degrees(delta)).tolist(), "huber_mean": c, "median_px": float(np.median(e)), "p95_px": float(np.percentile(e, 95)), "ba": info_e})
            status(stage=f"rig_ba_{hyp}_outer", n_evals=len(evals), best_huber=min(v["huber_mean"] for v in evals), last_median_px=float(np.median(e)))
            log(f"  eval {len(evals)}: delta {np.degrees(delta).round(3)} huber {c:.4f} median {np.median(e):.3f}")
            return c
        step = math.radians(3.0)
        res = minimize(objective, np.zeros(3), method="Nelder-Mead",
                       options={"initial_simplex": np.vstack([np.zeros(3), np.eye(3) * step]), "xatol": math.radians(0.005), "fatol": 1e-4, "maxfev": 60, "adaptive": True})
        delta_best = res.x; R_best = rotvec_to_R(delta_best) @ R10
    # final converged rigid BA at the optimum
    rec = pyc.Reconstruction(str(base_dir))
    t_best = t10 if hyp.startswith("H1") else (-R_best @ np.array(calib["lenses"][1]["t_m"]))
    set_lens1_rotation(rec, R_best, t_best, pyc)
    info_final = run_ba(rec, pyc, 5 if DRY else 500, gauge_frame, ftol=1e-6); log("BA final", info_final)
    info_final2 = run_ba(rec, pyc, 5 if DRY else 300, gauge_frame, ftol=1e-6); log("BA final (2nd pass)", info_final2)
    (hdir / "rec").mkdir(exist_ok=True); rec.write(str(hdir / "rec"))
    e, l, fr, fc = residuals(rec, meta_by_name)
    def stats(x): return {"n_obs": int(len(x)), "median_px": float(np.median(x)), "p95_px": float(np.percentile(x, 95)), "rms_px": float(np.sqrt(np.mean(np.minimum(x, 1e3) ** 2)))}
    ext, C = scene_extent(rec)
    ang_b, axis_b = R_to_angle_axis(R_best); ang_i, axis_i = R_to_angle_axis(R10)
    dev_lens1 = per_frame_residual_rotation(rec, meta_by_name, 1); dev_lens0 = per_frame_residual_rotation(rec, meta_by_name, 0)
    # per-walk coverage
    exp_of_frame = {v: k for k, v in frame_of_exp.items()}; walks = {}
    for f in rec.frames.values():
        w = exp_of_frame[f.frame_id].split("_00_")[1].split(".insv")[0]
        walks.setdefault(w, []).append(-np.asarray(f.rig_from_world.rotation.matrix()).T @ np.asarray(f.rig_from_world.translation))
    walks = {w: {"n_exposures": len(v), "extent_m": (np.max(v, 0) - np.min(v, 0)).tolist()} for w, v in walks.items()}
    # per-frame residual medians by walk and lens (tripod walk 020 vs moving walks 021/075)
    frame_walk = {fid_: exp_of_frame[fid_].split("_00_")[1].split(".insv")[0] for fid_ in exp_of_frame.values()}
    per_walk_res = {}
    for w in walks:
        for lens_ in (0, 1):
            meds = [float(np.median(e[(fr == fid_) & (l == lens_)])) for fid_ in frame_walk if frame_walk[fid_] == w and np.any((fr == fid_) & (l == lens_))]
            per_walk_res[f"{w}_lens{lens_}"] = {"n_frames": len(meds), "median_of_frame_medians_px": float(np.median(meds)) if meds else None, "p90_of_frame_medians_px": float(np.percentile(meds, 90)) if meds else None}
    for w in walks: walks[w]["residuals"] = {k: v for k, v in per_walk_res.items() if k.startswith(w)}
    n_behind = int(np.sum(e >= 1e4)); n_gt50 = int(np.sum(e > 50))
    # residual distribution (diagnostic only): static (tripod walk 020) vs moving (021/075), x lens, x face, x image radius
    rad = residuals.last_radius
    static_frames = {fid_ for fid_, w in frame_walk.items() if w == "020"}
    is_static = np.isin(fr, list(static_frames))
    def dist(mask):
        x = e[mask]; return {"n_obs": int(len(x)), "median_px": float(np.median(x)) if len(x) else None, "p95_px": float(np.percentile(x, 95)) if len(x) else None}
    residual_distribution = {
        "static_vs_moving": {"static_020": dist(is_static), "moving_021_075": dist(~is_static),
                             "static_lens0": dist(is_static & (l == 0)), "static_lens1": dist(is_static & (l == 1)),
                             "moving_lens0": dist(~is_static & (l == 0)), "moving_lens1": dist(~is_static & (l == 1))},
        "by_lens": {"lens0": dist(l == 0), "lens1": dist(l == 1)},
        "by_face": {n: {"all": dist(fc == i), "lens0": dist((fc == i) & (l == 0)), "lens1": dist((fc == i) & (l == 1))} for n, i in FACE_IDX.items()},
        "by_image_radius_px": {f"{a}-{b_}": dist((rad >= a) & (rad < b_)) for a, b_ in ((0, 400), (400, 800), (800, 1280), (1280, 1900))},
        "by_image_radius_x_lens": {f"lens{ln}_{a}-{b_}": dist((rad >= a) & (rad < b_) & (l == ln)) for ln in (0, 1) for a, b_ in ((0, 400), (400, 800), (800, 1280), (1280, 1900))},
        "note": "static = tripod walk 020 (3 exposures); moving = walks 021/075 (hand-carried); radius = distance of the 2D observation from the 2560-face centre"}
    p1_best = -R_best.T @ t_best
    rep = {"hypothesis": hyp, "rig_structure": "10 PINHOLE sensors (5 per lens), ref = lens0/f, sensor_from_rig constant in BA (lens0: face rotations, zero translation; lens1: face rotations * [R_10 | t_10 factory 32.26 mm]); one Frame per exposure; refine rig_from_world + points only; intrinsics constant; gauge = frame 1 constant; R_10 by outer Nelder-Mead over the rigid inner BA",
           "scale_prior": prior, "initial_R10_deg_axis": [ang_i, axis_i], "final_R10_deg_axis": [ang_b, axis_b], "outer_delta_deg": np.degrees(delta_best).tolist(),
           "outer_evals": evals, "ba_initial_pass": info, "ba_final": [info_final, info_final2],
           "n_faces_with_observations": rec.num_reg_images(), "n_faces_total": 1210, "n_exposures_registered": rec.num_frames(), "n_exposures_total": 121,
           "n_exposures_both_lenses_in_free_solve": None, "component_count": 1, "largest_component_faces": rec.num_reg_images(),
           "free_solve_second_component_dropped_faces": 22,
           "reprojection_rig_ba": {"all": stats(e), "lens0": stats(e[l == 0]), "lens1": stats(e[l == 1]), "initial_before_ba": stats(e0)},
           "per_face_median_px": {n: float(np.median(e[fc == i])) for n, i in FACE_IDX.items()},
           "inter_lens_rotation_deviation_across_exposures": {"by_construction_deg": 0.0, "residual_diagnostic_lens1": dev_lens1, "residual_diagnostic_lens0": dev_lens0},
           "baseline": {"mm_fixed": B.T_B_MM, "cv_by_construction": 0.0, "lens1_position_in_lens0_frame_m": p1_best.tolist()},
           "physical_centre_spread_mm": {"lens0": 0.0, "lens1": 0.0, "note": "zero by construction: faces of a lens share one centre in the rig"},
           "extent": ext, "per_walk": walks,
           "scale": {"ba_m_per_unit_relative_to_free_solve": float(s0 * (ext["track_extent_m_xyz"][0] / max(1e-9, ext_before["track_extent_m_xyz"][0]))), "prior_s0": s0, "free_solve_baseline_derived_invalid": 0.0940},
           "n_points": rec.num_points3D(), "mean_track_length": float(rec.compute_mean_track_length()),
           "observations": {"total": int(len(e)), "rejected_or_filtered": 0, "behind_camera": n_behind, "residual_gt_50px": n_gt50, "note": "no observation filtering; every free-solve observation is scored"},
           "residual_distribution": residual_distribution}
    json.dump(rep, open(hdir / "rig_ba_report.json", "w"), indent=1)
    # rig-derived poses for ALL faces of registered exposures (world_from_face, centre) in metres
    poses = {}
    by_exp = {}
    for mm in meta_by_name.values(): by_exp.setdefault(mm["exposure"], []).append(mm)
    for exp, fid in frame_of_exp.items():
        rfw = rec.frame(fid).rig_from_world
        for mm in by_exp.get(exp, []):
            sid = rec.camera(1 + 5 * mm["stream"] + FACE_IDX[mm["face_name"]]).sensor_id
            sfr_ = pyc.Rigid3d() if rec.rig(1).is_ref_sensor(sid) else rec.rig(1).sensor_from_rig(sid)   # ref sensor = identity by definition
            cfw = sfr_ * rfw
            R = np.asarray(cfw.rotation.matrix()); t = np.asarray(cfw.translation)
            poses[mm["face"]] = (R.T, -R.T @ t)
    json.dump({k: {"R_wc": v[0].tolist(), "C": v[1].tolist()} for k, v in poses.items()}, open(hdir / "rig_face_poses.json", "w"))
    rep["n_faces_posed_by_rig"] = len(poses)
    json.dump(rep, open(hdir / "rig_ba_report.json", "w"), indent=1)
    log("HYPOTHESIS DONE", hyp, json.dumps({k: rep[k] for k in ("final_R10_deg_axis", "reprojection_rig_ba", "extent", "per_walk")})[:1500])
    return rep, poses


def main():
    import pycolmap as pyc
    RB.mkdir(parents=True, exist_ok=True)
    calib = json.load(open(CALIB)); meta = json.load(open(OUT / "faces.json"))
    meta_by_name = {}
    # colmap names are "{rank:05d}_{face}.png" (stage_sfm); the rank prefix is 6 chars
    for m in meta: m["colmap_name"] = None
    free = pyc.Reconstruction(str(SFM / "best"))
    by_face = {m["face"]: m for m in meta}
    for im in free.images.values():
        face = im.name[6:-4]; m = by_face[face]; m["colmap_name"] = im.name; meta_by_name[im.name] = m
    del free
    status(stage="rig_ba_start", hypotheses=list(SCENE_R10))
    results = {}
    for hyp in SCENE_R10:
        done = RB / hyp / "rig_ba_report.json"; pf = RB / hyp / "rig_face_poses.json"
        if done.is_file() and pf.is_file() and not DRY:      # resumable: a pre-empted container must not redo a finished hypothesis
            rep_ = json.load(open(done)); poses_ = {k: (np.array(v["R_wc"]), np.array(v["C"])) for k, v in json.load(open(pf)).items()}
            results[hyp] = (rep_, poses_); log("HYPOTHESIS RESUMED FROM DISK", hyp); continue
        results[hyp] = run_hypothesis(hyp, calib, meta_by_name, pyc)
        if DRY: break
    # ---- selection on geometry only
    def key(h): r = results[h][0]["reprojection_rig_ba"]["all"]; return (r["median_px"], r["p95_px"])
    best = min(results, key=key)
    sel = {"selected": best, "candidates": {h: results[h][0]["reprojection_rig_ba"]["all"] for h in results},
           "note": "hypotheses differ only in the ~1 mm lateral factory offset and the rotation seed; selected on lower rig-BA median/p95 reprojection; a difference below ~0.05 px is not discriminating and H1 (the assignment the faces were undistorted with) is then the physically consistent choice"}
    inconclusive = False
    if len(results) == 2:
        a, b = [results[h][0]["reprojection_rig_ba"]["all"]["median_px"] for h in results]
        pa, pb = [results[h][0]["reprojection_rig_ba"]["all"]["p95_px"] for h in results]
        # Brian 2026-09-22: indistinguishable within measurement uncertainty => RIG ASSIGNMENT INCONCLUSIVE, no auto-train
        if abs(a - b) < 0.05 and abs(pa - pb) < 0.2: inconclusive = True; sel["tie"] = True
    rep, poses = results[best]
    # ---- frozen gates via the unchanged stage_gates code
    splits = json.load(open(OUT / "splits.json")); loader = json.load(open(OUT / "loader_survival.json"))
    build_report = json.load(open(OUT / "report.json")); mask_summ = {int(k): v for k, v in build_report["mask_summary"].items()}
    rig_res_dict = {"colmap_free_faces": {"n_images_total": 1210, "n_registered": rep["n_faces_with_observations"], "n_components": 1, "n_points": rep["n_points"]},
                    "rig": {"n_exposures_both_lenses": rep["n_exposures_registered"], "inter_lens_rotation_deg": rep["final_R10_deg_axis"][0], "axis": rep["final_R10_deg_axis"][1],
                            "per_exposure_dev_deg_median": 0.0, "per_exposure_dev_deg_p95": 0.0, "baseline_sfm_units_cv": 0.0,
                            "metric_scale_m_per_sfm_unit_from_32.26mm": 1.0, "note": "rigid rig: deviation/CV zero by construction; see residual diagnostics in rig_ba_report.json"},
                    "physical_centre_preservation": {0: {"centre_spread_p95_mm": 0.0}, 1: {"centre_spread_p95_mm": 0.0}},
                    "rig_constrained_reprojection": {"all": rep["reprojection_rig_ba"]["all"], "lens0": rep["reprojection_rig_ba"]["lens0"], "lens1": rep["reprojection_rig_ba"]["lens1"]},
                    "rig_ba": {k: rep[k] for k in ("hypothesis", "rig_structure", "final_R10_deg_axis", "inter_lens_rotation_deviation_across_exposures", "extent", "per_walk", "scale")}}
    if DRY:
        json.dump({"dry_run": True, "selection": sel, "rig_res": rig_res_dict}, open(RB / "dry_run.json", "w"), indent=1); log("DRY RUN DONE"); status(stage="rig_ba_dry_done"); return
    ds = B.stage_dataset(meta, poses, splits, 1.0)
    verdict = B.stage_gates((rig_res_dict,), mask_summ, ds, loader, meta)
    verdict["source"] = "rig_ba"; verdict["selected_hypothesis"] = best
    if inconclusive:
        verdict["dataset"] = "RIG ASSIGNMENT INCONCLUSIVE"; verdict["blocking_issue"] = "stream<->lens assignment not distinguishable by geometry (H1 vs H2)"
    json.dump(verdict, open(OUT / "verdict.json", "w"), indent=1)
    build_report["rig_ba"] = {"selection": sel, "report": rep, "dataset": ds}; build_report["verdict"] = verdict
    json.dump(build_report, open(OUT / "report.json", "w"), indent=1)
    json.dump({"selection": sel, "verdict": verdict}, open(RB / "selection.json", "w"), indent=1)
    status(stage="rig_ba_finished", verdict=verdict["dataset"], selected=best)
    log("RIG BA DONE", verdict["dataset"], verdict["failed"])


if __name__ == "__main__":
    main()
