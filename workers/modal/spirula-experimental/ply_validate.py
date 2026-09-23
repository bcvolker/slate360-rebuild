"""Reject a splat.ply that is not a finite 3DGS vertex cloud."""

from __future__ import annotations

import struct
from pathlib import Path


class PlyRejected(RuntimeError):
    pass


REQUIRED = ("x", "y", "z", "f_dc_0", "opacity", "scale_0", "rot_0")


def inspect_ply(path: Path, min_count: int = 1, max_count: int = 200_000) -> dict:
    if not path.is_file() or path.stat().st_size < 64:
        raise PlyRejected("splat.ply missing or empty")
    data = path.read_bytes()
    if not data.startswith(b"ply\n"):
        raise PlyRejected("not a PLY")
    header, _, body = data.partition(b"end_header\n")
    text = header.decode("ascii", errors="replace")
    if "format binary_little_endian 1.0" not in text:
        raise PlyRejected("master PLY must stay binary little-endian")
    count = 0
    props: list[str] = []
    for line in text.splitlines():
        if line.startswith("element vertex "):
            count = int(line.split()[-1])
        elif line.startswith("property float "):
            props.append(line.split()[-1])
    missing = [name for name in REQUIRED if name not in props]
    if missing:
        raise PlyRejected(f"missing properties {missing}")
    if count < min_count or count > max_count:
        raise PlyRejected(f"gaussian count {count} outside {min_count}..{max_count}")
    stride = 4 * len(props)
    if len(body) < count * stride:
        raise PlyRejected("PLY body shorter than vertex count")
    idx = [props.index(name) for name in ("x", "y", "z", "scale_0")]
    bad = 0
    step = max(1, count // 2000)
    for i in range(0, count, step):
        base = i * stride
        picked = [struct.unpack_from("<f", body, base + 4 * j)[0] for j in idx]
        if any(v != v or v in (float("inf"), float("-inf")) for v in picked):
            bad += 1
    if bad:
        raise PlyRejected(f"{bad} sampled vertices have non-finite position or scale")
    return {"gaussianCount": count, "properties": len(props), "bytes": path.stat().st_size, "samples": (count + step - 1) // step}
