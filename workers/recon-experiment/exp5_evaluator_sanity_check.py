"""Evaluator sanity check, required before Experiment 5 launch: score the exact same image
via (a) stock nerfstudio ns-eval's own per-image path (pipeline.model.get_outputs_for_camera
+ get_image_metrics_and_images, the literal functions ns-eval's averaging loop calls) and
(b) the new direct grouped-eval renderer (checkpoint tensors -> gsplat rasterization ->
exp5_grouped_eval's metric objects). Uses an EXISTING checkpoint (D4, Experiment 4) and one
of its own eval-split images, so path (a) is guaranteed valid. Read-only; trains nothing.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from eval_arm import find_config, _config_at_step  # noqa: E402
from exp3_haze_diagnostic_gpu import ckpt_tensors, load_ckpt_state, render_layers, stage_eval_config, to_png  # noqa: E402
from exp5_grouped_eval import _metric_objects, _to_nchw, _frame_pose  # noqa: E402
from poses import load_poses  # noqa: E402


def main() -> None:
    import torch
    from PIL import Image
    from nerfstudio.utils.eval_utils import eval_setup

    vol = Path("/vol")
    work = Path("/tmp") / "exp5-sanity-check"
    work.mkdir(parents=True, exist_ok=True)

    # ---- (a) stock nerfstudio path, exactly what ns-eval's averaging loop calls per image
    # config.yml's own output_dir points at the ORIGINAL training container's now-gone /tmp
    # path (see docs/ops/ROOM213_EXP3_HAZE_DIAGNOSTIC.md sec 11 for the same bug found and
    # fixed there); reuse the same fix rather than duplicate it: stage the real, unmodified
    # checkpoint through stage_eval_config so eval_setup's own output_dir/experiment_name/
    # method_name/timestamp reconstruction resolves correctly in THIS container.
    arm_dir = vol / "experiments" / "room213-exp4" / "ROOM213_D4_CONTROL"
    train_dir = arm_dir / "train"
    real_ckpt = sorted(train_dir.rglob("step-000015999.ckpt"))[0]
    staged_train_dir = stage_eval_config(train_dir, 15999, real_ckpt, work / "d4-staged" / "train")
    pinned = find_config(staged_train_dir)
    config, pipeline, checkpoint_path, step = eval_setup(pinned)

    loader = pipeline.datamanager.fixed_indices_eval_dataloader
    camera, batch = next(iter(loader))
    idx = 0
    file_path = str(pipeline.datamanager.eval_dataset.image_filenames[idx])
    file_name = Path(file_path).name

    outputs = pipeline.model.get_outputs_for_camera(camera=camera)
    ns_metrics, ns_images = pipeline.model.get_image_metrics_and_images(outputs, batch)
    ns_rgb = outputs["rgb"].detach().clamp(0, 1).cpu().numpy()  # [H, W, 3]
    ns_camera_h = int(camera.height.item())
    ns_camera_w = int(camera.width.item())

    # ---- (b) direct grouped-eval path: same checkpoint, same physical image
    payload = load_ckpt_state(checkpoint_path)
    tensors = ckpt_tensors(payload, "cuda")

    views_dir = vol / "inputs" / "cecc2763" / "views"
    doc = json.loads((views_dir / "transforms.json").read_text(encoding="utf-8"))
    fr = next(f for f in doc["frames"] if Path(f["file_path"]).name == file_name)
    poses_doc = load_poses(Path("/root/recon-experiment/visual-poses.json"))
    pose = _frame_pose(fr, poses_doc["dataparser"])
    layers = render_layers(tensors, pose, "cuda")
    direct_rgb = np.clip(layers["rgb"], 0, 1).astype(np.float32)

    src = np.asarray(Image.open(views_dir / "images" / file_name).convert("RGB")).astype(np.float32) / 255.0

    psnr_m, ssim_m, lpips_m = _metric_objects("cuda")
    gt_t = _to_nchw(src, "cuda")
    direct_t = _to_nchw(direct_rgb, "cuda")
    direct_metrics = {
        "psnr": float(psnr_m(gt_t, direct_t).item()),
        "ssim": float(ssim_m(gt_t, direct_t)),
        "lpips": float(lpips_m(gt_t, direct_t).item()),
    }

    # cross-check: score nerfstudio's OWN render against MY metric objects too, to isolate
    # "rendering differs" from "metric computation differs"
    ns_rgb_t = _to_nchw(ns_rgb, "cuda")
    ns_render_via_my_metrics = {
        "psnr": float(psnr_m(gt_t, ns_rgb_t).item()),
        "ssim": float(ssim_m(gt_t, ns_rgb_t)),
        "lpips": float(lpips_m(gt_t, ns_rgb_t).item()),
    }

    to_png(ns_rgb, work / "ns_render.png")
    to_png(direct_rgb, work / "direct_render.png")
    to_png(src, work / "source.png")
    render_diff = np.abs(ns_rgb - direct_rgb)
    to_png(render_diff.mean(axis=-1), work / "render_diff_heatmap.png", cmap="turbo")

    out = {
        "checkpoint": str(checkpoint_path),
        "step": int(step),
        "eval_image_file": file_name,
        "resolution": {
            "nerfstudio_camera_hw": [ns_camera_h, ns_camera_w],
            "direct_pose_viewport": [pose["viewport"]["height"], pose["viewport"]["width"]],
            "match": (ns_camera_h, ns_camera_w) == (pose["viewport"]["height"], pose["viewport"]["width"]),
        },
        "nerfstudio_ns_eval_path": {
            "psnr": ns_metrics["psnr"], "ssim": ns_metrics["ssim"], "lpips": ns_metrics["lpips"],
        },
        "direct_grouped_eval_path": direct_metrics,
        "nerfstudio_render_scored_by_my_metrics": ns_render_via_my_metrics,
        "deltas": {
            "psnr_ns_vs_direct": ns_metrics["psnr"] - direct_metrics["psnr"],
            "ssim_ns_vs_direct": ns_metrics["ssim"] - direct_metrics["ssim"],
            "lpips_ns_vs_direct": ns_metrics["lpips"] - direct_metrics["lpips"],
            "psnr_metric_object_isolation": ns_metrics["psnr"] - ns_render_via_my_metrics["psnr"],
            "ssim_metric_object_isolation": ns_metrics["ssim"] - ns_render_via_my_metrics["ssim"],
            "lpips_metric_object_isolation": ns_metrics["lpips"] - ns_render_via_my_metrics["lpips"],
        },
        "render_pixel_diff_mean_abs": float(render_diff.mean()),
        "render_pixel_diff_max_abs": float(render_diff.max()),
    }
    (work / "sanity-check.json").write_text(json.dumps(out, indent=2, default=str) + "\n", encoding="utf-8")
    print(json.dumps(out, indent=2, default=str))

    durable = vol / "experiments" / "room213-exp5-sanity-check"
    import shutil
    if durable.exists():
        shutil.rmtree(durable)
    shutil.copytree(work, durable)


if __name__ == "__main__":
    main()
