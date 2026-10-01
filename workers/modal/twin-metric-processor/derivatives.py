"""Viewer derivatives. Geometry = measurement truth. Gaussian = appearance."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np


def write_json(path: Path, obj: Any) -> None:
    def conv(value):
        if isinstance(value, (np.floating, np.integer)):
            return value.item()
        if isinstance(value, np.ndarray):
            return value.tolist()
        raise TypeError(type(value))

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, default=conv) + "\n", encoding="utf-8")


def floor_slice_png(xyz: np.ndarray, path: Path, size: int = 512, up_axis: int = 1) -> dict[str, Any]:
    from PIL import Image

    path.parent.mkdir(parents=True, exist_ok=True)
    if xyz.shape[0] == 0:
        Image.new("L", (size, size), 0).save(path)
        return {"path": str(path), "occupied": 0}
    y = xyz[:, up_axis]
    y0, y1 = float(np.percentile(y, 4)), float(np.percentile(y, 18))
    pts = xyz[(y >= y0) & (y <= y1 + 0.12)]
    if pts.shape[0] < 10:
        pts = xyz
    axes = [i for i in range(3) if i != up_axis]
    p2 = pts[:, axes]
    lo, hi = p2.min(0), p2.max(0)
    span = np.maximum(hi - lo, 1e-3)
    scale = (size - 1) / span.max()
    img = np.zeros((size, size), dtype=np.uint8)
    ix = np.clip(((p2[:, 0] - lo[0]) * scale).astype(int), 0, size - 1)
    iz = np.clip(((p2[:, 1] - lo[1]) * scale).astype(int), 0, size - 1)
    img[size - 1 - iz, ix] = 255
    Image.fromarray(img, mode="L").save(path)
    return {"path": str(path), "occupied": int((img > 0).sum()), "size": size}


def thumbnail_png(xyz: np.ndarray, path: Path, size: int = 256) -> dict[str, Any]:
    from PIL import Image

    path.parent.mkdir(parents=True, exist_ok=True)
    if xyz.shape[0] == 0:
        Image.new("RGB", (size, size), (11, 15, 21)).save(path)
        return {"path": str(path)}
    rng = np.random.default_rng(0)
    sample = xyz if xyz.shape[0] <= 80_000 else xyz[rng.choice(xyz.shape[0], 80_000, replace=False)]
    x, y, z = sample[:, 0], sample[:, 1], sample[:, 2]
    # Simple isometric-ish: x right, y up, z into page.
    u = x - z * 0.35
    v = y + z * 0.25
    lo_u, hi_u = float(u.min()), float(u.max())
    lo_v, hi_v = float(v.min()), float(v.max())
    su = (size - 1) / max(hi_u - lo_u, 1e-3)
    sv = (size - 1) / max(hi_v - lo_v, 1e-3)
    scale = min(su, sv)
    img = np.zeros((size, size, 3), dtype=np.uint8)
    img[:] = (11, 15, 21)
    px = np.clip(((u - lo_u) * scale).astype(int), 0, size - 1)
    py = np.clip(((v - lo_v) * scale).astype(int), 0, size - 1)
    img[size - 1 - py, px] = (0, 230, 153)
    Image.fromarray(img, mode="RGB").save(path)
    return {"path": str(path)}


def maybe_spz(ply_path: Path, spz_path: Path) -> dict[str, Any]:
    """Convert appearance PLY -> SPZ after the raw PLY is already saved."""
    import shutil
    import subprocess

    if not ply_path.is_file():
        return {"ok": False, "reason": "missing_appearance_ply"}
    npx = shutil.which("npx")
    if not npx:
        return {"ok": False, "reason": "splat-transform_unavailable", "rawPlyPreserved": True}
    try:
        subprocess.run(
            [
                npx, "-y", "@playcanvas/splat-transform",
                "-w", str(ply_path),
                "--filter-nan",
                str(spz_path),
                "--spz-version", "3",
            ],
            check=True,
            timeout=300,
        )
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "reason": f"{type(exc).__name__}: {exc}", "rawPlyPreserved": True}
    return {"ok": spz_path.is_file(), "path": str(spz_path) if spz_path.is_file() else None}


def write_manifests(out_dir: Path, manifest: dict[str, Any], qa: dict[str, Any]) -> dict[str, str]:
    man_path = out_dir / "processing_manifest.json"
    qa_path = out_dir / "qa.json"
    write_json(man_path, manifest)
    write_json(qa_path, qa)
    return {"processing_manifest": str(man_path), "qa": str(qa_path)}
