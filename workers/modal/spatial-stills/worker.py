"""Directed Tour checkpoint stills.

One job: seek into a clip's operator-free public proxy (equirect 360 MP4) at t and write one
full-resolution equirect JPEG to R2. Called synchronously by the Trigger task
`spatial-tour.checkpoint-still`, which records the result on the mark. Separate Modal app so
deploying it never touches the ingest worker.

Deploy:  cd workers/modal/spatial-stills && PYTHONIOENCODING=utf-8 python -m modal deploy worker.py
"""

from __future__ import annotations

import hmac
import os
import subprocess
import tempfile
from typing import Any

import modal

try:  # present in the container image; the local deploy machine may not have it
    from fastapi import Request
except ImportError:  # pragma: no cover
    Request = Any  # type: ignore[misc,assignment]

APP_NAME = "slate360-spatial-stills"
SECRET_NAME = "slate360-thermal-worker"  # same R2 + GPU_WORKER_SECRET_KEY secret as the ingest worker
WEB_ENDPOINT_LABEL = "spatial-tour-still"

app = modal.App(APP_NAME)
worker_secret = modal.Secret.from_name(SECRET_NAME)
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("fastapi[standard]==0.115.6", "boto3==1.35.99")
)


def _s3():
    import boto3
    from botocore.config import Config

    endpoint = os.environ.get("R2_ENDPOINT", "").strip()
    if not endpoint and os.environ.get("CLOUDFLARE_ACCOUNT_ID"):
        endpoint = f"https://{os.environ['CLOUDFLARE_ACCOUNT_ID'].strip()}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name=os.environ.get("R2_REGION", "auto"),
        config=Config(signature_version="s3v4"),
    )


def _valid_keys(source_key: Any, output_key: Any) -> bool:
    return (
        isinstance(source_key, str)
        and source_key.startswith("orgs/")
        and source_key.endswith(".mp4")
        and isinstance(output_key, str)
        and output_key.startswith("orgs/")
        and "/stills/" in output_key
        and output_key.endswith(".jpg")
        and ".." not in source_key + output_key
    )


@app.function(image=image, secrets=[worker_secret], cpu=2, memory=2048, timeout=150)
@modal.fastapi_endpoint(method="POST", label=WEB_ENDPOINT_LABEL)
async def still(request: Request):
    from fastapi.responses import JSONResponse

    expected = os.environ.get("GPU_WORKER_SECRET_KEY", "")
    given = request.headers.get("x-worker-secret", "")
    if not expected or not hmac.compare_digest(given, expected):
        return JSONResponse(status_code=401, content={"error": "unauthorized"})

    body = await request.json()
    source_key, output_key = body.get("sourceKey"), body.get("outputKey")
    try:
        t = float(body.get("t"))
    except (TypeError, ValueError):
        t = -1.0
    if not _valid_keys(source_key, output_key) or t < 0:
        return JSONResponse(status_code=400, content={"error": "sourceKey, outputKey and t are required"})

    bucket = os.environ["R2_BUCKET"]
    s3 = _s3()
    # Seek over HTTP Range on a presigned URL instead of downloading the whole proxy.
    url = s3.generate_presigned_url("get_object", Params={"Bucket": bucket, "Key": source_key}, ExpiresIn=600)
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "still.jpg")
        try:
            subprocess.run(
                ["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", url, "-frames:v", "1", "-q:v", "3", out],
                check=True,
                capture_output=True,
                text=True,
                timeout=120,
            )
        except subprocess.CalledProcessError as e:
            return JSONResponse(status_code=422, content={"error": (e.stderr or "ffmpeg failed")[-600:]})
        except subprocess.TimeoutExpired:
            return JSONResponse(status_code=504, content={"error": "ffmpeg timed out"})
        if not os.path.exists(out) or os.path.getsize(out) == 0:
            return JSONResponse(status_code=422, content={"error": "No frame at that time"})
        s3.upload_file(out, bucket, output_key, ExtraArgs={"ContentType": "image/jpeg"})
    return JSONResponse({"key": output_key})
