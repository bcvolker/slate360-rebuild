#!/usr/bin/env python3
"""Superseded. Use scripts/ops/x4-v1-canonical/run.sh.

The original 06_gaussian.py discarded scale/quat/opacity. The canonical
recreation persists checkpoint.pt + a full gsplat PLY, holds out every 8th
pano, and applies EXACT_FRAME_SIM3 to center, orientation, and uniform scale.
"""
from __future__ import annotations

import sys

print(
    "refusing: scripts/ops/recreate-x4-v1-gaussian.py is superseded.\n"
    "Run: wsl -e bash /mnt/c/s360/scripts/ops/x4-v1-canonical/run.sh",
    file=sys.stderr,
)
raise SystemExit(2)
