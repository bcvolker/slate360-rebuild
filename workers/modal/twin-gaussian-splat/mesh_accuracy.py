"""ACC-1 — accuracy evidence for a finished interior mesh, with no tape measure.

Two independent checks, and they answer DIFFERENT questions. Conflating them
would overstate what we know:

1. `fusion_residual` — how far the TSDF mesh sits from the raw LiDAR cloud it
   was built from. This validates FUSION FIDELITY: that integrating 123 depth
   frames into a volume did not warp, smear or drift the surface. It does NOT
   validate absolute scale, because both come from the same sensor. A
   systematically mis-scaled sensor would produce a beautiful residual here.

2. `standard_dimension_check` — compares detected openings and storey height
   against building dimensions that are standardised in the real world (door
   leaf widths, common ceiling heights). This is a genuine, if coarse,
   EXTERNAL reference: nothing in our pipeline knows a door is 32 inches, so
   agreement is real evidence about absolute scale.

Absolute scale ultimately rests on Apple's factory calibration of the LiDAR.
That is a reasonable foundation for estimating-grade work and it is what the
whole industry uses, but it is an assumption, and the client-facing wording
must stay estimating-grade with a laser governing. Never print a tolerance
these checks cannot support.

Open3D (MIT) + numpy (BSD) only, imported inside functions.
"""

from __future__ import annotations

from typing import Any

# Common door leaf widths, metres: 28", 30", 32", 36".
STANDARD_DOOR_WIDTHS_M = (0.711, 0.762, 0.813, 0.914)
# Common finished ceiling heights, metres: 8', 9', 10'.
STANDARD_CEILING_HEIGHTS_M = (2.438, 2.743, 3.048)
# Within this of a standard dimension counts as agreement.
DIMENSION_TOLERANCE_M = 0.05


def fusion_residual(
    mesh: Any, reference_points: Any, *, max_samples: int = 200_000
) -> dict[str, Any]:
    """Distance from each reference LiDAR point to the nearest mesh surface.

    Reports median and p95 in millimetres. Median is the headline because a
    scan legitimately contains points the mesh should NOT reproduce — a glimpse
    through a doorway, a mirror return — and a mean would let those dominate.

    Answers "did fusion preserve the sensor's surface", NOT "is the sensor
    right". Degenerate input returns a skip reason rather than raising.
    """
    import numpy as np

    # Guards run BEFORE importing Open3D so the skip paths stay usable (and
    # testable) in an environment that does not have it.
    try:
        tris = np.asarray(mesh.triangles)
    except (AttributeError, RuntimeError):
        return {"skipped": "no_mesh"}
    if tris.size == 0:
        return {"skipped": "empty_mesh"}

    pts = np.asarray(reference_points, dtype=float)
    if pts.ndim != 2 or pts.shape[0] < 100 or pts.shape[1] < 3:
        return {"skipped": "too_few_reference_points"}
    pts = pts[:, :3]
    if pts.shape[0] > max_samples:
        pts = pts[:: int(np.ceil(pts.shape[0] / max_samples))]

    import open3d as o3d

    # Restrict to reference points inside the mesh's own extent. The raw LiDAR
    # cloud keeps every return, including the ones TSDF deliberately rejected —
    # beyond the 5 m range limit, or below the confidence floor. Scoring the
    # mesh against geometry it was right to exclude measures the sensor's noise,
    # not the fusion, and drags the tail into metres.
    verts = np.asarray(mesh.vertices, dtype=float)
    total = int(pts.shape[0])
    if verts.size:
        lo, hi = verts.min(axis=0), verts.max(axis=0)
        inside = np.all((pts >= lo - 0.10) & (pts <= hi + 0.10), axis=1)
        if int(inside.sum()) >= 100:
            pts = pts[inside]

    scene = o3d.t.geometry.RaycastingScene()
    scene.add_triangles(o3d.t.geometry.TriangleMesh.from_legacy(mesh))
    query = o3d.core.Tensor(pts.astype(np.float32), dtype=o3d.core.Dtype.Float32)
    d = scene.compute_distance(query).numpy().astype(float)

    return {
        "skipped": None,
        "pointsCompared": int(d.size),
        "pointsOutsideMeshExtent": int(total - d.size),
        "medianMm": round(float(np.median(d)) * 1000.0, 1),
        "p95Mm": round(float(np.percentile(d, 95)) * 1000.0, 1),
        "meanMm": round(float(d.mean()) * 1000.0, 1),
        "within10mmPct": round(float((d <= 0.010).mean()) * 100.0, 1),
        "within25mmPct": round(float((d <= 0.025).mean()) * 100.0, 1),
    }


def _nearest_standard(value: float, standards: tuple[float, ...]) -> tuple[float, float]:
    best = min(standards, key=lambda s: abs(s - value))
    return best, abs(best - value)


def standard_dimension_check(
    floorplan: dict[str, Any], floor_y: float | None, ceiling_y: float | None
) -> dict[str, Any]:
    """Compare measured dimensions against real-world standards.

    Nothing in this pipeline knows a door leaf is 32 inches or a ceiling is
    8 feet, so agreement is genuine external evidence about absolute scale —
    the closest thing to a tape measure that costs the operator nothing.

    Only VERIFIED openings are checked. An unverified void is a sensor hole,
    and measuring a hole tells us nothing about the building.
    """
    out: dict[str, Any] = {"doors": [], "ceiling": None, "verdict": "no_evidence"}
    agreements, checks = 0, 0

    if floor_y is not None and ceiling_y is not None:
        storey = float(ceiling_y) - float(floor_y)
        nearest, delta = _nearest_standard(storey, STANDARD_CEILING_HEIGHTS_M)
        agree = delta <= DIMENSION_TOLERANCE_M * 2  # ceilings vary with finishes
        out["ceiling"] = {
            "measuredM": round(storey, 3),
            "measuredFt": round(storey * 3.28084, 2),
            "nearestStandardM": nearest,
            "deltaMm": round(delta * 1000.0, 1),
            "agrees": bool(agree),
        }
        checks += 1
        agreements += int(agree)

    for wall in (floorplan.get("wall_area_takeoff") or {}).get("walls") or []:
        for op in wall.get("openings") or []:
            if not op.get("verified") or op.get("kind") != "door":
                continue
            width = float(op["width"])
            nearest, delta = _nearest_standard(width, STANDARD_DOOR_WIDTHS_M)
            agree = delta <= DIMENSION_TOLERANCE_M
            out["doors"].append({
                "measuredM": round(width, 3),
                "measuredIn": round(width * 39.3701, 1),
                "nearestStandardM": nearest,
                "deltaMm": round(delta * 1000.0, 1),
                "agrees": bool(agree),
            })
            checks += 1
            agreements += int(agree)

    if checks == 0:
        return out
    ratio = agreements / checks
    out["checksRun"] = checks
    out["agreements"] = agreements
    out["verdict"] = "consistent" if ratio >= 0.6 else "inconsistent"
    return out


def evaluate_accuracy(
    mesh: Any,
    reference_points: Any,
    floorplan: dict[str, Any],
    floor_y: float | None,
    ceiling_y: float | None,
) -> dict[str, Any]:
    """Both checks plus a single sentence an operator can read.

    The summary never claims a tolerance the evidence cannot support: fusion
    residual is described as fidelity to the sensor, and the standards check as
    consistency, never as certification.
    """
    fusion = fusion_residual(mesh, reference_points)
    standards = standard_dimension_check(floorplan or {}, floor_y, ceiling_y)

    if fusion.get("skipped"):
        headline = f"Fusion residual unavailable ({fusion['skipped']})."
    else:
        headline = (
            f"Mesh sits {fusion['medianMm']} mm from the LiDAR cloud at the median "
            f"({fusion['within25mmPct']}% of points within 25 mm). "
            "Estimating-grade; a laser governs."
        )
    return {"fusion": fusion, "standards": standards, "summary": headline}
