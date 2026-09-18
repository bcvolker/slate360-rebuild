"""Content hashing for experiment manifests. No secrets."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Iterable


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path, chunk: int = 8 * 1024 * 1024) -> str:
    h = hashlib.sha256()
    with Path(path).open("rb") as fh:
        while True:
            block = fh.read(chunk)
            if not block:
                break
            h.update(block)
    return h.hexdigest()


def sha256_json(payload: object) -> str:
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256_bytes(raw)


def sha256_paths(paths: Iterable[Path]) -> str:
    """Stable hash of many files: sorted relative names + per-file sha256."""
    items = []
    for path in paths:
        p = Path(path)
        items.append((p.as_posix(), sha256_file(p) if p.is_file() else ""))
    items.sort()
    return sha256_json(items)


def sha256_dir(root: Path, patterns: tuple[str, ...] = ("*",)) -> str:
    root = Path(root)
    files: list[Path] = []
    for pat in patterns:
        files.extend(p for p in root.glob(pat) if p.is_file())
    files = sorted(set(files), key=lambda p: p.as_posix())
    return sha256_paths(files)
