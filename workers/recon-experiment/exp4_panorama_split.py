"""Room 213 Experiment 4 -- panorama-grouped validation split.

Read-only design tool. Withholds entire physical panorama centers (all 16 derived
perspective views per panorama) together, so no crop from a validation panorama can appear
in training -- unlike the historical view-level 90/10 split, which (per the Experiment 3
haze diagnostic's split_grouping_audit) leaves 100% of panoramas contributing to both train
and eval.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

GROUPED_VAL_FRACTION = 0.10


def _frame_pano(file_path: str) -> str:
    return Path(file_path).stem.split("_v")[0]


def grouped_split(transforms_path: Path, val_fraction: float = GROUPED_VAL_FRACTION) -> dict[str, Any]:
    doc = json.loads(Path(transforms_path).read_text(encoding="utf-8"))
    names = sorted(f["file_path"] for f in doc["frames"])
    by_pano: dict[str, list[str]] = {}
    for n in names:
        by_pano.setdefault(_frame_pano(n), []).append(n)
    panos = sorted(by_pano.keys())
    n_panos = len(panos)
    n_val_panos = max(1, round(n_panos * val_fraction))
    # deterministic, evenly-spaced selection over the sorted panorama list (same style as
    # nerfstudio's own get_train_eval_split_fraction, applied at the panorama level)
    val_idx = set(np.linspace(0, n_panos - 1, n_val_panos, dtype=int).tolist())
    val_panos = [panos[i] for i in sorted(val_idx)]
    train_panos = [p for p in panos if p not in set(val_panos)]

    grouped_val_images = sorted(img for p in val_panos for img in by_pano[p])
    grouped_train_pool_images = sorted(img for p in train_panos for img in by_pano[p])

    h = lambda rows: hashlib.sha256("\n".join(rows).encode("utf-8")).hexdigest()  # noqa: E731

    # historical-style split re-derived over the grouped-safe training pool only (see
    # preflight doc for why this is necessary and how it differs from bit-identical Arm D
    # continuity)
    pool = grouped_train_pool_images
    n_pool = len(pool)
    n_hist_train = -(-n_pool * 9 // 10)  # ceil(n_pool * 0.9)
    hist_train_idx = set(np.linspace(0, n_pool - 1, n_hist_train, dtype=int).tolist())
    historical_style_train = [pool[i] for i in sorted(hist_train_idx)]
    historical_style_eval = [pool[i] for i in range(n_pool) if i not in hist_train_idx]

    return {
        "total_panoramas": n_panos,
        "views_per_panorama": len(next(iter(by_pano.values()))),
        "total_derived_images": len(names),
        "grouped_val_fraction_requested": val_fraction,
        "grouped_val_panoramas": len(val_panos),
        "grouped_val_images": len(grouped_val_images),
        "grouped_train_pool_panoramas": len(train_panos),
        "grouped_train_pool_images": len(grouped_train_pool_images),
        "historical_style_train_images": len(historical_style_train),
        "historical_style_eval_images": len(historical_style_eval),
        "no_crop_leakage_check": {
            "grouped_val_panoramas_appearing_in_training_pool": len(
                set(val_panos) & set(train_panos)
            ),
            "ok": len(set(val_panos) & set(train_panos)) == 0,
        },
        "hashes": {
            "grouped_val_images_sha256": h(grouped_val_images),
            "historical_style_train_sha256": h(historical_style_train),
            "historical_style_eval_sha256": h(historical_style_eval),
        },
        "example_grouped_val_panoramas": val_panos[:10],
        "grouped_val_panoramas_full": val_panos,
        "grouped_val_images_full": grouped_val_images,
        "historical_style_train_images_full": historical_style_train,
        "historical_style_eval_images_full": historical_style_eval,
    }


def main() -> None:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    transforms_path = root / "qa" / "exp3-run" / "inputs" / "transforms.json"
    out = grouped_split(transforms_path)
    dest = root / "qa" / "exp3-run" / "haze-diagnostic" / "exp4-grouped-split.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    summary = {k: v for k, v in out.items() if not k.endswith("_full")}
    print(json.dumps(summary, indent=2))
    print("wrote", dest)


if __name__ == "__main__":
    main()
