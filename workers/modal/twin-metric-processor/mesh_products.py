"""Display / nav mesh products from an existing TSDF mesh. Does not reintegrate."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from glb_binary import write_open3d_mesh_glb


def _counts(mesh) -> dict[str, int]:
    labels, counts, _ = mesh.cluster_connected_triangles()
    arr = np.asarray(counts)
    return {
        "triangles": int(len(mesh.triangles)),
        "vertices": int(len(mesh.vertices)),
        "components": int(arr.size),
        "largest": int(arr.max()) if arr.size else 0,
    }


def keep_large_components(mesh, *, min_tris: int, coverage: float):
    labels, counts, _ = mesh.cluster_connected_triangles()
    labels = np.asarray(labels)
    counts = np.asarray(counts)
    if counts.size == 0:
        return mesh
    order = np.argsort(counts)[::-1]
    keep = np.zeros(len(counts), dtype=bool)
    acc = 0
    total = int(counts.sum()) or 1
    for idx in order:
        if keep.any() and counts[idx] < min_tris and acc / total >= coverage:
            break
        keep[idx] = True
        acc += int(counts[idx])
    drop = ~keep[labels]
    mesh.remove_triangles_by_mask(drop)
    mesh.remove_unreferenced_vertices()
    return mesh


def keep_largest_component(mesh):
    labels, counts, _ = mesh.cluster_connected_triangles()
    labels = np.asarray(labels)
    counts = np.asarray(counts)
    if counts.size == 0:
        return mesh
    drop = labels != int(np.argmax(counts))
    mesh.remove_triangles_by_mask(drop)
    mesh.remove_unreferenced_vertices()
    return mesh


def _clean(mesh, *, weld: float | None = None):
    mesh.remove_duplicated_triangles()
    mesh.remove_degenerate_triangles()
    mesh.remove_duplicated_vertices()
    mesh.remove_unreferenced_vertices()
    if weld and weld > 0:
        mesh.merge_close_vertices(weld)
        mesh.remove_duplicated_triangles()
        mesh.remove_unreferenced_vertices()
    mesh.orient_triangles()
    mesh.compute_vertex_normals()
    return mesh


def build_mesh_products(src_mesh, out_dir: str | Path, *,
                        display_tris: int = 750_000, nav_tris: int = 200_000) -> dict[str, Any]:
    import copy

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    before = _counts(src_mesh)

    measurement = copy.deepcopy(src_mesh)
    measurement.compute_vertex_normals()
    meas_path = out / "geometry-measurement.glb"
    meas_info = write_open3d_mesh_glb(meas_path, measurement)
    # Authoritative binary alias used by the worker contract.
    geom_path = out / "geometry.glb"
    write_open3d_mesh_glb(geom_path, measurement)

    display = copy.deepcopy(src_mesh)
    display_before = _counts(display)
    keep_large_components(display, min_tris=1_500, coverage=0.97)
    display = _clean(display)
    if int(len(display.triangles)) > 50_000:
        display = display.filter_smooth_taubin(number_of_iterations=8)
        display.compute_vertex_normals()
    if int(len(display.triangles)) > display_tris:
        display = display.simplify_quadric_decimation(display_tris)
        display.compute_vertex_normals()
    keep_large_components(display, min_tris=800, coverage=0.99)
    display = _clean(display)
    display_path = out / "geometry-display.glb"
    display_info = write_open3d_mesh_glb(display_path, display)

    nav = copy.deepcopy(src_mesh)
    nav_before = _counts(nav)
    keep_largest_component(nav)
    nav.remove_degenerate_triangles()
    nav.remove_duplicated_triangles()
    nav.remove_unreferenced_vertices()
    if int(len(nav.triangles)) > nav_tris:
        nav = nav.simplify_quadric_decimation(nav_tris)
    keep_largest_component(nav)
    nav.orient_triangles()
    nav.compute_vertex_normals()
    nav_path = out / "geometry-nav.glb"
    nav_info = write_open3d_mesh_glb(nav_path, nav)

    report = {
        "source": before,
        "measurement": {**_counts(measurement), "bytes": meas_path.stat().st_size, "glb": meas_info},
        "display": {
            **_counts(display),
            "bytes": display_path.stat().st_size,
            "beforeFilter": display_before,
            "glb": display_info,
        },
        "nav": {
            **_counts(nav),
            "bytes": nav_path.stat().st_size,
            "beforeFilter": nav_before,
            "glb": nav_info,
        },
        "paths": {
            "geometry.glb": str(geom_path),
            "geometry-measurement.glb": str(meas_path),
            "geometry-display.glb": str(display_path),
            "geometry-nav.glb": str(nav_path),
        },
    }
    return report
