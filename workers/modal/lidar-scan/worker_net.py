"""Signed progress/callback + R2 helpers for the Track L worker."""

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


def download_sources(s3: Any, bucket: str, keys: list[str], root: Path) -> list[Path]:
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


def upload_tree(s3: Any, bucket: str, prefix: str, path: Path) -> None:
    for item in path.rglob("*"):
        if not item.is_file():
            continue
        key = f"{prefix}/{item.relative_to(path).as_posix()}"
        content_type = (
            "application/json"
            if item.suffix in {".json", ".geojson"}
            else "application/octet-stream"
        )
        s3.upload_file(
            str(item),
            bucket,
            key,
            ExtraArgs={
                "ContentType": content_type,
                "CacheControl": "public, max-age=31536000, immutable",
            },
        )
