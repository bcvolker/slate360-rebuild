"""Experiment 4 results: scale statistics, footprint, and QA renders for D4 and E4's actual
step-15999 checkpoints. Read-only. Writes only to the caller-provided work directory."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from exp3_haze_diagnostic_gpu import (  # noqa: E402
    ckpt_tensors, footprint_report, load_ckpt_state, render_qa_4, to_png,
)
from poses import load_poses  # noqa: E402

ARM_NAMES = {"d4": "ROOM213_D4_CONTROL", "e4": "ROOM213_E4_SCALE_CONTROL"}
STEP = 15999
DEVICE = "cuda"
THRESHOLDS = (0.08, 0.10, 0.15)


def _find_ckpt(train_dir: Path, step: int) -> Path:
    hits = sorted(Path(train_dir).rglob(f"step-{step:09d}.ckpt"))
    if not hits:
        raise FileNotFoundError(f"step-{step} checkpoint not found under {train_dir}")
    return hits[0]


def scale_stats(tensors: dict[str, Any]) -> dict[str, Any]:
    max_scale = np.exp(tensors["scales_log_np"]).max(axis=1)
    n = max_scale.shape[0]
    out = {
        "count_total": int(n),
        "max_scale_value": float(max_scale.max()),
        "p99": float(np.percentile(max_scale, 99)),
        "p99.5": float(np.percentile(max_scale, 99.5)),
        "p99.9": float(np.percentile(max_scale, 99.9)),
        "p99.99": float(np.percentile(max_scale, 99.99)),
    }
    for t in THRESHOLDS:
        out[f"count_above_{t}"] = int((max_scale > t).sum())
        out[f"fraction_above_{t}"] = float((max_scale > t).mean())
    return out, max_scale


def scale_histogram_png(max_scale_d4: np.ndarray, max_scale_e4: np.ndarray, dest: Path) -> str:
    from PIL import Image, ImageDraw
    from hashes import sha256_file

    w, h = 900, 500
    img = Image.new("RGB", (w, h), (18, 18, 22))
    draw = ImageDraw.Draw(img)
    lo, hi = 0.0, 0.20  # covers the pathological tail region; log10 bins below
    bins = 80
    edges = np.linspace(np.log10(1e-4), np.log10(0.5), bins + 1)

    def hist(a):
        la = np.log10(np.clip(a, 1e-4, None))
        counts, _ = np.histogram(la, bins=edges)
        return counts

    hd4 = hist(max_scale_d4)
    he4 = hist(max_scale_e4)
    ymax = max(hd4.max(), he4.max(), 1)
    plot_w, plot_h = w - 80, h - 80
    x0, y0 = 60, h - 40

    def bar(counts, color, alpha_offset):
        for i, c in enumerate(counts):
            bx0 = x0 + int(i / bins * plot_w)
            bx1 = x0 + int((i + 1) / bins * plot_w) - 1
            bh = int((c / ymax) * plot_h)
            draw.rectangle([bx0 + alpha_offset, y0 - bh, bx1 + alpha_offset, y0], fill=color)

    bar(hd4, (90, 160, 240), 0)
    bar(he4, (230, 90, 90), 0)
    for thr in (0.08, 0.10, 0.15):
        lt = np.log10(thr)
        frac = (lt - edges[0]) / (edges[-1] - edges[0])
        x = x0 + int(frac * plot_w)
        draw.line([x, y0 - plot_h, x, y0], fill=(255, 255, 0), width=1)
        draw.text((x + 2, y0 - plot_h), f"{thr}", fill=(255, 255, 0))
    draw.text((10, 10), "D4-Control (blue)  vs  E4-Scale-Control (red) -- log10(max scale), yellow lines = 0.08/0.10/0.15", fill=(220, 220, 220))
    draw.text((10, 28), f"D4 max={max_scale_d4.max():.4f}  E4 max={max_scale_e4.max():.4f}  (y = gaussian count, per-arm log-scale bin)", fill=(180, 180, 180))
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest)
    return sha256_file(dest)


def run(*, vol: Path, work: Path) -> dict[str, Any]:
    work.mkdir(parents=True, exist_ok=True)
    poses_doc = load_poses(Path("/root/recon-experiment/visual-poses.json"))
    qa_poses = poses_doc["poses"]

    result: dict[str, Any] = {"experiment_id": "room213-exp4-results", "step": STEP, "arms": {}}
    tensors_by_arm = {}
    max_scale_by_arm = {}

    for key, arm_name in ARM_NAMES.items():
        arm_dir = vol / "experiments" / "room213-exp4" / arm_name
        ckpt = _find_ckpt(arm_dir / "train", STEP)
        payload = load_ckpt_state(ckpt)
        tensors = ckpt_tensors(payload, DEVICE)
        tensors_by_arm[key] = tensors
        stats, max_scale = scale_stats(tensors)
        max_scale_by_arm[key] = max_scale

        fp_dir = work / key / "footprint"
        footprint = footprint_report(tensors, qa_poses, fp_dir)

        qa_dir = work / key / "qa" / f"step-{STEP}"
        render_hashes = render_qa_4(tensors, qa_poses, DEVICE, qa_dir)

        result["arms"][key] = {
            "arm_name": arm_name,
            "checkpoint": str(ckpt),
            "gaussian_count": tensors["count"],
            "scale_stats": stats,
            "projected_footprint": footprint,
            "render_hashes": render_hashes,
        }

    hist_hash = scale_histogram_png(max_scale_by_arm["d4"], max_scale_by_arm["e4"], work / "scale_histogram_d4_vs_e4.png")
    result["scale_histogram_png_sha256"] = hist_hash

    (work / "exp4-results.json").write_text(json.dumps(result, indent=2, default=str) + "\n", encoding="utf-8")
    return result
