"""Write frozen Room 213 visual poses. CPU only."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from poses import derive_room213_poses, write_poses

JOB = Path("/mnt/c/s360/tmp/splat-lab/cecc2763")
PARSER = Path(
    "/home/rian_/splat-ckpts/cecc2763/views/splatfacto/2026-09-17_001408/dataparser_transforms.json"
)
OUT = Path("/mnt/c/s360-recon-exp/qa/visual-poses.json")
FROZEN = Path("/mnt/c/s360-recon-exp/qa/frozen")


def main() -> int:
    FROZEN.mkdir(parents=True, exist_ok=True)
    dest = FROZEN / "cecc2763-dataparser_transforms.json"
    dest.write_bytes(PARSER.read_bytes())
    payload = derive_room213_poses(
        JOB / "views" / "transforms.json",
        dest,
        dataset_id="room213-cecc2763",
    )
    write_poses(OUT, payload)
    print("wrote", OUT)
    print("pose_set_hash", payload["pose_set_hash"])
    print("on_path", payload["poses"][0]["source_view"])
    print("diag", payload["camera_box_diag"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
