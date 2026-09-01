#!/usr/bin/env python3
"""Route B V1 canonical trainer. Frozen cameras. No densify. Persist attributes.

Recreates 06_gaussian.py (4 equatorial 800px faces, 25k steps, RGB, L1) but
writes checkpoint.pt + a full gsplat PLY. Holdout cameras are never sampled.
"""
from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np

C0 = 0.28209479177387814
STEPS = 25000
SEED = 0


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--dataset", required=True)
    p.add_argument("--images", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--steps", type=int, default=STEPS)
    args = p.parse_args()

    import cv2
    import torch
    from torch import nn
    import torch.nn.functional as F
    from gsplat import export_splats
    from gsplat.rendering import rasterization

    if not torch.cuda.is_available():
        raise SystemExit("CUDA required (RTX 3090)")

    data = Path(args.dataset)
    img_root = Path(args.images)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "screenshots").mkdir(parents=True, exist_ok=True)
    cameras = json.loads((data / "cameras.json").read_text())
    train = [c for c in cameras if c["role"] == "train"]
    hold = [c for c in cameras if c["role"] == "holdout"]
    if not train or not hold:
        raise SystemExit("dataset missing train/holdout split")
    if any(c["face"] in ("up", "down") for c in cameras):
        raise SystemExit("refusing zenith/nadir")

    xyz = np.load(data / "init_xyz.npy").astype(np.float32)
    rgb = np.load(data / "init_rgb.npy").astype(np.float32) / 255.0
    device = torch.device("cuda")
    n = int(xyz.shape[0])
    means = nn.Parameter(torch.tensor(xyz, device=device))
    rgbs = nn.Parameter(torch.tensor(rgb, device=device).clamp(0, 1))
    scales = nn.Parameter(torch.ones((n, 3), device=device) * math.log(0.02))
    quats = nn.Parameter(torch.zeros((n, 4), device=device))
    with torch.no_grad():
        quats[:, 0] = 1.0
    opac = nn.Parameter(torch.logit(torch.full((n, 1), 0.3, device=device)))
    opt = torch.optim.Adam([
        {"params": [means], "lr": 1.6e-4},
        {"params": [scales], "lr": 5e-3},
        {"params": [quats], "lr": 1e-3},
        {"params": [opac], "lr": 5e-2},
        {"params": [rgbs], "lr": 2.5e-3},
    ])

    packed = []
    for rec in train:
        img = cv2.cvtColor(cv2.imread(str(img_root / rec["name"])), cv2.COLOR_BGR2RGB)
        packed.append((
            img,
            torch.tensor(rec["view"], dtype=torch.float32),
            torch.tensor(rec["K"], dtype=torch.float32),
            int(rec["w"]),
            int(rec["h"]),
        ))
    rng = np.random.default_rng(SEED)
    config = {
        "experiment": "x4_v1_canonical",
        "engine": "gsplat",
        "version": "1.5.3",
        "faces": ["front", "right", "back", "left"],
        "face_px": 800,
        "steps": args.steps,
        "densify": False,
        "pose_opt": False,
        "zenith_nadir": False,
        "sh_degree": 0,
        "loss": "l1",
        "init_points": n,
        "n_train": len(train),
        "n_holdout": len(hold),
        "holdout": "every 8th panorama station, all equatorial faces",
        "v2_used": False,
        "seed": SEED,
        "lrs": {"means": 1.6e-4, "scales": 5e-3, "quats": 1e-3, "opac": 5e-2, "rgbs": 2.5e-3},
    }
    (out / "TRAIN_CONFIG.json").write_text(json.dumps(config, indent=2) + "\n")
    print(
        f"train={len(train)} holdout={len(hold)} init={n} pose_opt=False densify=OFF steps={args.steps}",
        flush=True,
    )
    torch.cuda.reset_peak_memory_stats()
    t0 = time.time()
    losses = []
    peak = 0
    for step in range(args.steps):
        opt.zero_grad(set_to_none=True)
        i = int(rng.integers(0, len(packed)))
        img, view, K, w, h = packed[i]
        gt = torch.tensor(img, device=device, dtype=torch.float32).div_(255.0).permute(2, 0, 1)
        render, _, _ = rasterization(
            means=means,
            quats=F.normalize(quats, dim=-1),
            scales=torch.exp(scales),
            opacities=torch.sigmoid(opac).squeeze(-1),
            colors=rgbs.clamp(0, 1),
            viewmats=view.to(device)[None],
            Ks=K.to(device)[None],
            width=w,
            height=h,
            packed=False,
        )
        pred = render[0, ..., :3].permute(2, 0, 1)
        loss = F.l1_loss(pred, gt)
        loss.backward()
        opt.step()
        losses.append(float(loss.detach()))
        used = int(torch.cuda.max_memory_allocated() / 1024 / 1024)
        peak = max(peak, used)
        if step % 500 == 0 or step == args.steps - 1:
            print(f"step {step} loss={losses[-1]:.4f} n={means.shape[0]} vram={used} MiB", flush=True)
            vis = (pred.detach().permute(1, 2, 0).clamp(0, 1).cpu().numpy() * 255).astype(np.uint8)
            cv2.imwrite(
                str(out / "screenshots" / f"train_step_{step:05d}.jpg"),
                cv2.cvtColor(vis, cv2.COLOR_RGB2BGR),
            )

    runtime = time.time() - t0
    raw = out / "x4_v1_canonical_raw.ply"
    sh0 = ((rgbs.detach().clamp(0, 1) - 0.5) / C0)[:, None, :]
    export_splats(
        means=means.detach(),
        scales=torch.exp(scales.detach()),
        quats=F.normalize(quats.detach(), dim=-1),
        opacities=torch.sigmoid(opac.detach()).squeeze(-1),
        sh0=sh0,
        shN=torch.zeros((means.shape[0], 0, 3), device=device),
        format="ply",
        save_to=str(raw),
    )
    ckpt = {
        "means": means.detach().cpu(),
        "scales": scales.detach().cpu(),
        "quats": quats.detach().cpu(),
        "opac": opac.detach().cpu(),
        "rgbs": rgbs.detach().cpu(),
        "steps": args.steps,
        "optimizer": opt.state_dict(),
        "config": config,
        "final_loss": losses[-1],
        "runtime_sec": runtime,
        "peak_vram_mib": peak,
        "seed": SEED,
    }
    torch.save(ckpt, out / "checkpoint.pt")
    opt_meta = {
        "optimizer": "Adam",
        "param_groups": config["lrs"],
        "steps": args.steps,
        "seed": SEED,
        "final_loss": losses[-1],
        "runtime_sec": runtime,
        "peak_vram_mib": peak,
        "gaussian_count": int(means.shape[0]),
        "checkpoint": str(out / "checkpoint.pt"),
        "raw_ply": str(raw),
        "persisted": ["means", "log_scales", "quats_wxyz", "logit_opacity", "rgb", "optimizer"],
    }
    (out / "OPTIMIZER_META.json").write_text(json.dumps(opt_meta, indent=2) + "\n")
    print(json.dumps(opt_meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
