"""P4c — vector floor plan + areas from a metric point cloud.

Produces a *measurable* 2D plan, not a picture: coordinates stay in metres end to end so the
exported DXF and SVG carry real dimensions. The existing raster `floorplan.png` is a preview;
this is the deliverable an estimator can take off.

Pipeline
    1. Find the floor height (lowest dense horizontal band).
    2. Slice a wall band ~1.2 m above the floor — above furniture, below wall cabinets.
    3. Extract wall lines from the slice with an iterative RANSAC over 2D points.
    4. Regularise: snap near-axis walls to the dominant building orientation.
    5. Close the topology into a room polygon and compute floor + net wall area.

Only numpy and shapely are required (both permissive: BSD-3). Open3D is deliberately NOT a
dependency — RANSAC over a 2D slice is a few lines and avoids a heavy native package in the
worker image. Nothing here is GPL/AGPL or non-commercial.

Accuracy: inherits the capture. iPhone LiDAR is centimetre-class (published 2024-2026 studies
cluster at RMSE ~4-5 cm at room scale), so results are estimating-grade. Callers must label
outputs accordingly and never imply survey grade.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Iterable, Sequence

import numpy as np

# Wall slice: high enough to clear furniture, low enough to stay under upper cabinets.
SLICE_HEIGHT_M = 1.2
SLICE_THICKNESS_M = 0.20
# Floor detection: the floor is the densest band in the bottom of the cloud.
FLOOR_SEARCH_QUANTILE = 0.10
FLOOR_BIN_M = 0.05
# RANSAC over 2D points.
RANSAC_INLIER_DIST_M = 0.06
RANSAC_ITERATIONS = 300
RANSAC_MIN_INLIERS = 40
MAX_WALLS = 32
# A wall shorter than this is noise, not architecture.
MIN_WALL_LENGTH_M = 0.5
# --- Commercial-space parameters -------------------------------------------------------
# Commercial floors are multi-room by definition and carry a structural column grid, so a
# single-room assumption (fine for a bedroom) produces nonsense on an office floor.
# A closed shape smaller than this is a column/pilaster, not a room.
MAX_COLUMN_AREA_M2 = 2.5
MAX_COLUMN_SPAN_M = 2.0
# Smallest thing we will call a room. Below this it is a duct chase, closet or noise.
MIN_ROOM_AREA_M2 = 1.5
# Partition vs structure: cubicle and half-height partitions do not reach the ceiling, and
# must not be counted as building walls when computing enclosure or wall area.
PARTITION_MAX_HEIGHT_FRAC = 0.75
# Snap tolerance for regularising to the dominant orientation.
ANGLE_SNAP_DEG = 8.0


@dataclass
class WallSegment:
    x1: float
    y1: float
    x2: float
    y2: float
    inliers: int = 0
    # Vertical extent of the points supporting this wall, as a fraction of ceiling height.
    height_frac: float | None = None

    @property
    def is_partition(self) -> bool:
        """True for cubicle/half-height partitions: real obstructions, not building structure."""
        return self.height_frac is not None and self.height_frac < PARTITION_MAX_HEIGHT_FRAC

    @property
    def length(self) -> float:
        return math.hypot(self.x2 - self.x1, self.y2 - self.y1)

    @property
    def angle_deg(self) -> float:
        return math.degrees(math.atan2(self.y2 - self.y1, self.x2 - self.x1)) % 180.0

    def as_tuple(self) -> tuple[float, float, float, float]:
        return (self.x1, self.y1, self.x2, self.y2)


@dataclass
class RoomPolygon:
    """One enclosed area on the floor plate."""
    area_m2: float
    perimeter_m: float
    centroid: tuple[float, float]
    wkt: str

    @property
    def area_ft2(self) -> float:
        return round(self.area_m2 * M2_TO_FT2, 1)


@dataclass
class Column:
    """A structural column or pilaster — deducted from usable area, never a room."""
    centroid: tuple[float, float]
    area_m2: float
    span_m: float


@dataclass
class FloorPlan:
    walls: list[WallSegment] = field(default_factory=list)
    # Commercial floors are multi-room; `rooms` is the authoritative list. `floor_area_m2`
    # is kept as the LARGEST room for backwards compatibility with single-room callers.
    rooms: list[RoomPolygon] = field(default_factory=list)
    columns: list[Column] = field(default_factory=list)
    floor_area_m2: float | None = None
    perimeter_m: float | None = None
    wall_area_gross_m2: float | None = None
    ceiling_height_m: float | None = None
    floor_z: float | None = None
    closed: bool = False
    notes: list[str] = field(default_factory=list)

    @property
    def room_count(self) -> int:
        return len(self.rooms)

    @property
    def usable_area_m2(self) -> float | None:
        """Sum of enclosed room areas, less the footprint of structural columns.

        Reported as USABLE, not rentable: BOMA/ANSI Z65.1 rentable area requires a
        load-factor apportionment of building common areas that a single floor scan cannot
        determine. Do not label this output "rentable".
        """
        if not self.rooms:
            return None
        gross = sum(r.area_m2 for r in self.rooms)
        return round(gross - sum(c.area_m2 for c in self.columns), 3)

    @property
    def structural_walls(self) -> list[WallSegment]:
        return [w for w in self.walls if not w.is_partition]

    @property
    def partitions(self) -> list[WallSegment]:
        return [w for w in self.walls if w.is_partition]


def _as_xyz(points: Iterable[Sequence[float]]) -> np.ndarray:
    arr = np.asarray(points, dtype=float)
    if arr.ndim != 2 or arr.shape[1] < 3:
        raise ValueError("points must be an (N,3) array of XYZ")
    return arr[:, :3]


def detect_floor_z(xyz: np.ndarray, up_axis: int = 2) -> float:
    """Height of the floor plane: the densest histogram bin in the lowest 10% of the cloud."""
    up = xyz[:, up_axis]
    lo, hi = float(np.min(up)), float(np.max(up))
    if not math.isfinite(lo) or not math.isfinite(hi) or hi <= lo:
        return lo
    cutoff = lo + (hi - lo) * FLOOR_SEARCH_QUANTILE
    band = up[up <= cutoff]
    if band.size == 0:
        return lo
    bins = max(1, int(math.ceil((cutoff - lo) / FLOOR_BIN_M)))
    counts, edges = np.histogram(band, bins=bins)
    peak = int(np.argmax(counts))
    return float((edges[peak] + edges[peak + 1]) / 2.0)


def wall_slice(xyz: np.ndarray, floor_z: float, up_axis: int = 2) -> np.ndarray:
    """Horizontal band of points at wall height, projected to 2D (metres preserved)."""
    up = xyz[:, up_axis]
    target = floor_z + SLICE_HEIGHT_M
    half = SLICE_THICKNESS_M / 2.0
    mask = np.abs(up - target) <= half
    plane_axes = [a for a in (0, 1, 2) if a != up_axis]
    return xyz[mask][:, plane_axes]


def _fit_line_ransac(pts: np.ndarray, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray] | None:
    """Best-supported line through `pts`. Returns (inlier_mask, [px,py,dx,dy])."""
    n = len(pts)
    if n < RANSAC_MIN_INLIERS:
        return None
    best_mask, best_count, best_line = None, 0, None
    for _ in range(RANSAC_ITERATIONS):
        i, j = rng.integers(0, n, size=2)
        if i == j:
            continue
        p, q = pts[i], pts[j]
        d = q - p
        norm = math.hypot(d[0], d[1])
        if norm < 1e-6:
            continue
        d = d / norm
        # Perpendicular distance of every point to the candidate line.
        rel = pts - p
        dist = np.abs(rel[:, 0] * -d[1] + rel[:, 1] * d[0])
        mask = dist <= RANSAC_INLIER_DIST_M
        count = int(mask.sum())
        if count > best_count:
            best_mask, best_count, best_line = mask, count, np.array([p[0], p[1], d[0], d[1]])
    if best_mask is None or best_count < RANSAC_MIN_INLIERS:
        return None
    return best_mask, best_line


def extract_walls(slice_xy: np.ndarray, seed: int = 0) -> list[WallSegment]:
    """Iteratively pull the strongest line out of the slice until nothing substantial remains."""
    rng = np.random.default_rng(seed)
    remaining = slice_xy.copy()
    walls: list[WallSegment] = []
    for _ in range(MAX_WALLS):
        fit = _fit_line_ransac(remaining, rng)
        if fit is None:
            break
        mask, line = fit
        inliers = remaining[mask]
        px, py, dx, dy = line
        # Extent of the inliers along the line direction gives the segment endpoints.
        t = (inliers[:, 0] - px) * dx + (inliers[:, 1] - py) * dy
        t_min, t_max = float(t.min()), float(t.max())
        seg = WallSegment(
            x1=px + dx * t_min, y1=py + dy * t_min,
            x2=px + dx * t_max, y2=py + dy * t_max,
            inliers=int(mask.sum()),
        )
        if seg.length >= MIN_WALL_LENGTH_M:
            walls.append(seg)
        remaining = remaining[~mask]
        if len(remaining) < RANSAC_MIN_INLIERS:
            break
    return walls


def dominant_angle_deg(walls: Sequence[WallSegment]) -> float:
    """Building orientation, as the length-weighted modal wall angle (mod 90)."""
    if not walls:
        return 0.0
    acc: dict[int, float] = {}
    for w in walls:
        key = int(round(w.angle_deg % 90.0))
        acc[key] = acc.get(key, 0.0) + w.length
    return float(max(acc.items(), key=lambda kv: kv[1])[0])


def regularise(walls: Sequence[WallSegment], base_angle_deg: float | None = None) -> list[WallSegment]:
    """Snap near-axis walls onto the dominant orientation, rotating about their midpoint.

    Real rooms are overwhelmingly rectilinear; snapping removes the degree-or-two of RANSAC
    jitter that would otherwise leave walls visibly non-parallel in the exported plan. Walls
    further than ANGLE_SNAP_DEG from an axis are left alone so genuine angled walls survive.
    """
    if not walls:
        return []
    base = dominant_angle_deg(walls) if base_angle_deg is None else base_angle_deg
    out: list[WallSegment] = []
    for w in walls:
        targets = [(base + k * 90.0) % 180.0 for k in range(2)]
        deltas = [min(abs(w.angle_deg - t), 180.0 - abs(w.angle_deg - t)) for t in targets]
        best = int(np.argmin(deltas))
        if deltas[best] > ANGLE_SNAP_DEG:
            out.append(w)
            continue
        theta = math.radians(targets[best])
        cx, cy = (w.x1 + w.x2) / 2.0, (w.y1 + w.y2) / 2.0
        half = w.length / 2.0
        dx, dy = math.cos(theta) * half, math.sin(theta) * half
        out.append(WallSegment(cx - dx, cy - dy, cx + dx, cy + dy, w.inliers))
    return out


def build_room_polygons(walls: Sequence[WallSegment], snap_m: float = 0.25):
    """Close wall segments into ALL enclosed areas, separating rooms from columns.

    Commercial floors are multi-room: an office floor plate is a corridor plus a dozen
    tenant spaces, and returning only the largest polygon (the old single-room behaviour)
    reports one room and silently discards the rest. Every enclosed loop is returned, then
    split by size — small closed shapes are structural columns, not rooms.
    """
    try:
        from shapely.geometry import LineString, MultiLineString
        from shapely.ops import polygonize, unary_union
    except ImportError:  # pragma: no cover - shapely is a worker dependency
        return [], []
    if len(walls) < 3:
        return [], []

    grown = []
    for w in walls:
        if w.length < 1e-6:
            continue
        ux, uy = (w.x2 - w.x1) / w.length, (w.y2 - w.y1) / w.length
        grown.append(
            LineString([
                (w.x1 - ux * snap_m, w.y1 - uy * snap_m),
                (w.x2 + ux * snap_m, w.y2 + uy * snap_m),
            ])
        )
    if not grown:
        return [], []

    merged = unary_union(MultiLineString(grown))
    rooms: list[RoomPolygon] = []
    columns: list[Column] = []
    for poly in polygonize(merged):
        area = float(poly.area)
        if area <= 0:
            continue
        minx, miny, maxx, maxy = poly.bounds
        span = max(maxx - minx, maxy - miny)
        cx, cy = poly.centroid.x, poly.centroid.y
        if area <= MAX_COLUMN_AREA_M2 and span <= MAX_COLUMN_SPAN_M:
            columns.append(Column(centroid=(round(cx, 3), round(cy, 3)),
                                  area_m2=round(area, 3), span_m=round(span, 3)))
        elif area >= MIN_ROOM_AREA_M2:
            rooms.append(RoomPolygon(
                area_m2=round(area, 3),
                perimeter_m=round(float(poly.length), 3),
                centroid=(round(cx, 3), round(cy, 3)),
                wkt=poly.wkt,
            ))
    rooms.sort(key=lambda r: r.area_m2, reverse=True)
    return rooms, columns


def build_room_polygon(walls: Sequence[WallSegment], snap_m: float = 0.25):
    """Back-compat single-polygon helper. Prefer build_room_polygons()."""
    try:
        from shapely import wkt as _wkt
    except ImportError:  # pragma: no cover
        return None
    rooms, _ = build_room_polygons(walls, snap_m)
    return _wkt.loads(rooms[0].wkt) if rooms else None


def classify_wall_heights(
    walls: Sequence[WallSegment], xyz: np.ndarray, floor_z: float,
    ceiling_h: float | None, up_axis: int = 2,
) -> None:
    """Annotate each wall with the vertical extent of its supporting points.

    Open-plan commercial space is full of 1.2-1.6 m partitions that read exactly like walls
    in a single horizontal slice. Measuring how far up the points actually go separates
    building structure from furniture-grade partitions.
    """
    if not ceiling_h or ceiling_h <= 0:
        return
    plane_axes = [a for a in (0, 1, 2) if a != up_axis]
    up_all = xyz[:, up_axis] - floor_z
    # Exclude the floor and ceiling slabs. They are horizontal and span the whole plate, so
    # their points sit near EVERY wall line in plan view — leaving them in makes a 1.5 m
    # partition measure full height (the ceiling slab supplies the tall points) and every
    # wall reads as structural.
    slab_margin = max(0.15, ceiling_h * 0.08)
    keep = (up_all > slab_margin) & (up_all < ceiling_h - slab_margin)
    pts2d = xyz[keep][:, plane_axes]
    up = up_all[keep]
    if len(pts2d) < 20:
        return
    for w in walls:
        if w.length < 1e-6:
            continue
        ux, uy = (w.x2 - w.x1) / w.length, (w.y2 - w.y1) / w.length
        rel = pts2d - np.array([w.x1, w.y1])
        perp = np.abs(rel[:, 0] * -uy + rel[:, 1] * ux)
        along = rel[:, 0] * ux + rel[:, 1] * uy
        near = (perp <= RANSAC_INLIER_DIST_M * 2.0) & (along >= 0) & (along <= w.length)
        if int(near.sum()) < 20:
            continue
        # 95th percentile: robust to a few stray points above the partition line.
        w.height_frac = round(float(np.quantile(up[near], 0.95) / ceiling_h), 3)


def compute_plan(points: Iterable[Sequence[float]], up_axis: int = 2, seed: int = 0) -> FloorPlan:
    """Full extraction: floor height -> wall slice -> walls -> regularise -> areas."""
    xyz = _as_xyz(points)
    plan = FloorPlan()
    if len(xyz) < RANSAC_MIN_INLIERS:
        plan.notes.append("too few points")
        return plan

    plan.floor_z = detect_floor_z(xyz, up_axis)
    ceiling_z = float(np.quantile(xyz[:, up_axis], 0.99))
    if ceiling_z > plan.floor_z:
        plan.ceiling_height_m = round(ceiling_z - plan.floor_z, 3)

    sl = wall_slice(xyz, plan.floor_z, up_axis)
    if len(sl) < RANSAC_MIN_INLIERS:
        plan.notes.append("wall slice empty — capture may not reach wall height")
        return plan

    plan.walls = regularise(extract_walls(sl, seed=seed))
    classify_wall_heights(plan.walls, xyz, plan.floor_z, plan.ceiling_height_m, up_axis)

    plan.rooms, plan.columns = build_room_polygons(plan.walls)
    if plan.rooms:
        plan.closed = True
        largest = plan.rooms[0]
        plan.floor_area_m2 = largest.area_m2
        plan.perimeter_m = largest.perimeter_m
        if plan.ceiling_height_m:
            # Structural walls only — partitions do not enclose the volume.
            struct_len = sum(w.length for w in plan.structural_walls) or sum(
                w.length for w in plan.walls
            )
            plan.wall_area_gross_m2 = round(struct_len * plan.ceiling_height_m, 3)
        if plan.columns:
            plan.notes.append(f"{len(plan.columns)} column(s) detected and deducted")
        if len(plan.rooms) > 1:
            plan.notes.append(f"{len(plan.rooms)} enclosed areas found")
    else:
        plan.notes.append("walls did not close into a room — partial capture")
    return plan


M2_TO_FT2 = 10.7639104167


def to_square_feet(area_m2: float | None) -> float | None:
    return None if area_m2 is None else round(area_m2 * M2_TO_FT2, 1)
