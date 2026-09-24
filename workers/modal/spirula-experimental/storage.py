"""R2 client. Locks live in runlock.py; artifact provenance in inventory.py."""

from __future__ import annotations

import os


def client():
    import boto3
    from botocore.config import Config

    endpoint = os.environ.get("R2_ENDPOINT", "").strip()
    if not endpoint and os.environ.get("CLOUDFLARE_ACCOUNT_ID"):
        endpoint = f"https://{os.environ['CLOUDFLARE_ACCOUNT_ID'].strip()}.r2.cloudflarestorage.com"
    if not endpoint:
        raise RuntimeError("R2_ENDPOINT is not configured")
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name=os.environ.get("R2_REGION", "auto"),
        config=Config(signature_version="s3v4", retries={"max_attempts": 8, "mode": "adaptive"},
                      connect_timeout=30, read_timeout=300, tcp_keepalive=True,
                      request_checksum_calculation="when_required", response_checksum_validation="when_required"),
    )


def bucket() -> str:
    name = os.environ.get("R2_BUCKET", "").strip()
    if not name:
        raise RuntimeError("R2_BUCKET is not configured")
    return name
