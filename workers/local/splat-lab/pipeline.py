"""Splat Lab pipeline orchestrator.

Runs stages in order and emits one JSON progress record per line to stdout
(JSON for easy parsing):
    {"stage":"frames","status":"running","progress":0.5,"detail":"..."}
    {"stage":"frames","status":"done","progress":1.0,"elapsed_s":12.3}
    {"stage":"sfm","status":"failed","error":"nerfstudio not installed ..."}

Stages are real where deps are available; otherwise they emit a structured
`blocked` record with install instructions so the web UI can show next steps.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Callable

from config import SplatLabConfig
from result import StageResult
from stages import frames as frames_stage
from stages import sfm as sfm_stage
from stages import mask as mask_stage
from stages import train as train_stage
from stages import export as export_stage


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


def run(cfg: SplatLabConfig) -> dict:
    """Run the full pipeline. Returns the final manifest dict."""
    errs = cfg.validate()
    if errs:
        emit({"stage": "pipeline", "status": "failed", "error": "; ".join(errs)})
        return {"status": "failed", "errors": errs}

    job_dir = cfg.job_dir
    job_dir.mkdir(parents=True, exist_ok=True)
    (job_dir / "config.json").write_text(cfg.to_json(), encoding="utf-8")

    ctx: dict = {"job_dir": job_dir, "images_dir": job_dir / "images"}
    results: list[StageResult] = []

    # Stage 1: Prepare images (real — ffmpeg or folder copy)
    results.append(_timed("frames", frames_stage.run, ctx, cfg))
    if results[-1].status == "failed":
        return _finalize(cfg, results, status="failed")

    # Stage 2: People masking (optional — runs BEFORE SfM so people don't
    # create spurious points). Skipped if remove_people is off or deps missing.
    results.append(_timed("mask", mask_stage.run, ctx, cfg))
    if results[-1].status == "failed":
        return _finalize(cfg, results, status="failed")

    # Stage 3: SfM (COLMAP via ns-process-data; 360 -> 6 cube faces first)
    results.append(_timed("sfm", sfm_stage.run, ctx, cfg))
    if results[-1].status == "failed":
        return _finalize(cfg, results, status="failed")
    if results[-1].status == "blocked":
        return _finalize(cfg, results, status="blocked")

    # Stage 4: Train (ns-train splatfacto)
    results.append(_timed("train", train_stage.run, ctx, cfg))
    if results[-1].status in ("failed", "blocked"):
        return _finalize(cfg, results, status=results[-1].status)

    # Stage 5: Export + convert (ns-export -> .ply, splat-transform -> .spz)
    results.append(_timed("export", export_stage.run, ctx, cfg))
    if results[-1].status in ("failed", "blocked"):
        return _finalize(cfg, results, status=results[-1].status)

    return _finalize(cfg, results, status="completed")


def _finalize(cfg: SplatLabConfig, results: list[StageResult],
               status: str) -> dict:
    manifest = {
        "jobId": cfg.job_id,
        "status": status,
        "input": cfg.input_path,
        "is360": cfg.is360,
        "stages": [
            {"name": r.name, "status": r.status, "elapsed_s": r.elapsed_s,
             "detail": r.detail, "error": r.error, "artifacts": r.artifacts}
            for r in results
        ],
    }
    (cfg.job_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8")
    emit({"stage": "pipeline", "status": status, "jobId": cfg.job_id})
    return manifest
