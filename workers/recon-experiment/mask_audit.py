"""Mask audit contact sheet for the frozen Room 213 mask set. No redesign."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

from mask_contract import audit_correspondence, require_masks


def _overlay(rgb: np.ndarray, keep: np.ndarray) -> np.ndarray:
    out = rgb.copy()
    excluded = keep < 128
    out[excluded] = (out[excluded] * 0.25).astype(np.uint8)
    out[excluded, 0] = np.minimum(255, out[excluded, 0] + 120)
    return out


def write_contact_sheet(
    *,
    images_dir: Path,
    masks_dir: Path,
    out_dir: Path,
    stems: list[str],
    views_dir: Path | None = None,
) -> dict:
    images = sorted(Path(images_dir).glob("*.jpg"))
    require_masks(images, Path(masks_dir), required=True)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for stem in stems:
        jpg = Path(images_dir) / f"{stem}.jpg"
        mask_path = Path(masks_dir) / f"{stem}.png"
        rgb = np.asarray(Image.open(jpg).convert("RGB"))
        keep = np.asarray(Image.open(mask_path).convert("L"))
        if keep.shape[:2] != rgb.shape[:2]:
            keep = np.asarray(Image.fromarray(keep).resize((rgb.shape[1], rgb.shape[0]), Image.NEAREST))
        kept = rgb.copy()
        kept[keep < 128] = 0
        excluded = rgb.copy()
        excluded[keep >= 128] = 0
        overlay = _overlay(rgb, keep)
        sheet = np.concatenate([rgb, overlay, kept, excluded], axis=1)
        dest = out_dir / f"{stem}.png"
        Image.fromarray(sheet).save(dest)
        derived = []
        if views_dir is not None:
            derived = [f"{stem}_v{i:02d}.jpg" for i in range(16)]
        rows.append(audit_correspondence(stem, mask_path, derived) | {"sheet": str(dest)})
    (out_dir / "index.json").write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
    return {"n": len(rows), "out_dir": str(out_dir)}
