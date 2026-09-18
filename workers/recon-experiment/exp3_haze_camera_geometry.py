"""Room 213 Experiment 3 haze diagnostic — camera geometry + split-grouping audit.

Read-only. Runs locally (numpy + PIL only, no torch/gsplat/Modal). Uses the same
dataparser transform/scale baked into ``qa/visual-poses.json`` so training-camera centers
and QA-camera positions land in the identical post-dataparser world space that both were
rendered in.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from poses import apply_dataparser, load_poses  # noqa: E402


def _frame_pano_view(file_path: str) -> tuple[str, str]:
    name = Path(file_path).stem  # e.g. "000001_v00"
    pano, _, view = name.partition("_v")
    return pano, view


def load_train_centers(transforms_path: Path, dataparser: dict[str, Any]) -> dict[str, Any]:
    doc = json.loads(Path(transforms_path).read_text(encoding="utf-8"))
    t34 = np.array(dataparser["transform"], dtype=np.float64)
    scale = float(dataparser["scale"])
    centers = []
    forwards = []
    file_paths = []
    for fr in doc["frames"]:
        c2w = apply_dataparser(np.array(fr["transform_matrix"], dtype=np.float64), t34, scale)
        centers.append(c2w[:3, 3])
        forwards.append(-c2w[:3, 2])  # OpenGL: camera looks along -Z
        file_paths.append(fr["file_path"])
    return {
        "centers": np.stack(centers),
        "forwards": np.stack(forwards),
        "file_paths": file_paths,
        "doc": doc,
    }


def envelope_and_nearest(qa_pos: np.ndarray, qa_forward: np.ndarray, train_centers: np.ndarray,
                          train_forwards: np.ndarray, envelope_margin_frac: float = 0.15) -> dict[str, Any]:
    d = np.linalg.norm(train_centers - qa_pos[None, :], axis=1)
    nearest_i = int(np.argmin(d))
    nearest_dist = float(d[nearest_i])
    cos = float(np.clip(np.dot(qa_forward, train_forwards[nearest_i]), -1.0, 1.0))
    angular_deg = float(np.degrees(np.arccos(cos)))
    lo, hi = train_centers.min(0), train_centers.max(0)
    diag = float(np.linalg.norm(hi - lo))
    margin = envelope_margin_frac * diag
    inside = bool(np.all(qa_pos >= lo - margin) and np.all(qa_pos <= hi + margin))
    # k-nearest-5 mean distance as a local-density proxy (sparse support if this is large)
    d_sorted = np.sort(d)
    k = min(5, len(d_sorted))
    mean_knn5 = float(d_sorted[:k].mean())
    return {
        "nearest_train_frame_index": nearest_i,
        "nearest_train_distance": nearest_dist,
        "nearest_train_angular_deg": angular_deg,
        "mean_5nn_train_distance": mean_knn5,
        "inside_training_envelope": inside,
        "envelope_bbox_min": lo.tolist(),
        "envelope_bbox_max": hi.tolist(),
        "envelope_diag": diag,
        "envelope_margin_used": margin,
    }


def qa_camera_report(poses_doc: dict[str, Any], train: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for p in poses_doc["poses"]:
        c2w = np.array(p["world_from_camera"], dtype=np.float64)
        pos = c2w[:3, 3]
        forward = -c2w[:3, 2]
        env = envelope_and_nearest(pos, forward, train["centers"], train["forwards"])
        rows.append({
            "camera_id": p["id"],
            "category": p["category"],
            "checkpoint_steps_rendered": [8000, 15999],
            "position": pos.tolist(),
            **env,
            "nearest_train_source_view": train["file_paths"][env["nearest_train_frame_index"]],
        })
    return rows


def _project_top_down(points: np.ndarray, w: int, h: int, pad: float = 0.08) -> tuple[np.ndarray, tuple]:
    xz = points[:, [0, 2]]
    lo, hi = xz.min(0), xz.max(0)
    span = np.maximum(hi - lo, 1e-6)
    lo = lo - pad * span
    hi = hi + pad * span
    span = hi - lo
    px = (xz - lo) / span
    px[:, 0] *= (w - 1)
    px[:, 1] = (h - 1) - px[:, 1] * (h - 1)
    return px, (lo, hi)


def camera_layout_png(train: dict[str, Any], poses_doc: dict[str, Any], dest: Path,
                       w: int = 1000, h: int = 1000) -> str:
    """Top-down (X-Z plane) scatter: training trajectory (gray line+dots) + 4 QA cameras (colored)."""
    img = Image.new("RGB", (w, h), (18, 18, 22))
    draw = ImageDraw.Draw(img)
    train_px, (lo, hi) = _project_top_down(train["centers"], w, h)
    for i in range(len(train_px) - 1):
        draw.line([tuple(train_px[i]), tuple(train_px[i + 1])], fill=(70, 70, 80), width=1)
    for x, y in train_px:
        draw.ellipse([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=(120, 120, 135))
    colors = {"A_on_path": (80, 200, 120), "B_off_path": (240, 200, 60),
              "C_dollhouse": (90, 160, 240), "D_overhead": (230, 90, 200)}
    legend_y = 14
    for p in poses_doc["poses"]:
        c2w = np.array(p["world_from_camera"], dtype=np.float64)
        pos = c2w[:3, [3]].reshape(1, 3)
        px, _ = _project_top_down(np.vstack([train["centers"], pos]), w, h)
        qx, qy = px[-1]
        col = colors.get(p["id"], (255, 255, 255))
        r = 8
        draw.ellipse([qx - r, qy - r, qx + r, qy + r], outline=col, width=3)
        draw.line([qx - r - 4, qy, qx + r + 4, qy], fill=col, width=1)
        draw.line([qx, qy - r - 4, qx, qy + r + 4], fill=col, width=1)
        draw.text((10, legend_y), f"{p['id']} ({p['category']})", fill=col)
        legend_y += 16
    draw.text((10, h - 20), "top-down X-Z; gray = training trajectory (6016 views)", fill=(180, 180, 180))
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest)
    return hashlib.sha256(dest.read_bytes()).hexdigest()


def split_grouping_audit(transforms_path: Path) -> dict[str, Any]:
    """Read-only: do the 0.9-fraction train/eval split and the pano-grouping it ignores agree?"""
    doc = json.loads(Path(transforms_path).read_text(encoding="utf-8"))
    names = sorted(f["file_path"] for f in doc["frames"])
    n = len(names)
    n_train = -(-n * 9 // 10)  # ceil(n*0.9)
    idx_train = set(np.linspace(0, n - 1, n_train, dtype=int).tolist())
    train_names = [names[i] for i in sorted(idx_train)]
    eval_names = [names[i] for i in range(n) if i not in idx_train]
    train_panos = {_frame_pano_view(f)[0] for f in train_names}
    eval_panos = {_frame_pano_view(f)[0] for f in eval_names}
    shared = train_panos & eval_panos
    all_panos = {_frame_pano_view(f)[0] for f in names}
    views_per_pano = {}
    for f in names:
        pano, view = _frame_pano_view(f)
        views_per_pano.setdefault(pano, []).append(view)
    return {
        "total_derived_images": n,
        "total_panoramas": len(all_panos),
        "views_per_panorama": len(next(iter(views_per_pano.values()))) if views_per_pano else 0,
        "train_images": len(train_names),
        "eval_images": len(eval_names),
        "panoramas_with_any_train_view": len(train_panos),
        "panoramas_with_any_eval_view": len(eval_panos),
        "panoramas_appearing_in_both_train_and_eval": len(shared),
        "fraction_of_eval_panoramas_also_in_train": (
            round(len(shared) / len(eval_panos), 4) if eval_panos else None
        ),
        "leakage_present": len(shared) > 0,
        "leakage_description": (
            "The split sorts all 6,016 derived perspective views alphabetically by "
            "'{pano}_{view}.jpg' and then takes an evenly-spaced 90% by INDEX in that "
            "sorted list, with no panorama-aware grouping. Because each panorama contributes "
            "16 consecutive filenames when sorted, an evenly-spaced 1-in-10 selection lands "
            "inside almost every panorama's run of 16, so most panoramas contribute views to "
            "both splits: the held-out eval image for a panorama is typically a different "
            "yaw/pitch crop taken from the same physical capture point (often within a couple "
            "of seconds and centimeters) as one or more training images from that same "
            "panorama. This is view-level held-out, not location-level held-out."
            if len(shared) > 0 else
            "No panorama appears in both splits."
        ),
        "example_shared_panoramas": sorted(shared)[:10],
    }


def main() -> None:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    transforms_path = root / "qa" / "exp3-run" / "inputs" / "transforms.json"
    poses_path = root / "workers" / "recon-experiment" / "visual-poses.json"
    out_dir = root / "qa" / "exp3-run" / "haze-diagnostic"
    out_dir.mkdir(parents=True, exist_ok=True)

    poses_doc = load_poses(poses_path)
    train = load_train_centers(transforms_path, poses_doc["dataparser"])

    qa_rows = qa_camera_report(poses_doc, train)
    layout_hash = camera_layout_png(train, poses_doc, out_dir / "camera_layout.png")
    split = split_grouping_audit(transforms_path)

    payload = {
        "qa_camera_geometry": qa_rows,
        "camera_layout_png_sha256": layout_hash,
        "split_grouping_audit": split,
    }
    (out_dir / "camera_geometry.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2)[:6000])


if __name__ == "__main__":
    main()
