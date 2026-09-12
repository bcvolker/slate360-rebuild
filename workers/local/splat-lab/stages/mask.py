"""Stage 3 — People / operator masking (RTMDet-Ins-S ONNX).

STUB for Slice 1. When onnxruntime + the RTMDet model are present, this stage
will run instance segmentation on each frame and write black-background masks
for people (the "Remove People" feature). Place the RTMDet-Ins-S ONNX model at
workers/local/splat-lab/models/rtmdet-ins-s-640.onnx.
"""
from __future__ import annotations

import shutil
from pathlib import Path

from result import StageResult


def run(cfg, ctx) -> StageResult:
    if not cfg.remove_people:
        return StageResult(name="mask", status="skipped",
                           detail="remove_people disabled")

    images_dir: Path = ctx["images_dir"]
    if not list(images_dir.glob("*.jpg")):
        return StageResult(name="mask", status="skipped",
                           detail="no images (SfM blocked)")

    try:
        import onnxruntime  # noqa: F401
    except ImportError:
        return StageResult(
            name="mask", status="blocked",
            detail="onnxruntime not installed",
            error="Install onnxruntime-gpu (pip install onnxruntime-gpu) "
                   "and place rtmdet-ins-s-640.onnx in the models dir. "
                   "See workers/local/splat-lab/README.md")

    return StageResult(
        name="mask", status="blocked",
        detail="onnxruntime present but RTMDet inference not implemented in Slice 1",
        error="Slice 2 will load rtmdet-ins-s-640.onnx and mask people in "
               f"{images_dir}")
