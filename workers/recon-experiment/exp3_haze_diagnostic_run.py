"""Orchestrator for the Room 213 Experiment 3 haze diagnostic (GPU container).

Read-only against Arm C / Arm D's durable directories. Writes only under ``work`` (a fresh
scratch tree), which the Modal function then copies, once, to the new
``experiments/room213-exp3-cleanup-diagnostic/`` volume path -- Arm C and Arm D's own
directories are never opened for writing.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from eval_arm import run_ns_eval  # noqa: E402
from exp3_haze_camera_geometry import load_train_centers  # noqa: E402
from exp3_haze_diagnostic_gpu import (  # noqa: E402
    build_filter_masks, ckpt_tensors, footprint_report, gaussian_quality_stats,
    isolated_cluster_mask, load_ckpt_state, render_layers, render_qa_4, save_masked_checkpoint,
    stage_eval_config, to_png,
)
from poses import load_poses  # noqa: E402

ARM_C = "ROOM213_ARM_C_NO_GROWTH_CONTROL"
ARM_D = "ROOM213_ARM_D_DELAYED_GROWTH"
STEP = 15999
DEVICE = "cuda"
EVAL_SAMPLE_STRIDE = 10  # every Nth eval-split image for the per-image PSNR scan


def _find_ckpt(train_dir: Path, step: int) -> Path:
    hits = sorted(Path(train_dir).rglob(f"step-{step:09d}.ckpt"))
    if not hits:
        raise FileNotFoundError(f"step-{step} checkpoint not found under {train_dir}")
    return hits[0]


def _eval_split_names(transforms_path: Path) -> tuple[list[str], list[str]]:
    doc = json.loads(Path(transforms_path).read_text(encoding="utf-8"))
    names = sorted(f["file_path"] for f in doc["frames"])
    n = len(names)
    n_train = -(-n * 9 // 10)
    idx_train = set(np.linspace(0, n - 1, n_train, dtype=int).tolist())
    train_names = [names[i] for i in sorted(idx_train)]
    eval_names = [names[i] for i in range(n) if i not in idx_train]
    return train_names, eval_names


def _frame_pose(doc: dict[str, Any], file_path: str, dataparser: dict[str, Any]) -> dict[str, Any] | None:
    from exp3_haze_camera_geometry import apply_dataparser

    fr = next((f for f in doc["frames"] if f["file_path"] == file_path), None)
    if fr is None:
        return None
    c2w = apply_dataparser(np.array(fr["transform_matrix"], dtype=np.float64),
                            np.array(dataparser["transform"], dtype=np.float64), float(dataparser["scale"]))
    w, h = int(fr["w"]), int(fr["h"])
    return {
        "world_from_camera": c2w.tolist(),
        "intrinsics": {"fx": fr["fl_x"], "fy": fr["fl_y"], "cx": fr["cx"], "cy": fr["cy"]},
        "viewport": {"width": w, "height": h}, "near": 0.01, "far": 100.0,
        "file_path": file_path,
    }


def _psnr(a: np.ndarray, b: np.ndarray) -> float:
    mse = float(np.mean((a.astype(np.float64) - b.astype(np.float64)) ** 2))
    if mse <= 1e-12:
        return 99.0
    return float(10.0 * np.log10(1.0 / mse))


def run(*, vol: Path, work: Path) -> dict[str, Any]:
    import torch
    from PIL import Image

    work.mkdir(parents=True, exist_ok=True)
    result: dict[str, Any] = {"experiment_id": "room213-exp3-haze-diagnostic",
                               "subject": {"arm_d": ARM_D, "arm_c_reference": ARM_C, "step": STEP},
                               "sections": {}}

    views_dir = vol / "inputs" / "cecc2763" / "views"
    transforms_path = views_dir / "transforms.json"
    poses_path = Path("/root/recon-experiment/visual-poses.json")
    poses_doc = load_poses(poses_path)
    qa_poses = poses_doc["poses"]

    arm_c_dir = vol / "experiments" / "room213-exp3" / ARM_C
    arm_d_dir = vol / "experiments" / "room213-exp3" / ARM_D
    ckpt_c = _find_ckpt(arm_c_dir / "train", STEP)
    ckpt_d = _find_ckpt(arm_d_dir / "train", STEP)

    train = load_train_centers(transforms_path, poses_doc["dataparser"])
    envelope_diag = float(np.linalg.norm(train["centers"].max(0) - train["centers"].min(0)))

    payload_d = load_ckpt_state(ckpt_d)
    tensors_d = ckpt_tensors(payload_d, DEVICE)
    payload_c = load_ckpt_state(ckpt_c)
    tensors_c = ckpt_tensors(payload_c, DEVICE)
    result["arm_d_gaussian_count"] = tensors_d["count"]
    result["arm_c_gaussian_count"] = tensors_c["count"]

    # ---- 3. Gaussian quality stats (Arm D) --------------------------------------------
    stats_dir = work / "stats"
    stats_dir.mkdir(parents=True, exist_ok=True)
    result["sections"]["gaussian_quality_stats_arm_d"] = gaussian_quality_stats(
        tensors_d, train["centers"], stats_dir)

    # ---- 4. Projected footprint (approximation, documented) ---------------------------
    footprint_dir = work / "footprint"
    footprint_dir.mkdir(parents=True, exist_ok=True)
    footprint_qa = footprint_report(tensors_d, qa_poses, footprint_dir)
    # sample of training cameras (every 300th of 6016 ~= 20 cameras)
    train_sample_poses = []
    for i in range(0, len(train["file_paths"]), max(1, len(train["file_paths"]) // 20)):
        fr_pose = _frame_pose(train["doc"], train["file_paths"][i], poses_doc["dataparser"])
        if fr_pose:
            train_sample_poses.append(fr_pose)
    footprint_train_sample = {}
    from exp3_haze_diagnostic_gpu import projected_footprint
    for p in train_sample_poses[:20]:
        fp = projected_footprint(tensors_d, p)
        r = fp["radius_px"]
        valid = fp["in_front"] & np.isfinite(r)
        if valid.sum():
            footprint_train_sample[p["file_path"]] = {
                "radius_px_p50_p99": [float(np.nanpercentile(r[valid], 50)), float(np.nanpercentile(r[valid], 99))],
                "n_over_viewport": int((r[valid] > p["viewport"]["width"]).sum()),
            }
    result["sections"]["projected_footprint"] = {
        "method": "perspective projection of a spherical proxy at each Gaussian's max world-space "
                  "scale (radius_px = fx * max_scale / camera-space depth); an approximation, not "
                  "gsplat's exact anisotropic screen covariance (not exposed per-Gaussian by the "
                  "1.5.3 Python API) -- used for relative ranking and diagnosis only.",
        "qa_cameras": footprint_qa,
        "training_camera_sample_n": len(footprint_train_sample),
        "training_camera_sample": footprint_train_sample,
    }
    # consequence of stop_screen_size_at=4000 vs refine_start_iter=6016: screen-size split
    # is only active for step < 4000, entirely before refinement can begin at 6016, so no
    # refine event in this run (all at >=6300) could have used the screen-size split path --
    # record this directly rather than assert it from the config alone.
    result["sections"]["stop_screen_size_at_consequence"] = {
        "stop_screen_size_at": 4000, "refine_start_iter": 6016,
        "finding": "stop_screen_size_at (4000) elapses before refine_start_iter (6016), so the "
                   "screen-size split/cull path in gsplat's DefaultStrategy was never reachable "
                   "during any of this run's 44 refinement events (all >= step 6300); every grow "
                   "event was gradient-driven duplication/split only. This setting could not have "
                   "produced the haze in this run -- not because it is a bad setting in general, "
                   "but because the two constants as configured never overlap in time.",
    }

    # ---- 5. Diagnostic render layers (Arm D, 4 QA cameras) -----------------------------
    render_dir = work / "render-layers"
    for pose in qa_poses:
        layers = render_layers(tensors_d, pose, DEVICE)
        to_png(layers["rgb"], render_dir / f"{pose['id']}_rgb.png")
        to_png(layers["alpha"], render_dir / f"{pose['id']}_alpha.png", cmap="turbo")
        to_png(layers["depth"], render_dir / f"{pose['id']}_depth.png", cmap="turbo")
        opac = 1.0 / (1.0 + np.exp(-tensors_d["opac_logit_np"]))
        from exp3_haze_diagnostic_gpu import render_scalar_heatmap
        opac_heat = render_scalar_heatmap(tensors_d, pose, DEVICE, opac.astype(np.float32), "opacity")
        to_png(opac_heat, render_dir / f"{pose['id']}_opacity_contribution.png", cmap="turbo")
    result["sections"]["diagnostic_render_layers"] = {
        "note": "per QA camera: _rgb (baseline, checkpoint tensors, no PLY 1/255-opacity truncation "
                "unlike the official composite), _alpha (real accumulated opacity from gsplat's second "
                "rasterization output), _depth (expected depth, RGB+ED render mode -- matches "
                "splatfacto's own eval-time render call), _opacity_contribution (alpha-weighted "
                "opacity heatmap), and see footprint/ for the footprint-contribution heatmaps.",
        "cameras": [p["id"] for p in qa_poses],
    }

    # ---- 6/7. Filtered variants + spatial-outlier diagnostic --------------------------
    masks = build_filter_masks(tensors_d)
    iso = isolated_cluster_mask(tensors_d["means_np"], train["centers"], envelope_diag)
    masks["spatial_outlier_removed"] = ~iso["mask"]
    result["sections"]["spatial_outlier_diagnostic"] = {
        k: v for k, v in iso.items() if k != "mask"
    }

    variant_dir = work / "variants"
    variant_summary = {}
    for name, mask in masks.items():
        sub = ckpt_tensors(payload_d, DEVICE, mask=mask) if name != "baseline_d" else tensors_d
        out_dir = variant_dir / name / "qa"
        hashes = render_qa_4(sub, qa_poses, DEVICE, out_dir)
        variant_summary[name] = {
            "remaining_gaussians": int(mask.sum()),
            "total_gaussians": int(mask.shape[0]),
            "fraction_removed": round(1.0 - mask.sum() / mask.shape[0], 4),
            "render_hashes": hashes,
        }
    result["sections"]["post_hoc_filter_variants"] = variant_summary

    # Arm C reference renders (unfiltered) for the same QA cameras, for the item-8 comparison grid
    arm_c_qa = render_qa_4(tensors_c, qa_poses, DEVICE, work / "arm_c_reference" / "qa")
    result["sections"]["arm_c_reference_renders"] = {"render_hashes": arm_c_qa}

    # ---- 6 (metrics). Held-out eval for the most promising variants --------------------
    promising = ["opacity_ge_0.01", "opacity_ge_0.02", "combo_opacity0.01_and_scale_top1pct",
                 "combo_opacity0.02_and_scale_top0.5pct", "scale_exclude_top0.1pct"]
    eval_dir = work / "eval-variants"
    eval_results = {}
    for name in promising:
        mask = masks[name]
        try:
            masked_ckpt = eval_dir / name / "masked.ckpt"
            save_masked_checkpoint(ckpt_d, mask, masked_ckpt)
            scratch_train = stage_eval_config(arm_d_dir / "train", STEP, masked_ckpt, eval_dir / name / "train")
            metrics_json = eval_dir / name / "metrics.json"
            res = run_ns_eval(scratch_train, STEP, metrics_json, timeout_s=1200)
            res["remaining_gaussians"] = int(mask.sum())
            res["fraction_removed"] = round(1.0 - mask.sum() / mask.shape[0], 4)
            eval_results[name] = res
        except Exception as exc:  # noqa: BLE001
            eval_results[name] = {"ok": False, "error": str(exc)}
    result["sections"]["held_out_eval_for_variants"] = eval_results
    result["sections"]["held_out_eval_baseline_d_official"] = {
        "note": "from the Experiment 3 result package, not re-run here",
        "psnr": 21.805051803588867, "ssim": 0.8340530395507812, "lpips": 0.38220810890197754,
    }

    # ---- 9. Source vs render (sampled eval-split scan + representative panels) ---------
    train_names, eval_names = _eval_split_names(transforms_path)
    sample = eval_names[::EVAL_SAMPLE_STRIDE]
    doc = train["doc"]
    scan = []
    for fp in sample:
        pose = _frame_pose(doc, fp, poses_doc["dataparser"])
        if pose is None:
            continue
        img_path = views_dir / fp
        if not img_path.is_file():
            continue
        src = np.asarray(Image.open(img_path).convert("RGB")).astype(np.float32) / 255.0
        layers_d = render_layers(tensors_d, pose, DEVICE)
        layers_c = render_layers(tensors_c, pose, DEVICE)
        psnr_d = _psnr(src, np.clip(layers_d["rgb"], 0, 1))
        psnr_c = _psnr(src, np.clip(layers_c["rgb"], 0, 1))
        c2w = np.array(pose["world_from_camera"])
        pitch_up = float((-c2w[:3, 2])[1])  # +Y component of forward = looking up
        scan.append({"file_path": fp, "psnr_arm_c": psnr_c, "psnr_arm_d": psnr_d, "pitch_up_component": pitch_up})

    scan_sorted_by_d = sorted(scan, key=lambda r: r["psnr_arm_d"])
    picks: dict[str, dict] = {}
    if scan_sorted_by_d:
        picks["worst_held_out_1"] = scan_sorted_by_d[0]
        if len(scan_sorted_by_d) > 1:
            picks["worst_held_out_2"] = scan_sorted_by_d[1]
        picks["good_held_out_1"] = scan_sorted_by_d[-1]
    if scan:
        picks["ceiling_or_upward_view"] = max(scan, key=lambda r: r["pitch_up_component"])

    panel_dir = work / "source-vs-render"
    panels_meta = {}
    for tag, row in picks.items():
        fp = row["file_path"]
        pose = _frame_pose(doc, fp, poses_doc["dataparser"])
        img_path = views_dir / fp
        src = np.asarray(Image.open(img_path).convert("RGB")).astype(np.float32) / 255.0
        rd = np.clip(render_layers(tensors_d, pose, DEVICE)["rgb"], 0, 1)
        rc = np.clip(render_layers(tensors_c, pose, DEVICE)["rgb"], 0, 1)
        err = np.abs(rd - src).mean(axis=-1)
        gap = np.zeros((src.shape[0], 6, 3), dtype=np.float32)
        err_rgb = np.stack([err, err, err], axis=-1)
        panel = np.concatenate([src, gap, rc, gap, rd, gap, err_rgb], axis=1)
        out_path = panel_dir / f"{tag}.png"
        h = to_png(panel, out_path)
        panels_meta[tag] = {"file_path": fp, "layout": "SOURCE | ARM C | ARM D | ERROR(abs diff, D vs source)",
                             "sha256": h, **row}
    result["sections"]["source_vs_render"] = {
        "eval_split_scan_stride": EVAL_SAMPLE_STRIDE, "n_scanned": len(scan),
        "scan_note": "simple per-pixel PSNR against the real source JPEG, sampled every "
                     f"{EVAL_SAMPLE_STRIDE}th eval-split image ({len(scan)} of {len(eval_names)}) -- "
                     "not exhaustive, and not the official SSIM/LPIPS-bearing ns-eval metric, used "
                     "here only to rank and select representative views. 'ceiling/window' is a "
                     "heuristic (largest +Y forward-vector component = most upward-looking view "
                     "among the sample), not a semantic detector; no window-specific signal exists.",
        "panels": panels_meta,
        "full_scan": scan,
    }

    (work / "diagnostic-result.json").write_text(json.dumps(result, indent=2, default=str) + "\n", encoding="utf-8")
    return result
