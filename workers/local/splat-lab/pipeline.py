"""Splat Lab pipeline orchestrator.

Runs stages in order and emits one JSON progress record per line to stdout:
    {"stage":"frames","status":"running","progress":0.5,"detail":"..."}
    {"stage":"frames","status":"done","progress":1.0,"elapsed_s":12.3}
    {"stage":"sfm","status":"failed","error":"..."}

Stage order: frames -> mask -> sfm (sub-stages sfm.features/sfm.matching/
sfm.mapping emitted internally) -> views -> train -> export. `views` is
skipped (not failed) for rig-mode or non-360 input, since those already
produce their own pinhole training set during SfM.

`from_stage` lets the UI's per-stage Rerun buttons resume mid-pipeline,
reusing whatever earlier stages already wrote to disk (frames.py/mask.py
already skip re-work when their outputs exist; sfm/views/train do not cache
partial output today, so a from-stage of "sfm" or later re-runs that stage
and everything after it, while frames/mask are skipped entirely).
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Callable

from config import SplatLabConfig
from result import StageResult
from stages import export as export_stage
from stages import frames as frames_stage
from stages import mask as mask_stage
from stages import sfm as sfm_stage
from stages import train as train_stage
from stages import views as views_stage

STAGE_ORDER = ("frames", "mask", "sfm", "views", "train", "export")


def emit(record: dict) -> None:
    """Write one progress record as a single JSON line to stdout."""
    sys.stdout.write(json.dumps(record, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def _timed(name: str, fn: Callable[[SplatLabConfig, dict], StageResult],
           ctx: dict, cfg: SplatLabConfig) -> StageResult:
    emit({"stage": name, "status": "running", "progress": 0.0})
    t0 = time.time()
    try:
        res = fn(cfg, ctx)
    except Exception as exc:  # noqa: BLE001 - surface any failure to the UI
        res = StageResult(name=name, status="failed", elapsed_s=time.time() - t0,
                          error=f"{type(exc).__name__}: {exc}")
    res.elapsed_s = res.elapsed_s or round(time.time() - t0, 3)
    emit({"stage": name, "status": res.status, "progress": 1.0,
          "elapsed_s": res.elapsed_s, "detail": res.detail,
          "artifacts": res.artifacts, "error": res.error})
    return res


def run(cfg: SplatLabConfig, from_stage: str | None = None) -> dict:
    """Run the pipeline from `from_stage` (default: the start). Returns the manifest dict."""
    errs = cfg.validate()
    if errs:
        emit({"stage": "pipeline", "status": "failed", "error": "; ".join(errs)})
        return {"status": "failed", "errors": errs}

    job_dir = cfg.job_dir
    job_dir.mkdir(parents=True, exist_ok=True)
    (job_dir / "config.json").write_text(cfg.to_json(), encoding="utf-8")

    ctx: dict = {
        "job_dir": job_dir,
        "images_dir": job_dir / "images",
        "masks_colmap_dir": str(job_dir / "masks_colmap"),
    }
    _prime_ctx_from_disk(ctx, job_dir)
    results: list[StageResult] = []

    start_idx = STAGE_ORDER.index(from_stage) if from_stage in STAGE_ORDER else 0

    if start_idx <= STAGE_ORDER.index("frames"):
        results.append(_timed("frames", frames_stage.run, ctx, cfg))
        if results[-1].status == "failed":
            return _finalize(cfg, results, ctx, "failed")

    if start_idx <= STAGE_ORDER.index("mask"):
        results.append(_timed("mask", mask_stage.run, ctx, cfg))
        if results[-1].status == "failed":
            return _finalize(cfg, results, ctx, "failed")

    if start_idx <= STAGE_ORDER.index("sfm"):
        results.append(_timed("sfm", sfm_stage.run, ctx, cfg))
        if results[-1].status in ("failed", "blocked"):
            return _finalize(cfg, results, ctx, results[-1].status)

    if start_idx <= STAGE_ORDER.index("views"):
        results.append(_timed("views", views_stage.run, ctx, cfg))
        if results[-1].status in ("failed", "blocked"):
            return _finalize(cfg, results, ctx, results[-1].status)

    if start_idx <= STAGE_ORDER.index("train"):
        results.append(_timed("train", train_stage.run, ctx, cfg))
        if results[-1].status in ("failed", "blocked"):
            return _finalize(cfg, results, ctx, results[-1].status)

    if start_idx <= STAGE_ORDER.index("export"):
        results.append(_timed("export", export_stage.run, ctx, cfg))
        if results[-1].status in ("failed", "blocked"):
            return _finalize(cfg, results, ctx, results[-1].status)

    return _finalize(cfg, results, ctx, "completed")


def _prime_ctx_from_disk(ctx: dict, job_dir: Path) -> None:
    """When resuming with --from-stage, populate ctx from artifacts already on
    disk so later stages don't need the earlier ones to have run in-process."""
    sfm_sparse = job_dir / "sfm" / "sparse"
    if sfm_sparse.exists():
        from colmap_io import find_sparse_dir
        found = find_sparse_dir(job_dir / "sfm")
        if found:
            ctx["sfm_sparse_dir"] = str(found)
    if (job_dir / "sfm" / "images").exists():
        ctx.setdefault("sfm_images_dir", str(job_dir / "images"))
    else:
        ctx.setdefault("sfm_images_dir", str(job_dir / "images"))
    stats_path = job_dir / "sfm" / "stats.json"
    if stats_path.exists():
        try:
            ctx["sfm_stats"] = json.loads(stats_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    if (job_dir / "views").exists():
        ctx["views_dir"] = str(job_dir / "views")
    if (job_dir / "train").exists():
        ctx["train_dir"] = str(job_dir / "train")
    quality_path = job_dir / "quality.json"
    if quality_path.exists():
        try:
            ctx["quality"] = json.loads(quality_path.read_text(encoding="utf-8"))
        except Exception:
            pass


def _finalize(cfg: SplatLabConfig, results: list[StageResult],
               ctx: dict, status: str) -> dict:
    model_path = ctx.get("model_path")
    out_ply = cfg.job_dir / "output.ply"
    out_spz = cfg.job_dir / "output.spz"
    if model_path and Path(model_path).exists() and model_path != str(out_ply) and model_path != str(out_spz):
        if model_path.endswith(".ply") and not out_ply.exists():
            import shutil as _sh
            _sh.copy2(model_path, out_ply)
    manifest = {
        "jobId": cfg.job_id,
        "status": status,
        "input": cfg.input_path,
        "is360": cfg.is360,
        "sphericalMode": cfg.spherical_mode,
        "modelPath": str(out_spz) if out_spz.exists() else (str(out_ply) if out_ply.exists() else None),
        "quality": ctx.get("quality"),
        "stages": [
            {"name": r.name, "status": r.status, "elapsed_s": r.elapsed_s,
             "detail": r.detail, "error": r.error, "artifacts": r.artifacts}
            for r in results
        ],
    }
    (cfg.job_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    emit({"stage": "pipeline", "status": status, "jobId": cfg.job_id})
    return manifest
