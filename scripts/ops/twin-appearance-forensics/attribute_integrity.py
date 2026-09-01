#!/usr/bin/env python3
"""PLY / SPZ-roundtrip attribute integrity + SH view-direction error. No retrain."""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

import numpy as np

ROOT = Path("/mnt/c/s360-twin-brush/docs/ops/twin-appearance-forensics")
RESEARCH = Path(
    "/mnt/c/Users/Brian PC/Desktop/Slate360Research/Projects/KitchenAprilTags"
    "/Runs/2026-08-31T22-x4-brush-challenger"
)
NATIVE = RESEARCH / "brush_b_train" / "brush_b.ply"
ARKIT = RESEARCH / "brush_x4_arkit.ply"
SIM3_PATH = Path(
    "/mnt/c/Users/Brian PC/Desktop/Slate360Research/Projects/KitchenAprilTags"
    "/Runs/2026-08-31T17-32-exact-frame-anchor-rescue/EXACT_FRAME_SIM3.json"
)
CAMERA = ROOT / "CAMERA.json"


def load_ply(path: Path) -> np.ndarray:
    raw = path.read_bytes()
    end = raw.find(b"end_header\n")
    header = raw[:end].decode("ascii", "replace")
    n = 0
    props = []
    for line in header.splitlines():
        if line.startswith("element vertex"):
            n = int(line.split()[-1])
        if line.startswith("property "):
            bits = line.split()
            props.append((bits[1], bits[2]))
    type_map = {"float": "<f4", "double": "<f8", "uchar": "u1", "uint": "<u4", "int": "<i4"}
    dt = np.dtype([(name, type_map.get(typ, "<f4")) for typ, name in props])
    return np.frombuffer(raw[end + len(b"end_header\n") :], dtype=dt, count=n).copy()


def pct(a: np.ndarray) -> dict:
    x = np.asarray(a, dtype=np.float64).ravel()
    x = x[np.isfinite(x)]
    if x.size == 0:
        return {"min": None, "median": None, "p95": None}
    return {
        "min": float(np.min(x)),
        "median": float(np.median(x)),
        "p95": float(np.percentile(x, 95)),
    }


def summarize(arr: np.ndarray) -> dict:
    names = arr.dtype.names or ()
    xyz = np.column_stack([arr["x"], arr["y"], arr["z"]])
    rest = [n for n in names if n.startswith("f_rest_")]
    sh_deg = 0
    if "f_dc_0" in names:
        sh_deg = 3 if len(rest) >= 45 else 2 if len(rest) >= 24 else 1 if len(rest) >= 9 else 0
    q = np.column_stack([arr["rot_0"], arr["rot_1"], arr["rot_2"], arr["rot_3"]])
    qn = np.linalg.norm(q, axis=1)
    sc = np.column_stack([arr["scale_0"], arr["scale_1"], arr["scale_2"]])
    dc = np.column_stack([arr["f_dc_0"], arr["f_dc_1"], arr["f_dc_2"]])
    fr = np.column_stack([arr[n] for n in rest]) if rest else np.zeros((len(arr), 1))
    return {
        "n": int(len(arr)),
        "opacity": pct(arr["opacity"]),
        "scale_log": {ax: pct(sc[:, i]) for i, ax in enumerate("xyz")},
        "scale_linear_median": [float(np.exp(np.median(sc[:, i]))) for i in range(3)],
        "quat_norm": pct(qn),
        "sh_degree": sh_deg,
        "sh_bands": 1 + 3 + 5 + 7 if sh_deg >= 3 else None,
        "f_dc": pct(dc),
        "f_rest": pct(fr),
        "dc_l2_median": float(np.median(np.linalg.norm(dc, axis=1))),
        "rest_l2_median": float(np.median(np.linalg.norm(fr, axis=1))),
        "bbox_min": xyz.min(0).tolist(),
        "bbox_max": xyz.max(0).tolist(),
        "bbox_mean": xyz.mean(0).tolist(),
    }


def eval_sh_rgb(dc: np.ndarray, rest: np.ndarray, dirs: np.ndarray) -> np.ndarray:
    """Inria 3DGS SH eval. dc [3], rest [15,3], dirs [D,3] -> [D,3]."""
    x, y, z = dirs[:, 0], dirs[:, 1], dirs[:, 2]
    c0 = 0.28209479177387814
    rgb = c0 * dc[None, :]
    if rest.shape[0] < 3:
        return rgb
    c1 = 0.4886025119029199
    rgb = rgb + c1 * (
        rest[0][None, :] * y[:, None]
        + rest[1][None, :] * z[:, None]
        + rest[2][None, :] * x[:, None]
    )
    if rest.shape[0] < 8:
        return rgb
    c2 = [
        1.0925484305920792,
        -1.0925484305920792,
        0.31539156525252005,
        -1.0925484305920792,
        0.5462742152960396,
    ]
    rgb = rgb + (
        c2[0] * rest[3][None, :] * (x * y)[:, None]
        + c2[1] * rest[4][None, :] * (y * z)[:, None]
        + c2[2] * rest[5][None, :] * (2 * z * z - x * x - y * y)[:, None]
        + c2[3] * rest[6][None, :] * (x * z)[:, None]
        + c2[4] * rest[7][None, :] * (x * x - y * y)[:, None]
    )
    if rest.shape[0] < 15:
        return rgb
    c3 = [
        -0.5900435899266435,
        2.890611442640554,
        -0.4570457994644658,
        0.3731763325901154,
        -0.4570457994644658,
        1.445305721320277,
        -0.5900435899266435,
    ]
    rgb = rgb + (
        c3[0] * rest[8][None, :] * (y * (3 * x * x - y * y))[:, None]
        + c3[1] * rest[9][None, :] * (x * y * z)[:, None]
        + c3[2] * rest[10][None, :] * (y * (4 * z * z - x * x - y * y))[:, None]
        + c3[3] * rest[11][None, :] * (z * (2 * z * z - 3 * x * x - 3 * y * y))[:, None]
        + c3[4] * rest[12][None, :] * (x * (4 * z * z - x * x - y * y))[:, None]
        + c3[5] * rest[13][None, :] * (z * (x * x - y * y))[:, None]
        + c3[6] * rest[14][None, :] * (x * (x * x - 3 * y * y))[:, None]
    )
    return rgb


def main() -> int:
    sim = json.loads(SIM3_PATH.read_text())
    s = float(sim["scale"])
    r = np.array(sim["rotation_3x3"], dtype=np.float64)
    t = np.array(sim["translation_m"], dtype=np.float64)
    native = load_ply(NATIVE)
    arkit = load_ply(ARKIT)
    rng = random.Random(0)
    idx = np.array(rng.sample(range(len(native)), 1000))
    src = native[idx]
    dst = arkit[idx]
    p = np.column_stack([src["x"], src["y"], src["z"]])
    expected_xyz = (s * (r @ p.T).T) + t
    got_xyz = np.column_stack([dst["x"], dst["y"], dst["z"]])
    xyz_err = np.linalg.norm(expected_xyz - got_xyz, axis=1)
    expected_scale = src["scale_0"] + math.log(s)
    scale_err = np.abs(dst["scale_0"] - expected_scale)
    op_err = np.abs(dst["opacity"] - src["opacity"])
    dc_err = np.max(
        np.abs(
            np.column_stack([dst["f_dc_0"], dst["f_dc_1"], dst["f_dc_2"]])
            - np.column_stack([src["f_dc_0"], src["f_dc_1"], src["f_dc_2"]])
        ),
        axis=1,
    )
    rest_src = np.column_stack([src[f"f_rest_{i}"] for i in range(45)])
    rest_dst = np.column_stack([dst[f"f_rest_{i}"] for i in range(45)])
    rest_err = np.max(np.abs(rest_src - rest_dst), axis=1)

    dirs = np.random.default_rng(1).normal(size=(64, 3))
    dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)
    dirs_rot = (r @ dirs.T).T
    dirs_rot /= np.linalg.norm(dirs_rot, axis=1, keepdims=True)
    sh_mse = []
    sh_rel = []
    for i in range(1000):
        dc = np.array([src["f_dc_0"][i], src["f_dc_1"][i], src["f_dc_2"][i]])
        rest = rest_src[i].reshape(15, 3)
        a = eval_sh_rgb(dc, rest, dirs)
        b = eval_sh_rgb(dc, rest, dirs_rot)
        mse = float(np.mean((a - b) ** 2))
        sh_mse.append(mse)
        mag = float(np.mean(a * a) + 1e-8)
        sh_rel.append(mse / mag)

    spz_ply = ROOT / "brush_x4_arkit_from_spz.ply"
    spz_summary = None
    if spz_ply.is_file():
        spz_summary = summarize(load_ply(spz_ply))

    report = {
        "native": summarize(native),
        "arkit": summarize(arkit),
        "spz_roundtrip_ply": spz_summary,
        "sim3_sample_n": 1000,
        "xyz_err_m": pct(xyz_err),
        "scale_log_err": pct(scale_err),
        "opacity_err": pct(op_err),
        "f_dc_err": pct(dc_err),
        "f_rest_err": pct(rest_err),
        "opacity_unchanged": bool(np.max(op_err) < 1e-6),
        "sh_unchanged_in_file": bool(np.max(rest_err) < 1e-6 and np.max(dc_err) < 1e-6),
        "sh_not_rotated": True,
        "sh_viewdir_mse_median": float(np.median(sh_mse)),
        "sh_viewdir_rel_mse_median": float(np.median(sh_rel)),
        "sh_viewdir_rel_mse_p95": float(np.percentile(sh_rel, 95)),
        "note": "SH coefficients are copied through SIM3. Rel MSE is original-dir vs R-rotated-dir eval — the error a viewer sees if SH stays in X4 while geometry is ARKit.",
    }
    ROOT.mkdir(parents=True, exist_ok=True)
    (ROOT / "ATTRIBUTE_INTEGRITY.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({k: report[k] for k in ("xyz_err_m", "scale_log_err", "opacity_unchanged", "sh_unchanged_in_file", "sh_viewdir_rel_mse_median")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
