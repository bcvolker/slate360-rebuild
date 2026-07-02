"""
Slate360 Digital Twin — Modal GPU worker for Gaussian-splat photogrammetry.

HTTP contract (POST /reconstruct):
  Request JSON: jobId, orgId, spaceId, captureId, sourceKeys[], is360Flags[],
                quality, speed, modelType, newAssetIds[]
  Response: HTTP 200 immediately, header x-modal-run-id: <spawn id>
  Processing runs asynchronously on GPU; completion/failure POSTs a signed callback
  to ${SITE_URL}/api/digital-twin/jobs/callback.
"""

from __future__ import annotations

import glob
import gzip
import hashlib
import hmac
import json
import os
import re
import shutil
import subprocess
import threading
import time
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import modal

APP_NAME = "slate360-twin-gaussian-splat"
SECRET_NAME = "slate360-twin-worker"
WEB_ENDPOINT_LABEL = "reconstruct"

# A10G: 24 GB VRAM, strong price/perf for Splatfacto on typical phone captures.
# max_duration 3600 s matches long-running photogrammetry jobs on Modal.
GPU_TYPE = "A10G"
MAX_DURATION_SECONDS = 3600

VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".heic", ".heif"}

app = modal.App(APP_NAME)

worker_secret = modal.Secret.from_name(SECRET_NAME)

web_image = modal.Image.debian_slim(python_version="3.11").pip_install("fastapi[standard]")

gpu_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install(
        "ffmpeg",
        "git",
        "colmap",
        "libgl1",
        "libglib2.0-0",
        "curl",
        "ca-certificates",
        "gnupg",
        "xvfb",
        "libxcb1",
        "libxkbcommon0",
        "mesa-vulkan-drivers",
        "libvulkan1",
        "vulkan-tools",
    )
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
        "node --version",
        "npm --version",
        "colmap -h >/dev/null",
        "ffmpeg -version >/dev/null",
        "ls -la /usr/share/vulkan/icd.d/ || true",
    )
    .pip_install(
        "boto3==1.35.99",
        "requests==2.32.3",
    )
    .run_commands(
        # torch 2.4.1+cu121: matches gsplat 1.4.0 prebuilt wheel index pt24cu121.
        "pip install torch==2.4.1 torchvision==0.19.1 "
        "--index-url https://download.pytorch.org/whl/cu121",
        "pip install ninja numpy jaxtyping rich",
        "pip install nerfstudio==1.1.5",
        # Override PyPI gsplat (no bundled CUDA ops) with prebuilt wheel for pt24cu121.
        "pip install gsplat==1.4.0 --force-reinstall --no-deps "
        "--index-url https://docs.gsplat.studio/whl/pt24cu121",
        "pip install tensorboard",
        "python -c \"import torch; from gsplat.cuda._backend import _C; "
        "assert _C is not None, 'gsplat CUDA ops missing'; "
        "print('gsplat ok:', torch.__version__, getattr(_C, 'CameraModelType', None))\"",
    )
)


def dumps_json(payload: dict[str, Any]) -> bytes:
    """Compact JSON bytes (matches JavaScript JSON.stringify spacing)."""
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sign_callback_body(raw_body: bytes, secret: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def output_storage_key(org_id: str, space_id: str, job_id: str) -> str:
    return f"orgs/{org_id}/digital-twin/{space_id}/models/{job_id}.spz"


# Pinned so the tool can't change under us; escalating opacity floors shrink huge/noisy
# models until the .spz WASM writer fits in memory. Floaters are low-opacity, so higher
# floors ALSO denoise and keep the interactive-link file small.
SPLAT_TRANSFORM_PKG = "@playcanvas/splat-transform@2.7.1"
SPLAT_OPACITY_TIERS = [0.05, 0.15, 0.30, 0.50, 0.70]
SPLAT_SCALE_CAP = 0.3  # drop big blurry floater gaussians (was 0.5)


def splat_transform_clean_export(ply_path: Path, spz_path: Path) -> None:
    """CPU-only post-export cleanup + .spz convert with escalating opacity filtering.

    A large/noisy scene (e.g. a sunlit reflective subject) trains into millions of
    gaussians; the WASM .spz writer then OOMs ("Aborted()") writing a ~1GB file. Each
    tier raises the opacity floor, removing more low-opacity floaters, until the write
    succeeds — which also cleans noise and keeps the shared model small. Raises only if
    even the most aggressive tier fails.
    """
    last_err: Exception | None = None
    for op in SPLAT_OPACITY_TIERS:
        try:
            if spz_path.exists():
                spz_path.unlink()
            run_cmd(
                [
                    "npx", "-y", SPLAT_TRANSFORM_PKG,
                    "-w", str(ply_path),
                    "--filter-nan",
                    "--filter-value", f"opacity,gte,{op}",
                    "--filter-value", f"scale_0,lte,{SPLAT_SCALE_CAP}",
                    "--filter-value", f"scale_1,lte,{SPLAT_SCALE_CAP}",
                    "--filter-value", f"scale_2,lte,{SPLAT_SCALE_CAP}",
                    str(spz_path),
                    "--spz-version", "3",
                ]
            )
            if spz_path.is_file() and spz_path.stat().st_size > 0:
                mb = spz_path.stat().st_size / (1024 * 1024)
                print(f"[export] spz written at opacity>={op}: {mb:.1f} MB")
                return
            last_err = RuntimeError("splat-transform produced no output")
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            print(f"[export] splat-transform failed at opacity>={op} — escalating: {type(exc).__name__}")
    raise RuntimeError(f"SPZ export failed after all opacity tiers: {last_err}")


# splatfacto default; explicit conservative cull (cleaner than splatfacto-big's 0.005).
CULL_ALPHA_THRESH = 0.1


def apply_orientation_override(processed_dir: Path, method: str = "up") -> None:
    """Nerfstudio 1.1.5 reads orientation_override from transforms.json (no ns-train CLI flag)."""
    transforms_path = processed_dir / "transforms.json"
    if not transforms_path.is_file():
        raise RuntimeError(f"Missing transforms.json in {processed_dir}")
    data = json.loads(transforms_path.read_text(encoding="utf-8"))
    data["orientation_override"] = method
    transforms_path.write_text(
        json.dumps(data, indent=2) + "\n",
        encoding="utf-8",
    )


def resolve_matching_method(ingest_stats: dict[str, int]) -> str:
    """Video frame sequences are ordered — sequential COLMAP matching is faster and stabler."""
    if ingest_stats.get("videos", 0) > 0:
        return "sequential"
    return "exhaustive"


# ── LiDAR COLMAP bypass ──────────────────────────────────────────────────────

def get_video_creation_time(video_path: Path) -> float | None:
    """Return Unix timestamp of video recording start via ffprobe metadata.

    iPhone MP4 files store a UTC creation_time in the format/stream tags.
    Returns None if the tag is absent or unparseable.
    """
    try:
        for ffprobe_args in [
            ["-show_format"],   # format-level tags (most reliable on iPhone MP4)
            ["-show_streams"],  # stream-level tags (fallback)
        ]:
            result = subprocess.run(
                ["ffprobe", "-v", "quiet", "-print_format", "json"] + ffprobe_args + [str(video_path)],
                capture_output=True,
                text=True,
                check=False,
            )
            data = json.loads(result.stdout or "{}")
            creation_time: str | None = None
            # Check format tags
            creation_time = (data.get("format") or {}).get("tags", {}).get("creation_time")
            if not creation_time:
                for stream in data.get("streams", []):
                    creation_time = (stream.get("tags") or {}).get("creation_time")
                    if creation_time:
                        break
            if creation_time:
                from datetime import datetime, timezone
                # ISO 8601: "2024-01-15T14:30:00.000000Z"
                return datetime.fromisoformat(
                    creation_time.replace("Z", "+00:00")
                ).timestamp()
    except Exception:
        pass
    return None


def get_video_duration(video_path: Path) -> float | None:
    """Return video duration in seconds via ffprobe, or None on failure."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(video_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        data = json.loads(result.stdout or "{}")
        raw = (data.get("format") or {}).get("duration")
        return float(raw) if raw else None
    except Exception:
        return None


def arkit_to_nerfstudio_c2w(transform_4x4: list) -> list:
    """Convert ARKit column-major flat c2w to Nerfstudio row-major 4×4 list.

    ARKit: camera +X right, +Y up, +Z backward (looks in −Z).
    COLMAP/Nerfstudio: camera +X right, +Y down, +Z forward (looks in +Z).
    The conversion negates Y and Z columns of the c2w matrix.
    """
    import numpy as np

    # Swift stores simd_float4x4 as columns; reshape column-major → [row, col].
    c2w = np.array(transform_4x4, dtype=np.float64).reshape(4, 4, order="F")
    c2w[:3, 1] *= -1  # flip Y column
    c2w[:3, 2] *= -1  # flip Z column
    return c2w.tolist()


def _match_and_write_transforms(
    keyframes: list[dict],
    extracted: list[tuple[Path, float]],
    bypass_images: Path,
    processed_dir: Path,
) -> int:
    """Match video frames to ARKit keyframes by timestamp and write transforms.json.

    `extracted` pairs each frame with its absolute wall-clock time — computed per
    source video, so multi-clip captures (one video per clip, shared world frame)
    match correctly. Returns the number of matched frames (0 on total failure).
    """
    if not keyframes or not extracted:
        return 0

    first_kf = keyframes[0]
    intr = first_kf.get("intrinsics", {})
    fl_x = float(intr.get("fx", 0))
    fl_y = float(intr.get("fy", 0))
    cx = float(intr.get("cx", 0))
    cy = float(intr.get("cy", 0))
    if fl_x <= 0 or fl_y <= 0:
        raise ValueError("Invalid camera intrinsics in poses JSON")

    w = int(first_kf.get("w") or round(cx * 2))
    h = int(first_kf.get("h") or round(cy * 2))

    frames_data = []
    skipped = 0
    for frame_path, frame_wall_time in extracted:
        nearest_kf = min(keyframes, key=lambda kf: abs(kf["timestamp"] - frame_wall_time))
        time_delta = abs(nearest_kf["timestamp"] - frame_wall_time)

        if time_delta > 2.0 or "transform_4x4" not in nearest_kf:
            skipped += 1
            continue

        c2w = arkit_to_nerfstudio_c2w(nearest_kf["transform_4x4"])
        dest_name = f"frame_{len(frames_data):04d}.jpg"
        dest_path = bypass_images / dest_name
        shutil.copy2(str(frame_path), str(dest_path))
        frames_data.append({
            "file_path": f"images/{dest_name}",
            "transform_matrix": c2w,
        })

    if skipped > 0:
        print(f"[lidar-bypass] {skipped}/{len(extracted)} frames skipped (>2 s delta or missing pose)")

    if not frames_data:
        return 0

    transforms = {
        "camera_model": "OPENCV",
        "fl_x": fl_x,
        "fl_y": fl_y,
        "cx": cx,
        "cy": cy,
        "w": w,
        "h": h,
        "k1": 0.0,
        "k2": 0.0,
        "p1": 0.0,
        "p2": 0.0,
        # ARKit worldAlignment=.gravity means Y is already up — skip reorientation.
        "orientation_override": "none",
        "frames": frames_data,
    }

    transforms_path = processed_dir / "transforms.json"
    transforms_path.write_text(json.dumps(transforms, indent=2), encoding="utf-8")
    return len(frames_data)


def _transform_and_write_lidar_ply(src_path: Path, dest_path: Path) -> int:
    """Read ARKit LiDAR PLY, apply Nerfstudio axis convention, write to dest_path.

    ARKit world: +Y up, +Z backward.  Nerfstudio: +Y down, +Z forward.
    Equivalent point transform: negate Y and Z (same flip applied to c2w columns).

    Writes binary-little-endian PLY with x y z red green blue vertex layout
    (the minimum Nerfstudio's splatfacto dataparser requires for ply_file_path).
    Returns point count, or 0 on any failure.
    """
    import numpy as np

    try:
        with src_path.open("rb") as fh:
            header_lines: list[str] = []
            while True:
                line = fh.readline().decode("ascii", errors="ignore").strip()
                header_lines.append(line)
                if line == "end_header":
                    break
            header = "\n".join(header_lines)

            vertex_count = 0
            props: list[tuple[str, str]] = []
            in_vertex = False
            for line in header_lines:
                if line.startswith("element vertex"):
                    vertex_count = int(line.split()[-1])
                    in_vertex = True
                elif line.startswith("element"):
                    in_vertex = False
                elif in_vertex and line.startswith("property"):
                    parts = line.split()
                    if parts[1] != "list":
                        props.append((parts[2], parts[1]))

            if vertex_count == 0:
                return 0

            prop_names = [nm for nm, _ in props]
            has_rgb = all(c in prop_names for c in ("red", "green", "blue"))

            if "format binary_little_endian" in header:
                dt = np.dtype([
                    (nm, "<" + _PLY_NP_TYPE.get(tp, "f4"))
                    for nm, tp in props
                ])
                arr = np.fromfile(fh, dtype=dt, count=vertex_count)
                xyz = np.stack(
                    [arr["x"].astype(np.float32), arr["y"].astype(np.float32), arr["z"].astype(np.float32)],
                    axis=1,
                )
                rgb = (
                    np.stack([arr["red"], arr["green"], arr["blue"]], axis=1)
                    if has_rgb
                    else np.full((vertex_count, 3), 180, dtype=np.uint8)
                )
            elif "format ascii" in header:
                data = np.loadtxt(fh, max_rows=vertex_count)
                xyz = data[:, :3].astype(np.float32)
                rgb = (
                    np.clip(data[:, 3:6], 0, 255).astype(np.uint8)
                    if has_rgb and data.shape[1] >= 6
                    else np.full((vertex_count, 3), 180, dtype=np.uint8)
                )
            else:
                return 0

        # Apply Nerfstudio world-axis convention: negate Y and Z.
        xyz[:, 1] *= -1
        xyz[:, 2] *= -1

        # Write binary-little-endian PLY (Nerfstudio NerfstudioDataParser reads this
        # via the "ply_file_path" key in transforms.json as initial Gaussian seeds).
        ply_header = (
            "ply\n"
            "format binary_little_endian 1.0\n"
            f"element vertex {len(xyz)}\n"
            "property float x\n"
            "property float y\n"
            "property float z\n"
            "property uchar red\n"
            "property uchar green\n"
            "property uchar blue\n"
            "end_header\n"
        )
        out_dt = np.dtype([
            ("x", "<f4"), ("y", "<f4"), ("z", "<f4"),
            ("red", "u1"), ("green", "u1"), ("blue", "u1"),
        ])
        out = np.zeros(len(xyz), dtype=out_dt)
        out["x"] = xyz[:, 0]
        out["y"] = xyz[:, 1]
        out["z"] = xyz[:, 2]
        out["red"] = rgb[:, 0]
        out["green"] = rgb[:, 1]
        out["blue"] = rgb[:, 2]

        with dest_path.open("wb") as fh:
            fh.write(ply_header.encode("ascii"))
            out.tofile(fh)

        return len(xyz)

    except Exception as exc:  # noqa: BLE001
        print(f"[lidar-bypass] PLY transform failed: {type(exc).__name__}: {exc}")
        return 0


def maybe_gunzip(path: Path) -> None:
    """Transparently decompress a gzip-compressed download in place.

    The native uploader gzips the LiDAR PLY + poses JSON before upload (5-20x
    smaller on cellular). Detection is by magic bytes, not filename, so both
    compressed (.ply.gz) and legacy uncompressed uploads work unchanged.
    """
    try:
        with path.open("rb") as fh:
            magic = fh.read(2)
        if magic != b"\x1f\x8b":
            return
        tmp = path.with_suffix(path.suffix + ".gunzipped")
        with gzip.open(path, "rb") as src, tmp.open("wb") as dst:
            shutil.copyfileobj(src, dst)
        tmp.replace(path)
        print(f"[gunzip] decompressed {path.name}")
    except Exception as exc:  # noqa: BLE001
        print(f"[gunzip] failed for {path.name} (continuing with raw file): {exc}")


def try_lidar_bypass(
    s3,
    bucket: str,
    lidar_poses_key: str,
    lidar_ply_key: str | None,
    source_dir: Path,
    work_root: Path,
    processed_dir: Path,
    source_keys: list[str] | None = None,
) -> tuple[bool, bool]:
    """Attempt to bypass COLMAP using ARKit poses from the LiDAR plugin.

    Downloads poses JSON, extracts frames from the video with the best temporal
    overlap, matches each frame to the nearest ARKit keyframe by wall-clock time,
    and writes transforms.json to processed_dir.

    If lidar_ply_key is provided, also downloads the raw LiDAR PLY, converts
    it to Nerfstudio world-space, and seeds splatfacto via ply_file_path —
    the biggest single quality improvement available for LiDAR captures.

    Returns (bypass_used, ply_init_used).  Falls back gracefully: returns
    (False, False) if there is insufficient data, wrong timestamps, or any exception.
    """
    try:
        print("[lidar-bypass] attempting COLMAP bypass with ARKit poses")

        # 1. Download and parse poses JSON
        poses_path = source_dir / "_lidar_poses.json"
        s3.download_file(bucket, lidar_poses_key, str(poses_path))
        maybe_gunzip(poses_path)
        with poses_path.open(encoding="utf-8") as f:
            poses_data = json.load(f)

        keyframes: list[dict] = poses_data.get("frames", [])
        if len(keyframes) < 5:
            print(f"[lidar-bypass] only {len(keyframes)} keyframes — need ≥5, falling back to COLMAP")
            return False, False

        kf_timestamps = [kf["timestamp"] for kf in keyframes if "timestamp" in kf]
        if not kf_timestamps:
            print("[lidar-bypass] keyframes missing timestamps, falling back to COLMAP")
            return False, False

        kf_start = min(kf_timestamps)
        kf_end = max(kf_timestamps)
        session_start: float = poses_data.get("session_start_time") or kf_start

        # 2. Extract + time-stamp frames from EVERY capture video. Multi-clip captures
        #    upload one video per clip, all sharing the ARSession world frame; each
        #    clip's exact wall-clock start comes from poses_data["clips"] (written at
        #    capture), with ffprobe creation_time as fallback. Unrelated videos (e.g.
        #    drone footage) are harmless — their frames land >2 s from any keyframe
        #    and the matcher drops them.
        video_files = sorted(
            [p for p in source_dir.iterdir() if p.suffix.lower() in VIDEO_EXTENSIONS],
            key=lambda p: p.stat().st_size,
            reverse=True,
        )
        if not video_files:
            print("[lidar-bypass] no video source, falling back to COLMAP")
            return False, False

        clips_meta: dict[str, dict] = {}
        for clip in poses_data.get("clips") or []:
            if isinstance(clip, dict) and clip.get("video"):
                clips_meta[str(clip["video"])] = clip

        # download_sources renames videos to source_NNNN.<ext>, and R2 key basenames
        # carry a Date.now() prefix (buildS3Key) — so map each local name back to the
        # ORIGINAL upload filename to look up poses clips[] metadata. Without this the
        # clips lookup never matches and the creation_time fallback can attach wrong
        # poses (AVAssetWriter's mvhd time is the clip END, inside the next clip's
        # keyframe window on back-to-back clips).
        orig_names: dict[str, str] = {}
        for i, k in enumerate(source_keys or []):
            suffix = Path(k).suffix.lower() or ".bin"
            orig_names[f"source_{i:04d}{suffix}"] = re.sub(r"^\d+_", "", Path(k).name)

        bypass_frames_dir = work_root / "_bypass_frames"
        bypass_frames_dir.mkdir(parents=True, exist_ok=True)
        extracted: list[tuple[Path, float]] = []  # (frame_path, wall_clock_time)

        for vi, vp in enumerate(video_files):
            orig = orig_names.get(vp.name, vp.name)
            meta = clips_meta.get(orig)
            if clips_meta and meta is None:
                # Capture declared its clip videos — anything else (e.g. a drone video
                # shot at the same time) must NOT be pose-matched against phone poses.
                print(f"[lidar-bypass] {orig}: not a capture clip; skipped")
                continue
            if meta and isinstance(meta.get("start_time"), (int, float)):
                v_start: float | None = float(meta["start_time"])
            else:
                v_start = get_video_creation_time(vp)
            if v_start is None:
                if vi == 0 and not clips_meta:
                    # Largest video with no start info — legacy single-clip fallback.
                    v_start = session_start
                    print(f"[lidar-bypass] {orig}: no start time; assuming session_start")
                else:
                    print(f"[lidar-bypass] {orig}: no start time; skipped")
                    continue
            vdir = bypass_frames_dir / f"v{vi}"
            vdir.mkdir(parents=True, exist_ok=True)
            # 2 fps matches the 0.5 s keyframe interval.
            run_cmd([
                "ffmpeg", "-y", "-i", str(vp),
                "-vf", "fps=2", "-q:v", "2",
                str(vdir / "frame_%04d.jpg"),
            ])
            for fp in sorted(vdir.glob("frame_*.jpg")):
                fidx = int(fp.stem.split("_")[-1])  # ffmpeg 1-indexed
                extracted.append((fp, v_start + (fidx - 1) / 2.0))

        if len(extracted) < 5:
            print(f"[lidar-bypass] only {len(extracted)} frames extracted — need ≥5, falling back to COLMAP")
            return False, False

        # 4. Build processed_dir with transforms.json and images/
        processed_dir.mkdir(parents=True, exist_ok=True)
        bypass_images = processed_dir / "images"
        bypass_images.mkdir(parents=True, exist_ok=True)

        matched = _match_and_write_transforms(
            keyframes, extracted, bypass_images, processed_dir,
        )

        if matched < 5:
            print(f"[lidar-bypass] only {matched} matched frames — need ≥5, falling back to COLMAP")
            shutil.rmtree(str(processed_dir), ignore_errors=True)
            return False, False

        print(f"[lidar-bypass] success — {matched} frames matched; COLMAP skipped")

        # 5. Optionally seed splatfacto with the LiDAR point cloud.
        #    Transforms points to Nerfstudio world-space (negate Y + Z, same as c2w).
        #    Adds "ply_file_path" to transforms.json so the NerfstudioDataParser
        #    provides real geometry to splatfacto instead of random initialization.
        ply_init_used = False
        if lidar_ply_key:
            raw_ply = source_dir / "_lidar_raw.ply"
            try:
                s3.download_file(bucket, lidar_ply_key, str(raw_ply))
                maybe_gunzip(raw_ply)
                init_ply = processed_dir / "lidar_init.ply"
                point_count = _transform_and_write_lidar_ply(raw_ply, init_ply)
                if point_count >= 100:
                    # Patch transforms.json with the ply_file_path key.
                    transforms_path = processed_dir / "transforms.json"
                    tdata = json.loads(transforms_path.read_text(encoding="utf-8"))
                    tdata["ply_file_path"] = "lidar_init.ply"
                    transforms_path.write_text(json.dumps(tdata, indent=2), encoding="utf-8")
                    ply_init_used = True
                    print(f"[lidar-bypass] PLY seed: {point_count} points written to lidar_init.ply")
                else:
                    print(f"[lidar-bypass] PLY seed skipped: only {point_count} points (need ≥100)")
            except Exception as ply_exc:  # noqa: BLE001
                print(f"[lidar-bypass] PLY seed failed (non-fatal): {type(ply_exc).__name__}: {ply_exc}")

        return True, ply_init_used

    except Exception as exc:  # noqa: BLE001
        print(f"[lidar-bypass] failed (non-fatal): {type(exc).__name__}: {exc}")
        shutil.rmtree(str(processed_dir), ignore_errors=True)
        return False, False


def quality_speed_iterations(quality: str, speed: str) -> int:
    base = {"draft": 15_000, "standard": 30_000, "high": 45_000}.get(quality, 30_000)
    if speed == "fast":
        return max(10_000, int(base * 0.65))
    if speed == "slow":
        return int(base * 1.35)
    return base


def run_cmd(
    cmd: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    timeout: int | None = None,
) -> None:
    merged_env = os.environ.copy()
    # COLMAP (via nerfstudio) needs a headless Qt platform on Modal GPU containers.
    merged_env["QT_QPA_PLATFORM"] = "offscreen"
    if env:
        merged_env.update(env)
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            env=merged_env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            check=False,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        # A hung stage must fail VISIBLY (→ failure callback → job marked failed) rather
        # than sit until Modal's hard container timeout kills us with no callback.
        raise RuntimeError(f"Command timed out after {timeout}s: {' '.join(cmd[:3])}…")
    if proc.returncode != 0:
        tail = (proc.stdout or "")[-8000:]
        raise RuntimeError(
            f"Command failed ({proc.returncode}): {' '.join(cmd)}\n{tail}"
        )


def run_with_heartbeat(
    cmd: list[str],
    *,
    job_id: str,
    stage: str,
    start_pct: int,
    end_pct: int,
    expected_sec: float,
    timeout: int | None = None,
    env: dict[str, str] | None = None,
) -> None:
    """Run a long, self-silent subprocess (splat training) while a background thread
    nudges progress start_pct → end_pct-1 every 20 s, so the UI shows real movement
    instead of sitting frozen at one number. Capped just below end_pct until the real
    stage-completion post fires."""
    stop = threading.Event()

    def beat() -> None:
        t0 = time.monotonic()
        while not stop.wait(20):
            frac = min(1.0, (time.monotonic() - t0) / max(1.0, expected_sec))
            pct = int(start_pct + (end_pct - 1 - start_pct) * frac)
            try:
                post_progress(job_id, stage, min(end_pct - 1, max(start_pct, pct)))
            except Exception:  # noqa: BLE001
                pass

    th = threading.Thread(target=beat, daemon=True)
    th.start()
    try:
        run_cmd(cmd, env=env, timeout=timeout)
    finally:
        stop.set()
        th.join(timeout=3)


def s3_client():
    import boto3

    endpoint = os.environ.get("R2_ENDPOINT", "").strip()
    if not endpoint:
        account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
        if account:
            endpoint = f"https://{account}.r2.cloudflarestorage.com"
    if not endpoint:
        raise RuntimeError("R2_ENDPOINT (or CLOUDFLARE_ACCOUNT_ID) is not configured")

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name=os.environ.get("R2_REGION", "auto"),
    )


def download_sources(
    s3,
    bucket: str,
    source_keys: list[str],
    dest_dir: Path,
) -> list[tuple[Path, bool]]:
    dest_dir.mkdir(parents=True, exist_ok=True)
    downloaded: list[tuple[Path, bool]] = []
    for idx, key in enumerate(source_keys):
        suffix = Path(key).suffix.lower() or ".bin"
        local_path = dest_dir / f"source_{idx:04d}{suffix}"
        s3.download_file(bucket, key, str(local_path))
        downloaded.append((local_path, idx))
    return downloaded


def sanitize_stem(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "_", name)[:80]


def extract_video_frames(video_path: Path, out_dir: Path, stem: str) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    pattern = out_dir / f"{stem}_%04d.jpg"
    run_cmd(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vf",
            "fps=2",
            "-q:v",
            "2",
            str(pattern),
        ]
    )
    frames = sorted(out_dir.glob(f"{stem}_*.jpg"))
    if not frames:
        raise RuntimeError(f"No frames extracted from video: {video_path.name}")
    return len(frames)


def extract_equirect_views(image_path: Path, out_dir: Path, stem: str) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    for yaw in range(0, 360, 30):
        out_path = out_dir / f"{stem}_yaw{yaw:03d}.jpg"
        run_cmd(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(image_path),
                "-vf",
                (
                    f"v360=input=equirect:output=flat:yaw={yaw}:pitch=0:roll=0:"
                    "w=1600:h=1200"
                ),
                str(out_path),
            ]
        )
        count += 1
    return count


def materialize_images(
    source_dir: Path,
    images_dir: Path,
    source_keys: list[str],
    is360_flags: list[bool],
) -> dict[str, int]:
    images_dir.mkdir(parents=True, exist_ok=True)
    stats = {"photos": 0, "videos": 0, "panorama_views": 0, "frames": 0}

    for idx, key in enumerate(source_keys):
        matches = list(source_dir.glob(f"source_{idx:04d}.*"))
        if not matches:
            raise RuntimeError(f"Missing downloaded source for index {idx}: {key}")
        src = matches[0]
        stem = sanitize_stem(Path(key).stem or f"asset_{idx}")
        is360 = bool(is360_flags[idx]) if idx < len(is360_flags) else False
        ext = src.suffix.lower()

        if ext in VIDEO_EXTENSIONS:
            stats["videos"] += 1
            frame_count = extract_video_frames(src, images_dir, stem)
            stats["frames"] += frame_count
            continue

        if is360 and ext in IMAGE_EXTENSIONS:
            stats["panorama_views"] += extract_equirect_views(src, images_dir, stem)
            continue

        if ext in IMAGE_EXTENSIONS:
            dest = images_dir / f"{stem}_{idx:04d}.jpg"
            # COLMAP on Debian often lacks PNG decode in FreeImage; normalize to JPEG.
            run_cmd(["ffmpeg", "-y", "-i", str(src), "-q:v", "2", str(dest)])
            stats["photos"] += 1
            continue

        raise RuntimeError(f"Unsupported source type for {key} ({ext})")

    image_files = [
        p
        for p in images_dir.iterdir()
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    ]
    if len(image_files) < 3:
        raise RuntimeError(
            f"Need at least 3 images for COLMAP; prepared {len(image_files)}"
        )
    return stats


def find_latest_file(root: Path, pattern: str) -> Path:
    matches = [Path(p) for p in glob.glob(str(root / pattern), recursive=True)]
    if not matches:
        raise RuntimeError(f"No files matching {pattern} under {root}")
    return max(matches, key=lambda p: p.stat().st_mtime)


def _ply_vertex_count(ply_path: Path) -> int:
    with ply_path.open("rb") as fh:
        while True:
            line = fh.readline().decode("ascii", errors="ignore").strip()
            if line == "end_header":
                break
            if line.startswith("element vertex"):
                return int(line.split()[-1])
    raise RuntimeError(f"Could not parse vertex count from {ply_path}")


# PLY scalar property type → numpy type code.
_PLY_NP_TYPE = {
    "float": "f4", "float32": "f4", "double": "f8", "float64": "f8",
    "uchar": "u1", "uint8": "u1", "char": "i1", "int8": "i1",
    "ushort": "u2", "uint16": "u2", "short": "i2", "int16": "i2",
    "uint": "u4", "uint32": "u4", "int": "i4", "int32": "i4",
}


def _read_ply_xyz(ply_path: Path, max_points: int = 400_000):
    """Read (N,3) float64 xyz from a PLY, parsing the FULL per-vertex stride.

    3DGS PLY vertices carry ~50+ properties (xyz, normals, SH coeffs, opacity,
    scales, rotation) so the per-vertex stride is ~200+ bytes. Reading only a
    12-byte (x,y,z) dtype mis-strides and yields garbage after vertex 0 — this
    parses every property so xyz is extracted at the correct offset.
    """
    import numpy as np

    with ply_path.open("rb") as fh:
        header_lines: list[str] = []
        while True:
            line = fh.readline().decode("ascii", errors="ignore").strip()
            header_lines.append(line)
            if line == "end_header":
                break
        header = "\n".join(header_lines)

        vertex_count = 0
        props: list[tuple[str, str]] = []  # (name, type)
        in_vertex = False
        for line in header_lines:
            if line.startswith("element vertex"):
                vertex_count = int(line.split()[-1])
                in_vertex = True
                continue
            if line.startswith("element"):
                in_vertex = False
                continue
            if in_vertex and line.startswith("property"):
                parts = line.split()
                if parts[1] == "list":
                    continue  # 3DGS PLYs are scalar-only; skip list props defensively
                props.append((parts[2], parts[1]))
        if vertex_count <= 0:
            raise RuntimeError(f"Could not parse vertex count from {ply_path}")

        if "format binary_little_endian" in header:
            dt = np.dtype([(nm, "<" + _PLY_NP_TYPE.get(tp, "f4")) for nm, tp in props])
            arr = np.fromfile(fh, dtype=dt, count=vertex_count)
            xyz = np.stack(
                [arr["x"].astype(np.float64), arr["y"].astype(np.float64), arr["z"].astype(np.float64)],
                axis=1,
            )
        elif "format ascii" in header:
            data = np.loadtxt(fh, max_rows=vertex_count)
            xyz = np.asarray(data[:, :3], dtype=np.float64)
        else:
            raise RuntimeError(f"Unsupported PLY format: {ply_path}")

    if xyz.shape[0] > max_points:
        idx = np.random.default_rng(0).choice(xyz.shape[0], max_points, replace=False)
        xyz = xyz[idx]
    return xyz


def compute_ply_bounds(ply_path: Path) -> dict[str, dict[str, float]]:
    import numpy as np

    xyz = _read_ply_xyz(ply_path)
    mn = xyz.min(axis=0)
    mx = xyz.max(axis=0)
    return {
        "min": {"x": float(mn[0]), "y": float(mn[1]), "z": float(mn[2])},
        "max": {"x": float(mx[0]), "y": float(mx[1]), "z": float(mx[2])},
    }


def _quat_from_to(a, b):
    """Quaternion [x,y,z,w] rotating unit vector a → unit vector b (Three.js order)."""
    import numpy as np

    a = a / (np.linalg.norm(a) or 1.0)
    b = b / (np.linalg.norm(b) or 1.0)
    d = float(np.clip(np.dot(a, b), -1.0, 1.0))
    if d > 0.999999:
        return np.array([0.0, 0.0, 0.0, 1.0])
    if d < -0.999999:
        axis = np.cross(a, np.array([1.0, 0.0, 0.0]))
        if np.linalg.norm(axis) < 1e-6:
            axis = np.cross(a, np.array([0.0, 0.0, 1.0]))
        axis = axis / np.linalg.norm(axis)
        return np.array([axis[0], axis[1], axis[2], 0.0])
    axis = np.cross(a, b)
    s = np.sqrt((1.0 + d) * 2.0)
    inv = 1.0 / s
    return np.array([axis[0] * inv, axis[1] * inv, axis[2] * inv, s * 0.5])


def generate_floor_plan(ply_path: Path, manifest: dict, export_dir: Path) -> "Path | None":
    """Rasterize a top-down floor-plan PNG from the Gaussian splat point cloud.

    Works in post-flip viewer space (pts = raw * [1, -1, -1]) so the XZ plane
    matches the viewer's floor orientation.  Non-fatal — returns None on any error.
    """
    try:
        from PIL import Image, ImageDraw, ImageFilter  # noqa: PLC0415
        import numpy as np  # noqa: PLC0415

        raw = _read_ply_xyz(ply_path)
        pts = raw * np.array([1.0, -1.0, -1.0])

        # Floor Y-min from manifest bounds (already in viewer space).
        floor_y = float(manifest["bounds"]["min"][1])

        # Slice at waist height — good for capturing walls without ceiling noise.
        lo_y = floor_y + 0.3
        hi_y = floor_y + 1.8
        mask = (pts[:, 1] >= lo_y) & (pts[:, 1] <= hi_y)
        slice_pts = pts[mask]

        if slice_pts.shape[0] < 100:
            # Fall back to full cloud if slice is too sparse.
            slice_pts = pts

        xz = slice_pts[:, [0, 2]]  # project onto XZ plane (drop Y)

        # Auto-fit to 1024x1024 canvas with a small margin.
        size = 1024
        margin = 20
        usable = size - 2 * margin

        x_min, z_min = xz.min(axis=0)
        x_max, z_max = xz.max(axis=0)
        x_range = x_max - x_min or 1.0
        z_range = z_max - z_min or 1.0
        scale = usable / max(x_range, z_range)

        # Map to pixel coordinates.
        px = ((xz[:, 0] - x_min) * scale + margin).astype(int)
        py = ((xz[:, 1] - z_min) * scale + margin).astype(int)
        px = px.clip(0, size - 1)
        py = py.clip(0, size - 1)

        img = Image.new("RGB", (size, size), color="#0B0F15")
        draw = ImageDraw.Draw(img)
        for x, y in zip(px.tolist(), py.tolist()):
            draw.ellipse([x - 1, y - 1, x + 1, y + 1], fill="white")

        img = img.filter(ImageFilter.GaussianBlur(radius=1.5))

        out_path = export_dir / "floorplan.png"
        img.save(str(out_path), format="PNG")
        return out_path

    except Exception as fp_err:  # noqa: BLE001
        print(f"generate_floor_plan failed (non-fatal): {fp_err}")
        return None


def compute_splat_manifest(ply_path: Path, fov_deg: float = 55.0) -> dict[str, Any]:
    """Bake orientation + framing the web viewer can apply deterministically.

    Works in the viewer's POST-flip space (the viewer renders splatMesh with
    rotation=[PI,0,0], i.e. raw*(1,-1,-1)); the correction_quaternion is applied
    to the PARENT group on top of that flip.
    """
    import numpy as np

    raw = _read_ply_xyz(ply_path)
    pts = raw * np.array([1.0, -1.0, -1.0])  # match viewer rotation=[Math.PI,0,0]

    # Tighter percentile clip (5-95) drops the outer floater shell that skewed centering;
    # the raw 1-99 box let floaters pull the box center off and inflate the radius (model
    # opened off-center + too far). center = MEDIAN (robust), radius from a tight spread.
    lo = np.percentile(pts, 5, axis=0)
    hi = np.percentile(pts, 95, axis=0)
    mask = np.all((pts >= lo) & (pts <= hi), axis=1)
    core = pts[mask] if int(mask.sum()) >= 100 else pts

    cmin = core.min(axis=0)
    cmax = core.max(axis=0)
    center = np.median(core, axis=0)
    p_lo = np.percentile(core, 3, axis=0)
    p_hi = np.percentile(core, 97, axis=0)
    radius = float(np.linalg.norm(p_hi - p_lo) / 2.0) or 1.0

    # Floor cluster = bottom 25% by Y; PCA smallest-variance axis ≈ floor normal.
    ycut = np.percentile(core[:, 1], 25)
    floor = core[core[:, 1] <= ycut]
    if floor.shape[0] < 50:
        floor = core
    cen = floor - floor.mean(axis=0)
    cov = (cen.T @ cen) / max(len(floor) - 1, 1)
    evals, evecs = np.linalg.eigh(cov)  # ascending
    normal = evecs[:, 0]
    if normal[1] < 0:
        normal = -normal
    tilt_deg = float(np.degrees(np.arccos(float(np.clip(normal[1], -1.0, 1.0)))))
    # Plane CONFIDENCE: a real floor is flat → smallest eigenvalue << next. A car interior /
    # featureless blob has comparable eigenvalues → the "floor normal" is noise, and the
    # normal[1]<0 sign rule then flips the whole model 180° (the upside-down bug). Only apply
    # the correction when the plane is genuinely flat AND not wildly tilted; otherwise trust
    # the capture orientation (identity) rather than a confident wrong flip.
    ev = np.sort(evals)
    planarity = float(1.0 - ev[0] / (ev[1] + 1e-9))
    if planarity >= 0.6 and tilt_deg < 45.0:
        q = _quat_from_to(normal, np.array([0.0, 1.0, 0.0]))
        manifest_up_axis = "Y_UP" if tilt_deg < 8.0 else "TILTED"
    else:
        q = np.array([0.0, 0.0, 0.0, 1.0])  # identity — no confident flip without a clear floor
        tilt_deg = 0.0
        manifest_up_axis = "UNKNOWN"

    vfov = np.deg2rad(fov_deg)
    dist = radius / np.sin(vfov / 2.0) * 1.2
    az, el = 0.55, 0.38
    dirv = np.array([np.sin(az) * np.cos(el), np.sin(el), np.cos(az) * np.cos(el)])
    pos = center + dirv * dist
    floor_y = float(cmin[1])

    return {
        "version": 1,
        "coordinate_system": "three_y_up_post_pi_flip",
        "bounds": {
            "min": cmin.tolist(),
            "max": cmax.tolist(),
            "center": center.tolist(),
            "radius": radius,
        },
        "up_axis": manifest_up_axis,
        "tilt_deg": tilt_deg,
        "correction_quaternion": [float(q[0]), float(q[1]), float(q[2]), float(q[3])],
        "recommended_orbit_camera": {
            "position": pos.tolist(),
            "target": center.tolist(),
            "fov": fov_deg,
            "near": max(radius / 500.0, 0.01),
            "far": float(dist + radius * 8.0),
        },
        "interior_entry_point": [float(center[0]), floor_y + 1.6, float(center[2])],
    }


def post_callback(payload: dict[str, Any]) -> None:
    import requests

    site_url = os.environ["SITE_URL"].rstrip("/")
    secret = os.environ["GPU_WORKER_SECRET_KEY"]
    url = f"{site_url}/api/digital-twin/jobs/callback"
    raw_body = dumps_json(payload)
    headers = {
        "Content-Type": "application/json",
        "x-worker-signature": sign_callback_body(raw_body, secret),
    }
    resp = requests.post(url, data=raw_body, headers=headers, timeout=60)
    if resp.status_code >= 400:
        raise RuntimeError(
            f"Callback rejected ({resp.status_code}): {resp.text[:2000]}"
        )


# Coarse pipeline stages the submit-status UI renders as a checklist. Kept in sync
# with the API route's VALID_STAGES and the UI's stage order.
#   upload → align → train → optimize → export → (completion callback = 100)
def post_progress(job_id: str, stage: str, progress_pct: int) -> None:
    """Best-effort progress heartbeat. Never fails the job — the frozen-5% bug was
    caused precisely by there being no progress signal, so a flaky heartbeat must
    degrade to the UI's time-based fallback rather than raise."""
    import requests

    try:
        site_url = os.environ["SITE_URL"].rstrip("/")
        secret = os.environ["GPU_WORKER_SECRET_KEY"]
        url = f"{site_url}/api/twin/jobs/{job_id}/progress"
        raw_body = dumps_json({"stage": stage, "progress_pct": progress_pct})
        headers = {
            "Content-Type": "application/json",
            "x-worker-signature": sign_callback_body(raw_body, secret),
        }
        resp = requests.post(url, data=raw_body, headers=headers, timeout=15)
        if resp.status_code >= 400:
            print(f"[progress] {stage} rejected ({resp.status_code}): {resp.text[:500]}")
    except Exception as exc:  # noqa: BLE001
        print(f"[progress] {stage} heartbeat failed (non-fatal): {type(exc).__name__}: {exc}")


@dataclass
class JobInput:
    job_id: str
    org_id: str
    space_id: str
    capture_id: str
    source_keys: list[str]
    is360_flags: list[bool]
    quality: str
    speed: str
    model_type: str
    new_asset_ids: list[str]
    lidar_poses_key: str | None = None
    lidar_ply_key: str | None = None

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> JobInput:
        required = [
            "jobId",
            "orgId",
            "spaceId",
            "captureId",
            "sourceKeys",
            "is360Flags",
            "quality",
            "speed",
            "modelType",
            "newAssetIds",
        ]
        missing = [k for k in required if k not in payload]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        if not isinstance(payload["sourceKeys"], list) or not payload["sourceKeys"]:
            raise ValueError("sourceKeys must be a non-empty list")
        if not isinstance(payload["is360Flags"], list):
            raise ValueError("is360Flags must be a list")
        if len(payload["is360Flags"]) != len(payload["sourceKeys"]):
            raise ValueError("is360Flags length must match sourceKeys length")
        return cls(
            job_id=str(payload["jobId"]),
            org_id=str(payload["orgId"]),
            space_id=str(payload["spaceId"]),
            capture_id=str(payload["captureId"]),
            source_keys=[str(k) for k in payload["sourceKeys"]],
            is360_flags=[bool(v) for v in payload["is360Flags"]],
            quality=str(payload["quality"]),
            speed=str(payload["speed"]),
            model_type=str(payload["modelType"]),
            new_asset_ids=[str(v) for v in payload["newAssetIds"]],
            lidar_poses_key=payload.get("lidarPosesKey") or None,
            lidar_ply_key=payload.get("lidarPlyKey") or None,
        )


def run_pipeline(job: JobInput, work_root: Path) -> dict[str, Any]:
    bucket = os.environ["R2_BUCKET"]
    s3 = s3_client()

    source_dir = work_root / "source"
    images_dir = work_root / "images"
    processed_dir = work_root / "processed"
    train_dir = work_root / "train"
    export_dir = work_root / "export"

    post_progress(job.job_id, "upload", 10)
    download_sources(s3, bucket, job.source_keys, source_dir)
    ingest_stats = materialize_images(
        source_dir, images_dir, job.source_keys, job.is360_flags
    )

    post_progress(job.job_id, "align", 25)
    lidar_bypass_used = False
    lidar_ply_init = False
    if job.lidar_poses_key:
        lidar_bypass_used, lidar_ply_init = try_lidar_bypass(
            s3, bucket, job.lidar_poses_key, job.lidar_ply_key,
            source_dir, work_root, processed_dir,
            source_keys=job.source_keys,
        )

    if not lidar_bypass_used:
        matching_method = resolve_matching_method(ingest_stats)
        run_cmd(
            [
                "xvfb-run",
                "-a",
                "-s",
                "-screen 0 800x600x24",
                "ns-process-data",
                "images",
                "--matching-method",
                matching_method,
                "--no-gpu",
                "--data",
                str(images_dir),
                "--output-dir",
                str(processed_dir),
                "--num-downscales",
                "2",
            ]
        )
        apply_orientation_override(processed_dir, "up")
    else:
        matching_method = "lidar_bypass"

    iterations = quality_speed_iterations(job.quality, job.speed)
    if lidar_bypass_used and lidar_ply_init:
        # PLY-seeded splatfacto converges from real geometry rather than random
        # init, reducing the iterations needed for equivalent quality by ~30%.
        iterations = max(10_000, int(iterations * 0.70))
        print(f"[lidar-bypass] PLY init active — reduced iterations to {iterations}")
    post_progress(job.job_id, "train", 45)
    # Training is self-silent for many minutes; heartbeat 45→84 so the UI shows movement,
    # and hard-timeout at 40 min so a hung train fails visibly instead of hanging until
    # Modal's container kill (which posts no callback).
    run_with_heartbeat(
        [
            "ns-train",
            "splatfacto",
            "--data",
            str(processed_dir),
            "--output-dir",
            str(train_dir),
            "--max-num-iterations",
            str(iterations),
            "--vis",
            "tensorboard",
            "--viewer.quit-on-train-completion",
            "True",
            "--pipeline.model.use-scale-regularization",
            "True",
            "--pipeline.model.cull-alpha-thresh",
            str(CULL_ALPHA_THRESH),
            # Stop densifying at ~57% of iterations so the model doesn't explode into
            # millions of gaussians (the 4M/1GB case) — fewer, cleaner splats + far lower
            # export/stream size, then refinement-only for the remainder.
            "--pipeline.model.stop-split-at",
            str(max(6_000, int(iterations * 0.57))),
        ],
        job_id=job.job_id,
        stage="train",
        start_pct=45,
        end_pct=85,
        expected_sec=900,
        timeout=2400,
        env={"CUDA_VISIBLE_DEVICES": "0"},
    )

    post_progress(job.job_id, "optimize", 85)
    config_path = find_latest_file(train_dir, "**/config.yml")
    run_cmd(
        [
            "ns-export",
            "gaussian-splat",
            "--load-config",
            str(config_path),
            "--output-dir",
            str(export_dir),
        ]
    )

    ply_path = find_latest_file(export_dir, "**/*.ply")
    spz_path = export_dir / "model.spz"
    splat_transform_clean_export(ply_path, spz_path)

    if not spz_path.is_file():
        raise RuntimeError("SPZ export did not produce model.spz")

    post_progress(job.job_id, "export", 95)
    bounds = compute_ply_bounds(ply_path)
    splat_count = _ply_vertex_count(ply_path)
    out_key = output_storage_key(job.org_id, job.space_id, job.job_id)
    s3.upload_file(
        str(spz_path),
        bucket,
        out_key,
        ExtraArgs={"ContentType": "application/octet-stream"},
    )
    file_size = spz_path.stat().st_size

    # Bake an orientation/framing manifest the web viewer applies deterministically.
    # Non-fatal: a failure here must never fail the job. Uploaded to the sibling
    # "<job>.manifest.json" key; the app derives its URL from the model storage key.
    manifest_key: str | None = None
    manifest: dict = {}
    try:
        manifest = compute_splat_manifest(ply_path)
        manifest_path = export_dir / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        manifest_key = out_key[: -len(".spz")] + ".manifest.json"
        s3.upload_file(
            str(manifest_path),
            bucket,
            manifest_key,
            ExtraArgs={
                "ContentType": "application/json",
                "CacheControl": "public, max-age=31536000, immutable",
            },
        )
    except Exception as manifest_exc:  # noqa: BLE001
        manifest_key = None
        print(f"Splat manifest computation/upload failed (non-fatal): {manifest_exc}")

    floorplan_key: str | None = None
    try:
        floorplan_path = generate_floor_plan(ply_path, manifest, export_dir)
        if floorplan_path and floorplan_path.is_file():
            floorplan_key = out_key[: -len(".spz")] + ".floorplan.png"
            s3.upload_file(
                str(floorplan_path),
                bucket,
                floorplan_key,
                ExtraArgs={"ContentType": "image/png", "CacheControl": "public, max-age=31536000, immutable"},
            )
    except Exception as fp_exc:  # noqa: BLE001
        floorplan_key = None
        print(f"Floor plan generation/upload failed (non-fatal): {fp_exc}")

    return {
        "outputKey": out_key,
        "manifestKey": manifest_key,
        "floorplanKey": floorplan_key,
        "fileSizeBytes": file_size,
        "bounds": bounds,
        "qualityMetrics": {
            "quality": job.quality,
            "speed": job.speed,
            "modelType": job.model_type,
            "iterations": iterations,
            "sourceCount": len(job.source_keys),
            "ingest": ingest_stats,
            "configPath": str(config_path),
            "matchingMethod": matching_method,
            "orientationMethod": "none" if lidar_bypass_used else "up",
            "lidarBypass": lidar_bypass_used,
            "lidarPlyInit": lidar_ply_init,
            "cullAlphaThresh": CULL_ALPHA_THRESH,
            "splatCount": splat_count,
        },
    }


@app.function(
    image=gpu_image,
    gpu=GPU_TYPE,
    timeout=MAX_DURATION_SECONDS,
    secrets=[worker_secret],
    retries=0,
)
def process_job(payload: dict[str, Any]) -> None:
    job_id = str(payload.get("jobId") or "")
    work_root = Path("/tmp") / f"twin-job-{job_id or 'unknown'}"
    if work_root.exists():
        shutil.rmtree(work_root, ignore_errors=True)
    work_root.mkdir(parents=True, exist_ok=True)

    try:
        job = JobInput.from_payload(payload)
        if job.model_type != "gaussian_splat":
            raise ValueError(f"Unsupported modelType: {job.model_type}")

        result = run_pipeline(job, work_root)
        success_body = {
            "jobId": job.job_id,
            "status": "completed",
            "outputKey": result["outputKey"],
            "modelFormat": "spz",
            "fileSizeBytes": result["fileSizeBytes"],
            "newAssetIds": job.new_asset_ids,
            "bounds": result["bounds"],
            "qualityMetrics": result["qualityMetrics"],
            "floorplanKey": result.get("floorplanKey"),
        }
        post_callback(success_body)
    except Exception as exc:
        err = f"{type(exc).__name__}: {exc}"
        tb = traceback.format_exc()
        print(tb)
        if job_id:
            try:
                post_callback(
                    {
                        "jobId": job_id,
                        "status": "failed",
                        "errorLog": err[:4000],
                    }
                )
            except Exception as callback_exc:
                print(f"Failure callback also failed: {callback_exc}")
        raise
    finally:
        shutil.rmtree(work_root, ignore_errors=True)


@app.function(image=web_image, secrets=[worker_secret], timeout=60)
@modal.fastapi_endpoint(method="POST", label=WEB_ENDPOINT_LABEL)
def reconstruct(body: dict[str, Any]):
    from fastapi.responses import JSONResponse

    if not isinstance(body, dict):
        return JSONResponse(status_code=400, content={"error": "JSON object required"})
    if not body.get("jobId"):
        return JSONResponse(status_code=400, content={"error": "jobId is required"})
    if not body.get("sourceKeys"):
        return JSONResponse(status_code=400, content={"error": "sourceKeys is required"})

    try:
        fc = process_job.spawn(body)
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to enqueue job: {exc}"},
        )

    return JSONResponse(
        status_code=200,
        content={"accepted": True, "jobId": body["jobId"]},
        headers={"x-modal-run-id": fc.object_id},
    )