"""Window/door detection on wall planes, and NET wall area.

Gross wall area (perimeter x height) is the easy number and the wrong one. Every trade that
prices off a wall — drywall, paint, insulation, cladding — prices the net area, so the twin has
to subtract the openings.

Method: project the points that belong to a wall onto that wall's plane, rasterise occupancy in
(along-wall, height), and look for HOLES. A window is a rectangular hole fully enclosed by wall.

The hard part is not finding holes, it is not believing them. A scan has holes for three
reasons and only one is an opening:
    1. a genuine opening               -> subtract it
    2. something stood in front of it  -> occlusion shadow, wall is still there
    3. the operator never scanned it   -> coverage gap, unknown
Rejecting 2 and 3 is what most of this module does, and it deliberately errs toward NOT
subtracting: under-reporting openings gives a conservative (larger) wall area, which is the
safer direction to be wrong in when someone is ordering material.

Licence-clean: numpy only.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Sequence

# Occupancy raster resolution. 5 cm is well below a window mullion and well above LiDAR noise.
CELL_M = 0.05

# A wall point is one within this distance of the wall plane.
WALL_BAND_M = 0.12

# Cells with at least this many points count as occupied. 1 is too trusting of stray points.
MIN_POINTS_PER_CELL = 2

# Holes smaller than this are noise, furniture shadows or scan speckle, not openings.
MIN_OPENING_AREA_M2 = 0.15

# An opening is rectangular. Fill ratio = hole area / its bounding-box area. A real window or
# door scores >0.9; a person-shaped occlusion shadow scores meaningfully lower but is NOT
# formless — a standing person leaves a roughly 0.6 x 1.8 blob that can reach 0.7. The threshold
# has to sit above that, not merely above noise.
MIN_RECTANGULARITY = 0.80

# A hole that matches no door/window profile is subtracted only if it is unambiguously an
# aperture. This is the conservative direction: a missed opening over-states wall area, an
# invented one under-states it, and under-stating is what causes a short material order.
UNCLASSIFIED_MIN_RECTANGULARITY = 0.90

# Door heuristics (metres above finished floor).
DOOR_MAX_SILL_M = 0.20
DOOR_MIN_HEIGHT_M = 1.60
DOOR_MIN_WIDTH_M = 0.55
DOOR_MAX_WIDTH_M = 2.60

# Window heuristics.
WINDOW_MIN_SILL_M = 0.25
WINDOW_MIN_HEIGHT_M = 0.30

# A hole touching the edge of the scanned region is unbounded — it is where the scan stopped,
# not where the wall stopped.
REQUIRE_ENCLOSED = True


@dataclass
class Opening:
    kind: str                      # "door" | "window" | "opening"
    area_m2: float
    width_m: float
    height_m: float
    sill_m: float                  # height of the opening's bottom above the floor
    along_m: float                 # distance along the wall to the opening's centre
    rectangularity: float
    confidence: str = "estimated"  # "measured" | "estimated" | "low"


# Empty area that is neither an accepted opening nor explained — a scan gap or an occlusion.
# Above this fraction of the wall, the net area is reported but flagged: we are asserting wall
# where we have no evidence either way.
UNACCOUNTED_WARN_FRAC = 0.08


@dataclass
class WallAreas:
    gross_m2: float
    net_m2: float
    opening_area_m2: float
    coverage: float                # fraction of the wall raster that was actually scanned
    unaccounted_m2: float = 0.0    # empty, rejected as an opening, and therefore unexplained
    openings: list[Opening] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "grossM2": round(self.gross_m2, 3),
            "netM2": round(self.net_m2, 3),
            "openingAreaM2": round(self.opening_area_m2, 3),
            "unaccountedM2": round(self.unaccounted_m2, 3),
            "coverage": round(self.coverage, 3),
            "openings": [
                {
                    "kind": o.kind, "areaM2": round(o.area_m2, 3),
                    "widthM": round(o.width_m, 3), "heightM": round(o.height_m, 3),
                    "sillM": round(o.sill_m, 3), "alongM": round(o.along_m, 3),
                    "rectangularity": round(o.rectangularity, 3), "confidence": o.confidence,
                }
                for o in self.openings
            ],
            "warnings": self.warnings,
        }


def _label_empty_regions(occ):
    """4-connected labelling of the EMPTY cells. Returns (labels, count).

    Written out rather than pulled from scipy: the worker image should not grow a dependency
    for one flood fill, and this runs on rasters of a few thousand cells.
    """
    import numpy as np

    h, w = occ.shape
    labels = np.zeros((h, w), dtype=np.int32)
    current = 0
    for start_r in range(h):
        for start_c in range(w):
            if occ[start_r, start_c] or labels[start_r, start_c]:
                continue
            current += 1
            stack = [(start_r, start_c)]
            labels[start_r, start_c] = current
            while stack:
                r, c = stack.pop()
                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < h and 0 <= nc < w and not occ[nr, nc] and not labels[nr, nc]:
                        labels[nr, nc] = current
                        stack.append((nr, nc))
    return labels, current


def _classify(width_m: float, height_m: float, sill_m: float) -> str:
    if sill_m <= DOOR_MAX_SILL_M and height_m >= DOOR_MIN_HEIGHT_M \
            and DOOR_MIN_WIDTH_M <= width_m <= DOOR_MAX_WIDTH_M:
        return "door"
    if sill_m >= WINDOW_MIN_SILL_M and height_m >= WINDOW_MIN_HEIGHT_M:
        return "window"
    return "opening"


def detect_openings(
    wall_points_2d: Sequence[tuple[float, float]],
    wall_length_m: float,
    wall_height_m: float,
    *,
    cell_m: float = CELL_M,
) -> WallAreas:
    """Find openings in one wall from its points already projected to (along, height).

    `wall_points_2d` is metres along the wall from its start, and metres above the finished
    floor. Callers project onto the wall plane first (see `project_to_wall`).
    """
    import numpy as np

    gross = max(0.0, wall_length_m) * max(0.0, wall_height_m)
    result = WallAreas(gross_m2=gross, net_m2=gross, opening_area_m2=0.0, coverage=0.0)
    if gross <= 0 or cell_m <= 0:
        result.warnings.append("degenerate wall dimensions")
        return result

    ncols = max(1, int(round(wall_length_m / cell_m)))
    nrows = max(1, int(round(wall_height_m / cell_m)))
    counts = np.zeros((nrows, ncols), dtype=np.int32)
    for along, height in wall_points_2d:
        c = int(along / cell_m)
        r = int(height / cell_m)
        if 0 <= r < nrows and 0 <= c < ncols:
            counts[r, c] += 1

    occ = counts >= MIN_POINTS_PER_CELL
    result.coverage = float(occ.sum()) / float(nrows * ncols)

    # Below ~40% coverage the raster is mostly holes and hole-finding is meaningless. Report
    # gross and say why, rather than subtracting a scan gap and calling it a window.
    if result.coverage < 0.40:
        result.warnings.append(
            f"wall coverage {result.coverage:.0%} too low for opening detection — "
            "gross area reported, openings not subtracted"
        )
        return result

    labels, count = _label_empty_regions(occ)
    cell_area = cell_m * cell_m
    unaccounted = 0.0

    for label in range(1, count + 1):
        mask = labels == label
        area = float(mask.sum()) * cell_area
        if area < MIN_OPENING_AREA_M2:
            continue

        rows, cols = np.nonzero(mask)
        r0, r1, c0, c1 = rows.min(), rows.max(), cols.min(), cols.max()

        if REQUIRE_ENCLOSED and (r0 == 0 or c0 == 0 or r1 == nrows - 1 or c1 == ncols - 1):
            # Touches the raster edge: the wall ran out, or the scan did. Either way this is
            # not a bounded opening. (A door reaching the floor is the honest exception —
            # allow it when the region is otherwise enclosed on its sides and top.)
            floor_door = (r0 == 0 and c0 > 0 and c1 < ncols - 1 and r1 < nrows - 1)
            if not floor_door:
                unaccounted += area
                continue

        bbox_area = float((r1 - r0 + 1) * (c1 - c0 + 1)) * cell_area
        rect = area / bbox_area if bbox_area > 0 else 0.0
        if rect < MIN_RECTANGULARITY:
            unaccounted += area  # ragged -> occlusion shadow, not an opening
            continue

        width = float(c1 - c0 + 1) * cell_m
        height = float(r1 - r0 + 1) * cell_m
        sill = float(r0) * cell_m
        kind = _classify(width, height, sill)
        if kind == "opening" and rect < UNCLASSIFIED_MIN_RECTANGULARITY:
            unaccounted += area  # hole-shaped, but matches no aperture we can name
            continue
        result.openings.append(Opening(
            kind=kind, area_m2=area, width_m=width, height_m=height, sill_m=sill,
            along_m=float(c0 + c1 + 1) * 0.5 * cell_m, rectangularity=rect,
            confidence="measured" if result.coverage >= 0.75 and rect >= 0.85 else "estimated",
        ))

    result.opening_area_m2 = sum(o.area_m2 for o in result.openings)
    result.net_m2 = max(0.0, gross - result.opening_area_m2)
    result.unaccounted_m2 = unaccounted
    if result.coverage < 0.75:
        result.warnings.append(
            f"wall coverage {result.coverage:.0%} — some openings may be missed"
        )
    # Empty area we refused to call an opening is area we are asserting is solid wall without
    # evidence. Overall coverage can look healthy while a whole bay went unscanned, so this is
    # checked separately rather than folded into the coverage number.
    if unaccounted > UNACCOUNTED_WARN_FRAC * gross:
        result.warnings.append(
            f"{unaccounted:.1f} m2 ({unaccounted / gross:.0%}) of this wall is unscanned or "
            "occluded and was counted as solid — verify before pricing"
        )
    return result


def project_to_wall(points_xyz, start_xy, end_xy, floor_z: float,
                    band_m: float = WALL_BAND_M):
    """Select the points belonging to a wall and return them as (along, height).

    `start_xy`/`end_xy` are the wall's endpoints in plan. Points further than `band_m` from the
    wall line, or outside its extent, are dropped.
    """
    import numpy as np

    pts = np.asarray(points_xyz, dtype=float).reshape(-1, 3)
    if pts.size == 0:
        return []

    p0 = np.array(start_xy, dtype=float)
    direction = np.array(end_xy, dtype=float) - p0
    length = float(np.linalg.norm(direction))
    if length <= 0:
        return []
    unit = direction / length
    normal = np.array([-unit[1], unit[0]])

    rel = pts[:, :2] - p0
    along = rel @ unit
    offset = np.abs(rel @ normal)
    height = pts[:, 2] - floor_z

    keep = (offset <= band_m) & (along >= 0) & (along <= length) & (height >= 0)
    return list(zip(along[keep].tolist(), height[keep].tolist()))
