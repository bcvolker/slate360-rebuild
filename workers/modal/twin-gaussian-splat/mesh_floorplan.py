"""M5 — floor plan and area take-off from a dollhouse mesh.

A hole in the mesh is not a doorway. A window the LiDAR saw straight through
leaves exactly the same absence as an open door, so an opening only counts
against a wall's net area when its void is bounded by solid geometry. Anything
unbounded is reported separately as unverified: a contractor bids off
`net_area`, and quietly subtracting a mirror under-bills them.

Open3D (MIT) + numpy (BSD) only, imported inside functions.

Corrections applied to the drafted version:
  1. `fit_wall_segments` computed an inlier count from a nested `_split_gaps`
     call, then overwrote it on the next line — dead work that also re-ran the
     whole gap split once per chunk (O(k^2) on a wall with many segments).
  2. That overwrite counted the two synthetic endpoint rows as inliers.
"""

from __future__ import annotations

from typing import Any

# Two collinear runs further apart than this are two walls with a doorway
# between them, not one wall. The single most important constant here.
_GAP_M = 0.35
_MIN_SEG_M = 0.30
# Occupancy cell on a wall plane, metres.
_CELL = 0.05


def slice_at_height(mesh: Any, height_y: float, *, thickness: float = 0.10) -> Any:
    """XZ vertices within a horizontal slab. Empty mesh or no hits returns a
    (0,2) array rather than raising."""
    import numpy as np

    try:
        verts = np.asarray(mesh.vertices, dtype=float)
    except (AttributeError, RuntimeError):
        return np.zeros((0, 2), dtype=float)
    if verts.size == 0:
        return np.zeros((0, 2), dtype=float)
    mask = np.abs(verts[:, 1] - height_y) <= thickness / 2.0
    if not np.any(mask):
        return np.zeros((0, 2), dtype=float)
    return np.column_stack((verts[mask, 0], verts[mask, 2]))


def _fit_one_line(pts: Any, distance_threshold: float, iters: int):
    """One RANSAC line. Seeded deterministically so a re-run of the same job
    produces the same plan — a take-off that moves between runs is unusable."""
    import numpy as np

    n = pts.shape[0]
    if n < 2:
        return None
    rng = np.random.default_rng(0)
    best_idx, best_n = None, 0
    for _ in range(iters):
        i, j = int(rng.integers(0, n)), int(rng.integers(0, n))
        if i == j:
            continue
        d = pts[j] - pts[i]
        ln = float(np.hypot(d[0], d[1]))
        if ln < 1e-9:
            continue
        normal = np.array([-d[1], d[0]]) / ln
        inl = np.abs((pts - pts[i]) @ normal) <= distance_threshold
        c = int(inl.sum())
        if c > best_n:
            best_n, best_idx = c, np.flatnonzero(inl)
    if best_idx is None or best_n < 2:
        return None
    return pts[best_idx], best_idx


def _split_gaps(inliers: Any) -> list[Any]:
    """Split one fitted line's inliers wherever they gap by more than _GAP_M
    along the line. Returns (start, end, points) triples."""
    import numpy as np

    if inliers.shape[0] < 2:
        return []
    d = inliers[-1] - inliers[0]
    if float(np.hypot(d[0], d[1])) < 1e-9:
        mean = inliers.mean(axis=0)
        d = inliers[int(np.argmax(np.linalg.norm(inliers - mean, axis=1)))] - mean
    ln = float(np.hypot(d[0], d[1])) or 1.0
    direction = d / ln

    t = (inliers - inliers.mean(axis=0)) @ direction
    order = np.argsort(t)
    t_s, p_s = t[order], inliers[order]

    groups: list[list[int]] = [[0]]
    for i in range(1, t_s.size):
        if float(t_s[i] - t_s[i - 1]) > _GAP_M:
            groups.append([i])
        else:
            groups[-1].append(i)

    out = []
    for g in groups:
        chunk = p_s[np.asarray(g)]
        if chunk.shape[0] < 2:
            continue
        tt = (chunk - chunk[0]) @ direction
        out.append((chunk[int(np.argmin(tt))], chunk[int(np.argmax(tt))], chunk))
    return out


def fit_wall_segments(
    points_2d: Any,
    *,
    distance_threshold: float = 0.04,
    min_points: int = 40,
    max_segments: int = 40,
) -> list[dict[str, Any]]:
    """Iterative 2-D RANSAC line fitting on a cross-section.

    Endpoints are the extreme projections of the inliers onto the fitted line,
    not raw RANSAC samples. Segments shorter than 0.30 m are discarded. Empty
    or too-sparse input returns [].
    """
    import numpy as np

    pts = np.asarray(points_2d, dtype=float)
    if pts.ndim != 2 or pts.shape[0] < min_points or pts.shape[1] < 2:
        return []
    pts = pts[:, :2].copy()

    segs: list[dict[str, Any]] = []
    remaining = pts
    for _ in range(max_segments):
        if remaining.shape[0] < min_points:
            break
        fitted = _fit_one_line(remaining, distance_threshold, 120)
        if fitted is None:
            break
        inliers, idx = fitted
        if inliers.shape[0] < min_points:
            break

        for start, end, chunk in _split_gaps(inliers):
            length = float(np.hypot(end[0] - start[0], end[1] - start[1]))
            if length < _MIN_SEG_M:
                continue
            segs.append({
                "start": [float(start[0]), float(start[1])],
                "end": [float(end[0]), float(end[1])],
                "length": length,
                "inliers": int(chunk.shape[0]),
                "angle_deg": float(np.degrees(np.arctan2(end[1] - start[1], end[0] - start[0]))),
            })

        keep = np.ones(remaining.shape[0], dtype=bool)
        keep[idx] = False
        remaining = remaining[keep]
    return segs


def extend_to_corners(
    segments: list[dict[str, Any]],
    *,
    max_extension: float = 0.6,
    min_angle_deg: float = 45.0,
) -> list[dict[str, Any]]:
    """Extend near-perpendicular segment endpoints to their true intersection.

    Sequential RANSAC assigns each corner point to whichever wall is fitted
    first, so every other wall loses both its corners and measures short by a
    point spacing at each end — about 5 cm, which is a 5% error on a 3 m wall
    and lands right on the take-off accuracy gate.

    Only extends by up to `max_extension`, and only between segments at least
    `min_angle_deg` apart: a small correction to recover a corner is right, but
    dragging a wall metres to meet a distant line is how a plan gets invented.
    """
    import numpy as np

    if len(segments) < 2:
        return [dict(s) for s in segments]

    out = [dict(s) for s in segments]
    lines = []
    for s in out:
        a = np.array(s["start"], float)
        b = np.array(s["end"], float)
        d = b - a
        n = float(np.hypot(d[0], d[1])) or 1.0
        lines.append((a, d / n))

    for i, si in enumerate(out):
        for key in ("start", "end"):
            p = np.array(si[key], float)
            best_pt, best_gap = None, max_extension
            for j, sj in enumerate(out):
                if i == j:
                    continue
                (ai, di), (aj, dj) = lines[i], lines[j]
                cross = float(di[0] * dj[1] - di[1] * dj[0])
                angle = abs(float(np.degrees(np.arcsin(np.clip(abs(cross), 0.0, 1.0)))))
                if angle < min_angle_deg or abs(cross) < 1e-9:
                    continue
                # Intersection of the two infinite lines.
                diff = aj - ai
                t = float(diff[0] * dj[1] - diff[1] * dj[0]) / cross
                hit = ai + di * t
                gap = float(np.hypot(hit[0] - p[0], hit[1] - p[1]))
                # Only pull the endpoint OUTWARD toward a corner it fell short of.
                if gap < best_gap:
                    best_pt, best_gap = hit, gap
            if best_pt is not None:
                si[key] = [float(best_pt[0]), float(best_pt[1])]
        a = np.array(si["start"], float)
        b = np.array(si["end"], float)
        si["length"] = float(np.hypot(b[0] - a[0], b[1] - a[1]))
    return out


def polygon_area(polygon: Any) -> float:
    """Shoelace, absolute value, so winding does not matter. Fewer than 3
    points returns 0.0."""
    import numpy as np

    p = np.asarray(polygon, dtype=float)
    if p.ndim != 2 or p.shape[0] < 3:
        return 0.0
    x, z = p[:, 0], p[:, 1]
    return float(abs(0.5 * (np.dot(x, np.roll(z, -1)) - np.dot(z, np.roll(x, -1)))))


def close_floor_polygon(
    segments: list[dict[str, Any]], *, snap_distance: float = 0.25
) -> dict[str, Any]:
    """Join segments into the largest closed loop, snapping nearby endpoints.

    When nothing closes, returns the longest open chain with closed=False — a
    partial plan is useful to an operator, a crash is not.
    """
    import numpy as np

    if not segments:
        return {"polygon": [], "closed": False, "gap_count": 0, "skipped": "no_segments"}

    ends = [(np.array(s["start"], float), np.array(s["end"], float)) for s in segments]

    def dist(a: Any, b: Any) -> float:
        return float(np.hypot(a[0] - b[0], a[1] - b[1]))

    best_closed: list[Any] = []
    best_open: list[Any] = []
    for start_i in range(len(ends)):
        used = {start_i}
        chain = [ends[start_i][0], ends[start_i][1]]
        grew = True
        while grew:
            grew = False
            head = chain[-1]
            for i, (a, b) in enumerate(ends):
                if i in used:
                    continue
                if dist(head, a) <= snap_distance:
                    chain.append(b)
                elif dist(head, b) <= snap_distance:
                    chain.append(a)
                else:
                    continue
                used.add(i)
                grew = True
                break
        if len(chain) > len(best_open):
            best_open = chain
        if len(chain) >= 3 and dist(chain[0], chain[-1]) <= snap_distance:
            loop = chain if dist(chain[0], chain[-1]) > 1e-9 else chain[:-1]
            if len(loop) > len(best_closed):
                best_closed = loop

    if best_closed:
        return {
            "polygon": [[float(p[0]), float(p[1])] for p in best_closed],
            "closed": True, "gap_count": 0, "skipped": None,
        }
    poly = [[float(p[0]), float(p[1])] for p in best_open]
    return {"polygon": poly, "closed": False, "gap_count": 1, "skipped": None if poly else "no_loop"}


def _seg_frame(segment: dict[str, Any]):
    import numpy as np

    a = np.array(segment["start"], dtype=float)
    b = np.array(segment["end"], dtype=float)
    d = b - a
    length = float(np.hypot(d[0], d[1])) or 1.0
    return a, d / length, length


def detect_wall_openings(
    mesh: Any,
    segment: dict[str, Any],
    floor_y: float,
    ceiling_y: float,
    *,
    min_width: float = 0.5,
) -> list[dict[str, Any]]:
    """Find apertures in one wall via an occupancy grid on its plane.

    `verified` requires the void to be bounded by solid cells above and on both
    sides. The floor edge is deliberately not required — a door reaches the
    floor by definition — but a void running off the TOP or a SIDE of the wall
    is unscanned area, not an opening, and comes back unverified. No boundary
    is ever assumed to make a rectangle close.
    """
    import numpy as np

    try:
        verts = np.asarray(mesh.vertices, dtype=float)
    except (AttributeError, RuntimeError):
        return []
    if verts.size == 0 or ceiling_y <= floor_y:
        return []

    origin, tangent, length = _seg_frame(segment)
    normal = np.array([-tangent[1], tangent[0]])
    xz = verts[:, [0, 2]]
    along = (xz - origin) @ tangent
    perp = (xz - origin) @ normal
    h = verts[:, 1] - floor_y
    wall_h = ceiling_y - floor_y

    on = (
        (along >= -0.05) & (along <= length + 0.05)
        & (np.abs(perp) <= 0.12)
        & (h >= -0.05) & (h <= wall_h + 0.05)
    )
    cols = max(int(np.ceil(length / _CELL)), 1)
    rows = max(int(np.ceil(wall_h / _CELL)), 1)
    occ = np.zeros((rows, cols), dtype=bool)
    if np.any(on):
        ci = np.clip((along[on] / _CELL).astype(int), 0, cols - 1)
        ri = np.clip((h[on] / _CELL).astype(int), 0, rows - 1)
        occ[ri, ci] = True

    visited = np.zeros_like(occ)
    openings: list[dict[str, Any]] = []
    for r in range(rows):
        for c in range(cols):
            if occ[r, c] or visited[r, c]:
                continue
            stack = [(r, c)]
            visited[r, c] = True
            cells = [(r, c)]
            while stack:
                cr, cc = stack.pop()
                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nr, nc = cr + dr, cc + dc
                    if 0 <= nr < rows and 0 <= nc < cols and not occ[nr, nc] and not visited[nr, nc]:
                        visited[nr, nc] = True
                        stack.append((nr, nc))
                        cells.append((nr, nc))

            rs = [p[0] for p in cells]
            cs = [p[1] for p in cells]
            r0, r1, c0, c1 = min(rs), max(rs), min(cs), max(cs)
            width = (c1 - c0 + 1) * _CELL
            height = (r1 - r0 + 1) * _CELL
            if width < min_width:
                continue
            sill = r0 * _CELL

            bounded = (
                c0 > 0 and c1 + 1 < cols and r1 + 1 < rows
                and bool(occ[r1 + 1, c0 : c1 + 1].any())
                and bool(occ[r0 : r1 + 1, c0 - 1].any())
                and bool(occ[r0 : r1 + 1, c1 + 1].any())
            )
            if sill < 0.15 and height > 1.6:
                kind = "door"
            elif sill >= 0.30:
                kind = "window"
            else:
                kind = "unknown"
            openings.append({
                "kind": kind,
                "width": float(width),
                "height": float(height),
                "sill_height": float(sill),
                "area": float(width * height),
                "verified": bool(bounded),
            })
    return openings


def wall_area_takeoff(
    mesh: Any, segments: list[dict[str, Any]], floor_y: float, ceiling_y: float
) -> dict[str, Any]:
    """Gross wall area minus VERIFIED openings only.

    Unverified void area is reported alongside, never blended in, so a human
    adjudicates whether the hole was a window or a sensor drop-out.
    """
    storey = max(float(ceiling_y - floor_y), 0.0)
    walls: list[dict[str, Any]] = []
    totals = {"length": 0.0, "gross_area": 0.0, "opening_area": 0.0,
              "net_area": 0.0, "unverified_opening_area": 0.0}

    for seg in segments:
        length = float(seg["length"])
        gross = length * storey
        ops = detect_wall_openings(mesh, seg, floor_y, ceiling_y)
        verified = float(sum(o["area"] for o in ops if o["verified"]))
        unverified = float(sum(o["area"] for o in ops if not o["verified"]))
        net = gross - verified
        walls.append({
            "length": length,
            "gross_area": float(gross),
            "opening_area": verified,
            "net_area": float(net),
            "unverified_opening_area": unverified,
            "openings": ops,
        })
        totals["length"] += length
        totals["gross_area"] += gross
        totals["opening_area"] += verified
        totals["net_area"] += net
        totals["unverified_opening_area"] += unverified

    return {"walls": walls, "totals": {k: float(v) for k, v in totals.items()}}


def build_floorplan(
    mesh: Any, floor_y: float, ceiling_y: float, *, slice_height: float = 1.2
) -> dict[str, Any]:
    """Slice → walls → polygon → openings → take-off.

    Sliced at 1.2 m by convention: above furniture, below wall cabinets. A
    partial result is returned rather than an error when any stage finds
    nothing.
    """
    pts = slice_at_height(mesh, floor_y + slice_height)
    segs = extend_to_corners(fit_wall_segments(pts))
    poly = close_floor_polygon(segs)
    take = wall_area_takeoff(mesh, segs, floor_y, ceiling_y)
    return {
        "slice_at_height": {"point_count": int(pts.shape[0])},
        "fit_wall_segments": {"count": len(segs), "segments": segs},
        "close_floor_polygon": poly,
        "wall_area_takeoff": take,
        "floor_area": float(polygon_area(poly["polygon"])),
        "perimeter": float(sum(s["length"] for s in segs)),
    }
