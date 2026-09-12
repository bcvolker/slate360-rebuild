"""Stage 5 — Export .ply and convert to .spz (PlayCanvas splat-transform).

STUB for Slice 1. When nerfstudio + npx are available, this stage will run
`ns-export gaussian-splat` to produce a .ply, then
`npx @playcanvas/splat-transform` to produce a .spz for the web viewer.
"""
from __future__ import annotations

import shutil

from result import StageResult
from tools import which_tool


def run(cfg, ctx) -> StageResult:
    if not which_tool("ns-export"):
        return StageResult(
            name="export", status="blocked",
            detail="nerfstudio not installed",
            error="Install nerfstudio to export: pip install nerfstudio; "
                   "then `ns-export gaussian-splat` becomes available.")

    if not shutil.which("npx"):
        return StageResult(
            name="export", status="blocked",
            detail="npx not installed",
            error="Install Node.js (includes npx) to run @playcanvas/splat-transform.")

    return StageResult(
        name="export", status="blocked",
        detail="nerfstudio + npx present but export not implemented in Slice 1",
        error="Slice 2 will run ns-export gaussian-splat -> .ply, then "
               "npx @playcanvas/splat-transform -> .spz")
