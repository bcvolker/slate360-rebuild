"""PotreeConverter bridge and hierarchy.json normalizer for Track L."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

import numpy as np

from potree_values import write_nearest_value_tiles


def _vec3(value: Any, fallback: np.ndarray) -> np.ndarray:
    if isinstance(value, (list, tuple)) and len(value) >= 3:
        return np.asarray(value[:3], dtype=np.float64)
    return fallback.astype(np.float64, copy=True)


def _box(value: Any, fallback: tuple[np.ndarray, np.ndarray]) -> tuple[np.ndarray, np.ndarray]:
    if isinstance(value, dict) and {"lx", "ly", "lz", "ux", "uy", "uz"} <= value.keys():
        return (
            np.array([value["lx"], value["ly"], value["lz"]], dtype=np.float64),
            np.array([value["ux"], value["uy"], value["uz"]], dtype=np.float64),
        )
    if isinstance(value, dict) and "min" in value and "max" in value:
        return _vec3(value["min"], fallback[0]), _vec3(value["max"], fallback[1])
    return fallback


def _read_converter_metadata(root: Path) -> dict[str, Any]:
    for name in ("cloud.js", "metadata.json"):
        candidate = root / name
        if candidate.is_file():
            return json.loads(candidate.read_text(encoding="utf-8"))
    raise RuntimeError("PotreeConverter produced neither cloud.js nor metadata.json")


def _hierarchy_entries(metadata: dict[str, Any]) -> list[tuple[str, int]]:
    raw = metadata.get("hierarchy")
    if isinstance(raw, dict):
        raw = raw.get("nodes")
    if not isinstance(raw, list):
        raise RuntimeError(
            "PotreeConverter output has no JSON hierarchy; use the pinned legacy converter image"
        )
    entries: list[tuple[str, int]] = []
    for item in raw:
        if isinstance(item, dict):
            name = str(item.get("name") or item.get("id") or "")
            count = int(item.get("points") or item.get("count") or 0)
        elif isinstance(item, (list, tuple)) and len(item) >= 2:
            name, count = str(item[0]), int(item[1])
        else:
            continue
        if name:
            entries.append((name, count))
    if not entries:
        raise RuntimeError("PotreeConverter hierarchy is empty")
    return entries


def _node_bounds(
    root_lower: np.ndarray,
    root_upper: np.ndarray,
    name: str,
) -> tuple[np.ndarray, np.ndarray]:
    lower = root_lower.copy()
    upper = root_upper.copy()
    for digit in name[1:]:
        midpoint = (lower + upper) / 2.0
        child = int(digit)
        for axis in range(3):
            if child & (1 << axis):
                lower[axis] = midpoint[axis]
            else:
                upper[axis] = midpoint[axis]
    return lower, upper


def _attribute_layout(metadata: dict[str, Any]) -> tuple[int, int, int]:
    attrs = metadata.get("pointAttributes")
    if not isinstance(attrs, list) or not attrs or all(isinstance(item, str) for item in attrs):
        return 16, 0, 12
    stride = 0
    position_offset = 0
    color_offset = 12
    for item in attrs:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").upper()
        size = int(item.get("size") or 0)
        if name.startswith("POSITION"):
            position_offset = stride
        if name in {"COLOR_PACKED", "RGBA", "RGB"}:
            color_offset = stride
        stride += size
    return max(stride, 16), position_offset, color_offset


def _scale_offset(metadata: dict[str, Any], root_lower: np.ndarray) -> tuple[float, np.ndarray]:
    raw_scale = metadata.get("scale", 0.001)
    scale = float(raw_scale[0] if isinstance(raw_scale, list) else raw_scale)
    return max(scale, 1e-9), _vec3(metadata.get("offset"), root_lower)


def _write_las(points: np.ndarray, colors: np.ndarray, path: Path, crs: str | None) -> None:
    import laspy

    header = laspy.LasHeader(point_format=2, version="1.2")
    header.scales = np.array([0.001, 0.001, 0.001])
    header.offsets = np.min(points, axis=0).astype(np.float64)
    if crs:
        try:
            from pyproj import CRS

            header.add_crs(CRS.from_user_input(crs))
        except Exception as exc:  # noqa: BLE001
            print(f"[potree] CRS metadata skipped: {exc}", flush=True)
    las = laspy.LasData(header)
    las.x, las.y, las.z = points[:, 0], points[:, 1], points[:, 2]
    rgb = np.clip(colors.astype(np.uint16) * 257, 0, 65535)
    las.red, las.green, las.blue = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    path.parent.mkdir(parents=True, exist_ok=True)
    las.write(path)


def _run_converter(binary: str, source: Path, output: Path) -> None:
    resolved = shutil.which(binary) or (binary if Path(binary).is_file() else None)
    if not resolved:
        raise RuntimeError(f"PotreeConverter binary is missing: {binary}")
    attempts = (
        [resolved, "-i", str(source), "-o", str(output), "--generate-page", "false"],
        [resolved, str(source), "-o", str(output)],
    )
    errors: list[str] = []
    for command in attempts:
        shutil.rmtree(output, ignore_errors=True)
        output.mkdir(parents=True, exist_ok=True)
        result = subprocess.run(
            command, capture_output=True, text=True, timeout=45 * 60, check=False
        )
        if result.returncode == 0:
            return
        errors.append((result.stdout + "\n" + result.stderr)[-1500:])
    raise RuntimeError("PotreeConverter failed:\n" + "\n---\n".join(errors))


def write_potree(
    points: np.ndarray,
    colors: np.ndarray,
    deviations: np.ndarray,
    slopes: np.ndarray,
    output_dir: Path,
    *,
    crs: str | None = None,
    converter_bin: str = "/usr/local/bin/PotreeConverter",
) -> dict[str, Any]:
    """Run baked PotreeConverter and publish hierarchy.json + tiles/*.bin."""
    work_dir = output_dir.parent / "potree-converter-work"
    source = work_dir / "merged.las"
    raw_output = work_dir / "output"
    shutil.rmtree(work_dir, ignore_errors=True)
    shutil.rmtree(output_dir, ignore_errors=True)
    work_dir.mkdir(parents=True, exist_ok=True)
    try:
        _write_las(points, colors, source, crs)
        _run_converter(converter_bin, source, raw_output)
        metadata = _read_converter_metadata(raw_output)
        entries = _hierarchy_entries(metadata)
        fallback_bounds = (np.min(points, axis=0), np.max(points, axis=0))
        root_lower, root_upper = _box(metadata.get("boundingBox"), fallback_bounds)
        scale, offset = _scale_offset(metadata, root_lower)
        stride, position_offset, color_offset = _attribute_layout(metadata)
        raw_tiles = raw_output / str(metadata.get("octreeDir") or "data")
        if not raw_tiles.is_dir():
            raw_tiles = raw_output / "data"
        tiles_dir = output_dir / "tiles"
        tiles_dir.mkdir(parents=True, exist_ok=True)
        names = {name for name, _ in entries}
        nodes: list[dict[str, Any]] = []
        for node_id, count in entries:
            source_tile = next(raw_tiles.rglob(f"{node_id}.bin"), None)
            if source_tile is None:
                raise RuntimeError(f"PotreeConverter tile is missing: {node_id}.bin")
            shutil.copyfile(source_tile, tiles_dir / f"{node_id}.bin")
            lower, upper = _node_bounds(root_lower, root_upper, node_id)
            has_child = any(
                other.startswith(node_id) and len(other) > len(node_id) for other in names
            )
            nodes.append(
                {
                    "id": node_id,
                    "path": f"tiles/{node_id}.bin",
                    "bounds": {"min": lower.tolist(), "max": upper.tolist()},
                    "count": int(count),
                    "level": max(0, len(node_id) - 1),
                    "leaf": not has_child,
                    "lod": has_child,
                }
            )
        write_nearest_value_tiles(
            nodes,
            tiles_dir,
            output_dir / "analysis" / "tiles",
            points,
            deviations,
            slopes,
            stride,
            position_offset,
            scale,
            offset,
        )
        hierarchy = {
            "version": str(metadata.get("version") or "1.8"),
            "format": "potree",
            "coordinateSystem": "model",
            "octreeDir": "tiles",
            "crs": crs,
            "bounds": {"min": root_lower.tolist(), "max": root_upper.tolist()},
            "pointCount": int(metadata.get("points") or len(points)),
            "nodeCount": len(nodes),
            "attributes": ["POSITION", "RGB", "DEVIATION", "SLOPE"],
            "spacing": float(metadata.get("spacing") or 0),
            "scale": scale,
            "offset": offset.tolist(),
            "pointStride": stride,
            "positionOffset": position_offset,
            "colorOffset": color_offset,
            "hierarchy": "hierarchy.json",
            "nodes": nodes,
            "analysis": {
                "valuesPrefix": "analysis/tiles/",
                "flatness": "analysis/flatness.json",
                "slope": "analysis/slope.json",
                "contours": "analysis/contours.geojson",
                "sections": "analysis/sections.json",
            },
        }
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / "hierarchy.json").write_text(
            json.dumps(hierarchy, indent=2) + "\n", encoding="utf-8"
        )
        return hierarchy
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)
