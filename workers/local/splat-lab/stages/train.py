"""Stage 4 — Gaussian splat training (Nerfstudio splatfacto / gsplat).

REAL in Slice 2. Runs `ns-train splatfacto` with the training knobs
(resolution scale, SH degree, steps, quality preset) and streams iteration
progress. Arg names match nerfstudio 1.1.5's splatfacto config.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from result import StageResult
from tools import which_tool


def run(cfg, ctx) -> StageResult:
    if not which_tool("ns-train"):
        return StageResult(
            name="train", status="blocked",
            detail="nerfstudio not installed",
            error="Install nerfstudio to train: pip install nerfstudio gsplat; "
                   "then `ns-train splatfacto` becomes available.")

    data_dir = ctx.get("sfm_data_dir")
    if not data_dir or not Path(data_dir).exists():
        return StageResult(name="train", status="failed",
                           error="no SfM dataset to train on (SfM blocked/failed)")

    out_dir = ctx["job_dir"] / "train"
    out_dir.mkdir(parents=True, exist_ok=True)
    steps = cfg.resolved_steps
    # camera-res-scale-factor: 1.0 = full source res; lower = faster, less detail.
    res_scale = max(0.25, min(1.0, cfg.resolved_image_px / 7680.0))

    cmd = [
        which_tool("ns-train") or "ns-train",
        "splatfacto",
        "--data", str(data_dir),
        "--output-dir", str(out_dir),
        "--max-num-iterations", str(steps),
        "--pipeline.datamanager.camera-res-scale-factor", f"{res_scale:.3f}",
        "--vis", "viewer",
        "--viewer.quit-on-train-completion", "True",
    ]
    # SH degree: splatfacto ramps SH via sh-degree-interval (0 = no SH, higher = earlier ramp).
    if cfg.sh_degree and cfg.sh_degree > 0:
        cmd += ["--pipeline.model.sh-degree-interval", str(max(1, cfg.sh_degree * 1000))]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=86400)
    except subprocess.TimeoutExpired:
        return StageResult(name="train", status="failed",
                           error="training timed out (>24h)")
    if proc.returncode != 0:
        tail = (proc.stderr or proc.stdout or "")[-800:]
        return StageResult(name="train", status="failed",
                           error=f"ns-train failed: {tail}")

    splat_ply = _find_latest(out_dir, ".ply")
    ctx["train_dir"] = str(out_dir)
    detail = f"training done ({steps} steps)"
    if splat_ply:
        ctx["trained_ply"] = str(splat_ply)
        detail += f"; ply={splat_ply.name}"
    return StageResult(name="train", status="done", detail=detail,
                       artifacts=[str(out_dir)])


def _find_latest(root: Path, suffix: str) -> Path | None:
    matches = sorted(root.rglob(f"*{suffix}"), key=lambda p: p.stat().st_mtime)
    return matches[-1] if matches else None
