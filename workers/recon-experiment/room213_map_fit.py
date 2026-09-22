"""Room 213 -- ONE targeted correction of the factory-Mei -> physical 3840x3840 stream mapping.

Authorised 2026-09-22 after the rigid-rig BA exposed a monotonic residual growth with ORIGINAL sensor radius
(1.5 px at r<800 -> 4.3 px at r 1700-1950, both lenses, all walks, no motion correlation). The only non-factory
quantity in the face generation is the crop similarity (s, ox, oy) per lens, previously taken from lens-circle
geometry alone. This module:
  1. AUDITS the current mapping (constants, derivation, conventions, raw-pixel -> ray -> raw-pixel round trips).
  2. FITS only (s, ox, oy) per physical lens (6 numbers total) on a deterministic CALIBRATION subset of the
     existing rigid-rig solution's observations (point-track id even), with rig poses / 3D points / Mei
     coefficients / xi / faces / matches held fixed, Cauchy-robust, observations with current residual > 20 px
     (repetitive-structure mismatches) excluded from the fit. Nothing else is free.
  3. Evaluates the fitted mapping on the UNTOUCHED VALIDATION subset (point-track id odd), poses fixed.
  4. Writes corrected face-pixel coordinates for every existing keypoint (same images, same matches, same
     tracks): a keypoint produced at frame pixel p under the old mapping is re-interpreted through the new
     mapping and projected back into the ideal face camera. The SAME rigid-rig reconstruction is then run once
     on these corrected observations (room213_rig_ba.py with RIG_BA_KP_OVERRIDE).
"""
from __future__ import annotations

import json
import math
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, "/root/recon-experiment")
import room213_raw_build as B  # noqa: E402
import x4_mei_model as M  # noqa: E402

OUT = B.OUT; V2 = OUT / "rig_ba_v2" / "H1_stream0=A" / "rec"; V3 = OUT / "rig_ba_v3"
STATUS = B.BASE / "status.json"
FACE_IDX = {n: i for i, (n, _, _) in enumerate(B.FACES)}
FACE_ROT = {n: B.face_R(y, p) for n, y, p in B.FACES}
MAX_FIT_RESID = 20.0      # obvious mismatches (repetitive structure) are excluded from the fit
FIT_PER_LENS = 60000      # subsample of calibration observations per lens, stratified by sensor radius


def log(*a):
    print(*a, flush=True)


def status(**kw):
    try:
        base = json.loads(STATUS.read_text()) if STATUS.is_file() else {}
    except Exception:  # noqa: BLE001
        base = {}
    base.update({"timestamp_utc": datetime.now(timezone.utc).isoformat(), "phase": "map_fit", **kw})
    STATUS.write_text(json.dumps(base, indent=1))


def face_rays(xy):
    """COLMAP keypoint (pixel-centre convention x = i + 0.5) -> unit ray in the ideal face camera.
    Face generation used u = (i - FACE/2 + 0.5)/FL for pixel index i, i.e. the same convention."""
    d = np.stack([(xy[:, 0] - B.FACE / 2) / B.FL, (xy[:, 1] - B.FACE / 2) / B.FL, np.ones(len(xy))], 1)
    return d / np.linalg.norm(d, axis=1, keepdims=True)


def rays_to_face(d):
    z = np.where(d[:, 2] > 1e-9, d[:, 2], np.nan)
    return np.stack([B.FL * d[:, 0] / z + B.FACE / 2, B.FL * d[:, 1] / z + B.FACE / 2], 1)


def frame_pixels(xy, face_name, lens_old):
    """Old mapping: face keypoint -> the raw 3840 frame pixel it was resampled from (cv2.remap integer-centre convention)."""
    d_lens = face_rays(xy) @ FACE_ROT[face_name].T          # X_lens = R_f X_face
    p, valid = lens_old.project_frame(d_lens)
    return p, valid


def corrected_face_xy(p_frame, face_name, lens_new):
    """New mapping: raw frame pixel -> lens ray -> ideal face pixel."""
    d_lens, valid = lens_new.unproject_frame(p_frame)
    d_lens = d_lens / np.linalg.norm(d_lens, axis=1, keepdims=True)
    d_face = d_lens @ FACE_ROT[face_name]                    # X_face = R_f^T X_lens  (row vectors: d_lens @ R_f)
    return rays_to_face(d_face), valid


def audit(calib, lenses_old):
    """Document the mapping and verify raw-pixel -> ray -> raw-pixel round trips at the requested radii."""
    a = {"factory_calibration_coordinate_system": "Mei/unified (OpenCV omnidir) on a 16000x6000 calibration canvas; lens A occupies x in [0,8000), lens B x in [8000,16000); fx,fy,cx,cy in canvas px; angles/translations from field 54 (t used; per-lens Euler angles NOT used); radial k1-k3 + tangential p1,p2 on the normalised Mei image plane",
         "factory_circle_offset_metadata_field53": calib["circle_field53"],
         "canvas_interpretation": "field-53 circle = lit image circle on the canvas (r_A 2899.96 @ (4001.90,3007.05), r_B 2882.97 @ (12003.73,3004.22)); the 3840x3840 stream is assumed to be a uniformly scaled, translated crop of the canvas: u_f = s*(u_canvas - 8000*[lens B]) - ox, v_f = s*v_canvas - oy (no rotation, no flip, no anisotropy)",
         "stream_orientation": "stream 0 = physical lens A (H1, the assignment the faces were undistorted with and the one supported by the rig BA); stream 1 = lens B; frames decoded by PyAV from the two HEVC tracks with no rotation/flip applied; face generation samples the decoded frame directly with cv2.remap (integer pixel-centre convention; maps computed from the Mei projection of face rays)",
         "transforms_between_decoded_frame_and_ray": ["decoded 3840x3840 frame pixel (u_f,v_f) [integer = pixel centre]", "canvas = ((u_f + ox)/s + 8000*[B], (v_f + oy)/s)", "Mei inverse: normalised (xd,yd) = ((u-cx)/fx, (v-cy)/fy) -> Newton inverse of radial/tangential distortion -> unit-sphere lift with xi -> lens ray", "face ray = R_face_from_lens^T * lens ray; face pixel x = FL*X/Z + 1280 (+0.5 centre convention on both sides, consistent)"],
         "current_s_ox_oy": {f"lens{s}": {"s": L.s, "ox": L.ox, "oy": L.oy} for s, L in lenses_old.items()},
         "derivation": "s = r_frame_circle / r_factory_circle; ox = s*(cx_factory - 8000*[B]) - cx_frame; oy = s*cy_factory - cy_frame, with the frame circle least-squares fitted to the lit-disc boundary of the decoded frames (FRAME_CIRCLE: stream0 r 2101.2 @ (1870.9,1855.5), stream1 r 2106.2 @ (1925.8,1843.8)). Only quantities in the whole chain that are NOT factory metadata.",
         "half_pixel_convention": "face keypoints (COLMAP, x = i+0.5) and face generation (u=(i-1280+0.5)/FL) agree; frame side uses cv2.remap integer-centre convention for both the circle fit and the Mei projection; any residual half-pixel inconsistency is <= 0.5 px and cannot produce a radius-dependent ramp",
         "note": "the lit-disc radius is a photometric boundary (vignetting / mechanical vignette), not a geometric calibration feature; a 0.3 % error in s is ~5 px at r = 1800 px, i.e. the observed ramp"}
    rt = {}
    for s, L in lenses_old.items():
        cx, cy, cr = B.FRAME_CIRCLE[s]; rows = []
        for r in (0, 500, 1000, 1500, 1800, 2000, 2080):
            for ang in (0, 90, 180, 270):
                p = np.array([[cx + r * math.cos(math.radians(ang)), cy + r * math.sin(math.radians(ang))]])
                d, ok = L.unproject_frame(p)
                if not ok[0]: rows.append({"r": r, "az": ang, "valid": False}); continue
                q, ok2 = L.project_frame(d / np.linalg.norm(d, axis=1, keepdims=True))
                theta = math.degrees(math.acos(np.clip(d[0, 2] / np.linalg.norm(d[0]), -1, 1)))
                rows.append({"r": r, "az": ang, "valid": bool(ok2[0]), "roundtrip_px": float(np.hypot(*(q[0] - p[0]))), "theta_from_axis_deg": theta})
        rt[f"lens{s}"] = rows
    a["roundtrips"] = rt
    a["roundtrip_caveat"] = "round trips only test numerical invertibility of the SAME similarity; they cannot detect a wrong s/ox/oy -- that is what the calibration/validation fit below tests"
    return a


def collect_observations(rec, by_face):
    """Every observation of the rigid-rig solution: face xy, predicted face pixel under current poses/points, labels."""
    pts = {pid: np.asarray(p.xyz) for pid, p in rec.points3D.items()}
    obs = []
    for im in rec.images.values():
        m = by_face[im.name[6:-4]]
        cfw = im.cam_from_world(); R = np.asarray(cfw.rotation.matrix()); t = np.asarray(cfw.translation)
        idx = [(i, p.point3D_id) for i, p in enumerate(im.points2D) if p.has_point3D()]
        if not idx: continue
        X = np.array([pts[pid] for _, pid in idx]); xy = np.array([np.asarray(im.points2D[i].xy) for i, _ in idx])
        Xc = X @ R.T + t; z = np.where(Xc[:, 2] > 1e-9, Xc[:, 2], np.nan)
        pred = np.stack([B.FL * Xc[:, 0] / z + B.FACE / 2, B.FL * Xc[:, 1] / z + B.FACE / 2], 1)
        for k, (i, pid) in enumerate(idx):
            obs.append((xy[k, 0], xy[k, 1], pred[k, 0], pred[k, 1], m["stream"], FACE_IDX[m["face_name"]], im.image_id, pid, i))
    A = np.array(obs, dtype=np.float64)
    return A  # columns: x, y, px, py, lens, face, image_id, point_id, point2D_idx


def fit_lens(lens_idx, A, calib, lens_old, rng):
    """Fit (s, ox, oy) for one physical lens on the CALIBRATION subset (even point ids), Cauchy loss."""
    from scipy.optimize import least_squares
    sel = (A[:, 4] == lens_idx)
    xy = A[sel, 0:2]; pred = A[sel, 2:4]; faces = A[sel, 5].astype(int); pid = A[sel, 7].astype(int)
    e_old = np.hypot(*(xy - pred).T)
    cal = (pid % 2 == 0); val = ~cal
    # frame pixels under the old mapping (fixed for the whole fit: these are where the keypoints physically are)
    p_frame = np.zeros_like(xy); valid_old = np.zeros(len(xy), bool)
    for fi, (fn, _, _) in enumerate(B.FACES):
        mk = faces == fi
        if mk.any():
            p, v = frame_pixels(xy[mk], fn, lens_old); p_frame[mk] = p; valid_old[mk] = v
    cx, cy, _ = B.FRAME_CIRCLE[lens_idx]; srad = np.hypot(p_frame[:, 0] - cx, p_frame[:, 1] - cy)
    fit_mask = cal & valid_old & np.isfinite(e_old) & (e_old <= MAX_FIT_RESID)
    # stratified subsample across sensor radius so the periphery is represented
    bins = np.digitize(srad, [800, 1300, 1700, 1950]); pick = []
    per_bin = FIT_PER_LENS // 5
    for b in range(5):
        cand = np.where(fit_mask & (bins == b))[0]
        pick.append(rng.choice(cand, min(per_bin, len(cand)), replace=False) if len(cand) else np.array([], int))
    pick = np.concatenate(pick)
    lens_params = calib["lenses"][lens_idx]
    def predict(theta, ids):
        L = M.MeiLens(lens_params, float(theta[0]), float(theta[1]), float(theta[2])); out = np.full((len(ids), 2), np.nan); ok_all = np.zeros(len(ids), bool)
        for fi, (fn, _, _) in enumerate(B.FACES):
            mk = faces[ids] == fi
            if mk.any():
                q, ok = corrected_face_xy(p_frame[ids][mk], fn, L); out[mk] = q; ok_all[mk] = ok
        return out, ok_all
    def resid(theta):
        q, ok = predict(theta, pick); r = (q - pred[pick]); r[~ok | ~np.isfinite(r).all(1)] = 0.0
        return r.ravel()
    x0 = np.array([lens_old.s, lens_old.ox, lens_old.oy]); t0 = time.time()
    res = least_squares(resid, x0, loss="cauchy", f_scale=2.0, method="trf", x_scale=[1e-3, 1.0, 1.0], max_nfev=200)
    theta = res.x; L_new = M.MeiLens(lens_params, *[float(v) for v in theta])
    # evaluate before/after on ALL cal and val observations with poses fixed
    q_new, ok_new = predict(theta, np.arange(len(xy))); e_new = np.hypot(*(q_new - pred).T); e_new = np.where(ok_new & np.isfinite(e_new), e_new, np.nan)
    def bystats(mask):
        out = {}
        for name, (a, b) in {"<800": (0, 800), "800-1300": (800, 1300), "1300-1700": (1300, 1700), "1700-1950": (1700, 1950), "all": (0, 1e9)}.items():
            mk = mask & (srad >= a) & (srad < b) & np.isfinite(e_new) & np.isfinite(e_old)
            out[name] = {"n": int(mk.sum()), "old_median": float(np.median(e_old[mk])) if mk.any() else None, "new_median": float(np.median(e_new[mk])) if mk.any() else None,
                         "old_p95": float(np.percentile(e_old[mk], 95)) if mk.any() else None, "new_p95": float(np.percentile(e_new[mk], 95)) if mk.any() else None}
        return out
    rep = {"lens": lens_idx, "n_obs": int(len(xy)), "n_cal": int(cal.sum()), "n_val": int(val.sum()), "n_excluded_from_fit_resid_gt_20px": int((cal & (e_old > MAX_FIT_RESID)).sum()),
           "n_fit_subsample": int(len(pick)), "fit_subsample_by_radius_bin": [int((bins[pick] == b).sum()) for b in range(5)],
           "old": {"s": lens_old.s, "ox": lens_old.ox, "oy": lens_old.oy}, "new": {"s": float(theta[0]), "ox": float(theta[1]), "oy": float(theta[2])},
           "delta": {"s_percent": float((theta[0] / lens_old.s - 1) * 100), "ox_px": float(theta[1] - lens_old.ox), "oy_px": float(theta[2] - lens_old.oy)},
           "lsq": {"cost_initial": float(np.sum(resid(x0) ** 2) / 2), "cost_final": float(res.cost), "nfev": int(res.nfev), "status": int(res.status), "elapsed_s": round(time.time() - t0, 1)},
           "poses_fixed_calibration_subset": bystats(cal), "poses_fixed_validation_subset_untouched": bystats(val)}
    return rep, L_new


def main():
    import pycolmap as pyc
    V3.mkdir(parents=True, exist_ok=True)
    calib = json.load(open(B.CALIB)); meta = json.load(open(OUT / "faces.json")); by_face = {m["face"]: m for m in meta}
    lenses_old, _ = B.load_calib()
    status(stage="map_fit_audit")
    aud = audit(calib, lenses_old); json.dump(aud, open(V3 / "mapping_audit.json", "w"), indent=1)
    log("AUDIT", json.dumps({k: aud[k] for k in ("current_s_ox_oy",)}), "roundtrip max px:", max(r.get("roundtrip_px", 0) for rows in aud["roundtrips"].values() for r in rows))
    rec = pyc.Reconstruction(str(V2)); A = collect_observations(rec, by_face); log("OBS", len(A))
    status(stage="map_fit_fit", n_obs=int(len(A)))
    rng = np.random.default_rng(213); fit = {}; lenses_new = {}
    for lens_idx in (0, 1):
        rep, L_new = fit_lens(lens_idx, A, calib, lenses_old[lens_idx], rng); fit[f"lens{lens_idx}"] = rep; lenses_new[lens_idx] = L_new
        log("FIT lens", lens_idx, json.dumps({k: rep[k] for k in ("old", "new", "delta", "lsq")}))
        log("  VAL by radius:", json.dumps(rep["poses_fixed_validation_subset_untouched"]))
    fit["split_rule"] = "point-track id even = calibration (fit), odd = validation (never used in the fit); poses/points fixed at the rig_ba_v2 H1 solution during the fit"
    json.dump(fit, open(V3 / "map_fit.json", "w"), indent=1)
    # corrected keypoints for EVERY point2D of every registered image (same images, matches, tracks)
    status(stage="map_fit_correct_keypoints")
    free = pyc.Reconstruction(str(B.OUT / "sfm" / "best")); corrected = {}; n_invalid = 0; n_kp = 0; shift = []
    for im in free.images.values():
        if not im.has_pose: continue
        m = by_face[im.name[6:-4]]; s = m["stream"]; fn = m["face_name"]
        xy = np.array([np.asarray(p.xy) for p in im.points2D], dtype=np.float64).reshape(-1, 2)
        p, v = frame_pixels(xy, fn, lenses_old[s]); q, v2 = corrected_face_xy(p, fn, lenses_new[s])
        ok = v & v2 & np.isfinite(q).all(1); q[~ok] = xy[~ok]; n_invalid += int((~ok).sum()); n_kp += len(xy)
        shift.append(np.hypot(*(q - xy).T)[ok]); corrected[str(im.image_id)] = q
    shift = np.concatenate(shift)
    np.savez_compressed(V3 / "corrected_keypoints.npz", **corrected)
    summ = {"n_images": len(corrected), "n_keypoints": n_kp, "n_kept_original_invalid": n_invalid, "keypoint_shift_px": {"median": float(np.median(shift)), "p95": float(np.percentile(shift, 95)), "max": float(shift.max())}}
    json.dump(summ, open(V3 / "corrected_keypoints_summary.json", "w"), indent=1); log("CORRECTED", json.dumps(summ))
    status(stage="map_fit_done", fit={k: v["delta"] for k, v in fit.items() if k.startswith("lens")})


if __name__ == "__main__":
    main()
