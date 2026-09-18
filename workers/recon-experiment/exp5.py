"""Room 213 Experiment 5 spec: panorama-grouped generalization validation.

Two arms, G5-Control (Experiment 4's D4 recipe, cull_scale_thresh=0.15) and H5-Scale-Control
(Experiment 4's E4 recipe, cull_scale_thresh=0.08), trained on the panorama-grouped-safe
pool prepared in Experiment 4's preflight (38 panoramas / 608 views entirely withheld,
zero leakage). Frozen exactly as instructed: densify_grad_thresh, refine start/stop,
cull_alpha_thresh, opacity-reset behavior, stop_screen_size_at, scheduler, resolution,
masks, poses, seed, source data -- all imported directly from exp3.py, not retyped.

The ONE thing this experiment changes relative to Experiment 4 is *which* frames the
trainer ever sees: the grouped-safe transforms.json (5,408 frames; the withheld panoramas'
608 views are not merely held out by nerfstudio's own internal split, they do not exist in
the file at all). That changes `pose_hash` (a hash of transforms.json's own bytes) and the
derived view/pano counts, recorded in `qa/exp5-frozen-recipe.json`. mask_hash, seed_hash,
qa_pose_hash, and source_hash are unchanged -- same underlying files, only which subset of
frames is listed.

Do not launch from here. Preflight only; a human must approve before any GPU spend.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import exp3  # noqa: E402 -- source of every frozen field
import exp4  # noqa: E402 -- build_train_cmd is reused unmodified (arm shape is identical)

EXPERIMENT_ID = "room213-exp5"
CHANGED_VARIABLE = "cull_scale_thresh_prune_scale3d"

ARM_G5 = {"name": "ROOM213_G5_CONTROL", "cull_scale_thresh": exp3.CULL_SCALE_THRESH}  # 0.15, = D4
ARM_H5 = {"name": "ROOM213_H5_SCALE_CONTROL", "cull_scale_thresh": exp4.E4_CULL_SCALE_THRESH}  # 0.08, = E4

# Expected grouped-safe dataset shape (verified fresh against the real dataset by
# dataset_split_grouped() below; these are the values it must reproduce exactly).
EXPECTED_TOTAL_DERIVED_VIEWS = 6016
EXPECTED_WITHHELD_PANORAMAS = 38
EXPECTED_WITHHELD_VIEWS = 608
EXPECTED_GROUPED_SAFE_POOL_PANORAMAS = 338
EXPECTED_GROUPED_SAFE_POOL_VIEWS = 5408
EXPECTED_NERFSTUDIO_INTERNAL_TRAIN = 4868
EXPECTED_NERFSTUDIO_INTERNAL_EVAL = 540
EXPECTED_GROUPED_SAFE_TRANSFORMS_SHA256 = "95f678f14dd4208cda32b0a0eef7273acfd7dfee63c7bdc04c4822ccc80c29b4"
# Corrected 2026-09-18 (data unchanged): the value above is the portable hash of
# build_grouped_safe_frames()'s JSON output serialized with LF-only line endings, matching
# what every container (Linux) actually writes. The original value recorded during the
# Experiment 4 preflight (52f622b1...) was computed from a copy this Windows machine wrote
# via Path.write_text() in text mode, which silently translates '\n' to '\r\n' on Windows --
# a platform-dependent artifact of the reference copy, not of the dataset. Same bug class
# already found and fixed for the mask hash during Experiment 3 (see
# docs/ops/ROOM213_EXPERIMENT3_FINAL.md's "Portable-hash correction" note). No frame, pose,
# mask, or split membership changed -- same 5,408 frames, same 38 withheld panoramas, same
# zero-leakage result -- confirmed by re-running dataset_split_grouped() after this fix.
EXPECTED_HISTORICAL_STYLE_TRAIN_SHA256 = "0f8f367e6a43001f42fe58199009c9423876869192dfc3e50e5c4c25dbff0949"
EXPECTED_HISTORICAL_STYLE_EVAL_SHA256 = "bdccc23ccd377f2e659fc83635d05d175cace40c71307a75d45261df5b21b3a5"
EXPECTED_WITHHELD_IMAGES_SHA256 = "a4651d9eab83fd663b9c7188b889f7df72f416a94de06f00892ed6c33474e9d8"


def _frame_pano(file_path: str) -> str:
    return Path(file_path).stem.split("_v")[0]


def build_grouped_safe_frames(full_transforms_path: Path) -> dict[str, Any]:
    """The single source of truth for the panorama holdout, used both to verify the staged
    grouped-safe transforms.json (dataset_split_grouped, below) and to actually produce it
    when staging a fresh container (worker.py's _ensure_exp5_grouped_inputs). Deterministic:
    same sorted-panorama-ID, evenly-spaced-by-index selection as the preflight used."""
    import numpy as np

    full = json.loads(Path(full_transforms_path).read_text(encoding="utf-8"))
    names = sorted(f["file_path"] for f in full["frames"])
    by_pano: dict[str, list[str]] = {}
    for f in names:
        by_pano.setdefault(_frame_pano(f), []).append(f)
    panos = sorted(by_pano.keys())
    n_val_panos = max(1, round(len(panos) * 0.10))
    val_idx = set(np.linspace(0, len(panos) - 1, n_val_panos, dtype=int).tolist())
    val_panos = [panos[i] for i in sorted(val_idx)]
    train_panos = [p for p in panos if p not in set(val_panos)]
    pool_images = set(img for p in train_panos for img in by_pano[p])
    kept_frames = [fr for fr in full["frames"] if fr["file_path"] in pool_images]
    grouped_doc = {"camera_model": full["camera_model"], "ply_file_path": full["ply_file_path"], "frames": kept_frames}
    return {
        "grouped_doc": grouped_doc,
        "val_panos": val_panos,
        "train_panos": train_panos,
        "by_pano": by_pano,
    }


def dataset_split_grouped(full_transforms_path: Path, grouped_transforms_path: Path) -> dict[str, Any]:
    """Read-only, run against both the ORIGINAL frozen 6016-frame manifest and the
    grouped-safe 5408-frame manifest actually fed to the trainer. Recomputes the panorama
    holdout from the original (never trusts a separately-maintained copy) and cross-checks
    it byte-for-byte against the staged grouped-safe file."""
    import numpy as np

    full = json.loads(Path(full_transforms_path).read_text(encoding="utf-8"))
    n = len(full["frames"])
    built = build_grouped_safe_frames(full_transforms_path)
    by_pano, val_panos, train_panos = built["by_pano"], built["val_panos"], built["train_panos"]
    val_images = sorted(img for p in val_panos for img in by_pano[p])
    pool_images = sorted(img for p in train_panos for img in by_pano[p])

    h = lambda rows: hashlib.sha256("\n".join(rows).encode("utf-8")).hexdigest()  # noqa: E731

    n_pool = len(pool_images)
    n_hist_train = -(-n_pool * 9 // 10)
    hist_train_idx = set(np.linspace(0, n_pool - 1, n_hist_train, dtype=int).tolist())
    hist_train = [pool_images[i] for i in sorted(hist_train_idx)]
    hist_eval = [pool_images[i] for i in range(n_pool) if i not in hist_train_idx]

    grouped = json.loads(Path(grouped_transforms_path).read_text(encoding="utf-8"))
    grouped_names = sorted(f["file_path"] for f in grouped["frames"])
    grouped_sha256 = hashlib.sha256(Path(grouped_transforms_path).read_bytes()).hexdigest()

    out = {
        "total_derived_views": n,
        "withheld_panoramas": len(val_panos),
        "withheld_images": len(val_images),
        "grouped_safe_pool_panoramas": len(train_panos),
        "grouped_safe_pool_images": n_pool,
        "nerfstudio_internal_train_images": len(hist_train),
        "nerfstudio_internal_eval_images": len(hist_eval),
        "leakage_check": {
            "withheld_panoramas_in_pool": len(set(val_panos) & set(train_panos)),
            "ok": len(set(val_panos) & set(train_panos)) == 0,
        },
        "staged_grouped_transforms_matches_recomputed_pool": grouped_names == pool_images,
        "hashes": {
            "withheld_images_sha256": h(val_images),
            "nerfstudio_internal_train_sha256": h(hist_train),
            "nerfstudio_internal_eval_sha256": h(hist_eval),
            "grouped_safe_transforms_json_sha256": grouped_sha256,
        },
        "withheld_panoramas_full": val_panos,
    }
    out["matches_expected"] = (
        out["total_derived_views"] == EXPECTED_TOTAL_DERIVED_VIEWS
        and out["withheld_panoramas"] == EXPECTED_WITHHELD_PANORAMAS
        and out["withheld_images"] == EXPECTED_WITHHELD_VIEWS
        and out["grouped_safe_pool_panoramas"] == EXPECTED_GROUPED_SAFE_POOL_PANORAMAS
        and out["grouped_safe_pool_images"] == EXPECTED_GROUPED_SAFE_POOL_VIEWS
        and out["nerfstudio_internal_train_images"] == EXPECTED_NERFSTUDIO_INTERNAL_TRAIN
        and out["nerfstudio_internal_eval_images"] == EXPECTED_NERFSTUDIO_INTERNAL_EVAL
        and out["staged_grouped_transforms_matches_recomputed_pool"]
        and out["hashes"]["grouped_safe_transforms_json_sha256"] == EXPECTED_GROUPED_SAFE_TRANSFORMS_SHA256
        and out["hashes"]["nerfstudio_internal_train_sha256"] == EXPECTED_HISTORICAL_STYLE_TRAIN_SHA256
        and out["hashes"]["nerfstudio_internal_eval_sha256"] == EXPECTED_HISTORICAL_STYLE_EVAL_SHA256
        and out["hashes"]["withheld_images_sha256"] == EXPECTED_WITHHELD_IMAGES_SHA256
        and out["leakage_check"]["ok"]
    )
    return out


def resolved_arm_config(arm: dict[str, Any], recipe: dict[str, Any] | None = None) -> dict[str, Any]:
    """Start from Arm D's config (same function exp4 used) so every frozen field is
    guaranteed identical by construction, then override cull_scale_thresh (the one
    scientific variable) and the dataset-identity fields (the one thing that must differ
    from Experiment 4: which frames the trainer is given)."""
    cfg = exp3.resolved_arm_config(exp3.ARM_D, recipe)
    cfg["arm_name"] = arm["name"]
    cfg["experiment_id"] = EXPERIMENT_ID
    cfg["changed_variable"] = CHANGED_VARIABLE
    cfg["cull_scale_thresh_prune_scale3d"] = float(arm["cull_scale_thresh"])
    # Dataset-identity fields: grouped-safe pool, not the original 6016/5415/601 split.
    # These fields differ from Experiment 3/4's resolved config BY DESIGN and identically
    # between G5 and H5 -- the preflight diff below must still show only cull_scale_thresh
    # differing BETWEEN G5 AND H5, which is a separate check from "differs from Exp4".
    cfg["dataset_total_views"] = EXPECTED_GROUPED_SAFE_POOL_VIEWS
    cfg["dataset_train_images"] = EXPECTED_NERFSTUDIO_INTERNAL_TRAIN
    cfg["dataset_eval_images"] = EXPECTED_NERFSTUDIO_INTERNAL_EVAL
    cfg["dataset_train_order_sha256"] = EXPECTED_HISTORICAL_STYLE_TRAIN_SHA256
    cfg["dataset_eval_order_sha256"] = EXPECTED_HISTORICAL_STYLE_EVAL_SHA256
    cfg["grouped_validation_withheld_panoramas"] = EXPECTED_WITHHELD_PANORAMAS
    cfg["grouped_validation_withheld_images"] = EXPECTED_WITHHELD_VIEWS
    cfg["grouped_validation_note"] = (
        "primary independent observation unit is the withheld PANORAMA (38), not the 608 "
        "individual crops; grouped-validation scores are not directly comparable to "
        "Experiment 3/4 historical scores (different, smaller training pool)"
    )
    return cfg


def preflight_diff(cfg_g5: dict[str, Any], cfg_h5: dict[str, Any]) -> dict[str, Any]:
    keys = sorted(set(cfg_g5) | set(cfg_h5))
    ignore = {"arm_name", "experiment_id"}
    differing = [k for k in keys if cfg_g5.get(k) != cfg_h5.get(k) and k not in ignore]
    ok = differing == [CHANGED_VARIABLE]
    return {
        "ok": ok,
        "differing_keys": differing,
        "expected_differing_keys": [CHANGED_VARIABLE],
        "arm_g5": {"name": cfg_g5["arm_name"], CHANGED_VARIABLE: cfg_g5[CHANGED_VARIABLE]},
        "arm_h5": {"name": cfg_h5["arm_name"], CHANGED_VARIABLE: cfg_h5[CHANGED_VARIABLE]},
        "field_count": len(keys),
    }


if __name__ == "__main__":
    cfg_g5 = resolved_arm_config(ARM_G5)
    cfg_h5 = resolved_arm_config(ARM_H5)
    diff = preflight_diff(cfg_g5, cfg_h5)
    print(json.dumps({"diff": diff}, indent=2, default=str))

    from pathlib import Path as P
    cmd_g5 = exp4.build_train_cmd(python="python", wrap=P("ns_train_wrap.py"),
                                   data_dir=P("<data>"), out_dir=P("<out>"), arm=ARM_G5)
    cmd_h5 = exp4.build_train_cmd(python="python", wrap=P("ns_train_wrap.py"),
                                   data_dir=P("<data>"), out_dir=P("<out>"), arm=ARM_H5)
    argv_diff = [(a, b) for a, b in zip(cmd_g5, cmd_h5) if a != b]
    print("\nargv token differences (G5, H5):", argv_diff)
    assert len(cmd_g5) == len(cmd_h5)
    assert len(argv_diff) == 1, f"expected exactly one differing argv token, got {len(argv_diff)}"
    print("exactly one differing argv token confirmed")
