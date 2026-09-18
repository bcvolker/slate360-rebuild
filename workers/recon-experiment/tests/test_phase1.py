"""Phase 1 focused tests. No GPU. No training."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LAB = Path(__file__).resolve().parents[2] / "local" / "splat-lab"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(LAB))

from trainer_control import (  # noqa: E402
    UnsupportedSplatCap,
    resolve_cap_contract,
    resolve_train_schedule,
    select_checkpoint,
    write_checkpoint_identity,
)
from experiment import ARM_A, ARM_B, arm_payload, arms_differ_only_by_refine_stop, freeze_recipe  # noqa: E402
from manifest import ManifestError, TERMINAL_OK, build_result_manifest  # noqa: E402
from mask_contract import (  # noqa: E402
    MaskContractError,
    cache_is_valid,
    mask_set_hash,
    require_masks,
    view_cache_fingerprint,
    write_cache_meta,
)
from hashes import sha256_json  # noqa: E402


def test_configured_cap_rejected_for_default_strategy():
    with pytest.raises(UnsupportedSplatCap):
        resolve_cap_contract(strategy="default", max_splats_millions=3.0, view_count=6016)
    auto = resolve_cap_contract(
        strategy="default", max_splats_millions=0, view_count=6016, auto_cap=3_008_000
    )
    assert auto["enforced"] is False
    assert auto["mode"] == "unsupported"
    assert auto.get("effectiveLimit") is None


def test_resume_preserves_absolute_refine_stop():
    sched0 = resolve_train_schedule(steps=8000, already=0, refine_stop_iter=4300)
    sched1 = resolve_train_schedule(steps=8000, already=3750, refine_stop_iter=4300)
    assert sched0["stop_split_at_absolute"] == 4300
    assert sched1["stop_split_at_absolute"] == 4300
    assert sched1["cli_max_num_iterations"] == 8000 - 3750
    assert sched1["actual_images_per_optimizer_step"] == 1


def test_checkpoint_selection_uses_identity_and_step(tmp_path: Path):
    older = tmp_path / "step-00001000.ckpt"
    newer = tmp_path / "step-00000500.ckpt"
    older.write_bytes(b"x" * 128)
    time.sleep(0.05)
    newer.write_bytes(b"y" * 128)
    # mtime would pick step 500; identity/step must pick 1000 when identity matches.
    ident = {
        "job_id": "exp",
        "source_hash": "s",
        "pose_hash": "p",
        "mask_hash": "m",
        "recipe_hash": "r",
    }
    write_checkpoint_identity(older, ident)
    write_checkpoint_identity(newer, ident)
    picked = select_checkpoint(tmp_path, ident)
    assert picked is not None
    assert picked.name == "step-00001000.ckpt"
    other = dict(ident)
    other["mask_hash"] = "changed"
    assert select_checkpoint(tmp_path, other) is None


def test_effective_config_matches_actual_schedule():
    sched = resolve_train_schedule(steps=8000, already=0, refine_stop_iter=500)
    effective = {
        "refine_stop_iter": sched["effective_refine_stop_iter"],
        "stop_split_at": sched["stop_split_at_absolute"],
        "actual_images_per_optimizer_step": sched["actual_images_per_optimizer_step"],
        "cli_max_num_iterations": sched["cli_max_num_iterations"],
        "cap_mode": resolve_cap_contract(strategy="default", max_splats_millions=0, view_count=10)["mode"],
    }
    assert effective["refine_stop_iter"] == 500
    assert effective["stop_split_at"] == 500
    assert effective["actual_images_per_optimizer_step"] == 1
    assert effective["cli_max_num_iterations"] == 8000
    assert effective["cap_mode"] == "unsupported"
    argv_stop = ["--pipeline.model.stop-split-at", str(effective["stop_split_at"])]
    assert argv_stop[1] == "500"


def _png(path: Path) -> None:
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
        b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )


def test_missing_required_mask_fails(tmp_path: Path):
    img = tmp_path / "000001.jpg"
    img.write_bytes(b"jpeg")
    with pytest.raises(MaskContractError):
        require_masks([img], tmp_path / "masks", required=True)


def test_mismatched_mask_image_fails(tmp_path: Path):
    img = tmp_path / "000001.jpg"
    img.write_bytes(b"jpeg")
    masks = tmp_path / "masks"
    masks.mkdir()
    _png(masks / "000999.png")
    with pytest.raises(MaskContractError):
        require_masks([img], masks, required=True)


def test_changed_mask_hash_invalidates_cache(tmp_path: Path):
    masks = tmp_path / "masks"
    masks.mkdir()
    png = masks / "000001.png"
    _png(png)
    fp1 = view_cache_fingerprint(mask_set_hash(masks), "pose", ["layout"])
    meta = tmp_path / "views-meta.json"
    write_cache_meta(meta, fp1)
    assert cache_is_valid(meta, fp1)
    png.write_bytes(png.read_bytes() + b"\x00")
    fp2 = view_cache_fingerprint(mask_set_hash(masks), "pose", ["layout"])
    assert fp1 != fp2
    assert cache_is_valid(meta, fp2) is False


def test_experiment_arms_differ_only_by_refine_stop():
    recipe = freeze_recipe(
        source_hash="src",
        pose_hash="pose",
        mask_hash="mask",
        seed_hash="seed",
        view_count=6016,
        pano_count=376,
        resolution=1280,
        sh_degree=3,
        bilateral=True,
        optimizer="splatfacto-adam",
        loss="l1+ssim",
        backend="modal",
        actual_images_per_optimizer_step=1,
        max_steps=8000,
        rng_seed=42,
        use_lidar=False,
        output_converter="splat-transform@2.7.1-spz-v3",
        qa_pose_hash="qa",
    )
    a = arm_payload(recipe, ARM_A)
    b = arm_payload(recipe, ARM_B)
    assert arms_differ_only_by_refine_stop(a, b)
    b_bad = dict(b)
    b_bad["sh_degree"] = 2
    assert arms_differ_only_by_refine_stop(a, b_bad) is False
    assert a["refine_stop_iter"] == 500
    assert b["refine_stop_iter"] == 4300


def test_result_manifest_requires_ply_spz_qa_hashes():
    hashes = {
        "ply": "a" * 64,
        "spz": "b" * 64,
        "A_on_path.png": "c" * 64,
        "B_off_path.png": "d" * 64,
        "C_dollhouse.png": "e" * 64,
        "D_overhead.png": "f" * 64,
    }
    man = build_result_manifest(
        experiment_id="exp1",
        arm=None,
        hashes=hashes,
        effective_config_hash=sha256_json({"ok": True}),
        status=TERMINAL_OK,
    )
    assert man["status"] == "needs_review"
    with pytest.raises(ManifestError):
        build_result_manifest(
            experiment_id="exp1", arm=None, hashes={"ply": "x"},
            effective_config_hash="h", status=TERMINAL_OK,
        )


def test_experiment_result_is_needs_review_not_published():
    hashes = {k: "0" * 64 for k in (
        "ply", "spz", "A_on_path.png", "B_off_path.png", "C_dollhouse.png", "D_overhead.png"
    )}
    man = build_result_manifest(
        experiment_id="exp1", arm=None, hashes=hashes, effective_config_hash="h"
    )
    assert man["status"] == "needs_review"
    assert man["published"] is False
    assert man["client_share"] is None
    with pytest.raises(ManifestError):
        build_result_manifest(
            experiment_id="exp1", arm=None, hashes=hashes,
            effective_config_hash="h", status="ready",
        )
