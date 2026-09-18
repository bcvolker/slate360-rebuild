"""Experiment 6 arm runner: same corrected splatfacto trainer, same panorama-grouped-safe
dataset Experiment 5 already staged and verified (reused unchanged -- no restaging, no new
split). Arms differ only in max_num_iterations and (K6 only) one late, optimizer-aware,
scale-only prune applied via exp6_late_prune_patch.py (env-var gated, see that module).

Reuses every generic helper from train_arm_exp3.py unmodified, and verify_inputs_grouped
from train_arm_exp5.py unmodified (same dataset identity check, same grouped split).
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

import exp3  # noqa: E402
import exp6  # noqa: E402
from hashes import sha256_json  # noqa: E402
from manifest import write_result_manifest  # noqa: E402
from opacity_stats import ckpt_step, opacity_stats_for_ckpt  # noqa: E402
from train_arm_exp3 import (  # noqa: E402 -- reused unmodified
    _assert_gsplat_cuda,
    _versions,
    dump_scalars,
    hash_kept_checkpoints,
    render_ply_qa,
    run_ns_train,
    sweep_checkpoints,
)
from train_arm_exp5 import verify_inputs_grouped  # noqa: E402 -- reused unmodified, same split
from effective_config import gpu_type, write_effective_config  # noqa: E402
from eval_arm import export_ply_at, run_ns_eval  # noqa: E402
from experiment import HOURLY_USD  # noqa: E402

WRAP = LAB / "ns_train_wrap.py"


def _keep_steps_for(arm: dict[str, Any]) -> set[int]:
    total = int(arm["max_num_iterations"])
    base = {500, 3000, 6000, 8000, 9000, 11000, 13000, total - 1}
    if arm.get("late_prune_step") is not None:
        step = int(arm["late_prune_step"])
        base |= {step - 1, step, min(step + 1000, total - 1)}  # just-before / just-after prune / +1k recovery
    return {s for s in base if 0 <= s < total}


def run_arm(*, work: Path, grouped_data_dir: Path, full_transforms_path: Path, poses: Path,
            arm: dict[str, Any], recipe: dict[str, Any]) -> dict[str, Any]:
    work.mkdir(parents=True, exist_ok=True)
    train_dir = work / "train"
    train_dir.mkdir(parents=True, exist_ok=True)
    (work / "gsplat-cuda.json").write_text(json.dumps(_assert_gsplat_cuda(), indent=2) + "\n")

    identity = verify_inputs_grouped(grouped_data_dir, full_transforms_path, recipe)
    (work / "input-identity.json").write_text(json.dumps(identity, indent=2) + "\n")

    resolved = exp6.resolved_arm_config(arm, recipe)
    (work / "resolved-config.json").write_text(json.dumps(resolved, indent=2, sort_keys=True) + "\n")
    cmd = exp6.build_train_cmd(python=sys.executable, wrap=WRAP, data_dir=grouped_data_dir, out_dir=train_dir, arm=arm)
    (work / "train-cmd.json").write_text(json.dumps(cmd, indent=2) + "\n")

    keep = _keep_steps_for(arm)
    env = dict(os.environ)
    env.update({
        "SPLAT_LAB_EXP3": "1",  # opacity-reset + accumulator-clear + population-guard patch, unmodified
        "EXP3_STATUS_DIR": str(work),
        "EXP3_MAX_LIVE_GAUSSIANS": str(exp3.MAX_LIVE_GAUSSIANS),
        "SPLAT_LAB_WRAP_STATUS_PATH": str(work / "wrap-status.json"),
    })
    if arm.get("late_prune_step") is not None:
        env["SPLAT_LAB_EXP6_LATE_PRUNE_STEP"] = str(int(arm["late_prune_step"]))
        env["SPLAT_LAB_EXP6_LATE_PRUNE_THRESH"] = str(float(resolved["late_prune_threshold"]))

    train = run_ns_train(cmd, train_dir, work / "ns-train.log", env)
    (work / "gaussian-count.json").write_text(json.dumps(train.get("history") or [], indent=2) + "\n")
    (work / "refine-log.json").write_text(json.dumps(train["markers"], indent=2) + "\n")

    late_prune_record = None
    train_log = work / "ns-train.log"
    if train_log.is_file():
        for line in train_log.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.startswith("EXP6_LATE_PRUNE "):
                late_prune_record = json.loads(line[len("EXP6_LATE_PRUNE "):])
    (work / "late-prune-record.json").write_text(json.dumps(late_prune_record, indent=2) + "\n")
    if arm.get("late_prune_step") is not None and late_prune_record is None:
        raise RuntimeError("EXP6: K6 was configured with a late_prune_step but no "
                            "EXP6_LATE_PRUNE marker was found in the training log -- the "
                            "patch did not fire; refusing to treat this run as valid")

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

    total_steps = int(arm["max_num_iterations"])
    finished = train.get("abort") is None and train.get("exit_code") == 0 and train.get("step", 0) >= total_steps - 1

    eval_steps = sorted({8000, total_steps - 1})
    evals: dict[str, Any] = {}
    renders: dict[str, Any] = {}
    exports: dict[str, Any] = {}
    for step in eval_steps:
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
    elif arm.get("late_prune_step") is not None and late_prune_record is None:
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
        "late_prune_record": late_prune_record,
        "train": {k: train[k] for k in ("exit_code", "elapsed_s", "step", "gaussians", "abort", "cost_usd")},
        "kept_checkpoint_steps": kept_steps,
        "eval_nerfstudio_internal_split": evals,
        "exports": {k: {kk: v.get(kk) for kk in ("ok", "ply_sha256", "step")} for k, v in exports.items()},
    }
    write_effective_config(work / "effective-config.json", effective)
    result = {
        "experiment_id": exp6.EXPERIMENT_ID,
        "arm": arm["name"],
        "max_num_iterations": total_steps,
        "late_prune_step": arm.get("late_prune_step"),
        "changed_variable": exp6.CHANGED_VARIABLE,
        "status": status,
        "published": False,
        "human_verdict": "UNREVIEWED",
        "HUMAN_VISUAL_VERDICT": "UNREVIEWED",
        "effective_config_hash": sha256_json(effective),
        "harness_valid": patch_ok and pause_ok and (late_prune_record is not None if arm.get("late_prune_step") is not None else True),
        "train": {k: train[k] for k in ("exit_code", "elapsed_s", "step", "gaussians", "abort", "cost_usd", "swept_checkpoints")},
        "markers": {"patch_applied": patch_ok, "accumulators_cleared": train["markers"].get("cleared"),
                    "guard": train["markers"].get("guard"), "refine_events": len(train["markers"].get("refine") or [])},
        "late_prune_record": late_prune_record,
        "kept_checkpoint_steps": kept_steps,
        "eval_nerfstudio_internal_split": evals,
        "opacity_stats": opacity,
        "renders": renders,
        "gpu": gpu_type(),
        "cost_usd": train.get("cost_usd"),
    }
    write_result_manifest(work / "result-manifest.json", result)
    return result
