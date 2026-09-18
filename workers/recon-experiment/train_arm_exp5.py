"""Experiment 5 arm runner: same corrected splatfacto trainer as Experiment 3/4, same
step-0/no-resume policy, same guards -- arms differ ONLY by cull_scale_thresh (exp5.py),
trained on the panorama-grouped-safe pool instead of the historical split.

Reuses every generic Experiment 3/4 helper unmodified (heartbeat/guard loop, checkpoint
sweep/hash, opacity stats, scalar dump, QA render, gsplat CUDA assertion). Only
verify_inputs is new here, because the split-validity check genuinely differs (grouped
panorama holdout, not the historical view-level fraction) -- see verify_inputs_grouped.
After training, runs the grouped-validation evaluator (exp5_grouped_eval.py) against the
38 withheld panoramas, which nerfstudio's own ns-eval structurally cannot reach (their
images are not in the training dataset at all).
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
import exp4  # noqa: E402
import exp5  # noqa: E402
from hashes import sha256_dir, sha256_file, sha256_json  # noqa: E402
from manifest import write_result_manifest  # noqa: E402
from opacity_stats import ckpt_step, opacity_stats_for_ckpt  # noqa: E402
from train_arm_exp3 import (  # noqa: E402 -- reused unmodified, see module docstring
    _assert_gsplat_cuda,
    _versions,
    dump_scalars,
    hash_kept_checkpoints,
    render_ply_qa,
    run_ns_train,
    sweep_checkpoints,
)
from effective_config import gpu_type, write_effective_config  # noqa: E402
from eval_arm import export_ply_at, run_ns_eval  # noqa: E402
from experiment import HOURLY_USD  # noqa: E402

WRAP = LAB / "ns_train_wrap.py"


def verify_inputs_grouped(grouped_data_dir: Path, full_transforms_path: Path, recipe: dict[str, Any]) -> dict[str, Any]:
    """The grouped-safe views directory must be the frozen source, correctly re-derived
    from the untouched full manifest -- not a separately-maintained copy that could drift.
    mask_hash/seed_hash are checked exactly as Experiment 3/4 did (same underlying files);
    pose_hash is checked against the GROUPED-SAFE transforms.json specifically."""
    grouped_transforms = grouped_data_dir / "transforms.json"
    # grouped_data_dir (.../cecc2763/views-exp5-grouped) is a SIBLING of the original
    # views/ directory -- both are direct children of .../cecc2763/ -- so sfm/ is one
    # parent up, exactly like the original verify_inputs' data_dir.parent (not two).
    points = grouped_data_dir.parent / "sfm" / "points.ply"
    masks = grouped_data_dir / "masks"
    got = {
        "pose_hash": sha256_file(grouped_transforms),
        "seed_hash": sha256_file(points) if points.is_file() else None,
        "mask_hash": sha256_dir(masks, ("*.png",)) if masks.is_dir() else None,
    }
    mismatch = {k: (recipe.get(k), got[k]) for k in got if recipe.get(k) != got[k]}
    if mismatch:
        raise RuntimeError(f"EXP5 input identity mismatch (recipe vs volume): {mismatch}")
    split = exp5.dataset_split_grouped(full_transforms_path, grouped_transforms)
    if not split["matches_expected"]:
        raise RuntimeError(f"EXP5 grouped-split mismatch: { {k: v for k, v in split.items() if k != 'withheld_panoramas_full'} }")
    return {"hashes": got, "split": {k: v for k, v in split.items() if k != "withheld_panoramas_full"}}


def run_arm(*, work: Path, grouped_data_dir: Path, full_transforms_path: Path, poses: Path,
            arm: dict[str, Any], recipe: dict[str, Any]) -> dict[str, Any]:
    work.mkdir(parents=True, exist_ok=True)
    train_dir = work / "train"
    train_dir.mkdir(parents=True, exist_ok=True)
    (work / "gsplat-cuda.json").write_text(json.dumps(_assert_gsplat_cuda(), indent=2) + "\n")

    identity = verify_inputs_grouped(grouped_data_dir, full_transforms_path, recipe)
    (work / "input-identity.json").write_text(json.dumps(identity, indent=2) + "\n")

    resolved = exp5.resolved_arm_config(arm, recipe)
    (work / "resolved-config.json").write_text(json.dumps(resolved, indent=2, sort_keys=True) + "\n")
    cmd = exp4.build_train_cmd(python=sys.executable, wrap=WRAP, data_dir=grouped_data_dir, out_dir=train_dir, arm=arm)
    (work / "train-cmd.json").write_text(json.dumps(cmd, indent=2) + "\n")
    env = dict(os.environ)
    env.update({
        "SPLAT_LAB_EXP3": "1",
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

    # Historical-style eval (same split RULE re-applied over the grouped-safe pool; NOT
    # bit-comparable to Exp3/4's historical numbers -- see resolved-config's
    # grouped_validation_note). Uses the standard ns-eval path since this split IS the
    # dataset nerfstudio itself trained/internally-evaluated on.
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
        "eval_nerfstudio_internal_split": evals,
        "exports": {k: {kk: v.get(kk) for kk in ("ok", "ply_sha256", "step")} for k, v in exports.items()},
    }
    write_effective_config(work / "effective-config.json", effective)
    result = {
        "experiment_id": exp5.EXPERIMENT_ID,
        "arm": arm["name"],
        "cull_scale_thresh": arm["cull_scale_thresh"],
        "changed_variable": exp5.CHANGED_VARIABLE,
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
        "eval_nerfstudio_internal_split": evals,
        "opacity_stats": opacity,
        "renders": renders,
        "gpu": gpu_type(),
        "cost_usd": train.get("cost_usd"),
    }
    write_result_manifest(work / "result-manifest.json", result)
    return result
