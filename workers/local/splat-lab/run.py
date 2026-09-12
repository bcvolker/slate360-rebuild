"""Splat Lab runner - CLI entrypoint.

Usage:
    python workers/local/splat-lab/run.py \
        --input <video.mp4 | folder> --output <job_dir> --job-id <id> \
        [--is360] [--spherical-mode native|rig] [--fps 4] [--remove-people] \
        [--view-image-size 1280] [--sh-degree 3] [--quality auto] \
        [--from-stage views]

Emits one JSON progress record per line to stdout, then writes manifest.json.
"""
from __future__ import annotations

import argparse
import sys

from config import SplatLabConfig
from pipeline import run


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Slate360 Splat Lab runner")
    p.add_argument("--input", required=True, help="path to a video file or a folder of images")
    p.add_argument("--output", required=True, help="job output directory (parent of the job folder)")
    p.add_argument("--job-id", default=None, help="job id (defaults to a generated id)")
    p.add_argument("--workspace-name", default="", help="human-readable workspace name")
    p.add_argument("--is360", action="store_true", help="input is 360 equirectangular video")
    p.add_argument("--fps", type=float, default=4.0, help="frame extraction rate (default 4 fps)")
    p.add_argument("--remove-people", action="store_true", help="run RTMDet people masking before SfM")
    p.add_argument("--clone", default="proven", choices=["proven", "lab"],
                   help="desktop clone: proven (quality baseline) or lab (experimental)")
    p.add_argument("--use-lidar", action="store_true")
    p.add_argument("--use-rtk", action="store_true")
    p.add_argument("--spherical-mode", default="native", choices=["native", "rig"],
                   help="native = one panorama pose via COLMAP EQUIRECTANGULAR (Proven default); "
                        "rig = 6 cube faces per panorama via a COLMAP rig")
    p.add_argument("--image-size", default="auto", choices=["auto", "4k", "6k", "8k"],
                   help="target source frame size (auto = full source resolution)")
    p.add_argument("--max-duration", type=int, default=0, help="cap seconds per video (0 = full video)")
    p.add_argument("--max-features", type=int, default=16384, help="SIFT features per image")
    p.add_argument("--view-image-size", default="1280", choices=["768", "1024", "1280", "1920", "max"],
                   help="training-view pixel width (default 1280: fits 16 views/pano in RAM)")
    p.add_argument("--sh-degree", type=int, default=3, choices=[0, 1, 2, 3])
    p.add_argument("--max-splats-millions", type=float, default=0.0,
                   help="0 = auto (views * 500, GPU-capped)")
    p.add_argument("--training-steps", type=int, default=0, help="0 = follow quality preset")
    p.add_argument("--images-per-step", type=int, default=2)
    p.add_argument("--preset", default="classic", choices=["classic", "lite", "object", "safe"])
    p.add_argument("--quality", default="auto", choices=["test", "medium", "high", "auto"])
    p.add_argument("--strategy", default="default", choices=["default", "mcmc"])
    p.add_argument("--use-bilateral-grid", action="store_true")
    p.add_argument("--from-stage", default=None,
                   choices=["frames", "mask", "sfm", "views", "train", "export"],
                   help="resume from this stage, reusing earlier stages' outputs on disk")
    args = p.parse_args(argv)

    kwargs = dict(
        input_path=args.input, output_dir=args.output, clone=args.clone,
        workspace_name=args.workspace_name, use_lidar=args.use_lidar, use_rtk=args.use_rtk,
        is360=args.is360, fps=args.fps, remove_people=args.remove_people,
        spherical_mode=args.spherical_mode, image_size=args.image_size,
        max_duration=args.max_duration, max_features=args.max_features,
        view_image_size=args.view_image_size, sh_degree=args.sh_degree,
        max_splats_millions=args.max_splats_millions, training_steps=args.training_steps,
        images_per_step=args.images_per_step, preset=args.preset, quality=args.quality,
        strategy=args.strategy, use_bilateral_grid=args.use_bilateral_grid,
    )
    if args.job_id:
        kwargs["job_id"] = args.job_id
    cfg = SplatLabConfig(**kwargs)
    manifest = run(cfg, from_stage=args.from_stage)
    return 0 if manifest.get("status") in ("completed", "blocked") else 1


if __name__ == "__main__":
    sys.exit(main())
