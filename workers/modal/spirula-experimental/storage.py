"""R2 locks and artifact upload. One active GPU key for the whole experiment app."""

from __future__ import annotations

import os
from pathlib import Path

ACTIVE_KEY = "experimental/spirula/ACTIVE_GPU"


def started_key(experiment_id: str) -> str:
    return f"experimental/spirula/{experiment_id}/STARTED"


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
        config=Config(signature_version="s3v4"),
    )


def bucket() -> str:
    name = os.environ.get("R2_BUCKET", "").strip()
    if not name:
        raise RuntimeError("R2_BUCKET is not configured")
    return name


def try_lock(s3, key: str, body: bytes) -> bool:
    from botocore.exceptions import ClientError

    try:
        s3.put_object(Bucket=bucket(), Key=key, Body=body, IfNoneMatch="*")
        return True
    except ClientError as exc:
        status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
        code = exc.response.get("Error", {}).get("Code", "")
        if status == 412 or code in {"PreconditionFailed", "ConditionalRequestConflict"}:
            return False
        raise


def release_lock(s3, key: str) -> None:
    s3.delete_object(Bucket=bucket(), Key=key)


def download_prefix(s3, prefix: str, dest: Path) -> dict[str, str]:
    """Fresh read. Hashes are of the bytes returned by storage, then written to dest."""
    import hashlib

    dest.mkdir(parents=True, exist_ok=True)
    hashes: dict[str, str] = {}
    token = None
    prefix = prefix.rstrip("/") + "/"
    while True:
        kwargs = {"Bucket": bucket(), "Prefix": prefix}
        if token:
            kwargs["ContinuationToken"] = token
        resp = s3.list_objects_v2(**kwargs)
        for item in resp.get("Contents", []):
            key = item["Key"]
            rel = key[len(prefix):]
            if not rel or rel.endswith("/"):
                continue
            raw = s3.get_object(Bucket=bucket(), Key=key)["Body"].read()
            path = dest / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
            hashes[rel] = hashlib.sha256(raw).hexdigest()
        if not resp.get("IsTruncated"):
            break
        token = resp.get("NextContinuationToken")
    return hashes


def upload_tree(s3, prefix: str, root: Path) -> list[str]:
    keys = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        key = f"{prefix.rstrip('/')}/{rel}"
        kind = "application/octet-stream"
        if path.suffix == ".json":
            kind = "application/json"
        elif path.suffix == ".png":
            kind = "image/png"
        elif path.suffix == ".txt" or path.suffix == ".log":
            kind = "text/plain"
        s3.upload_file(str(path), bucket(), key, ExtraArgs={"ContentType": kind})
        keys.append(key)
    return keys
