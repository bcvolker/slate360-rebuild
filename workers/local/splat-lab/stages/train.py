"""Stage 4 — Gaussian splat training (Nerfstudio splatfacto / gsplat).

STUB for Slice 1. When nerfstudio is installed, this stage will run
`ns-train splatfacto` with the AirVis-derived knobs (resolution limit, SH degree,
splat cap, steps, images-per-step, preset) and stream iteration progress.
"""
from __future__ import annotations

from result import StageResult
from tools import which_tool


def run(cfg, ctx) -> StageResult:
    if not which_tool("ns-train"):
        return StageResult(
            name="train", status="blocked",
            detail="nerfstudio not installed",
            error="Install nerfstudio to train: pip install nerfstudio gsplat; "
                   "then `ns-train splatfacto` becomes available.")

    return StageResult(
        name="train", status="blocked",
        detail="nerfstudio detected but training not implemented in Slice 1",
        error=f"Slice 2 will run ns-train splatfacto "
               f"(steps={cfg.training_steps}, sh={cfg.sh_degree}, "
               f"cap={cfg.max_splats_millions}M, preset={cfg.preset})")
