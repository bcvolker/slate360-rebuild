"""Radiometric extraction helpers for drone thermal R-JPEG files."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


def run_exiftool_json(filepath: Path) -> dict[str, Any]:
    proc = subprocess.run(
        ["exiftool", "-j", "-G1", "-a", str(filepath)],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0 or not proc.stdout.strip():
        return {}
    rows = json.loads(proc.stdout)
    return rows[0] if rows else {}


def extract_binary_tag(filepath: Path, tag: str) -> bytes:
    proc = subprocess.run(
        ["exiftool", "-b", f"-{tag}", str(filepath)],
        capture_output=True,
        check=False,
    )
    return proc.stdout or b""


def _find_meta(meta: dict[str, Any], *names: str) -> float | None:
    lowered = {k.lower(): v for k, v in meta.items()}
    for name in names:
        target = name.lower()
        for key, value in lowered.items():
            if key.endswith(target) or target in key:
                try:
                    return float(value)
                except (TypeError, ValueError):
                    continue
    return None


def detect_sensor(meta: dict[str, Any]) -> tuple[str, str, str]:
    make = str(meta.get("EXIF:Make") or meta.get("Make") or "Unknown")
    model = str(meta.get("EXIF:Model") or meta.get("Model") or "Unknown")
    upper_make = make.upper()
    upper_model = model.upper()

    if "DJI" in upper_make or "DJI" in upper_model:
        return "dji", make, model
    if "AUTEL" in upper_make:
        return "autel", make, model
    if "FLIR" in upper_make:
        return "flir", make, model
    return "generic", make, model


def infer_dimensions(meta: dict[str, Any], binary_len: int, profile: str) -> tuple[int, int]:
    for w_key, h_key in (
        ("ThermalImageWidth", "ThermalImageHeight"),
        ("ImageWidth", "ImageHeight"),
        ("EXIF:ImageWidth", "EXIF:ImageHeight"),
    ):
        w = _find_meta(meta, w_key)
        h = _find_meta(meta, h_key)
        if w and h:
            return int(w), int(h)

    defaults = {
        "dji": (640, 512),
        "autel": (640, 512),
        "flir": (640, 480),
        "generic": (640, 512),
    }
    width, height = defaults.get(profile, (640, 512))
    if width * height * 2 <= binary_len:
        return width, height

    side = int(math.sqrt(binary_len // 2))
    return side, side


def pick_extraction_tags(profile: str) -> list[str]:
    if profile == "dji":
        return ["ThermalData", "ThermalImage", "EmbeddedImage"]
    if profile == "autel":
        return ["ThermalData", "EmbeddedImage", "RawThermalImage"]
    if profile == "flir":
        return ["RawThermalImage", "ThermalImage", "ThermalData"]
    return ["RawThermalImage", "ThermalImage", "ThermalData", "EmbeddedImage"]


def flir_raw_to_celsius(raw: np.ndarray, meta: dict[str, Any]) -> tuple[np.ndarray | None, bool]:
    r1 = _find_meta(meta, "PlanckR1")
    r2 = _find_meta(meta, "PlanckR2") or 1.0
    b = _find_meta(meta, "PlanckB")
    f = _find_meta(meta, "PlanckF") or 1.0
    o = _find_meta(meta, "PlanckO") or 0.0

    if r1 is None or b is None:
        return None, False

    s = raw.astype(np.float64)
    denom = np.log(np.maximum(r1 / (r2 * (s + o)) + f, 1e-9))
    kelvin = b / denom
    return (kelvin - 273.15).astype(np.float32), True


def dji_raw_to_celsius(raw: np.ndarray, meta: dict[str, Any]) -> tuple[np.ndarray, bool]:
    scale = _find_meta(meta, "ScaleFactor") or 0.1
    offset_k = _find_meta(meta, "Offset") or 273.15
    temp_c = raw.astype(np.float32) * scale - offset_k
    return temp_c, True


def autel_raw_to_celsius(raw: np.ndarray, meta: dict[str, Any]) -> tuple[np.ndarray, bool]:
    ambient = _find_meta(meta, "AmbientTemperature", "AtmosphericTemperature", "ReflectedApparentTemperature")
    emissivity = _find_meta(meta, "Emissivity", "ObjectEmissivity") or 0.91

    if ambient is not None:
        span = float(np.percentile(raw, 99) - np.percentile(raw, 1))
        if span <= 0:
            span = 1.0
        delta = (raw.astype(np.float32) - float(np.median(raw))) * (40.0 / span)
        return (ambient + delta / max(emissivity, 0.05)).astype(np.float32), False

    return raw.astype(np.float32), False


def convert_raw_to_celsius(
    raw: np.ndarray,
    meta: dict[str, Any],
    profile: str,
) -> tuple[np.ndarray, bool, str]:
    if profile == "flir":
        converted, absolute = flir_raw_to_celsius(raw, meta)
        if converted is not None:
            return converted, absolute, "flir_planck"
        return raw.astype(np.float32), False, "flir_relative"

    if profile == "dji":
        converted, absolute = dji_raw_to_celsius(raw, meta)
        return converted, absolute, "dji_linear"

    if profile == "autel":
        converted, absolute = autel_raw_to_celsius(raw, meta)
        return converted, absolute, "autel_ambient_delta"

    slope = _find_meta(meta, "ThermalCalibrationSlope", "CalculationSlope")
    offset = _find_meta(meta, "ThermalCalibrationOffset", "CalculationOffset")
    if slope is not None and offset is not None:
        emissivity = _find_meta(meta, "Emissivity", "ObjectEmissivity") or 0.95
        return ((raw * slope + offset) / max(emissivity, 0.05)).astype(np.float32), True, "linear_meta"

    return raw.astype(np.float32), False, "generic_relative"


def extract_raw_matrix(filepath: Path, meta: dict[str, Any]) -> tuple[np.ndarray | None, dict[str, Any]]:
    profile, make, model = detect_sensor(meta)
    tags = pick_extraction_tags(profile)

    raw_bytes = b""
    used_tag = None
    for tag in tags:
        candidate = extract_binary_tag(filepath, tag)
        if len(candidate) > 1024:
            raw_bytes = candidate
            used_tag = tag
            break

    if not raw_bytes:
        return None, {
            "parser_id": profile,
            "sensor_make": make,
            "sensor_model": model,
            "is_radiometric": False,
            "error": "No thermal binary block found in file",
        }

    width, height = infer_dimensions(meta, len(raw_bytes), profile)
    raw_u16 = np.frombuffer(raw_bytes, dtype=np.uint16)
    expected = width * height
    if raw_u16.size < expected:
        return None, {
            "parser_id": profile,
            "sensor_make": make,
            "sensor_model": model,
            "is_radiometric": False,
            "error": f"Thermal binary too small ({raw_u16.size} < {expected})",
        }

    matrix = raw_u16[:expected].reshape((height, width))
    temp_c, absolute, parser_id = convert_raw_to_celsius(matrix, meta, profile)
    emissivity = _find_meta(meta, "Emissivity", "ObjectEmissivity") or 0.95

    return temp_c, {
        "parser_id": parser_id,
        "sensor_make": make,
        "sensor_model": model,
        "extraction_tag": used_tag,
        "emissivity_used": emissivity,
        "absolute_celsius": absolute,
        "is_radiometric": True,
        "width": width,
        "height": height,
    }


def laplacian_blur_score(temp_array: np.ndarray) -> float:
    import cv2

    normalized = temp_array - float(np.min(temp_array))
    span = float(np.max(normalized))
    if span <= 0:
        return 0.0
    gray = (normalized / span * 255).astype(np.uint8)
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    return float(lap.var())


def saturation_fraction(temp_array: np.ndarray) -> float:
    if temp_array.size == 0:
        return 0.0
    lo, hi = float(np.min(temp_array)), float(np.max(temp_array))
    if hi <= lo:
        return 1.0
    margin = (hi - lo) * 0.01
    at_extremes = np.logical_or(temp_array <= lo + margin, temp_array >= hi - margin)
    return float(np.mean(at_extremes))


def build_quality_metrics(
    temp_array: np.ndarray | None,
    meta: dict[str, Any],
    extract_meta: dict[str, Any],
) -> dict[str, Any]:
    if temp_array is None:
        return {
            "confidence_score": 0,
            "is_radiometric": False,
            "has_parallax_risk": False,
            "error": extract_meta.get("error", "Extraction failed"),
        }

    blur = laplacian_blur_score(temp_array)
    saturation = saturation_fraction(temp_array)
    gps_present = any(k in meta for k in ("GPSLatitude", "Composite:GpsLatitude", "GPSPosition"))

    score = 1.0
    if blur < 50:
        score -= 0.25
    if saturation > 0.12:
        score -= 0.2
    if not gps_present:
        score -= 0.1
    if not extract_meta.get("absolute_celsius"):
        score -= 0.15

    return {
        "confidence_score": max(0.0, round(score, 3)),
        "is_radiometric": bool(extract_meta.get("is_radiometric")),
        "has_parallax_risk": extract_meta.get("parser_id", "").startswith(("dji", "autel")),
        "blur_score": round(blur, 2),
        "saturation_pct": round(saturation, 4),
        "gps_present": gps_present,
        "min_temp_c": float(np.min(temp_array)),
        "max_temp_c": float(np.max(temp_array)),
        "avg_temp_c": float(np.mean(temp_array)),
        "sensor_make": extract_meta.get("sensor_make"),
        "sensor_model": extract_meta.get("sensor_model"),
        "parser_id": extract_meta.get("parser_id"),
        "absolute_celsius": extract_meta.get("absolute_celsius", False),
    }


def false_color_preview(temp_array: np.ndarray, output_path: Path) -> None:
    lo, hi = float(np.min(temp_array)), float(np.max(temp_array))
    span = hi - lo if hi > lo else 1.0
    normalized = (temp_array - lo) / span
    rgba = (plt_colormap_inferno(normalized) * 255).astype(np.uint8)
    Image.fromarray(rgba[:, :, :3]).save(output_path, format="JPEG", quality=88)


def plt_colormap_inferno(values: np.ndarray) -> np.ndarray:
    import matplotlib.cm as cm

    return cm.get_cmap("inferno")(values)
