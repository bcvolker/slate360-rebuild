"""Frozen Route B X4 paths and experiment locks. No SfM."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "CONFIG.json").read_text(encoding="utf-8"))

RESEARCH = Path("/mnt/c/Users/Brian PC/Desktop/Slate360Research/Projects/KitchenAprilTags/Runs")
if not RESEARCH.is_dir():
    RESEARCH = Path(r"C:\Users\Brian PC\Desktop\Slate360Research\Projects\KitchenAprilTags\Runs")

TRAJ = RESEARCH / "2026-08-31T16-46-route-b-x4-independent" / "X4_SFM_TRAJECTORY.json"
SPARSE_PLY = RESEARCH / "2026-08-31T16-46-route-b-x4-independent" / "x4_sparse.ply"
V2_FACES = RESEARCH / "2026-08-31T18-x4-quality-gaussian-v2" / "faces"
SHARED = RESEARCH / "2026-08-31T22-x4-appearance-shared"
SPLAT_RUN = RESEARCH / "2026-08-31T22-x4-splatfacto-challenger"

EQUATORIAL = ("front", "right", "back", "left")
HOLDOUT_EVERY = 8
FACE_PX = 1200
FOV_DEG = 90.0


def ns_python() -> Path:
    return Path("/home/rian_/slate360-engines/nerfstudio/.venv/bin/python")


def ns_train() -> Path:
    return Path("/home/rian_/slate360-engines/nerfstudio/.venv/bin/ns-train")


def ns_export() -> Path:
    return Path("/home/rian_/slate360-engines/nerfstudio/.venv/bin/ns-export")


def ns_eval() -> Path:
    return Path("/home/rian_/slate360-engines/nerfstudio/.venv/bin/ns-eval")
