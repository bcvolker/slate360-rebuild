"""Load a nerfstudio/3DGS Gaussian PLY into the same cloud as SPZ decode."""
from __future__ import annotations

from pathlib import Path

import numpy as np

from spz_decode import GaussianCloud


def load_ply(path: Path) -> GaussianCloud:
    raw = Path(path).read_bytes()
    end = raw.find(b"end_header\n")
    if end < 0:
        raise ValueError(f"no PLY header in {path}")
    header = raw[:end].decode("ascii", "replace")
    n = None
    props: list[tuple[str, str]] = []
    fmt = "binary_little_endian"
    for line in header.splitlines():
        if line.startswith("format "):
            fmt = line.split()[1]
        if line.startswith("element vertex"):
            n = int(line.split()[-1])
        if line.startswith("property "):
            bits = line.split()
            props.append((bits[1], bits[2]))
    if n is None:
        raise ValueError("PLY missing vertex count")
    if fmt != "binary_little_endian":
        raise ValueError(f"unsupported PLY format {fmt}")
    type_map = {"float": "<f4", "double": "<f8", "uchar": "u1", "uint": "<u4", "int": "<i4"}
    dt = np.dtype([(name, type_map.get(typ, "<f4")) for typ, name in props])
    arr = np.frombuffer(raw[end + len(b"end_header\n") :], dtype=dt, count=n)
    names = set(arr.dtype.names or ())
    positions = np.column_stack([arr["x"], arr["y"], arr["z"]]).astype(np.float32)
    rest_names = [f"f_rest_{i}" for i in range(45) if f"f_rest_{i}" in names]
    sh_rest_n = len(rest_names)
    sh_degree = {0: 0, 9: 1, 24: 2, 45: 3}.get(sh_rest_n, 3 if sh_rest_n >= 45 else 0)
    if "f_dc_0" in names:
        sh0 = np.column_stack([arr["f_dc_0"], arr["f_dc_1"], arr["f_dc_2"]]).astype(np.float32)
    else:
        sh0 = np.zeros((n, 3), dtype=np.float32)
    if rest_names:
        rest = np.column_stack([arr[name] for name in rest_names]).astype(np.float32)
        sh_rest = rest.reshape(n, sh_rest_n // 3, 3)
        sh_degree = {3: 1, 8: 2, 15: 3}.get(sh_rest.shape[1], sh_degree)
    else:
        sh_rest = np.zeros((n, 0, 3), dtype=np.float32)
        sh_degree = 0
    if "opacity" in names:
        opac = arr["opacity"].astype(np.float64)
        # ns-export writes activated (0,1) opacity. Logit if needed.
        if np.nanmax(opac) <= 1.0001 and np.nanmin(opac) >= 0.0:
            opac = np.clip(opac, 1e-6, 1.0 - 1e-6)
            opacity_logit = np.log(opac / (1.0 - opac)).astype(np.float32)
        else:
            opacity_logit = opac.astype(np.float32)
    else:
        opacity_logit = np.zeros((n,), dtype=np.float32)
    scales = np.column_stack([arr["scale_0"], arr["scale_1"], arr["scale_2"]]).astype(np.float32)
    # ns-export writes linear stddev. Convert to log. Log-space values are typically negative.
    if float(np.median(np.abs(scales))) < 0.5:
        scales_log = np.log(np.clip(scales, 1e-8, None)).astype(np.float32)
    else:
        scales_log = scales
    if "rot_0" in names:
        # nerfstudio PLY: rot_0=w, rot_1=x, rot_2=y, rot_3=z
        wxyz = np.column_stack([arr["rot_0"], arr["rot_1"], arr["rot_2"], arr["rot_3"]]).astype(np.float32)
        quats_xyzw = wxyz[:, [1, 2, 3, 0]]
    else:
        quats_xyzw = np.zeros((n, 4), dtype=np.float32)
        quats_xyzw[:, 3] = 1.0
    return GaussianCloud(
        positions=positions,
        scales_log=scales_log,
        quats_xyzw=quats_xyzw,
        opacity_logit=opacity_logit,
        sh0=sh0,
        sh_rest=sh_rest,
        sh_degree=int(sh_degree),
        count=int(n),
        version=0,
        fractional_bits=0,
        flags=0,
        antialiased=False,
    )
