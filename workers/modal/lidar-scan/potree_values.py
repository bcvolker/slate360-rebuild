"""Attach deviation/slope sidecar tiles to Potree octree leaves."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np


def decode_positions(
    path: Path,
    *,
    stride: int,
    position_offset: int,
    scale: float,
    offset: np.ndarray,
) -> np.ndarray:
    raw = np.fromfile(path, dtype=np.uint8)
    count = len(raw) // stride
    if count <= 0:
        return np.empty((0, 3), dtype=np.float32)
    usable = raw[: count * stride].reshape(count, stride)
    encoded = usable[:, position_offset : position_offset + 12].copy()
    values = encoded.view("<i4").reshape(count, 3)
    return (values.astype(np.float64) * scale + offset).astype(np.float32)


def write_nearest_value_tiles(
    nodes: list[dict[str, Any]],
    tiles_dir: Path,
    values_dir: Path,
    points: np.ndarray,
    deviations: np.ndarray,
    slopes: np.ndarray,
    stride: int,
    position_offset: int,
    scale: float,
    offset: np.ndarray,
) -> None:
    import open3d as o3d

    cloud = o3d.geometry.PointCloud()
    cloud.points = o3d.utility.Vector3dVector(points.astype(np.float64))
    tree = o3d.geometry.KDTreeFlann(cloud)
    values_dir.mkdir(parents=True, exist_ok=True)
    for node in nodes:
        tile = tiles_dir / f"{node['id']}.bin"
        if not tile.is_file():
            continue
        tile_points = decode_positions(
            tile,
            stride=stride,
            position_offset=position_offset,
            scale=scale,
            offset=offset,
        )
        values = np.zeros((len(tile_points), 2), dtype="<f4")
        for index, point in enumerate(tile_points):
            _, matches, _ = tree.search_knn_vector_3d(point.astype(np.float64), 1)
            if matches:
                source_index = int(matches[0])
                values[index] = [deviations[source_index], slopes[source_index]]
        values.tofile(values_dir / f"{node['id']}.bin")
        node["valuesPath"] = f"analysis/tiles/{node['id']}.bin"
