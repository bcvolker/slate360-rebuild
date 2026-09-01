#!/usr/bin/env python3
"""Local RTX 3090 / research entry for Twin Metric Processor V1.

Example (HouseWalk Route C sources, geometry + optional Gaussian):

  python workers/modal/twin-metric-processor/cli.py ^
    --depth "C:\\Users\\Brian PC\\Desktop\\Slate360Research\\Projects\\KitchenAprilTags\\Runs\\2026-08-31T16-45-route-c-iphone-metric\\source_iphone\\1788212997322_lidar_depth.s360depth" ^
    --poses "C:\\Users\\Brian PC\\Desktop\\Slate360Research\\Projects\\KitchenAprilTags\\Runs\\2026-08-31T16-45-route-c-iphone-metric\\source_iphone\\1788212997322_lidar_poses.json" ^
    --out .\\tmp\\metric-housewalk ^
    --gaussian --steps 25000
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from constants import DEFAULT_VOXEL_MM, GAUSSIAN_STEPS  # noqa: E402
from pipeline import run_metric_processor  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Twin Metric Processor V1 (local)")
    p.add_argument("--depth", required=True, help="path to .s360depth")
    p.add_argument("--poses", required=True, help="path to lidar_poses.json")
    p.add_argument("--out", required=True, help="output directory")
    p.add_argument("--preview-ply", default=None, help="ignored as master; recorded in ingest only")
    p.add_argument("--voxel-mm", type=int, default=DEFAULT_VOXEL_MM, choices=(10, 15, 20))
    p.add_argument("--gaussian", action="store_true", help="run frozen-camera gsplat (needs CUDA)")
    p.add_argument("--steps", type=int, default=GAUSSIAN_STEPS)
    p.add_argument("--depth-loss", action="store_true", help="experimental RGB+ED; not the baseline")
    p.add_argument("--engineering-range", action="store_true", help="0.25–8 m instead of 0.25–5 m")
    args = p.parse_args()
    result = run_metric_processor(
        args.depth,
        args.poses,
        args.out,
        preview_ply=args.preview_ply,
        voxel_mm=args.voxel_mm,
        skip_gaussian=not args.gaussian,
        depth_loss=args.depth_loss,
        gaussian_steps=args.steps,
        engineering_range=args.engineering_range,
    )
    print(json.dumps({k: result[k] for k in ("ok", "products", "timingsSec", "regression")}, indent=2))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
