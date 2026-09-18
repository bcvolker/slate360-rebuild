"""Experiment 3 arm runner: corrected splatfacto train from step 0, no resume.

Arms differ ONLY by densify_grad_thresh (see exp3.py). Everything here runs after the human
launch approval, inside the Modal L40S container (workers/modal/recon-experiment/worker.py).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent


def _lab_dir() -> Path:
    """Modal container path first; local worktree otherwise (WSL denies stat on /root)."""
    try:
        if Path("/root/splat-lab").is_dir():
            return Path("/root/splat-lab")
    except PermissionError:
        pass
    return ROOT.parent / "local" / "splat-lab"


LAB = _lab_dir()
for p in (str(ROOT), str(LAB)):
    if p not in sys.path:
        sys.path.insert(0, p)

import exp3  # noqa: E402
from effective_config import gpu_type, write_effective_config  # noqa: E402
from eval_arm import export_ply_at, run_ns_eval  # noqa: E402
from experiment import HOURLY_USD  # noqa: E402
from hashes import sha256_dir, sha256_file, sha256_json  # noqa: E402
from manifest import write_result_manifest  # noqa: E402
from opacity_stats import ckpt_step, opacity_stats_for_ckpt  # noqa: E402

STEP_RE = re.compile(r"^\s*(\d+)\s*\((\d+(?:\.\d+)?)%\)")
WRAP = LAB / "ns_train_wrap.py"
KEEP = set(exp3.KEEP_CHECKPOINT_STEPS)


def cost_usd(elapsed_s: float) -> float:
    return round(elapsed_s / 3600.0 * HOURLY_USD, 4)


# ---------------------------------------------------------------- input identity
def verify_inputs(data_dir: Path, recipe: dict[str, Any]) -> dict[str, Any]:
    """The volume tree must be the frozen Room 213 source (pose / seed / mask hashes)."""
    transforms = data_dir / "transforms.json"
    points = data_dir.parent / "sfm" / "points.ply"
    masks = data_dir / "masks"
    got = {
        "pose_hash": sha256_file(transforms),
        "seed_hash": sha256_file(points) if points.is_file() else None,
        "mask_hash": sha256_dir(masks, ("*.png",)) if masks.is_dir() else None,
    }
    mismatch = {k: (recipe.get(k), got[k]) for k in got if recipe.get(k) != got[k]}
    if mismatch:
        raise RuntimeError(f"EXP3 input identity mismatch (recipe vs volume): {mismatch}")
    split = exp3.dataset_split(transforms)
    if not split["matches_expected"]:
        raise RuntimeError(f"EXP3 dataset split mismatch: {split}")
    return {"hashes": got, "split": split}


# ---------------------------------------------------------------- training
def _read_gaussian_count(out_dir: Path) -> int:
    try:
        from tensorboard.backend.event_processing.event_accumulator import EventAccumulator
    except ImportError:
        return 0
    events = sorted(out_dir.rglob("events.out.tfevents*"), key=lambda p: p.stat().st_mtime)
    if not events:
        return 0
    try:
        acc = EventAccumulator(str(events[-1].parent), size_guidance={"scalars": 1})
        acc.Reload()
        tag = "Train Metrics Dict/gaussian_count"
        if tag not in acc.Tags().get("scalars", []):
            return 0
        series = acc.Scalars(tag)
        return int(series[-1].value) if series else 0
    except Exception:
        return 0


def sweep_checkpoints(train_dir: Path, keep: set[int]) -> list[str]:
    """Delete checkpoints outside the keep set once a strictly newer checkpoint exists.

    Bounds container disk without ever touching the file currently being written.
    """
    ckpts = [(ckpt_step(p), p) for p in train_dir.rglob("step-*.ckpt")]
    ckpts = [(s, p) for s, p in ckpts if s is not None]
    if not ckpts:
        return []
    newest = max(s for s, _ in ckpts)
    removed = []
    for step, path in ckpts:
        if step in keep or step >= newest:
            continue
        try:
            path.unlink()
            removed.append(path.name)
        except OSError:
            pass
    return removed


def run_ns_train(cmd: list[str], out_dir: Path, log_path: Path, env: dict[str, str]) -> dict[str, Any]:
    t0 = time.time()
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1, env=env)
    hb = {"step": 0, "gaussians": 0, "abort": None}
    stop = threading.Event()
    history: list[dict] = []
    removed_all: list[str] = []

    def heartbeat() -> None:
        while not stop.wait(10):
            elapsed = time.time() - t0
            count = _read_gaussian_count(out_dir)
            if count:
                hb["gaussians"] = count
            usd = cost_usd(elapsed)
            history.append({"t": round(elapsed, 1), "step": hb["step"], "gaussians": hb["gaussians"], "cost_usd": usd})
            (out_dir / "gaussian-count.json").write_text(json.dumps(history) + "\n")
            removed_all.extend(sweep_checkpoints(out_dir, KEEP))
            if count > exp3.MAX_LIVE_GAUSSIANS:
                hb["abort"] = f"max_live_gaussians {count} > {exp3.MAX_LIVE_GAUSSIANS} (heartbeat backstop)"
            elif elapsed > exp3.MAX_RUNTIME_S:
                hb["abort"] = f"runtime {int(elapsed)}s > {exp3.MAX_RUNTIME_S}s"
            elif usd > exp3.MAX_COST_USD_PER_ARM:
                hb["abort"] = f"cost ${usd} > ${exp3.MAX_COST_USD_PER_ARM}"
            if hb["abort"]:
                proc.terminate()
                return
            if proc.poll() is not None:
                return

    threading.Thread(target=heartbeat, daemon=True).start()
    log_path.parent.mkdir(parents=True, exist_ok=True)
    markers = {"patch": None, "cleared": None, "guard": None, "refine": []}
    assert proc.stdout is not None
    with log_path.open("w", encoding="utf-8") as logf:
        for line in proc.stdout:
            logf.write(line)
            logf.flush()
            m = STEP_RE.match(line)
            if m:
                hb["step"] = int(m.group(1))
            if line.startswith("EXP3_STRATEGY_PATCH "):
                markers["patch"] = line[len("EXP3_STRATEGY_PATCH "):].strip()
            elif line.startswith("EXP3_REFINEMENT_ACCUMULATORS_CLEARED"):
                markers["cleared"] = line.strip()
            elif line.startswith("EXP3_POPULATION_GUARD_TRIPPED"):
                markers["guard"] = line.strip()
            elif line.startswith("EXP3_REFINE "):
                markers["refine"].append(line.strip())
    stop.set()
    code = proc.wait()
    elapsed = time.time() - t0
    removed_all.extend(sweep_checkpoints(out_dir, KEEP))
    return {
        "exit_code": code,
        "elapsed_s": round(elapsed, 3),
        "step": hb["step"],
        "gaussians": hb["gaussians"],
        "abort": hb["abort"],
        "cost_usd": cost_usd(elapsed),
        "history": history,
        "markers": markers,
        "swept_checkpoints": removed_all,
    }


# ---------------------------------------------------------------- post-train evidence
def hash_kept_checkpoints(train_dir: Path, dest: Path) -> list[dict]:
    import torch

    rows = []
    for ckpt in sorted(train_dir.rglob("step-*.ckpt"), key=lambda p: ckpt_step(p) or -1):
        payload = torch.load(ckpt, map_location="cpu", weights_only=False)
        pipe = payload.get("pipeline") or {}
        gauss = {}
        for key, val in pipe.items():
            name = str(key).split(".")[-1]
            if "gauss_params" in str(key) and torch.is_tensor(val) and name in exp3.HASHED_TENSORS:
                gauss[name] = {
                    "shape": list(val.shape),
                    "sha256": hashlib.sha256(val.detach().contiguous().cpu().numpy().tobytes()).hexdigest(),
                }
        rows.append({"ckpt": ckpt.name, "step": payload.get("step"), "bytes": ckpt.stat().st_size, "gauss": gauss})
        del payload
    dest.write_text(json.dumps(rows, indent=2) + "\n")
    return rows


def dump_scalars(out_dir: Path, dest: Path) -> dict[str, list]:
    payload: dict[str, list] = {}
    try:
        from tensorboard.backend.event_processing.event_accumulator import EventAccumulator
    except ImportError:
        dest.write_text("{}\n")
        return payload
    events = sorted(out_dir.rglob("events.out.tfevents*"), key=lambda p: p.stat().st_mtime)
    if not events:
        dest.write_text("{}\n")
        return payload
    acc = EventAccumulator(str(events[-1].parent), size_guidance={"scalars": 0})
    acc.Reload()
    for tag in acc.Tags().get("scalars", []):
        payload[tag] = [{"step": int(e.step), "value": float(e.value), "wall": float(e.wall_time)} for e in acc.Scalars(tag)]
    dest.write_text(json.dumps(payload) + "\n")
    return payload


def render_ply_qa(ply: Path, poses: Path, out_dir: Path) -> dict[str, Any]:
    """Four frozen QA views, identical camera/renderer/resolution for every arm and step."""
    import torch
    from harness import render_artifact
    from ply_load import load_ply
    from poses import load_poses

    poses_doc = load_poses(poses)
    cloud = load_ply(ply)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    info = render_artifact(label=ply.stem, cloud=cloud, poses=poses_doc["poses"], out_dir=out_dir, device=device)
    info["qa_pose_set_hash"] = poses_doc.get("pose_set_hash")
    info["human_verdict"] = "UNREVIEWED"
    return info


def _assert_gsplat_cuda() -> dict[str, Any]:
    import gsplat
    from gsplat.cuda._backend import _C

    if _C is None:
        raise RuntimeError(f"gsplat {gsplat.__version__} has no CUDA ops; refusing to start Experiment 3")
    return {"gsplat": gsplat.__version__, "cuda_ops": True}


def run_arm(*, work: Path, data_dir: Path, poses: Path, arm: dict[str, Any], recipe: dict[str, Any]) -> dict[str, Any]:
    work.mkdir(parents=True, exist_ok=True)
    train_dir = work / "train"
    train_dir.mkdir(parents=True, exist_ok=True)
    (work / "gsplat-cuda.json").write_text(json.dumps(_assert_gsplat_cuda(), indent=2) + "\n")
    identity = verify_inputs(data_dir, recipe)
    (work / "input-identity.json").write_text(json.dumps(identity, indent=2) + "\n")

    resolved = exp3.resolved_arm_config(arm, recipe)
    (work / "resolved-config.json").write_text(json.dumps(resolved, indent=2, sort_keys=True) + "\n")
    cmd = exp3.build_train_cmd(python=sys.executable, wrap=WRAP, data_dir=data_dir, out_dir=train_dir, arm=arm)
    (work / "train-cmd.json").write_text(json.dumps(cmd, indent=2) + "\n")
    env = dict(os.environ)
    env.update({
        "SPLAT_LAB_EXP3": "1",
        "EXP3_STATUS_DIR": str(work),
        "EXP3_MAX_LIVE_GAUSSIANS": str(exp3.MAX_LIVE_GAUSSIANS),
        "SPLAT_LAB_WRAP_STATUS_PATH": str(work / "wrap-status.json"),
    })
    train = run_ns_train(cmd, train_dir, work / "ns-train.log", env)
    (work / "gaussian-count.json").write_text(json.dumps(train.get("history") or [], indent=2) + "\n")
    (work / "refine-log.json").write_text(json.dumps(train["markers"], indent=2) + "\n")

    # Validity: the patch must have been applied and self-verified inside ns-train.
    patch_path = work / "exp3-strategy-patch.json"
    patch = json.loads(patch_path.read_text()) if patch_path.is_file() else None
    patch_ok = bool(patch and patch.get("stock_probe_reset_called") is False and patch.get("patched_probe_reset_called") is True)
    wrap_path = work / "wrap-status.json"
    wrap = json.loads(wrap_path.read_text()) if wrap_path.is_file() else None
    pause_ok = bool(wrap and int(wrap.get("effective_pause_refine_after_reset") or -1) == exp3.PAUSE_REFINE_AFTER_RESET)

    dump_scalars(train_dir, work / "scalar-logs.json")
    hashes = hash_kept_checkpoints(train_dir, work / "checkpoint-hashes.json")
    kept_steps = sorted(int(r["step"]) for r in hashes if r.get("step") is not None)
    opacity = []
    for ckpt in sorted(train_dir.rglob("step-*.ckpt"), key=lambda p: ckpt_step(p) or -1):
        opacity.append(opacity_stats_for_ckpt(ckpt, exp3.OPACITY_THRESHOLDS))
    (work / "opacity-stats.json").write_text(json.dumps(opacity, indent=2) + "\n")

    finished = train.get("abort") is None and train.get("exit_code") == 0 and train.get("step", 0) >= exp3.MAX_STEPS - 1
    evals: dict[str, Any] = {}
    renders: dict[str, Any] = {}
    exports: dict[str, Any] = {}
    for step in exp3.EVAL_STEPS:
        if step not in kept_steps:
            evals[str(step)] = {"ok": False, "error": "checkpoint not present"}
            continue
        evals[str(step)] = run_ns_eval(train_dir, step, work / "eval" / f"metrics-{step}.json")
        exp = export_ply_at(train_dir, step, work / "export")
        exports[str(step)] = exp
        if exp.get("ok"):
            renders[str(step)] = render_ply_qa(Path(exp["ply"]), poses, work / "qa" / f"step-{step}")
    (work / "eval-summary.json").write_text(json.dumps(evals, indent=2) + "\n")

    if train.get("abort") or train["markers"].get("guard"):
        status = "failed_population_guard" if (train["markers"].get("guard") or "max_live" in str(train.get("abort"))) else "aborted"
    elif not finished:
        status = "failed"
    elif not (patch_ok and pause_ok):
        status = "failed_invalid_harness"
    else:
        status = "needs_review"

    effective = {
        **recipe,
        **resolved,
        "gpu": gpu_type(),
        "hourly_usd": HOURLY_USD,
        "versions": _versions(),
        "strategy_patch": patch,
        "wrap_status": wrap,
        "train": {k: train[k] for k in ("exit_code", "elapsed_s", "step", "gaussians", "abort", "cost_usd")},
        "kept_checkpoint_steps": kept_steps,
        "eval": evals,
        "exports": {k: {kk: v.get(kk) for kk in ("ok", "ply_sha256", "step")} for k, v in exports.items()},
    }
    write_effective_config(work / "effective-config.json", effective)
    result = {
        "experiment_id": exp3.EXPERIMENT_ID,
        "arm": arm["name"],
        "densify_grad_thresh": arm["densify_grad_thresh"],
        "changed_variable": exp3.CHANGED_VARIABLE,
        "status": status,
        "published": False,
        "human_verdict": "UNREVIEWED",
        "HUMAN_VISUAL_VERDICT": "UNREVIEWED",
        "effective_config_hash": sha256_json(effective),
        "harness_valid": patch_ok and pause_ok,
        "train": {k: train[k] for k in ("exit_code", "elapsed_s", "step", "gaussians", "abort", "cost_usd", "swept_checkpoints")},
        "markers": {"patch_applied": patch_ok, "accumulators_cleared": train["markers"].get("cleared"),
                    "guard": train["markers"].get("guard"), "refine_events": len(train["markers"].get("refine") or [])},
        "kept_checkpoint_steps": kept_steps,
        "eval": evals,
        "opacity_stats": opacity,
        "renders": renders,
        "gpu": gpu_type(),
        "cost_usd": train.get("cost_usd"),
    }
    write_result_manifest(work / "result-manifest.json", result)
    return result


def _versions() -> dict[str, str]:
    from importlib.metadata import version as pkg_version

    import gsplat
    import torch

    return {"torch": torch.__version__, "gsplat": gsplat.__version__, "nerfstudio": pkg_version("nerfstudio")}
