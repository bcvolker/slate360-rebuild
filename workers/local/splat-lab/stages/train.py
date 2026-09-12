"""Stage 4 — Gaussian splat training (Nerfstudio splatfacto / gsplat).

Streams iteration telemetry so the Live View HUD can update while training.
Arg names match nerfstudio 1.1.5's splatfacto config.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

from result import StageResult
from tools import which_tool

STEP_RE = re.compile(r"(\d+)\s*/\s*(\d+).*?([\d.]+)\s*it/s", re.I)
GAUSS_RE = re.compile(r"(?:num[_\s-]?gaussians|gaussians)\D+(\d[\d,]*)", re.I)


def run(cfg, ctx) -> StageResult:
    if not which_tool("ns-train"):
        return StageResult(
            name="train", status="blocked",
            detail="nerfstudio not installed",
            error="Install nerfstudio to train: pip install nerfstudio gsplat; "
                   "then `ns-train splatfacto` becomes available.")

    data_dir = ctx.get("sfm_data_dir")
    if not data_dir or not Path(data_dir).exists():
        return StageResult(name="train", status="failed",
                           error="no SfM dataset to train on (SfM blocked/failed)")

    out_dir = ctx["job_dir"] / "train"
    out_dir.mkdir(parents=True, exist_ok=True)
    steps = cfg.resolved_steps
    face_px = min(2048, cfg.resolved_image_px // 2) if cfg.is360 else cfg.resolved_image_px
    res_scale = max(0.25, min(1.0, cfg.resolution_limit / max(face_px, 1)))

    cmd = [
        which_tool("ns-train") or "ns-train",
        "splatfacto",
        "--data", str(data_dir),
        "--output-dir", str(out_dir),
        "--max-num-iterations", str(steps),
        "--pipeline.datamanager.camera-res-scale-factor", f"{res_scale:.3f}",
        "--pipeline.model.sh-degree", str(cfg.sh_degree),
        "--vis", "viewer",
        "--viewer.quit-on-train-completion", "True",
        "--viewer.websocket-port", "7007",
    ]
    if cfg.sh_degree and cfg.sh_degree > 0:
        cmd += ["--pipeline.model.sh-degree-interval", str(max(1, cfg.sh_degree * 1000))]
    if cfg.max_splats_millions >= 10:
        cmd += ["--pipeline.model.densify-grad-thresh", "0.00008"]

    try:
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1)
    except Exception as exc:  # noqa: BLE001
        return StageResult(name="train", status="failed", error=str(exc))

    last = {"iteration": 0, "steps": steps, "splats": 0, "it_s": 0.0, "eta_s": 0}
    assert proc.stdout is not None
    for line in proc.stdout:
        parsed = _parse_line(line, steps)
        if parsed:
            last.update(parsed)
            progress = last["iteration"] / max(steps, 1)
            rec = {"stage": "train", "status": "running", "progress": round(progress, 4),
                   "iteration": last["iteration"], "steps": steps,
                   "splats": last["splats"], "it_s": last["it_s"],
                   "eta_s": last["eta_s"], "detail": line.strip()[:200]}
            sys.stdout.write(json.dumps(rec) + "\n")
            sys.stdout.flush()

    code = proc.wait()
    if code != 0:
        return StageResult(name="train", status="failed",
                           error=f"ns-train exited {code}")

    splat_ply = _find_latest(out_dir, ".ply")
    ctx["train_dir"] = str(out_dir)
    detail = f"training done ({steps} steps, ~{last['splats']} splats)"
    if splat_ply:
        ctx["trained_ply"] = str(splat_ply)
        detail += f"; ply={splat_ply.name}"
    return StageResult(name="train", status="done", detail=detail,
                       artifacts=[str(out_dir)])


def _parse_line(line: str, steps: int) -> dict:
    out: dict = {}
    m = STEP_RE.search(line)
    if m:
        it = int(m.group(1))
        total = int(m.group(2))
        rate = float(m.group(3))
        remain = max(0, total - it)
        out.update(iteration=it, steps=total, it_s=rate,
                   eta_s=int(remain / rate) if rate > 0 else 0)
    g = GAUSS_RE.search(line)
    if g:
        out["splats"] = int(g.group(1).replace(",", ""))
    return out


def _find_latest(root: Path, suffix: str) -> Path | None:
    matches = sorted(root.rglob(f"*{suffix}"), key=lambda p: p.stat().st_mtime)
    return matches[-1] if matches else None
