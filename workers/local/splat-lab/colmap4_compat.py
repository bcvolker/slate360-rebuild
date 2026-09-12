"""COLMAP 4.x compatibility shim for nerfstudio 1.1.5.

nerfstudio 1.1.5's colmap_utils.py passes the old COLMAP 3.x option names
`--SiftExtraction.use_gpu` and `--SiftMatching.use_gpu`, which COLMAP 4.0+
renamed to `--FeatureExtraction.use_gpu` and `--FeatureMatching.use_gpu`.
This patches nerfstudio's site-packages file in place, idempotently, so
`ns-process-data` works with a COLMAP 4.x build.

Run once before ns-process-data. Safe to re-run (no-op if already patched).
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

REPLACEMENTS = {
    "--SiftExtraction.use_gpu": "--FeatureExtraction.use_gpu",
    "--SiftMatching.use_gpu": "--FeatureMatching.use_gpu",
}


def patch() -> str:
    """Patch nerfstudio colmap_utils.py for COLMAP 4.x. Returns a status string."""
    spec = importlib.util.find_spec("nerfstudio.process_data.colmap_utils")
    if spec is None or not spec.origin:
        return "nerfstudio not installed (no patch)"
    path = Path(spec.origin)
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in REPLACEMENTS.items():
        text = text.replace(old, new)
    if text == original:
        return "already patched (colmap4-compatible)"
    path.write_text(text, encoding="utf-8")
    return f"patched {path.name} for COLMAP 4.x"


if __name__ == "__main__":
    print(patch())
