"""Tiny ERP sequence in the ODGS-SLAM PanoramaParser layout.

The authors' public zip is 193 GB. This writes eight 512×256 panoramas so we
can prove their slam.py boots on A10G without downloading that archive.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


def write_smoke_panoramas(root: Path, n_frames: int = 8, width: int = 512, height: int = 256) -> Path:
    cam_dir = root / "PanoramaCam"
    pos_dir = cam_dir / "positions"
    cam_dir.mkdir(parents=True, exist_ok=True)
    pos_dir.mkdir(parents=True, exist_ok=True)

    yy, xx = np.mgrid[0:height, 0:width]
    lon = xx / width * 2 * np.pi
    lat = yy / height * np.pi
    entries = []

    for i in range(n_frames):
        yaw = i * 0.08
        band = ((lon + yaw) / (np.pi / 4)).astype(np.int32) % 8
        rgb = np.zeros((height, width, 3), dtype=np.uint8)
        rgb[..., 0] = (40 + band * 28).clip(0, 255)
        rgb[..., 1] = (180 - np.abs(lat - np.pi / 2) * 80).clip(0, 255).astype(np.uint8)
        rgb[..., 2] = (90 + ((band + 3) % 8) * 20).clip(0, 255)
        rgb[height // 2 - 4 : height // 2 + 4, :] = 255
        Image.fromarray(rgb, mode="RGB").save(cam_dir / f"{i:04d}.png")
        entries.append(
            {
                "position": {"x": float(i) * 0.04, "y": 0.0, "z": 1.2},
                "rotation": {"x": 0.0, "y": float(yaw), "z": 0.0},
            }
        )

    (pos_dir / "PanoramaCam_positions.json").write_text(json.dumps(entries, indent=2), encoding="utf-8")
    return cam_dir
