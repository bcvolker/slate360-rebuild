"""M4 — dollhouse post-process for a metric, +Y-up interior TSDF mesh.

Fail-safe by design: degenerate input never raises. The mesh comes back
unchanged and `skipped` says why — this runs unattended on a server, so a room
with no detectable ceiling must not fail a job.

Ceiling cuts use triangle CENTROIDS, not vertices, so a wall triangle whose top
vertex touches the ceiling survives the cut instead of being punched out.

Open3D (MIT) + numpy (BSD) only. Open3D is imported inside functions so the pure
maths helpers stay importable and testable where it is not installed.

Corrections applied to the drafted version (all three were runtime failures):
  1. `mesh.copy()` does not exist on an Open3D TriangleMesh — use the copy
     constructor `o3d.geometry.TriangleMesh(mesh)`.
  2. Wall snapping matched each inlier back to its vertex with an O(N*M) scan
     (`abs(all_verts - p).sum(axis=1)` per inlier). At 500k vertices that is
     tens of billions of operations and would hang the worker. RANSAC now
     carries ORIGINAL vertex indices through, so snapping is a direct index
     write.
  3. `cut_ceiling` hard-coded axis 1 while every sibling took `up_axis` —
     now consistent.
"""

from __future__ import annotations

from typing import Any

_H_TOL_DEG = 15.0
_MIN_STOREY_M = 1.8
_RANSAC_ITERS = 800
_MAX_PLANES = 12
_MIN_RESULTANT = 0.55


def plane_is_horizontal(normal: Any, up_axis: int, tolerance_deg: float) -> bool:
    """True when `normal` is within `tolerance_deg` of ±up (a floor or ceiling).
    Zero-length or non-finite normals return False rather than raising."""
    import numpy as np

    n = np.asarray(normal, dtype=float).reshape(-1)
    if n.size < 3:
        return False
    n = n[:3]
    mag = float(np.linalg.norm(n))
    if mag < 1e-12 or not np.isfinite(mag):
        return False
    up = np.zeros(3)
    up[up_axis] = 1.0
    ang = float(np.degrees(np.arccos(np.clip(abs(float(np.dot(n / mag, up))), 0.0, 1.0))))
    return ang <= tolerance_deg


def plane_is_vertical(normal: Any, up_axis: int, tolerance_deg: float) -> bool:
    """True when `normal` is perpendicular to up within `tolerance_deg` (a wall).
    Degenerate normals return False rather than raising."""
    import numpy as np

    n = np.asarray(normal, dtype=float).reshape(-1)
    if n.size < 3:
        return False
    n = n[:3]
    mag = float(np.linalg.norm(n))
    if mag < 1e-12 or not np.isfinite(mag):
        return False
    up = np.zeros(3)
    up[up_axis] = 1.0
    ang = float(np.degrees(np.arccos(np.clip(abs(float(np.dot(n / mag, up))), 0.0, 1.0))))
    return ang >= (90.0 - tolerance_deg)


def _horizontal_axes(up_axis: int) -> list[int]:
    return [i for i in range(3) if i != up_axis]


def _headings_mod90(normals: Any, up_axis: int) -> Any:
    """Plane-normal headings folded into [0, 90) — the Manhattan grid repeats
    every 90°, so folding is what makes four walls agree instead of cancel."""
    import numpy as np

    arr = np.asarray(normals, dtype=float)
    horiz = arr.copy()
    horiz[:, up_axis] = 0.0
    mag = np.linalg.norm(horiz, axis=1)
    ok = mag > 1e-8
    if int(ok.sum()) == 0:
        return np.zeros(0)
    a, b = _horizontal_axes(up_axis)
    heading = np.degrees(np.arctan2(horiz[ok, a], horiz[ok, b]))
    return np.mod(heading, 90.0)


def dominant_grid_angle(normals: Any, *, up_axis: int = 1) -> float | None:
    """Circular mean of folded headings, in [0, 90).

    Returns None when there is no grid: fewer than 3 usable normals, or a
    resultant length below 0.55 (uniform-random normals produce ~0). Refusing
    is important — snapping to an imaginary grid would bend real walls.
    """
    import numpy as np

    arr = np.asarray(normals, dtype=float)
    if arr.ndim != 2 or arr.shape[0] < 3 or arr.shape[1] != 3:
        return None
    folded = _headings_mod90(arr, up_axis)
    if folded.size < 3:
        return None
    four = np.deg2rad(folded) * 4.0
    s, c = float(np.sin(four).mean()), float(np.cos(four).mean())
    if float(np.hypot(s, c)) < _MIN_RESULTANT:
        return None
    return float(np.mod(np.degrees(np.arctan2(s, c)) / 4.0, 90.0))


def snap_heading(heading_deg: float, grid_angle_deg: float) -> float:
    """Snap to the nearest of the four axes at `grid_angle_deg` + k*90.

    47° on a 0° grid snaps to 90, not 45 — the axes are 0/90/180/270, not the
    midpoints. 359° snaps to 0 (the comparison wraps).
    """
    h = heading_deg % 360.0
    best_ax, best_d = 0.0, 1e9
    for k in range(4):
        ax = (grid_angle_deg + 90.0 * k) % 360.0
        d = abs(h - ax) % 360.0
        d = min(d, 360.0 - d)
        if d < best_d:
            best_ax, best_d = ax, d
    return float(best_ax)


def _empty_detect(reason: str) -> dict[str, Any]:
    return {
        "floor_y": None,
        "ceiling_y": None,
        "floor_inliers": 0,
        "ceiling_inliers": 0,
        "skipped": reason,
    }


def _iter_ransac_planes(
    points: Any, distance_threshold: float, min_count: int
) -> list[tuple[Any, Any]]:
    """Iteratively segment planes, returning (model, ORIGINAL vertex indices).

    Indices — not copied coordinates — so callers can write straight back into
    the vertex array. The drafted version returned points and then searched the
    full vertex array per inlier, which is O(N*M) and hangs on real meshes.
    """
    import numpy as np
    import open3d as o3d

    pts = np.asarray(points, dtype=float)
    alive = np.arange(pts.shape[0])
    found: list[tuple[Any, Any]] = []
    for _ in range(_MAX_PLANES):
        if alive.size < max(3, min_count):
            break
        pcd = o3d.geometry.PointCloud()
        pcd.points = o3d.utility.Vector3dVector(pts[alive])
        try:
            model, inliers = pcd.segment_plane(
                distance_threshold=distance_threshold,
                ransac_n=3,
                num_iterations=_RANSAC_ITERS,
            )
        except RuntimeError:
            break
        local = np.asarray(inliers, dtype=int)
        if local.size < min_count:
            break
        found.append((np.asarray(model, dtype=float), alive[local].copy()))
        keep = np.ones(alive.size, dtype=bool)
        keep[local] = False
        alive = alive[keep]
    return found


def detect_horizontal_planes(
    mesh: Any,
    *,
    up_axis: int = 1,
    min_inlier_fraction: float = 0.02,
    distance_threshold: float = 0.03,
) -> dict[str, Any]:
    """Find floor (lowest qualifying horizontal plane) and ceiling (highest).

    Deliberately NOT "the two largest planes" — a countertop or desk can
    out-vote a partly-occluded floor. The pair is accepted only when they are
    at least 1.8 m apart; otherwise the floor is returned and ceiling is None,
    so a countertop can never become the roof cut.
    """
    import numpy as np

    verts = np.asarray(mesh.vertices)
    n = int(verts.shape[0])
    if n < 3:
        return _empty_detect("no_horizontal_planes")

    min_count = max(3, int(np.ceil(min_inlier_fraction * n)))
    candidates: list[tuple[float, int]] = []
    for model, idx in _iter_ransac_planes(verts, distance_threshold, min_count):
        if not plane_is_horizontal(model[:3], up_axis, _H_TOL_DEG):
            continue
        candidates.append((float(verts[idx][:, up_axis].mean()), int(idx.size)))

    if not candidates:
        return _empty_detect("no_horizontal_planes")

    candidates.sort(key=lambda t: t[0])
    floor_y, floor_n = candidates[0]
    ceil_y, ceil_n = candidates[-1]
    out: dict[str, Any] = {
        "floor_y": floor_y,
        "ceiling_y": None,
        "floor_inliers": floor_n,
        "ceiling_inliers": 0,
        "skipped": None,
    }
    if len(candidates) >= 2 and (ceil_y - floor_y) >= _MIN_STOREY_M:
        out["ceiling_y"] = ceil_y
        out["ceiling_inliers"] = ceil_n
    return out


def cut_ceiling(
    mesh: Any,
    ceiling_y: float | None,
    *,
    margin: float = 0.05,
    up_axis: int = 1,
    remove: bool = True,
) -> tuple[Any, dict[str, Any]]:
    """Identify the ceiling, and optionally remove it.

    Triangles are selected by CENTROID, so a wall triangle whose top vertex
    touches the ceiling survives rather than being punched out.

    `remove=False` keeps every triangle and only REPORTS `cut_y`. That is the
    shipping default for the viewer: the client needs three ceiling states —
    open (dollhouse), closed (soffits, finishes, leak staining) and plenum
    (lid ghosted, duct and tray visible before burial) — and a mesh with the lid
    already deleted can only ever show the first. Destroying geometry at
    processing time is a decision the viewer should be making at render time.
    """
    import numpy as np
    import open3d as o3d

    if ceiling_y is None:
        return mesh, {"skipped": "no_ceiling", "triangles_removed": 0, "cut_y": None}

    verts = np.asarray(mesh.vertices)
    tris = np.asarray(mesh.triangles)
    cut_y = float(ceiling_y - margin)
    if tris.size == 0:
        return mesh, {"skipped": None, "triangles_removed": 0, "cut_y": cut_y}

    keep = verts[tris].mean(axis=1)[:, up_axis] <= cut_y
    above = int((~keep).sum())
    if not remove:
        return mesh, {
            "skipped": None,
            "triangles_removed": 0,
            "triangles_above_cut": above,
            "cut_y": cut_y,
            "removed": False,
        }
    removed = above
    out = o3d.geometry.TriangleMesh()
    out.vertices = o3d.utility.Vector3dVector(verts)
    out.triangles = o3d.utility.Vector3iVector(tris[keep])
    # Carry per-vertex attributes across. Building a bare TriangleMesh drops
    # them, and that silently un-textured every dollhouse: the fusion baked
    # colour into the vertices and this stage threw it away.
    colors = np.asarray(mesh.vertex_colors)
    if colors.shape[0] == verts.shape[0]:
        out.vertex_colors = o3d.utility.Vector3dVector(colors)
    normals = np.asarray(mesh.vertex_normals)
    if normals.shape[0] == verts.shape[0]:
        out.vertex_normals = o3d.utility.Vector3dVector(normals)
    if int(keep.sum()) > 0:
        out.remove_unreferenced_vertices()
    return out, {
        "skipped": None,
        "triangles_removed": removed,
        "triangles_above_cut": above,
        "cut_y": cut_y,
        "removed": True,
    }


def _no_grid(reason: str = "no_manhattan_grid") -> dict[str, Any]:
    return {"skipped": reason, "planes_snapped": 0, "vertices_moved": 0, "grid_angle_deg": None}


def snap_walls_to_manhattan(
    mesh: Any,
    *,
    up_axis: int = 1,
    angle_tolerance_deg: float = 12.0,
    distance_threshold: float = 0.04,
) -> tuple[Any, dict[str, Any]]:
    """Project wall inliers onto a four-axis Manhattan grid when one exists.

    A vertex moves only when the correction is under `distance_threshold` — the
    assumption straightens waviness, it must never drag geometry across the room.
    """
    import numpy as np
    import open3d as o3d

    verts = np.asarray(mesh.vertices, dtype=float)
    if verts.shape[0] < 3:
        return mesh, _no_grid()

    min_count = max(3, int(np.ceil(0.02 * verts.shape[0])))
    walls = [
        (model[:3], idx)
        for model, idx in _iter_ransac_planes(verts, distance_threshold, min_count)
        if plane_is_vertical(model[:3], up_axis, angle_tolerance_deg)
    ]
    if len(walls) < 2:
        return mesh, _no_grid()

    grid = dominant_grid_angle(np.stack([w[0] for w in walls]), up_axis=up_axis)
    if grid is None:
        return mesh, _no_grid()

    a, b = _horizontal_axes(up_axis)
    out_verts = verts.copy()
    moved = 0
    snapped = 0
    for normal, idx in walls:
        horiz = np.asarray(normal, dtype=float).copy()
        horiz[up_axis] = 0.0
        if float(np.linalg.norm(horiz)) < 1e-8:
            continue
        heading = float(np.degrees(np.arctan2(horiz[a], horiz[b])))
        sh = np.deg2rad(snap_heading(heading, grid))
        target = np.zeros(3)
        target[a] = np.sin(sh)
        target[b] = np.cos(sh)
        if float(np.dot(target, horiz)) < 0.0:
            target = -target

        offset = -float(np.dot(target, out_verts[idx].mean(axis=0)))
        dist = out_verts[idx] @ target + offset
        within = np.abs(dist) <= distance_threshold
        if not within.any():
            continue
        move_idx = idx[within]
        out_verts[move_idx] -= dist[within][:, None] * target
        moved += int(within.sum())
        snapped += 1

    if snapped == 0:
        return mesh, _no_grid()

    # Open3D TriangleMesh has no .copy(); the copy constructor is the API.
    result = o3d.geometry.TriangleMesh(mesh)
    result.vertices = o3d.utility.Vector3dVector(out_verts)
    return result, {
        "skipped": None,
        "planes_snapped": snapped,
        "vertices_moved": moved,
        "grid_angle_deg": float(grid),
    }


def triangle_count(mesh: Any) -> int:
    """Triangle count without importing numpy at module load."""
    import numpy as np

    return int(np.asarray(mesh.triangles).shape[0])


def decimate(mesh: Any, target_triangles: int = 250_000) -> tuple[Any, dict[str, Any]]:
    """Quadric decimation. No-op at or below target, or on an empty mesh."""
    n = triangle_count(mesh)
    if n == 0:
        return mesh, {"before": 0, "after": 0, "skipped": "empty_mesh"}
    if n <= target_triangles:
        return mesh, {"before": n, "after": n, "skipped": None}
    try:
        out = mesh.simplify_quadric_decimation(target_number_of_triangles=int(target_triangles))
    except RuntimeError:
        return mesh, {"before": n, "after": n, "skipped": "decimate_failed"}
    return out, {"before": n, "after": triangle_count(out), "skipped": None}


def build_dollhouse(
    mesh: Any, *, target_triangles: int = 250_000, remove_ceiling: bool = False
) -> tuple[Any, dict[str, Any]]:
    """Detect planes, cut the ceiling, snap walls, decimate. Always returns a
    mesh; each stage nests its own stats and skips rather than raising."""
    import numpy as np

    detect = detect_horizontal_planes(mesh)
    cut_mesh, cut_stats = cut_ceiling(mesh, detect.get("ceiling_y"), remove=remove_ceiling)
    snapped, snap_stats = snap_walls_to_manhattan(cut_mesh)
    done, dec_stats = decimate(snapped, target_triangles=target_triangles)

    verts = np.asarray(done.vertices)
    if verts.size == 0:
        extent, diag = [0.0, 0.0, 0.0], 0.0
    else:
        span = verts.max(axis=0) - verts.min(axis=0)
        extent = [float(v) for v in span]
        diag = float(np.linalg.norm(span))

    return done, {
        "has_vertex_colors": bool(np.asarray(done.vertex_colors).shape[0] == verts.shape[0] and verts.shape[0] > 0),
        "detect_horizontal_planes": detect,
        "cut_ceiling": cut_stats,
        "snap_walls_to_manhattan": snap_stats,
        "decimate": dec_stats,
        "extent": extent,
        "extent_diagonal": diag,
    }
