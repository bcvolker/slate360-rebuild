"""Stage 2 — Remove People (RTMDet-Ins-S ONNX, runs before SfM)."""
from __future__ import annotations

from pathlib import Path

from result import StageResult


def run(cfg, ctx) -> StageResult:
    if not cfg.remove_people:
        return StageResult(name="mask", status="skipped",
                           detail="remove_people disabled")

    images_dir: Path = ctx["images_dir"]
    frames = sorted(images_dir.glob("*.jpg")) + sorted(images_dir.glob("*.png"))
    if not frames:
        return StageResult(name="mask", status="skipped",
                           detail="no images (SfM blocked)")

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
        return StageResult(name="mask", status="blocked",
                           error=f"pillow/numpy missing: {exc}")

    try:
        session = load_session()
    except Exception as exc:  # noqa: BLE001
        return StageResult(name="mask", status="failed",
                           error=f"RTMDet session failed: {exc}")

    masks_dir: Path = ctx["job_dir"] / "masks"
    masks_dir.mkdir(parents=True, exist_ok=True)
    ctx["masks_dir"] = str(masks_dir)

    hit = 0
    for i, path in enumerate(frames):
        rgb = np.asarray(Image.open(path).convert("RGB"))
        keep = people_mask(session, rgb)
        if int((keep == 0).sum()) > 0:
            hit += 1
            Image.fromarray(apply_mask(rgb, keep)).save(path, quality=92)
        Image.fromarray(keep).save(masks_dir / f"{path.stem}.png")
        if (i + 1) % 25 == 0 or i == 0:
            import json
            import sys
            sys.stdout.write(json.dumps({
                "stage": "mask", "status": "running",
                "progress": round((i + 1) / len(frames), 3),
                "detail": f"masked {i + 1}/{len(frames)}",
            }) + "\n")
            sys.stdout.flush()

    return StageResult(
        name="mask", status="done",
        detail=f"masked people in {hit}/{len(frames)} frames",
        artifacts=[str(masks_dir)])
