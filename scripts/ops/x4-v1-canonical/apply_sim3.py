#!/usr/bin/env python3
"""Apply locked EXACT_FRAME_SIM3 to the V1 canonical Gaussian. Do not recompute."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from sim3_apply import load_exact_frame_sim3, transform_gsplat_ply  # noqa: E402

DEFAULT_SIM3 = Path(
    "/mnt/c/Users/Brian PC/Desktop/Slate360Research/Projects/KitchenAprilTags/"
    "Runs/2026-08-31T17-32-exact-frame-anchor-rescue/EXACT_FRAME_SIM3.json"
)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--raw", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--sim3", default=str(DEFAULT_SIM3))
    args = p.parse_args()
    sim = load_exact_frame_sim3(args.sim3)
    n = transform_gsplat_ply(Path(args.raw), Path(args.out), sim)
    meta = {
        "n": n,
        "sim3_scale": sim["scale"],
        "sim3_gate": sim.get("gate"),
        "recomputed": False,
        "formula": "P_arkit = scale * R @ P_x4 + t; s *= scale; q = q_R * q",
        "src": str(args.raw),
        "dst": str(args.out),
    }
    Path(args.out).with_suffix(".json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
