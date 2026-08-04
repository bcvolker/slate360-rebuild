"""Point-cloud input adapters for LAS/LAZ/E57 sources."""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

MAX_POINTS_PER_SCAN = 8_000_000


@dataclass
class Scan:
    points: np.ndarray
    colors: np.ndarray
    source_name: str
    crs: str | None


def _colors_from_las(las: Any, count: int) -> np.ndarray:
    if not all(hasattr(las, name) for name in ("red", "green", "blue")):
        return np.full((count, 3), 180, dtype=np.uint8)
    rgb = np.column_stack([np.asarray(las.red), np.asarray(las.green), np.asarray(las.blue)])
    max_value = float(np.max(rgb)) if rgb.size else 0.0
    if max_value > 255:
        rgb = rgb / 257.0
    return np.clip(rgb, 0, 255).astype(np.uint8)


def _read_las(path: Path) -> tuple[np.ndarray, np.ndarray, str | None]:
    import laspy

    with laspy.open(path) as reader:
        total = int(reader.header.point_count)
        parsed_crs = reader.header.parse_crs()
        stride = max(1, int(np.ceil(total / MAX_POINTS_PER_SCAN)))
        point_chunks: list[np.ndarray] = []
        color_chunks: list[np.ndarray] = []
        for chunk in reader.chunk_iterator(500_000):
            point_chunks.append(
                np.column_stack([np.asarray(chunk.x), np.asarray(chunk.y), np.asarray(chunk.z)])[::stride]
            )
            color_chunks.append(_colors_from_las(chunk, len(chunk))[::stride])
    points = np.concatenate(point_chunks, axis=0).astype(np.float32, copy=False)
    colors = np.concatenate(color_chunks, axis=0).astype(np.uint8, copy=False)
    return points, colors, parsed_crs.to_string() if parsed_crs else None


def _read_e57(path: Path) -> tuple[np.ndarray, np.ndarray, str | None]:
    try:
        import pye57
    except ModuleNotFoundError as exc:
        raise RuntimeError("E57 support is unavailable in this worker image") from exc

    handle = pye57.E57(str(path))
    point_chunks: list[np.ndarray] = []
    color_chunks: list[np.ndarray] = []
    for index in range(handle.scan_count):
        raw = handle.read_scan_raw(index)
        names = raw.keys()
        if not {"cartesianX", "cartesianY", "cartesianZ"}.issubset(names):
            continue
        points = np.column_stack(
            [raw["cartesianX"], raw["cartesianY"], raw["cartesianZ"]]
        ).astype(np.float32)
        valid = np.isfinite(points).all(axis=1)
        points = points[valid]
        if "colorRed" in names and "colorGreen" in names and "colorBlue" in names:
            colors = np.column_stack(
                [raw["colorRed"], raw["colorGreen"], raw["colorBlue"]]
            )[valid]
            colors = np.clip(colors, 0, 255).astype(np.uint8)
        else:
            colors = np.full((len(points), 3), 180, dtype=np.uint8)
        point_chunks.append(points)
        color_chunks.append(colors)
    if not point_chunks:
        raise RuntimeError(f"E57 contains no Cartesian points: {path.name}")
    return np.concatenate(point_chunks), np.concatenate(color_chunks), None


def _pdal_normalize(path: Path, work_dir: Path) -> Path | None:
    pdal = shutil.which("pdal")
    if not pdal:
        return None
    work_dir.mkdir(parents=True, exist_ok=True)
    normalized = work_dir / f"{path.stem}.normalized.las"
    try:
        subprocess.run(
            [pdal, "translate", str(path), str(normalized)],
            check=True,
            capture_output=True,
            text=True,
            timeout=900,
        )
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        print(f"[pdal] normalization skipped for {path.name}: {exc}", flush=True)
        return None
    return normalized if normalized.is_file() else None


def read_scan(path: Path, work_dir: Path) -> Scan:
    suffix = path.suffix.lower()
    normalized = _pdal_normalize(path, work_dir)
    source = normalized or path
    if suffix in {".las", ".laz"} or normalized:
        points, colors, crs = _read_las(source)
    elif suffix == ".e57":
        points, colors, crs = _read_e57(source)
    else:
        raise RuntimeError(f"Unsupported terrestrial LiDAR format: {path.name}")
    if len(points) == 0:
        raise RuntimeError(f"Scan contains no valid points: {path.name}")
    return Scan(points=points, colors=colors, source_name=path.name, crs=crs)
