"""REG-1 — 4-DOF scan-to-scan mesh registration (yaw about +Y plus translation).

Both scans are gravity-aligned, so a tilt is always wrong by construction and
every stage projects back to a pure yaw. A confidently-wrong transform silently
moves a client's pins to the wrong wall and nobody finds out for months, so
refusing is a first-class outcome: low overlap or a close rotational runner-up
returns identity with a verdict, never a guess.

Open3D (MIT) + numpy (BSD) only. Open3D is imported inside functions so the
pure-maths half stays testable where it is not installed.

Correction applied to the drafted version: `project_to_yaw` read the yaw from
column 0 as `arctan2(x_axis[2], x_axis[0])`. Column 0 of the yaw matrix is
(cos, 0, -sin), so that expression returns NEGATIVE yaw and every registration
would have rotated the wrong way — the exact failure mode this module exists to
prevent. Read from row 0 instead, where the terms are (cos, 0, +sin).
"""

from __future__ import annotations

from typing import Any

# A runner-up within this angle of the winner is the same solution, not a rival.
_YAW_AMBIG_DEG = 20.0
# Occupancy cell for the coarse score. Coarse on purpose: this stage decides
# roughly which way the building points, not where a wall is.
_VOXEL = 0.15
# Below this, a cloud is not a room and cannot be honestly registered.
MIN_REGISTRATION_POINTS = 100


def _as_pts(arr: Any) -> Any:
    import numpy as np

    pts = np.asarray(arr, dtype=float)
    if pts.ndim == 1:
        pts = pts.reshape(1, -1)
    if pts.size == 0 or pts.shape[1] < 3:
        return np.zeros((0, 3), dtype=float)
    return pts[:, :3]


def _rot_y(pts: Any, yaw_rad: float) -> Any:
    import numpy as np

    c, s = float(np.cos(yaw_rad)), float(np.sin(yaw_rad))
    x, y, z = pts[:, 0], pts[:, 1], pts[:, 2]
    return np.column_stack((c * x + s * z, y, -s * x + c * z))


def _yaw_matrix(yaw_rad: float) -> Any:
    import numpy as np

    c, s = float(np.cos(yaw_rad)), float(np.sin(yaw_rad))
    r = np.eye(4)
    r[0, 0], r[0, 2] = c, s
    r[2, 0], r[2, 2] = -s, c
    return r


def project_to_yaw(transform: Any) -> Any:
    """Replace a 4x4's rotation with the nearest pure +Y yaw, so ICP cannot
    invent a tilt that gravity says is impossible.

    Rebuilt from cos/sin rather than re-normalised, so the result is exactly
    orthonormal with det +1. Non-finite input returns identity rather than
    propagating a NaN into every pin position downstream.
    """
    import numpy as np

    t = np.asarray(transform, dtype=float).reshape(4, 4)
    if not np.isfinite(t).all():
        return np.eye(4)
    # Row 0 is (cos, 0, sin) — reading column 0 gives (cos, 0, -sin) and
    # silently negates the yaw.
    yaw = float(np.arctan2(t[0, 2], t[0, 0]))
    out = _yaw_matrix(yaw)
    out[:3, 3] = t[:3, 3]
    return out


def _voxel_keys(pts: Any, vox: float) -> set[tuple[int, int, int]]:
    import numpy as np

    if pts.shape[0] == 0:
        return set()
    return set(map(tuple, np.floor(pts / vox).astype(np.int64).tolist()))


def estimate_yaw_translation(
    source_pts: Any, target_pts: Any, *, yaw_step_deg: float = 2.0
) -> dict[str, Any]:
    """Coarse 4-DOF search: brute-force yaw about Y, then centroid translation.

    Scored by voxel-occupancy IoU rather than a pairwise distance matrix: it is
    O(N) instead of O(N^2), and a dense cluster cannot dominate the score the
    way nearest-neighbour sums let it.

    `runner_up_score` is the best score at least 20 degrees away from the
    winner, computed honestly so the caller can detect a corridor that aligns
    to itself. Degenerate or non-overlapping input skips rather than inventing
    a yaw.
    """
    import numpy as np

    src, tgt = _as_pts(source_pts), _as_pts(target_pts)
    empty = {
        "yaw_deg": 0.0,
        "translation": [0.0, 0.0, 0.0],
        "score": 0.0,
        "runner_up_score": 0.0,
        "skipped": "degenerate_points",
    }
    if src.shape[0] < 2 or tgt.shape[0] < 2:
        return empty
    # A handful of points always "aligns": centroid translation absorbs any
    # offset, so two 2-point clouds 50 m apart score a perfect 1.0 while being
    # nowhere near each other, and the runner-up check does not catch it
    # either. Neither the score nor ICP fitness can distinguish that case, so
    # the only honest defence is refusing to register a building from a
    # handful of points.
    if src.shape[0] < MIN_REGISTRATION_POINTS or tgt.shape[0] < MIN_REGISTRATION_POINTS:
        return {**empty, "skipped": "too_few_points"}

    src_c, tgt_c = src.mean(axis=0), tgt.mean(axis=0)
    src0, tgt0 = src - src_c, tgt - tgt_c
    tgt_keys = _voxel_keys(tgt0, _VOXEL)
    if not tgt_keys:
        return {**empty, "skipped": "empty_voxels"}

    step = max(float(yaw_step_deg), 0.5)
    best_score, best_yaw, best_trans = -1.0, 0.0, np.zeros(3)
    scored: list[tuple[float, float]] = []

    yaw = 0.0
    while yaw < 360.0 - 1e-9:
        rad = np.deg2rad(yaw)
        keys = _voxel_keys(_rot_y(src0, rad), _VOXEL)
        score = 0.0
        if keys:
            union = len(keys | tgt_keys)
            score = len(keys & tgt_keys) / union if union else 0.0
        scored.append((score, yaw))
        if score > best_score:
            best_score = score
            best_yaw = yaw
            best_trans = tgt_c - _rot_y(src_c.reshape(1, 3), rad)[0]
        yaw += step

    runner = 0.0
    for score, ydeg in scored:
        d = abs(ydeg - best_yaw) % 360.0
        if min(d, 360.0 - d) >= _YAW_AMBIG_DEG:
            runner = max(runner, score)

    if best_score <= 0.0:
        return {**empty, "skipped": "no_overlap"}
    return {
        "yaw_deg": float(best_yaw),
        "translation": [float(v) for v in best_trans],
        "score": float(best_score),
        "runner_up_score": float(runner),
        "skipped": None,
    }


def _coarse_matrix(est: dict[str, Any]) -> Any:
    import numpy as np

    t = _yaw_matrix(float(np.deg2rad(est["yaw_deg"])))
    t[0, 3], t[1, 3], t[2, 3] = est["translation"]
    return t


def refine_icp(
    source_mesh: Any,
    target_mesh: Any,
    initial_transform: Any,
    *,
    max_distance: float = 0.10,
) -> dict[str, Any]:
    """Multi-scale point-to-plane ICP (0.10 -> 0.05 -> 0.02 m), each stage
    seeding the next and each result projected back to 4 DOF.

    Empty meshes or a failed ICP return identity plus a `skipped` reason rather
    than raising — this runs unattended.
    """
    import numpy as np
    import open3d as o3d

    skipped = {
        "transform": np.eye(4).tolist(),
        "fitness": 0.0,
        "inlier_rmse": 1.0,
        "correspondences": 0,
        "skipped": "icp_skipped",
    }
    try:
        src_raw = np.asarray(source_mesh.vertices)
        tgt_raw = np.asarray(target_mesh.vertices)
    except (AttributeError, RuntimeError):
        return skipped
    if src_raw.shape[0] < 3 or tgt_raw.shape[0] < 3:
        return {**skipped, "skipped": "too_few_vertices"}

    cur = project_to_yaw(np.asarray(initial_transform, dtype=float))
    fitness, rmse, corr = 0.0, 1.0, 0

    for vox in (0.10, 0.05, 0.02):
        src, tgt = o3d.geometry.PointCloud(), o3d.geometry.PointCloud()
        src.points = o3d.utility.Vector3dVector(src_raw)
        tgt.points = o3d.utility.Vector3dVector(tgt_raw)
        src = src.voxel_down_sample(vox)
        tgt = tgt.voxel_down_sample(vox)
        if len(src.points) < 3 or len(tgt.points) < 3:
            continue
        src.estimate_normals()
        tgt.estimate_normals()
        try:
            reg = o3d.pipelines.registration.registration_icp(
                src, tgt, max_distance, cur,
                o3d.pipelines.registration.TransformationEstimationPointToPlane(),
                o3d.pipelines.registration.ICPConvergenceCriteria(max_iteration=40),
            )
        except RuntimeError:
            continue
        cur = project_to_yaw(np.asarray(reg.transformation, dtype=float))
        fitness = float(reg.fitness)
        rmse = float(reg.inlier_rmse) if reg.inlier_rmse else 1.0
        corr = int(len(reg.correspondence_set))

    return {
        "transform": cur.tolist(),
        "fitness": fitness,
        "inlier_rmse": rmse,
        "correspondences": corr,
        "skipped": None if corr else "icp_no_correspondences",
    }


def registration_confidence(
    fitness: float, inlier_rmse: float, score: float, runner_up_score: float
) -> dict[str, Any]:
    """Turn raw numbers into a decision.

    A close rotational runner-up forces "ambiguous" even when fitness and RMSE
    are excellent — that is the corridor aligning to itself one doorway off,
    and it is the whole reason this function exists.
    """
    if fitness < 0.30:
        return {"confidence": 0.0, "verdict": "failed", "reasons": ["low_fitness"]}

    reasons: list[str] = []
    if runner_up_score > 0.9 * max(score, 1e-9):
        reasons.append("rotational_ambiguity")
    if inlier_rmse > 0.08:
        reasons.append("high_rmse")

    if not reasons and fitness >= 0.5 and inlier_rmse <= 0.05:
        return {"confidence": float(min(1.0, 0.5 + 0.5 * fitness)), "verdict": "aligned", "reasons": []}
    if not reasons:
        reasons.append("below_align_thresholds")
    return {"confidence": 0.35 if len(reasons) else 0.2, "verdict": "ambiguous", "reasons": reasons}


def transform_point(point: Any, transform: Any) -> tuple[float, float, float]:
    """Move one pin through the registered 4x4.

    This is the function that actually relocates a client's pin between scans.
    Non-finite input returns the point unchanged rather than emitting NaN — a
    pin that did not move is recoverable, a NaN pin is not.
    """
    import numpy as np

    p = np.asarray(point, dtype=float).reshape(-1)
    if p.size < 3:
        return (0.0, 0.0, 0.0)
    p = p[:3]
    t = np.asarray(transform, dtype=float).reshape(4, 4)
    if not np.isfinite(p).all() or not np.isfinite(t).all():
        return (float(p[0]), float(p[1]), float(p[2]))
    h = t @ np.array([p[0], p[1], p[2], 1.0])
    return (float(h[0]), float(h[1]), float(h[2]))


def register_meshes(
    source_mesh: Any, target_mesh: Any, *, voxel_size: float = 0.05
) -> tuple[Any, dict[str, Any]]:
    """Coarse yaw search then ICP refinement.

    Always returns a 4x4 mapping source into target's frame — identity on a
    failed verdict — so callers never handle None. The verdict, not the
    transform, is what they must check before moving anything.
    """
    import numpy as np

    identity = np.eye(4)
    try:
        src = _as_pts(np.asarray(source_mesh.vertices))
        tgt = _as_pts(np.asarray(target_mesh.vertices))
    except (AttributeError, RuntimeError):
        conf = registration_confidence(0.0, 1.0, 0.0, 0.0)
        return identity, {
            "estimate_yaw_translation": {"skipped": "no_vertices"},
            "refine_icp": {"skipped": "no_vertices"},
            "registration_confidence": conf,
            "verdict": "failed",
            "confidence": 0.0,
        }

    # Cap the coarse search at ~4k points per cloud: the yaw sweep runs 180
    # times, and this stage only needs the building's rough shape.
    if src.shape[0] > 4000:
        src = src[:: max(int(src.shape[0] / 4000), 1)]
    if tgt.shape[0] > 4000:
        tgt = tgt[:: max(int(tgt.shape[0] / 4000), 1)]
    _ = voxel_size  # ICP owns its own scale ladder; kept for API compatibility.

    est = estimate_yaw_translation(src, tgt)
    init = _coarse_matrix(est) if est.get("skipped") is None else identity
    icp = refine_icp(source_mesh, target_mesh, init)
    conf = registration_confidence(
        float(icp["fitness"]),
        float(icp["inlier_rmse"]),
        float(est["score"]),
        float(est["runner_up_score"]),
    )
    xf = identity if conf["verdict"] == "failed" else project_to_yaw(
        np.asarray(icp["transform"], dtype=float)
    )
    return xf, {
        "estimate_yaw_translation": est,
        "refine_icp": icp,
        "registration_confidence": conf,
        "verdict": conf["verdict"],
        "confidence": conf["confidence"],
    }
