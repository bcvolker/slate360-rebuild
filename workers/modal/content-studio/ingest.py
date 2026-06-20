"""
Slate360 Content Studio — Modal CPU ingest worker.

HTTP contract (POST, label `ingest`):
  Request JSON: jobId, orgId, mediaAssetId, storageKey, kind?
  Response: HTTP 200 immediately, header x-modal-run-id: <spawn id>
  Async: downloads the original from R2, generates a 720p scrub proxy + poster
  thumbnail + tiny mono audio proxy, probes metadata, uploads to R2, then POSTs a
  signed callback to ${SITE_URL}/api/content-studio/jobs/callback.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import subprocess
import traceback
from pathlib import Path
from typing import Any

import modal
from fastapi.responses import JSONResponse

APP_NAME = "slate360-content-ingest"
SECRET_NAME = "slate360-thermal-worker"  # reused: provides R2_*, GPU_WORKER_SECRET_KEY, SITE_URL
WEB_ENDPOINT_LABEL = "ingest"
MAX_DURATION_SECONDS = 1800

app = modal.App(APP_NAME)
worker_secret = modal.Secret.from_name(SECRET_NAME)

cpu_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("fastapi[standard]==0.115.6", "boto3==1.35.99", "requests==2.32.3")
    .add_local_python_source("r2_utils")
)


def _sign(raw: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def post_callback(payload: dict[str, Any]) -> None:
    import requests

    site = os.environ["SITE_URL"].rstrip("/")
    secret = os.environ["GPU_WORKER_SECRET_KEY"]
    raw = json.dumps(payload, separators=(",", ":")).encode()
    requests.post(
        f"{site}/api/content-studio/jobs/callback",
        data=raw,
        headers={"Content-Type": "application/json", "x-worker-signature": _sign(raw, secret)},
        timeout=60,
    )


def _ffprobe(path: str) -> dict[str, Any]:
    out = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", path],
        capture_output=True, text=True, check=True,
    ).stdout
    data = json.loads(out)
    v = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
    a = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)
    fps = 30.0
    if v.get("r_frame_rate") and "/" in v["r_frame_rate"]:
        n, d = v["r_frame_rate"].split("/")
        fps = round(float(n) / float(d), 3) if float(d) else 30.0
    return {
        "durationSec": float(data.get("format", {}).get("duration", 0) or 0),
        "width": int(v.get("width", 0) or 0),
        "height": int(v.get("height", 0) or 0),
        "fps": fps,
        "hasAudio": a is not None,
    }


@app.function(image=cpu_image, cpu=4, memory=4096, timeout=MAX_DURATION_SECONDS, secrets=[worker_secret])
def ingest_media(payload: dict[str, Any]) -> None:
    from r2_utils import s3_client, download_object, upload_file

    job_id = str(payload["jobId"])
    org_id = str(payload["orgId"])
    asset_id = str(payload["mediaAssetId"])
    src_key = str(payload["storageKey"])
    bucket = os.environ["R2_BUCKET"]
    s3 = s3_client()
    work = Path(f"/tmp/cs/{job_id}")
    work.mkdir(parents=True, exist_ok=True)

    try:
        post_callback({"jobId": job_id, "status": "processing", "progressPct": 10, "stage": "download"})
        src = str(work / "src")
        download_object(s3, bucket, src_key, src)
        meta = _ffprobe(src)

        base = f"orgs/{org_id}/Content Studio/Proxies/{asset_id}"
        proxy_key = f"{base}/proxy.mp4"
        thumb_key = f"{base}/thumb.jpg"

        post_callback({"jobId": job_id, "status": "processing", "progressPct": 40, "stage": "proxy"})
        proxy = str(work / "proxy.mp4")
        subprocess.run(
            ["ffmpeg", "-y", "-i", src, "-vf", "scale=-2:720", "-c:v", "libx264",
             "-preset", "veryfast", "-crf", "28", "-g", "48", "-force_key_frames", "expr:gte(t,n_forced*1)",
             "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", proxy],
            capture_output=True, check=True,
        )
        upload_file(s3, bucket, proxy, proxy_key, "video/mp4")

        post_callback({"jobId": job_id, "status": "processing", "progressPct": 70, "stage": "thumbnail"})
        thumb = str(work / "thumb.jpg")
        seek = min(1.0, max(0.0, meta["durationSec"] / 2))
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(seek), "-i", src, "-frames:v", "1", "-vf", "scale=480:-2", thumb],
            capture_output=True, check=True,
        )
        upload_file(s3, bucket, thumb, thumb_key, "image/jpeg")

        audio_key = None
        if meta["hasAudio"]:
            post_callback({"jobId": job_id, "status": "processing", "progressPct": 85, "stage": "audio"})
            audio = str(work / "audio.mp3")
            subprocess.run(
                ["ffmpeg", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audio],
                capture_output=True, check=True,
            )
            audio_key = f"{base}/audio.mp3"
            upload_file(s3, bucket, audio, audio_key, "audio/mpeg")

        post_callback({
            "jobId": job_id, "status": "completed", "progressPct": 100, "stage": "complete",
            "mediaAssetId": asset_id, "proxyKey": proxy_key, "thumbnailKey": thumb_key,
            "audioProxyKey": audio_key, **meta,
            "outputs": [{"kind": "proxy", "storageKey": proxy_key}],
        })
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"")[-1500:] if isinstance(e.stderr, bytes) else str(e.stderr)[-1500:]
        post_callback({"jobId": job_id, "status": "failed", "mediaAssetId": asset_id,
                       "error": {"message": f"ffmpeg failed: {stderr}"}})
    except Exception as e:  # noqa: BLE001
        post_callback({"jobId": job_id, "status": "failed", "mediaAssetId": asset_id,
                       "error": {"message": f"{e}\n{traceback.format_exc()[-1500:]}"}})


@app.function(image=cpu_image, secrets=[worker_secret], timeout=60)
@modal.fastapi_endpoint(method="POST", label=WEB_ENDPOINT_LABEL)
def web(body: dict[str, Any]):
    if not isinstance(body, dict) or not body.get("jobId"):
        return JSONResponse(status_code=400, content={"error": "jobId required"})
    if not body.get("storageKey") or not body.get("mediaAssetId"):
        return JSONResponse(status_code=400, content={"error": "storageKey and mediaAssetId required"})
    fc = ingest_media.spawn(body)
    return JSONResponse({"accepted": True}, headers={"x-modal-run-id": fc.object_id})
