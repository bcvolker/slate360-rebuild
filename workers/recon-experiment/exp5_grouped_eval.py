"""Experiment 5 grouped-validation evaluator: real PSNR/SSIM/LPIPS on the 38 withheld
panoramas, computed with the EXACT metric objects nerfstudio's own splatfacto model uses
internally (nerfstudio/models/splatfacto.py SplatfactoModel.__init__ / get_image_metrics_
and_images, v1.1.5) -- not a simplified proxy -- because these panoramas were entirely
removed from the training manifest, so nerfstudio's own ns-eval (which only ever scores
whatever its *own* internal 90/10 split of the loaded dataset marks as eval) cannot reach
them at all: their images are not in the dataset it trained on.

psnr = torchmetrics.image.PeakSignalNoiseRatio(data_range=1.0)
ssim = pytorch_msssim.SSIM(data_range=1.0, size_average=True, channel=3)
lpips = torchmetrics.image.lpip.LearnedPerceptualImagePatchSimilarity(normalize=True)
Images NHWC [0,1] -> NCHW [1,C,H,W] before every metric call, matching splatfacto exactly.

Read-only against the trained checkpoint. Writes only to the caller-provided work dir.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from exp3_haze_diagnostic_gpu import ckpt_tensors, load_ckpt_state, render_layers, to_png  # noqa: E402
from exp4_panorama_split import _frame_pano  # noqa: E402
from poses import apply_dataparser  # noqa: E402

DEVICE = "cuda"


def _metric_objects(device: str):
    import torch
    from pytorch_msssim import SSIM
    from torchmetrics.image import PeakSignalNoiseRatio
    from torchmetrics.image.lpip import LearnedPerceptualImagePatchSimilarity

    psnr = PeakSignalNoiseRatio(data_range=1.0).to(device)
    ssim = SSIM(data_range=1.0, size_average=True, channel=3)
    lpips = LearnedPerceptualImagePatchSimilarity(normalize=True).to(device)
    return psnr, ssim, lpips


def _to_nchw(img_np: np.ndarray, device: str):
    import torch

    t = torch.from_numpy(np.ascontiguousarray(img_np)).to(device).float()
    return t.permute(2, 0, 1)[None, ...]


def _frame_pose(fr: dict, dataparser: dict) -> dict[str, Any]:
    import numpy as _np

    c2w = apply_dataparser(_np.array(fr["transform_matrix"], dtype=_np.float64),
                            _np.array(dataparser["transform"], dtype=_np.float64), float(dataparser["scale"]))
    w, h = int(fr["w"]), int(fr["h"])
    return {
        "world_from_camera": c2w.tolist(),
        "intrinsics": {"fx": fr["fl_x"], "fy": fr["fl_y"], "cx": fr["cx"], "cy": fr["cy"]},
        "viewport": {"width": w, "height": h}, "near": 0.01, "far": 100.0,
        "file_path": fr["file_path"],
    }


def panorama_center(views: list[dict]) -> np.ndarray:
    """Panorama center = mean position of its 16 derived-view cameras (all share one
    physical capture point; small per-view offsets average out)."""
    pos = np.stack([np.array(v["world_from_camera"], dtype=np.float64)[:3, 3] for v in views])
    return pos.mean(axis=0)


def evaluate_grouped(*, vol: Path, work: Path, arm_name: str, full_transforms_path: Path,
                      images_dir: Path, dataparser: dict[str, Any], withheld_panoramas: list[str],
                      pool_panoramas: list[str], ckpt_step: int) -> dict[str, Any]:
    from PIL import Image

    work.mkdir(parents=True, exist_ok=True)
    doc = json.loads(Path(full_transforms_path).read_text(encoding="utf-8"))
    frames_by_pano: dict[str, list[dict]] = {}
    for fr in doc["frames"]:
        frames_by_pano.setdefault(_frame_pano(fr["file_path"]), []).append(fr)

    ckpt = sorted((vol / "experiments" / "room213-exp5" / arm_name / "train").rglob(f"step-{ckpt_step:09d}.ckpt"))[0]
    payload = load_ckpt_state(ckpt)
    tensors = ckpt_tensors(payload, DEVICE)

    psnr_m, ssim_m, lpips_m = _metric_objects(DEVICE)

    # training-panorama centers (pool only -- these are the locations the model actually saw)
    train_centers = []
    for p in pool_panoramas:
        views = [_frame_pose(fr, dataparser) for fr in frames_by_pano[p]]
        train_centers.append(panorama_center(views))
    train_centers = np.stack(train_centers)

    per_panorama: dict[str, Any] = {}
    for pano in withheld_panoramas:
        frs = sorted(frames_by_pano[pano], key=lambda f: f["file_path"])
        poses = [_frame_pose(fr, dataparser) for fr in frs]
        center = panorama_center(poses)
        dist = float(np.linalg.norm(train_centers - center[None, :], axis=1).min())

        view_metrics = []
        for pose, fr in zip(poses, frs):
            src_path = images_dir / Path(fr["file_path"]).name
            src = np.asarray(Image.open(src_path).convert("RGB")).astype(np.float32) / 255.0
            layers = render_layers(tensors, pose, DEVICE)
            pred = np.clip(layers["rgb"], 0, 1).astype(np.float32)
            gt_t = _to_nchw(src, DEVICE)
            pr_t = _to_nchw(pred, DEVICE)
            p = float(psnr_m(gt_t, pr_t).item())
            s = float(ssim_m(gt_t, pr_t))
            l = float(lpips_m(gt_t, pr_t).item())
            view_metrics.append({"file_path": fr["file_path"], "psnr": p, "ssim": s, "lpips": l})

        agg = {
            "psnr_mean": float(np.mean([v["psnr"] for v in view_metrics])),
            "ssim_mean": float(np.mean([v["ssim"] for v in view_metrics])),
            "lpips_mean": float(np.mean([v["lpips"] for v in view_metrics])),
        }
        per_panorama[pano] = {
            "distance_to_nearest_training_panorama": dist,
            "n_views": len(view_metrics),
            "aggregate": agg,
            "views": view_metrics,
        }

    all_psnr = np.array([v["aggregate"]["psnr_mean"] for v in per_panorama.values()])
    all_ssim = np.array([v["aggregate"]["ssim_mean"] for v in per_panorama.values()])
    all_lpips = np.array([v["aggregate"]["lpips_mean"] for v in per_panorama.values()])

    summary = {
        "arm_name": arm_name,
        "n_withheld_panoramas": len(per_panorama),
        "n_withheld_views_scored": sum(v["n_views"] for v in per_panorama.values()),
        "note": "primary observation unit is the panorama (n=38 aggregates below), not the 608 individual crops",
        "aggregate_over_panoramas": {
            "psnr_mean": float(all_psnr.mean()), "psnr_median": float(np.median(all_psnr)),
            "psnr_p10": float(np.percentile(all_psnr, 10)), "psnr_worst": float(all_psnr.min()),
            "ssim_mean": float(all_ssim.mean()), "ssim_median": float(np.median(all_ssim)),
            "ssim_p10": float(np.percentile(all_ssim, 10)), "ssim_worst": float(all_ssim.min()),
            "lpips_mean": float(all_lpips.mean()), "lpips_median": float(np.median(all_lpips)),
            "lpips_p10_best_case_low_is_good": float(np.percentile(all_lpips, 10)),
            "lpips_worst_high_is_bad": float(all_lpips.max()),
        },
        "per_panorama": per_panorama,
    }
    (work / f"grouped-eval-{arm_name}.json").write_text(json.dumps(summary, indent=2, default=str) + "\n", encoding="utf-8")
    return summary


def select_panels(summary_h5: dict[str, Any]) -> dict[str, str]:
    """Pick representative withheld panoramas by PSNR rank and by distance, per the brief:
    best / median / 25th-percentile / worst, plus a distance-spread sample."""
    items = sorted(summary_h5["per_panorama"].items(), key=lambda kv: kv[1]["aggregate"]["psnr_mean"])
    n = len(items)
    picks = {
        "worst": items[0][0],
        "p25": items[max(0, n // 4)][0],
        "median": items[n // 2][0],
        "best": items[-1][0],
    }
    by_dist = sorted(summary_h5["per_panorama"].items(), key=lambda kv: kv[1]["distance_to_nearest_training_panorama"])
    for tag, idx in (("dist_near", 0), ("dist_mid", n // 2), ("dist_far", n - 1)):
        picks[tag] = by_dist[idx][0]
    return picks


def render_panel(*, tensors_g5, tensors_h5, pose: dict[str, Any], src_path: Path, dest: Path) -> str:
    """SOURCE | CONTROL(G5) | SCALE-CONTROL(H5) | ERROR(H5 vs source)."""
    from PIL import Image

    src = np.asarray(Image.open(src_path).convert("RGB")).astype(np.float32) / 255.0
    rg5 = np.clip(render_layers(tensors_g5, pose, DEVICE)["rgb"], 0, 1)
    rh5 = np.clip(render_layers(tensors_h5, pose, DEVICE)["rgb"], 0, 1)
    err = np.abs(rh5 - src).mean(axis=-1)
    gap = np.zeros((src.shape[0], 6, 3), dtype=np.float32)
    err_rgb = np.stack([err, err, err], axis=-1)
    panel = np.concatenate([src, gap, rg5, gap, rh5, gap, err_rgb], axis=1)
    return to_png(panel, dest)
