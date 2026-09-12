"""Export a compact SfM preview JSON (cameras + downsampled points)."""
from __future__ import annotations

import json
import struct
from pathlib import Path

MAX_POINTS = 180_000


def write_preview(sfm_dir: Path, out_path: Path) -> Path | None:
    sparse = _find_sparse(sfm_dir)
    if sparse is None:
        return None
    cameras = _read_images(sparse / "images.bin")
    points = _read_points(sparse / "points3D.bin")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps({
        "cameras": cameras,
        "pointCount": len(points),
        "points": points,
    }, separators=(",", ":")), encoding="utf-8")
    return out_path


def _find_sparse(root: Path) -> Path | None:
    for cand in (root / "sparse" / "0", root / "colmap" / "sparse" / "0", root / "sparse"):
        if (cand / "images.bin").exists() and (cand / "points3D.bin").exists():
            return cand
    matches = list(root.rglob("images.bin"))
    return matches[0].parent if matches else None


def _read_images(path: Path) -> list[dict]:
    if not path.exists():
        return []
    cams: list[dict] = []
    with path.open("rb") as fh:
        n = struct.unpack("<Q", fh.read(8))[0]
        for _ in range(n):
            img_id = struct.unpack("<I", fh.read(4))[0]
            qw, qx, qy, qz = struct.unpack("<dddd", fh.read(32))
            tx, ty, tz = struct.unpack("<ddd", fh.read(24))
            cam_id = struct.unpack("<I", fh.read(4))[0]
            name = _read_cstring(fh)
            n2d = struct.unpack("<Q", fh.read(8))[0]
            fh.seek(n2d * 24, 1)
            # Camera center C = -R^T t
            r = _quat_to_r(qw, qx, qy, qz)
            cx = -(r[0][0] * tx + r[1][0] * ty + r[2][0] * tz)
            cy = -(r[0][1] * tx + r[1][1] * ty + r[2][1] * tz)
            cz = -(r[0][2] * tx + r[1][2] * ty + r[2][2] * tz)
            cams.append({
                "id": img_id, "cameraId": cam_id, "name": name,
                "q": [qw, qx, qy, qz], "t": [tx, ty, tz],
                "p": [cx, cy, cz],
            })
    return cams


def _read_points(path: Path) -> list[list[float]]:
    if not path.exists():
        return []
    pts: list[list[float]] = []
    with path.open("rb") as fh:
        n = struct.unpack("<Q", fh.read(8))[0]
        step = max(1, n // MAX_POINTS)
        for i in range(n):
            fh.read(8)  # id
            x, y, z = struct.unpack("<ddd", fh.read(24))
            r, g, b = struct.unpack("BBB", fh.read(3))
            fh.read(8)  # error
            track = struct.unpack("<Q", fh.read(8))[0]
            fh.seek(track * 8, 1)
            if i % step == 0:
                pts.append([round(x, 4), round(y, 4), round(z, 4), r, g, b])
    return pts


def _read_cstring(fh) -> str:
    chars: list[bytes] = []
    while True:
        b = fh.read(1)
        if not b or b == b"\x00":
            break
        chars.append(b)
    return b"".join(chars).decode("utf-8", errors="replace")


def _quat_to_r(qw: float, qx: float, qy: float, qz: float):
    return (
        (1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)),
        (2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)),
        (2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)),
    )
