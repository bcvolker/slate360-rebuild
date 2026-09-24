"""Artifact provenance: inventory before upload, then a FRESH storage read checked against that inventory.

The verifier never hashes downloaded bytes against a list built from those same downloaded bytes: expected sizes and
hashes come only from the pre-upload inventory, which is written (and uploaded) before the check runs."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


class InventoryRejected(RuntimeError):
    pass


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(8 * 1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def build_inventory(root: Path, files: list[tuple[str, str, int | None]], run_id: str, attempt: str) -> dict:
    """files: (relative path under root, artifact type, terminal step or None)."""
    items = []
    for rel, kind, step in files:
        rel = rel.replace("\\", "/")
        if rel.startswith("/") or ".." in rel.split("/"):
            raise InventoryRejected(f"illegal inventory path {rel}")
        p = root / rel
        if not p.is_file():
            raise InventoryRejected(f"inventory file missing before upload: {rel}")
        items.append({"path": rel, "bytes": p.stat().st_size, "sha256": sha256_file(p), "type": kind,
                      "runId": run_id, "attemptId": attempt, "terminalStep": step})
    items.sort(key=lambda x: x["path"])
    body = {"runId": run_id, "attemptId": attempt, "count": len(items), "items": items}
    body["inventorySha256"] = hashlib.sha256(json.dumps(items, sort_keys=True).encode()).hexdigest()
    return body


def upload_inventory(s3, bucket: str, prefix: str, root: Path, inv: dict) -> None:
    for it in inv["items"]:
        s3.upload_file(str(root / it["path"]), bucket, f"{prefix}/{it['path']}")
    raw = json.dumps(inv, indent=1).encode()
    s3.put_object(Bucket=bucket, Key=f"{prefix}/inventory.json", Body=raw, ContentType="application/json")


def _fresh_hash(s3, bucket: str, key: str, attempts: int = 4) -> tuple[int, str]:
    """Stream + hash one object. A transport error (timeout, reset) retries the WHOLE read; it never changes what is
    compared, only whether the comparison could be made."""
    import time
    for i in range(attempts):
        try:
            obj = s3.get_object(Bucket=bucket, Key=key)
            h = hashlib.sha256(); n = 0
            for chunk in iter(lambda: obj["Body"].read(8 * 1024 * 1024), b""):
                h.update(chunk); n += len(chunk)
            return n, h.hexdigest()
        except Exception as exc:  # noqa: BLE001
            name = type(exc).__name__
            if i == attempts - 1 or not any(k in name for k in ("Timeout", "Connection", "Protocol", "Incomplete")):
                raise
            time.sleep(5 * (i + 1))
            try:                                   # a fresh client = fresh connection pool for the retry
                from storage import client
                s3 = client()
            except Exception:  # noqa: BLE001
                pass
    raise RuntimeError("unreachable")


def verify_remote(s3, bucket: str, prefix: str, inv: dict, required_types: set[str]) -> dict:
    """Fresh read of every inventoried object. Size and sha256 must equal the PRE-upload values."""
    have = {it["type"] for it in inv["items"]}
    missing_types = sorted(required_types - have)
    if missing_types:
        raise InventoryRejected(f"inventory incomplete, missing artifact types {missing_types}")
    bad = []
    for it in inv["items"]:
        n, digest = _fresh_hash(s3, bucket, f"{prefix}/{it['path']}")
        if n != it["bytes"] or digest != it["sha256"]:
            bad.append({"path": it["path"], "expectedBytes": it["bytes"], "readBytes": n})
    if bad:
        raise InventoryRejected(f"fresh storage read does not match the pre-upload inventory: {bad[:5]}")
    stored = json.loads(s3.get_object(Bucket=bucket, Key=f"{prefix}/inventory.json")["Body"].read())
    if stored.get("inventorySha256") != inv["inventorySha256"]:
        raise InventoryRejected("stored inventory.json differs from the inventory the attempt built")
    return {"verified": len(inv["items"]), "inventorySha256": inv["inventorySha256"], "source": "fresh-r2-read"}
