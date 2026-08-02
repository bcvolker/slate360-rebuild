"""Reader for the native `S360DEPTH1` retained sensor-evidence stream."""

from __future__ import annotations

import struct
from pathlib import Path
from typing import Any


MAGIC = b"S360DEPTH1"
RECORD_HEADER_BYTES = 24


def inspect_depth_evidence(path: str | Path) -> dict[str, Any]:
    """Validate the stream and return counts without loading all depth pixels."""
    file_path = Path(path)
    with file_path.open("rb") as handle:
        if handle.read(len(MAGIC)) != MAGIC:
            raise ValueError("Invalid S360 depth evidence magic")
        frames = 0
        total_depth_bytes = 0
        total_confidence_bytes = 0
        total_rgb_bytes = 0
        dimensions: set[tuple[int, int]] = set()
        while True:
            header = handle.read(RECORD_HEADER_BYTES)
            if not header:
                break
            if len(header) != RECORD_HEADER_BYTES:
                raise ValueError("Truncated S360 depth record header")
            timestamp, width, height, depth_bytes, confidence_bytes, rgb_bytes = struct.unpack(
                "<dHHIII", header
            )
            if not timestamp or width <= 0 or height <= 0:
                raise ValueError("Invalid S360 depth record metadata")
            expected_depth_bytes = width * height * 2
            if depth_bytes != expected_depth_bytes or confidence_bytes != width * height:
                raise ValueError("S360 depth record dimensions do not match payload sizes")
            payload_size = depth_bytes + confidence_bytes + rgb_bytes
            payload = handle.read(payload_size)
            if len(payload) != payload_size:
                raise ValueError("Truncated S360 depth record payload")
            frames += 1
            dimensions.add((width, height))
            total_depth_bytes += depth_bytes
            total_confidence_bytes += confidence_bytes
            total_rgb_bytes += rgb_bytes
    return {
        "format": "s360depth",
        "version": 1,
        "frameCount": frames,
        "dimensions": [{"width": width, "height": height} for width, height in sorted(dimensions)],
        "depthBytes": total_depth_bytes,
        "confidenceBytes": total_confidence_bytes,
        "rgbBytes": total_rgb_bytes,
        "fileSizeBytes": file_path.stat().st_size,
    }
