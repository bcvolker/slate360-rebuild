"""M3 — the interior mesh track, wired end to end.

This runs BEFORE and INDEPENDENT OF splat training, and that is the point. The
TSDF mesh is CPU-only and finishes in minutes; the photoreal layer takes hours.
Splitting them means the measurable deliverable — dollhouse, floor plan, area
take-off — is sellable on the day of the scan, and it survives a splat training
run that fails or is cancelled.

The track is non-fatal by construction. Every failure returns stats explaining
itself and lets the job continue to the appearance layer; a missing mesh must
never fail a job that would otherwise have produced a good splat.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

# A mesh that spans less than this fraction of the reference LiDAR cloud did not
# see the room. Same constant and same reasoning as the splat-side COVERAGE-1
# gate: a TSDF that only integrated part of the walk must fail too.
COVERAGE_MIN_EXTENT_RATIO = 0.45

# Mobile GPU budget for the dollhouse, not an aesthetic choice.
DOLLHOUSE_TARGET_TRIANGLES = 250_000


def _mesh_extent(mesh) -> tuple[list[float], float]:
    """Axis-aligned extent and diagonal of a mesh. Empty mesh returns zeros."""
    import numpy as np

    verts = np.asarray(mesh.vertices)
    if verts.size == 0:
        return [0.0, 0.0, 0.0], 0.0
    span = verts.max(axis=0) - verts.min(axis=0)
    return [float(v) for v in span], float(np.linalg.norm(span))


def evaluate_mesh_coverage(
    mesh_diag: float | None, reference_diag: float | None
) -> dict[str, Any]:
    """COVERAGE-1 for the mesh track.

    Skips honestly when there is no reference rather than inventing a pass — a
    capture with no LiDAR PLY has nothing independent to check against, and
    claiming a pass would be worse than admitting the gap.
    """
    if not mesh_diag or not reference_diag or reference_diag <= 0:
        return {"gate": "coverage_unavailable", "ratio": None}
    ratio = float(mesh_diag) / float(reference_diag)
    return {
        "gate": "pass" if ratio >= COVERAGE_MIN_EXTENT_RATIO else "fail",
        "ratio": round(ratio, 4),
        "meshDiagonal": round(float(mesh_diag), 3),
        "referenceDiagonal": round(float(reference_diag), 3),
        "minRatio": COVERAGE_MIN_EXTENT_RATIO,
    }


def _write_mesh(mesh, out_dir: Path, stem: str) -> dict[str, str]:
    """Write PLY (always) and GLB (best effort).

    PLY is the guaranteed artefact because every downstream tool reads it; GLB
    is what the viewer wants but its writer is the more fragile of the two, so
    a GLB failure must not cost us the mesh.
    """
    import open3d as o3d

    written: dict[str, str] = {}
    ply_path = out_dir / f"{stem}.ply"
    if o3d.io.write_triangle_mesh(str(ply_path), mesh):
        written["ply"] = str(ply_path)
    try:
        mesh.compute_vertex_normals()
        glb_path = out_dir / f"{stem}.glb"
        if o3d.io.write_triangle_mesh(str(glb_path), mesh):
            written["glb"] = str(glb_path)
    except Exception as exc:  # noqa: BLE001
        written["glbError"] = f"{type(exc).__name__}: {exc}"
    return written


def run_interior_track(
    depth_path: str | Path,
    poses_path: str | Path,
    out_dir: str | Path,
    *,
    reference_diagonal: float | None = None,
    target_triangles: int = DOLLHOUSE_TARGET_TRIANGLES,
) -> dict[str, Any]:
    """Build the interior mesh and its dollhouse from posed ARKit depth.

    Returns a stats dict — always. `stats["skipped"]` is set and no files are
    written when the inputs are unusable; the caller checks `stats["gate"]`
    before publishing anything measurable to a client.

    Order matters: the raw TSDF mesh is measured for coverage BEFORE the
    dollhouse cut, because cutting the ceiling legitimately shrinks the extent
    and would otherwise be indistinguishable from a collapse.
    """
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    stats: dict[str, Any] = {"enabled": True, "skipped": None}

    depth = Path(depth_path)
    poses = Path(poses_path)
    if not depth.is_file() or not poses.is_file():
        stats["skipped"] = "missing_depth_or_poses"
        return stats

    try:
        import interior_mesh as im
    except Exception as exc:  # noqa: BLE001
        stats["skipped"] = f"import_failed: {type(exc).__name__}: {exc}"
        return stats

    # --- 1. TSDF fusion -----------------------------------------------------
    raw_path = out / "interior_raw.ply"
    try:
        fuse_stats = im.build_tsdf_mesh(depth, poses, raw_path)
    except Exception as exc:  # noqa: BLE001
        stats["skipped"] = f"tsdf_failed: {type(exc).__name__}: {exc}"
        return stats
    stats["tsdf"] = fuse_stats

    if not raw_path.is_file():
        stats["skipped"] = "tsdf_produced_no_mesh"
        return stats

    import open3d as o3d

    mesh = o3d.io.read_triangle_mesh(str(raw_path))
    import numpy as np

    if np.asarray(mesh.triangles).size == 0:
        stats["skipped"] = "tsdf_mesh_empty"
        return stats

    # --- 2. Coverage, measured on the fused mesh BEFORE the dollhouse cut ---
    # build_tsdf_mesh already dropped stray components, so no second pass here.
    extent, diagonal = _mesh_extent(mesh)
    stats["extent"] = extent
    stats["extentDiagonal"] = round(diagonal, 3)
    coverage = evaluate_mesh_coverage(diagonal, reference_diagonal)
    stats["coverage"] = coverage
    stats["gate"] = coverage["gate"]

    # --- 3. Dollhouse -------------------------------------------------------
    # Built even when coverage fails: an operator inspecting a failed job still
    # needs to see what the scan DID capture in order to plan the re-scan.
    try:
        import mesh_dollhouse as md

        dollhouse, dh_stats = md.build_dollhouse(mesh, target_triangles=target_triangles)
        stats["dollhouse"] = dh_stats
    except Exception as exc:  # noqa: BLE001
        stats["dollhouse"] = {"skipped": f"{type(exc).__name__}: {exc}"}
        dollhouse = mesh

    # --- 4. Floor plan + area take-off (M5) --------------------------------
    # Runs on the DOLLHOUSE, whose ceiling is already gone, and uses the floor
    # and ceiling planes M4 measured rather than re-detecting them.
    detect = (stats.get("dollhouse") or {}).get("detect_horizontal_planes") or {}
    floor_y, ceiling_y = detect.get("floor_y"), detect.get("ceiling_y")
    if floor_y is None or ceiling_y is None:
        stats["floorplan"] = {"skipped": "no_floor_ceiling_pair"}
    else:
        try:
            import mesh_floorplan as mf

            stats["floorplan"] = mf.build_floorplan(dollhouse, float(floor_y), float(ceiling_y))
        except Exception as exc:  # noqa: BLE001
            stats["floorplan"] = {"skipped": f"{type(exc).__name__}: {exc}"}

    # --- 5. Artefacts -------------------------------------------------------
    stats["files"] = {
        "raw": _write_mesh(mesh, out, "interior_mesh"),
        "dollhouse": _write_mesh(dollhouse, out, "interior_dollhouse"),
    }
    return stats


def summarize_for_callback(stats: dict[str, Any]) -> dict[str, Any]:
    """The compact form that rides the job callback into the DB.

    Deliberately small: full stage stats stay in the worker log, and only what
    a client surface or an operator triage screen actually reads goes over the
    wire.
    """
    if not stats or stats.get("skipped"):
        return {"available": False, "reason": (stats or {}).get("skipped") or "not_run"}
    dh = stats.get("dollhouse") or {}
    detect = dh.get("detect_horizontal_planes") or {}
    return {
        "available": True,
        "gate": stats.get("gate"),
        "coverageRatio": (stats.get("coverage") or {}).get("ratio"),
        "extent": stats.get("extent"),
        "extentDiagonal": stats.get("extentDiagonal"),
        "pairsIntegrated": (stats.get("tsdf") or {}).get("pairsIntegrated"),
        "ceilingCut": detect.get("ceiling_y") is not None,
        "floorY": detect.get("floor_y"),
        "ceilingY": detect.get("ceiling_y"),
        "triangles": (dh.get("decimate") or {}).get("after"),
        "floorArea": (stats.get("floorplan") or {}).get("floor_area"),
        "floorAreaSource": (stats.get("floorplan") or {}).get("floor_area_source"),
        "perimeter": (stats.get("floorplan") or {}).get("perimeter"),
        "netWallArea": (
            ((stats.get("floorplan") or {}).get("wall_area_takeoff") or {}).get("totals") or {}
        ).get("net_area"),
        "unverifiedOpeningArea": (
            ((stats.get("floorplan") or {}).get("wall_area_takeoff") or {}).get("totals") or {}
        ).get("unverified_opening_area"),
    }
