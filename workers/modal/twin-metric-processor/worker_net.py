"""Signed progress/callback + R2 helpers for Twin Metric Processor V1."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import threading
from pathlib import Path
from typing import Any

_progress = {"stage": "queued", "progress_pct": 0}
_progress_lock = threading.Lock()


def set_progress(job_id: str, stage: str, progress_pct: int) -> None:
    with _progress_lock:
        _progress["stage"] = stage
        _progress["progress_pct"] = progress_pct
    post_progress(job_id)


def s3_client():
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


def post_progress(job_id: str) -> None:
    if not job_id:
        return
    try:
        import requests

        with _progress_lock:
            body = {"jobId": job_id, **_progress}
        raw = json.dumps(body, separators=(",", ":"), allow_nan=False).encode()
        signature = hmac.new(
            os.environ["GPU_WORKER_SECRET_KEY"].encode(), raw, hashlib.sha256
        ).hexdigest()
        requests.post(
            f"{os.environ['SITE_URL'].rstrip('/')}/api/twin/jobs/{job_id}/progress",
            data=raw,
            headers={"Content-Type": "application/json", "x-worker-signature": f"sha256={signature}"},
            timeout=15,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[progress] non-fatal heartbeat failure: {exc}", flush=True)


def callback(payload: dict[str, Any]) -> None:
    import requests

    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()
    signature = hmac.new(
        os.environ["GPU_WORKER_SECRET_KEY"].encode(), raw, hashlib.sha256
    ).hexdigest()
    response = requests.post(
        f"{os.environ['SITE_URL'].rstrip('/')}/api/digital-twin/jobs/callback",
        data=raw,
        headers={"Content-Type": "application/json", "x-worker-signature": f"sha256={signature}"},
        timeout=60,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Callback rejected ({response.status_code}): {response.text[:1000]}")


def download_key(s3: Any, bucket: str, key: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    s3.download_file(bucket, key, str(dest))
    return dest


def upload_file(s3: Any, bucket: str, key: str, path: Path, content_type: str) -> None:
    s3.upload_file(str(path), bucket, key, ExtraArgs={"ContentType": content_type})
