"""Stage 1 - Prepare images.

REAL stage. Extracts JPG frames from a video with ffmpeg, or copies images
from a folder. For 360 video, frames are extracted as equirectangular JPGs;
the equirect handling happens in the SfM stage. Also computes exposure/
sharpness stats on a sample of frames (extracted/quality.json) so the UI can
warn the user BEFORE training on a dark or soft capture instead of silently
producing a soft model - the reference studio's kitchen job flagged this
exact capture as low quality and switched to a degraded training preset; we
show the number and let the user decide, rather than hiding it.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from result import StageResult

# Thresholds from docs/ops/SPLAT_LAB_PARITY_BUILD_PLAN.md Sec 4.1, calibrated
# against the reference studio's own kitchen job (luma 59.5/255, 23.4% deep
# shadow, Laplacian variance ~100 at 1920px - a capture it flagged as low
# quality and visibly softened in training).
QUALITY_LUMA_MIN = 70.0
QUALITY_SHADOW_MAX = 0.20
QUALITY_SHARPNESS_MIN = 150.0


def _have_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None


def _is_video(path: Path) -> bool:
    return path.suffix.lower() in {".mp4", ".mov", ".m4v", ".webm", ".avi", ".insv"}


def run(cfg, ctx) -> StageResult:
    src = Path(cfg.input_path)
    images_dir: Path = ctx["images_dir"]
    images_dir.mkdir(parents=True, exist_ok=True)

    existing = list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.png"))
    if len(existing) >= 10:
        _write_quality_json(ctx, images_dir)
        return StageResult(
            name="frames", status="done",
            detail=f"reused {len(existing)} existing frames",
            artifacts=[str(images_dir)])

    if src.is_dir():
        result = _from_folder(src, images_dir, cfg)
    elif src.is_file() and _is_video(src):
        result = _from_video(src, images_dir, cfg, start=1)
    else:
        return StageResult(
            name="frames", status="failed",
            error=f"input is not a folder or a supported video file: {src}")

    if result.status == "done":
        _write_quality_json(ctx, images_dir)
    return result


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


def _write_quality_json(ctx: dict, images_dir: Path) -> None:
    out_path = ctx["job_dir"] / "quality.json"
    try:
        import cv2
        import numpy as np
    except ImportError:
        out_path.write_text(json.dumps({"error": "opencv/numpy not installed - quality check skipped"}),
                            encoding="utf-8")
        return

    frames = sorted(images_dir.glob("*.jpg")) + sorted(images_dir.glob("*.png"))
    if not frames:
        return
    idx = np.linspace(0, len(frames) - 1, min(24, len(frames))).astype(int)
    lumas, shadows, clips, sharps = [], [], [], []
    for i in idx:
        im = cv2.imread(str(frames[int(i)]), cv2.IMREAD_COLOR)
        if im is None:
            continue
        small = cv2.resize(im, (1920, max(1, int(1920 * im.shape[0] / max(1, im.shape[1])))),
                           interpolation=cv2.INTER_AREA)
        g = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        lumas.append(float(g.mean()))
        shadows.append(float((g < 30).mean()))
        clips.append(float((g > 245).mean()))
        sharps.append(float(cv2.Laplacian(g, cv2.CV_64F).var()))
    if not lumas:
        return
    mean_luma = sum(lumas) / len(lumas)
    mean_shadow = sum(shadows) / len(shadows)
    mean_sharp = sum(sharps) / len(sharps)
    low_quality = (mean_luma < QUALITY_LUMA_MIN or mean_shadow > QUALITY_SHADOW_MAX
                   or mean_sharp < QUALITY_SHARPNESS_MIN)
    quality = {
        "sampled": len(lumas),
        "meanLuma": round(mean_luma, 1),
        "deepShadowFraction": round(mean_shadow, 4),
        "clippedHighlightFraction": round(sum(clips) / len(clips), 4),
        "laplacianVariance": round(mean_sharp, 1),
        "lowQuality": low_quality,
        "message": (
            f"This capture is dim/soft (mean brightness {mean_luma:.0f}/255, "
            f"{mean_shadow * 100:.0f}% deep shadow). Expect a soft model. "
            "Re-shoot with lights on and locked exposure."
        ) if low_quality else None,
    }
    out_path.write_text(json.dumps(quality, indent=2), encoding="utf-8")
    ctx["quality"] = quality
