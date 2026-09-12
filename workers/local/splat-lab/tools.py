"""Shared CLI tool discovery. Checks PATH first, then the running venv's bin
directory (so a venv with nerfstudio installed is detected even when its
scripts aren't on PATH)."""
from __future__ import annotations

import shutil
import sys
from pathlib import Path


def which_tool(tool: str) -> str | None:
    """Resolve a CLI tool to an executable path, or None."""
    on_path = shutil.which(tool)
    if on_path:
        return on_path
    # Check the venv bin dir (Windows and POSIX).
    bin_dir = Path(sys.prefix) / ("Scripts" if sys.platform == "win32" else "bin")
    candidate = bin_dir / (tool + (".exe" if sys.platform == "win32" else ""))
    return str(candidate) if candidate.exists() else None
