#!/usr/bin/env python3
"""Operator masks for a 360 walk's Brush dataset (in place).

    operator_masks.py --dataset <job>/dataset [--nadir-lat -50] [--dilate 24] [--report masks.json]

The person holding the camera is in every back face of a 360 walk (and their arm or shoulder
in the side faces). Left in the training images, Brush explains them with a smear of splats
along the path: the "ghost" behind you at every station and the veil on the floor. This writes
`masks/<image>.png` (white = train on it, black = ignore) that Brush 0.3 reads for a COLMAP
dataset: a person mask (DeepLabV3-MobileNet, torchvision, GPU) dilated so the halo goes too,
unioned with everything below --nadir-lat degrees (the rig and hands under the camera).

Brush keys masks by the image STEM, and the four face folders share stems, so the dataset is
flattened first: images/<face>/<name>.jpg -> images/<face>_<name>.jpg with sparse/0/images.txt
rewritten to match. Photos (2d/phone mode) are left alone — this is a 360-only step.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import time
from pathlib import Path

import numpy as np

FOV_DEG = 110.0  # matches sfm.py side faces
PERSON_CLASS = 15  # VOC "person"
INFER_PX = 1024


def flatten(dataset: Path) -> list[str]:
    """images/<face>/<name>.jpg -> images/<face>_<name>.jpg; returns the flat names in images.txt order."""
    images = dataset / "images"
    sp = dataset / "sparse" / "0" / "images.txt"
    lines = sp.read_text().splitlines()
    out, names, i = [], [], 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("#") or not ln.strip():
            out.append(ln); i += 1; continue
        parts = ln.split()
        name = parts[9]
        flat = name.replace("/", "_")
        src, dst = images / name, images / flat
        if src.exists() and not dst.exists():
            src.rename(dst)
        parts[9] = flat
        out.append(" ".join(parts))
        out.append(lines[i + 1] if i + 1 < len(lines) else "")
        names.append(flat)
        i += 2
    sp.write_text("\n".join(out) + "\n")
    for d in [p for p in images.iterdir() if p.is_dir()]:
        if not any(d.iterdir()):
            d.rmdir()
    return names


def lat_grid(px: int) -> np.ndarray:
    f = 0.5 * px / math.tan(math.radians(FOV_DEG) * 0.5)
    yy, xx = np.meshgrid(np.arange(px, dtype=np.float32), np.arange(px, dtype=np.float32), indexing="ij")
    x = (xx - (px - 1) / 2.0) / f
    y = (yy - (px - 1) / 2.0) / f
    n = np.sqrt(x * x + y * y + 1.0)
    return np.degrees(np.arcsin(np.clip(-y / n, -1, 1)))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--nadir-lat", type=float, default=-50.0)
    ap.add_argument("--dilate", type=int, default=24)
    ap.add_argument("--report", default="")
    a = ap.parse_args()

    import cv2
    import torch
    from PIL import Image
    from torchvision.models.segmentation import DeepLabV3_MobileNet_V3_Large_Weights, deeplabv3_mobilenet_v3_large

    t0 = time.time()
    dataset = Path(a.dataset)
    names = flatten(dataset)
    masks = dataset / "masks"
    masks.mkdir(exist_ok=True)
    weights = DeepLabV3_MobileNet_V3_Large_Weights.DEFAULT
    dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = deeplabv3_mobilenet_v3_large(weights=weights).to(dev).eval()
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (a.dilate * 2 + 1, a.dilate * 2 + 1))
    lat = None
    cov: dict[str, list[float]] = {}
    for j, flat in enumerate(names):
        bgr = cv2.imread(str(dataset / "images" / flat), cv2.IMREAD_COLOR)
        if bgr is None:
            continue
        if lat is None or lat.shape[0] != bgr.shape[0]:
            lat = lat_grid(bgr.shape[0])
        small = cv2.resize(bgr, (INFER_PX, INFER_PX), interpolation=cv2.INTER_AREA)
        inp = weights.transforms()(Image.fromarray(cv2.cvtColor(small, cv2.COLOR_BGR2RGB))).unsqueeze(0).to(dev)
        with torch.no_grad():
            pred = model(inp)["out"][0].argmax(0).cpu().numpy().astype(np.uint8)
        person = cv2.resize((pred == PERSON_CLASS).astype(np.uint8) * 255, (bgr.shape[1], bgr.shape[0]), interpolation=cv2.INTER_NEAREST)
        person = cv2.dilate(person, kernel)
        keep = np.full(bgr.shape[:2], 255, np.uint8)
        keep[lat < a.nadir_lat] = 0
        keep[person > 0] = 0
        cv2.imwrite(str(masks / (Path(flat).stem + ".png")), keep)
        cov.setdefault(flat.split("_")[0], []).append(float((keep == 0).mean()))
        if j % 50 == 0:
            print(f"PROGRESS masks {j} {len(names)}", flush=True)
    report = {
        "images": len(names), "seconds": round(time.time() - t0, 1),
        "ignore_fraction": {k: round(float(np.mean(v)), 4) for k, v in cov.items()},
    }
    if a.report:
        Path(a.report).write_text(json.dumps(report, indent=2))
    print("RESULT masks " + json.dumps(report), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
