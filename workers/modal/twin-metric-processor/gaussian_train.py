"""CUDA gsplat trainer. Imported only when a GPU job actually trains."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np

from constants import GAUSSIAN_STEPS
from gaussian_fixed import C0, SH_DEGREE, train_config


def train_gsplat(
    dataset_dir: str | Path,
    out_dir: str | Path,
    *,
    steps: int = GAUSSIAN_STEPS,
    depth_loss: bool = False,
) -> dict[str, Any]:
    """Frozen-camera gsplat. Saves raw PLY before any SPZ conversion."""
    import torch
    import torch.nn.functional as F
    from PIL import Image
    from gsplat import export_splats
    from gsplat.rendering import rasterization
    from gsplat.strategy import DefaultStrategy

    if not torch.cuda.is_available():
        raise RuntimeError("gsplat training requires CUDA (local RTX 3090 or Modal GPU)")

    device = torch.device("cuda")
    data = Path(dataset_dir)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    cameras = json.loads((data / "cameras.json").read_text())
    xyz = np.load(data / "init_xyz.npy").astype(np.float32)
    rgb = np.load(data / "init_rgb.npy").astype(np.float32) / 255.0
    train = [c for c in cameras if c["role"] == "train"]
    hold = [c for c in cameras if c["role"] == "holdout"]
    w, h = int(train[0]["w"]), int(train[0]["h"])
    xyz_t = torch.from_numpy(xyz).to(device)
    n = xyz_t.shape[0]
    scales = torch.log(torch.full((n, 3), 0.01, device=device))
    quats = torch.zeros((n, 4), device=device)
    quats[:, 0] = 1
    params = torch.nn.ParameterDict({
        "means": torch.nn.Parameter(xyz_t),
        "scales": torch.nn.Parameter(scales),
        "quats": torch.nn.Parameter(quats),
        "opacities": torch.nn.Parameter(torch.logit(torch.full((n,), 0.1, device=device))),
        "sh0": torch.nn.Parameter(((torch.from_numpy(rgb).to(device) - 0.5) / C0)[:, None, :]),
        "shN": torch.nn.Parameter(torch.zeros((n, (SH_DEGREE + 1) ** 2 - 1, 3), device=device)),
    })
    assert "pose" not in params
    optimizers = {
        k: torch.optim.Adam([params[k]], lr=lr)
        for k, lr in {
            "means": 1.6e-4, "scales": 5e-3, "quats": 1e-3,
            "opacities": 5e-2, "sh0": 2.5e-3, "shN": 1.25e-4,
        }.items()
    }
    centers = np.asarray([c["C"] for c in train], np.float64)
    scene_scale = float(np.linalg.norm(centers.max(0) - centers.min(0))) * 1.1
    strategy = DefaultStrategy(verbose=True, refine_stop_iter=min(15000, steps))
    strategy.check_sanity(params, optimizers)
    state = strategy.initialize_state(scene_scale=scene_scale)
    views = [torch.tensor(c["view"], dtype=torch.float32) for c in train]
    ks = [
        torch.tensor([[c["K"][0], 0, c["K"][2]], [0, c["K"][1], c["K"][3]], [0, 0, 1]], dtype=torch.float32)
        for c in train
    ]
    rgbs = [np.array(Image.open(data / "images" / c["name"]).convert("RGB"), dtype=np.uint8) for c in train]
    order = np.arange(len(train))
    rng = np.random.default_rng(0)
    cursor = 0
    render_mode = "RGB+ED" if depth_loss else "RGB"
    for step in range(steps):
        if cursor == 0:
            rng.shuffle(order)
        idx = int(order[cursor])
        cursor = (cursor + 1) % len(train)
        gt = torch.from_numpy(rgbs[idx]).to(device=device, dtype=torch.float32).div_(255.0).permute(2, 0, 1)
        colors = torch.cat([params["sh0"], params["shN"]], dim=1)
        render, _, info = rasterization(
            means=params["means"],
            quats=F.normalize(params["quats"], dim=-1),
            scales=torch.exp(params["scales"]),
            opacities=torch.sigmoid(params["opacities"]),
            colors=colors,
            viewmats=views[idx].to(device)[None],
            Ks=ks[idx].to(device)[None],
            width=w,
            height=h,
            packed=False,
            sh_degree=SH_DEGREE,
            render_mode=render_mode,
        )
        strategy.step_pre_backward(params, optimizers, state, step, info)
        img = render[0][..., :3].permute(2, 0, 1)
        loss = 0.8 * (img - gt).abs().mean() + 0.2 * ((img - gt) ** 2).mean()
        loss.backward()
        strategy.step_post_backward(params, optimizers, state, step, info, packed=False)
        for opt in optimizers.values():
            opt.step()
            opt.zero_grad(set_to_none=True)

    raw = out / "appearance_raw.ply"
    export_splats(
        means=params["means"].detach(),
        scales=torch.exp(params["scales"].detach()),
        quats=F.normalize(params["quats"].detach(), dim=-1),
        opacities=torch.sigmoid(params["opacities"].detach()),
        sh0=params["sh0"].detach(),
        shN=params["shN"].detach(),
        format="ply",
        save_to=str(raw),
    )
    (out / "appearance.ply").write_bytes(raw.read_bytes())
    cfg = train_config(steps=steps, depth_loss=depth_loss)
    cfg.update({
        "rawPly": str(raw),
        "holdout": _eval_split(params, hold, data, device, w, h),
        "gaussianCount": int(params["means"].shape[0]),
    })
    (out / "gaussian_metrics.json").write_text(json.dumps(cfg, indent=2) + "\n")
    return cfg


def _eval_split(params, cameras, data: Path, device, w, h) -> dict[str, Any]:
    import torch
    import torch.nn.functional as F
    from PIL import Image
    from gsplat.rendering import rasterization

    psnrs, ssims = [], []
    for rec in cameras:
        arr = np.array(Image.open(data / "images" / rec["name"]).convert("RGB"), dtype=np.uint8)
        gt = torch.from_numpy(arr).to(device=device, dtype=torch.float32).div_(255.0).permute(2, 0, 1)
        colors = torch.cat([params["sh0"], params["shN"]], dim=1)
        k = rec["K"]
        kmat = torch.tensor([[k[0], 0, k[2]], [0, k[1], k[3]], [0, 0, 1]], dtype=torch.float32, device=device)
        render, _, _ = rasterization(
            means=params["means"],
            quats=F.normalize(params["quats"], dim=-1),
            scales=torch.exp(params["scales"]),
            opacities=torch.sigmoid(params["opacities"]),
            colors=colors,
            viewmats=torch.tensor(rec["view"], dtype=torch.float32, device=device)[None],
            Ks=kmat[None],
            width=w,
            height=h,
            packed=False,
            sh_degree=SH_DEGREE,
            render_mode="RGB",
        )
        img = render[0].permute(2, 0, 1).clamp(0, 1)
        mse = float(((img - gt) ** 2).mean().item())
        psnrs.append(10.0 * math.log10(1.0 / max(mse, 1e-12)))
        ssims.append(_ssim(img[None], gt[None]))
    return {
        "n": len(cameras),
        "psnr_mean": float(np.mean(psnrs)) if psnrs else None,
        "ssim_mean": float(np.mean(ssims)) if ssims else None,
    }


def _ssim(img, gt, c1=0.01 ** 2, c2=0.03 ** 2):
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
