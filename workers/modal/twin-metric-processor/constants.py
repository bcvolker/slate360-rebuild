"""Twin Metric Processor V1 defaults, locked to iPhone Route C."""

from __future__ import annotations

PROCESSOR_VERSION = "twin-metric-processor.v1"
ROUTE_C_REFERENCE = "KitchenAprilTags / 2026-08-31T16-45-route-c-iphone-metric"

# ARKit confidence: 0 low, 1 medium, 2 high.
MIN_CONFIDENCE = 1
MIN_DEPTH_M = 0.25
MAX_DEPTH_M = 5.0
ENGINEERING_MAX_DEPTH_M = 8.0

# Route C selected 15 mm. 5 mm is research-only and is not a production option.
ALLOWED_VOXEL_MM = (10, 15, 20)
DEFAULT_VOXEL_MM = 15

TIMESTAMP_TOLERANCE_S = 0.12
HOLDOUT_EVERY = 8
GAUSSIAN_STEPS = 25_000
GAUSSIAN_INIT_POINTS = 500_000
NO_POINT_CAP = True
PREVIEW_PLY_ROLE = "point_cloud_preview"

# HouseWalk / KitchenAprilTags Route C regression band (implementation noise allowed).
HOUSEWALK = {
    "filtered_points": 9_381_038,
    "filtered_points_025_5": 9_380_987,
    "voxel_mm": 15,
    "floor_rms_m": 0.008,
    "holdout_psnr": 23.46,
    "holdout_ssim": 0.800,
    "frames": 225,
}
# Flag a major regression; do not fail on a few percent of implementation noise.
REGRESSION_POINTS_REL = 0.08
REGRESSION_FLOOR_RMS_ABS_M = 0.006
REGRESSION_PSNR_ABS = 2.0
REGRESSION_SSIM_ABS = 0.05
