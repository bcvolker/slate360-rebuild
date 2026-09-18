"""Experiment 3 harness tests. No GPU. No training. Real gsplat 1.5.3 on CPU when installed."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import exp3  # noqa: E402
import exp3_strategy_patch as patch  # noqa: E402
from train_arm_exp3 import sweep_checkpoints  # noqa: E402

gsplat = pytest.importorskip("gsplat")


def test_arms_differ_only_by_densify_grad_thresh():
    recipe = {"source_hash": "s", "pose_hash": "p", "mask_hash": "m", "seed_hash": "q", "qa_pose_hash": "v"}
    c = exp3.resolved_arm_config(exp3.ARM_C, recipe)
    d = exp3.resolved_arm_config(exp3.ARM_D, recipe)
    diff = exp3.preflight_diff(c, d)
    assert diff["ok"], diff
    assert diff["differing_keys"] == ["densify_grad_thresh"]
    assert c["densify_grad_thresh"] == 1e9 and d["densify_grad_thresh"] == 0.0008
    assert c["soft_population_cap"] is None and c["max_live_gaussians_hard_guard"] == 3_500_000
    assert c["stop_screen_size_at"] == 4000 and c["warmup_length_refine_start_iter"] == 6016
    assert c["stop_split_at_refine_stop_iter"] == 11000 and c["max_steps"] == 16000
    assert c["cull_alpha_thresh_prune_opa"] == 0.005 and c["use_absgrad"] is True
    assert c["save_only_latest_checkpoint"] is False and c["resume"] is False


def test_derived_schedule():
    s = exp3.derived_schedule()
    assert s["opacity_reset_steps"] == [3000, 6000, 9000]
    assert s["accumulator_clear_step"] == 6017
    assert s["first_refine_step"] == 6300 and s["last_refine_step"] == 10900
    assert s["screen_size_split_inactive_before_refinement"] is True
    assert s["training_cycles_before_refinement"] >= 1.0


def test_train_cmds_differ_only_in_threshold():
    kw = dict(python="python", wrap=Path("/root/splat-lab/ns_train_wrap.py"),
              data_dir=Path("/vol/views"), out_dir=Path("/tmp/x"))
    c = exp3.build_train_cmd(arm=exp3.ARM_C, **kw)
    d = exp3.build_train_cmd(arm=exp3.ARM_D, **kw)
    assert len(c) == len(d)
    diffs = [(a, b) for a, b in zip(c, d) if a != b]
    assert diffs == [(repr(1e9), repr(0.0008))]
    assert c[c.index("--pipeline.model.densify-grad-thresh") + 1] == repr(1e9)
    assert "--load-dir" not in c and "--save-only-latest-checkpoint" in c
    assert c[c.index("--pipeline.model.stop-screen-size-at") + 1] == "4000"


def test_patched_source_contains_fix_and_hooks():
    import inspect
    import textwrap

    from gsplat.strategy.default import DefaultStrategy

    stock = textwrap.dedent(inspect.getsource(DefaultStrategy.__dict__["step_post_backward"]))
    if patch.STOCK_PREDICATE not in stock:
        pytest.skip("installed gsplat is not stock 1.5.3")
    out = patch.build_patched_source(stock)
    assert patch.FIXED_PREDICATE in out and patch.STOCK_PREDICATE not in out
    assert out.index("EXP3_REFINEMENT_ACCUMULATORS_CLEARED") < out.index(patch.UPDATE_CALL)
    assert "_exp3_guard(step, \"grow\"" in out and "_exp3_guard(step, \"prune\"" in out
    compile(out, "<test>", "exec")


def test_apply_patch_probes_stock_then_fixed(tmp_path: Path):
    if gsplat.__version__ != "1.5.3":
        pytest.skip("requires gsplat 1.5.3")
    status = patch.apply(status_dir=tmp_path)
    assert status["stock_probe_reset_called"] is False
    assert status["patched_probe_reset_called"] is True
    assert status["patched_predicate_present"] is True
    assert (tmp_path / "exp3-strategy-patch.json").is_file()
    again = patch.apply(status_dir=tmp_path)
    assert again["bound_code_sha256"] == status["bound_code_sha256"]


def test_population_guard_raises(monkeypatch):
    monkeypatch.setenv("EXP3_MAX_LIVE_GAUSSIANS", "10")
    patch._exp3_guard(6300, "grow", 10)
    with pytest.raises(RuntimeError):
        patch._exp3_guard(6300, "grow", 11)


def test_sweep_keeps_required_and_newest(tmp_path: Path):
    models = tmp_path / "run" / "nerfstudio_models"
    models.mkdir(parents=True)
    for step in (500, 1000, 1500, 3000, 3500):
        (models / f"step-{step:09d}.ckpt").write_bytes(b"x")
    removed = sweep_checkpoints(tmp_path, set(exp3.KEEP_CHECKPOINT_STEPS))
    assert sorted(removed) == ["step-000001000.ckpt", "step-000001500.ckpt"]
    assert (models / "step-000003500.ckpt").is_file()  # newest is never removed
    assert (models / "step-000000500.ckpt").is_file() and (models / "step-000003000.ckpt").is_file()


def test_exp3_recipe_from_exp2():
    exp2 = {"job_id": "cecc2763", "recipe_hash": "abc", "recipe": {"max_steps": 8000, "pose_hash": "p", "mask_hash": "m",
                                                                    "seed_hash": "s", "output_converter": "x"}}
    doc = exp3.build_exp3_recipe(exp2)
    assert doc["recipe"]["max_steps"] == 16000 and doc["changed_variable"] == "densify_grad_thresh"
    assert [a["name"] for a in doc["arms"]] == [exp3.ARM_C["name"], exp3.ARM_D["name"]]
    json.dumps(doc)
