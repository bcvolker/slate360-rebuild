#!/usr/bin/env python3
"""Put a Brush splat into the phone's ARKit frame: metric, gravity-aligned, LiDAR-registered.

    align_arkit.py --sparse <dataset/sparse/0> --poses lidar_poses.json --ply gaussian.ply
                   --lidar lidar_capture.ply --out <dir> --name <model>
                   [--out-ply aligned.ply] [--station-spacing 0.7] [--ceiling-height 2.2]

The COLMAP solve is up to an arbitrary similarity. The iPhone recorded an ARKit pose for
every still (lidar_poses.json v6: frames[].photo ↔ COLMAP image name), and ARKit's world is
metric with +Y up (worldAlignment = gravity). A robust Umeyama fit on the matched camera
centres gives the SIM3 COLMAP → ARKit. We then:
  * write <name>.manifest.json  — correction_quaternion + metric_scale for the viewer group
  * write <out-ply>             — the PLY with centres pre-translated so the viewer needs no
                                  translation (p_world = s·Q·F·(p + d), d = R⁻¹t/s)
  * write <name>.walk.json      — stations straight from ARKit poses, floor from the LiDAR cloud
  * write <name>.frame.json     — COLMAP-frame up/floor/scale for clean_ply.py
  * print RESULT align {...}    — residuals so a bad fit is visible

Viewer convention: the splat mesh carries rotation=[π,0,0] (F = diag(1,-1,-1)); the parent
group carries correction_quaternion (Q) and metric_scale (s).
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
import pycolmap

FLIP = np.diag([1.0, -1.0, -1.0])


def quat_xyzw_from_matrix(m: np.ndarray) -> list[float]:
    t = np.trace(m)
    if t > 0:
        s = math.sqrt(t + 1.0) * 2
        w, x, y, z = 0.25 * s, (m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = math.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        w, x, y, z = (m[2, 1] - m[1, 2]) / s, 0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s
    elif m[1, 1] > m[2, 2]:
        s = math.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        w, x, y, z = (m[0, 2] - m[2, 0]) / s, (m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s
    else:
        s = math.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        w, x, y, z = (m[1, 0] - m[0, 1]) / s, (m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s
    q = np.array([x, y, z, w], dtype=np.float64)
    q /= np.linalg.norm(q)
    return [float(v) for v in q]


def umeyama(src: np.ndarray, dst: np.ndarray) -> tuple[float, np.ndarray, np.ndarray]:
    """Similarity s, R, t with dst ≈ s·R·src + t (Umeyama 1991)."""
    mu_s, mu_d = src.mean(axis=0), dst.mean(axis=0)
    xs, xd = src - mu_s, dst - mu_d
    cov = xd.T @ xs / len(src)
    U, D, Vt = np.linalg.svd(cov)
    S = np.eye(3)
    if np.linalg.det(U) * np.linalg.det(Vt) < 0:
        S[2, 2] = -1
    R = U @ S @ Vt
    var_s = (xs ** 2).sum() / len(src)
    s = float(np.trace(np.diag(D) @ S) / var_s)
    t = mu_d - s * R @ mu_s
    return s, R, t


def robust_umeyama(src: np.ndarray, dst: np.ndarray, iters: int = 5):
    keep = np.ones(len(src), dtype=bool)
    s, R, t = umeyama(src, dst)
    for _ in range(iters):
        res = np.linalg.norm((s * (src @ R.T) + t) - dst, axis=1)
        med = np.median(res[keep])
        new_keep = res <= max(3.0 * med, 0.03)
        if new_keep.sum() < 4 or np.array_equal(new_keep, keep):
            keep = new_keep if new_keep.sum() >= 4 else keep
            break
        keep = new_keep
        s, R, t = umeyama(src[keep], dst[keep])
    res = np.linalg.norm((s * (src @ R.T) + t) - dst, axis=1)
    return s, R, t, keep, res


def read_ply_arr(path: Path):
    raw = path.read_bytes()
    end = raw.index(b"end_header\n")
    header = raw[:end].decode("ascii", "replace")
    n = int([l for l in header.splitlines() if l.startswith("element vertex")][0].split()[2])
    props = [(l.split()[2], l.split()[1]) for l in header.splitlines() if l.startswith("property")]
    tmap = {"float": "<f4", "uchar": "u1", "double": "<f8", "int": "<i4", "uint": "<u4"}
    dtype = np.dtype([(p, tmap[t]) for p, t in props])
    arr = np.frombuffer(raw[end + 11 :], dtype=dtype, count=n)
    return arr.copy(), [p for p, _ in props], header


def write_ply_like(path: Path, header: str, arr: np.ndarray) -> None:
    path.write_bytes((header + "\nend_header\n").encode("ascii") + arr.tobytes())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sparse", required=True)
    ap.add_argument("--poses", required=True)
    ap.add_argument("--ply", required=True)
    ap.add_argument("--lidar", default="")
    ap.add_argument("--out", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--out-ply", default="")
    ap.add_argument("--video-clip", type=int, default=None, help="poses.clips index whose frames were extracted")
    ap.add_argument("--video-fps", type=float, default=2.0, help="extraction rate used by the studio")
    ap.add_argument("--frame-prefix", default="v0_", help="extracted frame filename prefix")
    ap.add_argument("--station-spacing", type=float, default=0.7)
    ap.add_argument("--ceiling-height", type=float, default=2.2)
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    poses = json.loads(Path(a.poses).read_text())
    frames = poses.get("frames", [])
    # ARKit camera centre per photo filename (transform_4x4 is column-major, camera→world).
    ar_by_photo: dict[str, np.ndarray] = {}
    ar_centres_all = []
    for fr in frames:
        m = np.asarray(fr["transform_4x4"], dtype=np.float64).reshape(4, 4, order="F")
        c = m[:3, 3]
        ar_centres_all.append(c)
        photo = fr.get("photo")
        if photo:
            ar_by_photo[Path(photo).name.lower()] = c
    ar_centres_all = np.array(ar_centres_all) if ar_centres_all else np.zeros((0, 3))

    # Video frames: match by time. The studio extracts clip N as `v<k>_%05d.jpg` at --video-fps;
    # frame i sits at clip start_time + (i - 0.5) / fps, and the nearest ARKit pose (any clip
    # index, within 0.12 s) gives its centre. Stills match by filename as above.
    clip_start = None
    if a.video_clip is not None:
        clips = {int(c.get("index", i + 1)): c for i, c in enumerate(poses.get("clips", []))}
        clip = clips.get(a.video_clip)
        if clip is None or clip.get("start_time") is None:
            print(json.dumps({"error": "video clip not found in poses", "clip": a.video_clip}))
            return 3
        clip_start = float(clip["start_time"])
    pose_times = np.array([float(fr["timestamp"]) for fr in frames if "timestamp" in fr])
    pose_centres = np.array([
        np.asarray(fr["transform_4x4"], dtype=np.float64).reshape(4, 4, order="F")[:3, 3]
        for fr in frames if "timestamp" in fr
    ])
    order = np.argsort(pose_times)
    pose_times, pose_centres = pose_times[order], pose_centres[order]

    def centre_at(t: float) -> np.ndarray | None:
        j = int(np.searchsorted(pose_times, t))
        cands = [k for k in (j - 1, j) if 0 <= k < len(pose_times)]
        if not cands:
            return None
        k = min(cands, key=lambda k: abs(pose_times[k] - t))
        return pose_centres[k] if abs(pose_times[k] - t) <= 0.12 else None

    rec = pycolmap.Reconstruction(a.sparse)
    src, dst, names = [], [], []
    for im in rec.images.values():
        key = Path(im.name).name.lower()
        target = ar_by_photo.get(key)
        if target is None and clip_start is not None and key.startswith(a.frame_prefix):
            digits = "".join(ch for ch in Path(key).stem[len(a.frame_prefix):] if ch.isdigit())
            if digits:
                target = centre_at(clip_start + (int(digits) - 0.5) / a.video_fps)
        if target is not None:
            cfw = im.cam_from_world()
            R = np.asarray(cfw.rotation.matrix())
            t = np.asarray(cfw.translation)
            src.append(-R.T @ t)
            dst.append(target)
            names.append(im.name)
    if len(src) < 6:
        print(json.dumps({"error": "too few photo↔pose matches", "matches": len(src),
                          "colmap_images": rec.num_reg_images(), "arkit_photos": len(ar_by_photo)}))
        return 3
    src, dst = np.array(src), np.array(dst)
    s, R, t, keep, res = robust_umeyama(src, dst)

    # Viewer group: Q = R·F, scale s; translation baked into the PLY.
    Q = R @ FLIP
    d = R.T @ t / s

    arr, props, header = read_ply_arr(Path(a.ply))
    arr["x"] = (arr["x"].astype(np.float64) + d[0]).astype(arr["x"].dtype)
    arr["y"] = (arr["y"].astype(np.float64) + d[1]).astype(arr["y"].dtype)
    arr["z"] = (arr["z"].astype(np.float64) + d[2]).astype(arr["z"].dtype)
    out_ply = Path(a.out_ply) if a.out_ply else out / f"{a.name}.aligned.ply"
    write_ply_like(out_ply, header, arr)

    # Floor from the LiDAR cloud if present (lowest dense slab), else from ARKit camera heights.
    floor_y = None
    lidar_bounds = None
    if a.lidar and Path(a.lidar).exists():
        lid, _, _ = read_ply_arr(Path(a.lidar))
        ly = lid["y"].astype(np.float64)
        floor_y = float(np.percentile(ly, 1.0))
        lidar_bounds = {
            "min": [float(np.percentile(lid[k], 1)) for k in ("x", "y", "z")],
            "max": [float(np.percentile(lid[k], 99)) for k in ("x", "y", "z")],
            "points": int(len(lid)),
        }
    if floor_y is None:
        floor_y = float(np.median(ar_centres_all[:, 1]) - 1.45) if len(ar_centres_all) else 0.0

    # Stations: every ARKit pose (video and stills), thinned along the path.
    stations = []
    last = None
    for fr in frames:
        m = np.asarray(fr["transform_4x4"], dtype=np.float64).reshape(4, 4, order="F")
        p = m[:3, 3]
        if last is not None and np.linalg.norm(p - last) < a.station_spacing:
            continue
        last = p
        fwd = -m[:3, 2]  # ARKit camera looks down -Z
        yaw = math.atan2(-fwd[0], -fwd[2])
        stations.append({"id": f"s{len(stations):03d}", "position": [round(float(v), 3) for v in p],
                         "floorIndex": 0, "headingY": round(yaw, 4)})

    # Bounds in the viewer frame from the aligned splat.
    xyz = np.column_stack([arr["x"], arr["y"], arr["z"]]).astype(np.float64)
    world = s * (xyz @ Q.T @ FLIP)  # s·Q·F·p  (row form)
    lo, hi = np.percentile(world, 2, axis=0), np.percentile(world, 98, axis=0)

    manifest = {
        "version": 2, "coordinate_system": "arkit-world", "source": "align_arkit", "up_axis": "+Y",
        "correction_quaternion": quat_xyzw_from_matrix(Q), "metric_scale": round(s, 6),
        "metric_scale_applied": True,
        "bounds": {"min": lo.round(3).tolist(), "max": hi.round(3).tolist(),
                   "center": (0.5 * (lo + hi)).round(3).tolist(), "radius": round(float(0.5 * np.linalg.norm(hi - lo)), 3)},
        "floor_y": round(floor_y, 3), "ceiling_cut_y": round(floor_y + a.ceiling_height, 3),
        "interior_entry_point": stations[0]["position"] if stations else None,
        "alignment": {"matches": int(len(src)), "inliers": int(keep.sum()),
                      "median_residual_m": round(float(np.median(res[keep])), 4),
                      "max_residual_m": round(float(res[keep].max()), 4)},
        "lidar": lidar_bounds,
    }
    walk = {"version": 1, "source": "align_arkit", "units": "metres", "stations": stations,
            "floors": [{"index": 0, "label": "Ground", "elevationY": round(floor_y, 3)}],
            "ceilingCutY": round(floor_y + a.ceiling_height, 3), "cameraCount": len(frames)}
    up_colmap = R.T @ np.array([0.0, 1.0, 0.0])
    frame = {"up_colmap": up_colmap.round(6).tolist(), "floor_h": round(float(((floor_y - t[1]) / s) if False else np.dot(-d, up_colmap) + floor_y / s), 6),
             "median_cam_h": 0.0, "scale": round(s, 6), "note": "aligned PLY; floor_h in aligned COLMAP units"}
    (out / f"{a.name}.manifest.json").write_text(json.dumps(manifest, indent=1))
    (out / f"{a.name}.walk.json").write_text(json.dumps(walk, indent=1))
    (out / f"{a.name}.frame.json").write_text(json.dumps(frame, indent=1))
    print("RESULT align " + json.dumps({
        "matches": int(len(src)), "inliers": int(keep.sum()), "scale_m_per_unit": round(s, 4),
        "median_residual_m": round(float(np.median(res[keep])), 4), "max_residual_m": round(float(res[keep].max()), 4),
        "stations": len(stations), "floor_y": round(floor_y, 3), "bounds_m": (hi - lo).round(2).tolist(),
        "aligned_ply": str(out_ply),
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
