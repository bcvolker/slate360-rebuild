"""Stage 2 — Structure-from-Motion (COLMAP via Nerfstudio).

STUB for Slice 1. When nerfstudio is installed, this stage will:
  - (360) split equirect frames into 6 perspective cubeface views
  - run `ns-process-data images --images <dir> ...` (COLMAP SfM)
  - write cameras.bin/images.bin/points3D into the job dir
For now it reports a structured `blocked` status with install instructions.
"""
from __future__ import annotations

from pathlib import Path

from result import StageResult
from tools import which_tool


def run(cfg, ctx) -> StageResult:
    images_dir: Path = ctx["images_dir"]
    count = len(list(images_dir.glob("*.jpg")))
    if count == 0:
        return StageResult(name="sfm", status="failed",
                           error="no images to run SfM on")

    if not which_tool("ns-process-data"):
        return StageResult(
            name="sfm", status="blocked",
            detail="nerfstudio not installed",
            error="Install nerfstudio to run COLMAP SfM: "
                   "pip install nerfstudio gsplat onnxruntime-gpu; "
                   "then `ns-process-data images` becomes available. "
                   "See workers/local/splat-lab/README.md")

    # Real path (later slice): split 360 -> 6 faces, then ns-process-data.
    return StageResult(
        name="sfm", status="blocked",
        detail="nerfstudio detected but SfM wiring not implemented in Slice 1",
        error="Slice 2 will run: ns-process-data images "
               f"--images {images_dir} (cameras={count}, "
               f"images_per_step={cfg.resolve_images_per_step(count)})")
