"""Stage 2 - Remove People (RTMDet-Ins-S ONNX, runs before SfM).

Writes two things per frame: the frame with masked pixels blacked out (so
downstream cube-face/view rendering never shows the operator), and a COLMAP-
named mask copy under masks_colmap/ (`<image name incl. extension>.png`,
0 = ignore) so `colmap feature_extractor --ImageReader.mask_path` skips those
pixels during SfM itself - the reference studio does this too
(`maskInSfM: true` in its own job manifest).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from result import StageResult

DILATE_PX_AT_7680 = 24


def run(cfg, ctx) -> StageResult:
    images_dir: Path = ctx["images_dir"]
    frames = sorted(images_dir.glob("*.jpg")) + sorted(images_dir.glob("*.png"))
    if not frames:
        return StageResult(name="mask", status="skipped", detail="no images (SfM blocked)")

    masks_dir: Path = ctx["job_dir"] / "masks"
    masks_colmap_dir: Path = ctx["job_dir"] / "masks_colmap"
    ctx["masks_colmap_dir"] = str(masks_colmap_dir)

    if not cfg.remove_people:
        return StageResult(name="mask", status="skipped", detail="remove_people disabled")

    try:
        from rtmdet import apply_mask, load_session, model_path, people_mask
    except ImportError as exc:
        return StageResult(
            name="mask", status="blocked",
            detail="onnxruntime / opencv not installed",
            error=f"{exc}. pip install onnxruntime-gpu opencv-python pillow")

    if not model_path().exists():
        return StageResult(
            name="mask", status="blocked",
            detail="RTMDet ONNX missing",
            error=f"Place {model_path().name} in {model_path().parent}")

    try:
        from PIL import Image
        import numpy as np
    except ImportError as exc:
        return StageResult(name="mask", status="blocked", error=f"pillow/numpy missing: {exc}")

    prior = list(masks_dir.glob("*.png")) if masks_dir.exists() else []
    if len(prior) >= len(frames):
        _ensure_colmap_masks(prior, masks_colmap_dir, frames)
        return StageResult(
            name="mask", status="done",
            detail=f"reused {len(prior)} existing masks",
            artifacts=[str(masks_dir), str(masks_colmap_dir)])

    try:
        session = load_session()
    except Exception as exc:  # noqa: BLE001
        return StageResult(name="mask", status="failed", error=f"RTMDet session failed: {exc}")

    masks_dir.mkdir(parents=True, exist_ok=True)
    masks_colmap_dir.mkdir(parents=True, exist_ok=True)
    dilate_px = max(4, round(DILATE_PX_AT_7680))

    hit = 0
    for i, path in enumerate(frames):
        rgb = np.asarray(Image.open(path).convert("RGB"))
        keep = people_mask(session, rgb, dilate_px=dilate_px)
        if int((keep == 0).sum()) > 0:
            hit += 1
            Image.fromarray(apply_mask(rgb, keep)).save(path, quality=92)
        Image.fromarray(keep).save(masks_dir / f"{path.stem}.png")
        # COLMAP wants the mask named after the full image filename incl.
        # extension, in its own mask_path directory (0 = ignore that pixel).
        Image.fromarray(keep).save(masks_colmap_dir / f"{path.name}.png")
        if (i + 1) % 25 == 0 or i == 0:
            sys.stdout.write(json.dumps({
                "stage": "mask", "status": "running",
                "progress": round((i + 1) / len(frames), 3),
                "detail": f"masked {i + 1}/{len(frames)}",
            }) + "\n")
            sys.stdout.flush()

    return StageResult(
        name="mask", status="done",
        detail=f"masked people in {hit}/{len(frames)} frames",
        artifacts=[str(masks_dir), str(masks_colmap_dir)])


def _ensure_colmap_masks(prior_masks: list[Path], masks_colmap_dir: Path, frames: list[Path]) -> None:
    """Backfill masks_colmap/ from an existing masks/ dir (older jobs / reuse)."""
    if masks_colmap_dir.exists() and len(list(masks_colmap_dir.glob("*.png"))) >= len(frames):
        return
    try:
        from PIL import Image
    except ImportError:
        return
    masks_colmap_dir.mkdir(parents=True, exist_ok=True)
    by_stem = {m.stem: m for m in prior_masks}
    for frame in frames:
        src = by_stem.get(frame.stem)
        if src is None:
            continue
        dest = masks_colmap_dir / f"{frame.name}.png"
        if not dest.exists():
            Image.open(src).save(dest)
