"""Export a classic (not antialiased) Gaussian PLY with full SH/features."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from paths import SPLAT_RUN, ns_export  # noqa: E402


def find_config(exp_dir: Path) -> Path:
    hits = list(exp_dir.glob("**/config.yml"))
    if not hits:
        raise SystemExit(f"no config.yml under {exp_dir}")
    hits.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return hits[0]


def ply_header(path: Path) -> dict:
    raw = path.read_bytes()[:8192]
    header = raw.split(b"end_header")[0].decode("ascii", "replace")
    props = []
    n = None
    for line in header.splitlines():
        if line.startswith("element vertex"):
            n = int(line.split()[-1])
        if line.startswith("property "):
            props.append(line.split()[-1])
    return {"n": n, "properties": props, "header": header}


REQUIRED = {
    "x", "y", "z",
    "scale_0", "scale_1", "scale_2",
    "rot_0", "rot_1", "rot_2", "rot_3",
    "opacity",
    "f_dc_0", "f_dc_1", "f_dc_2",
}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--experiment", required=True, choices=("A", "B"))
    p.add_argument("--run", default=str(SPLAT_RUN))
    args = p.parse_args()
    exp_dir = Path(args.run) / args.experiment
    export_dir = exp_dir / "export"
    export_dir.mkdir(parents=True, exist_ok=True)
    cfg = find_config(exp_dir)
    cmd = [
        str(ns_export()),
        "gaussian-splat",
        "--load-config",
        str(cfg),
        "--output-dir",
        str(export_dir),
        "--output-filename",
        f"splatfacto_{args.experiment}.ply",
        "--ply-color-mode",
        "sh_coeffs",
    ]
    print(" ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)
    ply = export_dir / f"splatfacto_{args.experiment}.ply"
    info = ply_header(ply)
    missing = sorted(REQUIRED - set(info["properties"]))
    rest = [n for n in info["properties"] if n.startswith("f_rest_")]
    if missing:
        raise SystemExit(f"PLY missing {missing}")
    if "SplatRenderMode: mip" in info["header"]:
        raise SystemExit("antialiased PLY is not the production winner")
    meta = {
        "experiment": args.experiment,
        "ply": str(ply),
        "gaussian_count": info["n"],
        "properties": info["properties"],
        "sh_rest_count": len(rest),
        "rasterize_mode": "classic",
        "ply_color_mode": "sh_coeffs",
        "antialiased": False,
        "config": str(cfg),
    }
    (export_dir / "EXPORT.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
