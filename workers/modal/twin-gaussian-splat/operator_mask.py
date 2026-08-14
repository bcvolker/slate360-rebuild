"""MASK-1 — operator segmentation masking for 360-derived views (2026-08-13).

The nadir exclusion (B3b) removes the operator only when they are directly
below the camera. In real handheld capture the operator is also in the
horizontal rings — every appearance trains into ghost splats, the single
biggest visible defect of the pure-360 product. This module:

1. Runs a person-segmentation model (YOLOv8-seg, COCO class 0) over the
   extracted perspective views BEFORE alignment.
2. Writes per-view masks (PNG, white = keep, black = operator, dilated) for
   every view containing a person.
3. Culls views whose person coverage exceeds OPERATOR_MASK_CULL_COVERAGE —
   a frame that is mostly operator contributes nothing but damage.
4. After alignment, injects nerfstudio `mask_path` entries into
   transforms.json (+ masks_2/masks_4 copies for the auto-downscale path)
   so splatfacto zeroes those pixels out of the training loss.

COLMAP still sees operator pixels (ns-process-data has no mask plumbing),
but operator features rarely survive geometric verification — the damage the
masks remove is in TRAINING, where every unmasked operator pixel must be
explained by splats.

PSNR caveat recorded in stats: eval PSNR under masking is computed on kept
pixels only, so A/B against an unmasked baseline needs the visual gate, not
PSNR alone.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

OPERATOR_MASKING = os.environ.get("OPERATOR_MASKING", "1").strip() != "0"
MODEL_PATH = os.environ.get("OPERATOR_MASK_MODEL", "/models/yolov8s-seg.pt")
CONF_THRESHOLD = float(os.environ.get("OPERATOR_MASK_CONF", "0.35"))
CULL_COVERAGE = float(os.environ.get("OPERATOR_MASK_CULL_COVERAGE", "0.45"))
DILATE_PX = int(os.environ.get("OPERATOR_MASK_DILATE_PX", "12"))
PERSON_CLASS_ID = 0  # COCO
_BATCH = 16
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def decide_mask_action(coverage: float, cull_coverage: float = CULL_COVERAGE) -> str:
    """Pure decision helper (unit-tested): 'none' | 'mask' | 'cull'."""
    if coverage <= 0.0:
        return "none"
    if coverage >= cull_coverage:
        return "cull"
    return "mask"


def generate_operator_masks(images_dir: Path, masks_dir: Path) -> dict[str, Any]:
    """Scan every image in images_dir; write keep-masks; return stats.

    Non-fatal by design: any model/import failure returns a stats dict with
    `maskingError` and the job continues unmasked (matching the worker's
    defensive posture — masking must never be the reason a job fails).
    """
    stats: dict[str, Any] = {
        "enabled": True,
        "imagesScanned": 0,
        "imagesWithOperator": 0,
        "imagesMasked": 0,
        "culledImages": [],
        "meanOperatorCoverage": 0.0,
        "maxOperatorCoverage": 0.0,
        "confThreshold": CONF_THRESHOLD,
        "cullCoverage": CULL_COVERAGE,
        "dilatePx": DILATE_PX,
        "psnrCaveat": "eval PSNR under masking scores kept pixels only",
    }
    try:
        import cv2
        import numpy as np
        from ultralytics import YOLO

        model = YOLO(MODEL_PATH)
    except Exception as exc:  # noqa: BLE001
        stats["maskingError"] = f"{type(exc).__name__}: {exc}"
        print(f"[operator-mask] disabled (non-fatal): {stats['maskingError']}")
        return stats

    masks_dir.mkdir(parents=True, exist_ok=True)
    paths = sorted(
        p for p in images_dir.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES
    )
    coverages: list[float] = []
    kernel = np.ones((DILATE_PX * 2 + 1, DILATE_PX * 2 + 1), np.uint8)

    for start in range(0, len(paths), _BATCH):
        batch = paths[start : start + _BATCH]
        try:
            results = model.predict(
                [str(p) for p in batch],
                conf=CONF_THRESHOLD,
                classes=[PERSON_CLASS_ID],
                verbose=False,
            )
        except Exception as exc:  # noqa: BLE001
            stats["maskingError"] = f"{type(exc).__name__}: {exc}"
            print(f"[operator-mask] predict failed (non-fatal): {stats['maskingError']}")
            return stats
        for path, result in zip(batch, results):
            stats["imagesScanned"] += 1
            masks = getattr(result, "masks", None)
            if masks is None or masks.data is None or len(masks.data) == 0:
                continue
            person = masks.data.any(dim=0).cpu().numpy().astype(np.uint8)
            h, w = result.orig_shape[:2]
            person = cv2.resize(person, (w, h), interpolation=cv2.INTER_NEAREST)
            person = cv2.dilate(person, kernel)
            coverage = float(person.mean())
            coverages.append(coverage)
            stats["imagesWithOperator"] += 1
            stats["maxOperatorCoverage"] = max(stats["maxOperatorCoverage"], coverage)
            action = decide_mask_action(coverage)
            if action == "cull":
                stats["culledImages"].append(path.name)
                continue
            keep = ((1 - person) * 255).astype(np.uint8)
            cv2.imwrite(str(masks_dir / f"{path.stem}.png"), keep)
            stats["imagesMasked"] += 1

    if coverages:
        stats["meanOperatorCoverage"] = float(sum(coverages) / len(coverages))
    print(
        f"[operator-mask] scanned={stats['imagesScanned']} "
        f"operator={stats['imagesWithOperator']} masked={stats['imagesMasked']} "
        f"culled={len(stats['culledImages'])} "
        f"meanCov={stats['meanOperatorCoverage']:.3f}"
    )
    return stats


def cull_images(images_dir: Path, culled_names: list[str]) -> int:
    """Remove operator-dominated views BEFORE alignment ever sees them."""
    removed = 0
    for name in culled_names:
        target = images_dir / name
        if target.is_file():
            target.unlink()
            removed += 1
    return removed


def inject_masks_into_transforms(
    processed_dir: Path,
    masks_dir: Path,
    frame_map: dict[str, str],
) -> dict[str, Any]:
    """Point transforms.json frames at their masks (nerfstudio `mask_path`).

    frame_map maps a transforms basename (ns-process-data's frame_NNNNN.jpg)
    back to the original view filename masks are keyed by; identity fallback
    covers the pose-prior path, whose transforms keep original names. Masks
    are duplicated into masks_2/masks_4 (nearest-neighbour) so nerfstudio's
    auto-downscale finds a matching resolution whichever factor it picks.

    nerfstudio HARD-ASSERTS all-or-nothing: `mask_path` must be present on
    EVERY frame or on none (first live run failed exactly there — 24/55
    frames masked → "Different number of image and mask filenames"). So once
    any frame carries a real operator mask, every maskless frame gets a
    full-white "keep everything" fill mask sized from its own image.

    Uses PIL (not cv2) so it stays unit-testable on machines without OpenCV.
    """
    from PIL import Image

    stats: dict[str, Any] = {"masksApplied": 0, "fillMasksApplied": 0, "framesTotal": 0}
    transforms_path = processed_dir / "transforms.json"
    if not transforms_path.is_file():
        stats["injectError"] = "missing transforms.json"
        return stats
    data = json.loads(transforms_path.read_text(encoding="utf-8"))
    frames = data.get("frames", [])
    stats["framesTotal"] = len(frames)
    out_dirs = {
        1: processed_dir / "masks",
        2: processed_dir / "masks_2",
        4: processed_dir / "masks_4",
    }

    def write_mask_set(mask: "Image.Image", stem: str) -> None:
        for factor, out_dir in out_dirs.items():
            out_dir.mkdir(parents=True, exist_ok=True)
            scaled = (
                mask
                if factor == 1
                else mask.resize(
                    (max(1, mask.width // factor), max(1, mask.height // factor)),
                    Image.NEAREST,
                )
            )
            scaled.save(out_dir / f"{stem}.png")

    unmasked: list[dict[str, Any]] = []
    for frame in frames:
        basename = Path(str(frame.get("file_path", ""))).name
        if not basename:
            continue
        original = frame_map.get(basename, basename)
        src = masks_dir / f"{Path(original).stem}.png"
        if not src.is_file():
            unmasked.append(frame)
            continue
        with Image.open(src) as img:
            write_mask_set(img.convert("L"), Path(basename).stem)
        frame["mask_path"] = f"masks/{Path(basename).stem}.png"
        stats["masksApplied"] += 1

    if stats["masksApplied"] > 0:
        for frame in unmasked:
            file_path = str(frame.get("file_path", ""))
            basename = Path(file_path).name
            image_path = processed_dir / file_path
            if not image_path.is_file():
                image_path = Path(file_path)
            if not image_path.is_file():
                stats["injectError"] = f"cannot size fill mask: {file_path}"
                print(f"[operator-mask] {stats['injectError']}")
                continue
            with Image.open(image_path) as img:
                white = Image.new("L", img.size, 255)
            write_mask_set(white, Path(basename).stem)
            frame["mask_path"] = f"masks/{Path(basename).stem}.png"
            stats["fillMasksApplied"] += 1

    transforms_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(
        f"[operator-mask] injected {stats['masksApplied']} operator + "
        f"{stats['fillMasksApplied']} fill masks across {stats['framesTotal']} frames"
    )
    return stats
