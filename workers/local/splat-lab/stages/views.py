"""Stage 4 - Build the 16-view training set from registered panoramas.

Mirrors the reference studio's own "canonical16-fov90" layout: each registered
panorama contributes 16 canonical 90-degree pinhole views (8 around the
horizon, 4 tilted +45deg, 4 tilted -45deg), all sharing the panorama's single
3D camera center. Runs only for `native` spherical_mode SfM - `rig` mode
already produced independent pinhole faces during SfM and trains on those
directly.

The view-frame rotation (relative to the panorama's own camera frame) is
derived by NUMERICALLY sampling py360convert's own ray field (the same
`xyzpers` machinery e2p uses internally) rather than hand-deriving Euler
angles, so the pose written to transforms.json is guaranteed to match the
pixels py360convert actually renders. This was verified independently
2026-09-12: for every (yaw, pitch) in the 16-view layout, the numerically
sampled forward ray matches COLMAP's own CamRayFromImg formula for an
EQUIRECTANGULAR camera to 1e-6, and the sampled "down" pixel direction
matches cross(forward, right) to 1e-6 (i.e. zero roll, a proper rotation).
See scratchpad verify-e2p-convention.py / verify-e2p-frame.py in this
session's history for the raw verification output.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

from colmap_io import camera_to_world, find_sparse_dir, read_cameras_txt, read_images_txt, read_points3d_txt
from config import VIEW_LAYOUT
from result import StageResult

_SAMPLE_OFFSET_PX = 10  # how far from center to sample for the right/down axes


def _emit(record: dict) -> None:
    sys.stdout.write(json.dumps(record, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def run(cfg, ctx) -> StageResult:
    if not cfg.is360 or cfg.spherical_mode != "native":
        return StageResult(name="views", status="skipped",
                           detail="not native-360 SfM; training uses the SfM images directly")

    try:
        import py360convert  # type: ignore
        from PIL import Image
    except ImportError as exc:
        return StageResult(name="views", status="blocked",
                           detail="py360convert / pillow not installed", error=str(exc))

    sfm_dir = ctx["job_dir"] / "sfm"
    sparse_dir = find_sparse_dir(sfm_dir)
    if sparse_dir is None:
        return StageResult(name="views", status="failed", error="no SfM sparse model to build views from")

    cameras = read_cameras_txt(sparse_dir / "cameras.txt")
    images = read_images_txt(sparse_dir / "images.txt")
    if not images:
        return StageResult(name="views", status="failed", error="SfM registered zero panoramas")

    source_dir = Path(ctx["sfm_images_dir"])
    masks_dir = Path(ctx["masks_colmap_dir"]) if ctx.get("masks_colmap_dir") else None
    views_dir = ctx["job_dir"] / "views"
    (views_dir / "images").mkdir(parents=True, exist_ok=True)
    (views_dir / "masks").mkdir(parents=True, exist_ok=True)

    view_px = cfg.resolved_view_px
    frames_meta: list[dict] = []
    total = len(images)
    done = 0
    for image_id, img in sorted(images.items()):
        pano_path = source_dir / img.name
        if not pano_path.exists():
            continue
        cam = cameras.get(img.camera_id)
        pano_w = cam.width if cam else 7680
        r_c2w_pano, center = camera_to_world(img)
        equi = np.asarray(Image.open(pano_path).convert("RGB"))
        mask_img = None
        if masks_dir is not None:
            mpath = masks_dir / f"{img.name}.png"
            if mpath.exists():
                mask_img = np.asarray(Image.open(mpath).convert("L"))

        stem = Path(img.name).stem
        for idx, (yaw, pitch) in enumerate(VIEW_LAYOUT):
            face = py360convert.e2p(equi, fov_deg=90, u_deg=yaw, v_deg=pitch,
                                    out_hw=(view_px, view_px), mode="bilinear")
            out_name = f"{stem}_v{idx:02d}.jpg"
            Image.fromarray(face).save(views_dir / "images" / out_name, quality=92)
            mask_name = None
            if mask_img is not None:
                mface = py360convert.e2p(mask_img, fov_deg=90, u_deg=yaw, v_deg=pitch,
                                         out_hw=(view_px, view_px), mode="nearest")
                mask_name = f"{stem}_v{idx:02d}.png"
                Image.fromarray(mface).save(views_dir / "masks" / mask_name)

            r_view_to_pano = _view_rotation_in_pano_frame(yaw, pitch)
            r_view_c2w = _matmul3(r_c2w_pano, r_view_to_pano)
            transform = _to_nerfstudio_matrix(r_view_c2w, center)
            entry = {
                "file_path": f"images/{out_name}",
                "transform_matrix": transform,
                "w": view_px, "h": view_px,
                "fl_x": view_px / 2.0, "fl_y": view_px / 2.0,
                "cx": view_px / 2.0, "cy": view_px / 2.0,
                "k1": 0.0, "k2": 0.0, "p1": 0.0, "p2": 0.0,
            }
            if mask_name:
                entry["mask_path"] = f"masks/{mask_name}"
            frames_meta.append(entry)
        done += 1
        if done % 50 == 0 or done == total:
            _emit({"stage": "views", "status": "running",
                   "progress": round(done / total, 3),
                   "detail": f"rendered views for {done}/{total} panoramas"})

    if not frames_meta:
        return StageResult(name="views", status="failed", error="no panorama source images found on disk")

    points_ply = sfm_dir / "points.ply"
    transforms = {
        "camera_model": "OPENCV",
        "ply_file_path": "../sfm/points.ply" if points_ply.exists() else None,
        "frames": frames_meta,
    }
    (views_dir / "transforms.json").write_text(json.dumps(transforms), encoding="utf-8")

    check = _reprojection_sanity_check(sparse_dir, views_dir / "transforms.json", views_dir)
    ctx["views_dir"] = str(views_dir)
    ctx["view_count"] = len(frames_meta)
    detail = (f"built {len(frames_meta)} training views from {done} panoramas "
              f"at {view_px}px; reprojection check: {check['summary']}")
    if not check["passed"]:
        return StageResult(name="views", status="failed",
                           error=f"reprojection sanity check failed: {check['summary']}",
                           artifacts=[str(views_dir)])
    return StageResult(name="views", status="done", detail=detail, artifacts=[str(views_dir)])


def _view_rotation_in_pano_frame(yaw_deg: float, pitch_deg: float) -> tuple:
    """3x3 rotation (as a tuple of 3 column tuples) mapping a view-frame vector
    (X-right, Y-down, Z-forward, same convention as COLMAP pinhole cameras) to
    its representation in the panorama's own camera frame - derived by
    numerically sampling py360convert's actual ray field (see module docstring)."""
    from py360convert.utils import xyzpers

    u = -np.deg2rad(yaw_deg)
    v = np.deg2rad(pitch_deg)
    out_hw = (2 * _SAMPLE_OFFSET_PX + 1, 2 * _SAMPLE_OFFSET_PX + 1)
    xyz = xyzpers(np.deg2rad(90.0), np.deg2rad(90.0), u, v, out_hw, 0.0)
    c = _SAMPLE_OFFSET_PX

    def to_colmap(ray: np.ndarray) -> np.ndarray:
        r = ray / np.linalg.norm(ray)
        return np.array([r[0], -r[1], r[2]])  # py360's Y-up -> COLMAP's Y-down

    z_view = to_colmap(xyz[c, c])
    right_sample = to_colmap(xyz[c, out_hw[1] - 1])  # rightmost column = +_SAMPLE_OFFSET_PX from center
    x_raw = right_sample - np.dot(right_sample, z_view) * z_view
    x_view = x_raw / np.linalg.norm(x_raw)
    # COLMAP's frame is right-handed with X x Y = Z, so Y = Z x X (cyclic permutation).
    y_view = np.cross(z_view, x_view)
    return (
        (float(x_view[0]), float(y_view[0]), float(z_view[0])),
        (float(x_view[1]), float(y_view[1]), float(z_view[1])),
        (float(x_view[2]), float(y_view[2]), float(z_view[2])),
    )


def _matmul3(a: tuple, b: tuple) -> tuple:
    """3x3 @ 3x3, both given as row-major nested tuples."""
    return tuple(
        tuple(sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3))
        for i in range(3)
    )


def _to_nerfstudio_matrix(r_c2w_opencv: tuple, center: tuple) -> list[list[float]]:
    """Builds the 4x4 camera-to-world matrix and applies nerfstudio's own
    OpenCV -> OpenGL convention flip (flip the Y and Z columns of R)."""
    r = [list(row) for row in r_c2w_opencv]
    for row in r:
        row[1] = -row[1]
        row[2] = -row[2]
    m = [
        [r[0][0], r[0][1], r[0][2], center[0]],
        [r[1][0], r[1][1], r[1][2], center[1]],
        [r[2][0], r[2][1], r[2][2], center[2]],
        [0.0, 0.0, 0.0, 1.0],
    ]
    return m


def _reprojection_sanity_check(sparse_dir: Path, transforms_path: Path, views_dir: Path) -> dict:
    """Lightweight geometric self-test (acceptance criterion, build plan Sec 4.3):
    project a sample of the SfM sparse points into a sample of the generated
    views using their written pose+intrinsics, and require a meaningful
    fraction to land in front of the camera and inside the image bounds. A
    sign or axis error in the rotation math would send the large majority of
    points behind every camera or wildly outside every frame; this catches
    that class of bug without needing a full edge-detection pass."""
    points = read_points3d_txt(sparse_dir / "points3D.txt", max_points=20000)
    if not points:
        return {"passed": True, "summary": "no sparse points to check against (skipped)"}
    transforms = json.loads(transforms_path.read_text(encoding="utf-8"))
    frames = transforms["frames"]
    sample = frames[:: max(1, len(frames) // 40)][:40]
    pts = np.array(points)
    hit_fracs = []
    for entry in sample:
        m = np.array(entry["transform_matrix"])
        r_c2w_gl = m[:3, :3]
        t = m[:3, 3]
        r_w2c_gl = r_c2w_gl.T
        cam = (pts - t) @ r_w2c_gl.T  # OpenGL cam coords: looks down -Z
        z = -cam[:, 2]
        in_front = z > 0.05
        w = entry["w"]
        fl = entry["fl_x"]
        x_px = entry["cx"] + fl * (cam[:, 0] / np.maximum(z, 1e-6))
        y_px = entry["cy"] - fl * (cam[:, 1] / np.maximum(z, 1e-6))
        in_bounds = (x_px >= 0) & (x_px < w) & (y_px >= 0) & (y_px < w)
        visible = in_front & in_bounds
        hit_fracs.append(float(visible.sum()) / len(pts))
    mean_hit = float(np.mean(hit_fracs)) if hit_fracs else 0.0
    passed = mean_hit >= 0.02  # a wrong-signed rotation puts ~0% of points in any frame
    return {"passed": passed,
           "summary": f"{mean_hit * 100:.1f}% of sampled points project into view on average "
                      f"over {len(sample)} sampled views"}
