"""Self-contained 3D Tiles point-cloud writer for the LiDAR viewer."""

from __future__ import annotations

import json
import struct
from pathlib import Path
from typing import Any

import numpy as np

MAX_NODE_POINTS = 50_000
MAX_DEPTH = 8


def _pad_json(value: bytes, start_offset: int) -> bytes:
    return value + b" " * (-(start_offset + len(value)) % 8)


def _pad_binary(value: bytes) -> bytes:
    return value + b"\0" * ((-len(value)) % 8)


def _box(lower: np.ndarray, upper: np.ndarray) -> list[float]:
    center = (lower + upper) / 2.0
    half = np.maximum((upper - lower) / 2.0, 1e-6)
    return [
        *center.tolist(),
        float(half[0]), 0.0, 0.0,
        0.0, float(half[1]), 0.0,
        0.0, 0.0, float(half[2]),
    ]


def _write_pnts(
    path: Path,
    points: np.ndarray,
    colors: np.ndarray,
    deviations: np.ndarray,
    slopes: np.ndarray,
    lower: np.ndarray,
    upper: np.ndarray,
) -> None:
    center = (lower + upper) / 2.0
    position_bytes = (points - center).astype("<f4", copy=False).tobytes()
    color_bytes = colors.astype("u1", copy=False).tobytes()
    feature_binary = _pad_binary(position_bytes + color_bytes)
    feature_json = _pad_json(
        json.dumps(
            {
                "POINTS_LENGTH": len(points),
                "POSITION": {"byteOffset": 0},
                "RGB": {"byteOffset": len(position_bytes)},
                "RTC_CENTER": center.tolist(),
            },
            separators=(",", ":"),
        ).encode("utf-8"),
        28,
    )

    deviation_bytes = deviations.astype("<f4", copy=False).tobytes()
    slope_bytes = slopes.astype("<f4", copy=False).tobytes()
    batch_binary = _pad_binary(deviation_bytes + slope_bytes)
    batch_json = _pad_json(
        json.dumps(
            {
                "deviation": {
                    "byteOffset": 0,
                    "componentType": "FLOAT",
                    "type": "SCALAR",
                },
                "slope": {
                    "byteOffset": len(deviation_bytes),
                    "componentType": "FLOAT",
                    "type": "SCALAR",
                },
            },
            separators=(",", ":"),
        ).encode("utf-8"),
        28 + len(feature_json) + len(feature_binary),
    )
    byte_length = 28 + len(feature_json) + len(feature_binary) + len(batch_json) + len(batch_binary)
    header = struct.pack(
        "<4s6I",
        b"pnts",
        1,
        byte_length,
        len(feature_json),
        len(feature_binary),
        len(batch_json),
        len(batch_binary),
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(header + feature_json + feature_binary + batch_json + batch_binary)


def write_octree(
    points: np.ndarray,
    colors: np.ndarray,
    deviations: np.ndarray,
    slopes: np.ndarray,
    output_dir: Path,
    *,
    crs: str | None = None,
) -> dict[str, Any]:
    """Write a 3D Tiles 1.0 tileset with one PNTS tile per leaf node."""
    if not len(points):
        raise ValueError("Cannot tile an empty point cloud")
    output_dir.mkdir(parents=True, exist_ok=True)
    lower = np.min(points, axis=0).astype(np.float64)
    upper = np.max(points, axis=0).astype(np.float64)
    upper = np.where(upper - lower < 1e-6, lower + 1e-6, upper)
    nodes: list[dict[str, Any]] = []
    leaf_tiles: list[dict[str, Any]] = []

    def visit(
        indices: np.ndarray,
        node_lower: np.ndarray,
        node_upper: np.ndarray,
        key: str,
        depth: int,
    ) -> None:
        should_split = len(indices) > MAX_NODE_POINTS and depth < MAX_DEPTH
        node_path = f"nodes/{key}.pnts" if not should_split else ""
        nodes.append(
            {
                "id": key,
                "path": node_path,
                "bounds": {"min": node_lower.tolist(), "max": node_upper.tolist()},
                "count": int(len(indices)),
                "lod": bool(should_split),
                "leaf": not should_split,
                "level": depth,
            }
        )
        if not should_split:
            _write_pnts(
                output_dir / node_path,
                points[indices],
                colors[indices],
                deviations[indices],
                slopes[indices],
                node_lower,
                node_upper,
            )
            leaf_tiles.append(
                {
                    "boundingVolume": {"box": _box(node_lower, node_upper)},
                    "geometricError": 0,
                    "content": {"uri": node_path},
                }
            )
            return

        midpoint = (node_lower + node_upper) / 2.0
        octant = (
            (points[indices, 0] >= midpoint[0]).astype(np.int64)
            | ((points[indices, 1] >= midpoint[1]).astype(np.int64) << 1)
            | ((points[indices, 2] >= midpoint[2]).astype(np.int64) << 2)
        )
        for child in range(8):
            child_indices = indices[octant == child]
            if not len(child_indices):
                continue
            child_lower = node_lower.copy()
            child_upper = node_upper.copy()
            for axis in range(3):
                if child & (1 << axis):
                    child_lower[axis] = midpoint[axis]
                else:
                    child_upper[axis] = midpoint[axis]
            visit(child_indices, child_lower, child_upper, f"{key}{child}", depth + 1)

    visit(np.arange(len(points), dtype=np.int64), lower, upper, "r", 0)
    tileset = {
        "asset": {"version": "1.0"},
        "geometricError": float(np.linalg.norm(upper - lower)),
        "root": {
            "boundingVolume": {"box": _box(lower, upper)},
            "geometricError": float(np.linalg.norm(upper - lower)),
            "refine": "ADD",
            "children": leaf_tiles,
        },
    }
    (output_dir / "tileset.json").write_text(json.dumps(tileset, indent=2) + "\n", encoding="utf-8")
    manifest = {
        "version": 1,
        "format": "slate360-3dtiles",
        "coordinateSystem": "model",
        "crs": crs,
        "tileset": "tileset.json",
        "bounds": {"min": lower.tolist(), "max": upper.tolist()},
        "pointCount": int(len(points)),
        "nodeCount": len(nodes),
        "attributes": ["POSITION", "RGB", "DEVIATION", "SLOPE"],
        "nodes": nodes,
        "analysis": {},
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest
