"""Write mask-audit contact sheets for representative Room 213 panos."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mask_audit import write_contact_sheet

JOB = Path("/mnt/c/s360/tmp/splat-lab/cecc2763")
OUT = Path("/mnt/c/s360-recon-exp/qa/mask-audit")
STEMS = ["000001", "000080", "000189", "000267"]


def main() -> int:
    info = write_contact_sheet(
        images_dir=JOB / "images",
        masks_dir=JOB / "masks",
        out_dir=OUT,
        stems=STEMS,
        views_dir=JOB / "views",
    )
    print(info)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
