"""Effective-config writer: what actually ran, not what the UI requested."""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any


def git_commit(repo: Path) -> str | None:
    try:
        out = subprocess.check_output(
            ["git", "-C", str(repo), "rev-parse", "HEAD"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
        return out.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def write_effective_config(path: Path, payload: dict[str, Any]) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def gpu_type() -> str | None:
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            text=True,
            stderr=subprocess.DEVNULL,
            timeout=10,
        )
        return out.strip().splitlines()[0].strip()
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return os.environ.get("NVIDIA_VISIBLE_DEVICES")
