"""A two-lens fisheye package that passes the import gate. Not Room 213."""

from __future__ import annotations

import json
import struct
import zlib
from pathlib import Path

from colmap_validate import _cam_from_world, _q_to_R, project_fisheye
from package_validate import sha256_file


def write_png(path: Path, w: int, h: int) -> None:
    raw = b"".join(b"\x00" + bytes([40, 80, 120]) * w for _ in range(h))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")
    )


def build(root: Path, experiment_id: str = "spirula-smoke-v1", capture_id: str = "synthetic-capture") -> Path:
    cam0 = {"model": "OPENCV_FISHEYE", "params": [16, 16, 16, 16, 0, 0, 0, 0]}
    cam1 = {"model": "OPENCV_FISHEYE", "params": [16, 16, 15, 16, 0, 0, 0, 0]}
    point = (0.0, 0.0, 5.0)
    ident = _q_to_R(1, 0, 0, 0)
    obs0 = project_fisheye(cam0, _cam_from_world(ident, [0, 0, 0], point))
    obs1 = project_fisheye(cam1, _cam_from_world(ident, [0.1, 0, 0], point))
    assert obs0 and obs1
    sparse = root / "sparse" / "0"
    sparse.mkdir(parents=True)
    (sparse / "cameras.txt").write_text(
        "# Camera list\n"
        "1 OPENCV_FISHEYE 32 32 16 16 16 16 0 0 0 0\n"
        "2 OPENCV_FISHEYE 32 32 16 16 15 16 0 0 0 0\n",
        encoding="utf-8",
    )
    def obs_line(uv):
        return " ".join([f"{uv[0]:.8f} {uv[1]:.8f} 1" for _ in range(8)])
    (sparse / "images.txt").write_text(
        "# Image list\n"
        "1 1 0 0 0 0 0 0 1 cam0/a.png\n"
        f"{obs_line(obs0)}\n"
        "2 1 0 0 0 0.1 0 0 2 cam1/a.png\n"
        f"{obs_line(obs1)}\n",
        encoding="utf-8",
    )
    (sparse / "points3D.txt").write_text(
        "# Points\n1 0 0 5 255 255 255 0.0\n",
        encoding="utf-8",
    )
    write_png(root / "images" / "cam0" / "a.png", 32, 32)
    write_png(root / "images" / "cam1" / "a.png", 32, 32)
    files = []
    for path in sorted(root.rglob("*")):
        if path.is_file():
            files.append({"path": path.relative_to(root).as_posix(), "sha256": sha256_file(path)})
    manifest = {
        "experimentId": experiment_id,
        "captureId": capture_id,
        "projectId": "experimental",
        "expectedImageCount": 2,
        "lenses": ["cam0", "cam1"],
        "projectTransform": {"scale": 1.0},
        "files": files,
    }
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return root
