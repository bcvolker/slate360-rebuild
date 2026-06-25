"""
Slate360 360° Tour Ingest — Modal CPU worker.

HTTP contract (POST /ingest):
  Request JSON: jobId, sceneId, orgId, tourId, sourceKey
  Produces web-ready derivatives from an uploaded equirectangular panorama:
    - thumbnail  (640px wide) for the Library grid / gallery / OG cards
    - normalized (longest edge capped, progressive JPEG) for fast first paint
  then posts a signed callback so the scene flips processing -> ready.

Reuses the existing `slate360-thermal-worker` secret (R2 creds + SITE_URL +
GPU_WORKER_SECRET_KEY). Single-file on purpose (no sibling imports) for a simple deploy.
"""

from __future__ import annotations

import hashlib
import hmac
import io
import json
import os
import traceback
from typing import Any

import modal
import requests
from fastapi.responses import JSONResponse

APP_NAME = "slate360-tour-ingest"
SECRET_NAME = "slate360-thermal-worker"
WEB_ENDPOINT_LABEL = "tour-ingest"
MAX_DURATION_SECONDS = 900
THUMB_WIDTH = 640
NORMALIZED_MAX_WIDTH = 8192  # cap the longest (horizontal) edge of equirect for the web

app = modal.App(APP_NAME)
worker_secret = modal.Secret.from_name(SECRET_NAME)

cpu_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libjpeg62-turbo", "zlib1g")
    .pip_install("fastapi[standard]==0.115.6", "boto3==1.35.99", "pillow==11.0.0", "requests==2.32.3")
)


def _s3_client():
    import boto3
    from botocore.config import Config

    endpoint = os.environ.get("R2_ENDPOINT", "").strip()
    if not endpoint:
        account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
        if account:
            endpoint = f"https://{account}.r2.cloudflarestorage.com"
    if not endpoint:
        raise RuntimeError("R2_ENDPOINT (or CLOUDFLARE_ACCOUNT_ID) not configured")
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name=os.environ.get("R2_REGION", "auto"),
        config=Config(signature_version="s3v4"),
    )


def _sign(raw: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def post_callback(payload: dict[str, Any]) -> None:
    site_url = os.environ["SITE_URL"].rstrip("/")
    secret = os.environ["GPU_WORKER_SECRET_KEY"]
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()
    resp = requests.post(
        f"{site_url}/api/tours/jobs/callback",
        data=raw,
        headers={"Content-Type": "application/json", "x-worker-signature": _sign(raw, secret)},
        timeout=60,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Callback rejected ({resp.status_code}): {resp.text[:1000]}")


def _encode_jpeg(img, quality: int, progressive: bool) -> bytes:
    buf = io.BytesIO()
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    img.save(buf, format="JPEG", quality=quality, progressive=progressive, optimize=True)
    return buf.getvalue()


@app.function(image=cpu_image, cpu=2, memory=8192, timeout=MAX_DURATION_SECONDS, secrets=[worker_secret])
def process_tour_job(payload: dict[str, Any]) -> None:
    from PIL import Image

    Image.MAX_IMAGE_PIXELS = None  # equirect panoramas are large by design

    job_id = str(payload["jobId"])
    scene_id = str(payload["sceneId"])
    org_id = str(payload["orgId"])
    tour_id = str(payload["tourId"])
    source_key = str(payload["sourceKey"])

    bucket = os.environ["R2_BUCKET"]
    base = f"tours/{org_id}/{tour_id}/scenes/derivatives/{scene_id}"

    try:
        post_callback({"jobId": job_id, "sceneId": scene_id, "status": "progress", "progressPct": 15, "stage": "download"})
        s3 = _s3_client()
        raw = s3.get_object(Bucket=bucket, Key=source_key)["Body"].read()
        img = Image.open(io.BytesIO(raw))
        img.load()
        w, h = img.size

        # Thumbnail (keep aspect; equirect is ~2:1).
        post_callback({"jobId": job_id, "sceneId": scene_id, "status": "progress", "progressPct": 45, "stage": "thumbnail"})
        th = max(1, round(THUMB_WIDTH * h / w))
        thumb = img.resize((THUMB_WIDTH, th), Image.LANCZOS)
        thumb_key = f"{base}/thumb.jpg"
        s3.put_object(Bucket=bucket, Key=thumb_key, Body=_encode_jpeg(thumb, 80, False), ContentType="image/jpeg")

        # Normalized full (cap width, progressive JPEG for fast first paint).
        post_callback({"jobId": job_id, "sceneId": scene_id, "status": "progress", "progressPct": 75, "stage": "normalize"})
        if w > NORMALIZED_MAX_WIDTH:
            nh = max(1, round(NORMALIZED_MAX_WIDTH * h / w))
            norm = img.resize((NORMALIZED_MAX_WIDTH, nh), Image.LANCZOS)
        else:
            norm = img
        nw, nh = norm.size
        norm_key = f"{base}/normalized.jpg"
        s3.put_object(Bucket=bucket, Key=norm_key, Body=_encode_jpeg(norm, 85, True), ContentType="image/jpeg")

        post_callback({
            "jobId": job_id,
            "sceneId": scene_id,
            "status": "completed",
            "progressPct": 100,
            "stage": "complete",
            "width": w,
            "height": h,
            "derivatives": [
                {"type": "thumbnail", "key": thumb_key, "width": THUMB_WIDTH, "height": th},
                {"type": "normalized", "key": norm_key, "width": nw, "height": nh},
            ],
        })
    except Exception as exc:  # noqa: BLE001
        post_callback({
            "jobId": job_id, "sceneId": scene_id, "status": "failed",
            "errorLog": str(exc)[:800], "trace": traceback.format_exc()[-2000:],
        })
        raise


@app.function(image=cpu_image, secrets=[worker_secret])
@modal.fastapi_endpoint(method="POST", label=WEB_ENDPOINT_LABEL)
def ingest(body: dict):
    fc = process_tour_job.spawn(body)
    return JSONResponse({"accepted": True}, headers={"x-modal-run-id": fc.object_id})
