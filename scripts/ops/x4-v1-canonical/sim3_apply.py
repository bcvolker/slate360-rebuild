"""Apply the already-solved EXACT_FRAME_SIM3. Do not recompute registration."""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np


def load_exact_frame_sim3(path: str | Path) -> dict[str, Any]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if "scale" not in data or "rotation_3x3" not in data or "translation_m" not in data:
        raise ValueError("EXACT_FRAME_SIM3.json is missing scale/R/t")
    return data


def apply_sim3(xyz: np.ndarray, scale: float, rotation: np.ndarray, translation: np.ndarray) -> np.ndarray:
    """P_arkit = scale * R @ P_x4 + t  (locked exact-frame formula)."""
    return scale * (np.asarray(rotation) @ np.asarray(xyz).T).T + np.asarray(translation)


def rotate_quats(quats_wxyz: np.ndarray, rotation: np.ndarray) -> np.ndarray:
    """Rotate Gaussian orientations by SIM3 R. Input wxyz."""
    r = np.asarray(rotation, dtype=np.float64)
    tr = float(np.trace(r))
    if tr > 0:
        s = math.sqrt(tr + 1.0) * 2
        qw, qx, qy, qz = 0.25 * s, (r[2, 1] - r[1, 2]) / s, (r[0, 2] - r[2, 0]) / s, (r[1, 0] - r[0, 1]) / s
    else:
        i = int(np.argmax([r[0, 0], r[1, 1], r[2, 2]]))
        if i == 0:
            s = math.sqrt(1 + r[0, 0] - r[1, 1] - r[2, 2]) * 2
            qw, qx, qy, qz = (r[2, 1] - r[1, 2]) / s, 0.25 * s, (r[0, 1] + r[1, 0]) / s, (r[0, 2] + r[2, 0]) / s
        elif i == 1:
            s = math.sqrt(1 + r[1, 1] - r[0, 0] - r[2, 2]) * 2
            qw, qx, qy, qz = (r[0, 2] - r[2, 0]) / s, (r[0, 1] + r[1, 0]) / s, 0.25 * s, (r[1, 2] + r[2, 1]) / s
        else:
            s = math.sqrt(1 + r[2, 2] - r[0, 0] - r[1, 1]) * 2
            qw, qx, qy, qz = (r[1, 0] - r[0, 1]) / s, (r[0, 2] + r[2, 0]) / s, (r[1, 2] + r[2, 1]) / s, 0.25 * s
    rq = np.array([qw, qx, qy, qz], dtype=np.float64)
    q = np.asarray(quats_wxyz, dtype=np.float64)
    w0, x0, y0, z0 = rq
    w1, x1, y1, z1 = q.T
    out = np.stack([
        w0 * w1 - x0 * x1 - y0 * y1 - z0 * z1,
        w0 * x1 + x0 * w1 + y0 * z1 - z0 * y1,
        w0 * y1 - x0 * z1 + y0 * w1 + z0 * x1,
        w0 * z1 + x0 * y1 - y0 * x1 + z0 * w1,
    ], axis=1)
    n = np.linalg.norm(out, axis=1, keepdims=True)
    return (out / np.clip(n, 1e-12, None)).astype(np.float32)


def transform_gsplat_ply(src: Path, dst: Path, sim: dict[str, Any]) -> int:
    """Means + linear scales + quats. Never recomputes SIM3."""
    s = float(sim["scale"])
    r = np.array(sim["rotation_3x3"], dtype=np.float64)
    t = np.array(sim["translation_m"], dtype=np.float64)
    raw = Path(src).read_bytes()
    end = raw.find(b"end_header\n")
    header = raw[: end].decode("ascii", "replace")
    n = None
    fmt = "ascii"
    props = []
    for line in header.splitlines():
        if line.startswith("format "):
            fmt = line.split()[1]
        if line.startswith("element vertex"):
            n = int(line.split()[-1])
        if line.startswith("property "):
            bits = line.split()
            props.append((bits[1], bits[2]))
    if n is None:
        raise ValueError("PLY has no vertex count")
    body = raw[end + len(b"end_header\n") :]
    dst = Path(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not fmt.startswith("binary"):
        raise ValueError("V1 canonical PLY must be binary_little_endian so scale/quat bake")
    type_map = {"float": "<f4", "double": "<f8", "uchar": "u1", "uint": "<u4", "int": "<i4"}
    dt = np.dtype([(name, type_map.get(typ, "<f4")) for typ, name in props])
    arr = np.frombuffer(body, dtype=dt, count=n).copy()
    p = np.column_stack([arr["x"], arr["y"], arr["z"]])
    p2 = apply_sim3(p, s, r, t)
    arr["x"], arr["y"], arr["z"] = p2[:, 0], p2[:, 1], p2[:, 2]
    names = arr.dtype.names or ()
    if "scale_0" not in names or "rot_0" not in names:
        raise ValueError("PLY missing scale_/rot_ — refusing centers-only transform")
    arr["scale_0"] = arr["scale_0"] * s
    arr["scale_1"] = arr["scale_1"] * s
    arr["scale_2"] = arr["scale_2"] * s
    q = np.column_stack([arr["rot_0"], arr["rot_1"], arr["rot_2"], arr["rot_3"]])
    q2 = rotate_quats(q, r)
    arr["rot_0"], arr["rot_1"], arr["rot_2"], arr["rot_3"] = q2[:, 0], q2[:, 1], q2[:, 2], q2[:, 3]
    dst.write_bytes(raw[: end + len(b"end_header\n")] + arr.tobytes())
    return int(n)
