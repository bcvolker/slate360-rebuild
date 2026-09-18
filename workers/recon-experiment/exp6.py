"""Room 213 Experiment 6 spec: longer convergence + one late, optimizer-aware, scale-only
prune, tested against the SAME panorama-grouped-safe split Experiment 5 already staged and
verified (no dataset/mask/pose change of any kind -- reused, not rebuilt).

J6-Control reproduces H5 exactly (cull_scale_thresh=0.08, 16,000 steps, no late prune).
K6-Extended-Recovery is identical to J6 in every frozen respect and differs only in the two
fields that together define "the treatment": max_num_iterations (extended) and
late_prune_step (+ threshold, fixed at 0.08 -- the same, already-supported value H5 used).

Does not touch refine_stop_iter, stop_screen_size_at, densify_grad_thresh, cull_alpha_thresh,
opacity-reset behavior, SH degree, bilateral setting, resolution, seed, masks, poses, or
source data -- every one of those is imported directly from exp3.py/exp4.py, not retyped.

Do not launch from here. Preflight only; a human must approve before any GPU spend.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import exp3  # noqa: E402 -- source of every frozen field
import exp4  # noqa: E402 -- H5's own densify/cull-scale recipe (E4_CULL_SCALE_THRESH = 0.08)

EXPERIMENT_ID = "room213-exp6"
CHANGED_VARIABLE = ["max_num_iterations", "late_prune_step"]  # the treatment, as a pair

# --- Option A (recommended; see preflight doc sec 5 for B and C) -----------------------
J6_TOTAL_STEPS = 16_000          # bit-identical to H5
K6_TOTAL_STEPS = 20_000          # +4,000 recovery steps after the late prune
LATE_PRUNE_STEP = 16_000         # exactly where H5's own run ended -- fully evidenced state
LATE_PRUNE_THRESHOLD = 0.08      # same threshold already validated in Exp3/4/5, not a new number

ARM_J6 = {"name": "ROOM213_J6_CONTROL", "max_num_iterations": J6_TOTAL_STEPS, "late_prune_step": None}
ARM_K6 = {"name": "ROOM213_K6_EXTENDED_RECOVERY", "max_num_iterations": K6_TOTAL_STEPS,
          "late_prune_step": LATE_PRUNE_STEP}


def resolved_arm_config(arm: dict[str, Any], recipe: dict[str, Any] | None = None) -> dict[str, Any]:
    """Start from H5's own recipe (cull_scale_thresh=0.08, via exp4) so every frozen field
    is guaranteed identical by construction, then override only the two treatment fields."""
    base_arm = {"name": arm["name"], "cull_scale_thresh": exp4.E4_CULL_SCALE_THRESH}
    cfg = exp3.resolved_arm_config(exp3.ARM_D, recipe)
    cfg["arm_name"] = arm["name"]
    cfg["experiment_id"] = EXPERIMENT_ID
    cfg["changed_variable"] = CHANGED_VARIABLE
    cfg["cull_scale_thresh_prune_scale3d"] = exp4.E4_CULL_SCALE_THRESH  # frozen at H5's value, same for both arms
    cfg["max_steps"] = int(arm["max_num_iterations"])
    cfg["cli_max_num_iterations"] = int(arm["max_num_iterations"])
    cfg["late_prune_step"] = arm["late_prune_step"]
    cfg["late_prune_threshold"] = LATE_PRUNE_THRESHOLD if arm["late_prune_step"] is not None else None
    cfg["late_prune_mechanism"] = (
        "gsplat.strategy.ops.remove() called once outside DefaultStrategy's own refine cycle "
        "(step_post_backward wrapped at the SplatfactoModel level, after the strategy's own "
        "early return at step >= refine_stop_iter); refine_stop_iter/stop_screen_size_at are "
        "never touched or reactivated"
    ) if arm["late_prune_step"] is not None else None
    # Dataset fields: SAME grouped-safe pool as Experiment 5, reused unchanged (no rebuild).
    cfg["dataset_total_views"] = 5_408
    cfg["dataset_train_images"] = 4_868
    cfg["dataset_eval_images"] = 540
    cfg["dataset_train_order_sha256"] = "0f8f367e6a43001f42fe58199009c9423876869192dfc3e50e5c4c25dbff0949"
    cfg["dataset_eval_order_sha256"] = "bdccc23ccd377f2e659fc83635d05d175cace40c71307a75d45261df5b21b3a5"
    cfg["grouped_validation_withheld_panoramas"] = 38
    cfg["grouped_validation_withheld_images"] = 608
    return cfg


def preflight_diff(cfg_j6: dict[str, Any], cfg_k6: dict[str, Any]) -> dict[str, Any]:
    keys = sorted(set(cfg_j6) | set(cfg_k6))
    ignore = {"arm_name", "experiment_id"}
    differing = [k for k in keys if cfg_j6.get(k) != cfg_k6.get(k) and k not in ignore]
    expected = sorted(["max_steps", "cli_max_num_iterations", "late_prune_step",
                        "late_prune_threshold", "late_prune_mechanism"])
    ok = differing == expected
    return {
        "ok": ok,
        "differing_keys": differing,
        "expected_differing_keys": expected,
        "note": "5 fields differ because the treatment is a pair (extended step count + the "
                "late prune it exists to support); every other field -- cull_scale_thresh, "
                "densify threshold, refine timing, opacity behavior, screen-size logic, SH "
                "degree, bilateral, resolution, seed, dataset -- is identical.",
        "arm_j6": {"name": cfg_j6["arm_name"], "max_steps": cfg_j6["max_steps"], "late_prune_step": cfg_j6["late_prune_step"]},
        "arm_k6": {"name": cfg_k6["arm_name"], "max_steps": cfg_k6["max_steps"], "late_prune_step": cfg_k6["late_prune_step"]},
        "field_count": len(keys),
    }


def build_train_cmd(*, python: str, wrap: Path, data_dir: Path, out_dir: Path, arm: dict[str, Any]) -> list[str]:
    """Token-for-token identical to exp4.build_train_cmd (same cull_scale_thresh for both
    arms) except --max-num-iterations, which is the one CLI-visible treatment field. The
    late prune itself is not a CLI flag -- it's applied by exp6_late_prune_patch.py via the
    SPLAT_LAB_EXP6_LATE_PRUNE_STEP environment variable, set only for K6."""
    e4_arm = {"name": arm["name"], "cull_scale_thresh": exp4.E4_CULL_SCALE_THRESH}
    cmd = exp4.build_train_cmd(python=python, wrap=wrap, data_dir=data_dir, out_dir=out_dir, arm=e4_arm)
    idx = cmd.index("--max-num-iterations")
    cmd[idx + 1] = str(int(arm["max_num_iterations"]))
    return cmd


if __name__ == "__main__":
    cfg_j6 = resolved_arm_config(ARM_J6)
    cfg_k6 = resolved_arm_config(ARM_K6)
    diff = preflight_diff(cfg_j6, cfg_k6)
    print(json.dumps({"diff": diff}, indent=2, default=str))

    cmd_j6 = build_train_cmd(python="python", wrap=Path("ns_train_wrap.py"),
                              data_dir=Path("<data>"), out_dir=Path("<out>"), arm=ARM_J6)
    cmd_k6 = build_train_cmd(python="python", wrap=Path("ns_train_wrap.py"),
                              data_dir=Path("<data>"), out_dir=Path("<out>"), arm=ARM_K6)
    argv_diff = [(a, b) for a, b in zip(cmd_j6, cmd_k6) if a != b]
    print("\nargv token differences (J6, K6):", argv_diff)
    assert len(cmd_j6) == len(cmd_k6)
    assert len(argv_diff) == 1, f"expected exactly one differing argv token, got {len(argv_diff)}"
    print("exactly one differing argv token confirmed (--max-num-iterations value)")
    print("K6 additionally sets env SPLAT_LAB_EXP6_LATE_PRUNE_STEP=16000 "
          "SPLAT_LAB_EXP6_LATE_PRUNE_THRESH=0.08 (not a CLI/argv change)")
