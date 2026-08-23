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
    reference_points: Any = None,
    target_triangles: int = DOLLHOUSE_TARGET_TRIANGLES,
    voxel_length: float | None = None,
    min_confidence: int | None = None,
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
        fuse_stats = im.build_tsdf_mesh(
            depth, poses, raw_path,
            voxel_length=voxel_length if voxel_length else im.VOXEL_LENGTH_M,
            min_confidence=min_confidence if min_confidence is not None else im.MIN_CONFIDENCE,
        )
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

    # --- 4a. Projective texturing (M7-A) -----------------------------------
    # The TSDF baked colour per VOXEL from depth-resolution images. Here we
    # resample the surface from the FULL-RESOLUTION frames with occlusion
    # testing, which is what turns blotchy voxel averages into real detail.
    try:
        import mesh_texture as mt

        frames: list[dict[str, Any]] = []
        pose_by_index = {i: f for i, f in enumerate(im.load_pose_frames(poses))}
        for rec in im.iter_depth_records(depth):
            pose = pose_by_index.get(rec["index"])
            if pose is None or not rec.get("rgb_jpeg"):
                continue
            frames.append({
                "jpeg": rec["rgb_jpeg"],
                "transform": pose["transform_4x4"],
                # Intrinsics are stored at RGB resolution, which is exactly the
                # resolution we are now sampling — no rescaling needed.
                "intrinsics": pose["intrinsics"],
            })
        if frames:
            dollhouse, tex_stats = mt.bake_vertex_colors(dollhouse, frames)
            stats["texture"] = tex_stats
        else:
            stats["texture"] = {"skipped": "no_posed_rgb_frames"}
    except Exception as exc:  # noqa: BLE001
        stats["texture"] = {"skipped": f"{type(exc).__name__}: {exc}"}

    # --- 4b. Accuracy evidence (ACC-1) -------------------------------------
    # Measured on the RAW fused mesh, not the dollhouse: the dollhouse has had
    # its ceiling removed, so every ceiling point in the reference cloud would
    # register as a huge residual against geometry we deliberately deleted.
    if reference_points is None:
        stats["accuracy"] = {"skipped": "no_reference_points"}
    else:
        try:
            import mesh_accuracy as ma

            stats["accuracy"] = ma.evaluate_accuracy(
                mesh, reference_points, stats.get("floorplan") or {}, floor_y, ceiling_y
            )
        except Exception as exc:  # noqa: BLE001
            stats["accuracy"] = {"skipped": f"{type(exc).__name__}: {exc}"}

    # --- 4c. Walk stations (M6b data) --------------------------------------
    # Computed here, not on the phone: the viewer must not parse a 6,000-frame
    # pose file to decide where a user is allowed to stand.
    try:
        import walk_stations as ws

        stats["walk"] = ws.build_walk_stations(
            poses, floor_elevations=[float(floor_y)] if floor_y is not None else None
        )
    except Exception as exc:  # noqa: BLE001
        stats["walk"] = {"skipped": f"{type(exc).__name__}: {exc}", "stations": [], "floors": []}

    # --- 4d. Viewer layer metadata -----------------------------------------
    # The ceiling is a render-time layer, not a processing-time deletion. The
    # viewer clips at cut_y for the dollhouse, shows everything for the closed
    # state, and ghosts above cut_y for the plenum/MEP state.
    dh = stats.get("dollhouse") or {}
    stats["layers"] = {
        "floorY": floor_y,
        "ceilingY": ceiling_y,
        "ceilingCutY": (dh.get("cut_ceiling") or {}).get("cut_y"),
        "storeyHeightM": (
            round(float(ceiling_y) - float(floor_y), 3)
            if floor_y is not None and ceiling_y is not None else None
        ),
        "ceilingStates": ["open", "closed", "plenum"],
        "defaultCeilingState": "open",
    }

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
        "colorIntegrated": (stats.get("tsdf") or {}).get("colorIntegrated"),
        "textureFramesUsed": (stats.get("texture") or {}).get("framesUsed"),
        "verticesColored": (stats.get("texture") or {}).get("verticesColored"),
        "verticesUncolored": (stats.get("texture") or {}).get("verticesUncolored"),
        "meanViewsPerVertex": (stats.get("texture") or {}).get("meanViewsPerVertex"),
        "textureSkipped": (stats.get("texture") or {}).get("skipped"),
        "rgbFramesAvailable": (stats.get("tsdf") or {}).get("rgbFramesAvailable"),
        "rgbFramesDecoded": (stats.get("tsdf") or {}).get("rgbFramesDecoded"),
        "ceilingCut": detect.get("ceiling_y") is not None,
        "floorY": detect.get("floor_y"),
        "ceilingY": detect.get("ceiling_y"),
        "ceilingCutY": ((stats.get("dollhouse") or {}).get("cut_ceiling") or {}).get("cut_y"),
        "ceilingRemoved": ((stats.get("dollhouse") or {}).get("cut_ceiling") or {}).get("removed"),
        "triangles": (dh.get("decimate") or {}).get("after"),
        "floorArea": (stats.get("floorplan") or {}).get("floor_area"),
        "floorAreaSource": (stats.get("floorplan") or {}).get("floor_area_source"),
        "accuracySummary": (stats.get("accuracy") or {}).get("summary"),
        "fusionMedianMm": ((stats.get("accuracy") or {}).get("fusion") or {}).get("medianMm"),
        "standardsVerdict": ((stats.get("accuracy") or {}).get("standards") or {}).get("verdict"),
        "stationCount": len((stats.get("walk") or {}).get("stations") or []),
        "floorCount": len((stats.get("walk") or {}).get("floors") or []),
        "perimeter": (stats.get("floorplan") or {}).get("perimeter"),
        "netWallArea": (
            ((stats.get("floorplan") or {}).get("wall_area_takeoff") or {}).get("totals") or {}
        ).get("net_area"),
        "unverifiedOpeningArea": (
            ((stats.get("floorplan") or {}).get("wall_area_takeoff") or {}).get("totals") or {}
        ).get("unverified_opening_area"),
    }
