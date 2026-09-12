"""Stage 5 — Export .ply and convert to .spz (PlayCanvas splat-transform).

REAL in Slice 2. Runs `ns-export gaussian-splat` to produce a .ply, then
`npx @playcanvas/splat-transform` to produce a .spz for the web viewer. If
npx is unavailable, the .ply is served directly (the viewer supports .ply).
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from result import StageResult
from tools import which_tool


def run(cfg, ctx) -> StageResult:
    if not which_tool("ns-export"):
        return StageResult(
            name="export", status="blocked",
            detail="nerfstudio not installed",
            error="Install nerfstudio to export: pip install nerfstudio; "
                   "then `ns-export gaussian-splat` becomes available.")

    train_dir = ctx.get("train_dir")
    if not train_dir or not Path(train_dir).exists():
        return StageResult(name="export", status="failed",
                           error="no trained model to export (train blocked/failed)")

    out_dir = ctx["job_dir"] / "export"
    out_dir.mkdir(parents=True, exist_ok=True)
    ply = out_dir / "output.ply"
    spz = ctx["job_dir"] / "output.spz"

    # 1. ns-export gaussian-splat -> .ply (always; the viewer renders .ply too).
    cfg_path = Path(train_dir) / "config.yml"
    if not cfg_path.exists():
        # nerfstudio writes config.yml under <output-dir>/<exp-name>/config.yml
        cfg_path = next(Path(train_dir).rglob("config.yml"), None)
    if not cfg_path or not cfg_path.exists():
        return StageResult(name="export", status="failed",
                           error=f"no config.yml found under {train_dir}")
    cmd = [
        which_tool("ns-export") or "ns-export",
        "gaussian-splat",
        "--load-config", str(cfg_path),
        "--output-dir", str(out_dir),
        "--output-filename", "output.ply",
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
    except subprocess.TimeoutExpired:
        return StageResult(name="export", status="failed",
                           error="ns-export timed out (>1h)")
    if proc.returncode != 0 or not ply.exists():
        tail = (proc.stderr or proc.stdout or "")[-800:]
        return StageResult(name="export", status="failed",
                           error=f"ns-export failed: {tail}")

    # 2. splat-transform -> .spz (optional; falls back to .ply if npx missing).
    if not shutil.which("npx"):
        ctx["model_path"] = str(ply)
        return StageResult(name="export", status="done",
                           detail=f"exported {ply.name} (no npx — serving .ply)",
                           artifacts=[str(ply)])

    tf_cmd = ["npx", "--yes", "@playcanvas/splat-transform",
              "--input", str(ply), "--output", str(spz), "--sog"]
    try:
        proc = subprocess.run(tf_cmd, capture_output=True, text=True, timeout=1800)
    except subprocess.TimeoutExpired:
        ctx["model_path"] = str(ply)
        return StageResult(name="export", status="done",
                           detail="splat-transform timed out — serving .ply",
                           artifacts=[str(ply)])
    if proc.returncode != 0 or not spz.exists():
        ctx["model_path"] = str(ply)
        tail = (proc.stderr or proc.stdout or "")[-400:]
        return StageResult(name="export", status="done",
                           detail=f"splat-transform failed — serving .ply: {tail}",
                           artifacts=[str(ply)])

    ctx["model_path"] = str(spz)
    return StageResult(name="export", status="done",
                       detail=f"exported {spz.name} ({spz.stat().st_size // 1024} KB)",
                       artifacts=[str(spz)])
