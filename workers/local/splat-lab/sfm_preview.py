"""Export a compact SfM preview JSON (cameras + downsampled points) for the
web UI's SfM viewer. Reads COLMAP's TEXT export via colmap_io.py - see that
module's docstring for why TEXT is used instead of the binary .bin files."""
from __future__ import annotations

import json
from pathlib import Path

from colmap_io import camera_to_world, find_sparse_dir, read_images_txt, read_points3d_txt_rgb

MAX_POINTS = 180_000


def write_preview(sfm_dir: Path, out_path: Path) -> Path | None:
    sparse = find_sparse_dir(sfm_dir)
    if sparse is None:
        return None
    try:
        images = read_images_txt(sparse / "images.txt")
    except FileNotFoundError:
        return None

    cameras = []
    for image_id, img in sorted(images.items()):
        _, center = camera_to_world(img)
        cameras.append({
            "id": image_id, "cameraId": img.camera_id, "name": img.name,
            "q": list(img.qvec), "t": list(img.tvec),
            "p": [round(center[0], 4), round(center[1], 4), round(center[2], 4)],
        })

    points_path = sparse / "points3D.txt"
    points_rgb = read_points3d_txt_rgb(points_path, max_points=MAX_POINTS) if points_path.exists() else []
    points = [[round(x, 4), round(y, 4), round(z, 4), r, g, b] for x, y, z, r, g, b in points_rgb]

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps({
        "cameras": cameras,
        "pointCount": len(points),
        "points": points,
    }, separators=(",", ":")), encoding="utf-8")
    return out_path
