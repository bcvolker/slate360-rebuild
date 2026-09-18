"""Experiment 6 preflight: scale-tail evolution across H5's kept checkpoints. Read-only,
no training. Answers whether the extreme-scale tail keeps growing after the last
refinement event (step 10900) during the unprotected 11k-16k recovery window, which
determines how early a future late-prune needs to happen."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from exp3_haze_diagnostic_gpu import ckpt_tensors, load_ckpt_state  # noqa: E402


def main() -> None:
    vol = Path("/vol")
    arm_dir = vol / "experiments" / "room213-exp5" / "ROOM213_H5_SCALE_CONTROL" / "train"
    ckpts = sorted(arm_dir.rglob("step-*.ckpt"))
    out = []
    for ckpt in ckpts:
        step = int(ckpt.stem.split("-")[-1])
        payload = load_ckpt_state(ckpt)
        tensors = ckpt_tensors(payload, "cuda")
        max_scale = np.exp(tensors["scales_log_np"]).max(axis=1)
        out.append({
            "step": step,
            "count": int(max_scale.shape[0]),
            "max_scale": float(max_scale.max()),
            "p99": float(np.percentile(max_scale, 99)),
            "p99.9": float(np.percentile(max_scale, 99.9)),
            "count_above_0.08": int((max_scale > 0.08).sum()),
            "count_above_0.15": int((max_scale > 0.15).sum()),
        })
        del payload, tensors
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
