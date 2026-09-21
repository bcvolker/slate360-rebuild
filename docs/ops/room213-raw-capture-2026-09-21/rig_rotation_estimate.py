"""Task 3: factory intrinsics + translation as fixed priors; estimate ONLY the inter-lens
rotation from common-scene features in the overlap band, and bound the induced pixel error.

Method: same-timestamp lens pair (tripod, static). ORB features in each lens frame restricted
to the outer band (theta 70-100 deg from each axis, where both lenses see the scene). Match,
unproject both sets to unit rays with the factory Mei model, RANSAC-Kabsch for the rotation
R_10 mapping lens-0 rays into lens-1 rays. Translation (32.26 mm) is NOT modelled in the
ray alignment; its parallax at the typical band depth d is ~atan(0.032/d): 1.2 deg @1.5 m,
0.6 deg @3 m -- reported as the floor of this estimate's accuracy. Nothing else is fitted.
Usage: python rig_rotation_estimate.py <RAW_DIR>
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import x4_mei_model as M  # noqa: E402

RAW = Path(sys.argv[1])
lenses = M.parse_mei(); circ = M.parse_offset()
FRAME_CIRCLE = {0: (1870.9, 1855.5, 2101.2), 1: (1925.8, 1843.8, 2106.2)}


def crop(stream, lens):
    c = circ[lens]; fc = FRAME_CIRCLE[stream]; s = fc[2] / c["r"]
    return s, s * (c["cx"] - c["canvas_x_offset"]) - fc[0], s * c["cy"] - fc[1]


def band_mask(stream, L, lo=70, hi=100):
    yy, xx = np.mgrid[0:3840:4, 0:3840:4]
    X, v = L.unproject_frame(np.stack([xx, yy], -1).astype(float))
    th = np.degrees(np.arccos(np.clip(X[..., 2], -1, 1)))
    m = (v & (th >= lo) & (th <= hi)).astype(np.uint8) * 255
    return cv2.resize(m, (3840, 3840), interpolation=cv2.INTER_NEAREST)


def kabsch(P, Q):
    H = P.T @ Q; U, S, Vt = np.linalg.svd(H); d = np.sign(np.linalg.det(Vt.T @ U.T))
    D = np.diag([1, 1, d]); return Vt.T @ D @ U.T


def ransac_R(P, Q, thr_deg=1.0, iters=3000, seed=0):
    rng = np.random.default_rng(seed); best = (None, 0, None)
    thr = math.radians(thr_deg)
    for _ in range(iters):
        idx = rng.choice(len(P), 3, replace=False); R = kabsch(P[idx], Q[idx])
        ang = np.arccos(np.clip(np.sum((P @ R.T) * Q, 1), -1, 1)); inl = ang < thr
        if inl.sum() > best[1]:
            best = (R, int(inl.sum()), inl)
    R = kabsch(P[best[2]], Q[best[2]]); ang = np.degrees(np.arccos(np.clip(np.sum((P @ R.T) * Q, 1), -1, 1)))
    return R, best[2], ang


results = []
for assign_name, la, lb in (("stream0=A,stream1=B", 0, 1), ("stream0=B,stream1=A", 1, 0)):
    L0 = M.MeiLens(lenses[la], *crop(0, la)); L1 = M.MeiLens(lenses[lb], *crop(1, lb))
    for tag in ("vid020_p1_t5.97", "vid020_p3_t42.01"):
        im0 = cv2.imread(str(RAW / f"{tag}_lens0.png"), 0); im1 = cv2.imread(str(RAW / f"{tag}_lens1.png"), 0)
        m0 = band_mask(0, L0); m1 = band_mask(1, L1)
        orb = cv2.ORB_create(6000, scaleFactor=1.2, nlevels=8)
        k0, d0 = orb.detectAndCompute(im0, m0); k1, d1 = orb.detectAndCompute(im1, m1)
        if d0 is None or d1 is None:
            results.append({"assignment": assign_name, "frame": tag, "error": "no features"}); continue
        matches = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(d0, d1)
        p0 = np.array([k0[m.queryIdx].pt for m in matches]); p1 = np.array([k1[m.trainIdx].pt for m in matches])
        r0, v0 = L0.unproject_frame(p0); r1, v1 = L1.unproject_frame(p1); ok = v0 & v1
        r0 = r0[ok] / np.linalg.norm(r0[ok], axis=1, keepdims=True); r1 = r1[ok] / np.linalg.norm(r1[ok], axis=1, keepdims=True)
        if len(r0) < 12:
            results.append({"assignment": assign_name, "frame": tag, "error": f"only {len(r0)} matches"}); continue
        R, inl, ang = ransac_R(r0, r1)
        rv, _ = cv2.Rodrigues(R); angle = float(np.degrees(np.linalg.norm(rv))); axis = (rv.ravel() / max(1e-9, np.linalg.norm(rv))).tolist()
        # residual in pixels at lens-1 image scale (~1000 px/rad near center under Mei)
        f_eff = lenses[lb]["fx"] * crop(1, lb)[0] / (1 + lenses[lb]["xi"])
        res = {"assignment": assign_name, "frame": tag, "band_matches": int(len(r0)), "inliers": int(inl.sum()),
               "inlier_ratio": float(inl.mean()), "R_angle_deg": angle, "R_axis": axis,
               "inlier_ray_rms_deg": float(np.sqrt((ang[inl] ** 2).mean())), "inlier_ray_p95_deg": float(np.percentile(ang[inl], 95)),
               "approx_px_rms_at_f_eff": float(np.sqrt((ang[inl] ** 2).mean()) * math.pi / 180 * f_eff),
               "translation_parallax_floor_deg_at_1p5m_3m": [round(math.degrees(math.atan(0.03226 / 1.5)), 2), round(math.degrees(math.atan(0.03226 / 3.0)), 2)]}
        results.append(res)
        print(json.dumps(res))
json.dump(results, open(RAW / "rig_rotation_estimate.json", "w"), indent=1)
print("RIG ROTATION DONE")
