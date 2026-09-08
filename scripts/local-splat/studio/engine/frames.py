#!/usr/bin/env python3
"""Frame preparation on the Linux side: sharpness filter + optional downscale.

    frames.py --images <dir> [--drop-fraction 0.15] [--min-sharp 12] [--max-dim 0]
              [--keep-list keep.json]

Never deletes originals: blurry frames are moved to <dir>/../images_dropped.
Prints PROGRESS lines the studio can display.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import cv2
import numpy as np

EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}


def sharpness(path: Path) -> float:
    img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return 0.0
    h, w = img.shape[:2]
    scale = 1024.0 / max(w, 1)
    if scale < 1:
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    lap = cv2.Laplacian(img, cv2.CV_64F)
    return float(lap.var())


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--images", required=True)
    p.add_argument("--drop-fraction", type=float, default=0.15)
    p.add_argument("--min-sharp", type=float, default=12.0)
    p.add_argument("--max-dim", type=int, default=0, help="downscale so the long edge is at most this (0 = keep)")
    p.add_argument("--keep-list", default="")
    p.add_argument("--no-filter", action="store_true")
    a = p.parse_args()

    root = Path(a.images)
    files = sorted(f for f in root.iterdir() if f.suffix.lower() in EXTS)
    total = len(files)
    if total == 0:
        print("RESULT frames 0")
        return 5

    scores: list[tuple[Path, float]] = []
    for i, f in enumerate(files, 1):
        scores.append((f, 0.0 if a.no_filter else sharpness(f)))
        if i % 10 == 0 or i == total:
            print(f"PROGRESS sharpness {i} {total}", flush=True)

    dropped = 0
    if not a.no_filter and total >= 30:
        values = np.array([s for _, s in scores])
        cut = float(np.quantile(values, a.drop_fraction))
        dropped_dir = root.parent / "images_dropped"
        dropped_dir.mkdir(exist_ok=True)
        for f, s in scores:
            # Drop only frames that are both in the blurry tail AND objectively soft.
            if s < cut and s < a.min_sharp:
                shutil.move(str(f), str(dropped_dir / f.name))
                dropped += 1
    kept = sorted(f for f in root.iterdir() if f.suffix.lower() in EXTS)

    if a.max_dim > 0:
        for i, f in enumerate(kept, 1):
            img = cv2.imread(str(f), cv2.IMREAD_UNCHANGED)
            if img is None:
                continue
            h, w = img.shape[:2]
            if max(h, w) > a.max_dim:
                s = a.max_dim / float(max(h, w))
                img = cv2.resize(img, (int(round(w * s)), int(round(h * s))), interpolation=cv2.INTER_AREA)
                cv2.imwrite(str(f), img, [cv2.IMWRITE_JPEG_QUALITY, 95])
            if i % 10 == 0 or i == len(kept):
                print(f"PROGRESS downscale {i} {len(kept)}", flush=True)

    report = {"total": total, "kept": len(kept), "dropped": dropped,
              "sharpness_median": float(np.median([s for _, s in scores])) if scores else 0.0}
    if a.keep_list:
        Path(a.keep_list).write_text(json.dumps({**report, "files": [f.name for f in kept]}, indent=2))
    print("RESULT frames " + json.dumps(report), flush=True)
    return 0 if len(kept) >= 20 else 5


if __name__ == "__main__":
    sys.exit(main())
