"""Stage 6 - Export .ply and convert to .spz (PlayCanvas splat-transform).

Also writes slate360-splat.json with the same shape of fields the reference
studio writes to its own splats/N/*-splat.json, so the two products' outputs
can be diffed line by line (acceptance criterion, build plan Sec 7).
"""
from __future__ import annotations

import json
import shutil
import subprocess
import time
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

    cfg_path = Path(train_dir) / "config.yml"
    if not cfg_path.exists():
        cfg_path = next(Path(train_dir).rglob("config.yml"), None)
    if not cfg_path or not cfg_path.exists():
        return StageResult(name="export", status="failed",
                           error=f"no config.yml found under {train_dir}")

    cmd = [
        which_tool("ns-export") or "ns-export", "gaussian-splat",
        "--load-config", str(cfg_path),
        "--output-dir", str(out_dir),
        "--output-filename", "output.ply",
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
    except subprocess.TimeoutExpired:
        return StageResult(name="export", status="failed", error="ns-export timed out (>1h)")
    if proc.returncode != 0 or not ply.exists():
        tail = (proc.stderr or proc.stdout or "")[-800:]
        return StageResult(name="export", status="failed", error=f"ns-export failed: {tail}")

    splat_count = _count_ply_vertices(ply)
    model_path = str(ply)

    if shutil.which("npx"):
        tf_cmd = ["npx", "--yes", "@playcanvas/splat-transform",
                  "--input", str(ply), "--output", str(spz), "--sog"]
        try:
            tf = subprocess.run(tf_cmd, capture_output=True, text=True, timeout=1800)
            if tf.returncode == 0 and spz.exists():
                model_path = str(spz)
        except subprocess.TimeoutExpired:
            pass

    _write_slate360_splat_json(cfg, ctx, out_dir=ctx["job_dir"], ply=ply, splat_count=splat_count)
    ctx["model_path"] = model_path
    size_kb = Path(model_path).stat().st_size // 1024
    return StageResult(name="export", status="done",
                       detail=f"exported {Path(model_path).name} ({size_kb} KB, ~{splat_count} splats)",
                       artifacts=[str(ply)] + ([str(spz)] if Path(model_path) == spz else []))


def _count_ply_vertices(ply: Path) -> int:
    try:
        with ply.open("rb") as fh:
            for _ in range(60):
                line = fh.readline()
                if line.startswith(b"element vertex"):
                    return int(line.split()[-1])
                if line.strip() == b"end_header":
                    break
    except Exception:
        pass
    return 0


def _write_slate360_splat_json(cfg, ctx: dict, out_dir: Path, ply: Path, splat_count: int) -> None:
    stats = ctx.get("sfm_stats", {})
    view_count = ctx.get("view_count") or stats.get("registered", 0)
    steps = ctx.get("training_steps_used") or cfg.resolved_steps(view_count)
    cap = ctx.get("resolved_splat_cap") or cfg.resolved_splat_cap(view_count)
    payload = {
        "exportedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "jobId": cfg.job_id,
        "settings": {
            "sphericalMode": cfg.spherical_mode,
            "viewImageSize": cfg.view_image_size,
            "resolvedViewPx": cfg.resolved_view_px,
            "shDegree": cfg.sh_degree,
            "strategy": cfg.strategy,
            "useBilateralGrid": cfg.use_bilateral_grid,
            "quality": cfg.quality,
        },
        "iterations": steps,
        "splatCount": splat_count,
        "inputPointCount": stats.get("points", 0),
        "viewCount": view_count,
        "stepResolution": {
            "mode": "auto" if cfg.quality == "auto" and not cfg.training_steps else "fixed",
            "viewCount": view_count,
            "imagesPerStep": cfg.images_per_step,
            "effectiveSteps": steps,
        },
        "splatCapResolution": {
            "mode": "auto" if not cfg.max_splats_millions else "fixed",
            "effectiveLimit": cap,
        },
        "quality": ctx.get("quality"),
        "sfmStats": stats,
        "outputPlyPath": str(ply),
    }
    (out_dir / "slate360-splat.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
