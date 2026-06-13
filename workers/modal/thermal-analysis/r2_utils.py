"""R2 client helpers for the thermal Modal worker."""

from __future__ import annotations

import os

import boto3
from botocore.config import Config


def s3_client():
    endpoint = os.environ.get("R2_ENDPOINT", "").strip()
    if not endpoint:
        account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
        if account:
            endpoint = f"https://{account}.r2.cloudflarestorage.com"
    if not endpoint:
        raise RuntimeError("R2_ENDPOINT (or CLOUDFLARE_ACCOUNT_ID) is not configured")
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name=os.environ.get("R2_REGION", "auto"),
        config=Config(signature_version="s3v4"),
    )


def download_object(s3, bucket: str, key: str, dest: str) -> None:
    s3.download_file(bucket, key, dest)


def upload_file(s3, bucket: str, local_path: str, key: str, content_type: str) -> None:
    s3.upload_file(local_path, bucket, key, ExtraArgs={"ContentType": content_type})
