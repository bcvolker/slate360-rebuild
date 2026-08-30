"""Spatial Walkthrough ingest — 4K 2:1 H.264 proxy + poster + SHA-256 + manifest.

Never mutates the master object. Callback HMAC matches twin/tour workers.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import subprocess
import tempfile
import traceback
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import modal
from fastapi.responses import JSONResponse

APP_NAME = "slate360-spatial-walkthrough"
SECRET_NAME = "slate360-thermal-worker"
WEB_ENDPOINT_LABEL = "spatial-walkthrough-ingest"
MAX_DURATION_SECONDS = 3600

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


def callback_base_url(payload: dict[str, Any]) -> str:
    """Allow the originating deployment (preview or prod) to receive HMAC callbacks.

    Falls back to SITE_URL from the Modal secret. Hosts are allowlisted to prevent SSRF.
    """
    fallback = os.environ["SITE_URL"].rstrip("/")
    raw = str(payload.get("callbackBaseUrl") or fallback).strip().rstrip("/")
    parsed = urlparse(raw if "://" in raw else f"https://{raw}")
    if parsed.scheme not in ("https", "http"):
        return fallback
    host = (parsed.hostname or "").lower()
    allowed = (
        host.endswith("slate360.ai")
        or host.endswith(".vercel.app")
        or host in {"localhost", "127.0.0.1"}
    )
    if not allowed:
        return fallback
    if host in {"localhost", "127.0.0.1"} and parsed.scheme != "http":
        return fallback
    if host not in {"localhost", "127.0.0.1"} and parsed.scheme != "https":
        return fallback
    return f"{parsed.scheme}://{parsed.netloc}"


def post_callback(payload: dict[str, Any], site: str) -> None:
    import requests

    secret = os.environ["GPU_WORKER_SECRET_KEY"]
    raw = json.dumps(payload, separators=(",", ":")).encode()
    requests.post(
        f"{site}/api/spatial-walkthrough/jobs/callback",
        data=raw,
        headers={"Content-Type": "application/json", "x-worker-signature": _sign(raw, secret)},
        timeout=60,
    )


def gop_for_fps(fps: float) -> int:
    return max(1, int(round(fps if fps > 0 else 30.0)))


def encode_proxy(src: str, dest: str, width: int, height: int, gop: int) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", src,
            "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-g", str(gop), "-keyint_min", str(gop), "-sc_threshold", "0",
            "-force_key_frames", "expr:gte(t,n_forced*1)",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            dest,
        ],
        capture_output=True,
        check=True,
    )


def _sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _ffprobe(path: str) -> dict[str, Any]:
    out = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", path],
        capture_output=True, text=True, check=True,
    ).stdout
    data = json.loads(out)
    v = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
    fps = 30.0
    if v.get("r_frame_rate") and "/" in v["r_frame_rate"]:
        n, d = v["r_frame_rate"].split("/")
        fps = round(float(n) / float(d), 3) if float(d) else 30.0
    return {
        "durationSec": float(data.get("format", {}).get("duration", 0) or 0),
        "width": int(v.get("width", 0) or 0),
        "height": int(v.get("height", 0) or 0),
        "fps": fps,
    }


@app.function(image=cpu_image, cpu=8, memory=8192, timeout=MAX_DURATION_SECONDS, secrets=[worker_secret])
def ingest_clip(payload: dict[str, Any]) -> None:
    from r2_utils import s3_client, download_object, upload_file

    job_id = str(payload["jobId"])
    clip_id = str(payload["clipId"])
    org_id = str(payload["orgId"])
    src_key = str(payload["sourceKey"])
    bucket = os.environ["R2_BUCKET"]
    s3 = s3_client()
    work = Path(tempfile.mkdtemp(prefix="sw-"))
    site = callback_base_url(payload)

    try:
        post_callback({"jobId": job_id, "clipId": clip_id, "status": "progress", "progressPct": 8, "stage": "download"}, site)
        src = str(work / "master.mp4")
        download_object(s3, bucket, src_key, src)
        sha = _sha256_file(src)
        meta = _ffprobe(src)
        w, h = meta["width"], meta["height"]
        if h <= 0 or not (1.7 <= (w / h) <= 2.3):
            raise RuntimeError(f"Source is not ~2:1 equirectangular ({w}x{h})")

        gop = gop_for_fps(float(meta["fps"]))
        base = f"orgs/{org_id}/spatial-walkthrough/{clip_id}"
        poster_key = f"{base}/poster.jpg"
        manifest_key = f"{base}/manifest.json"

        post_callback({"jobId": job_id, "clipId": clip_id, "status": "progress", "progressPct": 35, "stage": "proxy"}, site)
        proxy = str(work / "proxy.mp4")
        proxy_w, proxy_h = 3840, 1920
        try:
            encode_proxy(src, proxy, proxy_w, proxy_h, gop)
        except subprocess.CalledProcessError:
            proxy_w, proxy_h = 2880, 1440
            encode_proxy(src, proxy, proxy_w, proxy_h, gop)
        proxy_key = f"{base}/proxy-{proxy_w}x{proxy_h}.mp4"
        upload_file(s3, bucket, proxy, proxy_key, "video/mp4")

        post_callback({"jobId": job_id, "clipId": clip_id, "status": "progress", "progressPct": 80, "stage": "poster"}, site)
        poster = str(work / "poster.jpg")
        seek = min(1.0, max(0.0, meta["durationSec"] / 8))
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(seek), "-i", src, "-frames:v", "1", "-vf", "scale=1920:960", poster],
            capture_output=True, check=True,
        )
        upload_file(s3, bucket, poster, poster_key, "image/jpeg")

        proxy_meta = _ffprobe(proxy)
        manifest = {
            "jobId": job_id,
            "clipId": clip_id,
            "masterKey": src_key,
            "masterSha256": sha,
            "proxyKey": proxy_key,
            "posterKey": poster_key,
            "ffmpeg": f"libx264 {proxy_w}x{proxy_h} yuv420p gop={gop} (~1s) faststart",
            "source": meta,
            "proxy": proxy_meta,
            "immutableMaster": True,
        }
        man_path = work / "manifest.json"
        man_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        upload_file(s3, bucket, str(man_path), manifest_key, "application/json")

        post_callback({
            "jobId": job_id, "clipId": clip_id, "status": "completed", "progressPct": 100, "stage": "complete",
            "proxyKey": proxy_key, "posterKey": poster_key, "manifestKey": manifest_key,
            "masterSha256": sha,
            "durationSec": meta["durationSec"],
            "width": proxy_w,
            "height": proxy_h,
            "fps": meta["fps"],
        }, site)
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or b"")[-1500:] if isinstance(e.stderr, bytes) else str(e.stderr)[-1500:]
        post_callback({"jobId": job_id, "clipId": clip_id, "status": "failed", "errorLog": f"ffmpeg failed: {stderr}"}, site)
    except Exception as e:  # noqa: BLE001
        post_callback({"jobId": job_id, "clipId": clip_id, "status": "failed",
                       "errorLog": f"{e}\n{traceback.format_exc()[-1500:]}"}, site)


@app.function(image=cpu_image, secrets=[worker_secret], timeout=60)
@modal.fastapi_endpoint(method="POST", label=WEB_ENDPOINT_LABEL)
def web(body: dict[str, Any]):
    if not isinstance(body, dict) or not body.get("jobId") or not body.get("clipId"):
        return JSONResponse(status_code=400, content={"error": "jobId and clipId required"})
    if not body.get("sourceKey"):
        return JSONResponse(status_code=400, content={"error": "sourceKey required"})
    fc = ingest_clip.spawn(body)
    return JSONResponse({"accepted": True}, headers={"x-modal-run-id": fc.object_id})
