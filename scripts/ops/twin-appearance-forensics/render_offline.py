#!/usr/bin/env python3
"""Offline gsplat rasterize of native (X4 cam) and ARKit PLY (ARKit cam). 1440x900."""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

ROOT = Path("/mnt/c/s360-twin-brush/docs/ops/twin-appearance-forensics")
RESEARCH = Path(
    "/mnt/c/Users/Brian PC/Desktop/Slate360Research/Projects/KitchenAprilTags"
    "/Runs/2026-08-31T22-x4-brush-challenger"
)
NATIVE = RESEARCH / "brush_b_train" / "brush_b.ply"
ARKIT = RESEARCH / "brush_x4_arkit.ply"
CAMERA = json.loads((ROOT / "CAMERA.json").read_text())
W, H = 1440, 900


def load_brush_ply(path: Path):
    import torch

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
    dt = np.dtype([(name, "<f4") for typ, name in props])
    arr = np.frombuffer(raw[end + len(b"end_header\n") :], dtype=dt, count=n)
    means = np.column_stack([arr["x"], arr["y"], arr["z"]])
    sh0 = np.column_stack([arr["f_dc_0"], arr["f_dc_1"], arr["f_dc_2"]])
    rest = np.stack([arr[f"f_rest_{i}"] for i in range(45)], axis=1).reshape(n, 15, 3)
    scales = np.column_stack([arr["scale_0"], arr["scale_1"], arr["scale_2"]])
    quats = np.column_stack([arr["rot_0"], arr["rot_1"], arr["rot_2"], arr["rot_3"]])
    opac = arr["opacity"]
    device = torch.device("cuda")
    return {
        "means": torch.from_numpy(means).to(device),
        "scales": torch.from_numpy(scales).to(device),
        "quats": torch.from_numpy(quats).to(device),
        "opacities": torch.from_numpy(opac).to(device),
        "sh0": torch.from_numpy(sh0).to(device)[:, None, :],
        "shN": torch.from_numpy(rest.astype(np.float32)).to(device),
    }


def viewmat(arr):
    import torch

    m = np.array(arr, dtype=np.float32).reshape(4, 4)
    return torch.from_numpy(m.T if False else m)


def colmajor_to_mat(arr16):
    m = np.array(arr16, dtype=np.float32).reshape(4, 4, order="F")
    return m


def render_one(params, view16, K, sh_degree: int, out: Path):
    import torch
    import torch.nn.functional as F
    from gsplat.rendering import rasterization
    from PIL import Image

    device = params["means"].device
    view = torch.from_numpy(colmajor_to_mat(view16)).to(device)
    Ks = torch.tensor(K, dtype=torch.float32, device=device)
    colors = torch.cat([params["sh0"], params["shN"]], dim=1)
    with torch.no_grad():
        render, _, _ = rasterization(
            means=params["means"],
            quats=F.normalize(params["quats"], dim=-1),
            scales=torch.exp(params["scales"]),
            opacities=torch.sigmoid(params["opacities"]),
            colors=colors,
            viewmats=view[None],
            Ks=Ks[None],
            width=W,
            height=H,
            packed=False,
            sh_degree=sh_degree,
            render_mode="RGB",
        )
    img = (render[0].clamp(0, 1).detach().cpu().numpy() * 255).astype(np.uint8)
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(img).save(out)
    return img


def laplacian_var(img: np.ndarray) -> float:
    g = img.astype(np.float32)
    if g.ndim == 3:
        g = 0.299 * g[..., 0] + 0.587 * g[..., 1] + 0.114 * g[..., 2]
    k = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
    pad = np.pad(g, 1, mode="edge")
    acc = np.zeros_like(g)
    for i in range(3):
        for j in range(3):
            acc += k[i, j] * pad[i : i + g.shape[0], j : j + g.shape[1]]
    return float(acc.var())


def psnr_ssim(a: np.ndarray, b: np.ndarray) -> dict:
    import torch
    import torch.nn.functional as F

    x = torch.from_numpy(a.astype(np.float32) / 255.0).permute(2, 0, 1)[None]
    y = torch.from_numpy(b.astype(np.float32) / 255.0).permute(2, 0, 1)[None]
    mse = float(((x - y) ** 2).mean().item())
    psnr = 10.0 * math.log10(1.0 / max(mse, 1e-12))
    k, pad = 11, 5
    mu_x = F.avg_pool2d(x, k, 1, pad)
    mu_y = F.avg_pool2d(y, k, 1, pad)
    sig_x = F.avg_pool2d(x * x, k, 1, pad) - mu_x * mu_x
    sig_y = F.avg_pool2d(y * y, k, 1, pad) - mu_y * mu_y
    sig_xy = F.avg_pool2d(x * y, k, 1, pad) - mu_x * mu_y
    c1, c2 = 0.01 ** 2, 0.03 ** 2
    ssim_map = ((2 * mu_x * mu_y + c1) * (2 * sig_xy + c2)) / (
        (mu_x * mu_x + mu_y * mu_y + c1) * (sig_x + sig_y + c2)
    )
    return {"psnr": psnr, "ssim": float(ssim_map.mean().item()), "mse": mse}


def main() -> int:
    shots = ROOT / "renders"
    shots.mkdir(parents=True, exist_ok=True)
    K = CAMERA["K"]
    native = load_brush_ply(NATIVE)
    arkit = load_brush_ply(ARKIT)
    a = render_one(native, CAMERA["x4"]["view_opencv"], K, 3, shots / "A_native_gsplat.png")
    b = render_one(arkit, CAMERA["arkit"]["view_opencv"], K, 3, shots / "B_arkit_gsplat.png")
    b0 = render_one(arkit, CAMERA["arkit"]["view_opencv"], K, 0, shots / "B_arkit_gsplat_sh0.png")
    metrics = {
        "A_native": {"wh": [W, H], "lap_var": laplacian_var(a), "mean": a.mean(axis=(0, 1)).tolist()},
        "B_arkit": {"wh": [W, H], "lap_var": laplacian_var(b), "mean": b.mean(axis=(0, 1)).tolist()},
        "B_sh0": {"wh": [W, H], "lap_var": laplacian_var(b0), "mean": b0.mean(axis=(0, 1)).tolist()},
        "A_to_B": psnr_ssim(a, b),
        "B_sh3_to_sh0": psnr_ssim(b, b0),
        "loader": "Brush log-scale + logit opacity; gsplat rasterization 1.5.3",
    }
    (ROOT / "OFFLINE_METRICS.json").write_text(json.dumps(metrics, indent=2) + "\n")
    print(json.dumps(metrics, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
