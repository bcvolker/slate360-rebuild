"""Optional scan-to-scan registration and voxel decimation."""

from __future__ import annotations

from typing import Any

import numpy as np

from scan_io import Scan


def _centroid_translation(source: np.ndarray, target: np.ndarray) -> np.ndarray:
    return np.mean(target, axis=0) - np.mean(source, axis=0)


def _try_icp(source: np.ndarray, target: np.ndarray, initial: np.ndarray) -> tuple[np.ndarray, float]:
    try:
        import open3d as o3d
    except ModuleNotFoundError:
        return initial, -1.0

    source_cloud = o3d.geometry.PointCloud()
    source_cloud.points = o3d.utility.Vector3dVector(source[::10].astype(np.float64))
    target_cloud = o3d.geometry.PointCloud()
    target_cloud.points = o3d.utility.Vector3dVector(target[::10].astype(np.float64))
    result = o3d.pipelines.registration.registration_icp(
        source_cloud,
        target_cloud,
        max_correspondence_distance=0.25,
        init=initial,
        estimation_method=o3d.pipelines.registration.TransformationEstimationPointToPoint(),
    )
    return np.asarray(result.transformation, dtype=np.float64), float(result.inlier_rmse)


def register_scans(scans: list[Scan], use_icp: bool = True) -> tuple[np.ndarray, np.ndarray, dict[str, Any]]:
    if not scans:
        raise ValueError("At least one LiDAR scan is required")
    registered_points = [scans[0].points.astype(np.float32, copy=False)]
    registered_colors = [scans[0].colors.astype(np.uint8, copy=False)]
    residuals = [{"source": scans[0].source_name, "registered": True, "rmse": 0.0}]
    reference = scans[0].points

    for scan in scans[1:]:
        transform = np.eye(4, dtype=np.float64)
        transform[:3, 3] = _centroid_translation(scan.points, reference)
        rmse = 0.0
        if use_icp:
            transform, rmse = _try_icp(scan.points, reference, transform)
        points = (scan.points @ transform[:3, :3].T + transform[:3, 3]).astype(np.float32)
        registered_points.append(points)
        registered_colors.append(scan.colors)
        reference = np.concatenate([reference, points], axis=0)
        residuals.append({"source": scan.source_name, "registered": True, "rmse": rmse})

    return (
        np.concatenate(registered_points, axis=0),
        np.concatenate(registered_colors, axis=0),
        {
            "scanCount": len(scans),
            "registrationMethod": "centroid+open3d_icp" if use_icp else "centroid",
            "registrationResiduals": residuals,
        },
    )


def voxel_decimate(
    points: np.ndarray,
    colors: np.ndarray,
    voxel_size: float,
) -> tuple[np.ndarray, np.ndarray]:
    if voxel_size <= 0:
        return points, colors
    origin = np.min(points, axis=0)
    voxel_ids = np.floor((points - origin) / voxel_size).astype(np.int64)
    _, keep = np.unique(voxel_ids, axis=0, return_index=True)
    keep.sort()
    return points[keep], colors[keep]
