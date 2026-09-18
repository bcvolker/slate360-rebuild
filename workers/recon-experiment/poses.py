"""Fixed visual-pose JSON: same cameras for PLY, SPZ, and later experiment arms."""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np

from hashes import sha256_json

SCHEMA = "slate360.visual-poses.v1"
VIEWPORT = {"width": 1280, "height": 1280}
NEAR = 0.01
FAR = 100.0
CATEGORIES = (
    ("A_on_path", "ON_PATH"),
    ("B_off_path", "OFF_PATH"),
    ("C_dollhouse", "DOLLHOUSE_GEOMETRY"),
    ("D_overhead", "PLAN_OVERHEAD"),
)


def load_poses(path: Path) -> dict[str, Any]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if data.get("schema") != SCHEMA:
        raise ValueError(f"unsupported pose schema {data.get('schema')}")
    return data


def pose_set_hash(data: dict[str, Any]) -> str:
    return sha256_json(data)


def apply_dataparser(c2w: np.ndarray, transform_3x4: np.ndarray, scale: float) -> np.ndarray:
    """Nerfstudio dataparser: 4x4(transform) @ c2w, then scale translation."""
    t = np.eye(4, dtype=np.float64)
    t[:3, :] = transform_3x4
    out = t @ c2w
    out[:3, 3] *= float(scale)
    return out


def look_at_opengl(eye: np.ndarray, target: np.ndarray, up: np.ndarray) -> np.ndarray:
    """OpenGL camera-to-world: X right, Y up, look along -Z."""
    eye = np.asarray(eye, dtype=np.float64)
    z = eye - np.asarray(target, dtype=np.float64)
    z = z / (np.linalg.norm(z) + 1e-12)
    x = np.cross(np.asarray(up, dtype=np.float64), z)
    x = x / (np.linalg.norm(x) + 1e-12)
    y = np.cross(z, x)
    m = np.eye(4, dtype=np.float64)
    m[:3, 0] = x
    m[:3, 1] = y
    m[:3, 2] = z
    m[:3, 3] = eye
    return m


def gl_c2w_to_cv_w2c(c2w_gl: np.ndarray) -> np.ndarray:
    """gsplat viewmat: OpenCV world-to-camera (look +Z, Y down)."""
    c2w = np.array(c2w_gl, dtype=np.float64)
    c2w_cv = c2w.copy()
    c2w_cv[:3, 1] *= -1.0
    c2w_cv[:3, 2] *= -1.0
    return np.linalg.inv(c2w_cv)


def _intrinsics(px: int = 1280) -> dict[str, float]:
    f = px / 2.0
    return {"fx": f, "fy": f, "cx": f, "cy": f, "width": px, "height": px}


def _pose_entry(
    pose_id: str,
    category: str,
    c2w: np.ndarray,
    notes: str,
    source_view: str | None = None,
) -> dict[str, Any]:
    K = _intrinsics()
    return {
        "id": pose_id,
        "category": category,
        "world_from_camera": c2w.tolist(),
        "world_convention": "nerfstudio_opengl_c2w_after_dataparser",
        "camera_axes": "right_up_back",
        "matrix_layout": "row_major_4x4_world_from_camera",
        "projection": "pinhole",
        "intrinsics": K,
        "viewport": dict(VIEWPORT),
        "near": NEAR,
        "far": FAR,
        "intended_render_mode": "RGB",
        "source_view": source_view,
        "notes": notes,
    }


def derive_room213_poses(
    transforms_path: Path,
    dataparser_path: Path,
    dataset_id: str = "room213-cecc2763",
) -> dict[str, Any]:
    transforms = json.loads(Path(transforms_path).read_text(encoding="utf-8"))
    parser = json.loads(Path(dataparser_path).read_text(encoding="utf-8"))
    t34 = np.array(parser["transform"], dtype=np.float64)
    scale = float(parser["scale"])
    frames = transforms["frames"]
    horizon = [f for f in frames if str(f["file_path"]).endswith("_v00.jpg")]
    if not horizon:
        horizon = frames
    mid = horizon[len(horizon) // 2]
    mid_i = frames.index(mid)
    prev = horizon[max(0, len(horizon) // 2 - 8)]
    centers = []
    for fr in frames:
        c2w = apply_dataparser(np.array(fr["transform_matrix"], dtype=np.float64), t34, scale)
        centers.append(c2w[:3, 3])
    centers = np.stack(centers)
    lo, hi = centers.min(0), centers.max(0)
    diag = float(np.linalg.norm(hi - lo))
    centroid = centers.mean(0)
    on_c2w = apply_dataparser(np.array(mid["transform_matrix"], dtype=np.float64), t34, scale)
    prev_c2w = apply_dataparser(np.array(prev["transform_matrix"], dtype=np.float64), t34, scale)
    walk = on_c2w[:3, 3] - prev_c2w[:3, 3]
    if np.linalg.norm(walk) < 1e-6:
        walk = on_c2w[:3, 2]
    walk = walk / (np.linalg.norm(walk) + 1e-12)
    up = on_c2w[:3, 1]
    up = up / (np.linalg.norm(up) + 1e-12)
    perp = np.cross(up, walk)
    if np.linalg.norm(perp) < 1e-6:
        perp = on_c2w[:3, 0]
    perp = perp / (np.linalg.norm(perp) + 1e-12)

    look = on_c2w[:3, 3] - on_c2w[:3, 2]  # OpenGL look -Z
    off_eye = on_c2w[:3, 3] + perp * (0.25 * diag)
    off_c2w = look_at_opengl(off_eye, look, up)
    doll_eye = centroid + up * (0.9 * diag) + (-walk) * (0.7 * diag)
    doll_c2w = look_at_opengl(doll_eye, centroid, up)
    over_eye = centroid + up * (1.4 * diag)
    # Overhead: keep walk as camera X so the plan is not rolled arbitrarily.
    over_c2w = look_at_opengl(over_eye, centroid, walk)

    poses = [
        _pose_entry(
            "A_on_path", "ON_PATH", on_c2w,
            "source-adjacent horizon view from mid-walk panorama",
            source_view=str(mid["file_path"]),
        ),
        _pose_entry(
            "B_off_path", "OFF_PATH", off_c2w,
            f"same look-at, displaced {0.25:.2f}× camera-box diagonal along floor perpendicular",
            source_view=str(mid["file_path"]),
        ),
        _pose_entry(
            "C_dollhouse", "DOLLHOUSE_GEOMETRY", doll_c2w,
            "elevated oblique of trained-world camera centroid",
        ),
        _pose_entry(
            "D_overhead", "PLAN_OVERHEAD", over_c2w,
            "plan-like view above trained-world centroid",
        ),
    ]
    payload = {
        "schema": SCHEMA,
        "dataset": dataset_id,
        "world_convention": "nerfstudio_opengl_c2w_after_dataparser",
        "camera_axes": "right_up_back",
        "matrix_layout": "row_major_4x4_world_from_camera",
        "viewport": dict(VIEWPORT),
        "near": NEAR,
        "far": FAR,
        "sh_degree": 3,
        "render_mode": "RGB",
        "dataparser": {"transform": parser["transform"], "scale": scale},
        "source_transforms": str(transforms_path),
        "camera_box_diag": diag,
        "on_path_frame_index": mid_i,
        "poses": poses,
    }
    payload["pose_set_hash"] = pose_set_hash({k: v for k, v in payload.items() if k != "pose_set_hash"})
    return payload


def write_poses(path: Path, payload: dict[str, Any]) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
