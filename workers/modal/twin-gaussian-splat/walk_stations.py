"""M6b data — derive Matterport-style walk stations and floors from ARKit poses.

The viewer's navigation moves between STATIONS, never to arbitrary points,
because photoreal imagery only exists where the operator physically stood. This
module turns a continuous pose trajectory into that discrete set.

Computed server-side and shipped as a sidecar the viewer consumes, so the phone
never parses a 6,000-frame pose file to decide where you can stand.

Emits exactly the shape `lib/digital-twin/walkthrough-navigation.ts` declares:
  station = {id, position: [x,y,z], floorIndex, headingY?}
  floor   = {index, label, elevationY}

numpy (BSD) only, imported inside functions.
"""

from __future__ import annotations

from typing import Any

# Stations closer together than this are redundant — the viewer would show a
# thicket of dots a thumb cannot hit. Roughly Matterport's own spacing.
MIN_STATION_SPACING_M = 1.5
# A station must be this far from a wall to be stand-able. Not enforced here
# (needs the mesh); recorded so the viewer-side check has one source of truth.
MIN_WALL_CLEARANCE_M = 0.35
# Two floors closer than this are the same floor seen with noise.
MIN_FLOOR_SEPARATION_M = 1.8
# Camera height above the floor while walking, used to infer floor elevation
# from the trajectory when RANSAC planes are unavailable.
ASSUMED_CAMERA_HEIGHT_M = 1.5


def _load_frames(poses_path: str | Any) -> list[dict[str, Any]]:
    import json
    from pathlib import Path

    with Path(poses_path).open(encoding="utf-8") as f:
        data = json.load(f)
    out: list[dict[str, Any]] = []
    for frame in data.get("frames", []):
        t = frame.get("transform_4x4")
        if not isinstance(t, list) or len(t) != 16:
            continue
        out.append(frame)
    return out


def pose_position_and_heading(transform_4x4: list[float]) -> tuple[list[float], float]:
    """World position and yaw from an ARKit camera-to-world transform.

    ARKit cameras look down their own -Z, so the viewing direction is the
    negated third basis vector. Yaw is that direction projected onto the ground
    plane; a camera pointed straight down has no meaningful heading and returns
    0.0 rather than a value amplified out of numerical noise.
    """
    import numpy as np

    m = np.array(transform_4x4, dtype=float).reshape(4, 4, order="F")
    position = [float(v) for v in m[:3, 3]]
    forward = -m[:3, 2]
    if float(np.hypot(forward[0], forward[2])) < 1e-6:
        return position, 0.0
    # Must match the viewer exactly. The hook sets rotation (pitch, yaw, 0) in
    # YXZ, and a Y-rotation by yaw sends the camera's -Z to
    # (-sin yaw, 0, -cos yaw). Recovering yaw therefore negates BOTH components;
    # negating only Z yields -yaw and faces every station backwards.
    return position, float(np.arctan2(-forward[0], -forward[2]))


def cluster_floors(
    elevations: Any, *, min_separation: float = MIN_FLOOR_SEPARATION_M
) -> list[float]:
    """Greedy 1-D clustering of floor elevations, returned low to high.

    Deliberately greedy rather than k-means: the number of storeys is unknown,
    and a separation threshold expresses the real constraint (you cannot have
    two floors 1 m apart) far better than a guessed k.
    """
    import numpy as np

    vals = np.asarray(elevations, dtype=float).reshape(-1)
    vals = vals[np.isfinite(vals)]
    if vals.size == 0:
        return []
    vals = np.sort(vals)

    groups: list[list[float]] = [[float(vals[0])]]
    for v in vals[1:]:
        if float(v) - groups[-1][-1] > min_separation:
            groups.append([float(v)])
        else:
            groups[-1].append(float(v))
    # Median, not mean: a stairwell traversal contributes a smear of
    # intermediate heights that would drag a mean off the real floor.
    return [float(np.median(g)) for g in groups]


def assign_floor(elevation: float, floors: list[float]) -> int:
    """Index of the nearest floor plane. Empty floor list returns 0 so a
    single-storey capture needs no floor metadata at all."""
    if not floors:
        return 0
    return min(range(len(floors)), key=lambda i: abs(floors[i] - elevation))


def floor_label(index: int, total: int) -> str:
    """Human label. Single-storey captures say 'Ground' and the viewer hides
    the selector entirely."""
    if total <= 1:
        return "Ground"
    return "Ground" if index == 0 else f"Level {index + 1}"


def build_walk_stations(
    poses_path: str | Any,
    *,
    floor_elevations: list[float] | None = None,
    min_spacing: float = MIN_STATION_SPACING_M,
) -> dict[str, Any]:
    """Turn a pose trajectory into stations plus floors.

    Walks the trajectory IN CAPTURE ORDER and keeps a frame whenever it is at
    least `min_spacing` from the last kept one. Order matters: sampling by
    proximity instead would scatter stations wherever the operator paused, and
    pausing is exactly what a good capture does at corners.

    Frames tagged `photo` are always kept regardless of spacing — the operator
    chose to shoot there, so imagery exists and a station must too.

    Returns `{"stations": [...], "floors": [...], "skipped": str | None}`, never
    raising: a capture with no usable poses yields empty lists and a reason.
    """
    import numpy as np

    try:
        frames = _load_frames(poses_path)
    except Exception as exc:  # noqa: BLE001
        return {"stations": [], "floors": [], "skipped": f"{type(exc).__name__}: {exc}"}
    if not frames:
        return {"stations": [], "floors": [], "skipped": "no_pose_frames"}

    kept: list[dict[str, Any]] = []
    last: Any = None
    for i, frame in enumerate(frames):
        position, heading = pose_position_and_heading(frame["transform_4x4"])
        p = np.array(position, dtype=float)
        is_photo = bool(frame.get("photo"))
        if last is not None and not is_photo:
            # Horizontal spacing only: standing still and raising the camera is
            # not a new place to stand.
            if float(np.hypot(p[0] - last[0], p[2] - last[2])) < min_spacing:
                continue
        kept.append({
            "frameIndex": i,
            "position": position,
            "headingY": heading,
            "photo": is_photo,
            "clipIndex": int(frame.get("clip_index") or 0),
        })
        last = p

    if not kept:
        return {"stations": [], "floors": [], "skipped": "no_stations_after_spacing"}

    if floor_elevations:
        floors_y = sorted(float(v) for v in floor_elevations)
    else:
        # No RANSAC planes: infer floor level from camera height.
        floors_y = cluster_floors(
            [s["position"][1] - ASSUMED_CAMERA_HEIGHT_M for s in kept]
        )

    stations = []
    for n, s in enumerate(kept):
        idx = assign_floor(s["position"][1] - ASSUMED_CAMERA_HEIGHT_M, floors_y)
        stations.append({
            "id": f"st{n:04d}",
            "position": [round(v, 4) for v in s["position"]],
            "floorIndex": int(idx),
            "headingY": round(s["headingY"], 5),
            "isPhoto": s["photo"],
            "clipIndex": s["clipIndex"],
        })

    floors = [
        {"index": i, "label": floor_label(i, len(floors_y)), "elevationY": round(y, 4)}
        for i, y in enumerate(floors_y)
    ]
    return {
        "stations": stations,
        "floors": floors,
        "skipped": None,
        "sourceFrames": len(frames),
        "minSpacingM": min_spacing,
        "minWallClearanceM": MIN_WALL_CLEARANCE_M,
    }
