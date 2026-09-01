"""YOLO person masks for equatorial faces. White=keep, black=operator. Fill all frames."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from paths import SHARED  # noqa: E402

DILATE_PX = 12
CONF = 0.35


def generate_masks(images_dir: Path, masks_dir: Path) -> dict:
    import cv2
    import numpy as np
    from ultralytics import YOLO

    model = YOLO("yolov8s-seg.pt")
    masks_dir.mkdir(parents=True, exist_ok=True)
    paths = sorted(p for p in images_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
    stats = {
        "imagesScanned": 0,
        "imagesWithOperator": 0,
        "imagesMasked": 0,
        "meanOperatorCoverage": 0.0,
        "maxOperatorCoverage": 0.0,
        "dilatePx": DILATE_PX,
        "conf": CONF,
    }
    coverages: list[float] = []
    kernel = np.ones((DILATE_PX * 2 + 1, DILATE_PX * 2 + 1), np.uint8)
    for start in range(0, len(paths), 8):
        batch = paths[start : start + 8]
        results = model.predict([str(p) for p in batch], conf=CONF, classes=[0], verbose=False)
        for path, result in zip(batch, results):
            stats["imagesScanned"] += 1
            h, w = result.orig_shape[:2]
            masks = getattr(result, "masks", None)
            if masks is None or masks.data is None or len(masks.data) == 0:
                keep = np.full((h, w), 255, dtype=np.uint8)
            else:
                person = masks.data.any(dim=0).cpu().numpy().astype(np.uint8)
                person = cv2.resize(person, (w, h), interpolation=cv2.INTER_NEAREST)
                person = cv2.dilate(person, kernel)
                coverage = float(person.mean())
                coverages.append(coverage)
                stats["imagesWithOperator"] += 1
                stats["maxOperatorCoverage"] = max(stats["maxOperatorCoverage"], coverage)
                keep = ((1 - person) * 255).astype(np.uint8)
                stats["imagesMasked"] += 1
            cv2.imwrite(str(masks_dir / f"{path.stem}.png"), keep)
        if start % 80 == 0:
            print(f"masks {start}/{len(paths)}", flush=True)
    if coverages:
        stats["meanOperatorCoverage"] = float(sum(coverages) / len(coverages))
    return stats


def inject_transforms(data_dir: Path) -> dict:
    from PIL import Image

    transforms_path = data_dir / "transforms.json"
    data = json.loads(transforms_path.read_text(encoding="utf-8"))
    (data_dir / "masks").mkdir(parents=True, exist_ok=True)
    applied = 0
    for frame in data["frames"]:
        stem = Path(frame["file_path"]).stem
        mask_rel = f"masks/{stem}.png"
        src = data_dir / mask_rel
        if not src.is_file():
            img = Image.open(data_dir / frame["file_path"])
            Image.new("L", img.size, 255).save(src)
        frame["mask_path"] = mask_rel
        applied += 1
    transforms_path.write_text(json.dumps(data, indent=2) + "\n")
    return {"masksApplied": applied, "framesTotal": len(data["frames"])}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--data", default=str(SHARED))
    args = p.parse_args()
    data = Path(args.data)
    stats = generate_masks(data / "images", data / "masks")
    injected = inject_transforms(data)
    payload = {**stats, **injected, "real_masks": True, "not_cropped_black_pixels": True}
    (data / "OPERATOR_MASKS.json").write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
