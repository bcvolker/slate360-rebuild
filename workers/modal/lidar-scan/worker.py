"""CPU Track L worker: LAS/LAZ/E57 -> Potree octree + flatness derivatives."""

from __future__ import annotations

import hashlib
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

from scan_analysis import analyze_point_cloud
from scan_io import read_scan
from scan_registration import register_scans, voxel_decimate
from scan_tiling import write_octree

APP_NAME = "slate360-lidar-scan"
SECRET_NAME = "slate360-twin-worker"
WEB_ENDPOINT_LABEL = "process-lidar-scan"
MAX_DURATION_SECONDS = 45 * 60
POTREE_CONVERTER_URL = (
    "https://github.com/potree/PotreeConverter/releases/download/"
    "2.1.1/PotreeConverter_linux_x64.zip"
)

app = modal.App(APP_NAME)
worker_secret = modal.Secret.from_name(SECRET_NAME)
worker_image = (
    modal.Image.from_registry("ubuntu:22.04", add_python="3.11")
    .apt_install(
        "pdal",
        "libpdal-plugin-e57",
        "libgl1",
        "libglib2.0-0",
        "libgomp1",
        "curl",
        "ca-certificates",
        "unzip",
    )
    .run_commands(
        # Bake PotreeConverter into the image (§7.8). Fail the image build if the
        # pinned release is unreachable — do not fall back to a runtime download.
        "mkdir -p /opt/potree",
        f"curl -fsSL {POTREE_CONVERTER_URL} -o /tmp/PotreeConverter.zip",
        "unzip -o /tmp/PotreeConverter.zip -d /opt/potree",
        "BIN=$(find /opt/potree -type f -name PotreeConverter | head -n1); "
        "test -n \"$BIN\"; ln -sf \"$BIN\" /opt/potree/PotreeConverter; "
        "chmod +x /opt/potree/PotreeConverter; /opt/potree/PotreeConverter --help >/dev/null || true",
        "rm -f /tmp/PotreeConverter.zip",
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
    .add_local_python_source("scan_analysis", "scan_io", "scan_registration", "scan_tiling")
)
web_image = modal.Image.debian_slim(python_version="3.11").pip_install("fastapi[standard]")

_progress = {"stage": "queued", "progress_pct": 0}
_progress_lock = threading.Lock()


def _set_progress(job_id: str, stage: str, progress_pct: int) -> None:
    with _progress_lock:
        _progress["stage"] = stage
        _progress["progress_pct"] = progress_pct
    _post_progress(job_id)


def _s3_client():
    import boto3

    endpoint = os.environ.get("R2_ENDPOINT", "").strip()
    if not endpoint and os.environ.get("CLOUDFLARE_ACCOUNT_ID"):
        endpoint = f"https://{os.environ['CLOUDFLARE_ACCOUNT_ID']}.r2.cloudflarestorage.com"
    if not endpoint:
        raise RuntimeError("R2_ENDPOINT or CLOUDFLARE_ACCOUNT_ID is required")
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name=os.environ.get("R2_REGION", "auto"),
    )


def _post_progress(job_id: str) -> None:
    if not job_id:
        return
    try:
        import requests

        with _progress_lock:
            body = {"jobId": job_id, **_progress}
        raw = json.dumps(body, separators=(",", ":"), allow_nan=False).encode()
        signature = hmac.new(os.environ["GPU_WORKER_SECRET_KEY"].encode(), raw, hashlib.sha256).hexdigest()
        requests.post(
            f"{os.environ['SITE_URL'].rstrip('/')}/api/twin/jobs/{job_id}/progress",
            data=raw,
            headers={"Content-Type": "application/json", "x-worker-signature": f"sha256={signature}"},
            timeout=15,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[progress] non-fatal heartbeat failure: {exc}", flush=True)


def _callback(payload: dict[str, Any]) -> None:
    import requests

    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()
    signature = hmac.new(os.environ["GPU_WORKER_SECRET_KEY"].encode(), raw, hashlib.sha256).hexdigest()
    response = requests.post(
        f"{os.environ['SITE_URL'].rstrip('/')}/api/digital-twin/jobs/callback",
        data=raw,
        headers={"Content-Type": "application/json", "x-worker-signature": f"sha256={signature}"},
        timeout=60,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Callback rejected ({response.status_code}): {response.text[:1000]}")


def _download_sources(s3: Any, bucket: str, keys: list[str], root: Path) -> list[Path]:
    source_dir = root / "sources"
    source_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for index, key in enumerate(keys):
        suffix = Path(key).suffix.lower()
        if suffix not in {".las", ".laz", ".e57"}:
            raise RuntimeError(f"Unsupported LiDAR source extension: {suffix}")
        path = source_dir / f"scan_{index:04d}{suffix}"
        s3.download_file(bucket, key, str(path))
        paths.append(path)
    return paths


def _upload_tree(s3: Any, bucket: str, root: Path, prefix: str, path: Path) -> None:
    for item in path.rglob("*"):
        if item.is_file():
            key = f"{prefix}/{item.relative_to(path).as_posix()}"
            content_type = "application/json" if item.suffix == ".json" or item.suffix == ".geojson" else "application/octet-stream"
            s3.upload_file(str(item), bucket, key, ExtraArgs={"ContentType": content_type, "CacheControl": "public, max-age=31536000, immutable"})


def run_pipeline(payload: dict[str, Any], root: Path) -> dict[str, Any]:
    bucket = os.environ["R2_BUCKET"]
    s3 = _s3_client()
    source_keys = [str(key) for key in payload.get("sourceKeys", [])]
    job_id = str(payload.get("jobId") or "")
    _set_progress(job_id, "download", 8)
    paths = _download_sources(s3, bucket, source_keys, root)

    _set_progress(job_id, "read", 20)
    scans = [read_scan(path, root / "normalized") for path in paths]
    points, colors, registration = register_scans(scans, use_icp=payload.get("registerScans", True) is not False)
    voxel_size = max(0.001, float(payload.get("voxelSizeM") or 0.01))
    points, colors = voxel_decimate(points, colors, voxel_size)

    _set_progress(job_id, "analyze", 55)
    deviations, slopes, flatness, analysis = analyze_point_cloud(points)
    tiles_dir = root / "tiles"
    manifest = write_octree(points, colors, deviations, slopes, tiles_dir, crs=scans[0].crs)
    manifest["analysis"] = {
        "flatness": "analysis/flatness.json",
        "slope": "analysis/slope.json",
        "contours": "analysis/contours.geojson",
        "sections": "analysis/sections.json",
    }
    (tiles_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    analysis_dir = tiles_dir / "analysis"
    analysis_dir.mkdir(parents=True, exist_ok=True)
    (analysis_dir / "flatness.json").write_text(json.dumps(flatness, indent=2) + "\n", encoding="utf-8")
    (analysis_dir / "slope.json").write_text(json.dumps(analysis["slopeMap"], indent=2) + "\n", encoding="utf-8")
    (analysis_dir / "contours.geojson").write_text(json.dumps(analysis["contours"], separators=(",", ":")) + "\n", encoding="utf-8")
    (analysis_dir / "sections.json").write_text(json.dumps(analysis["sections"], separators=(",", ":")) + "\n", encoding="utf-8")

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
    }
    (tiles_dir / "qc.json").write_text(json.dumps(qc, indent=2) + "\n", encoding="utf-8")

    prefix = f"orgs/{payload['orgId']}/digital-twin/{payload['spaceId']}/models/{job_id}.potree"
    _set_progress(job_id, "export", 88)
    _upload_tree(s3, bucket, tiles_dir, prefix, tiles_dir)
    manifest_key = f"{prefix}/manifest.json"
    return {
        "outputKey": manifest_key,
        "fileSizeBytes": (tiles_dir / "manifest.json").stat().st_size,
        "bounds": manifest["bounds"],
        "modelFormat": "lidar_potree",
        "qualityMetrics": {
            **qc,
            "derivativeKeys": {
                "lidarManifest": manifest_key,
                "lidarHierarchy": f"{prefix}/hierarchy.json",
                "lidarTilesPrefix": f"{prefix}/r/",
                "lidarFlatness": f"{prefix}/analysis/flatness.json",
                "lidarSlope": f"{prefix}/analysis/slope.json",
                "lidarContours": f"{prefix}/analysis/contours.geojson",
                "lidarSections": f"{prefix}/analysis/sections.json",
                "lidarQc": f"{prefix}/qc.json",
            },
        },
        "georef": {"status": "ESTIMATED" if scans[0].crs else "UNREGISTERED", "crs": scans[0].crs},
    }


@app.function(image=worker_image, secrets=[worker_secret], timeout=MAX_DURATION_SECONDS, retries=0)
def process_job(payload: dict[str, Any]) -> None:
    import threading as _threading

    job_id = str(payload.get("jobId") or "")
    root = Path("/tmp") / f"lidar-job-{job_id or 'unknown'}"
    shutil.rmtree(root, ignore_errors=True)
    root.mkdir(parents=True, exist_ok=True)
    stop_beat = _threading.Event()

    def beat() -> None:
        while not stop_beat.wait(60):
            _post_progress(job_id)

    _threading.Thread(target=beat, daemon=True).start()
    try:
        result = run_pipeline(payload, root)
        _callback({
            "jobId": job_id,
            "status": "completed",
            "outputKey": result["outputKey"],
            "modelFormat": result["modelFormat"],
            "fileSizeBytes": result["fileSizeBytes"],
            "newAssetIds": payload.get("newAssetIds", []),
            "bounds": result["bounds"],
            "georef": result["georef"],
            "qualityMetrics": result["qualityMetrics"],
        })
    except Exception as exc:
        print(traceback.format_exc(), flush=True)
        if job_id:
            try:
                _callback({"jobId": job_id, "status": "failed", "errorLog": f"{type(exc).__name__}: {exc}"[:4000]})
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
