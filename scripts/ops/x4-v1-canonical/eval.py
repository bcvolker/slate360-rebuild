#!/usr/bin/env python3
"""Train/holdout metrics + named GT|render pairs from the persisted V1 checkpoint."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np

NAMED = (
    ("fridge", 55.0, "front"),
    ("island", 40.0, "front"),
    ("archway", 90.0, "front"),
    ("dark_cabinetry", 70.0, "left"),
    ("living_opening", 120.0, "front"),
)


def ssim(img, gt, c1=0.01 ** 2, c2=0.03 ** 2):
    import torch.nn.functional as F

    k = 11
    pad = k // 2
    mu_x = F.avg_pool2d(img, k, 1, pad)
    mu_y = F.avg_pool2d(gt, k, 1, pad)
    sig_x = F.avg_pool2d(img * img, k, 1, pad) - mu_x * mu_x
    sig_y = F.avg_pool2d(gt * gt, k, 1, pad) - mu_y * mu_y
    sig_xy = F.avg_pool2d(img * gt, k, 1, pad) - mu_x * mu_y
    ssim_map = ((2 * mu_x * mu_y + c1) * (2 * sig_xy + c2)) / (
        (mu_x * mu_x + mu_y * mu_y + c1) * (sig_x + sig_y + c2)
    )
    return float(ssim_map.mean().item())


def ply_header(path: Path) -> str:
    raw = Path(path).read_bytes()
    end = raw.find(b"end_header\n")
    return raw[: end + len(b"end_header\n")].decode("ascii", "replace")


def eval_split(params, cameras, img_root: Path, device):
    import cv2
    import torch
    import torch.nn.functional as F
    from gsplat.rendering import rasterization

    by_face: dict[str, list[tuple[float, float]]] = {}
    psnrs, ssims = [], []
    with torch.no_grad():
        for rec in cameras:
            arr = cv2.cvtColor(cv2.imread(str(img_root / rec["name"])), cv2.COLOR_BGR2RGB)
            gt = torch.from_numpy(arr.astype(np.float32) / 255.0).to(device).permute(2, 0, 1)
            render, _, _ = rasterization(
                means=params["means"],
                quats=F.normalize(params["quats"], dim=-1),
                scales=torch.exp(params["scales"]),
                opacities=torch.sigmoid(params["opac"]).squeeze(-1),
                colors=params["rgbs"].clamp(0, 1),
                viewmats=torch.tensor(rec["view"], dtype=torch.float32, device=device)[None],
                Ks=torch.tensor(rec["K"], dtype=torch.float32, device=device)[None],
                width=int(rec["w"]),
                height=int(rec["h"]),
                packed=False,
            )
            img = render[0, ..., :3].permute(2, 0, 1).clamp(0, 1)
            mse = float(((img - gt) ** 2).mean().item())
            psnr = 10.0 * math.log10(1.0 / max(mse, 1e-12))
            s = ssim(img[None], gt[None])
            psnrs.append(psnr)
            ssims.append(s)
            by_face.setdefault(rec["face"], []).append((psnr, s))
    per = {
        k: {"n": len(v), "psnr": float(np.mean([x[0] for x in v])), "ssim": float(np.mean([x[1] for x in v]))}
        for k, v in by_face.items()
    }
    return {
        "n": len(cameras),
        "psnr_mean": float(np.mean(psnrs)) if psnrs else None,
        "psnr_min": float(np.min(psnrs)) if psnrs else None,
        "ssim_mean": float(np.mean(ssims)) if ssims else None,
        "per_direction": per,
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--ckpt", required=True)
    p.add_argument("--dataset", required=True)
    p.add_argument("--images", required=True)
    p.add_argument("--ply", required=True)
    p.add_argument("--out", required=True)
    args = p.parse_args()

    import cv2
    import torch
    import torch.nn.functional as F
    from gsplat.rendering import rasterization

    device = torch.device("cuda")
    blob = torch.load(args.ckpt, map_location=device, weights_only=False)
    params = {k: blob[k].to(device) for k in ("means", "scales", "quats", "opac", "rgbs")}
    cameras = json.loads(Path(args.dataset, "cameras.json").read_text())
    img_root = Path(args.images)
    out = Path(args.out)
    (out / "screenshots").mkdir(parents=True, exist_ok=True)
    train = [c for c in cameras if c["role"] == "train"]
    hold = [c for c in cameras if c["role"] == "holdout"]
    train_m = eval_split(params, train, img_root, device)
    hold_m = eval_split(params, hold, img_root, device)

    named_meta = []
    for label, t_want, face in NAMED:
        cand = [c for c in cameras if c["face"] == face]
        rec = min(cand, key=lambda c: abs(c["t"] - t_want))
        arr = cv2.cvtColor(cv2.imread(str(img_root / rec["name"])), cv2.COLOR_BGR2RGB)
        gt = torch.from_numpy(arr.astype(np.float32) / 255.0).to(device).permute(2, 0, 1)
        with torch.no_grad():
            render, _, _ = rasterization(
                means=params["means"],
                quats=F.normalize(params["quats"], dim=-1),
                scales=torch.exp(params["scales"]),
                opacities=torch.sigmoid(params["opac"]).squeeze(-1),
                colors=params["rgbs"].clamp(0, 1),
                viewmats=torch.tensor(rec["view"], dtype=torch.float32, device=device)[None],
                Ks=torch.tensor(rec["K"], dtype=torch.float32, device=device)[None],
                width=int(rec["w"]),
                height=int(rec["h"]),
                packed=False,
            )
        pred = (render[0, ..., :3].clamp(0, 1).detach().cpu().numpy() * 255).astype(np.uint8)
        side = np.concatenate([arr, pred], axis=1)
        cv2.imwrite(str(out / "screenshots" / f"{label}_gt.jpg"), cv2.cvtColor(arr, cv2.COLOR_RGB2BGR))
        cv2.imwrite(str(out / "screenshots" / f"{label}_pred.jpg"), cv2.cvtColor(pred, cv2.COLOR_RGB2BGR))
        cv2.imwrite(str(out / "screenshots" / f"{label}_side.jpg"), cv2.cvtColor(side, cv2.COLOR_RGB2BGR))
        named_meta.append({"label": label, "t": rec["t"], "face": rec["face"], "role": rec["role"], "name": rec["name"]})

    header = ply_header(Path(args.ply))
    (out / "PLY_HEADER.txt").write_text(header)
    props = [ln.split()[-1] for ln in header.splitlines() if ln.startswith("property ")]
    stats = {
        "experiment": "x4_v1_canonical",
        "commercial_quality": False,
        "note": "Reproduces V1 settings with a true holdout and persisted Gaussian attributes. Not a quality promotion.",
        "gaussian_count": int(params["means"].shape[0]),
        "steps": int(blob["steps"]),
        "runtime_sec": blob.get("runtime_sec"),
        "peak_vram_mib": blob.get("peak_vram_mib"),
        "train": train_m,
        "holdout": hold_m,
        "named_views": named_meta,
        "ply_header": header.strip(),
        "ply_properties": props,
        "original_v1_train20_psnr": 27.94,
        "original_v1_holdout": None,
        "v2_used": False,
    }
    (out / "V1_CANONICAL_METRICS.json").write_text(json.dumps(stats, indent=2) + "\n")
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
