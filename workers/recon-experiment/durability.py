"""Durable checkpoint pointer: write ckpt, then identity, then VALID last."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from hashes import sha256_file


def commit_checkpoint(
    ckpt: Path,
    pointer_dir: Path,
    identity: dict[str, Any],
) -> Path:
    ckpt = Path(ckpt)
    pointer_dir = Path(pointer_dir)
    pointer_dir.mkdir(parents=True, exist_ok=True)
    if not ckpt.is_file() or ckpt.stat().st_size < 64:
        raise ValueError(f"checkpoint not readable: {ckpt}")
    digest = sha256_file(ckpt)
    payload = {
        **identity,
        "ckpt": str(ckpt),
        "sha256": digest,
        "bytes": ckpt.stat().st_size,
        "readable": True,
    }
    prior = pointer_dir / "VALID.json"
    if prior.is_file():
        (pointer_dir / "PRIOR.json").write_text(prior.read_text(encoding="utf-8"), encoding="utf-8")
    ident = ckpt.with_suffix(ckpt.suffix + ".identity.json")
    tmp_ident = ident.with_suffix(".tmp")
    tmp_ident.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(tmp_ident, ident)
    tmp_valid = pointer_dir / "VALID.json.tmp"
    tmp_valid.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(tmp_valid, pointer_dir / "VALID.json")
    return pointer_dir / "VALID.json"


def load_valid_pointer(pointer_dir: Path) -> dict | None:
    path = Path(pointer_dir) / "VALID.json"
    if not path.is_file():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    ckpt = Path(data.get("ckpt") or "")
    if not ckpt.is_file():
        return None
    if sha256_file(ckpt) != data.get("sha256"):
        return None
    return data
