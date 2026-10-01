#!/usr/bin/env python3
"""Deterministic Route B V1 Gaussian recreation. DOES NOT RUN unless --execute.

V1 trained scale/quat/opacity in GPU RAM then dumped xyzrgb only. No checkpoint
survives. This script recreates that run (4 equatorial faces, 800px, frozen
cameras, 53,944 init, 25k steps) and writes a real gsplat PLY + torch checkpoint.

Do not invoke with --execute from the visual-proof unblock. Inventory first.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

RUN = Path("/mnt/c/Users/Brian PC/Desktop/Slate360Research/Projects/KitchenAprilTags/Runs/2026-08-31T16-46-route-b-x4-independent")
WORK = Path("/home/rian_/route_b_x4")
STEPS = 25000
DEVICE = "cuda"


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--execute", action="store_true", help="Actually train. Off by default.")
    args = p.parse_args()
    ready = {
        "dataset": {
            "colmapSparse": str(WORK / "sparse" / "0"),
            "images": str(WORK / "images"),
            "sparseExists": (WORK / "sparse" / "0" / "points3D.bin").is_file(),
            "imagesDirExists": (WORK / "images").is_dir(),
        },
        "init": {"points": 53944, "source": "COLMAP points3D"},
        "config": {
            "faces": "equatorial front/right/back/left",
            "facePx": 800,
            "steps": STEPS,
            "densify": False,
            "poseOpt": False,
            "zenithNadir": False,
        },
        "outputsIfRun": [
            "x4_v1_trained_raw.ply",
            "x4_v1_trained.pt",
            "screenshots/gsplat_step_*.jpg",
        ],
        "execute": args.execute,
    }
    print(json.dumps(ready, indent=2))
    if not args.execute:
        print("refusing: pass --execute after an exhaustive asset search")
        return 0
    if not ready["dataset"]["sparseExists"]:
        raise SystemExit("COLMAP sparse model missing; cannot recreate V1")

    import cv2
    import numpy as np
    import pycolmap
    import torch
    from torch import nn
    import torch.nn.functional as F
    from gsplat.rendering import rasterization
    from gsplat import export_splats

    rec = pycolmap.Reconstruction(str(WORK / "sparse" / "0"))
    cams, names = [], []
    Ks = {}
    for cid, cam in rec.cameras.items():
        pr = cam.params
        Ks[cid] = (float(pr[0]), float(pr[1]), float(pr[2]), int(cam.width), int(cam.height))
    for im in rec.images.values():
        if not im.has_pose:
            continue
        path = WORK / "images" / im.name
        if not path.exists():
            continue
        world_from_cam = im.cam_from_world().inverse()
        R = np.array(world_from_cam.rotation.matrix(), np.float32)
        t = np.array(world_from_cam.translation, np.float32)
        w2c = np.eye(4, dtype=np.float32)
        w2c[:3, :3] = R.T
        w2c[:3, 3] = -R.T @ t
        f, cx, cy, w, h = Ks[im.camera_id]
        K = np.array([[f, 0, cx], [0, f, cy], [0, 0, 1]], np.float32)
        cams.append((w2c, K, w, h))
        names.append(str(path))
    pts = np.array([pt.xyz for pt in rec.points3D.values()], np.float32)
    cols = np.array([np.array(pt.color, np.float32) / 255.0 for pt in rec.points3D.values()], np.float32)
    device = torch.device(DEVICE)
    means = nn.Parameter(torch.tensor(pts, device=device))
    rgbs = nn.Parameter(torch.tensor(cols, device=device).clamp(0, 1))
    scales = nn.Parameter(torch.ones((len(pts), 3), device=device) * math.log(0.02))
    quats = nn.Parameter(torch.zeros((len(pts), 4), device=device))
    with torch.no_grad():
        quats[:, 0] = 1.0
    opac = nn.Parameter(torch.logit(torch.full((len(pts), 1), 0.3, device=device)))
    opt = torch.optim.Adam([
        {"params": [means], "lr": 1.6e-4},
        {"params": [scales], "lr": 5e-3},
        {"params": [quats], "lr": 1e-3},
        {"params": [opac], "lr": 5e-2},
        {"params": [rgbs], "lr": 2.5e-3},
    ])
    rng = np.random.default_rng(0)
    shot_dir = RUN / "screenshots"
    shot_dir.mkdir(exist_ok=True)
    for step in range(STEPS):
        opt.zero_grad(set_to_none=True)
        i = int(rng.integers(0, len(cams)))
        w2c, K, w, h = cams[i]
        img = cv2.cvtColor(cv2.imread(names[i]), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        gt = torch.tensor(img, device=device).permute(2, 0, 1)
        render, _, _ = rasterization(
            means=means, quats=F.normalize(quats, dim=-1), scales=torch.exp(scales),
            opacities=torch.sigmoid(opac).squeeze(-1), colors=rgbs.clamp(0, 1),
            viewmats=torch.tensor(w2c, device=device)[None],
            Ks=torch.tensor(K, device=device)[None], width=w, height=h, packed=False,
        )
        pred = render[0, ..., :3].permute(2, 0, 1)
        F.l1_loss(pred, gt).backward()
        opt.step()
        if step % 500 == 0 or step == STEPS - 1:
            vis = (pred.detach().permute(1, 2, 0).clamp(0, 1).cpu().numpy() * 255).astype(np.uint8)
            cv2.imwrite(str(shot_dir / f"gsplat_step_{step:05d}.jpg"), cv2.cvtColor(vis, cv2.COLOR_RGB2BGR))
            print(f"step {step} n={means.shape[0]}", flush=True)

    out_raw = RUN / "x4_v1_trained_raw.ply"
    export_splats(
        means=means.detach(), scales=torch.exp(scales.detach()),
        quats=F.normalize(quats.detach(), dim=-1),
        opacities=torch.sigmoid(opac.detach()).squeeze(-1),
        sh0=((rgbs.detach().clamp(0, 1) - 0.5) / 0.28209479177387814)[:, None, :],
        shN=torch.zeros((means.shape[0], 0, 3), device=device),
        format="ply", save_to=str(out_raw),
    )
    torch.save({
        "means": means.detach().cpu(), "scales": scales.detach().cpu(),
        "quats": quats.detach().cpu(), "opac": opac.detach().cpu(),
        "rgbs": rgbs.detach().cpu(), "steps": STEPS,
    }, RUN / "x4_v1_trained.pt")
    print("wrote", out_raw)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
