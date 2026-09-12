"""Stage 1 — Prepare images.

REAL stage. Extracts JPG frames from a video with ffmpeg, or copies images
from a folder. For 360 video, frames are extracted as equirectangular JPGs
(the equirect->6-cubeface split happens in the SfM stage once nerfstudio is
wired in a later slice). Downscale is handled in SfM; here we keep source res.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from result import StageResult


def _have_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None


def _is_video(path: Path) -> bool:
    return path.suffix.lower() in {".mp4", ".mov", ".m4v", ".webm", ".avi", ".insv"}


def run(cfg, ctx) -> StageResult:
    src = Path(cfg.input_path)
    images_dir: Path = ctx["images_dir"]
    images_dir.mkdir(parents=True, exist_ok=True)

    if src.is_dir():
        return _from_folder(src, images_dir, cfg)
    if src.is_file() and _is_video(src):
        return _from_video(src, images_dir, cfg)
    return StageResult(
        name="frames", status="failed",
        error=f"input is not a folder or a supported video file: {src}")


def _from_folder(src: Path, images_dir: Path, cfg) -> StageResult:
    exts = {".jpg", ".jpeg", ".png"}
    copied = 0
    for f in sorted(src.rglob("*")):
        if f.suffix.lower() in exts and f.is_file():
            shutil.copy2(f, images_dir / f"{copied + 1:06d}{f.suffix.lower()}")
            copied += 1
    if copied == 0:
        return StageResult(name="frames", status="failed",
                           error="no .jpg/.png images found in folder")
    return StageResult(name="frames", status="done",
                        detail=f"copied {copied} images",
                        artifacts=[str(images_dir)])


def _from_video(src: Path, images_dir: Path, cfg) -> StageResult:
    if not _have_ffmpeg():
        return StageResult(
            name="frames", status="failed",
            error="ffmpeg not found on PATH. Install ffmpeg "
                  "(winget install Gyan.FFmpeg) and retry.")
    pattern = str(images_dir / "%06d.jpg")
    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-vf", f"fps={cfg.fps}",
        "-q:v", "2",
        pattern,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
    except subprocess.TimeoutExpired:
        return StageResult(name="frames", status="failed",
                            error="ffmpeg timed out (>1h)")
    if proc.returncode != 0:
        return StageResult(name="frames", status="failed",
                            error=f"ffmpeg failed: {proc.stderr[-500:]}")
    count = len(list(images_dir.glob("*.jpg")))
    if count == 0:
        return StageResult(name="frames", status="failed",
                           error="ffmpeg produced no frames (codec unsupported?)")
    label = "equirect frames" if cfg.is360 else "frames"
    return StageResult(name="frames", status="done",
                        detail=f"extracted {count} {label} @ {cfg.fps} fps",
                        artifacts=[str(images_dir)])
