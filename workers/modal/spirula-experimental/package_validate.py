"""Checksum the prepared package before any GPU work."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from colmap_validate import ImportRejected, validate_model


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def load_manifest(root: Path) -> dict:
    path = root / "manifest.json"
    if not path.is_file():
        raise ImportRejected("manifest.json is required")
    data = json.loads(path.read_text(encoding="utf-8"))
    for key in ("experimentId", "captureId", "expectedImageCount", "files"):
        if key not in data:
            raise ImportRejected(f"manifest missing {key}")
    return data


def verify_checksums(root: Path, manifest: dict) -> int:
    if not manifest["files"]:
        raise ImportRejected("manifest.files is empty")
    for item in manifest["files"]:
        rel = item["path"].replace("\\", "/")
        if rel.startswith("/") or ".." in rel.split("/"):
            raise ImportRejected(f"illegal path {rel}")
        path = root / rel
        if not path.is_file():
            raise ImportRejected(f"missing {rel}")
        digest = sha256_file(path)
        if digest != item["sha256"]:
            raise ImportRejected(f"checksum mismatch {rel}")
    return len(manifest["files"])


def jpeg_orientation(path: Path) -> int | None:
    data = path.read_bytes()
    if not data.startswith(b"\xff\xd8"):
        return None
    off = 2
    while off + 4 < len(data):
        if data[off] != 0xFF:
            break
        marker = data[off + 1]
        if marker == 0xDA:
            break
        size = int.from_bytes(data[off + 2:off + 4], "big")
        if marker == 0xE1 and data[off + 4:off + 10] == b"Exif\x00\x00":
            endian = data[off + 10:off + 12]
            le = endian == b"II"
            order = "little" if le else "big"
            # orientation tag 0x0112 in IFD0, value type short
            ifd = int.from_bytes(data[off + 14:off + 18], order)
            base = off + 10
            count = int.from_bytes(data[base + ifd:base + ifd + 2], order)
            pos = base + ifd + 2
            for _ in range(count):
                tag = int.from_bytes(data[pos:pos + 2], order)
                if tag == 0x0112:
                    return int.from_bytes(data[pos + 8:pos + 10], order)
                pos += 12
            return 1
        off += 2 + size
    return None


def check_orientations(root: Path) -> None:
    for path in (root / "images").rglob("*"):
        if path.suffix.lower() not in {".jpg", ".jpeg"}:
            continue
        orient = jpeg_orientation(path)
        if orient not in (None, 1):
            raise ImportRejected(f"unexpected JPEG orientation {orient} on {path.name}")


def validate_package(root: Path) -> dict:
    manifest = load_manifest(root)
    n = verify_checksums(root, manifest)
    check_orientations(root)
    report = validate_model(root, manifest)
    report["filesHashed"] = n
    report["experimentId"] = manifest["experimentId"]
    report["captureId"] = manifest["captureId"]
    return report
