"""Splat Lab runner — CLI entrypoint.

Usage:
    python workers/local/splat-lab/run.py \
        --input <video.mp4 | folder> \
        --output <job_dir> \
        [--is360] [--fps 2] [--remove-people] \
        [--resolution-limit 1920] [--sh-degree 2] \
        [--max-splats-millions 3] [--training-steps 30000] \
        [--images-per-step 0] [--preset classic]

Emits one JSON progress record per line to stdout, then writes manifest.json.
"""
from __future__ import annotations

import argparse
import sys

from config import SplatLabConfig
from pipeline import run


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Slate360 Splat Lab runner")
    p.add_argument("--input", required=True,
                   help="path to a video file or a folder of images")
    p.add_argument("--output", required=True,
                   help="job output directory (parent of the job folder)")
    p.add_argument("--job-id", default=None,
                   help="job id (defaults to a generated id)")
    p.add_argument("--is360", action="store_true",
                   help="input is 360 equirectangular video")
    p.add_argument("--fps", type=float, default=4.0,
                   help="frame extraction rate (default 4 fps)")
    p.add_argument("--remove-people", action="store_true",
                   help="run RTMDet people masking before SfM")
    p.add_argument("--clone", default="proven", choices=["proven", "lab"],
                   help="desktop clone: proven (quality baseline) or lab (experimental)")
    p.add_argument("--use-lidar", action="store_true",
                   help="Clone 2: ingest phone LiDAR if present beside the input")
    p.add_argument("--use-rtk", action="store_true",
                   help="Clone 2: use GPS/EXIF RTK priors when present")
    p.add_argument("--sfm-mode", default="hq", choices=["faster", "hq"],
                   help="faster = exhaustive at source res; hq = refine + denser")
    p.add_argument("--image-size", default="auto", choices=["auto", "4k", "6k", "8k"],
                   help="target frame size (auto = 7680 wide)")
    p.add_argument("--max-duration", type=int, default=0,
                   help="cap seconds per video (0 = full video)")
    p.add_argument("--precompute-360-faces", action="store_true", default=True,
                   help="split 360 equirect into 6 cube faces before SfM")
    p.add_argument("--no-precompute-360-faces", dest="precompute_360_faces",
                   action="store_false")
    p.add_argument("--resolution-limit", type=int, default=1920,
                   help="image resolution limit in px (default 1920)")
    p.add_argument("--sh-degree", type=int, default=3, choices=[0, 1, 2, 3])
    p.add_argument("--max-splats-millions", type=float, default=20.0)
    p.add_argument("--training-steps", type=int, default=0,
                   help="0 = follow quality preset; >0 overrides")
    p.add_argument("--images-per-step", type=int, default=0,
                   help="0 = auto: clamp(ceil(cameras/5000),1,64)")
    p.add_argument("--preset", default="classic",
                   choices=["classic", "lite", "object", "safe"])
    p.add_argument("--quality", default="auto", choices=["test", "medium", "high", "auto"],
                   help="quality preset (sets step target: test=5k, medium=30k, high=100k, auto=300k)")
    args = p.parse_args(argv)

    kwargs = dict(
        input_path=args.input,
        output_dir=args.output,
        clone=args.clone,
        use_lidar=args.use_lidar,
        use_rtk=args.use_rtk,
        is360=args.is360,
        fps=args.fps,
        remove_people=args.remove_people,
        sfm_mode=args.sfm_mode,
        image_size=args.image_size,
        max_duration=args.max_duration,
        precompute_360_faces=args.precompute_360_faces,
        resolution_limit=args.resolution_limit,
        sh_degree=args.sh_degree,
        max_splats_millions=args.max_splats_millions,
        training_steps=args.training_steps,
        images_per_step=args.images_per_step,
        preset=args.preset,
        quality=args.quality,
    )
    if args.job_id:
        kwargs["job_id"] = args.job_id
    cfg = SplatLabConfig(**kwargs)
    manifest = run(cfg)
    return 0 if manifest.get("status") in ("completed", "blocked") else 1


if __name__ == "__main__":
    sys.exit(main())
