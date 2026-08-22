"""M8 — split a long capture into contiguous, overlapping reconstruction zones.

Three constraints make this harder than chunking a list:

1. A zone must be a CONTIGUOUS run of frames. Reconstruction depends on the
   sequential relationship between neighbouring frames, so gathering frames by
   proximity across the whole walk would destroy the thing being reconstructed.
2. Adjacent zones must physically overlap or the stitch has nothing to register
   against.
3. Operators revisit. A walk commonly passes the same lobby three times; two
   non-adjacent zones sharing space is a loop-closure opportunity to report,
   not a bug to suppress.

Frames are never dropped to satisfy a limit — an oversized list becomes one
zone plus a warning. A dropped frame is a hole in the client's building.

numpy (BSD) only, imported inside functions. Returns are plain JSON-serialisable
types because they cross a network boundary to a job dispatcher.

Correction applied to the drafted version: `split_into_runs` computed a local
`prev` through two layers of nested conditionals and then never used it — the
value actually stored was a different expression on the append. Dead code in
the one function whose off-by-one would silently drop frames.
"""

from __future__ import annotations

from typing import Any

# Measured cost model: ~15 min fixed overhead plus ~3.5 s per view.
SECONDS_PER_VIEW = 3.5
FIXED_OVERHEAD_SECONDS = 900.0
# The hard per-job ceiling this module exists to keep zones under.
MAX_DURATION_SECONDS = 7200.0
# A zone whose bounds are smaller than this did not move enough to reconstruct
# — the collapse mode that produced a 3.23 m model of a 13.71 m room.
TINY_DIAGONAL_M = 2.0


def _as_positions(poses: Any) -> list[list[float]]:
    """Accept either bare [x,y,z] triples or dicts with a position/pos key."""
    out: list[list[float]] = []
    for item in poses or []:
        p = item.get("position") or item.get("pos") if isinstance(item, dict) else item
        if p is None or len(p) < 3:
            continue
        out.append([float(p[0]), float(p[1]), float(p[2])])
    return out


def path_length(positions: Any) -> float:
    """Arc length along an ordered walk. Fewer than 2 positions returns 0.0."""
    import numpy as np

    pts = np.asarray(positions, dtype=float) if positions is not None else np.zeros((0, 3))
    if pts.ndim != 2 or pts.shape[0] < 2:
        return 0.0
    delta = np.diff(pts[:, :3], axis=0)
    return float(np.sqrt((delta * delta).sum(axis=1)).sum())


def split_into_runs(
    poses: Any, max_frames: int, *, overlap_frames: int = 60
) -> list[dict[str, Any]]:
    """Contiguous windows of at most `max_frames` sharing `overlap_frames`.

    Overlap is clamped to `max_frames // 3`: needing more than that means the
    caller wants fewer, larger zones, not more redundancy. A list that already
    fits, or a nonsensical `max_frames`, becomes a single covering run. Every
    frame appears in at least one run — that invariant is the point.
    """
    n = len(list(poses) if poses is not None else [])
    if n == 0:
        return [{"index": 0, "start": 0, "end": 0, "frame_count": 0, "overlap_prev": 0}]

    cap = int(max_frames)
    if cap <= 0 or n <= cap:
        return [{"index": 0, "start": 0, "end": n, "frame_count": n, "overlap_prev": 0}]

    overlap = max(0, min(int(overlap_frames), cap // 3))
    step = max(cap - overlap, 1)

    runs: list[dict[str, Any]] = []
    start, idx = 0, 0
    while start < n:
        end = min(start + cap, n)
        shared = 0 if idx == 0 else max(0, runs[-1]["end"] - start)
        runs.append({
            "index": idx,
            "start": int(start),
            "end": int(end),
            "frame_count": int(end - start),
            "overlap_prev": int(min(overlap, shared)),
        })
        if end == n:
            break
        start += step
        idx += 1
    return runs


def zone_bounds(positions: Any) -> dict[str, Any]:
    """Axis-aligned box of a zone. Empty input returns zeros with diagonal 0.0
    rather than raising."""
    import numpy as np

    pts = np.asarray(positions, dtype=float) if positions is not None else np.zeros((0, 3))
    if pts.ndim != 2 or pts.shape[0] == 0 or pts.shape[1] < 3:
        return {"min": [0.0, 0.0, 0.0], "max": [0.0, 0.0, 0.0],
                "centre": [0.0, 0.0, 0.0], "diagonal": 0.0}
    lo, hi = pts[:, :3].min(axis=0), pts[:, :3].max(axis=0)
    return {
        "min": [float(v) for v in lo],
        "max": [float(v) for v in hi],
        "centre": [float(v) for v in (lo + hi) / 2.0],
        "diagonal": float(np.linalg.norm(hi - lo)),
    }


def spatial_overlap(bounds_a: dict[str, Any], bounds_b: dict[str, Any]) -> float:
    """Intersection-over-union of two axis-aligned boxes, in [0, 1].

    This is the measure of whether two zones can actually be stitched — shared
    space, not shared frame count. Two degenerate (zero-volume) boxes return
    0.0: a point has no space to share, and calling that a perfect stitch would
    let a stationary capture look well-seamed.
    """
    amin, amax = bounds_a.get("min", [0, 0, 0]), bounds_a.get("max", [0, 0, 0])
    bmin, bmax = bounds_b.get("min", [0, 0, 0]), bounds_b.get("max", [0, 0, 0])
    inter = va = vb = 1.0
    for i in range(3):
        lo = max(float(amin[i]), float(bmin[i]))
        hi = min(float(amax[i]), float(bmax[i]))
        inter *= max(0.0, hi - lo)
        va *= max(0.0, float(amax[i]) - float(amin[i]))
        vb *= max(0.0, float(bmax[i]) - float(bmin[i]))
    denom = va + vb - inter
    return float(inter / denom) if denom > 0.0 else 0.0


def find_revisits(
    zones: list[dict[str, Any]], *, min_overlap: float = 0.15
) -> list[dict[str, Any]]:
    """Non-adjacent zone pairs sharing space — extra loop-closure constraints.

    Adjacent pairs are excluded because their overlap is engineered by
    `split_into_runs` and says nothing the stitcher does not already know.
    """
    hits: list[dict[str, Any]] = []
    for i, a in enumerate(zones):
        for j in range(i + 2, len(zones)):
            ov = spatial_overlap(a["bounds"], zones[j]["bounds"])
            if ov >= min_overlap:
                hits.append({"a": int(a["index"]), "b": int(zones[j]["index"]), "overlap": float(ov)})
    return hits


def plan_zones(
    poses: Any,
    *,
    max_frames: int = 1500,
    overlap_frames: int = 60,
    min_overlap: float = 0.15,
) -> dict[str, Any]:
    """The dispatch payload: contiguous overlapping zones plus revisit edges.

    Warns rather than silently truncating — over the job ceiling, a zone too
    small to reconstruct, or a seam whose frame overlap did not translate into
    shared space because the operator moved fast through it.
    """
    poses_list = list(poses) if poses is not None else []
    positions = _as_positions(poses_list)
    warnings: list[str] = []
    n = len(poses_list)

    if n < 2:
        warnings.append("fewer_than_two_poses")
        return {
            "zones": [{
                "index": 0, "start": 0, "end": n, "frame_count": n, "overlap_prev": 0,
                "bounds": zone_bounds(positions),
                "path_length": path_length(positions),
                "estimated_seconds": float(FIXED_OVERHEAD_SECONDS + SECONDS_PER_VIEW * n),
            }],
            "revisits": [],
            "total_frames": int(n),
            "zone_count": 1,
            "warnings": warnings,
        }

    zones: list[dict[str, Any]] = []
    for run in split_into_runs(poses_list, max_frames, overlap_frames=overlap_frames):
        pts = positions[run["start"] : run["end"]]
        bounds = zone_bounds(pts)
        est = float(FIXED_OVERHEAD_SECONDS + SECONDS_PER_VIEW * run["frame_count"])
        if est > MAX_DURATION_SECONDS:
            warnings.append(f"zone_{run['index']}_exceeds_max_duration")
        if bounds["diagonal"] < TINY_DIAGONAL_M:
            warnings.append(f"zone_{run['index']}_tiny_diagonal")
        zones.append({**run, "bounds": bounds, "path_length": path_length(pts),
                      "estimated_seconds": est})

    for i in range(1, len(zones)):
        if spatial_overlap(zones[i - 1]["bounds"], zones[i]["bounds"]) < min_overlap:
            warnings.append(f"weak_seam_between_{i - 1}_{i}")

    return {
        "zones": zones,
        "revisits": find_revisits(zones, min_overlap=min_overlap),
        "total_frames": int(n),
        "zone_count": int(len(zones)),
        "warnings": warnings,
    }
