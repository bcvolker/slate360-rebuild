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
        return _from_video(src, images_dir, cfg, start=1)
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
    if copied:
        return StageResult(name="frames", status="done",
                           detail=f"copied {copied} images",
                           artifacts=[str(images_dir)])

    # Folder of stitched videos (e.g. high-pass + low-pass 360 exports).
    # Prefer .mp4/.mov over raw .insv / .lrv proxies.
    videos = [f for f in sorted(src.iterdir())
              if f.is_file() and f.suffix.lower() in {".mp4", ".mov", ".m4v", ".webm"}]
    if not videos:
        return StageResult(name="frames", status="failed",
                           error="no .jpg/.png images or stitched videos in folder")
    total = 0
    for vid in videos:
        start = total + 1
        res = _from_video(vid, images_dir, cfg, start=start)
        if res.status != "done":
            return StageResult(name="frames", status="failed",
                               error=f"{vid.name}: {res.error}")
        total = len(list(images_dir.glob("*.jpg")))
    return StageResult(name="frames", status="done",
                       detail=f"extracted {total} frames from {len(videos)} videos @ {cfg.fps} fps",
                       artifacts=[str(images_dir)])


def _from_video(src: Path, images_dir: Path, cfg, start: int = 1) -> StageResult:
    if not _have_ffmpeg():
        return StageResult(
            name="frames", status="failed",
            error="ffmpeg not found on PATH. Install ffmpeg "
                  "(winget install Gyan.FFmpeg) and retry.")
    pattern = str(images_dir / "%06d.jpg")
    start_number = ["-start_number", str(max(1, start))]
    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-vf", f"fps={cfg.fps}",
        "-q:v", "2",
    ]
    if cfg.max_duration and cfg.max_duration > 0:
        cmd += ["-t", str(cfg.max_duration)]
    cmd += start_number
    cmd.append(pattern)
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
