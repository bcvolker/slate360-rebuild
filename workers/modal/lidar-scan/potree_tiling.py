"""PotreeConverter bridge and hierarchy.json normalizer for Track L."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

import numpy as np

from potree_hierarchy import (
    attribute_layout,
    node_bounds,
    read_metadata,
    repack_node,
    walk_hierarchy,
)
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


def _scale_vec(metadata: dict[str, Any]) -> np.ndarray:
    raw_scale = metadata.get("scale", 0.001)
    if isinstance(raw_scale, (list, tuple)):
        return np.maximum(np.asarray(raw_scale[:3], dtype=np.float64), 1e-9)
    return np.full(3, max(float(raw_scale), 1e-9), dtype=np.float64)


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
        metadata = read_metadata(raw_output)
        layout = attribute_layout(metadata)
        fallback_bounds = (np.min(points, axis=0), np.max(points, axis=0))
        root_lower, root_upper = _box(metadata.get("boundingBox"), fallback_bounds)
        in_scale = _scale_vec(metadata)
        in_offset = _vec3(metadata.get("offset"), root_lower)
        # The viewer contract uses ONE scalar scale; converter scale may be a
        # 3-vector, so positions are re-encoded rather than byte-copied.
        out_scale = float(np.max(in_scale))
        out_offset = in_offset

        hierarchy_info = metadata.get("hierarchy") or {}
        first_chunk_size = int(hierarchy_info.get("firstChunkSize") or 0)
        hierarchy_bytes = (raw_output / "hierarchy.bin").read_bytes()
        octree_path = raw_output / "octree.bin"
        if not octree_path.is_file():
            raise RuntimeError("PotreeConverter produced no octree.bin (unsupported output)")
        potree_nodes = walk_hierarchy(hierarchy_bytes, first_chunk_size)

        tiles_dir = output_dir / "tiles"
        tiles_dir.mkdir(parents=True, exist_ok=True)
        names = {node.name for node in potree_nodes}
        nodes: list[dict[str, Any]] = []
        total_points = 0
        with octree_path.open("rb") as octree:
            for pnode in potree_nodes:
                if pnode.num_points <= 0:
                    continue
                octree.seek(pnode.byte_offset)
                payload = octree.read(pnode.byte_size)
                packed = repack_node(
                    payload, pnode.num_points, layout, in_scale, in_offset, out_scale, out_offset
                )
                (tiles_dir / f"{pnode.name}.bin").write_bytes(packed)
                lower, upper = node_bounds(root_lower, root_upper, pnode.name)
                has_child = any(
                    other.startswith(pnode.name) and len(other) > len(pnode.name)
                    for other in names
                )
                total_points += pnode.num_points
                nodes.append(
                    {
                        "id": pnode.name,
                        "path": f"tiles/{pnode.name}.bin",
                        "bounds": {"min": lower.tolist(), "max": upper.tolist()},
                        "count": int(pnode.num_points),
                        "level": max(0, len(pnode.name) - 1),
                        "leaf": not has_child,
                        "lod": has_child,
                    }
                )
        if not nodes:
            raise RuntimeError("Hierarchy walk produced no populated nodes")
        scale, offset = out_scale, out_offset
        stride, position_offset, color_offset = 16, 0, 12
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
            "version": str(metadata.get("version") or "2.0"),
            "format": "potree",
            "coordinateSystem": "model",
            "octreeDir": "tiles",
            "crs": crs,
            "bounds": {"min": root_lower.tolist(), "max": root_upper.tolist()},
            "pointCount": int(total_points),
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
