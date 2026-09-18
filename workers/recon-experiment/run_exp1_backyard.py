from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path("/mnt/c/s360-recon-exp/workers/recon-experiment")
sys.path.insert(0, str(ROOT))
from poses import derive_room213_poses, write_poses
from harness import build_parser, run_exp1

JOB = Path("/mnt/c/s360/tmp/splat-lab/8fb02e4e")
PARSER = JOB / "train/views/splatfacto/2026-09-16_000613/dataparser_transforms.json"
QA = Path("/mnt/c/s360-recon-exp/qa")
POSE = QA / "visual-poses.backyard.json"


def main() -> int:
    payload = derive_room213_poses(
        JOB / "views" / "transforms.json",
        PARSER,
        dataset_id="backyard-8fb02e4e",
    )
    write_poses(POSE, payload)
    args = build_parser().parse_args([
        "--ply", str(JOB / "export" / "output.ply"),
        "--spz", str(JOB / "output.spz"),
        "--poses", str(POSE),
        "--qa-dir", str(QA / "backyard"),
        "--dataset", "backyard",
    ])
    summary = run_exp1(args)
    print("backyard elapsed", summary["elapsed_s"], "counts", summary["artifact_count"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
