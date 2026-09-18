"""Room 213 Experiment 6 spec, REVISED: separate "more optimization" from "late scale prune."

H5 (Experiment 5) is NOT relaunched -- its existing step-15,999 checkpoint and metrics serve
as H5_16K_REFERENCE (16k appearance quality, 16k scale-tail state, grouped-validation
baseline). Two NEW arms are launched, both for 20,000 steps on the SAME panorama-grouped-
safe pool Experiment 5 already staged and verified (reused unchanged):

  K6-Extended-Control:        H5's recipe, extended to 20,000 steps. No late prune.
  L6-Extended-Scale-Prune:    identical to K6 in every way except one optimizer-aware,
                               scale-only prune at step 16,000 (cull_scale_thresh=0.08,
                               the existing, already-selected value) via
                               gsplat.strategy.ops.remove(), then 4,000 more steps.

H5 vs K6 is informational only (budget differs, not a strict single-variable comparison --
answers "does more training help" on its own). K6 vs L6 is the strict causal comparison:
both train 20,000 steps, and the ONLY intentional behavioral difference is whether the late
prune hook fires (late_prune_step: None vs 16000). late_prune_threshold is a fixed constant
(0.08) recorded identically for both arms whether or not the hook actually fires, and
late_prune_mechanism documents the (always-available, only-sometimes-triggered) mechanism
identically for both -- neither is a real behavioral difference, so both are excluded from
the strict diff.

Does not touch refine_stop_iter, stop_screen_size_at, densify_grad_thresh, cull_alpha_thresh,
opacity-reset behavior, SH degree, bilateral setting, resolution, seed, masks, poses, source
data, or steps_per_save -- every one is imported directly from exp3.py/exp4.py or held at
H5's own value, not retyped.

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
import exp5  # noqa: E402 -- H5's own resolved config, for the informational H5-vs-K6 diff

EXPERIMENT_ID = "room213-exp6"
CHANGED_VARIABLE = "late_prune_step"          # the one strict, behavioral K6-vs-L6 variable
TOTAL_STEPS = 20_000                          # both new arms
LATE_PRUNE_STEP = 16_000                      # the standard steps_per_save=500 cadence hits
                                               # this exactly; see preflight doc sec 3 for the
                                               # checkpoint-ordering proof this relies on
LATE_PRUNE_THRESHOLD = 0.08                   # = H5's own cull_scale_thresh; not a new number
STEPS_PER_SAVE = 500                          # unchanged from H5; hits 16000/16500/.../19500
SCALE_TRACK_STEPS = (16_000, 18_000, TOTAL_STEPS - 1)  # matched, read-only snapshot steps for
                                               # BOTH arms -- instrumentation, not a treatment;
                                               # empirically verified behavior-neutral (see
                                               # exp6_instrumentation_smoke_test.py)

ARM_K6 = {"name": "ROOM213_K6_EXTENDED_CONTROL", "max_num_iterations": TOTAL_STEPS, "late_prune_step": None}
ARM_L6 = {"name": "ROOM213_L6_EXTENDED_SCALE_PRUNE", "max_num_iterations": TOTAL_STEPS, "late_prune_step": LATE_PRUNE_STEP}


def resolved_arm_config(arm: dict[str, Any], recipe: dict[str, Any] | None = None) -> dict[str, Any]:
    """Same base exp5.py used for H5 (exp3.resolved_arm_config(exp3.ARM_D, recipe) +
    cull_scale_thresh + grouped-safe dataset fields), so this is directly, field-for-field
    comparable to H5's own resolved config -- not a different schema."""
    e5_arm = {"name": arm["name"], "cull_scale_thresh": exp4.E4_CULL_SCALE_THRESH}
    cfg = exp5.resolved_arm_config(e5_arm, recipe)
    cfg["arm_name"] = arm["name"]
    cfg["experiment_id"] = EXPERIMENT_ID
    cfg["changed_variable"] = CHANGED_VARIABLE
    cfg["max_steps"] = TOTAL_STEPS
    cfg["cli_max_num_iterations"] = TOTAL_STEPS
    cfg["steps_per_save"] = STEPS_PER_SAVE
    cfg["late_prune_step"] = arm["late_prune_step"]
    # Fixed, identical for BOTH arms regardless of whether the hook actually fires --
    # documents the constant/available mechanism, not a per-arm behavioral difference.
    cfg["late_prune_threshold"] = LATE_PRUNE_THRESHOLD
    cfg["late_prune_mechanism"] = (
        "gsplat.strategy.ops.remove() (the same function DefaultStrategy._prune_gs already "
        "uses for optimizer-aware removal) called once, outside DefaultStrategy entirely, "
        "via a SplatfactoModel.step_post_backward wrapper gated by "
        "SPLAT_LAB_EXP6_LATE_PRUNE_STEP; refine_stop_iter/stop_screen_size_at are never read "
        "or modified"
    )
    # Fixed, identical for BOTH arms -- read-only scale/population snapshots, not a
    # behavioral difference. See exp6_instrumentation.py.
    cfg["scale_track_steps"] = list(SCALE_TRACK_STEPS)
    return cfg


def preflight_diff_k6_vs_l6(cfg_k6: dict[str, Any], cfg_l6: dict[str, Any]) -> dict[str, Any]:
    """The strict, single-variable comparison: both arms train 20,000 steps; only
    late_prune_step may differ."""
    keys = sorted(set(cfg_k6) | set(cfg_l6))
    ignore = {"arm_name", "experiment_id"}
    differing = [k for k in keys if cfg_k6.get(k) != cfg_l6.get(k) and k not in ignore]
    ok = differing == [CHANGED_VARIABLE]
    return {
        "ok": ok,
        "differing_keys": differing,
        "expected_differing_keys": [CHANGED_VARIABLE],
        "arm_k6": {"name": cfg_k6["arm_name"], "late_prune_step": cfg_k6["late_prune_step"]},
        "arm_l6": {"name": cfg_l6["arm_name"], "late_prune_step": cfg_l6["late_prune_step"]},
        "field_count": len(keys),
    }


def build_train_cmd(*, python: str, wrap: Path, data_dir: Path, out_dir: Path, arm: dict[str, Any]) -> list[str]:
    """Identical for K6 and L6 -- the late prune is applied entirely via the
    SPLAT_LAB_EXP6_LATE_PRUNE_STEP environment variable (train_arm_exp6.py), never a CLI
    flag, so this returns the same argv shape as exp4/exp5 with only --max-num-iterations
    set to this experiment's shared TOTAL_STEPS."""
    e4_arm = {"name": arm["name"], "cull_scale_thresh": exp4.E4_CULL_SCALE_THRESH}
    cmd = exp4.build_train_cmd(python=python, wrap=wrap, data_dir=data_dir, out_dir=out_dir, arm=e4_arm)
    idx = cmd.index("--max-num-iterations")
    cmd[idx + 1] = str(int(arm["max_num_iterations"]))
    cmd[cmd.index("--steps-per-save") + 1] = str(STEPS_PER_SAVE)
    return cmd


def informational_diff_h5_vs_k6(cfg_h5: dict[str, Any], cfg_k6: dict[str, Any]) -> dict[str, Any]:
    """NOT a strict single-variable check (budget differs by design -- H5 answers a
    different question than K6-vs-L6 does). Reported for reference, not gated on ok=true."""
    keys = sorted(set(cfg_h5) | set(cfg_k6))
    ignore = {"arm_name", "experiment_id", "changed_variable"}
    differing = [k for k in keys if cfg_h5.get(k) != cfg_k6.get(k) and k not in ignore]
    # Fields expected to differ purely because Experiment 6's schema adds concepts H5 never
    # had (late-prune bookkeeping) -- not a behavioral difference, since late_prune_step is
    # None for K6 too. Reported separately from the real behavioral difference (step count).
    schema_only = {"late_prune_step", "late_prune_threshold", "late_prune_mechanism",
                   "steps_per_save", "scale_track_steps"}
    behavioral = [k for k in differing if k not in schema_only]
    return {
        "differing_keys": differing,
        "behavioral_differences": behavioral,
        "schema_only_differences": [k for k in differing if k in schema_only],
        "expected_behavioral_difference": ["max_steps", "cli_max_num_iterations"],
        "note": "informational only, per instruction -- H5 vs K6 answers 'does more "
                "training help', not a controlled ablation; the strict comparison is K6 vs L6",
    }


if __name__ == "__main__":
    recipe_path = ROOT.parent.parent / "qa" / "exp5-frozen-recipe.json"
    doc = json.load(open(recipe_path)) if recipe_path.is_file() else None
    recipe = doc["recipe"] if doc else None

    cfg_k6 = resolved_arm_config(ARM_K6, recipe)
    cfg_l6 = resolved_arm_config(ARM_L6, recipe)
    strict = preflight_diff_k6_vs_l6(cfg_k6, cfg_l6)
    print("=== K6 vs L6 (strict, must be exactly late_prune_step) ===")
    print(json.dumps(strict, indent=2, default=str))

    if doc:
        cfg_h5 = exp5.resolved_arm_config(exp5.ARM_H5, recipe)  # same recipe passed to both sides
        info = informational_diff_h5_vs_k6(cfg_h5, cfg_k6)
        print("\n=== H5 vs K6 (informational only) ===")
        print(json.dumps(info, indent=2, default=str))

    from pathlib import Path as P
    cmd_k6 = build_train_cmd(python="python", wrap=P("ns_train_wrap.py"), data_dir=P("<data>"),
                              out_dir=P("<out>"), arm=ARM_K6)
    cmd_l6 = build_train_cmd(python="python", wrap=P("ns_train_wrap.py"), data_dir=P("<data>"),
                              out_dir=P("<out>"), arm=ARM_L6)
    assert len(cmd_k6) == len(cmd_l6)
    argv_diff = [(a, b) for a, b in zip(cmd_k6, cmd_l6) if a != b]
    print("\nargv token differences (K6, L6):", argv_diff, "(expected: none -- env-var only)")
    print("K6 env: (no SPLAT_LAB_EXP6_LATE_PRUNE_STEP)")
    print("L6 env: SPLAT_LAB_EXP6_LATE_PRUNE_STEP=16000 SPLAT_LAB_EXP6_LATE_PRUNE_THRESH=0.08")
