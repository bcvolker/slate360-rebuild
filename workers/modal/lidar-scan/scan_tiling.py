"""Self-hosted Potree octree writer for the LiDAR viewer.

Emits the decided on-wire format (§7.8): a Potree octree under the model
prefix, with `hierarchy.json` (the octree tree) + per-leaf-node `r/<key>.bin`
tile files. A `manifest.json` slate360 wrapper mirrors the flat node list so
the minimal R3F viewer can stream from `manifest.json` -> `r/<key>.bin` without
a separate hierarchy fetch, while a standard Potree viewer can read
`hierarchy.json` directly.

Per-leaf `.bin` layout (little-endian, no header — sizes come from hierarchy.json):
  positions: N * 3 * float32  (absolute model coordinates)
  rgb:       N * 3 * uint8
  deviation: N * float32      (signed distance to best-fit plane, meters)
  slope:     N * float32      (radians)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np

MAX_NODE_POINTS = 50_000
MAX_DEPTH = 8


def _bounds(lower: np.ndarray, upper: np.ndarray) -> dict[str, list[float]]:
    return {"min": lower.tolist(), "max": upper.tolist()}


def _write_node_bin(path: Path, points: np.ndarray, colors: np.ndarray,
                    deviations: np.ndarray, slopes: np.ndarray) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    blob = (
        points.astype("<f4", copy=False).tobytes()
        + colors.astype("u1", copy=False).tobytes()
        + deviations.astype("<f4", copy=False).tobytes()
        + slopes.astype("<f4", copy=False).tobytes()
    )
    path.write_bytes(blob)
    return len(blob)


def write_octree(
    points: np.ndarray,
    colors: np.ndarray,
    deviations: np.ndarray,
    slopes: np.ndarray,
    output_dir: Path,
    *,
    crs: str | None = None,
) -> dict[str, Any]:
    """Write a Potree octree (hierarchy.json + r/<key>.bin) + manifest.json."""
    if not len(points):
        raise ValueError("Cannot tile an empty point cloud")
    output_dir.mkdir(parents=True, exist_ok=True)
    lower = np.min(points, axis=0).astype(np.float64)
    upper = np.max(points, axis=0).astype(np.float64)
    upper = np.where(upper - lower < 1e-6, lower + 1e-6, upper)

    nodes: list[dict[str, Any]] = []
    hierarchy: list[dict[str, Any]] = []

    def visit(indices: np.ndarray, node_lower: np.ndarray, node_upper: np.ndarray,
              key: str, depth: int) -> None:
        should_split = len(indices) > MAX_NODE_POINTS and depth < MAX_DEPTH
        is_leaf = not should_split
        node_entry: dict[str, Any] = {
            "id": key,
            "name": key,
            "bounds": _bounds(node_lower, node_upper),
            "count": int(len(indices)),
            "leaf": is_leaf,
            "level": depth,
        }
        hier_entry: dict[str, Any] = {
            "name": key,
            "points": int(len(indices)),
            "bounds": _bounds(node_lower, node_upper),
            "leaf": is_leaf,
        }
        if is_leaf:
            bin_path = output_dir / "r" / f"{key}.bin"
            byte_size = _write_node_bin(
                bin_path, points[indices], colors[indices],
                deviations[indices], slopes[indices],
            )
            node_entry["path"] = f"r/{key}.bin"
            node_entry["byteSize"] = byte_size
            hier_entry["file"] = f"r/{key}.bin"
            hier_entry["byteSize"] = byte_size
        else:
            node_entry["path"] = ""
            hier_entry["children"] = []
        nodes.append(node_entry)
        hierarchy.append(hier_entry)
        if not is_leaf:
            midpoint = (node_lower + node_upper) / 2.0
            octant = (
                (points[indices, 0] >= midpoint[0]).astype(np.int64)
                | ((points[indices, 1] >= midpoint[1]).astype(np.int64) << 1)
                | ((points[indices, 2] >= midpoint[2]).astype(np.int64) << 2)
            )
            child_names: list[str] = []
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
                child_key = f"{key}{child}"
                child_names.append(child_key)
                visit(child_indices, child_lower, child_upper, child_key, depth + 1)
            hier_entry["children"] = child_names

    visit(np.arange(len(points), dtype=np.int64), lower, upper, "r", 0)

    bounds = _bounds(lower, upper)
    attributes = ["POSITION", "RGB", "DEVIATION", "SLOPE"]
    hierarchy_doc = {
        "version": 2,
        "format": "potree",
        "coordinateSystem": "model",
        "crs": crs,
        "bounds": bounds,
        "pointCount": int(len(points)),
        "attributes": attributes,
        "nodes": hierarchy,
    }
    (output_dir / "hierarchy.json").write_text(
        json.dumps(hierarchy_doc, indent=2) + "\n", encoding="utf-8"
    )
    manifest = {
        "version": 1,
        "format": "slate360-potree",
        "coordinateSystem": "model",
        "crs": crs,
        "bounds": bounds,
        "pointCount": int(len(points)),
        "nodeCount": len(nodes),
        "attributes": attributes,
        "hierarchy": "hierarchy.json",
        "nodes": nodes,
        "analysis": {},
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return manifest
