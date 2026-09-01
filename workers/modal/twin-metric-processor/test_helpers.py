"""Shared synthetic capture writers for Twin Metric Processor tests."""

from __future__ import annotations

import io
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image

from arkit_io import MAGIC


def identity_c2w() -> list[float]:
    return np.eye(4).flatten(order="F").tolist()


def jpeg_bytes(w: int = 16, h: int = 12, color=(200, 40, 40)) -> bytes:
    img = Image.new("RGB", (w, h), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def write_depth_stream(path: Path, records: list[tuple[float, np.ndarray, np.ndarray, bytes | None]]) -> None:
    with path.open("wb") as handle:
        handle.write(MAGIC)
        for ts, depth, conf, jpeg in records:
            rgb = jpeg or b""
            handle.write(struct.pack("<dHHIII", ts, depth.shape[1], depth.shape[0], depth.nbytes, conf.nbytes, len(rgb)))
            handle.write(depth.tobytes())
            handle.write(conf.tobytes())
            handle.write(rgb)


def pose_frame(ts: float, *, w=80, h=60, fx=100.0, fy=100.0, cx=40.0, cy=30.0, clip_index=1, transform=None):
    return {
        "clip_index": clip_index,
        "timestamp": ts,
        "ar_timestamp": ts,
        "w": w,
        "h": h,
        "gravity": [0, 1, 0],
        "intrinsics": {"fx": fx, "fy": fy, "cx": cx, "cy": cy},
        "transform_4x4": transform or identity_c2w(),
    }


def write_poses(path: Path, frames: list[dict], *, version=6, clips=None) -> None:
    doc = {
        "version": version,
        "session_start_time": frames[0]["timestamp"] if frames else 0,
        "session_start_ar_timestamp": 0,
        "clips": clips if clips is not None else [{"index": 1, "video": "clip1.mp4", "duration": 1.0, "start_time": 0}],
        "frames": frames,
    }
    path.write_text(json.dumps(doc), encoding="utf-8")


def write_matched_capture(tmp: Path, n: int = 4, depth_w=8, depth_h=6, depth_mm=1000):
    depth_path = tmp / "lidar_depth.s360depth"
    poses_path = tmp / "lidar_poses.json"
    jpeg = jpeg_bytes(80, 60)
    recs = []
    frames = []
    for i in range(n):
        ts = 10.0 + i * 0.2
        depth = np.full((depth_h, depth_w), depth_mm, dtype="<u2")
        conf = np.full((depth_h, depth_w), 1, dtype=np.uint8)
        recs.append((ts, depth, conf, jpeg))
        frames.append(pose_frame(ts))
    write_depth_stream(depth_path, recs)
    write_poses(path=poses_path, frames=frames)
    return depth_path, poses_path
