"""Rule-based thermal anomaly detection on radiometric temperature arrays."""

from __future__ import annotations

import uuid
from typing import Any

import cv2
import numpy as np


def _reference_temp(temp: np.ndarray) -> float:
    return float(np.percentile(temp, 50))


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


def detect_hot_spots(
    temp: np.ndarray,
    reference: float,
    hot_delta_c: float = 5.0,
    min_area_px: int = 24,
    action_c: float = 12.0,
    watch_c: float = 7.0,
) -> list[dict[str, Any]]:
    threshold = reference + hot_delta_c
    mask = (temp >= threshold).astype(np.uint8)
    if mask.sum() == 0:
        return []

    num_labels, labels, stats, _centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
    anomalies: list[dict[str, Any]] = []
    for label in range(1, num_labels):
        area = int(stats[label, cv2.CC_STAT_AREA])
        if area < min_area_px:
            continue
        component = labels == label
        peak = float(temp[component].max())
        delta = peak - reference
        bbox = _bbox_from_mask(component)
        if not bbox:
            continue
        anomalies.append(
            {
                "id": str(uuid.uuid4()),
                "type": "hot_spot",
                "severity": _severity(delta, action_c, watch_c),
                "confidence": min(0.95, 0.55 + delta / 30.0),
                "temp_c": round(peak, 2),
                "delta_c": round(delta, 2),
                "bbox": bbox,
                "area_px": area,
                "rule_id": "hot_spot_delta",
            }
        )
    return anomalies


def detect_cold_bridges(
    temp: np.ndarray,
    reference: float,
    cold_delta_c: float = 4.0,
    min_area_px: int = 40,
    action_c: float = 12.0,
    watch_c: float = 7.0,
) -> list[dict[str, Any]]:
    local = cv2.GaussianBlur(temp.astype(np.float32), (0, 0), sigmaX=7, sigmaY=7)
    delta = local - reference
    mask = (delta <= -cold_delta_c).astype(np.uint8)
    if mask.sum() == 0:
        return []

    num_labels, labels, stats, _centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
    anomalies: list[dict[str, Any]] = []
    for label in range(1, num_labels):
        area = int(stats[label, cv2.CC_STAT_AREA])
        if area < min_area_px:
            continue
        component = labels == label
        trough = float(temp[component].min())
        delta_c = reference - trough
        bbox = _bbox_from_mask(component)
        if not bbox:
            continue
        anomalies.append(
            {
                "id": str(uuid.uuid4()),
                "type": "cold_bridge",
                "severity": _severity(delta_c, action_c, watch_c),
                "confidence": min(0.9, 0.5 + delta_c / 25.0),
                "temp_c": round(trough, 2),
                "delta_c": round(delta_c, 2),
                "bbox": bbox,
                "area_px": area,
                "rule_id": "cold_bridge_local",
            }
        )
    return anomalies


def detect_linear_streaks(temp: np.ndarray, reference: float) -> list[dict[str, Any]]:
    hot = (temp >= reference + 6.0).astype(np.uint8) * 255
    edges = cv2.Canny(hot, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=60, minLineLength=40, maxLineGap=8)
    if lines is None:
        return []

    anomalies: list[dict[str, Any]] = []
    for idx, line in enumerate(lines[:8]):
        x1, y1, x2, y2 = [int(v) for v in line[0]]
        anomalies.append(
            {
                "id": str(uuid.uuid4()),
                "type": "linear_streak",
                "severity": "watch",
                "confidence": 0.65,
                "temp_c": None,
                "delta_c": None,
                "bbox": {
                    "x": min(x1, x2),
                    "y": min(y1, y2),
                    "w": abs(x2 - x1) + 1,
                    "h": abs(y2 - y1) + 1,
                },
                "line": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                "rule_id": "linear_streak_hough",
                "note": "Possible moisture streak — verify in field",
            }
        )
    return anomalies


def analyze_temperature_array(
    temp: np.ndarray, params: dict[str, Any] | None = None
) -> list[dict[str, Any]]:
    p = _merge_params(params)
    reference = _reference_temp(temp)
    action_c = float(p["severity_action_c"])
    watch_c = float(p["severity_watch_c"])
    min_area = int(p["min_area_px"])

    anomalies: list[dict[str, Any]] = []
    if p["detect_hot"]:
        anomalies.extend(
            detect_hot_spots(temp, reference, float(p["hot_delta_c"]), min_area, action_c, watch_c)
        )
    if p["detect_cold"]:
        anomalies.extend(
            detect_cold_bridges(temp, reference, float(p["cold_delta_c"]), max(min_area, 40), action_c, watch_c)
        )
    if p["detect_streaks"]:
        anomalies.extend(detect_linear_streaks(temp, reference))
    anomalies.sort(key=lambda row: row.get("delta_c") or 0, reverse=True)
    return anomalies[:25]


def segment_materials_sam_stub(temp: np.ndarray, rgb_preview: bytes | None = None) -> dict[str, Any]:
    """SAM/MobileSAM material segmentation hook for per-region emissivity (Slice 4 advanced).
    In the full implementation this runs MobileSAM on co-registered RGB/thermal to segment
    roof materials, then applies material-specific emissivity from presets for corrected temp.
    Until that GPU step is enabled it returns no regions (status="pending") so that no
    fabricated material data is ever persisted to a session.
    """
    return {
        "status": "pending",
        "regions": [],
        "note": "Material segmentation runs on the GPU advanced job (Slice 4); no regions in CPU pipeline.",
    }
