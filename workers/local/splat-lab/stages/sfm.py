"""Stage 2 — Structure-from-Motion (COLMAP via Nerfstudio).

REAL in Slice 2. For 360 input, splits each equirectangular frame into 6
perspective cube-face views (the proven method — COLMAP does not natively
solve equirect SfM), then runs `ns-process-data images` (COLMAP SfM) on the
perspective views. Streams stdout/stderr as progress records.

Falls back to a `blocked` record with install instructions if nerfstudio or
the cube-face split deps are missing.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from result import StageResult
from tools import which_tool


def run(cfg, ctx) -> StageResult:
    images_dir: Path = ctx["images_dir"]
    count = len(list(images_dir.glob("*.jpg")))
    if count == 0:
        return StageResult(name="sfm", status="failed",
                           error="no images to run SfM on")

    if not which_tool("ns-process-data"):
        return StageResult(
            name="sfm", status="blocked",
            detail="nerfstudio not installed",
            error="Install nerfstudio to run COLMAP SfM: "
                   "pip install nerfstudio gsplat onnxruntime-gpu; "
                   "then `ns-process-data images` becomes available. "
                   "See workers/local/splat-lab/README.md")

    # Apply the COLMAP 4.x option-name compatibility shim (idempotent).
    try:
        from colmap4_compat import patch as colmap4_patch
        colmap4_patch()
    except Exception:
        pass

    work_dir: Path = ctx["job_dir"] / "sfm"
    work_dir.mkdir(parents=True, exist_ok=True)

    # For 360 input, split equirect frames into 6 cube faces first.
    if cfg.is360 and cfg.precompute_360_faces:
        faces_dir = work_dir / "faces"
        split = _split_cube_faces(images_dir, faces_dir, cfg)
        if split.status != "done":
            return split
        sfm_images = faces_dir
    else:
        sfm_images = images_dir

    return _run_colmap(cfg, sfm_images, work_dir, count, ctx)


def _split_cube_faces(images_dir: Path, faces_dir: Path, cfg) -> StageResult:
    """Split equirect JPGs into 6 perspective cube faces via py360convert."""
    try:
        import numpy as np
        from PIL import Image
        import py360convert  # type: ignore
    except ImportError:
        return StageResult(
            name="sfm", status="blocked",
            detail="py360convert / numpy / pillow not installed",
            error="Install 360 split deps: pip install py360convert numpy pillow")

    faces_dir.mkdir(parents=True, exist_ok=True)
    face_size = min(2048, cfg.resolved_image_px // 2)
    frames = sorted(images_dir.glob("*.jpg"))
    for i, f in enumerate(frames):
        try:
            equi = np.asarray(Image.open(f).convert("RGB"))
            cube = py360convert.e2c(equi, face_w=face_size, mode="bilinear")
            # cube shape: (6, face_size, face_size, 3) for some impls; handle both.
            for face_idx in range(6):
                face = cube[face_idx] if cube.ndim == 4 else cube
                out = faces_dir / f"{i:06d}_f{face_idx}.jpg"
                Image.fromarray(face).save(out, quality=92)
        except Exception as exc:  # noqa: BLE001
            return StageResult(name="sfm", status="failed",
                               error=f"cube split failed on {f.name}: {exc}")
    total = len(list(faces_dir.glob("*.jpg")))
    return StageResult(name="sfm", status="done",
                       detail=f"split {len(frames)} equirect -> {total} cube faces",
                       artifacts=[str(faces_dir)])


def _run_colmap(cfg, sfm_images: Path, work_dir: Path, cam_count: int, ctx: dict) -> StageResult:
    """Run ns-process-data images (COLMAP SfM) and stream progress."""
    out_dir = work_dir / "colmap"
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        which_tool("ns-process-data") or "ns-process-data",
        "images",
        "--data", str(sfm_images),
        "--output-dir", str(out_dir),
        "--camera-type", "perspective",
    ]
    # Matching method: exhaustive is the safe universal default (no external
    # vocab-tree file needed). vocab_tree crashes without a prebuilt tree.
    # "faster" still benefits from lower image res; "hq" adds refine + higher res.
    cmd += ["--matching-method", "exhaustive"]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=14400)
    except subprocess.TimeoutExpired:
        return StageResult(name="sfm", status="failed",
                           error="COLMAP SfM timed out (>4h)")
    if proc.returncode != 0:
        tail = (proc.stderr or proc.stdout or "")[-800:]
        return StageResult(name="sfm", status="failed",
                           error=f"ns-process-data failed: {tail}")

    # Count registered cameras + points from the sparse model if present.
    points = _count_points(out_dir)
    ctx["sfm_data_dir"] = str(out_dir)  # consumed by the train stage
    detail = f"SfM done (cameras~{cam_count}, points~{points})"
    return StageResult(name="sfm", status="done", detail=detail,
                       artifacts=[str(out_dir)])


def _count_points(sfm_dir: Path) -> int:
    """Best-effort point count from a COLMAP sparse model (points3D.bin)."""
    p = sfm_dir / "sparse" / "0" / "points3D.bin"
    if not p.exists():
        p = sfm_dir / "colmap" / "sparse" / "0" / "points3D.bin"
    if not p.exists():
        return 0
    try:
        # COLMAP binary: num_points3D is the first int64.
        import struct
        with open(p, "rb") as fh:
            return struct.unpack("<Q", fh.read(8))[0]
    except Exception:
        return 0
