"""Experiment 3 Arm C vs Arm D pack: side-by-side QA views + metric tables. No winner selection."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import exp3  # noqa: E402
from hashes import sha256_file  # noqa: E402

OUT_NAMES = ("A_on_path.png", "B_off_path.png", "C_dollhouse.png", "D_overhead.png")


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}


def compare(root: Path) -> dict:
    c_dir = root / exp3.ARM_C["name"]
    d_dir = root / exp3.ARM_D["name"]
    c_res, d_res = _load(c_dir / "resolved-config.json"), _load(d_dir / "resolved-config.json")
    diff = exp3.preflight_diff(c_res, d_res) if c_res and d_res else {"ok": False, "differing_keys": ["missing resolved-config"]}
    dest = root / "comparison"
    dest.mkdir(parents=True, exist_ok=True)
    from PIL import Image
    import numpy as np

    panels = {}
    for step in exp3.EVAL_STEPS:
        for name in OUT_NAMES:
            left = c_dir / "qa" / f"step-{step}" / name
            right = d_dir / "qa" / f"step-{step}" / name
            if not (left.is_file() and right.is_file()):
                continue
            arr_l, arr_r = np.asarray(Image.open(left)), np.asarray(Image.open(right))
            gap = np.zeros((arr_l.shape[0], 8, 3), dtype=np.uint8)
            out = dest / f"step-{step}" / name
            out.parent.mkdir(parents=True, exist_ok=True)
            Image.fromarray(np.concatenate([arr_l, gap, arr_r], axis=1)).save(out)
            panels[f"{step}/{name}"] = sha256_file(out)
    c_man, d_man = _load(c_dir / "result-manifest.json"), _load(d_dir / "result-manifest.json")
    payload = {
        "experiment_id": exp3.EXPERIMENT_ID,
        "status": "needs_review",
        "published": False,
        "HUMAN_VISUAL_VERDICT": "UNREVIEWED",
        "changed_variable": exp3.CHANGED_VARIABLE,
        "layout": f"Arm C {exp3.ARM_C['name']} (left) | Arm D {exp3.ARM_D['name']} (right)",
        "resolved_config_diff": diff,
        "side_by_side": panels,
        "eval": {"arm_c": c_man.get("eval"), "arm_d": d_man.get("eval")},
        "opacity_stats": {"arm_c": c_man.get("opacity_stats"), "arm_d": d_man.get("opacity_stats")},
        "train": {"arm_c": c_man.get("train"), "arm_d": d_man.get("train")},
        "status_by_arm": {"arm_c": c_man.get("status"), "arm_d": d_man.get("status")},
        "note": "Aggregate held-out PSNR/SSIM/LPIPS from ns-eval; single-image train PSNR is not a selection metric.",
    }
    (dest / "comparison.json").write_text(json.dumps(payload, indent=2, default=str) + "\n")
    return payload


if __name__ == "__main__":
    print(json.dumps(compare(Path(sys.argv[1])), indent=2, default=str)[:4000])
