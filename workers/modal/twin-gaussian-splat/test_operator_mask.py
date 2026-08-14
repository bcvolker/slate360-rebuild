"""MASK-1 unit tests — pure decision logic + transforms.json mask injection.

Segmentation itself (ultralytics/YOLO) is exercised only in the Modal image;
these tests cover everything that runs without a GPU: the mask/cull decision
and the nerfstudio mask_path plumbing, including the ns-process-data rename
mapping and the pose-prior identity fallback.
"""

import json
from pathlib import Path

import pytest
from PIL import Image

from operator_mask import (
    decide_mask_action,
    cull_images,
    inject_masks_into_transforms,
)


def test_decide_mask_action_thresholds():
    assert decide_mask_action(0.0) == "none"
    assert decide_mask_action(-0.1) == "none"
    assert decide_mask_action(0.01, cull_coverage=0.45) == "mask"
    assert decide_mask_action(0.44, cull_coverage=0.45) == "mask"
    assert decide_mask_action(0.45, cull_coverage=0.45) == "cull"
    assert decide_mask_action(0.99, cull_coverage=0.45) == "cull"


def test_cull_images_removes_only_named(tmp_path: Path):
    keep = tmp_path / "keep.jpg"
    drop = tmp_path / "drop.jpg"
    keep.write_bytes(b"x")
    drop.write_bytes(b"x")
    removed = cull_images(tmp_path, ["drop.jpg", "already-gone.jpg"])
    assert removed == 1
    assert keep.is_file()
    assert not drop.exists()


def _write_transforms(processed: Path, file_paths: list[str]) -> Path:
    processed.mkdir(parents=True, exist_ok=True)
    payload = {"frames": [{"file_path": fp} for fp in file_paths]}
    tp = processed / "transforms.json"
    tp.write_text(json.dumps(payload), encoding="utf-8")
    return tp


def _write_mask(masks_dir: Path, stem: str, size=(16, 12)) -> None:
    masks_dir.mkdir(parents=True, exist_ok=True)
    Image.new("L", size, 255).save(masks_dir / f"{stem}.png")


def test_inject_with_ns_process_rename_map_fills_all_frames(tmp_path: Path):
    """nerfstudio asserts mask_path on EVERY frame or none — the exact
    assertion that failed the first live MASK-1 run (24/55 masked). Frames
    without an operator mask must receive a full-white fill mask."""
    processed = tmp_path / "processed"
    masks_dir = tmp_path / "operator_masks"
    _write_transforms(
        processed, ["images/frame_00001.jpg", "images/frame_00002.jpg"]
    )
    _write_mask(masks_dir, "viewA")  # only frame_00001's original has a mask
    # frame_00002 has no operator mask — its fill mask is sized from its image.
    (processed / "images").mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (16, 12), (128, 128, 128)).save(
        processed / "images" / "frame_00002.jpg"
    )
    frame_map = {"frame_00001.jpg": "viewA.jpg", "frame_00002.jpg": "viewB.jpg"}

    stats = inject_masks_into_transforms(processed, masks_dir, frame_map)

    assert stats == {"masksApplied": 1, "fillMasksApplied": 1, "framesTotal": 2}
    data = json.loads((processed / "transforms.json").read_text())
    # EVERY frame carries a mask_path — the all-or-nothing invariant.
    assert data["frames"][0]["mask_path"] == "masks/frame_00001.png"
    assert data["frames"][1]["mask_path"] == "masks/frame_00002.png"
    # The fill mask is all-white (keep everything) at the image's own size.
    with Image.open(processed / "masks" / "frame_00002.png") as fill:
        assert fill.size == (16, 12)
        assert fill.getextrema() == (255, 255)
    # Full-res + both downscale copies exist with the right dimensions.
    assert (processed / "masks" / "frame_00001.png").is_file()
    with Image.open(processed / "masks_2" / "frame_00001.png") as m2:
        assert m2.size == (8, 6)
    with Image.open(processed / "masks_4" / "frame_00001.png") as m4:
        assert m4.size == (4, 3)


def test_inject_identity_fallback_for_pose_prior_names(tmp_path: Path):
    processed = tmp_path / "processed"
    masks_dir = tmp_path / "operator_masks"
    _write_transforms(processed, ["images/viewA_0001_p000y000.jpg"])
    _write_mask(masks_dir, "viewA_0001_p000y000")

    stats = inject_masks_into_transforms(processed, masks_dir, frame_map={})

    assert stats["masksApplied"] == 1
    data = json.loads((processed / "transforms.json").read_text())
    assert data["frames"][0]["mask_path"] == "masks/viewA_0001_p000y000.png"


def test_inject_missing_transforms_is_nonfatal(tmp_path: Path):
    stats = inject_masks_into_transforms(tmp_path / "nope", tmp_path, {})
    assert stats["injectError"] == "missing transforms.json"
    assert stats["masksApplied"] == 0


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
