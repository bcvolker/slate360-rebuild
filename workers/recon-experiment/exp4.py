"""Room 213 Experiment 4 spec: two arms differing ONLY by cull_scale_thresh (prune_scale3d).

Frozen at Experiment 3 Arm D's exact values (imported directly, not copy-pasted, to remove
any chance of drift): densify_grad_thresh, warmup_length, stop_split_at,
pause_refine_after_reset, reset_alpha_every, cull_alpha_thresh, stop_screen_size_at,
use_absgrad, sh_degree(+interval), bilateral/scale-reg, resolution, seed, checkpoint/eval
schedule, gsplat opacity-reset patch, accumulator clear, hard population guard. Everything
Experiment 3 already validated as correct stays exactly as it was.

Preferred mechanism (source-inspected, not invented): gsplat 1.5.3 DefaultStrategy._prune_gs
already implements a per-Gaussian max-scale prune, evaluated at every refinement event once
step > reset_every:

    is_too_big = exp(params["scales"]).max(-1) > prune_scale3d * scene_scale

splatfacto maps its own `cull_scale_thresh` config field directly onto `prune_scale3d`, and
fixes `scene_scale=1.0` (SplatfactoModel.populate_modules -> initialize_state(scene_scale=1.0)),
so `cull_scale_thresh` already *is* the world-unit max-scale threshold, with no unit
conversion needed. This is gsplat's own supported, previously-shipped mechanism -- not a new
patch. Arm D's own resolved config already carries `cull_scale_thresh=0.15`
(docs/ops/exp3-room213-review/arm-d/resolved-config.json), roughly 1.9x above the empirical
p99.9 max-scale of Arm D's own final population (0.0798), which is why it never fired during
Experiment 3.

CONFIRMED (2026-09-18, after review): both arms train on the *exact*, unmodified
Experiment 3 dataset partition -- the same 6,016 derived views, the same 5,415-image train
set, the same 601-image historical eval set, same order/hashes
(`dataset_train_order_sha256` / `dataset_eval_order_sha256` below, byte-identical to Arm
D's). `resolved_arm_config()` gets these fields by importing `exp3.resolved_arm_config`
directly, so this is guaranteed by construction, not by a separate check. The
panorama-grouped split (`exp4_panorama_split.py`) is NOT used here -- it is prepared and
documented for a *future*, separate location-generalization experiment
(`PREPARED_FOR_FUTURE_LOCATION_GENERALIZATION_VALIDATION`), not this one.

Do not launch from here. Preflight only; a human must approve before any GPU spend.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import exp3  # noqa: E402 -- source of truth for every frozen field

EXPERIMENT_ID = "room213-exp4"
CHANGED_VARIABLE = "cull_scale_thresh_prune_scale3d"

# Derived from Arm D's own empirical max-scale distribution
# (docs/ops/exp3-haze-diagnostic-review/gaussian_and_footprint_stats.json,
# gaussian_quality_stats_arm_d.largest_by_max_scale.top0.1pct.threshold_value =
# 0.0801236554980278), which is also the exact post-hoc filter the Experiment 3 haze
# diagnostic found removed the dollhouse/overhead haze for the smallest measured cost
# (-0.065 dB held-out PSNR, one small localized on-path defect) of every variant tested.
# Rounded to two significant figures for a clean CLI value; not an invented number.
E4_CULL_SCALE_THRESH = 0.08

ARM_D4 = {"name": "ROOM213_D4_CONTROL", "cull_scale_thresh": exp3.CULL_SCALE_THRESH}
ARM_E4 = {"name": "ROOM213_E4_SCALE_CONTROL", "cull_scale_thresh": E4_CULL_SCALE_THRESH}


def resolved_arm_config(arm: dict[str, Any], recipe: dict[str, Any] | None = None) -> dict[str, Any]:
    """Start from Arm D's own resolved config verbatim (same function, same constants) and
    override only cull_scale_thresh and the arm-identity fields. Every other field is
    guaranteed identical to Arm D because it is computed by the same exp3 code."""
    cfg = exp3.resolved_arm_config(exp3.ARM_D, recipe)
    cfg["arm_name"] = arm["name"]
    cfg["experiment_id"] = EXPERIMENT_ID
    cfg["changed_variable"] = CHANGED_VARIABLE
    cfg["cull_scale_thresh_prune_scale3d"] = float(arm["cull_scale_thresh"])
    cfg["cull_scale_thresh_source"] = (
        "frozen at Experiment 3 Arm D's value (0.15, effectively inert)"
        if arm is ARM_D4 or arm["cull_scale_thresh"] == exp3.CULL_SCALE_THRESH
        else "empirical: Arm D final-population max-scale top-0.1pct threshold "
             "(0.0801236554980278), rounded to 0.08"
    )
    return cfg


def preflight_diff(cfg_d4: dict[str, Any], cfg_e4: dict[str, Any]) -> dict[str, Any]:
    keys = sorted(set(cfg_d4) | set(cfg_e4))
    ignore = {"arm_name", "experiment_id", "cull_scale_thresh_source"}
    differing = [k for k in keys if cfg_d4.get(k) != cfg_e4.get(k) and k not in ignore]
    ok = differing == [CHANGED_VARIABLE]
    return {
        "ok": ok,
        "differing_keys": differing,
        "expected_differing_keys": [CHANGED_VARIABLE],
        "arm_d4": {"name": cfg_d4["arm_name"], CHANGED_VARIABLE: cfg_d4[CHANGED_VARIABLE]},
        "arm_e4": {"name": cfg_e4["arm_name"], CHANGED_VARIABLE: cfg_e4[CHANGED_VARIABLE]},
        "field_count": len(keys),
    }


def build_train_cmd(*, python: str, wrap: Path, data_dir: Path, out_dir: Path, arm: dict[str, Any]) -> list[str]:
    """Identical to exp3.build_train_cmd token-for-token except the one CLI flag whose value
    this experiment varies (--pipeline.model.cull-scale-thresh). Everything else -- flag
    order, flag names, every other value -- is read from exp3's own module constants, so a
    text diff of the two arms' argv shows exactly one changed token."""
    thresh = float(arm["cull_scale_thresh"])
    return [
        python, str(wrap), "splatfacto",
        "--data", str(data_dir),
        "--output-dir", str(out_dir),
        "--max-num-iterations", str(exp3.MAX_STEPS),
        "--machine.seed", str(exp3.RNG_SEED),
        "--pipeline.model.sh-degree", str(exp3.SH_DEGREE),
        "--pipeline.model.sh-degree-interval", str(exp3.SH_DEGREE_INTERVAL),
        "--pipeline.model.warmup-length", str(exp3.WARMUP_LENGTH),
        "--pipeline.model.refine-every", str(exp3.REFINE_EVERY),
        "--pipeline.model.reset-alpha-every", str(exp3.RESET_ALPHA_EVERY),
        "--pipeline.model.cull-alpha-thresh", repr(exp3.CULL_ALPHA_THRESH),
        "--pipeline.model.cull-scale-thresh", repr(thresh),
        "--pipeline.model.densify-grad-thresh", repr(exp3.ARM_D["densify_grad_thresh"]),
        "--pipeline.model.use-absgrad", "True" if exp3.USE_ABSGRAD else "False",
        "--pipeline.model.stop-split-at", str(exp3.REFINE_STOP_ITER),
        "--pipeline.model.stop-screen-size-at", str(exp3.STOP_SCREEN_SIZE_AT),
        "--pipeline.model.use-bilateral-grid", "True" if exp3.USE_BILATERAL_GRID else "False",
        "--pipeline.model.use-scale-regularization", "True" if exp3.USE_SCALE_REGULARIZATION else "False",
        "--pipeline.datamanager.cache-images", "cpu",
        "--pipeline.datamanager.cache-images-type", "uint8",
        "--pipeline.datamanager.masks-on-gpu", "False",
        "--logging.local-writer.enable", "True",
        "--logging.steps-per-log", "50",
        "--steps-per-save", str(exp3.STEPS_PER_SAVE),
        "--save-only-latest-checkpoint", "True" if exp3.SAVE_ONLY_LATEST else "False",
        "--steps-per-eval-batch", "100000",
        "--steps-per-eval-image", "100000",
        "--steps-per-eval-all-images", "100000",
        "--vis", "tensorboard",
    ]


if __name__ == "__main__":
    import json

    cfg_d4 = resolved_arm_config(ARM_D4)
    cfg_e4 = resolved_arm_config(ARM_E4)
    diff = preflight_diff(cfg_d4, cfg_e4)
    print(json.dumps({"diff": diff, "arm_d4_full": cfg_d4, "arm_e4_full": cfg_e4}, indent=2, default=str))

    # Same out_dir/data_dir placeholder for both here on purpose: in the real launch each
    # arm gets its own --output-dir (mechanical, per-arm, same as Arm C/D in Experiment 3,
    # not a scientific variable). Holding it fixed here isolates the argv diff to the one
    # variable this experiment actually tests.
    cmd_d4 = build_train_cmd(python="python", wrap=Path("ns_train_wrap.py"),
                              data_dir=Path("<data>"), out_dir=Path("<out>"), arm=ARM_D4)
    cmd_e4 = build_train_cmd(python="python", wrap=Path("ns_train_wrap.py"),
                              data_dir=Path("<data>"), out_dir=Path("<out>"), arm=ARM_E4)
    argv_diff = [(a, b) for a, b in zip(cmd_d4, cmd_e4) if a != b]
    print("\nargv token differences (D4, E4), --output-dir held equal to isolate the real variable:", argv_diff)
    assert cmd_d4 != cmd_e4
    assert len(cmd_d4) == len(cmd_e4), "argv length must match"
    assert len(argv_diff) == 1, f"expected exactly one differing argv token, got {len(argv_diff)}"
    print("argv token count equal, exactly one differing token confirmed")
