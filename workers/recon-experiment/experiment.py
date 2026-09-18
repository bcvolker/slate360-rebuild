"""Experiment 2 spec: arms differ only by refine_stop_iter. Do not launch from here."""
from __future__ import annotations

from typing import Any

from hashes import sha256_json

FROZEN_KEYS = (
    "source_hash",
    "pose_hash",
    "mask_hash",
    "seed_hash",
    "view_count",
    "pano_count",
    "resolution",
    "sh_degree",
    "bilateral",
    "optimizer",
    "loss",
    "backend",
    "actual_images_per_optimizer_step",
    "max_steps",
    "rng_seed",
    "use_lidar",
    "output_converter",
    "qa_pose_hash",
)

ARM_A = {
    "name": "ROOM213_FROZEN_CONTROL",
    "refine_stop_iter": 500,
}
ARM_B = {
    "name": "ROOM213_GROWTH_TEST",
    "refine_stop_iter": 4300,
}

MAX_STEPS = 8000
MAX_GAUSSIANS_ABORT = 10_000_000
MAX_RUNTIME_S = 90 * 60
MAX_COST_USD = 15.0
# Astra 2026-09-17 posted Modal rates (not a quote). L40S + 8 CPU + 80 GiB.
L40S_USD_PER_H = 1.9512
CPU_USD_PER_CORE_H = 0.04716
RAM_USD_PER_GIB_H = 0.007992
TRAIN_CPU = 8.0
TRAIN_GIB_RAM = 80.0
HOURLY_USD = L40S_USD_PER_H + CPU_USD_PER_CORE_H * TRAIN_CPU + RAM_USD_PER_GIB_H * TRAIN_GIB_RAM
RNG_SEED = 42
SH_DEGREE = 3
BILATERAL = True
RESOLUTION = 1280
VIEW_COUNT = 6016
PANO_COUNT = 376
OUTPUT_CONVERTER = "splat-transform@2.7.1-spz-v3-sog"


def freeze_recipe(**kwargs: Any) -> dict[str, Any]:
    missing = [k for k in FROZEN_KEYS if k not in kwargs]
    if missing:
        raise ValueError(f"frozen recipe missing {missing}")
    return {k: kwargs[k] for k in FROZEN_KEYS}


def arm_payload(recipe: dict[str, Any], arm: dict[str, Any]) -> dict[str, Any]:
    out = dict(recipe)
    out["refine_stop_iter"] = arm["refine_stop_iter"]
    out["arm_name"] = arm["name"]
    out["max_steps"] = MAX_STEPS
    out["max_gaussians_abort"] = MAX_GAUSSIANS_ABORT
    return out


def arms_differ_only_by_refine_stop(a: dict[str, Any], b: dict[str, Any]) -> bool:
    keys = set(a) | set(b)
    ignore = {"refine_stop_iter", "arm_name", "name"}
    for key in keys:
        if key in ignore:
            continue
        if a.get(key) != b.get(key):
            return False
    return a.get("refine_stop_iter") != b.get("refine_stop_iter")


def recipe_hash(recipe: dict[str, Any]) -> str:
    return sha256_json(recipe)


R2_PREFIX = "experiments/room213-densification"
