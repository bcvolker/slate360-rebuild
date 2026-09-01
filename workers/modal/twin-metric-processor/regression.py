"""HouseWalk / KitchenAprilTags Route C regression bands."""

from __future__ import annotations

from typing import Any

from constants import (
    HOUSEWALK,
    REGRESSION_FLOOR_RMS_ABS_M,
    REGRESSION_POINTS_REL,
    REGRESSION_PSNR_ABS,
    REGRESSION_SSIM_ABS,
)


def flag_housewalk(observed: dict[str, Any]) -> dict[str, Any]:
    """Compare a run (or a synthetic fixture) to Route C. Major deltas are flags, not silent."""
    flags: list[str] = []
    points = observed.get("filtered_points")
    if points is not None:
        rel = abs(points - HOUSEWALK["filtered_points"]) / HOUSEWALK["filtered_points"]
        if rel > REGRESSION_POINTS_REL:
            flags.append(
                f"filtered_points {points} vs Route C {HOUSEWALK['filtered_points']} ({rel:.1%})"
            )
    voxel = observed.get("voxel_mm")
    if voxel is not None and int(voxel) != HOUSEWALK["voxel_mm"]:
        flags.append(f"voxel_mm {voxel} vs Route C {HOUSEWALK['voxel_mm']}")
    rms = observed.get("floor_rms_m")
    if rms is not None and abs(rms - HOUSEWALK["floor_rms_m"]) > REGRESSION_FLOOR_RMS_ABS_M:
        flags.append(f"floor_rms_m {rms:.4f} vs Route C {HOUSEWALK['floor_rms_m']}")
    psnr = observed.get("holdout_psnr")
    if psnr is not None and abs(psnr - HOUSEWALK["holdout_psnr"]) > REGRESSION_PSNR_ABS:
        flags.append(f"holdout_psnr {psnr:.2f} vs Route C {HOUSEWALK['holdout_psnr']}")
    ssim = observed.get("holdout_ssim")
    if ssim is not None and abs(ssim - HOUSEWALK["holdout_ssim"]) > REGRESSION_SSIM_ABS:
        flags.append(f"holdout_ssim {ssim:.3f} vs Route C {HOUSEWALK['holdout_ssim']}")
    return {
        "fixture": "KitchenAprilTags Route C",
        "reference": HOUSEWALK,
        "observed": observed,
        "majorRegression": bool(flags),
        "flags": flags,
    }
