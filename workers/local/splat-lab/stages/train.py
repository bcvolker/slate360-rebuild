"""Stage 5 - Gaussian splat training (Nerfstudio splatfacto).

Telemetry (fixed 2026-09-12): the old regexes (`N / M ... it/s`) never
matched nerfstudio 1.1.5's actual console output, so the Live View HUD's
Iteration/Splats/it-s/ETA stayed at dashes forever. The real console table
(nerfstudio/utils/writer.py LocalWriter._print_stats, read directly from the
installed venv) prints:

    Step (% Done)       Train Iter (time)    ETA (time)           ...
    ------------------------------------------------------------------
    1000 (0.31%)         0.0421 s, 234 ms     1 h, 2 m, 30 s

STEP_RE below matches the first column reliably regardless of which other
stats are tracked. it/s and ETA are computed ourselves from the (step,
wall-clock) series instead of re-parsing nerfstudio's variable-width time
column - more robust than guessing which position the ETA cell lands in.

Gaussian count is never printed to the console (it's in `metrics_dict`,
which nerfstudio only logs to TensorBoard/wandb, not the local writer -
confirmed by reading models/splatfacto.py and engine/trainer.py). We poll
the run's tfevents file on a timer for the `Train Metrics Dict/gaussian_count`
scalar instead of trying to scrape it from stdout.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from pathlib import Path

from result import StageResult
from tools import which_tool

STEP_RE = re.compile(r"^\s*(\d+)\s*\((\d+(?:\.\d+)?)%\)")
_EMIT_INTERVAL_S = 2.0
_TB_POLL_INTERVAL_S = 10.0
_GAUSSIAN_TAG = "Train Metrics Dict/gaussian_count"


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
    steps = cfg.resolved_steps(view_count)
    splat_cap = cfg.resolved_splat_cap(view_count)
    ctx["resolved_steps"] = steps
    ctx["resolved_splat_cap"] = splat_cap

    out_dir = ctx["job_dir"] / "train"
    out_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        which_tool("ns-train") or "ns-train", "splatfacto",
        "--data", str(data_dir),
        "--output-dir", str(out_dir),
        "--max-num-iterations", str(steps),
        "--pipeline.model.sh-degree", str(cfg.sh_degree),
        "--pipeline.model.sh-degree-interval", str(max(1, steps // 30)),
        "--pipeline.model.cull-alpha-thresh", "0.005",
        "--pipeline.model.stop-split-at", str(max(1, round(steps * 0.6))),
        "--pipeline.model.use-bilateral-grid", "True" if cfg.use_bilateral_grid else "False",
        "--pipeline.datamanager.cache-images", "cpu",
        "--pipeline.datamanager.masks-on-gpu", "True",
        "--logging.local-writer.enable", "True",
        "--logging.steps-per-log", "50",
        "--vis", "viewer+tensorboard",
        "--viewer.quit-on-train-completion", "True",
        "--viewer.websocket-port", "7007",
    ]

    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, bufsize=1)
    except Exception as exc:  # noqa: BLE001
        return StageResult(name="train", status="failed", error=str(exc))

    t0 = time.time()
    last_emit = 0.0
    last_tb_poll = 0.0
    prev = {"step": 0, "t": t0}
    splats = 0
    last_detail = ""
    assert proc.stdout is not None
    for line in proc.stdout:
        last_detail = line.strip()[:200] or last_detail
        m = STEP_RE.match(line)
        if not m:
            continue
        step = int(m.group(1))
        now = time.time()
        dt = now - prev["t"]
        d_step = step - prev["step"]
        it_s = (d_step / dt) if dt > 0.05 and d_step > 0 else 0.0
        prev = {"step": step, "t": now}

        if now - last_tb_poll > _TB_POLL_INTERVAL_S:
            splats = _read_gaussian_count(out_dir) or splats
            last_tb_poll = now

        if now - last_emit >= _EMIT_INTERVAL_S or step >= steps:
            eta_s = int((steps - step) / it_s) if it_s > 0 else 0
            rec = {"stage": "train", "status": "running", "progress": round(step / max(steps, 1), 4),
                   "iteration": step, "steps": steps, "splats": splats,
                   "it_s": round(it_s, 2), "eta_s": eta_s, "detail": last_detail}
            sys.stdout.write(json.dumps(rec) + "\n")
            sys.stdout.flush()
            last_emit = now

    code = proc.wait()
    if code != 0:
        return StageResult(name="train", status="failed",
                           error=f"ns-train exited {code}: {last_detail}")

    splats = _read_gaussian_count(out_dir) or splats
    config_yml = _find_latest(out_dir, "config.yml")
    ctx["train_dir"] = str(out_dir)
    ctx["train_config"] = str(config_yml) if config_yml else None
    ctx["final_splat_count"] = splats
    ctx["training_steps_used"] = steps
    detail = f"training done ({steps} steps, ~{splats} splats, cap {splat_cap})"
    return StageResult(name="train", status="done", detail=detail, artifacts=[str(out_dir)])


def _read_gaussian_count(out_dir: Path) -> int:
    """Best-effort read of the latest gaussian_count scalar from TensorBoard's
    event file. Failures are silent - telemetry is a nice-to-have, not a
    reason to fail training."""
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


def _find_latest(root: Path, pattern: str) -> Path | None:
    matches = sorted(root.rglob(pattern), key=lambda p: p.stat().st_mtime)
    return matches[-1] if matches else None
