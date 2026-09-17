"""Stage 5 - Gaussian splat training (Nerfstudio splatfacto).

ns-train is wrapped in an auto-restart loop: a crash reloads the latest
checkpoint on disk and continues. The UI must not require a human Resume
for overnight runs.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import threading
import time
from pathlib import Path

from result import StageResult
from tools import which_tool
from live_status import patch_live

STEP_RE = re.compile(r"^\s*(\d+)\s*\((\d+(?:\.\d+)?)%\)")
_EMIT_INTERVAL_S = 2.0
_GAUSSIAN_TAG = "Train Metrics Dict/gaussian_count"
_MAX_RESTARTS = 20


def run(cfg, ctx) -> StageResult:
    if not which_tool("ns-train"):
        return StageResult(
            name="train", status="blocked",
            detail="nerfstudio not installed",
            error="Install nerfstudio to train: pip install nerfstudio gsplat; "
                   "then `ns-train splatfacto` becomes available.")

    data_dir = ctx.get("views_dir") or ctx.get("sfm_images_dir")
    if not data_dir or not Path(data_dir).exists():
        return StageResult(name="train", status="failed",
                           error="no training dataset available (views/SfM stage blocked or failed)")

    view_count = ctx.get("view_count") or ctx.get("sfm_stats", {}).get("registered", 0)
    if not view_count:
        img_dir = Path(data_dir) / "images"
        if img_dir.is_dir():
            view_count = sum(1 for p in img_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
    steps = cfg.resolved_steps(view_count)
    splat_cap = cfg.resolved_splat_cap(view_count)
    ctx["resolved_steps"] = steps
    ctx["resolved_splat_cap"] = splat_cap
    out_dir = _train_out_dir(ctx["job_dir"])

    last_error = "ns-train failed"
    ckpt0 = _latest_ckpt_dir(out_dir)
    already = (_ckpt_step(ckpt0) if ckpt0 else 0) or 0
    if already >= steps:
        return _train_done(ctx, out_dir, steps, splat_cap, already)

    for attempt in range(_MAX_RESTARTS + 1):
        cmd = _train_cmd(cfg, data_dir, out_dir, steps)
        result = _one_attempt(cmd, ctx, steps, append=attempt > 0)
        if result.status == "done":
            return _train_done(ctx, out_dir, steps, splat_cap)
        last_error = result.error or last_error
        ckpt_dir = _latest_ckpt_dir(out_dir)
        if ckpt_dir is None:
            return result
        step = _ckpt_step(ckpt_dir) or 0
        if step >= steps:
            return _train_done(ctx, out_dir, steps, splat_cap, step)
        rec = {
            "stage": "train", "status": "running",
            "progress": round(step / max(steps, 1), 4),
            "iteration": step, "steps": steps,
            "detail": f"crashed; auto-restart {attempt + 1}/{_MAX_RESTARTS} from step {step}",
        }
        sys.stdout.write(json.dumps(rec) + "\n")
        sys.stdout.flush()
        try:
            patch_live(ctx["job_dir"], rec)
        except Exception:
            pass
        time.sleep(10)
    return StageResult(name="train", status="failed", error=last_error)


def _train_done(ctx, out_dir: Path, steps: int, splat_cap: int, step: int | None = None) -> StageResult:
    ckpt_dir = _latest_ckpt_dir(out_dir)
    used = step if step is not None else ((_ckpt_step(ckpt_dir) if ckpt_dir else 0) or steps)
    ctx["train_dir"] = str(out_dir)
    cfg_yml = _find_latest(out_dir, "config.yml")
    ctx["train_config"] = str(cfg_yml) if cfg_yml else None
    ctx["final_splat_count"] = 0
    ctx["training_steps_used"] = used
    return StageResult(
        name="train", status="done",
        detail=f"training done ({used} steps, planned {steps}, cap {splat_cap})",
        artifacts=[str(out_dir)])


def _train_out_dir(job_dir: Path) -> Path:
    """Keep multi-GB checkpoint zips off the Windows 9p mount.

    Two bugchecks tonight landed at step ~3750, the first --steps-per-save
    write into /mnt/c. Linux ext4 in $HOME survives those saves.
    """
    if str(job_dir).replace("\\", "/").startswith("/mnt/"):
        linux = Path.home() / "splat-ckpts" / job_dir.name
        linux.mkdir(parents=True, exist_ok=True)
        (job_dir / "train-out").write_text(str(linux), encoding="utf-8")
        return linux
    out = job_dir / "train"
    out.mkdir(parents=True, exist_ok=True)
    (job_dir / "train-out").write_text(str(out), encoding="utf-8")
    return out


def _train_cmd(cfg, data_dir, out_dir: Path, steps: int) -> list[str]:
    load_dir = _latest_ckpt_dir(out_dir)
    already = (_ckpt_step(load_dir) if load_dir is not None else 0) or 0
    # ns-train --load-dir treats --max-num-iterations as ADDITIONAL steps
    # (8fb02e4e: load 24750 + 50k → 74750). Pass remainder so a crash
    # restart still ends at the planned total.
    run_iters = steps if already <= 0 else max(1, steps - already)
    # VRAM guard. splatfacto's DefaultStrategy has no absolute cap (only MCMC does), so once the
    # densify-pause clamp let it actually split, growth is unbounded. First such train (Payne 213,
    # 2026-09-17): 209,587 -> 7,286,268 gaussians in 3,950 steps, still climbing ~250k per 100
    # steps at 11.9 GB of a 24 GB card. Left alone it OOMs, and every checkpoint restart OOMs at
    # the same place. SPLAT_LAB_STOP_SPLIT_AT pins the absolute step where splitting stops; unset
    # keeps the old 85%-of-steps behaviour for every other job.
    try:
        ceiling = int(os.environ.get("SPLAT_LAB_STOP_SPLIT_AT", "") or 0)
    except ValueError:
        ceiling = 0
    split_until = ceiling if ceiling > 0 else round(steps * 0.85)
    stop_at = max(1, split_until - already)
    stop_at = min(max(1, stop_at), run_iters)
    wrap = Path(__file__).resolve().parent.parent / "ns_train_wrap.py"
    cmd = [
        sys.executable, str(wrap), "splatfacto",
        "--data", str(data_dir),
        "--output-dir", str(out_dir),
        "--max-num-iterations", str(run_iters),
        "--pipeline.model.sh-degree", str(cfg.sh_degree),
        "--pipeline.model.sh-degree-interval", str(max(1, steps // 30)),
        "--pipeline.model.cull-alpha-thresh", "0.001",
        "--pipeline.model.cull-scale-thresh", "0.15",
        "--pipeline.model.densify-grad-thresh", "0.0002",
        "--pipeline.model.stop-split-at", str(stop_at),
        "--pipeline.model.use-bilateral-grid", "True" if cfg.use_bilateral_grid else "False",
        "--pipeline.model.use-scale-regularization", "True",
        "--pipeline.datamanager.cache-images", "cpu",
        "--pipeline.datamanager.cache-images-type", "uint8",
        "--pipeline.datamanager.masks-on-gpu", "False",
        "--logging.local-writer.enable", "True",
        "--logging.steps-per-log", "50",
        "--steps-per-save", "750",
        # Eval at 25k re-cached every training image and looked like a stall
        # (watchdog then restarted). Push past the 50k step ceiling.
        "--steps-per-eval-batch", "100000",
        "--steps-per-eval-image", "100000",
        "--steps-per-eval-all-images", "100000",
        "--vis", "tensorboard",
    ]
    if load_dir is not None:
        cmd.extend(["--load-dir", str(load_dir)])
        if already:
            cmd.extend(["--load-step", str(already)])
    return cmd


def _one_attempt(cmd: list[str], ctx, steps: int, append: bool) -> StageResult:
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, bufsize=1)
    except Exception as exc:  # noqa: BLE001
        return StageResult(name="train", status="failed", error=str(exc))

    t0 = time.time()
    last_emit = 0.0
    prev = {"step": 0, "t": t0}
    last_detail = ""
    hb = {"step": 0, "it_s": 0.0, "splats": 0, "detail": "starting"}
    stop_hb = threading.Event()
    log_path = ctx["job_dir"] / "ns-train.log"
    logf = log_path.open("a" if append else "w", encoding="utf-8")

    def _emit(step: int, it_s: float, detail: str) -> None:
        eta_s = int((steps - step) / it_s) if it_s > 0 else 0
        rec = {"stage": "train", "status": "running", "progress": round(step / max(steps, 1), 4),
               "iteration": step, "steps": steps, "splats": hb["splats"],
               "it_s": round(it_s, 2), "eta_s": eta_s, "detail": detail}
        sys.stdout.write(json.dumps(rec) + "\n")
        sys.stdout.flush()
        try:
            patch_live(ctx["job_dir"], rec)
        except Exception:
            pass

    def _heartbeat() -> None:
        while True:
            try:
                (ctx["job_dir"] / "train-heartbeat").write_text(str(time.time()), encoding="utf-8")
            except OSError:
                pass
            if stop_hb.wait(10) or proc.poll() is not None:
                return
            _emit(int(hb["step"]), float(hb["it_s"]), str(hb["detail"]) or "saving checkpoint")

    threading.Thread(target=_heartbeat, daemon=True).start()
    assert proc.stdout is not None
    try:
        for line in proc.stdout:
            logf.write(line)
            logf.flush()
            last_detail = line.strip()[:200] or last_detail
            hb["detail"] = last_detail
            m = STEP_RE.match(line)
            if not m:
                continue
            step = int(m.group(1))
            if step < hb["step"]:
                continue
            now = time.time()
            dt = now - prev["t"]
            d_step = step - prev["step"]
            it_s = (d_step / dt) if dt > 0.05 and d_step > 0 else 0.0
            prev = {"step": step, "t": now}
            hb["step"] = step
            hb["it_s"] = it_s
            if now - last_emit >= _EMIT_INTERVAL_S or step >= steps:
                _emit(step, it_s, last_detail)
                last_emit = now
    finally:
        stop_hb.set()
        logf.close()

    code = proc.wait()
    if code != 0:
        return StageResult(name="train", status="failed",
                           error=f"ns-train exited {code}: {_log_tail(log_path) or last_detail}")
    return StageResult(name="train", status="done", detail="ok")


def _read_gaussian_count(out_dir: Path) -> int:
    try:
        from tensorboard.backend.event_processing.event_accumulator import EventAccumulator
    except ImportError:
        return 0
    event_file = _find_latest(out_dir, "events.out.tfevents*")
    if not event_file:
        return 0
    try:
        acc = EventAccumulator(str(event_file.parent), size_guidance={"scalars": 1})
        acc.Reload()
        if _GAUSSIAN_TAG not in acc.Tags().get("scalars", []):
            return 0
        events = acc.Scalars(_GAUSSIAN_TAG)
        return int(events[-1].value) if events else 0
    except Exception:
        return 0


def _log_tail(path: Path, limit: int = 1200) -> str:
    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""
    text = raw.replace("\u001b", "")[-limit:].strip()
    return " ".join(text.split())


def _latest_ckpt_dir(out_dir: Path) -> Path | None:
    ckpt = _find_latest(out_dir, "step-*.ckpt")
    return None if ckpt is None else ckpt.parent


def _ckpt_step(models_dir: Path) -> int | None:
    ckpt = _find_latest(models_dir, "step-*.ckpt")
    if ckpt is None:
        return None
    try:
        return int(ckpt.stem.split("-")[-1])
    except ValueError:
        return None


def _find_latest(root: Path, pattern: str) -> Path | None:
    matches = sorted(root.rglob(pattern), key=lambda p: p.stat().st_mtime)
    return matches[-1] if matches else None
