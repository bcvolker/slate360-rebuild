#!/usr/bin/env python3
"""PSNR/SSIM/Laplacian across forensics renders. Resize to 1440x900 for metrics only when needed."""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/mnt/c/s360-twin-brush/docs/ops/twin-appearance-forensics")
RENDERS = ROOT / "renders"
W, H = 1440, 900


def load(name: str) -> np.ndarray | None:
    p = RENDERS / name
    if not p.is_file():
        return None
    im = Image.open(p).convert("RGB")
    if im.size != (W, H):
        im = im.resize((W, H), Image.Resampling.LANCZOS)
    return np.array(im)


def lap_var(img: np.ndarray) -> float:
    g = 0.299 * img[..., 0] + 0.587 * img[..., 1] + 0.114 * img[..., 2]
    k = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
    pad = np.pad(g.astype(np.float32), 1, mode="edge")
    acc = np.zeros_like(g, dtype=np.float32)
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
    return {"psnr": psnr, "ssim": float(ssim_map.mean().item())}


def stats(img: np.ndarray, path: Path | None) -> dict:
    out = {
        "wh": [int(img.shape[1]), int(img.shape[0])],
        "lap_var": lap_var(img),
        "mean_rgb": [float(x) for x in img.mean(axis=(0, 1))],
    }
    if path and path.is_file():
        raw = Image.open(path)
        out["file_wh"] = list(raw.size)
    return out


def contact(names: list[tuple[str, str]], dest: Path) -> None:
    tiles = []
    for file, label in names:
        img = load(file)
        if img is None:
            img = np.zeros((H, W, 3), dtype=np.uint8)
        im = Image.fromarray(img)
        draw = ImageDraw.Draw(im)
        draw.rectangle((0, 0, W, 36), fill=(0, 0, 0))
        draw.text((12, 8), label, fill=(255, 255, 255))
        tiles.append(im.resize((W // 2, H // 2), Image.Resampling.LANCZOS))
    sheet = Image.new("RGB", (W, H))
    sheet.paste(tiles[0], (0, 0))
    sheet.paste(tiles[1], (W // 2, 0))
    sheet.paste(tiles[2], (0, H // 2))
    sheet.paste(tiles[3], (W // 2, H // 2))
    dest.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(dest)


def main() -> int:
    files = {
        "A": "A_native_gsplat.png",
        "B": "B_arkit_gsplat.png",
        "C": "C_spz_spark.png",
        "D": "D_live_reality.png",
        "ply": "G_arkit_ply_spark.png",
        "dpr2": "AB_dpr2.png",
        "blur0": "AB_blur0.png",
        "sh0": "AB_sh0.png",
        "scale07": "AB_scale07.png",
        "aces": "AB_aces.png",
    }
    loaded = {k: load(v) for k, v in files.items()}
    report: dict = {}
    for k, name in files.items():
        img = loaded[k]
        if img is None:
            continue
        report[k] = stats(img, RENDERS / name)
    pairs = [("A", "B"), ("B", "C"), ("C", "D"), ("B", "ply"), ("C", "dpr2"), ("C", "blur0"), ("C", "sh0"), ("C", "scale07")]
    report["pairs"] = {}
    for a, b in pairs:
        if loaded.get(a) is not None and loaded.get(b) is not None:
            report["pairs"][f"{a}_to_{b}"] = psnr_ssim(loaded[a], loaded[b])
    (ROOT / "COMPARE.json").write_text(json.dumps(report, indent=2) + "\n")
    if all(loaded.get(k) is not None for k in ("A", "B", "C", "D")):
        contact(
            [
                (files["A"], "A  gsplat native PLY  (X4 cam)"),
                (files["B"], "B  gsplat ARKit PLY"),
                (files["C"], "C  Spark SPZ isolated"),
                (files["D"], "D  live Slate360 Reality"),
            ],
            ROOT / "CONTACT_2x2.png",
        )
    print(json.dumps(report.get("pairs", {}), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
