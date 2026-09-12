"""COLMAP sparse-model reader, using COLMAP's TEXT export format (not the
binary .bin files).

Root-caused 2026-09-12: this COLMAP 4.1.0 build's BINARY sparse-model format
does not match the classic camera-model enum this reader originally assumed
(COLMAP 4.x's rig/frame reorganization renumbered camera model IDs and added
new per-model files - `frames.bin`/`rigs.bin` alongside the old
`cameras.bin`/`images.bin`), so hand-parsing the binary caused a crash
("unpack requires a buffer of 32 bytes") partway through a real 64-image
model. COLMAP's TEXT export (`colmap model_converter --output_type TXT`) is
the same well-documented, stable line format across COLMAP versions, so
`stages/sfm.py` exports it right after mapping and everything downstream
(views.py, sfm_preview.py) reads TEXT, never the binary files.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass
class ColmapCamera:
    camera_id: int
    model: str
    width: int
    height: int
    params: list[float]


@dataclass
class ColmapImage:
    image_id: int
    qvec: tuple[float, float, float, float]  # (qw, qx, qy, qz), world-to-camera rotation
    tvec: tuple[float, float, float]          # world-to-camera translation
    camera_id: int
    name: str


def read_cameras_txt(path: Path) -> dict[int, ColmapCamera]:
    cams: dict[int, ColmapCamera] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        camera_id = int(parts[0])
        model = parts[1]
        width, height = int(parts[2]), int(parts[3])
        params = [float(p) for p in parts[4:]]
        cams[camera_id] = ColmapCamera(camera_id, model, width, height, params)
    return cams


def read_images_txt(path: Path) -> dict[int, ColmapImage]:
    images: dict[int, ColmapImage] = {}
    lines = path.read_text(encoding="utf-8").splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        i += 1
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        image_id = int(parts[0])
        qw, qx, qy, qz = (float(x) for x in parts[1:5])
        tx, ty, tz = (float(x) for x in parts[5:8])
        camera_id = int(parts[8])
        name = parts[9]
        images[image_id] = ColmapImage(image_id, (qw, qx, qy, qz), (tx, ty, tz), camera_id, name)
        i += 1  # skip the POINTS2D line that follows every image line
    return images


def read_points3d_txt(path: Path, max_points: int | None = None) -> list[tuple[float, float, float]]:
    """POINT3D_ID X Y Z R G B ERROR TRACK... — returns just (x, y, z)."""
    lines = [l for l in path.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]
    step = 1 if not max_points or len(lines) <= max_points else max(1, len(lines) // max_points)
    pts: list[tuple[float, float, float]] = []
    for i, line in enumerate(lines):
        if i % step != 0:
            continue
        parts = line.split()
        pts.append((float(parts[1]), float(parts[2]), float(parts[3])))
    return pts


def read_points3d_txt_rgb(path: Path, max_points: int | None = None) -> list[tuple[float, float, float, int, int, int]]:
    """Same as read_points3d_txt but also returns each point's (r, g, b), for the SfM viewer."""
    lines = [l for l in path.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]
    step = 1 if not max_points or len(lines) <= max_points else max(1, len(lines) // max_points)
    pts: list[tuple[float, float, float, int, int, int]] = []
    for i, line in enumerate(lines):
        if i % step != 0:
            continue
        parts = line.split()
        pts.append((float(parts[1]), float(parts[2]), float(parts[3]),
                   int(parts[4]), int(parts[5]), int(parts[6])))
    return pts


def camera_to_world(image: ColmapImage):
    """Returns (R_c2w as 3x3 nested tuple, C as (x,y,z) world-space camera center)."""
    r_wc = _quat_to_rotmat(*image.qvec)
    r_c2w = tuple(tuple(r_wc[j][i] for j in range(3)) for i in range(3))  # R_c2w = R_wc^T
    tx, ty, tz = image.tvec
    cx = -(r_c2w[0][0] * tx + r_c2w[0][1] * ty + r_c2w[0][2] * tz)
    cy = -(r_c2w[1][0] * tx + r_c2w[1][1] * ty + r_c2w[1][2] * tz)
    cz = -(r_c2w[2][0] * tx + r_c2w[2][1] * ty + r_c2w[2][2] * tz)
    return r_c2w, (cx, cy, cz)


def _quat_to_rotmat(qw: float, qx: float, qy: float, qz: float):
    return (
        (1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)),
        (2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)),
        (2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)),
    )


def find_sparse_dir(root: Path) -> Path | None:
    """Finds a directory containing COLMAP's TEXT export (cameras.txt + images.txt)."""
    for cand in (root / "sparse_txt" / "0", root / "sparse_txt", root / "sparse" / "0", root / "sparse"):
        if (cand / "cameras.txt").exists() and (cand / "images.txt").exists():
            return cand
    matches = list(root.rglob("cameras.txt"))
    return matches[0].parent if matches else None
