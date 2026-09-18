"""Room 213 Experiment 3 spec: two corrected arms differing ONLY by densify_grad_thresh.

Supersedes any earlier Experiment 3 draft (11000 screen-size stop, 2M soft cap). Do not launch
from here; ``workers/modal/recon-experiment/worker.py`` ``main --phase exp3`` is the launcher and
it must be run by a human after the preflight table has been approved.

    python exp3.py preflight --exp2-recipe qa/exp2-frozen-recipe.json \
        --transforms <views>/transforms.json --out qa/exp3-preflight
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from hashes import sha256_json  # noqa: E402

EXPERIMENT_ID = "room213-exp3"
CHANGED_VARIABLE = "densify_grad_thresh"

ARM_C = {"name": "ROOM213_ARM_C_NO_GROWTH_CONTROL", "densify_grad_thresh": 1e9}
ARM_D = {"name": "ROOM213_ARM_D_DELAYED_GROWTH", "densify_grad_thresh": 0.0008}
ARMS = (ARM_C, ARM_D)

# Shared schedule (identical in both arms).
MAX_STEPS = 16_000
WARMUP_LENGTH = 6_016          # gsplat refine_start_iter: fixed stabilisation delay >= one full training cycle
REFINE_STOP_ITER = 11_000      # gsplat refine_stop_iter == splatfacto stop_split_at (absolute)
PAUSE_REFINE_AFTER_RESET = 250 # enforced by ns_train_wrap.py clamp (splatfacto requests n_train + 100)
REFINE_EVERY = 100
RESET_ALPHA_EVERY = 30         # splatfacto default -> reset_every = 30 * 100 = 3000
RESET_EVERY = RESET_ALPHA_EVERY * REFINE_EVERY
CULL_ALPHA_THRESH = 0.005
CULL_SCALE_THRESH = 0.15       # unchanged from Experiment 2
STOP_SCREEN_SIZE_AT = 4_000    # splatfacto default; must be < WARMUP_LENGTH
USE_ABSGRAD = True
SH_DEGREE = 3
SH_DEGREE_INTERVAL = max(1, MAX_STEPS // 30)  # 533, same derivation as Experiment 2 (8000 // 30 = 266)
USE_BILATERAL_GRID = True
USE_SCALE_REGULARIZATION = True
RESOLUTION = 1280
RNG_SEED = 42
STEPS_PER_SAVE = 500
SAVE_ONLY_LATEST = False
KEEP_CHECKPOINT_STEPS = (500, 3000, 6000, 8000, 9000, 11000, 13000, MAX_STEPS - 1)
EVAL_STEPS = (8000, MAX_STEPS - 1)
HASHED_TENSORS = ("means", "scales", "quats", "opacities", "features_dc", "features_rest")
OPACITY_THRESHOLDS = (0.001, 0.005, 0.01, 0.05, 0.1)

# Guards (scientific failure, not soft caps).
MAX_LIVE_GAUSSIANS = 3_500_000
MAX_RUNTIME_S = 150 * 60
MAX_COST_USD_PER_ARM = 15.0
NERFSTUDIO_VERSION = "1.1.5"
GSPLAT_VERSION = "1.5.3"

# Dataset split expected from nerfstudio 1.1.5 (train_split_fraction 0.9, frames sorted by path).
EXPECTED_TOTAL_VIEWS = 6016
EXPECTED_TRAIN_IMAGES = 5415
EXPECTED_EVAL_IMAGES = 601
EXPECTED_TRAIN_ORDER_SHA256 = "1bb881c0bd18a735cf7e72a805639de1901b73bf96a63c94cf3a8a1bf53547d6"
EXPECTED_EVAL_ORDER_SHA256 = "2b5422fd94c0cca9f18a3cdbedf8076ee5b930dedefd0de30187424ff8abeb76"
SAMPLER = {
    "type": "nerfstudio FullImageDatamanager train_cameras_sampling_strategy=random",
    "semantics": "per-epoch shuffle without replacement (random.Random(train_cameras_sampling_seed=42)); one full image per optimizer step",
}


def derived_schedule() -> dict[str, Any]:
    """Steps at which the strategy acts, given the constants above (identical for both arms)."""
    resets = [s for s in range(RESET_EVERY, MAX_STEPS, RESET_EVERY) if s < REFINE_STOP_ITER]
    refine_steps = [
        s for s in range(0, MAX_STEPS, REFINE_EVERY)
        if s > WARMUP_LENGTH and s < REFINE_STOP_ITER and s % RESET_EVERY >= PAUSE_REFINE_AFTER_RESET
    ]
    return {
        "reset_every": RESET_EVERY,
        "refine_every": REFINE_EVERY,
        "opacity_reset_steps": resets,
        "opacity_reset_value": CULL_ALPHA_THRESH * 2.0,
        "accumulator_clear_step": WARMUP_LENGTH + 1,
        "first_refine_step": refine_steps[0] if refine_steps else None,
        "last_refine_step": refine_steps[-1] if refine_steps else None,
        "refine_event_count": len(refine_steps),
        "screen_size_split_active_until": STOP_SCREEN_SIZE_AT,
        "screen_size_split_inactive_before_refinement": STOP_SCREEN_SIZE_AT < WARMUP_LENGTH,
        "training_cycles_before_refinement": round(WARMUP_LENGTH / EXPECTED_TRAIN_IMAGES, 4),
        "sh_degree_reaches_3_at_step": SH_DEGREE_INTERVAL * SH_DEGREE,
    }


def resolved_arm_config(arm: dict[str, Any], recipe: dict[str, Any] | None = None) -> dict[str, Any]:
    """Every field that can influence the run, flattened. Arms must differ only in densify_grad_thresh."""
    cfg = {
        "arm_name": arm["name"],
        "experiment_id": EXPERIMENT_ID,
        "changed_variable": CHANGED_VARIABLE,
        "densify_grad_thresh": float(arm["densify_grad_thresh"]),
        "start_step": 0,
        "resume": False,
        "max_steps": MAX_STEPS,
        "cli_max_num_iterations": MAX_STEPS,
        "warmup_length_refine_start_iter": WARMUP_LENGTH,
        "stop_split_at_refine_stop_iter": REFINE_STOP_ITER,
        "pause_refine_after_reset_effective": PAUSE_REFINE_AFTER_RESET,
        "refine_every": REFINE_EVERY,
        "reset_alpha_every": RESET_ALPHA_EVERY,
        "reset_every": RESET_EVERY,
        "cull_alpha_thresh_prune_opa": CULL_ALPHA_THRESH,
        "cull_scale_thresh_prune_scale3d": CULL_SCALE_THRESH,
        "stop_screen_size_at": STOP_SCREEN_SIZE_AT,
        "use_absgrad": USE_ABSGRAD,
        "sh_degree": SH_DEGREE,
        "sh_degree_interval": SH_DEGREE_INTERVAL,
        "use_bilateral_grid": USE_BILATERAL_GRID,
        "use_scale_regularization": USE_SCALE_REGULARIZATION,
        "resolution": RESOLUTION,
        "machine_seed": RNG_SEED,
        "cache_images": "cpu",
        "cache_images_type": "uint8",
        "masks_on_gpu": False,
        "steps_per_save": STEPS_PER_SAVE,
        "save_only_latest_checkpoint": SAVE_ONLY_LATEST,
        "keep_checkpoint_steps": list(KEEP_CHECKPOINT_STEPS),
        "eval_steps": list(EVAL_STEPS),
        "steps_per_eval_all_images": 100000,
        "soft_population_cap": None,
        "max_live_gaussians_hard_guard": MAX_LIVE_GAUSSIANS,
        "max_runtime_s": MAX_RUNTIME_S,
        "max_cost_usd": MAX_COST_USD_PER_ARM,
        "gsplat_opacity_reset_patch": "exp3_strategy_patch (PR #776 equivalent)",
        "accumulator_clear": "grad2d,count,radii at step warmup_length+1",
        "nerfstudio": NERFSTUDIO_VERSION,
        "gsplat": GSPLAT_VERSION,
        "gpu_class": "L40S",
        "trainer": "ns_train_wrap.py -> nerfstudio splatfacto",
        "actual_images_per_optimizer_step": 1,
        "sampler": SAMPLER["type"],
        "dataset_total_views": EXPECTED_TOTAL_VIEWS,
        "dataset_train_images": EXPECTED_TRAIN_IMAGES,
        "dataset_eval_images": EXPECTED_EVAL_IMAGES,
        "dataset_train_order_sha256": EXPECTED_TRAIN_ORDER_SHA256,
        "dataset_eval_order_sha256": EXPECTED_EVAL_ORDER_SHA256,
        "derived_schedule": derived_schedule(),
    }
    if recipe:
        for key in (
            "source_hash", "pose_hash", "mask_hash", "seed_hash", "qa_pose_hash",
            "view_count", "pano_count", "optimizer", "loss", "backend", "use_lidar",
        ):
            if key in recipe:
                cfg[f"recipe.{key}"] = recipe[key]
    return cfg


def preflight_diff(cfg_c: dict[str, Any], cfg_d: dict[str, Any]) -> dict[str, Any]:
    keys = sorted(set(cfg_c) | set(cfg_d))
    differing = [k for k in keys if cfg_c.get(k) != cfg_d.get(k) and k != "arm_name"]
    ok = differing == [CHANGED_VARIABLE]
    return {
        "ok": ok,
        "differing_keys": differing,
        "expected_differing_keys": [CHANGED_VARIABLE],
        "arm_c": {"name": cfg_c["arm_name"], CHANGED_VARIABLE: cfg_c[CHANGED_VARIABLE]},
        "arm_d": {"name": cfg_d["arm_name"], CHANGED_VARIABLE: cfg_d[CHANGED_VARIABLE]},
        "field_count": len(keys),
    }


def build_train_cmd(*, python: str, wrap: Path, data_dir: Path, out_dir: Path, arm: dict[str, Any]) -> list[str]:
    thresh = float(arm["densify_grad_thresh"])
    return [
        python, str(wrap), "splatfacto",
        "--data", str(data_dir),
        "--output-dir", str(out_dir),
        "--max-num-iterations", str(MAX_STEPS),
        "--machine.seed", str(RNG_SEED),
        "--pipeline.model.sh-degree", str(SH_DEGREE),
        "--pipeline.model.sh-degree-interval", str(SH_DEGREE_INTERVAL),
        "--pipeline.model.warmup-length", str(WARMUP_LENGTH),
        "--pipeline.model.refine-every", str(REFINE_EVERY),
        "--pipeline.model.reset-alpha-every", str(RESET_ALPHA_EVERY),
        "--pipeline.model.cull-alpha-thresh", repr(CULL_ALPHA_THRESH),
        "--pipeline.model.cull-scale-thresh", repr(CULL_SCALE_THRESH),
        "--pipeline.model.densify-grad-thresh", repr(thresh),
        "--pipeline.model.use-absgrad", "True" if USE_ABSGRAD else "False",
        "--pipeline.model.stop-split-at", str(REFINE_STOP_ITER),
        "--pipeline.model.stop-screen-size-at", str(STOP_SCREEN_SIZE_AT),
        "--pipeline.model.use-bilateral-grid", "True" if USE_BILATERAL_GRID else "False",
        "--pipeline.model.use-scale-regularization", "True" if USE_SCALE_REGULARIZATION else "False",
        "--pipeline.datamanager.cache-images", "cpu",
        "--pipeline.datamanager.cache-images-type", "uint8",
        "--pipeline.datamanager.masks-on-gpu", "False",
        "--logging.local-writer.enable", "True",
        "--logging.steps-per-log", "50",
        "--steps-per-save", str(STEPS_PER_SAVE),
        "--save-only-latest-checkpoint", "True" if SAVE_ONLY_LATEST else "False",
        "--steps-per-eval-batch", "100000",
        "--steps-per-eval-image", "100000",
        "--steps-per-eval-all-images", "100000",
        "--vis", "tensorboard",
    ]


def _ordered_split(names: list[str]) -> tuple[list[str], list[str], str]:
    """Replicates nerfstudio 1.1.5: argsort by path, ceil(0.9 n) train via linspace, rest eval."""
    import numpy as np

    inds = np.argsort(names)
    ordered = [names[i] for i in inds]
    n = len(ordered)
    n_train = math.ceil(n * 0.9)
    i_train = np.linspace(0, n - 1, n_train, dtype=int)
    i_eval = np.setdiff1d(np.arange(n), i_train)
    source = "local-replica"
    try:
        from nerfstudio.data.utils.dataparsers_utils import get_train_eval_split_fraction

        ns_train, ns_eval = get_train_eval_split_fraction(ordered, 0.9)
        assert list(ns_train) == list(i_train) and list(ns_eval) == list(i_eval)
        source = "nerfstudio.data.utils.dataparsers_utils.get_train_eval_split_fraction (verified equal to replica)"
    except ImportError:
        pass
    return [ordered[i] for i in i_train], [ordered[i] for i in i_eval], source


def dataset_split(transforms_path: Path) -> dict[str, Any]:
    doc = json.loads(Path(transforms_path).read_text(encoding="utf-8"))
    names = [f["file_path"] for f in doc["frames"]]
    train, ev, source = _ordered_split(names)
    h = lambda rows: hashlib.sha256("\n".join(rows).encode("utf-8")).hexdigest()  # noqa: E731
    out = {
        "transforms": str(transforms_path),
        "total_derived_images": len(names),
        "train_images": len(train),
        "eval_images": len(ev),
        "train_split_fraction": 0.9,
        "split_rule": source,
        "ordered_train_image_sha256": h(train),
        "ordered_eval_image_sha256": h(ev),
        "hash_rule": "sha256 of file_path strings in nerfstudio order joined by \\n",
        "sampler": SAMPLER,
        "first_train": train[:3],
        "first_eval": ev[:3],
        "warmup_covers_training_cycles": round(WARMUP_LENGTH / max(1, len(train)), 4),
    }
    out["matches_expected"] = (
        out["total_derived_images"] == EXPECTED_TOTAL_VIEWS
        and out["train_images"] == EXPECTED_TRAIN_IMAGES
        and out["eval_images"] == EXPECTED_EVAL_IMAGES
        and out["ordered_train_image_sha256"] == EXPECTED_TRAIN_ORDER_SHA256
        and out["ordered_eval_image_sha256"] == EXPECTED_EVAL_ORDER_SHA256
    )
    return out


def build_exp3_recipe(exp2_recipe_doc: dict[str, Any]) -> dict[str, Any]:
    recipe = dict(exp2_recipe_doc["recipe"])
    recipe["max_steps"] = MAX_STEPS
    recipe["output_converter"] = "ns-export gaussian-splat PLY (no SPZ step)"
    return {
        "experiment_id": EXPERIMENT_ID,
        "job_id": exp2_recipe_doc.get("job_id", "cecc2763"),
        "supersedes": ["ROOM213_EXPERIMENT3_PREFLIGHT.md", "stop_screen_size_at=11000 draft", "2M soft cap draft"],
        "changed_variable": CHANGED_VARIABLE,
        "arms": [dict(a) for a in ARMS],
        "recipe": recipe,
        "recipe_hash": sha256_json(recipe),
        "exp2_recipe_hash": exp2_recipe_doc.get("recipe_hash"),
        "views_dir": exp2_recipe_doc.get("views_dir"),
        "transforms": exp2_recipe_doc.get("transforms"),
        "points_ply": exp2_recipe_doc.get("points_ply"),
        "visual_poses": "qa/visual-poses.json",
        "dataset": {
            "total_derived_images": EXPECTED_TOTAL_VIEWS,
            "train_images": EXPECTED_TRAIN_IMAGES,
            "eval_images": EXPECTED_EVAL_IMAGES,
            "ordered_train_image_sha256": EXPECTED_TRAIN_ORDER_SHA256,
            "ordered_eval_image_sha256": EXPECTED_EVAL_ORDER_SHA256,
            "sampler": SAMPLER,
        },
    }


def preflight_markdown(cfg_c: dict[str, Any], cfg_d: dict[str, Any], diff: dict[str, Any]) -> str:
    rows = ["| Field | Arm C | Arm D | Same |", "|---|---|---|---|"]
    for key in sorted(set(cfg_c) | set(cfg_d)):
        if key == "derived_schedule":
            continue
        c, d = cfg_c.get(key), cfg_d.get(key)
        same = "yes" if c == d else "**NO**"
        rows.append(f"| `{key}` | `{c}` | `{d}` | {same} |")
    sched = cfg_c["derived_schedule"]
    head = [
        "# Experiment 3 resolved preflight: Arm C vs Arm D",
        "",
        f"Preflight OK: **{diff['ok']}**. Differing keys: `{diff['differing_keys']}` (expected `{diff['expected_differing_keys']}`).",
        "",
        "Derived schedule (identical in both arms): "
        f"resets at {sched['opacity_reset_steps']} (value {sched['opacity_reset_value']}), "
        f"accumulator clear at step {sched['accumulator_clear_step']}, "
        f"refinement events {sched['refine_event_count']} from step {sched['first_refine_step']} to {sched['last_refine_step']}, "
        f"screen-size split inactive after {sched['screen_size_split_active_until']} (before refinement: {sched['screen_size_split_inactive_before_refinement']}), "
        f"warm-up covers {sched['training_cycles_before_refinement']} training cycles.",
        "",
    ]
    return "\n".join(head + rows) + "\n"


def run_preflight(exp2_recipe: Path, transforms: Path | None, out: Path) -> dict[str, Any]:
    out.mkdir(parents=True, exist_ok=True)
    exp2_doc = json.loads(Path(exp2_recipe).read_text(encoding="utf-8"))
    recipe_doc = build_exp3_recipe(exp2_doc)
    cfg_c = resolved_arm_config(ARM_C, recipe_doc["recipe"])
    cfg_d = resolved_arm_config(ARM_D, recipe_doc["recipe"])
    diff = preflight_diff(cfg_c, cfg_d)
    (out / "arm-C-resolved.json").write_text(json.dumps(cfg_c, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (out / "arm-D-resolved.json").write_text(json.dumps(cfg_d, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (out / "preflight-diff.json").write_text(json.dumps(diff, indent=2) + "\n", encoding="utf-8")
    (out / "preflight-table.md").write_text(preflight_markdown(cfg_c, cfg_d, diff), encoding="utf-8")
    wrap = Path("/root/splat-lab/ns_train_wrap.py")
    cmds = {
        a["name"]: build_train_cmd(python="python", wrap=wrap, data_dir=Path("/vol/inputs/cecc2763/views"),
                                   out_dir=Path(f"/tmp/arm/{a['name']}/train"), arm=a)
        for a in ARMS
    }
    (out / "train-cmds.json").write_text(json.dumps(cmds, indent=2) + "\n", encoding="utf-8")
    split = None
    if transforms and Path(transforms).is_file():
        split = dataset_split(Path(transforms))
        (out / "dataset-split.json").write_text(json.dumps(split, indent=2) + "\n", encoding="utf-8")
    result = {"preflight_ok": diff["ok"], "dataset_split_matches_expected": None if split is None else split["matches_expected"],
              "recipe_hash": recipe_doc["recipe_hash"], "out": str(out)}
    if not diff["ok"]:
        raise SystemExit(f"PREFLIGHT STOP: arms differ in {diff['differing_keys']}")
    if split is not None and not split["matches_expected"]:
        raise SystemExit("PREFLIGHT STOP: dataset split does not match the expected Room 213 split")
    return result, recipe_doc


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Experiment 3 preflight (no training)")
    sub = p.add_subparsers(dest="cmd", required=True)
    pf = sub.add_parser("preflight")
    pf.add_argument("--exp2-recipe", required=True)
    pf.add_argument("--transforms")
    pf.add_argument("--out", required=True)
    pf.add_argument("--write-recipe", help="also write the exp3 frozen recipe JSON here")
    args = p.parse_args(argv)
    result, recipe_doc = run_preflight(Path(args.exp2_recipe), Path(args.transforms) if args.transforms else None, Path(args.out))
    if args.write_recipe:
        Path(args.write_recipe).write_text(json.dumps(recipe_doc, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        result["recipe_written"] = args.write_recipe
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
