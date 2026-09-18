"""Held-out evaluation and PLY export at an exact checkpoint step (no training).

Both arms are evaluated with ``ns-eval`` on the identical eval split that nerfstudio held out
during training (train_split_fraction 0.9 -> 601 images). ``ns-eval`` reports mean PSNR / SSIM /
LPIPS over all eval images (splatfacto ``get_image_metrics_and_images``), with std when
``get_std`` is on, which is what nerfstudio 1.1.5's eval script requests.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any


def _config_at_step(config_yml: Path, load_step: int, tag: str) -> Path:
    """Copy config.yml with ``load_step`` pinned so ns-eval / ns-export load exactly that ckpt."""
    text = config_yml.read_text(encoding="utf-8")
    patched, n = re.subn(r"^load_step:\s*.*$", f"load_step: {load_step}", text, count=1, flags=re.M)
    if n == 0:
        patched = text.rstrip("\n") + f"\nload_step: {load_step}\n"
    dest = config_yml.with_name(f"config.{tag}.{load_step}.yml")
    dest.write_text(patched, encoding="utf-8")
    return dest


def find_config(train_dir: Path) -> Path | None:
    ckpts = sorted(Path(train_dir).rglob("step-*.ckpt"))
    if ckpts:
        run_dir = ckpts[-1].parent.parent
        cfg = run_dir / "config.yml"
        if cfg.is_file():
            return cfg
    return next(Path(train_dir).rglob("config.yml"), None)


def run_ns_eval(train_dir: Path, load_step: int, dest_json: Path, timeout_s: int = 3600) -> dict[str, Any]:
    cfg = find_config(train_dir)
    if cfg is None:
        return {"ok": False, "error": "no config.yml", "step": load_step}
    ckpt = cfg.parent / "nerfstudio_models" / f"step-{load_step:09d}.ckpt"
    if not ckpt.is_file():
        return {"ok": False, "error": f"checkpoint missing: {ckpt.name}", "step": load_step}
    pinned = _config_at_step(cfg, load_step, "eval")
    exe = shutil.which("ns-eval") or "ns-eval"
    cmd = [exe, "--load-config", str(pinned), "--output-path", str(dest_json)]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_s)
    out: dict[str, Any] = {"ok": proc.returncode == 0 and dest_json.is_file(), "step": load_step,
                           "cmd": cmd, "exit_code": proc.returncode}
    if not out["ok"]:
        out["error"] = (proc.stderr or proc.stdout or "")[-1200:]
        return out
    doc = json.loads(dest_json.read_text(encoding="utf-8"))
    results = doc.get("results") or {}
    out["metrics"] = {k: results.get(k) for k in ("psnr", "psnr_std", "ssim", "ssim_std", "lpips", "lpips_std",
                                                     "num_rays_per_sec", "fps") if k in results}
    out["checkpoint"] = doc.get("checkpoint")
    out["eval_set"] = "nerfstudio held-out split (train_split_fraction 0.9)"
    return out


def export_ply_at(train_dir: Path, load_step: int, dest_dir: Path, timeout_s: int = 3600) -> dict[str, Any]:
    cfg = find_config(train_dir)
    if cfg is None:
        return {"ok": False, "error": "no config.yml", "step": load_step}
    pinned = _config_at_step(cfg, load_step, "export")
    dest_dir.mkdir(parents=True, exist_ok=True)
    ply = dest_dir / f"step-{load_step}.ply"
    exe = shutil.which("ns-export") or "ns-export"
    cmd = [exe, "gaussian-splat", "--load-config", str(pinned), "--output-dir", str(dest_dir),
           "--output-filename", ply.name]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_s)
    if proc.returncode != 0 or not ply.is_file():
        return {"ok": False, "error": (proc.stderr or proc.stdout or "")[-1200:], "step": load_step, "cmd": cmd}
    from hashes import sha256_file

    return {"ok": True, "step": load_step, "ply": str(ply), "ply_sha256": sha256_file(ply), "cmd": cmd,
            "export_log_tail": (proc.stdout or "")[-600:]}
