#!/usr/bin/env python3
"""Build the viewer sidecars for a splat trained from a COLMAP model.

    walk_from_colmap.py --sparse <dataset/sparse/0> --out <dir> --name <model>
                        [--mode 2d|360] [--camera-height 1.45] [--station-spacing 0.7]

Writes <out>/<name>.manifest.json and <out>/<name>.walk.json in the Twin viewer's
world frame, which is:  p_world = metric_scale * q * F(p_colmap)  with
F = diag(1,-1,-1)  (Spark's rotation=[pi,0,0] on the splat mesh) and q the
manifest correction quaternion applied to the parent group.

Up vector  : mean camera "up" (-Y of the camera in COLMAP convention) over all
             registered frames; phones and 360 rigs are held roughly upright.
Floor      : lowest dense peak of 3D-point heights along the up vector.
Scale      : COLMAP units are arbitrary; we set metres so the median camera
             sits --camera-height above the floor (1.45 m phone at chest,
             1.6 m 360 camera on a hand pole).
Stations   : camera centres (one per panorama for 360), thinned to
             --station-spacing metres along the path, heading = camera yaw.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import pycolmap

FLIP = np.diag([1.0, -1.0, -1.0])


def quat_from_matrix(R: np.ndarray) -> list[float]:
    """Rotation matrix -> [x, y, z, w]."""
    m = R
    t = np.trace(m)
    if t > 0:
        s = math.sqrt(t + 1.0) * 2
        w = 0.25 * s
        x = (m[2, 1] - m[1, 2]) / s
        y = (m[0, 2] - m[2, 0]) / s
        z = (m[1, 0] - m[0, 1]) / s
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = math.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        w = (m[2, 1] - m[1, 2]) / s
        x = 0.25 * s
        y = (m[0, 1] + m[1, 0]) / s
        z = (m[0, 2] + m[2, 0]) / s
    elif m[1, 1] > m[2, 2]:
        s = math.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        w = (m[0, 2] - m[2, 0]) / s
        x = (m[0, 1] + m[1, 0]) / s
        y = 0.25 * s
        z = (m[1, 2] + m[2, 1]) / s
    else:
        s = math.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        w = (m[1, 0] - m[0, 1]) / s
        x = (m[0, 2] + m[2, 0]) / s
        y = (m[1, 2] + m[2, 1]) / s
        z = 0.25 * s
    q = np.array([x, y, z, w])
    q /= np.linalg.norm(q)
    return [float(v) for v in q]


def rotation_aligning(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Smallest rotation taking unit vector a onto unit vector b."""
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    v = np.cross(a, b)
    c = float(np.dot(a, b))
    if np.linalg.norm(v) < 1e-9:
        if c > 0:
            return np.eye(3)
        # 180 degrees: pick any axis orthogonal to a
        axis = np.cross(a, [1.0, 0.0, 0.0])
        if np.linalg.norm(axis) < 1e-6:
            axis = np.cross(a, [0.0, 1.0, 0.0])
        axis /= np.linalg.norm(axis)
        K = np.array([[0, -axis[2], axis[1]], [axis[2], 0, -axis[0]], [-axis[1], axis[0], 0]])
        return np.eye(3) + 2 * K @ K
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K * (1.0 / (1.0 + c))


def estimate_up_and_floor(
    cams: np.ndarray, cam_ups: np.ndarray, cam_rights: np.ndarray, pts: np.ndarray
) -> tuple[np.ndarray, float, float, str]:
    """Gravity direction, floor height and median camera height (COLMAP units).

    The image's up axis is NOT a safe gravity guess: iPhone video frames are stored
    landscape (up = camera +/-X) and a 360 camera may hang inverted. Two cues that
    do not depend on how the device was held:
      1. a walking operator keeps the camera at near-constant height, so along the
         true vertical the camera centres have the smallest spread relative to the
         scene extent;
      2. the floor is the dense horizontal slab on one side of the cameras; the
         ceiling is usually thin (phones rarely film it, 360 solves here skip the
         up face). Up points away from the denser slab.
    Candidates are the mean camera up and right axes (+/-), refined against the
    point cloud's dominant plane normal near the chosen axis.
    """

    def unit(v: np.ndarray) -> np.ndarray:
        return v / max(np.linalg.norm(v), 1e-9)

    candidates = [unit(cam_ups.mean(axis=0)), unit(cam_rights.mean(axis=0))]
    best, best_score = None, np.inf
    for u in candidates:
        h_pts = pts @ u
        extent = max(float(np.percentile(h_pts, 98) - np.percentile(h_pts, 2)), 1e-6)
        spread = float(np.std(cams @ u)) / extent
        if spread < best_score:
            best, best_score = u, spread
    assert best is not None
    axis = best
    # Refine with the point cloud: PCA of points whose height (along axis) sits within
    # the bottom/top slabs gives the plane normal; keep it only if it stays near the axis.
    h = pts @ axis
    med_cam = float(np.median(cams @ axis))
    lo, hi = np.percentile(h, 1), np.percentile(h, 99)
    # Which side is the floor? Compare the strongest 5 cm-ish bin below vs above the cameras,
    # ignoring 0.5 "units" around camera height so counters/tables do not vote.
    nbins = 120
    hist, edges = np.histogram(h, bins=np.linspace(lo, hi, nbins + 1))
    centers = 0.5 * (edges[:-1] + edges[1:])
    guard = 0.15 * (hi - lo)
    below = hist[centers < med_cam - guard]
    above = hist[centers > med_cam + guard]
    below_peak = int(below.max()) if below.size else 0
    above_peak = int(above.max()) if above.size else 0
    up = axis if below_peak >= above_peak else -axis
    note = "floor below cameras" if below_peak >= above_peak else "flipped: dense slab was above cameras"
    # Recompute along the oriented up and locate the floor peak below the cameras.
    h = pts @ up
    med_cam = float(np.median(cams @ up))
    lo = float(np.percentile(h, 1))
    hist, edges = np.histogram(h, bins=np.linspace(lo, med_cam, 80))
    centers = 0.5 * (edges[:-1] + edges[1:])
    # The floor is the lowest thing in the room. A slab search kept landing on tables
    # when the floor was sparse (360 side faces see it obliquely), so take the lowest
    # dense percentile instead: floaters below the floor are cut by the percentile,
    # furniture never is the minimum.
    del hist, edges, centers
    floor_h = float(np.percentile(h, 1.5))
    if med_cam - floor_h <= 1e-6:
        floor_h = med_cam - 1.0
    return up, floor_h, med_cam, note


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sparse", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--mode", choices=["2d", "360"], default="2d")
    ap.add_argument("--camera-height", type=float, default=None)
    ap.add_argument("--station-spacing", type=float, default=0.7)
    ap.add_argument("--ceiling-height", type=float, default=2.4, help="metres above floor for the dollhouse lid")
    a = ap.parse_args()

    cam_h = a.camera_height if a.camera_height is not None else (1.6 if a.mode == "360" else 1.45)
    rec = pycolmap.Reconstruction(a.sparse)
    images = sorted(rec.images.values(), key=lambda im: im.name)
    if not images:
        print("RESULT error no registered images")
        return 6

    # --- camera centres and up vectors in COLMAP world
    centres, ups, rights, forwards, names = [], [], [], [], []
    for im in images:
        cfw = im.cam_from_world()
        R = np.asarray(cfw.rotation.matrix())  # world -> cam
        t = np.asarray(cfw.translation)
        C = -R.T @ t
        # camera axes in world: columns of R^T. COLMAP camera: x right, y down, z forward.
        Rt = R.T
        centres.append(C)
        ups.append(-Rt[:, 1])
        rights.append(Rt[:, 0])
        forwards.append(Rt[:, 2])
        names.append(im.name)
    centres = np.array(centres)
    ups = np.array(ups)
    rights = np.array(rights)
    forwards = np.array(forwards)

    if a.mode == "360":
        # rig: one pose per panorama. Faces share a centre; keep the front face (or first of each stem).
        stems: dict[str, int] = {}
        for i, n in enumerate(names):
            stem = Path(n).stem
            if stem not in stems or n.startswith("front/"):
                stems[stem] = i
        keep = sorted(stems.values(), key=lambda i: names[i])
        # up for a 360 rig: front-face up is the rig up
        up_idx = [i for i in keep]
    else:
        keep = list(range(len(names)))
        up_idx = keep

    pts = np.array([p.xyz for p in rec.points3D.values()]) if rec.points3D else centres
    up, floor_h, med_cam_h, up_note = estimate_up_and_floor(centres[keep], ups[up_idx], rights[up_idx], pts)
    scale = cam_h / (med_cam_h - floor_h)

    # --- rotation: up -> +Y in the viewer frame (after the Spark flip)
    # viewer coords before q: v = F p. up in that frame: F up.
    up_f = FLIP @ up
    Rq = rotation_aligning(up_f, np.array([0.0, 1.0, 0.0]))

    def to_world(p: np.ndarray) -> np.ndarray:
        return scale * (Rq @ (FLIP @ p))

    world_centres = np.array([to_world(c) for c in centres])
    floor_y = float(scale * (Rq @ (FLIP @ (up * floor_h)))[1])
    # sanity: floor_y should equal scale*floor_h up to sign handling
    floor_y = float((to_world(centres[keep].mean(axis=0)))[1] - scale * (med_cam_h - floor_h)) if abs(floor_y) > 1e6 else floor_y

    # --- stations: thin along the path
    stations = []
    last = None
    for i in keep:
        p = world_centres[i]
        if last is not None and np.linalg.norm(p - last) < a.station_spacing:
            continue
        last = p
        f = Rq @ (FLIP @ forwards[i])
        # viewer yaw convention: camera looks along (-sin yaw, -cos yaw) in XZ
        yaw = math.atan2(-f[0], -f[2])
        stations.append({
            "id": f"s{len(stations):03d}",
            "position": [round(float(p[0]), 3), round(float(p[1]), 3), round(float(p[2]), 3)],
            "floorIndex": 0,
            "headingY": round(yaw, 4),
            "source": names[i],
        })

    all_w = np.array([to_world(p) for p in pts])
    lo3 = np.percentile(all_w, 2, axis=0)
    hi3 = np.percentile(all_w, 98, axis=0)
    centre = 0.5 * (lo3 + hi3)
    radius = float(0.5 * np.linalg.norm(hi3 - lo3))

    q = quat_from_matrix(Rq)
    manifest = {
        "version": 2,
        "coordinate_system": "viewer-post-flip",
        "source": "walk_from_colmap",
        "up_axis": "+Y",
        "correction_quaternion": q,
        "metric_scale": round(float(scale), 6),
        "metric_scale_applied": False,
        "bounds": {"min": lo3.round(3).tolist(), "max": hi3.round(3).tolist(),
                   "center": centre.round(3).tolist(), "radius": round(radius, 3)},
        "floor_y": round(floor_y, 3),
        "ceiling_cut_y": round(floor_y + a.ceiling_height, 3),
        "interior_entry_point": stations[0]["position"] if stations else None,
    }
    walk = {
        "version": 1,
        "source": "walk_from_colmap",
        "units": "metres",
        "stations": stations,
        "floors": [{"index": 0, "label": "Ground", "elevationY": round(floor_y, 3)}],
        "ceilingCutY": round(floor_y + a.ceiling_height, 3),
        "cameraCount": len(keep),
    }
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / f"{a.name}.manifest.json").write_text(json.dumps(manifest, indent=1))
    (out / f"{a.name}.walk.json").write_text(json.dumps(walk, indent=1))
    print("RESULT walk " + json.dumps({
        "cameras": len(keep), "stations": len(stations), "scale": round(float(scale), 4),
        "floor_y": round(floor_y, 3), "median_cam_above_floor_m": round(float(scale * (med_cam_h - floor_h)), 3),
        "up_colmap": up.round(3).tolist(), "up_note": up_note, "bounds_m": (hi3 - lo3).round(2).tolist(),
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
