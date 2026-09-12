"""Stage 5 — Export .ply and convert to .spz (PlayCanvas splat-transform).

REAL in Slice 2. Runs `ns-export gaussian-splat` to produce a .ply, then
`npx @playcanvas/splat-transform` to produce a .spz for the web viewer.
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
    if not shutil.which("npx"):
        return StageResult(
            name="export", status="blocked",
            detail="npx not installed",
            error="Install Node.js (includes npx) to run @playcanvas/splat-transform.")

    train_dir = ctx.get("train_dir")
    if not train_dir or not Path(train_dir).exists():
        return StageResult(name="export", status="failed",
                           error="no trained model to export (train blocked/failed)")

    out_dir = ctx["job_dir"] / "export"
    out_dir.mkdir(parents=True, exist_ok=True)
    ply = out_dir / "output.ply"
    spz = ctx["job_dir"] / "output.spz"

    # 1. ns-export gaussian-splat -> .ply
    cmd = [
        which_tool("ns-export") or "ns-export",
        "gaussian-splat",
        "--load-config", str(Path(train_dir) / "config.yml"),
        "--output-dir", str(out_dir),
        "--output-name", "output.ply",
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

    # 2. splat-transform -> .spz (SOG v2 + decimation for web).
    tf_cmd = [
        "npx", "--yes", "@playcanvas/splat-transform",
        "--input", str(ply),
        "--output", str(spz),
        "--sog",  # SOG v2 compression for web streaming
    ]
    try:
        proc = subprocess.run(tf_cmd, capture_output=True, text=True, timeout=1800)
    except subprocess.TimeoutExpired:
        return StageResult(name="export", status="failed",
                           error="splat-transform timed out (>30m)")
    if proc.returncode != 0 or not spz.exists():
        tail = (proc.stderr or proc.stdout or "")[-800:]
        return StageResult(name="export", status="failed",
                           error=f"splat-transform failed: {tail}")

    return StageResult(name="export", status="done",
                       detail=f"exported {spz.name} ({spz.stat().st_size // 1024} KB)",
                       artifacts=[str(spz)])
