"""Fixed-camera gsplat (Apache-2). Camera / center / scale optimization OFF."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np

from arkit_io import colmajor_c2w, iter_depth_records, load_pose_frames, pair_depth_to_poses
from constants import GAUSSIAN_INIT_POINTS, GAUSSIAN_STEPS, HOLDOUT_EVERY

C0 = 0.28209479177387814
SH_DEGREE = 3
# Re-export for the CUDA trainer without importing torch at module load.


def arkit_c2w_to_colmap_w2c(c2w: np.ndarray):
    C = c2w[:3, 3].copy()
    r = c2w[:3, :3].copy()
    r[:, 1] *= -1
    r[:, 2] *= -1
    r_w2c = r.T
    tvec = -(r_w2c @ C)
    return r_w2c, tvec, C


def matrix_to_quat_wxyz(R: np.ndarray) -> tuple[float, float, float, float]:
    m00, m11, m22 = R[0, 0], R[1, 1], R[2, 2]
    tr = m00 + m11 + m22
    if tr > 0:
        s = math.sqrt(tr + 1) * 2
        return 0.25 * s, (R[2, 1] - R[1, 2]) / s, (R[0, 2] - R[2, 0]) / s, (R[1, 0] - R[0, 1]) / s
    if m00 > m11 and m00 > m22:
        s = math.sqrt(1 + m00 - m11 - m22) * 2
        return (R[2, 1] - R[1, 2]) / s, 0.25 * s, (R[0, 1] + R[1, 0]) / s, (R[0, 2] + R[2, 0]) / s
    if m11 > m22:
        s = math.sqrt(1 + m11 - m00 - m22) * 2
        return (R[0, 2] - R[2, 0]) / s, (R[0, 1] + R[1, 0]) / s, 0.25 * s, (R[1, 2] + R[2, 1]) / s
    s = math.sqrt(1 + m22 - m00 - m11) * 2
    return (R[1, 0] - R[0, 1]) / s, (R[0, 2] + R[2, 0]) / s, (R[1, 2] + R[2, 1]) / s, 0.25 * s


def view_from_w2c(R: np.ndarray, tvec: np.ndarray) -> np.ndarray:
    view = np.eye(4, dtype=np.float32)
    view[:3, :3] = R.astype(np.float32)
    view[:3, 3] = tvec.astype(np.float32)
    return view


def split_roles(n: int, every: int = HOLDOUT_EVERY) -> list[str]:
    return ["holdout" if i % every == 0 else "train" for i in range(n)]


def subsample_seed(xyz: np.ndarray, rgb: np.ndarray, max_points: int = GAUSSIAN_INIT_POINTS):
    if xyz.shape[0] <= max_points:
        return xyz, rgb
    sel = np.random.default_rng(0).choice(xyz.shape[0], max_points, replace=False)
    return xyz[sel], rgb[sel]


def train_config(*, steps: int = GAUSSIAN_STEPS, depth_loss: bool = False) -> dict[str, Any]:
    return {
        "engine": "gsplat",
        "license": "Apache-2.0",
        "pose_opt": False,
        "camera_optimization": "off",
        "center": False,
        "scale": False,
        "steps": int(steps),
        "holdoutEvery": HOLDOUT_EVERY,
        "depthLoss": bool(depth_loss),
        "depthLossIsBaseline": False,
        "note": "Known ARKit cameras/intrinsics. Seed from metric cloud. RGB-only is the baseline.",
    }


def should_promote_depth_loss(rgb: dict[str, Any], rgb_ed: dict[str, Any]) -> bool:
    """Promote RGB+ED only if holdout appearance AND metric consistency both improve."""
    def num(block, *keys):
        cur: Any = block
        for key in keys:
            cur = (cur or {}).get(key) if isinstance(cur, dict) else None
        return cur

    psnr_ok = (num(rgb_ed, "holdout", "psnr_mean") or 0) > (num(rgb, "holdout", "psnr_mean") or 0)
    ssim_ok = (num(rgb_ed, "holdout", "ssim_mean") or 0) > (num(rgb, "holdout", "ssim_mean") or 0)
    metric_ok = (num(rgb_ed, "floor", "residual_rms_m") or 1e9) <= (
        num(rgb, "floor", "residual_rms_m") or 1e9
    )
    return bool(psnr_ok and ssim_ok and metric_ok)


def build_dataset(
    depth_path: str | Path,
    poses_path: str | Path,
    seed_xyz: np.ndarray,
    seed_rgb: np.ndarray,
    out_dir: str | Path,
) -> dict[str, Any]:
    from PIL import Image
    import io

    out = Path(out_dir)
    img_dir = out / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    records = list(iter_depth_records(depth_path))
    frames = load_pose_frames(poses_path)
    pairs = pair_depth_to_poses(records, frames)
    roles = split_roles(len(pairs))
    split = []
    cameras = []
    for i, ((rec, frame), role) in enumerate(zip(pairs, roles), start=1):
        jpeg = rec.get("rgb_jpeg")
        if not jpeg:
            raise RuntimeError(f"missing per-frame RGB JPEG at index {i - 1}")
        im = Image.open(io.BytesIO(jpeg)).convert("RGB")
        name = f"{i:04d}.jpg"
        im.save(img_dir / name, quality=95)
        k = frame["intrinsics"]
        fx, fy, cx, cy = float(k["fx"]), float(k["fy"]), float(k["cx"]), float(k["cy"])
        c2w = colmajor_c2w(frame["transform_4x4"])
        R, tvec, C = arkit_c2w_to_colmap_w2c(c2w)
        cameras.append({
            "name": name,
            "role": role,
            "w": im.size[0],
            "h": im.size[1],
            "K": [fx, fy, cx, cy],
            "view": view_from_w2c(R, tvec).tolist(),
            "C": [float(v) for v in C],
        })
        split.append({"index": i, "name": name, "role": role})
    xyz, rgb = subsample_seed(seed_xyz, seed_rgb)
    np.save(out / "init_xyz.npy", xyz.astype(np.float32))
    np.save(out / "init_rgb.npy", rgb.astype(np.uint8))
    (out / "split.json").write_text(json.dumps({"frames": split}, indent=2) + "\n")
    (out / "cameras.json").write_text(json.dumps(cameras, indent=2) + "\n")
    return {
        "frames": len(pairs),
        "train": sum(1 for r in roles if r == "train"),
        "holdout": sum(1 for r in roles if r == "holdout"),
        "initPoints": int(xyz.shape[0]),
        "centered": False,
        "scaled": False,
        "datasetDir": str(out),
    }
