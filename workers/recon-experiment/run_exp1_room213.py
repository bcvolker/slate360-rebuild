#!/usr/bin/env python3
import sys
from pathlib import Path

ROOT = Path("/mnt/c/s360-recon-exp/workers/recon-experiment")
sys.path.insert(0, str(ROOT))
from harness import build_parser, run_exp1

args = build_parser().parse_args([
    "--ply", "/mnt/c/s360/tmp/splat-lab/cecc2763/export/output.ply",
    "--spz", "/mnt/c/s360/tmp/splat-lab/cecc2763/output.spz",
    "--poses", "/mnt/c/s360-recon-exp/qa/visual-poses.json",
    "--qa-dir", "/mnt/c/s360-recon-exp/qa",
    "--dataset", "room213",
])
summary = run_exp1(args)
print("status", "needs_review")
print("ply_count", summary["artifact_count"]["ply"])
print("spz_count", summary["artifact_count"]["spz"])
print("elapsed_s", summary["elapsed_s"])
print("verdict", summary["human_verdict"])
print("summary", "/mnt/c/s360-recon-exp/qa/visual-summary.json")
