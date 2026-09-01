"""Slate360 Twin Metric Processor V1 — Modal worker.

Geometry from .s360depth + ARKit c2w keyframes. Preview PLY is never the master.
Gaussian appearance is optional (gsplat Apache-2, cameras frozen).
"""

from __future__ import annotations

import hmac
import os
import shutil
import traceback
from pathlib import Path
from typing import Any

import modal

try:
    from fastapi import Header
except ModuleNotFoundError:  # pragma: no cover

    def Header(default=None, **_kwargs):  # type: ignore[misc]
        return default

APP_NAME = "slate360-twin-metric-processor"
SECRET_NAME = "slate360-twin-worker"
WEB_ENDPOINT_LABEL = "process-metric"
GPU_TYPE = "A10G"
MAX_DURATION_SECONDS = 7200
PROCESSOR_LABEL = "twin-metric-processor.v1"

app = modal.App(APP_NAME)
worker_secret = modal.Secret.from_name(SECRET_NAME)
worker_image = (
    modal.Image.from_registry("nvidia/cuda:12.1.1-runtime-ubuntu22.04", add_python="3.11")
    .apt_install("libgl1", "libglib2.0-0", "libgomp1")
    .pip_install(
        "numpy==1.26.4",
        "open3d==0.18.0",
        "pillow==10.4.0",
        "boto3==1.35.99",
        "requests==2.32.3",
        "torch==2.4.1",
        "gsplat==1.5.3",
    )
    .add_local_python_source(
        "constants",
        "arkit_io",
        "ingest",
        "dense_cloud",
        "metric_qa",
        "metric_tsdf",
        "gaussian_fixed",
        "gaussian_train",
        "derivatives",
        "regression",
        "pipeline",
        "worker_net",
    )
)
web_image = modal.Image.debian_slim(python_version="3.11").pip_install("fastapi[standard]")


def maybe_decompress(path: Path) -> Path:
    if path.suffix == ".gz" or path.name.endswith(".json.gz") or path.name.endswith(".s360depth.gz"):
        import gzip

        raw = path.with_suffix("") if path.suffix == ".gz" else Path(str(path) + ".decoded")
        if path.name.endswith(".json.gz"):
            raw = path.with_name(path.name.replace(".json.gz", ".json"))
        if path.name.endswith(".s360depth.gz"):
            raw = path.with_name(path.name.replace(".s360depth.gz", ".s360depth"))
        raw.write_bytes(gzip.decompress(path.read_bytes()))
        return raw
    return path


def _suffix_path(root: Path, key: str, name: str) -> Path:
    suffix = Path(key).suffix or ""
    return root / f"{name}{suffix}"


def run_cloud_job(payload: dict[str, Any], root: Path) -> dict[str, Any]:
    from pipeline import run_metric_processor
    from worker_net import download_key, s3_client, set_progress, upload_file

    bucket = os.environ["R2_BUCKET"]
    s3 = s3_client()
    job_id = str(payload.get("jobId") or "")
    depth_key = payload.get("lidarDepthKey")
    poses_key = payload.get("lidarPosesKey")
    if not depth_key or not poses_key:
        raise RuntimeError("metric processor requires lidarDepthKey and lidarPosesKey")
    if payload.get("lidarPlyKey"):
        print("[metric] ignoring lidarPlyKey — preview PLY is not reconstruction truth", flush=True)

    set_progress(job_id, "download", 8)
    depth_path = maybe_decompress(
        download_key(s3, bucket, str(depth_key), _suffix_path(root / "in", str(depth_key), "depth"))
    )
    poses_path = maybe_decompress(
        download_key(s3, bucket, str(poses_key), _suffix_path(root / "in", str(poses_key), "poses"))
    )

    preview = None
    preview_key = payload.get("previewPlyKey") or payload.get("lidarPlyKey")
    if preview_key:
        preview = download_key(s3, bucket, str(preview_key), root / "in" / "preview_point_cloud.ply")

    skip_gaussian = payload.get("skipGaussian") is True
    depth_loss = bool(payload.get("depthLoss") or os.environ.get("METRIC_DEPTH_LOSS") == "1")
    voxel_mm = int(payload.get("voxelMm") or 15)
    engineering = bool(payload.get("engineeringRange"))
    out = root / "out"
    set_progress(job_id, "process", 20)
    result = run_metric_processor(
        depth_path,
        poses_path,
        out,
        preview_ply=preview,
        voxel_mm=voxel_mm,
        skip_gaussian=skip_gaussian,
        depth_loss=depth_loss,
        engineering_range=engineering,
    )
    prefix = f"orgs/{payload['orgId']}/digital-twin/{payload['spaceId']}/models/{job_id}"
    set_progress(job_id, "upload", 88)
    products = result["products"]
    glb = Path(products["geometry.glb"]) if products.get("geometry.glb") else None
    if not glb or not glb.is_file():
        raise RuntimeError("TSDF did not produce geometry.glb")
    glb_key = f"{prefix}/geometry.glb"
    upload_file(s3, bucket, glb_key, glb, "model/gltf-binary")
    derivative_keys = {"geometryGlb": glb_key}
    mapping = [
        ("processing_master.ply", "processingMasterPly", "application/octet-stream"),
        ("reconstruction_master", "reconstructionMasterPly", "application/octet-stream"),
        ("appearance.ply", "appearancePly", "application/octet-stream"),
        ("appearance.spz", "appearanceSpz", "application/octet-stream"),
        ("floor_slice.png", "floorSlicePng", "image/png"),
        ("thumbnail.png", "thumbnailPng", "image/png"),
    ]
    for local_name, key_name, ctype in mapping:
        path = products.get(local_name)
        if path and Path(path).is_file():
            key = f"{prefix}/{Path(path).name}"
            upload_file(s3, bucket, key, Path(path), ctype)
            derivative_keys[key_name] = key
    for name in ("processing_manifest.json", "qa.json"):
        path = out / name
        if path.is_file():
            key = f"{prefix}/{name}"
            upload_file(s3, bucket, key, path, "application/json")
            derivative_keys[name.replace(".", "_")] = key

    return {
        "outputKey": glb_key,
        "fileSizeBytes": glb.stat().st_size,
        "modelFormat": "glb",
        "qualityMetrics": {
            "contractVersion": PROCESSOR_LABEL,
            **result["denseCloud"],
            "qa": result["qa"],
            "gaussian": result["gaussian"],
            "regression": result["regression"],
            "timingsSec": result["timingsSec"],
            "derivativeKeys": derivative_keys,
            "geometryIsMeasurementTruth": True,
            "gaussianIsAppearance": True,
        },
    }


@app.function(
    image=worker_image,
    gpu=GPU_TYPE,
    secrets=[worker_secret],
    timeout=MAX_DURATION_SECONDS,
    retries=0,
)
def process_job(payload: dict[str, Any]) -> None:
    from worker_net import callback, post_progress
    import threading

    job_id = str(payload.get("jobId") or "")
    root = Path("/tmp") / f"metric-job-{job_id or 'unknown'}"
    shutil.rmtree(root, ignore_errors=True)
    root.mkdir(parents=True, exist_ok=True)
    stop_beat = threading.Event()

    def beat() -> None:
        while not stop_beat.wait(60):
            post_progress(job_id)

    threading.Thread(target=beat, daemon=True).start()
    try:
        result = run_cloud_job(payload, root)
        callback(
            {
                "jobId": job_id,
                "status": "completed",
                "outputKey": result["outputKey"],
                "modelFormat": result["modelFormat"],
                "fileSizeBytes": result["fileSizeBytes"],
                "newAssetIds": payload.get("newAssetIds", []),
                "qualityMetrics": result["qualityMetrics"],
            }
        )
    except Exception as exc:
        print(traceback.format_exc(), flush=True)
        if job_id:
            try:
                callback({"jobId": job_id, "status": "failed", "errorLog": f"{type(exc).__name__}: {exc}"[:4000]})
            except Exception as callback_exc:
                print(f"[callback] failure callback failed: {callback_exc}", flush=True)
        raise
    finally:
        stop_beat.set()
        shutil.rmtree(root, ignore_errors=True)


@app.function(image=web_image, secrets=[worker_secret], timeout=60)
@modal.fastapi_endpoint(method="POST", label=WEB_ENDPOINT_LABEL)
def process_metric(body: dict[str, Any], x_dispatch_token: str = Header(default="")):
    from fastapi.responses import JSONResponse

    expected = os.environ.get("GPU_WORKER_SECRET_KEY", "").strip()
    supplied = (x_dispatch_token or "").strip()
    if not expected or not supplied or not hmac.compare_digest(supplied, expected):
        return JSONResponse(status_code=401, content={"error": "invalid dispatch token"})
    if not isinstance(body, dict) or not body.get("jobId"):
        return JSONResponse(status_code=400, content={"error": "jobId is required"})
    if not body.get("lidarDepthKey") or not body.get("lidarPosesKey"):
        return JSONResponse(status_code=400, content={"error": "lidarDepthKey and lidarPosesKey are required"})
    try:
        call = process_job.spawn(body)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": f"Failed to enqueue job: {exc}"})
    return JSONResponse(
        status_code=200,
        content={"accepted": True, "jobId": body["jobId"]},
        headers={"x-modal-run-id": call.object_id},
    )
