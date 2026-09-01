#!/usr/bin/env python3
"""Build measurement / display / nav GLBs from the existing 15 mm TSDF. No reintegrate."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKER = ROOT / "workers" / "modal" / "twin-metric-processor"
sys.path.insert(0, str(WORKER))

import open3d as o3d  # noqa: E402

from mesh_products import build_mesh_products  # noqa: E402


def main() -> int:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "tmp/kitchen-proof/reconstruction_master_15mm.ply"
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "tmp/kitchen-proof/products"
    out.mkdir(parents=True, exist_ok=True)
    print(f"load {src}", flush=True)
    mesh = o3d.io.read_triangle_mesh(str(src))
    if mesh.is_empty():
        raise SystemExit(f"empty mesh: {src}")
    print(f"triangles {len(mesh.triangles)} vertices {len(mesh.vertices)}", flush=True)
    report = build_mesh_products(mesh, out)
    (out / "MESH_PRODUCTS.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
