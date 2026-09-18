#!/usr/bin/env python3
"""Freeze Room 213 experiment inputs. No training."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from experiment import (  # noqa: E402
    BILATERAL,
    OUTPUT_CONVERTER,
    PANO_COUNT,
    RESOLUTION,
    RNG_SEED,
    SH_DEGREE,
    VIEW_COUNT,
    freeze_recipe,
    recipe_hash,
)
from hashes import sha256_file, sha256_json  # noqa: E402
from mask_contract import mask_set_hash  # noqa: E402

JOB = Path("/mnt/c/s360/tmp/splat-lab/cecc2763")
QA = Path("/mnt/c/s360-recon-exp/qa")
OUT = Path("/mnt/c/s360-recon-exp/experiments/room213-densification")


def _image_inventory(images: Path) -> dict:
    rows = []
    total = 0
    for path in sorted(images.glob("*.jpg")):
        size = path.stat().st_size
        total += size
        rows.append({"name": path.name, "bytes": size})
    return {"count": len(rows), "bytes": total, "files": rows}


def main() -> int:
    views = JOB / "views"
    transforms = views / "transforms.json"
    points = JOB / "sfm" / "points.ply"
    poses = QA / "visual-poses.json"
    images = _image_inventory(views / "images")
    if images["count"] != VIEW_COUNT:
        raise SystemExit(f"expected {VIEW_COUNT} views, found {images['count']}")
    pose_hash = sha256_file(transforms)
    seed_hash = sha256_file(points)
    mask_hash = mask_set_hash(views / "masks")
    qa_pose_hash = json.loads(poses.read_text(encoding="utf-8"))["pose_set_hash"]
    source_hash = sha256_json({
        "transforms": pose_hash,
        "points": seed_hash,
        "image_count": images["count"],
        "image_bytes": images["bytes"],
        "image_names": [row["name"] for row in images["files"]],
    })
    recipe = freeze_recipe(
        source_hash=source_hash,
        pose_hash=pose_hash,
        mask_hash=mask_hash,
        seed_hash=seed_hash,
        view_count=VIEW_COUNT,
        pano_count=PANO_COUNT,
        resolution=RESOLUTION,
        sh_degree=SH_DEGREE,
        bilateral=BILATERAL,
        optimizer="splatfacto-adam",
        loss="l1+ssim",
        backend="modal-L40S",
        actual_images_per_optimizer_step=1,
        max_steps=8000,
        rng_seed=RNG_SEED,
        use_lidar=False,
        output_converter=OUTPUT_CONVERTER,
        qa_pose_hash=qa_pose_hash,
    )
    payload = {
        "job_id": "cecc2763",
        "recipe": recipe,
        "recipe_hash": recipe_hash(recipe),
        "changed_variable": "refine_stop_iter",
        "points_ply": str(points),
        "transforms": str(transforms),
        "views_dir": str(views),
        "visual_poses": str(poses),
        "image_bytes": images["bytes"],
    }
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / "frozen-recipe.json"
    dest.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (QA / "exp2-frozen-recipe.json").write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(json.dumps({"wrote": str(dest), "recipe_hash": payload["recipe_hash"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
