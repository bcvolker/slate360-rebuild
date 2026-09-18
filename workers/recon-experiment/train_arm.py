"""Experiment 2 arm: splatfacto train from step 0. Only refine_stop_iter differs."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
LAB = Path("/root/splat-lab") if Path("/root/splat-lab").exists() else ROOT.parent / "local" / "splat-lab"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(LAB))

from effective_config import gpu_type, write_effective_config  # noqa: E402
from experiment import (  # noqa: E402
    BILATERAL,
    HOURLY_USD,
    MAX_COST_USD,
    MAX_GAUSSIANS_ABORT,
    MAX_RUNTIME_S,
    MAX_STEPS,
    OUTPUT_CONVERTER,
    RNG_SEED,
    SH_DEGREE,
)
from hashes import sha256_file, sha256_json  # noqa: E402
from trainer_control import resolve_train_schedule  # noqa: E402

STEP_RE = __import__("re").compile(r"^\s*(\d+)\s*\((\d+(?:\.\d+)?)%\)")
WRAP = LAB / "ns_train_wrap.py"


def cost_usd(elapsed_s: float) -> float:
    return round(elapsed_s / 3600.0 * HOURLY_USD, 4)


def build_train_cmd(*, data_dir: Path, out_dir: Path, refine_stop_iter: int) -> tuple[list[str], dict]:
    schedule = resolve_train_schedule(
        steps=MAX_STEPS, already=0, refine_stop_iter=refine_stop_iter
    )
    wrap_status = out_dir / "wrap-status.json"
    os.environ["SPLAT_LAB_WRAP_STATUS_PATH"] = str(wrap_status)
    cmd = [
        sys.executable, str(WRAP), "splatfacto",
        "--data", str(data_dir),
        "--output-dir", str(out_dir),
        "--max-num-iterations", str(schedule["cli_max_num_iterations"]),
        "--machine.seed", str(RNG_SEED),
        "--pipeline.model.sh-degree", str(SH_DEGREE),
        "--pipeline.model.sh-degree-interval", str(max(1, MAX_STEPS // 30)),
        "--pipeline.model.cull-alpha-thresh", "0.001",
        "--pipeline.model.cull-scale-thresh", "0.15",
        "--pipeline.model.densify-grad-thresh", "0.0002",
        "--pipeline.model.stop-split-at", str(schedule["stop_split_at_absolute"]),
        "--pipeline.model.use-bilateral-grid", "True" if BILATERAL else "False",
        "--pipeline.model.use-scale-regularization", "True",
        "--pipeline.datamanager.cache-images", "cpu",
        "--pipeline.datamanager.cache-images-type", "uint8",
        "--pipeline.datamanager.masks-on-gpu", "False",
        "--logging.local-writer.enable", "True",
        "--logging.steps-per-log", "50",
        "--steps-per-save", "750",
        "--save-only-latest-checkpoint", "False",
        "--steps-per-eval-batch", "100000",
        "--steps-per-eval-image", "100000",
        "--steps-per-eval-all-images", "100000",
        "--vis", "tensorboard",
    ]
    (out_dir / "train-schedule.json").write_text(json.dumps(schedule, indent=2) + "\n")
    return cmd, schedule


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


def hash_gauss_checkpoints(train_dir: Path, dest: Path) -> list[dict]:
    """SHA256 of live gauss_params tensors in each kept checkpoint. No training."""
    import hashlib
    import torch

    rows = []
    ckpts = sorted(train_dir.rglob("step-*.ckpt"))
    for ckpt in ckpts:
        payload = torch.load(ckpt, map_location="cpu", weights_only=False)
        pipe = payload.get("pipeline") or {}
        gauss = {}
        for key, val in pipe.items():
            if "gauss_params" in str(key) and torch.is_tensor(val):
                gauss[str(key)] = {
                    "shape": list(val.shape),
                    "sha256": hashlib.sha256(val.detach().contiguous().cpu().numpy().tobytes()).hexdigest(),
                }
        rows.append({
            "ckpt": ckpt.name,
            "step": payload.get("step"),
            "bytes": ckpt.stat().st_size,
            "gauss": gauss,
        })
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


def run_ns_train(cmd: list[str], out_dir: Path, log_path: Path) -> dict[str, Any]:
    t0 = time.time()
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    hb = {"step": 0, "gaussians": 0, "abort": None}
    stop = threading.Event()
    history: list[dict] = []

    def heartbeat() -> None:
        while not stop.wait(10):
            elapsed = time.time() - t0
            count = _read_gaussian_count(out_dir)
            if count:
                hb["gaussians"] = count
            usd = cost_usd(elapsed)
            rec = {"t": round(elapsed, 1), "step": hb["step"], "gaussians": hb["gaussians"], "cost_usd": usd}
            history.append(rec)
            (out_dir / "gaussian-count.json").write_text(json.dumps(history) + "\n")
            if count > MAX_GAUSSIANS_ABORT:
                hb["abort"] = f"max_gaussians {count} > {MAX_GAUSSIANS_ABORT}"
                proc.terminate()
                return
            if elapsed > MAX_RUNTIME_S:
                hb["abort"] = f"runtime {int(elapsed)}s > {MAX_RUNTIME_S}s"
                proc.terminate()
                return
            if usd > MAX_COST_USD:
                hb["abort"] = f"cost ${usd} > ${MAX_COST_USD}"
                proc.terminate()
                return
            if proc.poll() is not None:
                return

    threading.Thread(target=heartbeat, daemon=True).start()
    log_path.parent.mkdir(parents=True, exist_ok=True)
    assert proc.stdout is not None
    with log_path.open("w", encoding="utf-8") as logf:
        for line in proc.stdout:
            logf.write(line)
            logf.flush()
            m = STEP_RE.match(line)
            if m:
                hb["step"] = int(m.group(1))
    stop.set()
    code = proc.wait()
    elapsed = time.time() - t0
    return {
        "exit_code": code,
        "elapsed_s": round(elapsed, 3),
        "step": hb["step"],
        "gaussians": hb["gaussians"],
        "abort": hb["abort"],
        "cost_usd": cost_usd(elapsed),
        "history": history,
    }


def export_ply_spz(train_dir: Path, dest: Path) -> dict[str, Any]:
    dest.mkdir(parents=True, exist_ok=True)
    cfg = next(train_dir.rglob("config.yml"), None)
    if cfg is None:
        return {"ok": False, "error": "no config.yml"}
    ply = dest / "output.ply"
    cmd = ["ns-export", "gaussian-splat", "--load-config", str(cfg), "--output-dir", str(dest), "--output-filename", "output.ply"]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
    if proc.returncode != 0 or not ply.exists():
        return {"ok": False, "error": (proc.stderr or proc.stdout or "")[-800:]}
    spz = dest / "output.spz"
    tf = subprocess.run(
        ["npx", "--yes", "@playcanvas/splat-transform@2.7.1", "--input", str(ply), "--output", str(spz), "--sog"],
        capture_output=True, text=True, timeout=1800,
    )
    return {
        "ok": True,
        "ply": str(ply),
        "ply_sha256": sha256_file(ply),
        "spz": str(spz) if spz.exists() else None,
        "spz_sha256": sha256_file(spz) if spz.exists() else None,
        "converter": OUTPUT_CONVERTER,
        "splat_transform_exit": tf.returncode,
        "config_yml": str(cfg),
    }


def render_arm_qa(*, ply: Path, spz: Path | None, poses: Path, qa_dir: Path, dataset: str) -> dict:
    from harness import build_parser, run_exp1
    if not (spz and spz.is_file()):
        from ply_load import load_ply
        from poses import load_poses
        import torch
        poses_doc = load_poses(poses)
        cloud = load_ply(ply)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        from harness import render_artifact
        info = render_artifact(
            label="ply", cloud=cloud, poses=poses_doc["poses"],
            out_dir=qa_dir / "renders" / dataset / "ply", device=device,
        )
        return {"ply": info, "spz": None, "human_verdict": "UNREVIEWED"}
    args = build_parser().parse_args([
        "--ply", str(ply), "--spz", str(spz), "--poses", str(poses),
        "--qa-dir", str(qa_dir), "--dataset", dataset,
    ])
    return run_exp1(args)


def _assert_gsplat_cuda() -> dict[str, Any]:
    """Fail before ns-train if rasterizer CUDA ops are missing (PyPI wheel is CPU-only)."""
    import gsplat
    from gsplat.cuda._backend import _C

    info = {
        "gsplat": gsplat.__version__,
        "cuda_ops": _C is not None,
        "cuda_module": None if _C is None else type(_C).__name__,
    }
    if _C is None:
        raise RuntimeError(
            f"gsplat {gsplat.__version__} has no CUDA ops (_C is None); "
            "refusing to start Experiment 2"
        )
    return info


def run_arm(*, work: Path, data_dir: Path, poses: Path, arm: dict, recipe: dict) -> dict[str, Any]:
    work.mkdir(parents=True, exist_ok=True)
    train_dir = work / "train"
    train_dir.mkdir(parents=True, exist_ok=True)
    (work / "gsplat-cuda.json").write_text(json.dumps(_assert_gsplat_cuda(), indent=2) + "\n")
    cmd, schedule = build_train_cmd(
        data_dir=data_dir, out_dir=train_dir, refine_stop_iter=int(arm["refine_stop_iter"]),
    )
    (work / "train-cmd.json").write_text(json.dumps(cmd, indent=2) + "\n")
    train = run_ns_train(cmd, train_dir, work / "ns-train.log")
    (work / "gaussian-count.json").write_text(json.dumps(train.get("history") or [], indent=2) + "\n")
    dump_scalars(train_dir, work / "scalar-logs.json")
    hash_gauss_checkpoints(train_dir, work / "checkpoint-hashes.json")
    export: dict[str, Any] = {"ok": False, "error": "skipped because train aborted or failed"}
    qa: dict[str, Any] = {}
    if train.get("abort") is None and train.get("exit_code") == 0:
        export = export_ply_spz(train_dir, work / "export")
        if export.get("ok"):
            qa = render_arm_qa(
                ply=Path(export["ply"]),
                spz=Path(export["spz"]) if export.get("spz") else None,
                poses=poses,
                qa_dir=work / "qa",
                dataset=arm["name"].lower(),
            )
    effective_hash = write_arm_effective(
        dest=work / "effective-config.json",
        arm=arm, recipe=recipe, schedule=schedule, train=train, export=export,
    )
    status = "needs_review"
    if train.get("abort"):
        status = "aborted"
        (work / "abort.json").write_text(json.dumps({"reason": train["abort"], "train": train}, indent=2) + "\n")
    elif train.get("exit_code") != 0 or not export.get("ok"):
        status = "failed"
    result = {
        "arm": arm["name"],
        "refine_stop_iter": arm["refine_stop_iter"],
        "status": status,
        "published": False,
        "human_verdict": "UNREVIEWED",
        "ARM_A_CLIENT_VISUAL_VERDICT": "UNREVIEWED",
        "ARM_B_CLIENT_VISUAL_VERDICT": "UNREVIEWED",
        "effective_config_hash": effective_hash,
        "train": train,
        "export": export,
        "qa": {
            "human_verdict": "UNREVIEWED",
            "artifact_count": qa.get("artifact_count"),
            "elapsed_s": qa.get("elapsed_s"),
        },
        "gpu": gpu_type(),
        "hourly_usd": HOURLY_USD,
        "cost_usd": train.get("cost_usd"),
    }
    (work / "result-manifest.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    return result



def write_arm_effective(*, dest: Path, arm: dict, recipe: dict, schedule: dict, train: dict, export: dict) -> str:
    import torch
    import gsplat
    from importlib.metadata import version as pkg_version
    payload = {
        **recipe,
        "arm_name": arm["name"],
        "refine_stop_iter": arm["refine_stop_iter"],
        "max_steps": MAX_STEPS,
        "max_gaussians_abort": MAX_GAUSSIANS_ABORT,
        "gpu": gpu_type(),
        "gpu_class": "L40S",
        "hourly_usd": HOURLY_USD,
        "torch": torch.__version__,
        "gsplat": gsplat.__version__,
        "nerfstudio": pkg_version("nerfstudio"),
        "schedule": schedule,
        "train": {k: train[k] for k in ("exit_code", "elapsed_s", "step", "gaussians", "abort", "cost_usd") if k in train},
        "export": {k: export.get(k) for k in ("ok", "ply_sha256", "spz_sha256", "converter", "splat_transform_exit")},
        "output_converter": OUTPUT_CONVERTER,
        "changed_variable": "refine_stop_iter",
    }
    write_effective_config(dest, payload)
    return sha256_json(payload)
