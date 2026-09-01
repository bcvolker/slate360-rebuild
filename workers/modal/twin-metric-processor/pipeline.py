"""Orchestrate ingest → dense cloud → TSDF → QA → optional Gaussian → derivatives."""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

from arkit_io import load_pose_frames
from constants import (
    DEFAULT_VOXEL_MM,
    ENGINEERING_MAX_DEPTH_M,
    GAUSSIAN_STEPS,
    MAX_DEPTH_M,
    MIN_CONFIDENCE,
    MIN_DEPTH_M,
    PROCESSOR_VERSION,
    ROUTE_C_REFERENCE,
)
from dense_cloud import build_dense_cloud
from derivatives import floor_slice_png, maybe_spz, thumbnail_png, write_manifests
from gaussian_fixed import build_dataset, train_config
from ingest import IngestError, validate_ingest
from metric_qa import report_qa
from metric_tsdf import integrate_tsdf
from regression import flag_housewalk


def _jsonable(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _jsonable(v) for k, v in obj.items() if k not in {"xyz", "rgb", "headXyz", "tailXyz", "mesh"}}
    if isinstance(obj, list):
        return [_jsonable(v) for v in obj]
    return obj


def run_metric_processor(
    depth_path: str | Path,
    poses_path: str | Path,
    out_dir: str | Path,
    *,
    preview_ply: str | Path | None = None,
    voxel_mm: int = DEFAULT_VOXEL_MM,
    min_conf: int = MIN_CONFIDENCE,
    min_d: float = MIN_DEPTH_M,
    max_d: float = MAX_DEPTH_M,
    skip_gaussian: bool = True,
    depth_loss: bool = False,
    gaussian_steps: int = GAUSSIAN_STEPS,
    engineering_range: bool = False,
) -> dict[str, Any]:
    t0 = time.time()
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    timings: dict[str, float] = {}
    if engineering_range:
        max_d = ENGINEERING_MAX_DEPTH_M

    t = time.time()
    ingest = validate_ingest(depth_path, poses_path, preview_ply=preview_ply)
    timings["ingest"] = time.time() - t
    if ingest["preview"].get("usedAsMaster"):
        raise IngestError("preview PLY must never be reconstruction truth")

    t = time.time()
    cloud = build_dense_cloud(
        depth_path,
        poses_path,
        out / "processing_master.ply",
        min_conf=min_conf,
        min_d=min_d,
        max_d=max_d,
    )
    timings["dense_cloud"] = time.time() - t

    t = time.time()
    tsdf = integrate_tsdf(
        depth_path, poses_path, out, voxel_mm=voxel_mm, min_confidence=min_conf,
        min_depth_m=min_d, depth_trunc_m=max_d,
    )
    timings["tsdf"] = time.time() - t

    frames = load_pose_frames(poses_path)
    qa = report_qa(
        cloud["xyz"],
        frames,
        mesh=tsdf.get("mesh"),
        head_xyz=cloud["headXyz"],
        tail_xyz=cloud["tailXyz"],
    )
    slice_info = floor_slice_png(cloud["xyz"], out / "floor_slice.png")
    thumb = thumbnail_png(cloud["xyz"], out / "thumbnail.png")

    gaussian: dict[str, Any] = train_config(steps=gaussian_steps, depth_loss=depth_loss)
    gaussian["skipped"] = True
    if not skip_gaussian:
        t = time.time()
        dataset = build_dataset(
            depth_path, poses_path, cloud["xyz"], cloud["rgb"], out / "gsplat_dataset"
        )
        from gaussian_train import train_gsplat

        trained = train_gsplat(
            dataset["datasetDir"], out, steps=gaussian_steps, depth_loss=depth_loss
        )
        spz = maybe_spz(out / "appearance_raw.ply", out / "appearance.spz")
        trained["spz"] = spz
        trained["dataset"] = dataset
        gaussian = trained
        gaussian["skipped"] = False
        timings["gaussian"] = time.time() - t

    observed = {
        "filtered_points": cloud["points"],
        "voxel_mm": tsdf["voxelMm"],
        "floor_rms_m": (qa.get("floor") or {}).get("residual_rms_m"),
        "holdout_psnr": ((gaussian.get("holdout") or {}).get("psnr_mean")),
        "holdout_ssim": ((gaussian.get("holdout") or {}).get("ssim_mean")),
    }
    regression = flag_housewalk(observed)
    timings["total"] = time.time() - t0

    manifest = {
        "processor": PROCESSOR_VERSION,
        "reference": ROUTE_C_REFERENCE,
        "geometryIsMeasurementTruth": True,
        "gaussianIsAppearance": True,
        "previewPlyUsedAsMaster": False,
        "ingest": ingest,
        "denseCloud": {
            "points": cloud["points"],
            "rangeM": cloud["rangeM"],
            "noPointCap": True,
            "aabb": cloud["aabb"],
            "ply": cloud["outPly"],
        },
        "tsdf": _jsonable(tsdf),
        "gaussian": _jsonable(gaussian),
        "products": {
            "geometry.glb": tsdf.get("geometryGlb"),
            "engineering_mesh": tsdf.get("engineeringPly"),
            "reconstruction_master": tsdf.get("rawMasterPly"),
            "processing_master.ply": cloud["outPly"],
            "appearance.ply": str(out / "appearance.ply") if (out / "appearance.ply").is_file() else None,
            "appearance.spz": str(out / "appearance.spz") if (out / "appearance.spz").is_file() else None,
            "floor_slice.png": slice_info["path"],
            "thumbnail.png": thumb["path"],
        },
        "timingsSec": timings,
        "depthLossFlag": bool(depth_loss),
        "envDepthLoss": os.environ.get("METRIC_DEPTH_LOSS", ""),
    }
    paths = write_manifests(out, manifest, {**qa, "regression": regression, "timingsSec": timings})
    return {
        "ok": True,
        "outDir": str(out),
        "ingest": ingest,
        "denseCloud": {k: cloud[k] for k in ("points", "rangeM", "aabb", "outPly", "headTailOverlap")},
        "tsdf": _jsonable(tsdf),
        "qa": qa,
        "gaussian": _jsonable(gaussian),
        "regression": regression,
        "products": manifest["products"],
        "manifests": paths,
        "timingsSec": timings,
    }
