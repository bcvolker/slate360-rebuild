#!/usr/bin/env python3
"""Build a Spark-loadable web derivative of Route B V1 (means+RGB).

V1's trainer never exported scale/quat/opacity — only xyzrgb. This does not
retrain. It assigns per-point scales from local spacing so Spark can load it.
SIM3 is applied in the viewer, not here.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree


def load_xyzrgb(path: Path) -> tuple[np.ndarray, np.ndarray]:
    raw = path.read_bytes()
    end = raw.find(b"end_header\n")
    header = raw[:end].decode("ascii", "replace")
    n = None
    fmt = "ascii"
    for line in header.splitlines():
        if line.startswith("format "):
            fmt = line.split()[1]
        if line.startswith("element vertex"):
            n = int(line.split()[-1])
    if n is None:
        raise SystemExit("no vertex count")
    body = raw[end + len(b"end_header\n") :]
    if fmt.startswith("binary"):
        raise SystemExit("expected ascii V1 ply")
    xyz, rgb = [], []
    for line in body.decode("ascii", "replace").splitlines():
        if not line.strip():
            continue
        p = line.split()
        xyz.append((float(p[0]), float(p[1]), float(p[2])))
        rgb.append((int(p[3]), int(p[4]), int(p[5])))
    return np.asarray(xyz, np.float32), np.asarray(rgb, np.uint8)


def write_gsplat_ply(path: Path, xyz: np.ndarray, rgb: np.ndarray, scales: np.ndarray) -> None:
    n = xyz.shape[0]
    dt = np.dtype(
        [
            ("x", "<f4"),
            ("y", "<f4"),
            ("z", "<f4"),
            ("scale_0", "<f4"),
            ("scale_1", "<f4"),
            ("scale_2", "<f4"),
            ("rot_0", "<f4"),
            ("rot_1", "<f4"),
            ("rot_2", "<f4"),
            ("rot_3", "<f4"),
            ("opacity", "<f4"),
            ("f_dc_0", "<f4"),
            ("f_dc_1", "<f4"),
            ("f_dc_2", "<f4"),
        ]
    )
    arr = np.empty(n, dtype=dt)
    arr["x"], arr["y"], arr["z"] = xyz[:, 0], xyz[:, 1], xyz[:, 2]
    arr["scale_0"] = arr["scale_1"] = arr["scale_2"] = scales
    arr["rot_0"] = 1.0
    arr["rot_1"] = arr["rot_2"] = arr["rot_3"] = 0.0
    arr["opacity"] = 0.45
    # SH0 ≈ (rgb - 0.5) / 0.282094791
    sh = (rgb.astype(np.float32) / 255.0 - 0.5) / 0.282094791
    arr["f_dc_0"], arr["f_dc_1"], arr["f_dc_2"] = sh[:, 0], sh[:, 1], sh[:, 2]
    header = (
        "ply\nformat binary_little_endian 1.0\n"
        f"element vertex {n}\n"
        "property float x\nproperty float y\nproperty float z\n"
        "property float scale_0\nproperty float scale_1\nproperty float scale_2\n"
        "property float rot_0\nproperty float rot_1\nproperty float rot_2\nproperty float rot_3\n"
        "property float opacity\nproperty float f_dc_0\nproperty float f_dc_1\nproperty float f_dc_2\n"
        "end_header\n"
    )
    path.write_bytes(header.encode("ascii") + arr.tobytes())


def main() -> int:
    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    xyz, rgb = load_xyzrgb(src)
    tree = cKDTree(xyz.astype(np.float64))
    d, _ = tree.query(xyz.astype(np.float64), k=6)
    nn = np.median(d[:, 1:4], axis=1)
    scales = np.clip(nn * 0.35, 0.008, 0.025).astype(np.float32)
    write_gsplat_ply(dst, xyz, rgb, scales)
    meta = {
        "n": int(xyz.shape[0]),
        "src": str(src),
        "dst": str(dst),
        "retrained": False,
          "sim3Baked": True,
        "scaleMedianM": float(np.median(scales)),
        "note": "Web derivative of V1 means+RGB. Trained ellipsoid params were never exported.",
    }
    dst.with_suffix(".json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
