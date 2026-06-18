"""Thermal anomaly detection on radiometric temperature arrays.

Detection is LOCAL-CONTRAST based: each region is compared to its own surroundings
(a wide-Gaussian local background), not to the whole-scene median. This finds real
defects — a damp patch, a warm connection — that are not the global hottest/coldest
pixel. Thresholds adapt per image via a robust (MAD) noise estimate, floored by the
operator's manual deltas. Region shape + edge softness classify focal vs diffuse so
the finding can say what kind of problem it likely is.
"""

from __future__ import annotations

import uuid
from typing import Any

import cv2
import numpy as np


def _bbox_from_mask(mask: np.ndarray) -> dict[str, int] | None:
    ys, xs = np.where(mask)
    if ys.size == 0:
        return None
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    return {"x": x0, "y": y0, "w": int(x1 - x0 + 1), "h": int(y1 - y0 + 1)}


DEFAULT_PARAMS: dict[str, Any] = {
    "hot_delta_c": 5.0,
    "cold_delta_c": 4.0,
    "min_area_px": 24,
    "severity_action_c": 12.0,
    "severity_watch_c": 7.0,
    "detect_hot": True,
    "detect_cold": True,
    "detect_streaks": True,
}


def _merge_params(params: dict[str, Any] | None) -> dict[str, Any]:
    merged = dict(DEFAULT_PARAMS)
    if params:
        for key in DEFAULT_PARAMS:
            if params.get(key) is not None:
                merged[key] = params[key]
    return merged


def _severity(delta: float, action_c: float = 12.0, watch_c: float = 7.0) -> str:
    if delta >= action_c:
        return "action"
    if delta >= watch_c:
        return "watch"
    return "info"


def _scene_reference(temp: np.ndarray) -> float:
    """Whole-frame median — kept only as context (scene_delta_c), not for detection."""
    return float(np.median(temp))


def _local_background(temp: np.ndarray, frac: float = 0.12) -> np.ndarray:
    """Estimate the local 'normal' surface temperature with a wide Gaussian blur, so
    anomalies are judged against their SURROUNDINGS rather than the whole scene."""
    h, w = temp.shape
    sigma = max(4.0, frac * max(h, w))
    return cv2.GaussianBlur(temp, (0, 0), sigmaX=sigma, sigmaY=sigma)


def _robust_sigma(values: np.ndarray) -> float:
    """MAD-based robust standard-deviation estimate (resistant to the anomalies)."""
    med = float(np.median(values))
    mad = float(np.median(np.abs(values - med)))
    return mad * 1.4826


def _edge_softness(grad: np.ndarray, component: np.ndarray) -> float:
    """Mean gradient magnitude on the region border — low = soft/diffuse (moisture),
    high = sharp (electrical / mechanical)."""
    border = cv2.dilate(component, np.ones((3, 3), np.uint8)) - component
    vals = grad[border.astype(bool)]
    return float(vals.mean()) if vals.size else 0.0


def _ring_mean(temp: np.ndarray, component: np.ndarray, thickness: int) -> float:
    """Mean temperature of a band of surrounding surface just outside the region —
    the true 'adjacent surface' reference, robust to region SIZE (unlike a blur, which
    a large patch pulls toward itself)."""
    kernel = np.ones((thickness, thickness), np.uint8)
    ring = cv2.dilate(component, kernel) - component
    vals = temp[ring.astype(bool)]
    return float(vals.mean()) if vals.size else float(np.median(temp))


def _emit_regions(
    temp: np.ndarray,
    bg: np.ndarray,
    grad: np.ndarray,
    polarity: int,
    scene_ref: float,
    floor_c: float,
    action_c: float,
    watch_c: float,
    min_area: int,
    rule_id: str,
    anomaly_type: str,
) -> list[dict[str, Any]]:
    height, width = temp.shape
    local = (temp - bg) * polarity          # contrast vs local background (edges/focal)
    scene = (temp - scene_ref) * polarity   # offset vs whole scene (large regions)
    sigma = _robust_sigma(local)
    # Seed candidates from EITHER local contrast OR scene offset, so both small focal
    # features and large diffuse areas are captured.
    seed = ((local >= max(2.0, 1.5 * sigma)) | (scene >= max(2.0, floor_c * 0.6))).astype(np.uint8)
    if int(seed.sum()) == 0:
        return []

    num_labels, labels, stats, _centroids = cv2.connectedComponentsWithStats(seed, connectivity=8)
    thickness = max(5, int(0.04 * max(height, width)))
    out: list[dict[str, Any]] = []
    for label in range(1, num_labels):
        area = int(stats[label, cv2.CC_STAT_AREA])
        if area < min_area:
            continue
        component = (labels == label).astype(np.uint8)
        compb = component.astype(bool)
        ring_mean = _ring_mean(temp, component, thickness)
        extreme = float(temp[compb].max() if polarity > 0 else temp[compb].min())
        local_dt = (extreme - ring_mean) * polarity
        if local_dt < floor_c:  # must beat the operator floor RELATIVE TO ITS SURROUNDINGS
            continue
        bbox = _bbox_from_mask(compb)
        if not bbox:
            continue
        fill = area / float(bbox["w"] * bbox["h"])
        softness = _edge_softness(grad, component)
        pattern = "diffuse" if (fill < 0.5 or softness < 1.0) else "focal"
        out.append(
            {
                "id": str(uuid.uuid4()),
                "type": anomaly_type,
                "severity": _severity(local_dt, action_c, watch_c),
                "confidence": round(min(0.95, 0.5 + local_dt / 25.0), 2),
                "temp_c": round(extreme, 2),
                "delta_c": round(local_dt, 2),  # vs the SURROUNDING surface (the meaningful ΔT)
                "scene_delta_c": round(abs(extreme - scene_ref), 2),
                "background_c": round(ring_mean, 2),
                "pattern": pattern,
                "bbox": bbox,
                "area_px": area,
                "rule_id": rule_id,
            }
        )
    return out


def detect_hot_spots(temp, bg, grad, scene_ref, floor_c, min_area, action_c, watch_c):
    return _emit_regions(
        temp, bg, grad, +1, scene_ref, floor_c, action_c, watch_c, min_area,
        "hot_spot_local_contrast", "hot_spot",
    )


def detect_cold_bridges(temp, bg, grad, scene_ref, floor_c, min_area, action_c, watch_c):
    return _emit_regions(
        temp, bg, grad, -1, scene_ref, floor_c, action_c, watch_c, max(min_area, 40),
        "cold_bridge_local_contrast", "cold_bridge",
    )


def detect_linear_streaks(temp: np.ndarray, bg: np.ndarray) -> list[dict[str, Any]]:
    delta = temp - bg
    sigma = _robust_sigma(delta)
    hot = (delta >= max(3.0, 2.0 * sigma)).astype(np.uint8) * 255
    edges = cv2.Canny(hot, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=60, minLineLength=40, maxLineGap=8)
    if lines is None:
        return []

    anomalies: list[dict[str, Any]] = []
    for line in lines[:8]:
        x1, y1, x2, y2 = [int(v) for v in line[0]]
        anomalies.append(
            {
                "id": str(uuid.uuid4()),
                "type": "linear_streak",
                "severity": "watch",
                "confidence": 0.65,
                "temp_c": None,
                "delta_c": None,
                "pattern": "linear",
                "bbox": {"x": min(x1, x2), "y": min(y1, y2), "w": abs(x2 - x1) + 1, "h": abs(y2 - y1) + 1},
                "line": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                "rule_id": "linear_streak_hough",
                "note": "Linear thermal trace — verify for sub-surface piping/wiring or moisture tracking.",
            }
        )
    return anomalies


def analyze_temperature_array(
    temp: np.ndarray, params: dict[str, Any] | None = None
) -> list[dict[str, Any]]:
    p = _merge_params(params)
    temp = np.asarray(temp, dtype=np.float32)
    scene_ref = _scene_reference(temp)
    bg = _local_background(temp)
    gx = cv2.Sobel(temp, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(temp, cv2.CV_32F, 0, 1, ksize=3)
    grad = cv2.magnitude(gx, gy)

    action_c = float(p["severity_action_c"])
    watch_c = float(p["severity_watch_c"])
    min_area = int(p["min_area_px"])

    anomalies: list[dict[str, Any]] = []
    if p["detect_hot"]:
        anomalies.extend(detect_hot_spots(temp, bg, grad, scene_ref, float(p["hot_delta_c"]), min_area, action_c, watch_c))
    if p["detect_cold"]:
        anomalies.extend(detect_cold_bridges(temp, bg, grad, scene_ref, float(p["cold_delta_c"]), min_area, action_c, watch_c))
    if p["detect_streaks"]:
        anomalies.extend(detect_linear_streaks(temp, bg))

    anomalies.sort(key=lambda row: row.get("delta_c") or 0, reverse=True)
    return anomalies[:25]


def segment_materials_sam_stub(temp: np.ndarray, rgb_preview: bytes | None = None) -> dict[str, Any]:
    """SAM/MobileSAM material segmentation hook for per-region emissivity (advanced GPU slice).
    Returns no regions (status="pending") so no fabricated material data is ever persisted."""
    return {
        "status": "pending",
        "regions": [],
        "note": "Material segmentation runs on the GPU advanced job; no regions in CPU pipeline.",
    }
