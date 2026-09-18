"""Experiment 4 arm runner: same corrected splatfacto trainer as Experiment 3, same
step-0/no-resume policy, same guards -- arms differ ONLY by cull_scale_thresh (exp4.py).

Every generic piece (heartbeat/guard loop, checkpoint sweep/hash, opacity stats, scalar
dump, QA render, gsplat CUDA assertion, input-identity verification against the exact
Experiment 3 dataset) is imported directly from train_arm_exp3.py, unmodified -- not
reimplemented -- so there is no chance of transcription drift on anything this experiment
is not supposed to change. Only resolved_arm_config/build_train_cmd (exp4.py) and the
arm-identity fields in run_arm differ.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent


def _lab_dir() -> Path:
    try:
        if Path("/root/splat-lab").is_dir():
            return Path("/root/splat-lab")
    except PermissionError:
        pass
    return ROOT.parent / "local" / "splat-lab"


LAB = _lab_dir()
for p in (str(ROOT), str(LAB)):
    if p not in sys.path:
        sys.path.insert(0, p)

import exp3  # noqa: E402 -- source of every frozen constant/guard/helper
import exp4  # noqa: E402 -- the one varying piece
from hashes import sha256_json  # noqa: E402
from manifest import write_result_manifest  # noqa: E402
from opacity_stats import ckpt_step, opacity_stats_for_ckpt  # noqa: E402
from train_arm_exp3 import (  # noqa: E402 -- reused unmodified, see module docstring
    _assert_gsplat_cuda,
    _versions,
    dump_scalars,
    hash_kept_checkpoints,
    render_ply_qa,
    run_ns_train,
    verify_inputs,
)
from effective_config import gpu_type, write_effective_config  # noqa: E402
from eval_arm import export_ply_at, run_ns_eval  # noqa: E402
from experiment import HOURLY_USD  # noqa: E402

WRAP = LAB / "ns_train_wrap.py"


def run_arm(*, work: Path, data_dir: Path, poses: Path, arm: dict[str, Any], recipe: dict[str, Any]) -> dict[str, Any]:
    work.mkdir(parents=True, exist_ok=True)
    train_dir = work / "train"
    train_dir.mkdir(parents=True, exist_ok=True)
    (work / "gsplat-cuda.json").write_text(json.dumps(_assert_gsplat_cuda(), indent=2) + "\n")
    # Same identity gate as Experiment 3: pose/seed/mask hashes and the exact 5,415/601
    # split must match -- this is what makes "unchanged dataset/split" a checked fact, not
    # an assumption.
    identity = verify_inputs(data_dir, recipe)
    (work / "input-identity.json").write_text(json.dumps(identity, indent=2) + "\n")

    resolved = exp4.resolved_arm_config(arm, recipe)
    (work / "resolved-config.json").write_text(json.dumps(resolved, indent=2, sort_keys=True) + "\n")
    cmd = exp4.build_train_cmd(python=sys.executable, wrap=WRAP, data_dir=data_dir, out_dir=train_dir, arm=arm)
    (work / "train-cmd.json").write_text(json.dumps(cmd, indent=2) + "\n")
    env = dict(os.environ)
    env.update({
        "SPLAT_LAB_EXP3": "1",  # same gsplat opacity-reset + accumulator-clear + population-guard patch, unmodified
        "EXP3_STATUS_DIR": str(work),
        "EXP3_MAX_LIVE_GAUSSIANS": str(exp3.MAX_LIVE_GAUSSIANS),
        "SPLAT_LAB_WRAP_STATUS_PATH": str(work / "wrap-status.json"),
    })
    train = run_ns_train(cmd, train_dir, work / "ns-train.log", env)
    (work / "gaussian-count.json").write_text(json.dumps(train.get("history") or [], indent=2) + "\n")
    (work / "refine-log.json").write_text(json.dumps(train["markers"], indent=2) + "\n")

    patch_path = work / "exp3-strategy-patch.json"
    patch = json.loads(patch_path.read_text()) if patch_path.is_file() else None
    patch_ok = bool(patch and patch.get("stock_probe_reset_called") is False and patch.get("patched_probe_reset_called") is True)
    wrap_path = work / "wrap-status.json"
    wrap = json.loads(wrap_path.read_text()) if wrap_path.is_file() else None
    pause_ok = bool(wrap and int(wrap.get("effective_pause_refine_after_reset") or -1) == exp3.PAUSE_REFINE_AFTER_RESET)

    dump_scalars(train_dir, work / "scalar-logs.json")
    hashes = hash_kept_checkpoints(train_dir, work / "checkpoint-hashes.json")
    kept_steps = sorted(int(r["step"]) for r in hashes if r.get("step") is not None)
    opacity = []
    for ckpt in sorted(train_dir.rglob("step-*.ckpt"), key=lambda p: ckpt_step(p) or -1):
        opacity.append(opacity_stats_for_ckpt(ckpt, exp3.OPACITY_THRESHOLDS))
    (work / "opacity-stats.json").write_text(json.dumps(opacity, indent=2) + "\n")

    finished = train.get("abort") is None and train.get("exit_code") == 0 and train.get("step", 0) >= exp3.MAX_STEPS - 1
    evals: dict[str, Any] = {}
    renders: dict[str, Any] = {}
    exports: dict[str, Any] = {}
    for step in exp3.EVAL_STEPS:
        if step not in kept_steps:
            evals[str(step)] = {"ok": False, "error": "checkpoint not present"}
            continue
        evals[str(step)] = run_ns_eval(train_dir, step, work / "eval" / f"metrics-{step}.json")
        exp = export_ply_at(train_dir, step, work / "export")
        exports[str(step)] = exp
        if exp.get("ok"):
            renders[str(step)] = render_ply_qa(Path(exp["ply"]), poses, work / "qa" / f"step-{step}")
    (work / "eval-summary.json").write_text(json.dumps(evals, indent=2) + "\n")

    if train.get("abort") or train["markers"].get("guard"):
        status = "failed_population_guard" if (train["markers"].get("guard") or "max_live" in str(train.get("abort"))) else "aborted"
    elif not finished:
        status = "failed"
    elif not (patch_ok and pause_ok):
        status = "failed_invalid_harness"
    else:
        status = "needs_review"

    effective = {
        **recipe,
        **resolved,
        "gpu": gpu_type(),
        "hourly_usd": HOURLY_USD,
        "versions": _versions(),
        "strategy_patch": patch,
        "wrap_status": wrap,
        "train": {k: train[k] for k in ("exit_code", "elapsed_s", "step", "gaussians", "abort", "cost_usd")},
        "kept_checkpoint_steps": kept_steps,
        "eval": evals,
        "exports": {k: {kk: v.get(kk) for kk in ("ok", "ply_sha256", "step")} for k, v in exports.items()},
    }
    write_effective_config(work / "effective-config.json", effective)
    result = {
        "experiment_id": exp4.EXPERIMENT_ID,
        "arm": arm["name"],
        "cull_scale_thresh": arm["cull_scale_thresh"],
        "changed_variable": exp4.CHANGED_VARIABLE,
        "status": status,
        "published": False,
        "human_verdict": "UNREVIEWED",
        "HUMAN_VISUAL_VERDICT": "UNREVIEWED",
        "effective_config_hash": sha256_json(effective),
        "harness_valid": patch_ok and pause_ok,
        "train": {k: train[k] for k in ("exit_code", "elapsed_s", "step", "gaussians", "abort", "cost_usd", "swept_checkpoints")},
        "markers": {"patch_applied": patch_ok, "accumulators_cleared": train["markers"].get("cleared"),
                    "guard": train["markers"].get("guard"), "refine_events": len(train["markers"].get("refine") or [])},
        "kept_checkpoint_steps": kept_steps,
        "eval": evals,
        "opacity_stats": opacity,
        "renders": renders,
        "gpu": gpu_type(),
        "cost_usd": train.get("cost_usd"),
    }
    write_result_manifest(work / "result-manifest.json", result)
    return result
