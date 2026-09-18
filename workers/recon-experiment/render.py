"""gsplat RGB renderer with locked settings for PLY vs SPZ comparison."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np

from hashes import sha256_file
from poses import gl_c2w_to_cv_w2c
from spz_decode import GaussianCloud

RENDER_TOOL = "gsplat.rendering.rasterization"
RENDER_SETTINGS = {
    "packed": False,
    "render_mode": "RGB",
    "tone": "linear_clamp_0_1",
    "downsample": False,
    "pca": False,
    "crop": False,
    "exposure": 1.0,
}


def cloud_to_tensors(cloud: GaussianCloud, device: str):
    import torch
    import torch.nn.functional as F

    sh_rest = cloud.sh_rest
    if sh_rest.ndim == 3 and sh_rest.shape[1] == 0:
        colors = cloud.sh0[:, None, :]
    else:
        colors = np.concatenate([cloud.sh0[:, None, :], sh_rest], axis=1)
    quats = cloud.quats_xyzw[:, [3, 0, 1, 2]]  # gsplat wants wxyz
    return {
        "means": torch.from_numpy(np.ascontiguousarray(cloud.positions)).to(device),
        "quats": F.normalize(torch.from_numpy(np.ascontiguousarray(quats)).to(device), dim=-1),
        "scales": torch.exp(torch.from_numpy(np.ascontiguousarray(cloud.scales_log)).to(device)),
        "opacities": torch.sigmoid(torch.from_numpy(np.ascontiguousarray(cloud.opacity_logit)).to(device)),
        "colors": torch.from_numpy(np.ascontiguousarray(colors)).to(device),
        "sh_degree": int(cloud.sh_degree),
        "count": int(cloud.count),
    }


def render_pose(tensors: dict[str, Any], pose: dict[str, Any], device: str) -> np.ndarray:
    import torch
    from gsplat.rendering import rasterization

    c2w = np.array(pose["world_from_camera"], dtype=np.float32)
    view = gl_c2w_to_cv_w2c(c2w).astype(np.float32)
    K = pose["intrinsics"]
    w = int(pose["viewport"]["width"])
    h = int(pose["viewport"]["height"])
    Kmat = np.array(
        [[K["fx"], 0.0, K["cx"]], [0.0, K["fy"], K["cy"]], [0.0, 0.0, 1.0]],
        dtype=np.float32,
    )
    with torch.no_grad():
        rgb, _, _ = rasterization(
            means=tensors["means"],
            quats=tensors["quats"],
            scales=tensors["scales"],
            opacities=tensors["opacities"],
            colors=tensors["colors"],
            viewmats=torch.from_numpy(view)[None].to(device),
            Ks=torch.from_numpy(Kmat)[None].to(device),
            width=w,
            height=h,
            packed=False,
            sh_degree=int(tensors["sh_degree"]),
            render_mode="RGB",
            near_plane=float(pose.get("near") or 0.01),
            far_plane=float(pose.get("far") or 100.0),
        )
        img = (rgb[0].clamp(0, 1).detach().cpu().numpy() * 255.0).astype(np.uint8)
    return img


def save_png(path: Path, image: np.ndarray) -> str:
    from PIL import Image

    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(image).save(path)
    return sha256_file(path)


def write_summary(path: Path, payload: dict[str, Any]) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
