"""CPU Track L worker: LAS/LAZ/E57 -> Potree octree + flatness derivatives."""

from __future__ import annotations

import hmac
import json
import os
import shutil
import threading
import traceback
from pathlib import Path
from typing import Any

import modal
import numpy as np

try:
    from fastapi import Header
except ModuleNotFoundError:  # pragma: no cover - only the web image serves HTTP

    def Header(default=None, **_kwargs):  # type: ignore[misc]
        return default

from potree_tiling import write_potree
from scan_analysis import analyze_point_cloud
from scan_io import read_scan
from scan_registration import register_scans, voxel_decimate
from worker_net import (
    callback,
    download_sources,
    post_progress,
    s3_client,
    set_progress,
    upload_tree,
)

APP_NAME = "slate360-lidar-scan"
SECRET_NAME = "slate360-twin-worker"
WEB_ENDPOINT_LABEL = "process-lidar-scan"
MAX_DURATION_SECONDS = 45 * 60
POTREE_CONVERTER_BIN = "/usr/local/bin/PotreeConverter"
POTREE_CONVERTER_REF = "1.8"

app = modal.App(APP_NAME)
worker_secret = modal.Secret.from_name(SECRET_NAME)
worker_image = (
    modal.Image.from_registry("ubuntu:22.04", add_python="3.11")
    .apt_install(
        "build-essential",
        "cmake",
        "git",
        "libboost-program-options-dev",
        "libgl1",
        "libglib2.0-0",
        "libgomp1",
        "libpdal-plugin-e57",
        "libtbb-dev",
        "pdal",
    )
    .run_commands(
        f"git clone --depth 1 --branch {POTREE_CONVERTER_REF} "
        "https://github.com/potree/PotreeConverter.git /opt/PotreeConverter",
        "cmake -S /opt/PotreeConverter -B /opt/PotreeConverter/build "
        "-DCMAKE_BUILD_TYPE=Release",
        "cmake --build /opt/PotreeConverter/build --config Release -j2",
        f"install -m 0755 /opt/PotreeConverter/build/PotreeConverter {POTREE_CONVERTER_BIN}",
    )
    .pip_install(
        "boto3==1.35.99",
        "laspy==2.7.0",
        "lazrs==0.8.2",
        "numpy==1.26.4",
        "open3d==0.18.0",
        "pye57==0.4.19",
        "requests==2.32.3",
    )
    .add_local_python_source(
        "potree_tiling",
        "potree_values",
        "scan_analysis",
        "scan_io",
        "scan_registration",
        "worker_net",
    )
)
web_image = modal.Image.debian_slim(python_version="3.11").pip_install("fastapi[standard]")


def run_pipeline(payload: dict[str, Any], root: Path) -> dict[str, Any]:
    bucket = os.environ["R2_BUCKET"]
    s3 = s3_client()
    source_keys = [str(key) for key in payload.get("sourceKeys", [])]
    job_id = str(payload.get("jobId") or "")
    set_progress(job_id, "download", 8)
    paths = download_sources(s3, bucket, source_keys, root)

    set_progress(job_id, "read", 20)
    scans = [read_scan(path, root / "normalized") for path in paths]
    points, colors, registration = register_scans(
        scans, use_icp=payload.get("registerScans", True) is not False
    )
    voxel_size = max(0.001, float(payload.get("voxelSizeM") or 0.01))
    points, colors = voxel_decimate(points, colors, voxel_size)

    set_progress(job_id, "analyze", 55)
    deviations, slopes, flatness, analysis = analyze_point_cloud(points)
    tiles_dir = root / "potree"
    hierarchy = write_potree(
        points,
        colors,
        deviations,
        slopes,
        tiles_dir,
        crs=scans[0].crs,
        converter_bin=POTREE_CONVERTER_BIN,
    )

    analysis_dir = tiles_dir / "analysis"
    analysis_dir.mkdir(parents=True, exist_ok=True)
    (analysis_dir / "flatness.json").write_text(json.dumps(flatness, indent=2) + "\n", encoding="utf-8")
    (analysis_dir / "slope.json").write_text(
        json.dumps(analysis["slopeMap"], indent=2) + "\n", encoding="utf-8"
    )
    (analysis_dir / "contours.geojson").write_text(
        json.dumps(analysis["contours"], separators=(",", ":")) + "\n", encoding="utf-8"
    )
    (analysis_dir / "sections.json").write_text(
        json.dumps(analysis["sections"], separators=(",", ":")) + "\n", encoding="utf-8"
    )

    qc = {
        "contractVersion": "lidar.v1",
        "sourceCount": len(source_keys),
        "sourceFiles": [path.name for path in paths],
        "rawPointCount": int(sum(len(scan.points) for scan in scans)),
        "pointCount": int(len(points)),
        "voxelSizeM": voxel_size,
        "extentM": (np.max(points, axis=0) - np.min(points, axis=0)).tolist(),
        "crs": scans[0].crs,
        "registration": registration,
        "flatness": flatness,
        "pdalAvailable": shutil.which("pdal") is not None,
        "tiling": "potree",
    }
    (tiles_dir / "qc.json").write_text(json.dumps(qc, indent=2) + "\n", encoding="utf-8")

    prefix = f"orgs/{payload['orgId']}/digital-twin/{payload['spaceId']}/models/{job_id}.potree"
    set_progress(job_id, "export", 88)
    upload_tree(s3, bucket, prefix, tiles_dir)
    hierarchy_key = f"{prefix}/hierarchy.json"
    return {
        "outputKey": hierarchy_key,
        "fileSizeBytes": (tiles_dir / "hierarchy.json").stat().st_size,
        "bounds": hierarchy["bounds"],
        "modelFormat": "lidar_potree",
        "qualityMetrics": {
            **qc,
            "derivativeKeys": {
                "lidarHierarchy": hierarchy_key,
                "lidarManifest": hierarchy_key,
                "lidarTilesPrefix": f"{prefix}/tiles/",
                "lidarFlatness": f"{prefix}/analysis/flatness.json",
                "lidarSlope": f"{prefix}/analysis/slope.json",
                "lidarContours": f"{prefix}/analysis/contours.geojson",
                "lidarSections": f"{prefix}/analysis/sections.json",
                "lidarQc": f"{prefix}/qc.json",
            },
        },
        "georef": {
            "status": "ESTIMATED" if scans[0].crs else "UNREGISTERED",
            "crs": scans[0].crs,
        },
    }


@app.function(image=worker_image, secrets=[worker_secret], timeout=MAX_DURATION_SECONDS, retries=0)
def process_job(payload: dict[str, Any]) -> None:
    job_id = str(payload.get("jobId") or "")
    root = Path("/tmp") / f"lidar-job-{job_id or 'unknown'}"
    shutil.rmtree(root, ignore_errors=True)
    root.mkdir(parents=True, exist_ok=True)
    stop_beat = threading.Event()

    def beat() -> None:
        while not stop_beat.wait(60):
            post_progress(job_id)

    threading.Thread(target=beat, daemon=True).start()
    try:
        result = run_pipeline(payload, root)
        callback(
            {
                "jobId": job_id,
                "status": "completed",
                "outputKey": result["outputKey"],
                "modelFormat": result["modelFormat"],
                "fileSizeBytes": result["fileSizeBytes"],
                "newAssetIds": payload.get("newAssetIds", []),
                "bounds": result["bounds"],
                "georef": result["georef"],
                "qualityMetrics": result["qualityMetrics"],
            }
        )
    except Exception as exc:
        print(traceback.format_exc(), flush=True)
        if job_id:
            try:
                callback(
                    {
                        "jobId": job_id,
                        "status": "failed",
                        "errorLog": f"{type(exc).__name__}: {exc}"[:4000],
                    }
                )
            except Exception as callback_exc:
                print(f"[callback] failure callback failed: {callback_exc}", flush=True)
        raise
    finally:
        stop_beat.set()
        shutil.rmtree(root, ignore_errors=True)


@app.function(image=web_image, secrets=[worker_secret], timeout=60)
@modal.fastapi_endpoint(method="POST", label=WEB_ENDPOINT_LABEL)
def process_lidar(body: dict[str, Any], x_dispatch_token: str = Header(default="")):
    from fastapi.responses import JSONResponse

    expected = os.environ.get("GPU_WORKER_SECRET_KEY", "").strip()
    supplied = (x_dispatch_token or "").strip()
    if not expected or not supplied or not hmac.compare_digest(supplied, expected):
        return JSONResponse(status_code=401, content={"error": "invalid dispatch token"})
    if not isinstance(body, dict) or not body.get("jobId") or not body.get("sourceKeys"):
        return JSONResponse(status_code=400, content={"error": "jobId and sourceKeys are required"})
    try:
        call = process_job.spawn(body)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": f"Failed to enqueue job: {exc}"})
    return JSONResponse(
        status_code=200,
        content={"accepted": True, "jobId": body["jobId"]},
        headers={"x-modal-run-id": call.object_id},
    )
