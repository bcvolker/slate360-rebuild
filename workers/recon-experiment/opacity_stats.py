"""Opacity statistics straight from checkpoint tensors (sigmoid of the stored logits).

Never derived from exported PLY opacity fields: ns-export drops Gaussians below 1/255 opacity
before writing the PLY, so PLY-based fractions understate the low-opacity population.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable

THRESHOLDS = (0.001, 0.005, 0.01, 0.05, 0.1)
STEP_RE = re.compile(r"step-(\d+)\.ckpt$")


def ckpt_step(path: Path) -> int | None:
    m = STEP_RE.search(Path(path).name)
    return int(m.group(1)) if m else None


def opacity_stats_for_ckpt(ckpt: Path, thresholds: Iterable[float] = THRESHOLDS) -> dict[str, Any]:
    import torch

    payload = torch.load(ckpt, map_location="cpu", weights_only=False)
    pipe = payload.get("pipeline") or {}
    key = next((k for k in pipe if str(k).endswith("gauss_params.opacities")), None)
    if key is None:
        raise KeyError(f"no gauss_params.opacities in {ckpt}")
    logits = pipe[key].detach().float().flatten()
    opac = torch.sigmoid(logits)
    finite = torch.isfinite(logits)
    n = int(opac.numel())
    q = torch.quantile(opac[finite], torch.tensor([0.05, 0.25, 0.5, 0.75, 0.95])).tolist()
    stats = {
        "ckpt": ckpt.name,
        "step": payload.get("step", ckpt_step(ckpt)),
        "count": n,
        "nonfinite_logits": int((~finite).sum()),
        "source": "sigmoid(checkpoint gauss_params.opacities logits)",
        "fraction_below": {str(t): float((opac < t).float().mean()) for t in thresholds},
        "fraction_above_0.5": float((opac > 0.5).float().mean()),
        "quantiles_05_25_50_75_95": [round(v, 6) for v in q],
    }
    del payload
    return stats


def opacity_stats_for_dir(train_dir: Path, dest: Path, thresholds: Iterable[float] = THRESHOLDS) -> list[dict[str, Any]]:
    rows = []
    for ckpt in sorted(Path(train_dir).rglob("step-*.ckpt"), key=lambda p: ckpt_step(p) or -1):
        rows.append(opacity_stats_for_ckpt(ckpt, thresholds))
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
    return rows


if __name__ == "__main__":
    root = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "opacity-stats.json"
    print(json.dumps(opacity_stats_for_dir(root, out), indent=2))
