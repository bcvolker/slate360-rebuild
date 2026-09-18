"""Room 213 Experiment 3 post-hoc haze diagnostic — GPU half (checkpoint stats, footprint,
diagnostic render layers, post-hoc filter variants, spatial-outlier check, source-vs-render).

Runs read-only against the frozen Arm C / Arm D step-15999 checkpoints. Never writes to
their durable directories. All outputs go to a new, separate tree:
``experiments/room213-exp3-cleanup-diagnostic/`` on the Modal volume.

No retraining. Filtered "variants" are boolean masks applied to a checkpoint's Gaussian
tensors at render/eval time (and, for the handful selected for held-out metrics, written to
a *new* checkpoint file in a scratch directory so the existing, validated ``ns-eval`` CLI
path can be reused unmodified) -- the original checkpoint file on the volume is never
opened in write mode.
"""
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path
from typing import Any, Callable

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hashes import sha256_file  # noqa: E402
from poses import apply_dataparser, gl_c2w_to_cv_w2c, load_poses  # noqa: E402

CKPT_KEY = "_model.gauss_params.{}"
GAUSS_FIELDS = ("means", "scales", "quats", "opacities", "features_dc", "features_rest")
SH_DEGREE = 3


# --------------------------------------------------------------------------- checkpoint I/O
def load_ckpt_state(ckpt_path: Path) -> dict[str, Any]:
    import torch

    payload = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    return payload


def ckpt_tensors(payload: dict[str, Any], device: str, mask: "np.ndarray | None" = None) -> dict[str, Any]:
    import torch
    import torch.nn.functional as F

    pipe = payload["pipeline"]
    raw = {f: pipe[CKPT_KEY.format(f)] for f in GAUSS_FIELDS}
    if mask is not None:
        idx = torch.from_numpy(np.nonzero(mask)[0].astype(np.int64))
        raw = {k: v[idx] for k, v in raw.items()}
    means = raw["means"].to(device).float()
    quats = F.normalize(raw["quats"].to(device).float(), dim=-1)  # native wxyz, no reorder
    scales_log = raw["scales"].to(device).float()
    scales = torch.exp(scales_log)
    opac_logit = raw["opacities"].to(device).float().squeeze(-1)
    opacities = torch.sigmoid(opac_logit)
    colors = torch.cat((raw["features_dc"][:, None, :], raw["features_rest"]), dim=1).to(device).float()
    return {
        "means": means, "quats": quats, "scales": scales, "opacities": opacities, "colors": colors,
        "sh_degree": SH_DEGREE, "count": int(means.shape[0]),
        "scales_log_np": scales_log.detach().cpu().numpy(),
        "opac_logit_np": opac_logit.detach().cpu().numpy(),
        "means_np": means.detach().cpu().numpy(),
    }


def save_masked_checkpoint(orig_ckpt_path: Path, mask: np.ndarray, dest_ckpt: Path) -> dict[str, Any]:
    """Write a NEW checkpoint (never the original) whose gauss_params tensors are sliced by
    mask. Optimizer/scheduler state is dropped -- ns-eval never resumes training, and
    splatfacto's own ``load_state_dict`` resizes ``gauss_params`` from the checkpoint's own
    tensor shapes (see nerfstudio 1.1.5 SplatfactoModel.load_state_dict), so a smaller-N
    state dict loads cleanly."""
    import torch

    payload = torch.load(orig_ckpt_path, map_location="cpu", weights_only=False)
    idx = torch.from_numpy(np.nonzero(mask)[0].astype(np.int64))
    pipe = dict(payload["pipeline"])
    for f in GAUSS_FIELDS:
        key = CKPT_KEY.format(f)
        pipe[key] = pipe[key][idx].clone()
    new_payload = {"step": payload["step"], "pipeline": pipe}  # no optimizers/schedulers
    dest_ckpt.parent.mkdir(parents=True, exist_ok=True)
    torch.save(new_payload, dest_ckpt)
    return {"dest": str(dest_ckpt), "kept": int(mask.sum()), "total": int(mask.shape[0]),
            "sha256": sha256_file(dest_ckpt)}


def stage_eval_config(train_dir: Path, step: int, masked_ckpt: Path, dest_train_dir: Path) -> Path:
    """Build a scratch train_dir ns-eval can load a masked checkpoint from.

    nerfstudio's ``eval_load_checkpoint`` does not locate the checkpoint relative to
    ``config.yml``'s own location -- it rebuilds the path as
    ``config.output_dir / experiment_name / method_name / timestamp / "nerfstudio_models"``
    from fields stored *inside* config.yml. Those fields still point at the ORIGINAL
    training container's ``/tmp/exp3/<ARM>/train`` path, which does not exist in this
    (separate) diagnostic container. So this rewrites ``output_dir`` inside a fresh copy of
    config.yml (loaded/dumped through nerfstudio's own full-object YAML round trip -- the
    same mechanism nerfstudio itself uses) to point at ``dest_train_dir``, and places the
    masked checkpoint at the exact nested path that rewritten config now expects. Nothing
    under ``train_dir`` (the real Arm C/D directory) is opened for writing.
    """
    import yaml

    ckpts = sorted(Path(train_dir).rglob("step-*.ckpt"))
    if not ckpts:
        raise FileNotFoundError(f"no checkpoints under {train_dir}")
    run_dir = ckpts[-1].parent.parent
    cfg_path = run_dir / "config.yml"

    cfg = yaml.load(cfg_path.read_text(encoding="utf-8"), Loader=yaml.Loader)
    cfg.output_dir = dest_train_dir
    dest_train_dir.mkdir(parents=True, exist_ok=True)
    dest_cfg_path = dest_train_dir / "config.yml"
    dest_cfg_path.write_text(yaml.dump(cfg), encoding="utf-8")

    model_dir = dest_train_dir / cfg.experiment_name / cfg.method_name / cfg.timestamp / "nerfstudio_models"
    model_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(masked_ckpt, model_dir / f"step-{step:09d}.ckpt")
    # eval_arm.find_config() looks for config.yml as a sibling two levels above the checkpoint
    shutil.copy2(dest_cfg_path, model_dir.parent / "config.yml")
    return dest_train_dir


# --------------------------------------------------------------------------- rendering
def _render_raw(tensors: dict[str, Any], view: np.ndarray, K: np.ndarray, w: int, h: int,
                 device: str, render_mode: str, sh_degree: int, near: float, far: float,
                 override_colors: "Any | None" = None):
    import torch
    from gsplat.rendering import rasterization

    colors = override_colors if override_colors is not None else tensors["colors"]
    sh_deg = 0 if override_colors is not None else sh_degree
    with torch.no_grad():
        out, alpha, meta = rasterization(
            means=tensors["means"], quats=tensors["quats"], scales=tensors["scales"],
            opacities=tensors["opacities"], colors=colors,
            viewmats=torch.from_numpy(view)[None].to(device).float(),
            Ks=torch.from_numpy(K)[None].to(device).float(),
            width=w, height=h, packed=False, sh_degree=sh_deg, render_mode=render_mode,
            near_plane=near, far_plane=far,
        )
    return out, alpha, meta


def render_layers(tensors: dict[str, Any], pose: dict[str, Any], device: str) -> dict[str, np.ndarray]:
    """RGB, accumulated alpha, expected depth -- one RGB+ED pass (matches splatfacto's own
    eval-time render_mode, see nerfstudio 1.1.5 SplatfactoModel.get_outputs)."""
    c2w = np.array(pose["world_from_camera"], dtype=np.float32)
    view = gl_c2w_to_cv_w2c(c2w).astype(np.float32)
    K = pose["intrinsics"]
    w, h = int(pose["viewport"]["width"]), int(pose["viewport"]["height"])
    Kmat = np.array([[K["fx"], 0, K["cx"]], [0, K["fy"], K["cy"]], [0, 0, 1]], dtype=np.float32)
    near, far = float(pose.get("near") or 0.01), float(pose.get("far") or 100.0)
    out, alpha, _ = _render_raw(tensors, view, Kmat, w, h, device, "RGB+ED", tensors["sh_degree"], near, far)
    out = out[0].detach().cpu().numpy()
    rgb = np.clip(out[..., :3], 0, 1)
    depth = out[..., 3]
    alpha_img = alpha[0, ..., 0].detach().cpu().numpy()
    return {"rgb": rgb, "alpha": alpha_img, "depth": depth}


def render_scalar_heatmap(tensors: dict[str, Any], pose: dict[str, Any], device: str,
                           scalar: np.ndarray, label: str) -> np.ndarray:
    """Alpha-composite a per-Gaussian scalar (normalized 0..1, broadcast to gray RGB) through
    the real rasterizer -- a legitimate 3DGS debugging technique: the resulting pixel value is
    the true alpha-weighted contribution of that scalar from every Gaussian touching the pixel,
    not a synthetic overlay."""
    import torch

    c2w = np.array(pose["world_from_camera"], dtype=np.float32)
    view = gl_c2w_to_cv_w2c(c2w).astype(np.float32)
    K = pose["intrinsics"]
    w, h = int(pose["viewport"]["width"]), int(pose["viewport"]["height"])
    Kmat = np.array([[K["fx"], 0, K["cx"]], [0, K["fy"], K["cy"]], [0, 0, 1]], dtype=np.float32)
    near, far = float(pose.get("near") or 0.01), float(pose.get("far") or 100.0)
    gray = torch.from_numpy(scalar.astype(np.float32)).to(tensors["means"].device)
    colors = gray[:, None, None].expand(-1, 1, 3).contiguous()
    out, _, _ = _render_raw(tensors, view, Kmat, w, h, device, "RGB", 0, near, far, override_colors=colors)
    return np.clip(out[0].detach().cpu().numpy()[..., 0], 0, 1)


def to_png(arr: np.ndarray, dest: Path, cmap: str = "gray") -> str:
    from PIL import Image

    dest.parent.mkdir(parents=True, exist_ok=True)
    if arr.ndim == 2:
        if cmap == "turbo":
            img8 = _turbo(np.clip(arr, 0, 1))
        else:
            a = np.clip(arr, np.nanpercentile(arr, 1), np.nanpercentile(arr, 99))
            a = (a - a.min()) / max(1e-6, (a.max() - a.min()))
            img8 = np.stack([a, a, a], axis=-1)
        Image.fromarray((img8 * 255).astype(np.uint8)).save(dest)
    else:
        Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8)).save(dest)
    return sha256_file(dest)


def _turbo(x: np.ndarray) -> np.ndarray:
    # Minimal 5-stop approximation of the turbo colormap; no matplotlib dependency.
    stops = np.array([[0.19, 0.07, 0.23], [0.28, 0.49, 0.95], [0.15, 0.87, 0.62],
                       [0.96, 0.85, 0.16], [0.90, 0.16, 0.11]])
    t = np.clip(x, 0, 1) * (len(stops) - 1)
    i0 = np.clip(t.astype(int), 0, len(stops) - 2)
    f = (t - i0)[..., None]
    return stops[i0] * (1 - f) + stops[i0 + 1] * f


# --------------------------------------------------------------------------- statistics
def _hist2d_png(x: np.ndarray, y: np.ndarray, dest: Path, xlabel: str, ylabel: str,
                 xlog: bool = False, ylog: bool = False, bins: int = 160) -> str:
    xv = np.log10(np.clip(x, 1e-12, None)) if xlog else x
    yv = np.log10(np.clip(y, 1e-12, None)) if ylog else y
    finite = np.isfinite(xv) & np.isfinite(yv)
    xv, yv = xv[finite], yv[finite]
    h, xe, ye = np.histogram2d(xv, yv, bins=bins)
    h = np.log1p(h.T)
    h = h / max(1e-6, h.max())
    dest.parent.mkdir(parents=True, exist_ok=True)
    from PIL import Image

    img = _turbo(h)
    Image.fromarray((img * 255).astype(np.uint8)).resize((640, 640), Image.NEAREST).save(dest)
    return json.dumps({
        "x": xlabel + (" (log10)" if xlog else ""), "y": ylabel + (" (log10)" if ylog else ""),
        "x_range": [float(xe[0]), float(xe[-1])], "y_range": [float(ye[0]), float(ye[-1])],
        "sha256": sha256_file(dest),
    })


def gaussian_quality_stats(tensors: dict[str, Any], train_centers: np.ndarray, out_dir: Path) -> dict[str, Any]:
    scales = np.exp(tensors["scales_log_np"])  # (N,3) world-space stddev
    opac = 1.0 / (1.0 + np.exp(-tensors["opac_logit_np"]))
    means = tensors["means_np"]
    max_scale = scales.max(axis=1)
    geo_mean_scale = np.cbrt(np.prod(np.clip(scales, 1e-12, None), axis=1))
    min_scale = np.clip(scales.min(axis=1), 1e-12, None)
    anisotropy = max_scale / min_scale
    # nearest training-camera distance per gaussian (chunked to bound memory)
    dist = np.empty(means.shape[0], dtype=np.float32)
    chunk = 20000
    for i in range(0, means.shape[0], chunk):
        d = np.linalg.norm(means[i:i + chunk, None, :] - train_centers[None, :, :], axis=2)
        dist[i:i + chunk] = d.min(axis=1)

    def pct(a: np.ndarray, p: float) -> float:
        return float(np.percentile(a, p))

    def topn(a: np.ndarray, frac: float) -> dict[str, Any]:
        k = max(1, int(round(a.shape[0] * frac)))
        idx = np.argpartition(-a, k - 1)[:k]
        return {"n": int(k), "fraction": frac, "threshold_value": float(a[idx].min()),
                "mean_opacity_in_group": float(opac[idx].mean()),
                "mean_distance_to_nearest_train_camera_in_group": float(dist[idx].mean())}

    stats: dict[str, Any] = {
        "count": int(means.shape[0]),
        "opacity": {"mean": float(opac.mean()), "median": float(np.median(opac)),
                    "p05_p25_p50_p75_p95": [pct(opac, p) for p in (5, 25, 50, 75, 95)]},
        "scale_max": {"mean": float(max_scale.mean()), "median": float(np.median(max_scale)),
                      "p50_p90_p95_p99_p999": [pct(max_scale, p) for p in (50, 90, 95, 99, 99.9)]},
        "scale_geomean": {"mean": float(geo_mean_scale.mean()), "median": float(np.median(geo_mean_scale))},
        "anisotropy_max_over_min": {"mean": float(anisotropy.mean()), "median": float(np.median(anisotropy)),
                                     "p95_p99": [pct(anisotropy, p) for p in (95, 99)]},
        "distance_to_nearest_train_camera": {
            "mean": float(dist.mean()), "median": float(np.median(dist)),
            "p50_p90_p95_p99": [pct(dist, p) for p in (50, 90, 95, 99)],
        },
        "largest_by_max_scale": {
            "top5pct": topn(max_scale, 0.05), "top1pct": topn(max_scale, 0.01),
            "top0.5pct": topn(max_scale, 0.005), "top0.1pct": topn(max_scale, 0.001),
        },
    }
    # correlation: does the top-0.1% largest-scale group concentrate low opacity and/or
    # large distance-to-nearest-camera relative to the whole population?
    k01 = max(1, int(round(means.shape[0] * 0.001)))
    idx01 = np.argpartition(-max_scale, k01 - 1)[:k01]
    stats["top0.1pct_vs_population"] = {
        "population_mean_opacity": float(opac.mean()),
        "top0.1pct_mean_opacity": float(opac[idx01].mean()),
        "population_mean_dist_to_nearest_cam": float(dist.mean()),
        "top0.1pct_mean_dist_to_nearest_cam": float(dist[idx01].mean()),
        "population_median_dist_to_nearest_cam": float(np.median(dist)),
        "top0.1pct_median_dist_to_nearest_cam": float(np.median(dist[idx01])),
    }
    stats["joint_histograms"] = {
        "opacity_vs_max_scale": json.loads(_hist2d_png(
            opac, max_scale, out_dir / "hist_opacity_vs_maxscale.png",
            "opacity", "max_scale", ylog=True)),
        "opacity_vs_distance_to_nearest_camera": json.loads(_hist2d_png(
            opac, dist, out_dir / "hist_opacity_vs_distcam.png",
            "opacity", "dist_to_nearest_train_cam")),
        "max_scale_vs_distance_to_nearest_camera": json.loads(_hist2d_png(
            max_scale, dist, out_dir / "hist_maxscale_vs_distcam.png",
            "max_scale", "dist_to_nearest_train_cam", xlog=True)),
    }
    return stats


# --------------------------------------------------------------------------- footprint
def projected_footprint(tensors: dict[str, Any], pose: dict[str, Any]) -> dict[str, Any]:
    """Practical, documented approximation: project each Gaussian's *maximum* world-space
    scale as a spherical proxy through the pinhole model (radius_px = f * s_max / depth).
    This is a first-order footprint bound, not gsplat's exact anisotropic screen-space
    covariance (which is internal to the CUDA rasterizer and not exposed per-Gaussian by the
    1.5.3 Python API) -- reported here as an approximation and used only for relative
    ranking/diagnosis, never as a physical measurement."""
    c2w = np.array(pose["world_from_camera"], dtype=np.float64)
    view = gl_c2w_to_cv_w2c(c2w)
    means_h = np.concatenate([tensors["means_np"], np.ones((tensors["means_np"].shape[0], 1))], axis=1)
    cam = (view @ means_h.T).T  # (N,4), OpenCV convention: +Z forward
    depth = cam[:, 2]
    f = float(pose["intrinsics"]["fx"])
    max_scale = np.exp(tensors["scales_log_np"]).max(axis=1)
    in_front = depth > 1e-4
    radius_px = np.full(depth.shape[0], np.nan, dtype=np.float64)
    radius_px[in_front] = f * max_scale[in_front] / depth[in_front]
    w = int(pose["viewport"]["width"])
    return {"radius_px": radius_px, "depth": depth, "in_front": in_front, "viewport_w": w}


def footprint_report(tensors: dict[str, Any], qa_poses: list[dict], out_dir: Path) -> dict[str, Any]:
    opac = 1.0 / (1.0 + np.exp(-tensors["opac_logit_np"]))
    report: dict[str, Any] = {}
    for pose in qa_poses:
        fp = projected_footprint(tensors, pose)
        r = fp["radius_px"]
        valid = fp["in_front"] & np.isfinite(r)
        w = fp["viewport_w"]
        large_thresh = np.nanpercentile(r[valid], 99.5) if valid.sum() else float("nan")
        large = valid & (r > large_thresh)
        report[pose["id"]] = {
            "category": pose["category"],
            "n_in_front": int(valid.sum()),
            "radius_px_p50_p90_p99_p999": [float(np.nanpercentile(r[valid], p)) for p in (50, 90, 99, 99.9)] if valid.sum() else None,
            "n_footprint_over_viewport": int((r[valid] > w).sum()) if valid.sum() else 0,
            "large_footprint_group": {
                "threshold_px_p99.5": float(large_thresh),
                "n": int(large.sum()),
                "mean_opacity": float(opac[large].mean()) if large.sum() else None,
                "mean_opacity_population": float(opac[valid].mean()) if valid.sum() else None,
            } if valid.sum() else None,
        }
        heat = render_scalar_heatmap(
            tensors, pose, "cuda", np.clip(np.nan_to_num(r, nan=0.0) / max(1.0, np.nanmax(r[valid]) if valid.sum() else 1.0), 0, 1),
            f"footprint_{pose['id']}")
        to_png(heat, out_dir / f"footprint_heatmap_{pose['id']}.png", cmap="turbo")
    return report


# --------------------------------------------------------------------------- filter masks
def build_filter_masks(tensors: dict[str, Any]) -> dict[str, np.ndarray]:
    opac = 1.0 / (1.0 + np.exp(-tensors["opac_logit_np"]))
    max_scale = np.exp(tensors["scales_log_np"]).max(axis=1)
    n = opac.shape[0]

    def scale_below_pct(p: float) -> np.ndarray:
        thresh = np.percentile(max_scale, 100 - p)
        return max_scale <= thresh

    masks = {
        "baseline_d": np.ones(n, dtype=bool),
        "opacity_ge_0.005": opac >= 0.005,
        "opacity_ge_0.01": opac >= 0.01,
        "opacity_ge_0.02": opac >= 0.02,
        "opacity_ge_0.05": opac >= 0.05,
        "scale_exclude_top1pct": scale_below_pct(1.0),
        "scale_exclude_top0.5pct": scale_below_pct(0.5),
        "scale_exclude_top0.1pct": scale_below_pct(0.1),
    }
    masks["combo_opacity0.01_and_scale_top1pct"] = masks["opacity_ge_0.01"] & masks["scale_exclude_top1pct"]
    masks["combo_opacity0.02_and_scale_top0.5pct"] = masks["opacity_ge_0.02"] & masks["scale_exclude_top0.5pct"]
    return masks


def isolated_cluster_mask(means: np.ndarray, train_centers: np.ndarray, envelope_diag: float) -> dict[str, Any]:
    """Non-destructive diagnostic: flag Gaussians whose distance to their own 8th-nearest
    Gaussian neighbor is large relative to the local median (sparse/isolated) AND whose
    distance to the nearest training-camera trajectory point exceeds the scene envelope
    diagonal (clearly outside the walked volume). Both conditions must hold, so ordinary
    room geometry (dense, close to the walked path) is never flagged."""
    try:
        from scipy.spatial import cKDTree
        tree = cKDTree(means)
        k = 9
        d, _ = tree.query(means, k=k)
        local_nn = d[:, 1:].mean(axis=1)
        method = "scipy.cKDTree, 8-NN mean distance"
    except Exception:  # pragma: no cover - fallback if scipy is unavailable
        # Coarse voxel density fallback: local_nn approximated by inverse cube-root of
        # per-voxel occupancy count (larger for sparser voxels).
        vox = 0.02 * envelope_diag
        keys = np.floor(means / vox).astype(np.int64)
        _, inv, counts = np.unique(keys, axis=0, return_inverse=True, return_counts=True)
        local_nn = vox / np.cbrt(counts[inv])
        method = "voxel-occupancy fallback (scipy unavailable)"
    sparse_thresh = np.percentile(local_nn, 99.0)
    sample_centers = train_centers[:: max(1, train_centers.shape[0] // 100)][:100]
    cam_dist = np.empty(means.shape[0], dtype=np.float32)
    chunk = 20000
    for i in range(0, means.shape[0], chunk):
        d = np.linalg.norm(means[i:i + chunk, None, :] - sample_centers[None, :, :], axis=2)
        cam_dist[i:i + chunk] = d.min(axis=1)
    outside = cam_dist > envelope_diag
    isolated = (local_nn > sparse_thresh) & outside
    return {
        "method": method,
        "n_flagged": int(isolated.sum()),
        "fraction_flagged": float(isolated.mean()),
        "sparse_threshold_local_nn": float(sparse_thresh),
        "mask": isolated,
    }


# --------------------------------------------------------------------------- QA render for a variant
def render_qa_4(tensors: dict[str, Any], qa_poses: list[dict], device: str, out_dir: Path) -> dict[str, str]:
    from render import save_png

    names = {"A_on_path": "A_on_path.png", "B_off_path": "B_off_path.png",
              "C_dollhouse": "C_dollhouse.png", "D_overhead": "D_overhead.png"}
    hashes = {}
    for pose in qa_poses:
        layers = render_layers(tensors, pose, device)
        img = (np.clip(layers["rgb"], 0, 1) * 255).astype(np.uint8)
        hashes[pose["id"]] = save_png(out_dir / names[pose["id"]], img)
    return hashes
