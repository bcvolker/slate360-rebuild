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


def sha256_paths(paths: Iterable[Path], root: Path | None = None) -> str:
    """Stable hash of many files: sorted relative names + per-file sha256.

    ``root``, when given, makes this hash **portable**: each path is hashed by its
    location *relative to* ``root`` (POSIX-normalized), not its absolute path. Two
    directory trees with the same relative filenames and the same file contents then
    hash identically no matter what absolute path (machine, mount point, drive letter)
    each tree happens to live under.

    Without ``root`` this hashes each path exactly as given (``p.as_posix()``) — kept
    only for a caller that already has genuinely portable/relative path strings; do
    not use this for anything derived from ``Path.glob()`` on an absolute root, since
    that embeds the absolute path in the hash (the bug this parameter exists to fix;
    see docs/ops/ROOM213_MASK_PROVENANCE_2026-09-17.md).
    """
    items = []
    root_path = Path(root) if root is not None else None
    for path in paths:
        p = Path(path)
        name = p.relative_to(root_path).as_posix() if root_path is not None else p.as_posix()
        items.append((name, sha256_file(p) if p.is_file() else ""))
    items.sort()
    return sha256_json(items)


def sha256_dir(root: Path, patterns: tuple[str, ...] = ("*",)) -> str:
    """Portable content+relative-structure hash of a directory tree.

    Two directories holding identical relative filenames and identical file contents
    hash identically, regardless of where each one sits on disk (local drive, Modal
    volume mount, WSL mount, laptop clone, ...). Every caller of this function shares
    the fix automatically — nothing needs to change at call sites.

    Before 2026-09-18 this hashed each file's *absolute* path, so the same directory
    tree at two different absolute locations (e.g. a local job folder vs. its
    extracted copy on a Modal volume) produced two different hashes even with zero
    content difference. That defect caused a false-positive Experiment 3 input-identity
    abort; see docs/ops/ROOM213_MASK_PROVENANCE_2026-09-17.md for the forensic proof
    (identical files under two roots hashed differently) and the recipe correction
    this enables (docs/ops/ROOM213_EXPERIMENT3_FINAL.md, "portable hash correction").
    """
    root = Path(root)
    files: list[Path] = []
    for pat in patterns:
        files.extend(p for p in root.glob(pat) if p.is_file())
    files = sorted(set(files), key=lambda p: p.relative_to(root).as_posix())
    return sha256_paths(files, root=root)
