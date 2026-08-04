"""Metric flatness, slope, contour, and section analysis for point clouds."""

from __future__ import annotations

import math
from typing import Any

import numpy as np


def fit_plane(points: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    if len(points) < 3:
        raise ValueError("At least three points are required for plane fitting")
    origin = np.mean(points, axis=0)
    _, _, vh = np.linalg.svd(points - origin, full_matrices=False)
    normal = vh[-1].astype(np.float64)
    if normal[2] < 0:
        normal = -normal
    deviations = ((points - origin) @ normal).astype(np.float32)
    return origin, normal, deviations


def _grid_values(
    points: np.ndarray,
    values: np.ndarray,
    grid_size: int = 96,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    lower = np.min(points[:, :2], axis=0)
    upper = np.max(points[:, :2], axis=0)
    span = np.maximum(upper - lower, 1e-6)
    cell = span / grid_size
    indices = np.floor((points[:, :2] - lower) / cell).astype(np.int64)
    indices = np.clip(indices, 0, grid_size - 1)
    sums = np.zeros((grid_size, grid_size), dtype=np.float64)
    counts = np.zeros((grid_size, grid_size), dtype=np.int64)
    np.add.at(sums, (indices[:, 1], indices[:, 0]), values)
    np.add.at(counts, (indices[:, 1], indices[:, 0]), 1)
    grid = np.full_like(sums, np.nan)
    filled = counts > 0
    grid[filled] = sums[filled] / counts[filled]
    return lower, cell, grid


def _grid_deviation(
    points: np.ndarray,
    deviations: np.ndarray,
    grid_size: int = 96,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    return _grid_values(points, deviations, grid_size)


def _local_slope_degrees(
    elevation: np.ndarray,
    cell: np.ndarray,
    fallback: float,
) -> np.ndarray:
    result = np.full_like(elevation, fallback, dtype=np.float64)
    for y in range(elevation.shape[0]):
        for x in range(elevation.shape[1]):
            if not np.isfinite(elevation[y, x]):
                continue
            gradients: list[float] = []
            for axis, distance in ((0, cell[0]), (1, cell[1])):
                before = (y, x - 1) if axis == 0 else (y - 1, x)
                after = (y, x + 1) if axis == 0 else (y + 1, x)
                before_value = (
                    elevation[before] if 0 <= before[0] < elevation.shape[0] and 0 <= before[1] < elevation.shape[1] else np.nan
                )
                after_value = (
                    elevation[after] if 0 <= after[0] < elevation.shape[0] and 0 <= after[1] < elevation.shape[1] else np.nan
                )
                if np.isfinite(before_value) and np.isfinite(after_value):
                    gradients.append(float(after_value - before_value) / (2.0 * distance))
                elif np.isfinite(after_value):
                    gradients.append(float(after_value - elevation[y, x]) / distance)
                elif np.isfinite(before_value):
                    gradients.append(float(elevation[y, x] - before_value) / distance)
            if gradients:
                result[y, x] = math.degrees(math.atan(float(np.linalg.norm(gradients))))
    return result.astype(np.float32)


def _contours(
    lower: np.ndarray,
    cell: np.ndarray,
    grid: np.ndarray,
    step: float = 0.005,
) -> dict[str, Any]:
    finite = grid[np.isfinite(grid)]
    if not len(finite):
        return {"type": "FeatureCollection", "features": []}
    low = math.floor(float(np.min(finite)) / step) * step
    high = math.ceil(float(np.max(finite)) / step) * step
    levels = np.arange(low, high + step * 0.5, step)
    if len(levels) > 200:
        levels = np.linspace(low, high, 200)
    features: list[dict[str, Any]] = []
    for level in levels:
        for y in range(grid.shape[0] - 1):
            for x in range(grid.shape[1] - 1):
                values = grid[y : y + 2, x : x + 2].reshape(-1)
                if not np.isfinite(values).all() or values.min() > level or values.max() < level:
                    continue
                left = lower + np.array([x * cell[0], (y + 0.5) * cell[1]])
                right = lower + np.array([(x + 1) * cell[0], (y + 0.5) * cell[1]])
                features.append(
                    {
                        "type": "Feature",
                        "properties": {"deviation_m": float(level)},
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [left.tolist(), right.tolist()],
                        },
                    }
                )
    return {"type": "FeatureCollection", "features": features}


def section_profile(
    points: np.ndarray,
    start: np.ndarray,
    end: np.ndarray,
    width: float,
    samples: int = 256,
) -> list[list[float]]:
    axis = end[:2] - start[:2]
    length = float(np.linalg.norm(axis))
    if length <= 1e-6:
        return []
    unit = axis / length
    delta = points[:, :2] - start[:2]
    distance = delta @ unit
    cross = np.abs(delta[:, 0] * unit[1] - delta[:, 1] * unit[0])
    selected = (distance >= 0) & (distance <= length) & (cross <= width)
    if not np.any(selected):
        return []
    order = np.argsort(distance[selected])
    d = distance[selected][order]
    z = points[selected, 2][order]
    if len(d) > samples:
        keep = np.linspace(0, len(d) - 1, samples).astype(np.int64)
        d, z = d[keep], z[keep]
    return [[float(a), float(b)] for a, b in zip(d, z)]


def analyze_point_cloud(
    points: np.ndarray,
    *,
    contour_step_m: float = 0.005,
) -> tuple[np.ndarray, np.ndarray, dict[str, Any], dict[str, Any]]:
    origin, normal, deviations = fit_plane(points)
    slope_degrees = math.degrees(math.acos(float(np.clip(normal[2], -1.0, 1.0))))
    slope = np.full(len(points), slope_degrees, dtype=np.float32)
    lower, cell, grid = _grid_deviation(points, deviations)
    _, _, elevation = _grid_values(points, points[:, 2])
    slope_grid = _local_slope_degrees(elevation, cell, slope_degrees)
    indices = np.floor((points[:, :2] - lower) / cell).astype(np.int64)
    indices = np.clip(indices, 0, slope_grid.shape[0] - 1)
    slope = slope_grid[indices[:, 1], indices[:, 0]]
    contours = _contours(lower, cell, grid, contour_step_m)
    extent = np.max(points, axis=0) - np.min(points, axis=0)
    default_section = section_profile(
        points,
        np.min(points, axis=0),
        np.array([np.max(points[:, 0]), np.min(points[:, 1]), np.min(points[:, 2])]),
        width=max(float(np.max(extent[:2])) * 0.01, 0.02),
    )
    flatness = {
        "planeOrigin": origin.tolist(),
        "planeNormal": normal.tolist(),
        "slopeDegrees": slope_degrees,
        "signedDeviationMinM": float(np.min(deviations)),
        "signedDeviationMaxM": float(np.max(deviations)),
        "signedDeviationRmsM": float(np.sqrt(np.mean(deviations**2))),
        "contourIntervalM": contour_step_m,
        "gridOrigin": lower.tolist(),
        "gridCellM": cell.tolist(),
        "gridSize": int(grid.shape[0]),
    }
    sections = {
        "default": {
            "start": np.min(points, axis=0).tolist(),
            "end": [float(np.max(points[:, 0])), float(np.min(points[:, 1])), float(np.min(points[:, 2]))],
            "profile": default_section,
        }
    }
    return deviations, slope, flatness, {
        "contours": contours,
        "sections": sections,
        "slopeMap": {
            "gridOrigin": lower.tolist(),
            "gridCellM": cell.tolist(),
            "gridDegrees": slope_grid.tolist(),
        },
    }
