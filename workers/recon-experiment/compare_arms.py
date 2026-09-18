"""Build Arm A vs Arm B side-by-side QA pack. No winner selection."""
from __future__ import annotations

import json
from pathlib import Path

from hashes import sha256_file
from experiment import HOURLY_USD

OUT_NAMES = ("A_on_path.png", "B_off_path.png", "C_dollhouse.png", "D_overhead.png")


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _series(scalars: dict, tag: str) -> list[dict]:
    return scalars.get(tag) or scalars.get(f"Train Metrics Dict/{tag}") or []


def compare(root: Path) -> dict:
    a_dir = root / "ROOM213_FROZEN_CONTROL"
    b_dir = root / "ROOM213_GROWTH_TEST"
    a_eff = _load(a_dir / "effective-config.json")
    b_eff = _load(b_dir / "effective-config.json")
    drift = []
    ignore = {"arm_name", "refine_stop_iter", "schedule", "train", "export", "gpu"}
    keys = set(a_eff) | set(b_eff)
    for key in sorted(keys):
        if key in ignore:
            continue
        if a_eff.get(key) != b_eff.get(key):
            drift.append({"key": key, "arm_a": a_eff.get(key), "arm_b": b_eff.get(key)})
    if a_eff.get("refine_stop_iter") == b_eff.get("refine_stop_iter"):
        drift.append({"key": "refine_stop_iter", "note": "arms did not differ on the experimental variable"})
    dest = root / "comparison"
    dest.mkdir(parents=True, exist_ok=True)
    from PIL import Image
    import numpy as np
    hashes = {}
    for name in OUT_NAMES:
        left = next(a_dir.rglob(name))
        right = next(b_dir.rglob(name))
        arr_l = np.asarray(Image.open(left))
        arr_r = np.asarray(Image.open(right))
        gap = np.zeros((arr_l.shape[0], 8, 3), dtype=np.uint8)
        side = np.concatenate([arr_l, gap, arr_r], axis=1)
        out = dest / name
        Image.fromarray(side).save(out)
        hashes[name] = sha256_file(out)
    a_sc = _load(a_dir / "scalar-logs.json") if (a_dir / "scalar-logs.json").is_file() else {}
    b_sc = _load(b_dir / "scalar-logs.json") if (b_dir / "scalar-logs.json").is_file() else {}
    payload = {
        "status": "needs_review",
        "published": False,
        "human_verdict": "UNREVIEWED",
        "ARM_A_CLIENT_VISUAL_VERDICT": "UNREVIEWED",
        "ARM_B_CLIENT_VISUAL_VERDICT": "UNREVIEWED",
        "changed_variable": "refine_stop_iter",
        "hourly_usd": HOURLY_USD,
        "side_by_side": hashes,
        "layout": "Arm A ROOM213_FROZEN_CONTROL (left) | Arm B ROOM213_GROWTH_TEST (right)",
        "unexpected_variable_drift": drift,
        "arm_a": _load(a_dir / "result-manifest.json") if (a_dir / "result-manifest.json").is_file() else a_eff,
        "arm_b": _load(b_dir / "result-manifest.json") if (b_dir / "result-manifest.json").is_file() else b_eff,
        "gaussian_count_tags": {
            "arm_a": _series(a_sc, "gaussian_count"),
            "arm_b": _series(b_sc, "gaussian_count"),
        },
        "loss_tags": {
            "arm_a_keys": sorted(k for k in a_sc if "loss" in k.lower() or "Loss" in k),
            "arm_b_keys": sorted(k for k in b_sc if "loss" in k.lower() or "Loss" in k),
        },
    }
    (dest / "comparison.json").write_text(json.dumps(payload, indent=2, default=str) + "\n")
    return payload
