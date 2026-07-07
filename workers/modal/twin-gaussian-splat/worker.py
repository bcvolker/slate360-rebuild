"""
Slate360 Digital Twin — Modal GPU worker for Gaussian-splat photogrammetry.

HTTP contract (POST /reconstruct):
  Request JSON: jobId, orgId, spaceId, captureId, sourceKeys[], is360Flags[],
                quality, speed, modelType, newAssetIds[],
                lidarPosesKey?, lidarPlyKey?,
                forceColmap? (bool, default false — skip the ARKit pose bypass and
                  run standard COLMAP even when lidarPosesKey/lidarPlyKey exist),
                matchToleranceSec? (float, default DEFAULT_MATCH_TOLERANCE_SEC —
                  ARKit-pose/frame timestamp match tolerance override, e.g. pass
                  LEGACY_MATCH_TOLERANCE_SEC for an A/B comparison)
                debugArtifacts? (bool, default false — upload the processed
                  transforms.json to the job's R2 sibling key
                  (<jobId>.transforms.json) before training, for offline inspection
                  when a run's alignment is suspect)
                rollCorrectionDeg? (float, default 0 — diagnostic camera-local
                  roll (deg) about the optical axis applied to every ARKit-bypass
                  c2w; tests a pixel/pose in-plane rotation mismatch)
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
# AF2: 7200s (was 3600) so COLMAP-path standard/high jobs (now the default
# alignment path — see ALIGNMENT_STRATEGY) can't be container-killed
# mid-training without ever posting a failure callback.
GPU_TYPE = "A10G"
MAX_DURATION_SECONDS = 7200

VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".heic", ".heif"}

# ── LiDAR pose/frame-timestamp match tolerance ──────────────────────────────
# Tightened from the original ±2s (loose enough to match a frame to a pose from
# a different point in the walk) to ±250ms, close to the 0.5s keyframe interval.
# The legacy value stays reachable via the matchToleranceSec job option so an
# operator can A/B the tightened default against the original behavior.
DEFAULT_MATCH_TOLERANCE_SEC = 0.25
LEGACY_MATCH_TOLERANCE_SEC = 2.0
MIN_LIDAR_BYPASS_FRAMES = 5

# ── AF4: sharpness-scored frame selection (replaces flat fps=2 extraction) ──
# Candidates are pulled at double density (SHARP_CANDIDATE_FPS) and scored by
# variance-of-Laplacian; the sharpest candidate per SHARP_BUCKET_SEC window is
# kept, landing back at ~2 effective fps (matching the old flat rate) but now
# picking the least-motion-blurred frame in each window instead of whichever
# frame ffmpeg happened to land on. Applies to both the COLMAP path
# (extract_video_frames) and the ARKit-bypass path (try_lidar_bypass).
SHARP_CANDIDATE_FPS = 4
SHARP_BUCKET_SEC = 0.5
SHARP_BLUR_FLOOR = 30.0  # variance-of-Laplacian; conservative (only drops genuinely blurry frames)
MIN_FRAMES_FLOOR_GUARD = 3  # never let the blur floor drop the usable frame count below this

# ── Alignment strategy (PACKAGE P) ──────────────────────────────────────────
# "colmap_first" (default): skip the ARKit-pose bypass for normal jobs and
# always run COLMAP, exactly as force_colmap=true does today. Poses/PLY assets
# keep uploading and being stored — they're the substrate for the deferred
# Round 6 bypass-optimization track (pose interpolation + camera-pose
# refinement) and the RoomPlan measurement layer, not wasted capture.
# Why: on identical frames from the same capture, the bypass path caps at
# trainPsnr ~14.7 (nearest-keyframe pose assignment error) while COLMAP scores
# ~23.3 (coherent) — see Round 4/5 A/B experiments. Flip back to
# "bypass_first" (legacy behavior: attempt bypass unless force_colmap is set)
# once the Round 6 optimization track beats COLMAP.
ALIGNMENT_STRATEGY = os.environ.get("ALIGNMENT_STRATEGY", "colmap_first").strip().lower()

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
        # AF4: sharpness-scored frame selection (variance-of-Laplacian).
        "opencv-python-headless==4.10.0.84",
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


# Pinned so the tool can't change under us.
SPLAT_TRANSFORM_PKG = "@playcanvas/splat-transform@2.7.1"
# AF5: the opacity ladder stops at 0.30 (drop low-opacity floaters, cheap and
# harmless). Beyond that, escalating to 0.50/0.70 was throwing away material,
# still-visible splats just to fit the WASM writer's memory — replaced by the
# saliency top-N fallback below.
SPLAT_OPACITY_TIERS = [0.05, 0.15, 0.30]
SPLAT_SCALE_CAP = 0.3  # drop big blurry floater gaussians (was 0.5)


def splat_transform_clean_export(ply_path: Path, spz_path: Path) -> dict[str, Any]:
    """CPU-only post-export cleanup + .spz convert.

    A large/noisy scene (e.g. a sunlit reflective subject) trains into millions of
    gaussians; the WASM .spz writer then OOMs ("Aborted()") writing a ~1GB file. The
    opacity/scale tiers above remove low-opacity floaters and large blurry gaussians,
    which is enough for most scenes. AF5: if the writer still OOMs at the top of that
    ladder (opacity>=0.30), instead of raising the opacity floor further (discarding
    material splats, not just noise, to fit memory), fall back to a saliency-ranked
    top-N reduction — keep the highest opacity*scale splats up to a shrinking target
    count (SALIENCY_TARGET_COUNTS) until the write succeeds. WARNs either way the
    fallback fires, since it means the effective retention is now count-budget-driven
    rather than a quality floor. Raises only if every tier AND the saliency fallback
    fail.
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
                return {"filterMode": "opacity_tier", "opacityFloor": op, "saliencyFallback": False}
            last_err = RuntimeError("splat-transform produced no output")
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            print(f"[export] splat-transform failed at opacity>={op}: {type(exc).__name__}")

    top_floor = SPLAT_OPACITY_TIERS[-1]
    print(f"[export] WARN: effective opacity floor exceeded {top_floor} — falling back to saliency top-N")
    for target_n in SALIENCY_TARGET_COUNTS:
        try:
            reduced_ply = ply_path.parent / f"_saliency_top{target_n}.ply"
            kept = _saliency_reduce_ply(ply_path, reduced_ply, target_n, opacity_floor=top_floor, scale_cap=SPLAT_SCALE_CAP)
            if spz_path.exists():
                spz_path.unlink()
            run_cmd(
                [
                    "npx", "-y", SPLAT_TRANSFORM_PKG,
                    "-w", str(reduced_ply),
                    "--filter-nan",
                    str(spz_path),
                    "--spz-version", "3",
                ]
            )
            if spz_path.is_file() and spz_path.stat().st_size > 0:
                mb = spz_path.stat().st_size / (1024 * 1024)
                print(f"[export] spz written via saliency top-{kept} (target {target_n}): {mb:.1f} MB")
                return {
                    "filterMode": "saliency_top_n",
                    "opacityFloor": top_floor,
                    "saliencyFallback": True,
                    "saliencyTargetN": target_n,
                    "saliencyKeptN": kept,
                }
            last_err = RuntimeError("splat-transform produced no output (saliency fallback)")
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            print(f"[export] saliency top-{target_n} fallback failed: {type(exc).__name__}")

    raise RuntimeError(f"SPZ export failed after opacity ladder and saliency fallback: {last_err}")


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


def resolve_video_start_times(
    poses_data: dict[str, Any],
    source_dir: Path,
    source_keys: list[str],
) -> dict[int, float]:
    """Q1: resolve each video source's absolute wall-clock start time, keyed by
    its index into source_keys. Standalone from try_lidar_bypass (which does
    its own equivalent resolution for the bypass path) — the two never run in
    the same job, so there is no duplicate-download concern in practice; this
    version is used by the COLMAP-path metric-scale recovery below, which
    needs to know each extracted frame's absolute time to match it against
    ARKit keyframes. Mirrors try_lidar_bypass's clip-metadata / creation-time /
    session-start fallback chain exactly, just keyed by source index instead
    of enumeration order over discovered video files.
    """
    kf_timestamps = [kf["timestamp"] for kf in poses_data.get("frames", []) if "timestamp" in kf]
    session_start: float = poses_data.get("session_start_time") or (min(kf_timestamps) if kf_timestamps else 0.0)

    clips_meta: dict[str, dict] = {}
    for clip in poses_data.get("clips") or []:
        if isinstance(clip, dict) and clip.get("video"):
            clips_meta[str(clip["video"])] = clip

    orig_names: dict[str, str] = {}
    for i, k in enumerate(source_keys or []):
        suffix = Path(k).suffix.lower() or ".bin"
        orig_names[f"source_{i:04d}{suffix}"] = re.sub(r"^\d+_", "", Path(k).name)

    video_paths: dict[int, Path] = {}
    for idx in range(len(source_keys or [])):
        matches = list(source_dir.glob(f"source_{idx:04d}.*"))
        if matches and matches[0].suffix.lower() in VIDEO_EXTENSIONS:
            video_paths[idx] = matches[0]

    # Largest-video-first matches try_lidar_bypass's legacy single-clip fallback
    # rule (only the single largest video gets session_start when there is no
    # clips metadata at all).
    ordered = sorted(video_paths.items(), key=lambda kv: kv[1].stat().st_size, reverse=True)

    starts: dict[int, float] = {}
    for order_i, (idx, vp) in enumerate(ordered):
        orig = orig_names.get(vp.name, vp.name)
        meta = clips_meta.get(orig)
        if clips_meta and meta is None:
            continue
        if meta and isinstance(meta.get("start_time"), (int, float)):
            v_start: float | None = float(meta["start_time"])
        else:
            v_start = get_video_creation_time(vp)
        if v_start is None:
            if order_i == 0 and not clips_meta:
                v_start = session_start
            else:
                continue
        starts[idx] = v_start
    return starts


def arkit_to_nerfstudio_c2w(transform_4x4: list, roll_deg: float = 0.0) -> list:
    """Convert ARKit column-major flat c2w to Nerfstudio row-major 4×4 list.

    ROUND 4: no axis flip. ARKit's camera c2w is already OpenGL-convention
    (X right, Y up, camera looks down −Z) — which is exactly what
    Nerfstudio's transforms.json expects (Nerfstudio follows the
    Blender/OpenGL camera convention, NOT OpenCV/COLMAP's Y-down/Z-forward).
    The previous version of this function converted INTO OpenCV convention,
    which mis-oriented every camera pose fed to splatfacto — pass-through
    reshape only now.

    Empirical basis: across four ARKit-bypass runs (including after fixing
    the separate world-space PLY-point and Swift depth-unprojection bugs),
    trainPsnr stayed in the ~9-11 garbage range while COLMAP on identical
    frames from the same capture scored ~23 (coherent) — i.e. the pose
    convention itself, not matching/timestamps/seed geometry, was still
    wrong.

    ROUND 5 (diagnostic): roll_deg applies a camera-LOCAL rotation about the
    optical axis (right-multiply by R_z) before returning. Non-zero only when
    the job passes rollCorrectionDeg — it exists to test the hypothesis that
    the extracted video pixels are rolled 90° relative to the frame the ARKit
    intrinsics/pose describe (the dining-room clip decodes sideways with no
    rotation metadata). A camera-local Z roll rotates the camera's X/Y (pixel)
    axes without moving its position or look direction, which is exactly the
    correction for an in-plane pixel/pose mismatch.
    """
    import numpy as np

    # Swift stores simd_float4x4 as columns; reshape column-major → [row, col].
    c2w = np.array(transform_4x4, dtype=np.float64).reshape(4, 4, order="F")
    if roll_deg:
        theta = np.deg2rad(roll_deg)
        cos_t, sin_t = np.cos(theta), np.sin(theta)
        rz = np.array(
            [
                [cos_t, -sin_t, 0.0, 0.0],
                [sin_t, cos_t, 0.0, 0.0],
                [0.0, 0.0, 1.0, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ],
            dtype=np.float64,
        )
        c2w = c2w @ rz  # camera-local roll about the optical (Z) axis
    return c2w.tolist()


class LidarMatchToleranceError(RuntimeError):
    """Raised when ARKit poses + video are both present with enough keyframes and
    extracted frames, but too few frames land within the configured match tolerance.
    Signals a timestamp-misalignment problem rather than missing/insufficient data —
    distinct from the graceful COLMAP-fallback paths earlier in try_lidar_bypass."""


def _match_and_write_transforms(
    keyframes: list[dict],
    extracted: list[tuple[Path, float]],
    bypass_images: Path,
    processed_dir: Path,
    match_tolerance_sec: float,
    roll_correction_deg: float = 0.0,
) -> tuple[int, int, list[float]]:
    """Match video frames to ARKit keyframes by timestamp and write transforms.json.

    `extracted` pairs each frame with its absolute wall-clock time — computed per
    source video, so multi-clip captures (one video per clip, shared world frame)
    match correctly. Records a delta (seconds) for EVERY extracted frame against its
    nearest keyframe, regardless of whether it passes tolerance, so callers can log
    the full match-delta distribution. Returns (matched_count, skipped_count, deltas).
    """
    if not keyframes or not extracted:
        return 0, len(extracted), []

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
    deltas: list[float] = []
    for frame_path, frame_wall_time in extracted:
        nearest_kf = min(keyframes, key=lambda kf: abs(kf["timestamp"] - frame_wall_time))
        time_delta = abs(nearest_kf["timestamp"] - frame_wall_time)
        deltas.append(time_delta)

        if time_delta > match_tolerance_sec or "transform_4x4" not in nearest_kf:
            skipped += 1
            continue

        c2w = arkit_to_nerfstudio_c2w(nearest_kf["transform_4x4"], roll_deg=roll_correction_deg)
        dest_name = f"frame_{len(frames_data):04d}.jpg"
        dest_path = bypass_images / dest_name
        shutil.copy2(str(frame_path), str(dest_path))
        frames_data.append({
            "file_path": f"images/{dest_name}",
            "transform_matrix": c2w,
        })

    if skipped > 0:
        print(
            f"[lidar-bypass] {skipped}/{len(extracted)} frames skipped "
            f"(>±{match_tolerance_sec * 1000:.0f}ms delta or missing pose)"
        )

    if not frames_data:
        return 0, skipped, deltas

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
    return len(frames_data), skipped, deltas


def _transform_and_write_lidar_ply(src_path: Path, dest_path: Path) -> int:
    """Read ARKit LiDAR PLY (world-space points), re-encode to dest_path.

    NOT the same conversion as arkit_to_nerfstudio_c2w: that flip only swaps
    which local camera axis is "up"/"forward" (it negates columns of the
    camera's own rotation basis) — it never touches translation or the world
    frame. These LiDAR points are already recorded in that same, untouched
    ARKit world frame, so they must be written through unchanged; negating
    world Y/Z here would mirror the seed geometry into a frame the
    (correctly unmoved) camera positions no longer agree with, which is a
    world-space vs. camera-local-space convention bug, not a missing
    conversion. (Confirmed via the bypass-vs-COLMAP A/B on the Jul 2
    capture — COLMAP, which ignores this PLY, was coherent; the bypass path
    that fed it in was garbage with a 4M-splat densification explosion.)

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

        # No axis flip: these points are already in the same ARKit world frame
        # the (translation-preserving) camera poses reference. See docstring.

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
    match_tolerance_sec: float = DEFAULT_MATCH_TOLERANCE_SEC,
    roll_correction_deg: float = 0.0,
) -> tuple[bool, bool, dict[str, Any]]:
    """Attempt to bypass COLMAP using ARKit poses from the LiDAR plugin.

    Downloads poses JSON, extracts frames from the video with the best temporal
    overlap, matches each frame to the nearest ARKit keyframe by wall-clock time,
    and writes transforms.json to processed_dir.

    If lidar_ply_key is provided, also downloads the raw LiDAR PLY, converts
    it to Nerfstudio world-space, and seeds splatfacto via ply_file_path —
    the biggest single quality improvement available for LiDAR captures.

    Returns (bypass_used, ply_init_used, stats). Falls back gracefully — returns
    (False, False, stats) — if there is insufficient keyframe/frame DATA (too few
    keyframes, no timestamps, no video, too few extracted frames) or any unexpected
    exception. Raises LidarMatchToleranceError instead of falling back when data is
    present but too few frames land within match_tolerance_sec — that failure mode
    is a timestamp-misalignment signal, not a data-absence one, and should surface
    rather than be silently masked by a COLMAP fallback.
    """
    stats: dict[str, Any] = {
        "matchToleranceSec": match_tolerance_sec,
        "keyframeCount": 0,
        "extractedCount": 0,
        "matchedCount": 0,
        "skippedCount": 0,
        "matchDeltaMeanMs": None,
        "matchDeltaMaxMs": None,
    }
    try:
        print("[lidar-bypass] attempting COLMAP bypass with ARKit poses")

        # 1. Download and parse poses JSON
        poses_path = source_dir / "_lidar_poses.json"
        s3.download_file(bucket, lidar_poses_key, str(poses_path))
        maybe_gunzip(poses_path)
        with poses_path.open(encoding="utf-8") as f:
            poses_data = json.load(f)

        keyframes: list[dict] = poses_data.get("frames", [])
        stats["keyframeCount"] = len(keyframes)
        if len(keyframes) < MIN_LIDAR_BYPASS_FRAMES:
            print(f"[lidar-bypass] only {len(keyframes)} keyframes — need ≥{MIN_LIDAR_BYPASS_FRAMES}, falling back to COLMAP")
            return False, False, stats

        kf_timestamps = [kf["timestamp"] for kf in keyframes if "timestamp" in kf]
        if not kf_timestamps:
            print("[lidar-bypass] keyframes missing timestamps, falling back to COLMAP")
            return False, False, stats

        kf_start = min(kf_timestamps)
        kf_end = max(kf_timestamps)
        session_start: float = poses_data.get("session_start_time") or kf_start

        # 2. Extract + time-stamp frames from EVERY capture video. Multi-clip captures
        #    upload one video per clip, all sharing the ARSession world frame; each
        #    clip's exact wall-clock start comes from poses_data["clips"] (written at
        #    capture), with ffprobe creation_time as fallback. Unrelated videos (e.g.
        #    drone footage) are harmless — their frames land beyond match_tolerance_sec
        #    from any keyframe and the matcher drops them.
        video_files = sorted(
            [p for p in source_dir.iterdir() if p.suffix.lower() in VIDEO_EXTENSIONS],
            key=lambda p: p.stat().st_size,
            reverse=True,
        )
        if not video_files:
            print("[lidar-bypass] no video source, falling back to COLMAP")
            return False, False, stats

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
            # AF4: sharpness-scored selection (~2 effective fps, matching the
            # old flat rate, but picking the sharpest candidate per window).
            kept_times, _kept_sharpness, sharp_stats = extract_sharp_frames(vp, vdir, "frame")
            stats.setdefault("sharpFrameSelection", []).append(sharp_stats)
            for i, t in enumerate(kept_times):
                extracted.append((vdir / f"frame_{i:04d}.jpg", v_start + t))

        stats["extractedCount"] = len(extracted)
        if len(extracted) < MIN_LIDAR_BYPASS_FRAMES:
            print(f"[lidar-bypass] only {len(extracted)} frames extracted — need ≥{MIN_LIDAR_BYPASS_FRAMES}, falling back to COLMAP")
            return False, False, stats

        # 4. Build processed_dir with transforms.json and images/
        processed_dir.mkdir(parents=True, exist_ok=True)
        bypass_images = processed_dir / "images"
        bypass_images.mkdir(parents=True, exist_ok=True)

        matched, skipped, deltas = _match_and_write_transforms(
            keyframes, extracted, bypass_images, processed_dir, match_tolerance_sec,
            roll_correction_deg=roll_correction_deg,
        )
        stats["matchedCount"] = matched
        stats["skippedCount"] = skipped
        # AF6: `deltas` (from _match_and_write_transforms) intentionally records
        # EVERY extracted frame's delta, including frames that get skipped for
        # exceeding match_tolerance_sec. So matchDeltaMaxMs can legitimately be
        # larger than matchToleranceSec while every MATCHED frame is still within
        # tolerance — that's correct reporting of the full distribution, not a
        # bug. Reference: Jul-3 A/B on the Jul-2 capture — 106 extracted / 101
        # matched / matchDeltaMaxMs 266.7ms @ matchToleranceSec 250ms (the 5
        # skipped frames' larger deltas pulled the max above the tolerance).
        if deltas:
            stats["matchDeltaMeanMs"] = sum(deltas) / len(deltas) * 1000
            stats["matchDeltaMaxMs"] = max(deltas) * 1000

        if matched < MIN_LIDAR_BYPASS_FRAMES:
            shutil.rmtree(str(processed_dir), ignore_errors=True)
            mean_ms = stats["matchDeltaMeanMs"]
            max_ms = stats["matchDeltaMaxMs"]
            raise LidarMatchToleranceError(
                f"LiDAR bypass matching failed: {matched}/{len(extracted)} extracted frames "
                f"matched within ±{match_tolerance_sec * 1000:.0f}ms of a keyframe "
                f"(need ≥{MIN_LIDAR_BYPASS_FRAMES}). Delta stats across {len(keyframes)} "
                f"keyframes — mean {mean_ms:.0f}ms, max {max_ms:.0f}ms. This indicates ARKit "
                f"pose timestamps and video frame timestamps are misaligned beyond the "
                f"configured tolerance, not that pose/frame data is missing."
            )

        print(f"[lidar-bypass] success — {matched} frames matched; COLMAP skipped")

        # 5. Optionally seed splatfacto with the LiDAR point cloud.
        #    Points are re-encoded as-is (see _transform_and_write_lidar_ply) — no
        #    axis flip, since they're already in the same world frame as the poses.
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

        return True, ply_init_used, stats

    except LidarMatchToleranceError:
        raise
    except Exception as exc:  # noqa: BLE001
        print(f"[lidar-bypass] failed (non-fatal): {type(exc).__name__}: {exc}")
        shutil.rmtree(str(processed_dir), ignore_errors=True)
        return False, False, stats


# ── AF1: ready-gate (never publish or charge garbage again) ─────────────────
PSNR_FAIL_THRESHOLD = 17.0
PSNR_SOFT_WARN_THRESHOLD = 20.0  # scene-typical bar is ~23-25 per the dining-room COLMAP runs
MIN_SPLAT_COUNT = 20_000
MIN_SPZ_BYTES = 1024 * 1024  # 1 MiB
EXPLOSION_SPLAT_COUNT = 3_000_000


def evaluate_ready_gates(train_psnr: float | None, splat_count: int, file_size_bytes: int) -> dict[str, Any]:
    """Fail (and thus never publish/charge — the worker raises on gate failure,
    which routes to the failure callback, which never creates a model row or
    deducts credits) genuinely broken reconstructions.

    psnr_unavailable (ns-eval itself failed) never blocks — a good job must
    never fail because the EVAL step failed, not the reconstruction. A huge
    splat count alone (explosionSuspected) doesn't fail either — only when it
    co-occurs with a low PSNR, since a big-but-coherent scene is fine.
    """
    psnr_gate = "psnr_unavailable" if train_psnr is None else ("pass" if train_psnr >= PSNR_FAIL_THRESHOLD else "fail")
    splat_count_gate = "pass" if splat_count >= MIN_SPLAT_COUNT else "fail"
    file_size_gate = "pass" if file_size_bytes >= MIN_SPZ_BYTES else "fail"
    explosion_suspected = splat_count > EXPLOSION_SPLAT_COUNT
    below_scene_typical = train_psnr is not None and train_psnr < PSNR_SOFT_WARN_THRESHOLD

    reasons: list[str] = []
    if psnr_gate == "fail":
        reasons.append(
            "Reconstruction quality was too low to publish — try recapturing with slower "
            "movement, more overlap, and steady lighting."
        )
    if splat_count_gate == "fail" or file_size_gate == "fail":
        reasons.append(
            "Reconstruction produced too little detail to publish — try recapturing with "
            "more coverage of the space."
        )
    if explosion_suspected and psnr_gate == "fail":
        reasons.append("Reconstruction produced an excessive, low-quality point cloud.")

    return {
        "psnrGate": psnr_gate,
        "splatCountGate": splat_count_gate,
        "fileSizeGate": file_size_gate,
        "explosionSuspected": explosion_suspected,
        "belowSceneTypical": below_scene_typical,
        "failed": bool(reasons),
        "userMessage": " ".join(reasons) if reasons else None,
    }


# ── Q1 (metric-scale recovery) / Q2 (measured-gravity orientation) ──────────
SCALE_MATCH_TOLERANCE_SEC = 0.25
SCALE_MIN_FRAME_PAIRS = 5
SCALE_MAX_RESIDUAL = 0.15  # 15% spread (P75-P25 / median) — beyond this, skip scaling
SCALE_FACTOR_MIN = 0.01
SCALE_FACTOR_MAX = 100.0


def _ns_process_data_frame_map(images_dir: Path | None) -> dict[str, str]:
    """R7/R8 shared helper: reproduce ns-process-data's images/frame_NNNNN.jpg
    renaming (1-indexed, lexicographic sort of the input directory it was
    invoked against) so transforms.json's file_path can be mapped back to the
    original {stem}_{i:04d}.jpg filename frame_abs_times/frame_sharpness are
    keyed by. Used by both recover_metric_scale (Q1/Q2) and
    select_representative_frame (R8.1).
    """
    if images_dir is None or not images_dir.is_dir():
        return {}
    sorted_originals = sorted(
        p.name for p in images_dir.iterdir()
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    )
    return {f"frame_{i + 1:05d}.jpg": name for i, name in enumerate(sorted_originals)}


def _quat_from_matrix(rot: "np.ndarray") -> "np.ndarray":
    """Standard rotation-matrix -> quaternion [x,y,z,w] (Shepperd's method,
    trace-based branch selection for numerical stability near +/-180deg)."""
    import numpy as np

    m = rot
    trace = m[0, 0] + m[1, 1] + m[2, 2]
    if trace > 0:
        s = 0.5 / np.sqrt(trace + 1.0)
        w = 0.25 / s
        x = (m[2, 1] - m[1, 2]) * s
        y = (m[0, 2] - m[2, 0]) * s
        z = (m[1, 0] - m[0, 1]) * s
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = 2.0 * np.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2])
        w = (m[2, 1] - m[1, 2]) / s
        x = 0.25 * s
        y = (m[0, 1] + m[1, 0]) / s
        z = (m[0, 2] + m[2, 0]) / s
    elif m[1, 1] > m[2, 2]:
        s = 2.0 * np.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2])
        w = (m[0, 2] - m[2, 0]) / s
        x = (m[0, 1] + m[1, 0]) / s
        y = 0.25 * s
        z = (m[1, 2] + m[2, 1]) / s
    else:
        s = 2.0 * np.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1])
        w = (m[1, 0] - m[0, 1]) / s
        x = (m[0, 2] + m[2, 0]) / s
        y = (m[1, 2] + m[2, 1]) / s
        z = 0.25 * s
    q = np.array([x, y, z, w], dtype=np.float64)
    norm = np.linalg.norm(q)
    return q / norm if norm > 1e-12 else np.array([0.0, 0.0, 0.0, 1.0])


def recover_metric_scale(
    processed_dir: Path,
    poses_data: dict[str, Any],
    frame_abs_times: dict[str, float],
    images_dir: Path | None = None,
) -> dict[str, Any]:
    """Q1: recover the metric scale factor by comparing COLMAP's (unitless,
    arbitrary-scale) solved camera trajectory against the ARKit-measured
    (real, metric) trajectory for the SAME frames. Also (Q2) recovers the
    rotation relating the two frames, used to transform ARKit's measured
    gravity direction into the COLMAP/model frame for manifest orientation.

    Matches each COLMAP-registered frame (by its transforms.json file_path,
    correlated back to an absolute wall-clock time via frame_abs_times) to its
    nearest ARKit keyframe by timestamp, within SCALE_MATCH_TOLERANCE_SEC.

    R7 fix: ns-process-data renames every input image to its own sequential
    images/frame_00001.jpg, frame_00002.jpg, ... (1-indexed, sorted order of
    the input directory) — NOT the original {stem}_{i:04d}.jpg names
    frame_abs_times is keyed by. Looking transforms.json's file_path up in
    frame_abs_times directly always missed (every real capture hit
    scaleSkipped="insufficient_pairs(0)" despite valid, in-tolerance pose
    data — confirmed by recomputing deltas from the raw poses/ingest data
    directly). images_dir is the SAME directory ns-process-data was invoked
    against, so re-sorting its listing here reproduces the same frame_NNNNN
    assignment and lets us map back to the original filename first.

    Scale: the MEDIAN ratio of pairwise trajectory-segment lengths (ARKit
    distance / COLMAP distance) across every matched frame pair — robust to
    individual mismatched pairs, and mathematically insensitive to any
    (unknown) rotation or translation between the two coordinate frames,
    since Euclidean distances are rotation/translation-invariant. This is the
    median-based estimator Q1 explicitly sanctions as an alternative to a full
    Umeyama fit / RANSAC.

    Rotation: a Kabsch/SVD rigid-registration fit on the same matched pairs
    (rotation-only, scale/translation are not needed for Q2's purpose), used
    only to transform ARKit's gravity vector into the COLMAP frame — NOT
    applied to the exported geometry (which stays in COLMAP's own frame; only
    scale and, downstream, the manifest orientation are affected here).

    Returns a dict always containing scaleFactor (None if not applied),
    framePairsUsed, scaleResidual, scaleSkipped (reason string or None), and
    measuredUpColmapFrame (ARKit's mean gravity vector expressed in the
    COLMAP/model frame, or None if rotation recovery failed).
    """
    import numpy as np

    result: dict[str, Any] = {
        "scaleFactor": None,
        "framePairsUsed": 0,
        "scaleResidual": None,
        "scaleSkipped": None,
        "measuredUpColmapFrame": None,
    }

    transforms_path = processed_dir / "transforms.json"
    if not transforms_path.is_file() or not frame_abs_times:
        result["scaleSkipped"] = "no_transforms_or_frame_times"
        return result

    try:
        tdata = json.loads(transforms_path.read_text(encoding="utf-8"))
    except Exception:
        result["scaleSkipped"] = "transforms_unreadable"
        return result

    keyframes = poses_data.get("frames", [])
    if not keyframes:
        result["scaleSkipped"] = "no_arkit_keyframes"
        return result

    # R7 fix: rebuild ns-process-data's frame_NNNNN -> original-filename mapping
    # by re-sorting the same images_dir it was invoked against (see docstring).
    frame_index_to_original = _ns_process_data_frame_map(images_dir)

    pairs: list[tuple[np.ndarray, np.ndarray]] = []
    for frame in tdata.get("frames", []):
        file_path = frame.get("file_path")
        matrix = frame.get("transform_matrix")
        if not file_path or not matrix:
            continue
        basename = Path(file_path).name
        original_name = frame_index_to_original.get(basename, basename)
        abs_time = frame_abs_times.get(original_name)
        if abs_time is None:
            continue
        nearest_kf = min(keyframes, key=lambda kf: abs(kf.get("timestamp", 1e18) - abs_time))
        delta = abs(nearest_kf.get("timestamp", 1e18) - abs_time)
        if delta > SCALE_MATCH_TOLERANCE_SEC:
            continue
        arkit_xform = nearest_kf.get("transform_4x4")
        if not arkit_xform or len(arkit_xform) < 16:
            continue
        colmap_pos = np.array([matrix[0][3], matrix[1][3], matrix[2][3]], dtype=np.float64)
        # ARKit c2w is column-major flat (same layout arkit_to_nerfstudio_c2w
        # reshapes with order="F") — translation is the last 4 entries.
        arkit_flat = np.array(arkit_xform, dtype=np.float64)
        arkit_pos = arkit_flat[12:15]
        pairs.append((colmap_pos, arkit_pos))

    if len(pairs) < SCALE_MIN_FRAME_PAIRS:
        result["scaleSkipped"] = f"insufficient_pairs({len(pairs)})"
        return result
    result["framePairsUsed"] = len(pairs)

    # -- Q1: scale via median pairwise-distance ratio --
    ratios: list[float] = []
    for i in range(len(pairs)):
        for j in range(i + 1, len(pairs)):
            colmap_dist = float(np.linalg.norm(pairs[i][0] - pairs[j][0]))
            arkit_dist = float(np.linalg.norm(pairs[i][1] - pairs[j][1]))
            if colmap_dist < 1e-6 or arkit_dist < 1e-6:
                continue  # near-duplicate positions — ratio is unstable
            ratios.append(arkit_dist / colmap_dist)

    if len(ratios) < SCALE_MIN_FRAME_PAIRS:
        result["scaleSkipped"] = f"insufficient_ratio_samples({len(ratios)})"
    else:
        ratios_arr = np.array(ratios)
        median_ratio = float(np.median(ratios_arr))
        p25, p75 = np.percentile(ratios_arr, [25, 75])
        residual = float((p75 - p25) / median_ratio) if median_ratio > 1e-9 else float("inf")
        result["scaleResidual"] = residual
        if not (SCALE_FACTOR_MIN <= median_ratio <= SCALE_FACTOR_MAX):
            result["scaleSkipped"] = "implausible_factor"
        elif residual > SCALE_MAX_RESIDUAL:
            result["scaleSkipped"] = "residual_too_high"
        else:
            result["scaleFactor"] = median_ratio

    # -- Q2: rotation via Kabsch/SVD (independent of the scale gate above —
    #    a noisy scale ratio doesn't necessarily mean the rotation fit is bad) --
    try:
        colmap_pts = np.array([p[0] for p in pairs])
        arkit_pts = np.array([p[1] for p in pairs])
        colmap_centroid = colmap_pts.mean(axis=0)
        arkit_centroid = arkit_pts.mean(axis=0)
        P = colmap_pts - colmap_centroid
        Q = arkit_pts - arkit_centroid
        H = P.T @ Q
        U, _S, Vt = np.linalg.svd(H)
        d = np.sign(np.linalg.det(Vt.T @ U.T)) or 1.0
        correction = np.diag([1.0, 1.0, d])
        R = Vt.T @ correction @ U.T  # rotates COLMAP-frame vectors into the ARKit frame

        mean_gravity = np.mean(
            [kf.get("gravity", [0.0, 1.0, 0.0]) for kf in keyframes], axis=0,
        )
        norm = np.linalg.norm(mean_gravity)
        if norm > 1e-9:
            mean_gravity = mean_gravity / norm
            # R^T = R^-1 maps ARKit-frame vectors into the COLMAP frame.
            result["measuredUpColmapFrame"] = (R.T @ mean_gravity).tolist()
    except Exception as rot_exc:  # noqa: BLE001
        print(f"[scale-recovery] rotation recovery failed (non-fatal): {type(rot_exc).__name__}: {rot_exc}")

    return result


# ── R8.1: representative-frame selection ("open at the captured view") ─────
REPRESENTATIVE_FRAME_TIME_WINDOW = 5  # nearest-in-time candidates considered around the median


def select_representative_frame(
    processed_dir: Path,
    frame_abs_times: dict[str, float],
    frame_sharpness: dict[str, float],
    images_dir: Path | None,
) -> dict[str, Any] | None:
    """R8.1: pick a real COLMAP-registered frame to open the model on, instead
    of a synthetic orbit camera. Primary criterion: closest to the median
    capture time (a frame from the middle of the walk, not the doorway/exit
    frame at the very start or end). Tie-break: among the
    REPRESENTATIVE_FRAME_TIME_WINDOW nearest-in-time candidates, prefer the
    sharpest (AF4 variance-of-Laplacian score) — a well-focused frame makes a
    better first impression than a motion-blurred one from nearly the same
    moment.

    Reuses recover_metric_scale's frame_NNNNN -> original-filename remap (R7)
    since it needs the exact same join. Same scope decision as Q1/Q2: COLMAP
    path only (callers skip this for the ARKit-bypass path).

    Returns the frame's RAW pose (position + 3x3 rotation, in ns-export's own
    unscaled/uncropped PLY coordinate frame — the SAME frame
    crop_recenter_and_cap_ply's input is in) so the caller can carry it
    through that exact crop -> recenter -> scale pipeline. Returns None when
    no registered frame could be matched back to a captured timestamp (e.g.
    no lidar_poses) — callers must treat that as "no capture pose available"
    and fall back to the synthetic orbit camera.
    """
    import numpy as np

    transforms_path = processed_dir / "transforms.json"
    if not transforms_path.is_file() or not frame_abs_times:
        return None
    try:
        tdata = json.loads(transforms_path.read_text(encoding="utf-8"))
    except Exception:
        return None

    frame_index_to_original = _ns_process_data_frame_map(images_dir)

    # (abs_time, sharpness, position, rotation-3x3)
    candidates: list[tuple[float, float, "np.ndarray", "np.ndarray"]] = []
    for frame in tdata.get("frames", []):
        file_path = frame.get("file_path")
        matrix = frame.get("transform_matrix")
        if not file_path or not matrix:
            continue
        basename = Path(file_path).name
        original_name = frame_index_to_original.get(basename, basename)
        abs_time = frame_abs_times.get(original_name)
        if abs_time is None:
            continue
        m = np.array(matrix, dtype=np.float64)
        sharpness = frame_sharpness.get(original_name, 0.0)
        candidates.append((abs_time, sharpness, m[:3, 3].copy(), m[:3, :3].copy()))

    if not candidates:
        return None

    median_time = float(np.median([c[0] for c in candidates]))
    candidates.sort(key=lambda c: abs(c[0] - median_time))
    window = candidates[: min(REPRESENTATIVE_FRAME_TIME_WINDOW, len(candidates))]
    best = max(window, key=lambda c: c[1])

    return {
        "position": best[2].tolist(),
        "rotationMatrix": best[3].tolist(),
        "absTime": best[0],
        "sharpness": best[1],
        "medianTime": median_time,
        "candidateCount": len(candidates),
    }


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


def _frame_sharpness(frame_path: Path) -> float:
    """Variance-of-Laplacian sharpness score (higher = sharper)."""
    import cv2

    img = cv2.imread(str(frame_path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return 0.0
    return float(cv2.Laplacian(img, cv2.CV_64F).var())


def extract_sharp_frames(
    video_path: Path, out_dir: Path, stem: str,
) -> tuple[list[float], list[float], dict[str, Any]]:
    """AF4: sharpness-scored frame selection.

    Extracts candidates at SHARP_CANDIDATE_FPS, scores each by variance-of-
    Laplacian, and keeps only the sharpest candidate per SHARP_BUCKET_SEC
    window (~2 effective fps, matching the previous flat rate). Drops kept
    frames below SHARP_BLUR_FLOOR — UNLESS that would leave fewer than
    MIN_FRAMES_FLOOR_GUARD usable frames, in which case the floor is relaxed
    and the best-available frames are kept regardless (logged via
    blurFloorRelaxed).

    Returns (kept_times, kept_sharpness, stats): kept_times are each retained
    frame's exact seconds-from-video-start (needed by the ARKit-bypass path to
    match frames to keyframes by wall-clock time — sharpness selection means
    frames are no longer at uniform 0.5s spacing). kept_sharpness is the same
    frame's variance-of-Laplacian score (R8.1: used to prefer the sharpest
    frame among representative-frame candidates). Written files are named
    "{stem}_{i:04d}.jpg", 0-indexed, in the same order as kept_times.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    candidates_dir = out_dir / f"_{stem}_candidates"
    candidates_dir.mkdir(parents=True, exist_ok=True)
    run_cmd(
        [
            "ffmpeg", "-y", "-i", str(video_path),
            "-vf", f"fps={SHARP_CANDIDATE_FPS}", "-q:v", "2",
            str(candidates_dir / f"{stem}_%05d.jpg"),
        ]
    )
    candidates = sorted(candidates_dir.glob(f"{stem}_*.jpg"))
    if not candidates:
        raise RuntimeError(f"No candidate frames extracted from video: {video_path.name}")

    scored: list[tuple[float, float, Path]] = []
    for idx, fp in enumerate(candidates):
        t = idx / SHARP_CANDIDATE_FPS
        scored.append((t, _frame_sharpness(fp), fp))

    buckets: dict[int, tuple[float, float, Path]] = {}
    for t, sharpness, fp in scored:
        bucket = int(t / SHARP_BUCKET_SEC)
        if bucket not in buckets or sharpness > buckets[bucket][1]:
            buckets[bucket] = (t, sharpness, fp)

    picked = sorted(buckets.values(), key=lambda x: x[0])
    above_floor = [p for p in picked if p[1] >= SHARP_BLUR_FLOOR]

    floor_relaxed = len(above_floor) < MIN_FRAMES_FLOOR_GUARD and len(above_floor) < len(picked)
    final = picked if floor_relaxed else above_floor

    kept_times: list[float] = []
    kept_sharpness: list[float] = []
    sharp_sum = 0.0
    for i, (t, sharpness, fp) in enumerate(final):
        dest = out_dir / f"{stem}_{i:04d}.jpg"
        shutil.copy2(str(fp), str(dest))
        kept_times.append(t)
        kept_sharpness.append(sharpness)
        sharp_sum += sharpness

    shutil.rmtree(candidates_dir, ignore_errors=True)

    if not kept_times:
        raise RuntimeError(f"No frames survived sharpness selection for {video_path.name}")

    stats = {
        "candidateCount": len(candidates),
        "bucketedCount": len(picked),
        "keptCount": len(kept_times),
        "droppedCount": len(picked) - len(kept_times),
        "meanSharpnessKept": sharp_sum / len(kept_times),
        "blurFloor": SHARP_BLUR_FLOOR,
        "blurFloorRelaxed": floor_relaxed,
    }
    return kept_times, kept_sharpness, stats


def extract_video_frames(
    video_path: Path, out_dir: Path, stem: str,
) -> tuple[int, dict[str, Any], list[float], list[float]]:
    kept_times, kept_sharpness, stats = extract_sharp_frames(video_path, out_dir, stem)
    return len(kept_times), stats, kept_times, kept_sharpness


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
    video_start_times: dict[int, float] | None = None,
) -> dict[str, Any]:
    images_dir.mkdir(parents=True, exist_ok=True)
    stats: dict[str, Any] = {"photos": 0, "videos": 0, "panorama_views": 0, "frames": 0}
    frame_abs_times: dict[str, float] = {}
    frame_sharpness: dict[str, float] = {}

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
            frame_count, sharp_stats, kept_times, kept_sharpness = extract_video_frames(src, images_dir, stem)
            stats["frames"] += frame_count
            stats.setdefault("sharpFrameSelection", []).append(sharp_stats)
            # Q1: expose each kept frame's absolute wall-clock time (when a
            # video start time was resolved) so the COLMAP-path metric-scale
            # recovery can match registered frames back to ARKit keyframes.
            v_start = (video_start_times or {}).get(idx)
            if v_start is not None:
                for i, t in enumerate(kept_times):
                    frame_abs_times[f"{stem}_{i:04d}.jpg"] = v_start + t
            # R8.1: expose each kept frame's sharpness score so representative-
            # frame selection (select_representative_frame) can prefer the
            # sharpest frame near the capture's median time.
            for i, s in enumerate(kept_sharpness):
                frame_sharpness[f"{stem}_{i:04d}.jpg"] = s
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
    if frame_abs_times:
        stats["frameAbsTimes"] = frame_abs_times
    if frame_sharpness:
        stats["frameSharpness"] = frame_sharpness
    return stats


def find_latest_file(root: Path, pattern: str) -> Path:
    matches = [Path(p) for p in glob.glob(str(root / pattern), recursive=True)]
    if not matches:
        raise RuntimeError(f"No files matching {pattern} under {root}")
    return max(matches, key=lambda p: p.stat().st_mtime)


def count_registered_images(processed_dir: Path) -> int | None:
    """Count images ns-process-data (COLMAP) actually registered a camera pose for.

    ns-process-data's transforms.json only contains frames it successfully solved,
    so len(frames) is the standard "registered" count vs the input image total.
    """
    transforms_path = processed_dir / "transforms.json"
    if not transforms_path.is_file():
        return None
    try:
        data = json.loads(transforms_path.read_text(encoding="utf-8"))
        return len(data.get("frames", []))
    except Exception:  # noqa: BLE001
        return None


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


# ── AF9 (crop+recenter) / AF3 (splat-count ceiling) / AF5 (saliency fallback) ─
# Constants shared by the export-hardening passes below.
CROP_FACTOR = 1.35
CROP_MAX_REMOVAL_FRACTION = 0.60  # skip cropping if it would remove more than this
MAX_SPLAT_COUNT = 2_000_000  # AF3: deterministic post-export point-budget cap
SALIENCY_TARGET_COUNTS = [1_500_000, 750_000, 350_000]  # AF5: progressive saliency top-N fallback
# R8.3(b): once a model is in real metric units (scale_factor applied), a single
# gaussian axis extent above this is not a real piece of geometry any neighbor
# supports — it's a spike. Only meaningful once units are known, hence gated
# on scale_applied; on ungated (still-arbitrary-unit) models 0.5 means nothing.
MAX_METRIC_GAUSSIAN_EXTENT_M = 0.5

# A3 (noise removal): statistical outlier removal (SOR) — the classic Open3D/PCL
# floater killer. For each splat, the mean distance to its K nearest neighbors is
# computed; splats whose mean-neighbor-distance is more than SOR_STD_RATIO std
# devs above the global mean are isolated floaters (the residual "jumbled mess"
# the radius-crop and spike-clamp don't catch) and are dropped. Conservative by
# design — never removes more than SOR_MAX_REMOVAL_FRACTION (a genuinely diffuse
# capture is a quality problem for the AF1 gate, not noise).
SOR_K_NEIGHBORS = 16
SOR_STD_RATIO = 2.0
SOR_MAX_REMOVAL_FRACTION = 0.20


def _read_ply_structured(ply_path: Path) -> tuple[list[str], "np.ndarray"]:
    """Parse a scalar-property-only PLY (3DGS export format) into its header
    lines and a FULL structured numpy array (every property — xyz, normals,
    SH coefficients, opacity, scale, rotation — not just xyz). Shared by the
    crop/recenter/cap (AF9/AF3) and saliency-reduction (AF5) export passes."""
    import numpy as np

    with ply_path.open("rb") as fh:
        header_lines: list[str] = []
        while True:
            line = fh.readline().decode("ascii", errors="ignore").strip()
            header_lines.append(line)
            if line == "end_header":
                break
        vertex_count = 0
        props: list[tuple[str, str]] = []
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
        if vertex_count <= 0 or not props:
            raise RuntimeError(f"Could not parse PLY header: {ply_path}")

        dt = np.dtype([(nm, "<" + _PLY_NP_TYPE.get(tp, "f4")) for nm, tp in props])
        if "format binary_little_endian" in "\n".join(header_lines):
            arr = np.fromfile(fh, dtype=dt, count=vertex_count)
        else:
            raw_txt = np.loadtxt(fh, max_rows=vertex_count)
            arr = np.zeros(vertex_count, dtype=dt)
            for i, (nm, _tp) in enumerate(props):
                arr[nm] = raw_txt[:, i]
    return header_lines, arr


def _write_ply_structured(out_path: Path, header_lines: list[str], arr: "np.ndarray") -> None:
    """Write a structured array back out as binary-little-endian PLY, reusing
    the source header's property list/order (only the vertex count and format
    line change) — pairs with _read_ply_structured."""
    out_header_lines = []
    for line in header_lines:
        if line.startswith("format"):
            out_header_lines.append("format binary_little_endian 1.0")
        elif line.startswith("element vertex"):
            out_header_lines.append(f"element vertex {len(arr)}")
        else:
            out_header_lines.append(line)
    with out_path.open("wb") as fh:
        fh.write(("\n".join(out_header_lines) + "\n").encode("ascii"))
        arr.tofile(fh)


def statistical_outlier_removal(xyz: "np.ndarray") -> "np.ndarray":
    """A3: return a boolean inlier mask dropping isolated floater splats (see the
    SOR_* constants). Uses a KD-tree for O(n log n) neighbor queries. Skips
    gracefully (keeps everything) when scipy is unavailable, the cloud is too
    small, or the result would remove more than SOR_MAX_REMOVAL_FRACTION."""
    import numpy as np

    n = len(xyz)
    if n < max(50, SOR_K_NEIGHBORS + 1):
        return np.ones(n, dtype=bool)
    try:
        from scipy.spatial import cKDTree
    except Exception as exc:  # noqa: BLE001
        print(f"[sor] scipy unavailable, skipping outlier removal: {exc}")
        return np.ones(n, dtype=bool)

    tree = cKDTree(xyz)
    # k+1 because the first neighbor of each point is itself (distance 0).
    dists, _ = tree.query(xyz, k=SOR_K_NEIGHBORS + 1, workers=-1)
    mean_neighbor = dists[:, 1:].mean(axis=1)
    mu = float(mean_neighbor.mean())
    sigma = float(mean_neighbor.std())
    if sigma <= 1e-9:
        return np.ones(n, dtype=bool)
    inliers = mean_neighbor <= (mu + SOR_STD_RATIO * sigma)
    kept = int(inliers.sum())
    if kept < n * (1.0 - SOR_MAX_REMOVAL_FRACTION):
        # Would remove too much — this is a diffuse capture, not noise. Keep all.
        print(f"[sor] would remove {n - kept}/{n} (>{SOR_MAX_REMOVAL_FRACTION:.0%}), skipping")
        return np.ones(n, dtype=bool)
    return inliers


def crop_recenter_and_cap_ply(ply_path: Path, out_path: Path, scale_factor: float = 1.0) -> dict[str, Any]:
    """AF9 (crop + recenter), AF3 (splat-count ceiling), and Q1 (metric-scale
    bake-in), combined into one full-property PLY read/write pass (avoids
    reading a possibly ~1GB export twice).

    AF9: computes the core region using the SAME definition
    compute_splat_manifest uses (5-95 percentile clip → median center; 3-97
    percentile → radius) — but directly in the PLY's own (unflipped)
    coordinate space, since this rewrites the file itself rather than the
    viewer-space manifest. Splats beyond coreRadius * CROP_FACTOR from that
    center are dropped, and survivors are translated so the core center sits
    at the origin. Only x/y/z are touched — scale/rotation/opacity/SH
    properties pass through untouched. Because compute_splat_manifest runs on
    this function's OUTPUT downstream, the manifest's bounds/center/camera
    naturally reflect the recentered world with no separate patch needed.
    Safety: if cropping would remove more than CROP_MAX_REMOVAL_FRACTION of
    splats, skip it entirely (a genuinely diffuse/noisy capture is a quality
    problem for the AF1 PSNR gate to catch, not a cropping problem) and pass
    the cloud through un-recentered.

    AF3: nerfstudio 1.1.5's splatfacto CLI does not expose a direct "max
    total gaussians" flag — the training-time density-control knobs already
    in use (stop-split-at, cull-alpha-thresh) influence but don't hard-bound
    the final count. The reliable, verifiable mechanism is this deterministic
    post-export cap: if the (already-cropped) splat count still exceeds
    MAX_SPLAT_COUNT, seeded-RNG subsample down to it — cheap insurance
    against the explosion class regardless of what happened during training.

    Q1: when scale_factor != 1.0 (a metric scale was recovered — see
    recover_metric_scale), bakes it into the shipped model by multiplying x/y/z
    positions directly (linear world-space units) AND adding ln(scale_factor)
    to the scale_0/1/2 gaussian-size properties, applied AFTER recentering (so
    it scales around the new origin, not the old one) — measurements, bounds,
    and walk-mode speed all inherit correct real-world units downstream with
    no separate unit-tracking needed in the viewer.

    R7.2 CORRECTION (was: linear multiply on scale_0/1/2 — WRONG): the
    reference 3D Gaussian Splatting format (and nerfstudio's splatfacto, which
    produced this export) stores scale_0/1/2 as the NATURAL LOG of each axis's
    Gaussian standard deviation (`scaling_activation = exp` at render time) so
    the optimizer can use unconstrained reals while guaranteeing a positive
    real-world extent. Multiplying a log value linearly does not scale the
    underlying gaussian by scale_factor — it exponentiates it (e.g.
    scale_factor=2 squared the actual on-screen size instead of doubling it),
    which is exactly the giant-blob failure this correction fixes. The correct
    bake is additive in log-space: new_log = old_log + ln(scale_factor), which
    is algebraically equivalent to actual_linear_scale *= scale_factor since
    exp(old_log + ln(s)) == exp(old_log) * s.
    """
    import numpy as np

    header_lines, arr = _read_ply_structured(ply_path)
    total = len(arr)
    xyz = np.stack(
        [arr["x"].astype(np.float64), arr["y"].astype(np.float64), arr["z"].astype(np.float64)],
        axis=1,
    )

    # A3: statistical outlier removal first — strip isolated floaters so the
    # percentile crop center/radius below are computed on the cleaned cloud.
    sor_inliers = statistical_outlier_removal(xyz)
    sor_removed = int(total - int(sor_inliers.sum()))
    if sor_removed > 0:
        arr = arr[sor_inliers]
        xyz = xyz[sor_inliers]
        total = len(arr)

    lo = np.percentile(xyz, 5, axis=0)
    hi = np.percentile(xyz, 95, axis=0)
    mask95 = np.all((xyz >= lo) & (xyz <= hi), axis=1)
    core = xyz[mask95] if int(mask95.sum()) >= 100 else xyz
    center = np.median(core, axis=0)
    p_lo = np.percentile(core, 3, axis=0)
    p_hi = np.percentile(core, 97, axis=0)
    core_radius = float(np.linalg.norm(p_hi - p_lo) / 2.0) or 1.0

    dist = np.linalg.norm(xyz - center, axis=1)
    keep_mask = dist <= core_radius * CROP_FACTOR
    kept = int(keep_mask.sum())

    crop_applied = total > 0 and kept >= total * (1.0 - CROP_MAX_REMOVAL_FRACTION)
    if not crop_applied:
        keep_mask = np.ones(total, dtype=bool)
        kept = total

    out_arr = arr[keep_mask]
    after_crop = kept

    capped = False
    if len(out_arr) > MAX_SPLAT_COUNT:
        rng = np.random.default_rng(0)
        idx = rng.choice(len(out_arr), MAX_SPLAT_COUNT, replace=False)
        idx.sort()  # keep file order stable/deterministic
        out_arr = out_arr[idx]
        capped = True

    if crop_applied:
        out_arr = out_arr.copy()
        out_arr["x"] = (out_arr["x"].astype(np.float64) - center[0]).astype(out_arr["x"].dtype)
        out_arr["y"] = (out_arr["y"].astype(np.float64) - center[1]).astype(out_arr["y"].dtype)
        out_arr["z"] = (out_arr["z"].astype(np.float64) - center[2]).astype(out_arr["z"].dtype)

    scale_applied = scale_factor != 1.0
    clamped_count = 0
    if scale_applied:
        if not crop_applied:
            out_arr = out_arr.copy()
        prop_names = out_arr.dtype.names or ()
        log_scale_factor = float(np.log(scale_factor))
        for axis in ("x", "y", "z"):
            out_arr[axis] = (out_arr[axis].astype(np.float64) * scale_factor).astype(out_arr[axis].dtype)
        # R8.3(b): metric-aware spike clamp — with real units now known, a
        # linear extent past MAX_METRIC_GAUSSIAN_EXTENT_M isn't a supported
        # piece of geometry, it's a training-time spike. Clamped in the SAME
        # log-space the R7.2 bake above operates in.
        max_log_scale = float(np.log(MAX_METRIC_GAUSSIAN_EXTENT_M))
        for i in range(3):
            nm = f"scale_{i}"
            if nm in prop_names:
                # R7.2: scale_0/1/2 are log-encoded (3DGS convention) — additive
                # in log-space, NOT a linear multiply (see docstring above).
                new_log = out_arr[nm].astype(np.float64) + log_scale_factor
                clamped_count += int(np.count_nonzero(new_log > max_log_scale))
                new_log = np.minimum(new_log, max_log_scale)
                out_arr[nm] = new_log.astype(out_arr[nm].dtype)

    _write_ply_structured(out_path, header_lines, out_arr)

    return {
        "splatsRaw": total + sor_removed,
        "sorRemoved": sor_removed,
        "splatsBeforeCrop": total,
        "splatsAfterCrop": after_crop,
        "cropFactor": CROP_FACTOR,
        "cropApplied": crop_applied,
        "cropSkipped": None if crop_applied else "would_remove_majority",
        "cropCenter": center.tolist() if crop_applied else [0.0, 0.0, 0.0],
        "splatCapApplied": capped,
        "spikeClampedCount": clamped_count,
        "spikeClampMaxExtentM": MAX_METRIC_GAUSSIAN_EXTENT_M if scale_applied else None,
        "splatCountFinal": int(len(out_arr)),
        "maxSplatCount": MAX_SPLAT_COUNT,
        "scaleFactorApplied": scale_factor if scale_applied else None,
    }


def _saliency_reduce_ply(
    ply_path: Path, out_path: Path, target_n: int, opacity_floor: float, scale_cap: float,
) -> int:
    """AF5 fallback: when the .spz writer OOMs even at the top of the opacity
    ladder, rank surviving points (opacity>=floor, all scales<=cap — the same
    prefilter the CLI tiers apply) by saliency = opacity * max(scale) (roughly
    "how much this splat visually contributes") and keep only the top
    target_n, instead of further raising the opacity floor (which discards
    material, still-visible splats just to fit memory). Returns kept count."""
    import numpy as np

    header_lines, arr = _read_ply_structured(ply_path)
    prop_names = arr.dtype.names or ()
    if "opacity" not in prop_names or not all(f"scale_{i}" in prop_names for i in range(3)):
        raise RuntimeError("PLY missing opacity/scale properties for saliency reduction")

    opacity = arr["opacity"].astype(np.float64)
    scales = np.stack([arr[f"scale_{i}"].astype(np.float64) for i in range(3)], axis=1)
    max_scale = scales.max(axis=1)

    prefilter = (opacity >= opacity_floor) & np.all(scales <= scale_cap, axis=1)
    idx = np.nonzero(prefilter)[0]
    if idx.size == 0:
        raise RuntimeError("No points survive the opacity/scale prefilter for saliency reduction")

    saliency = opacity[idx] * max_scale[idx]
    order = np.argsort(-saliency)
    top_idx = idx[order[: min(target_n, idx.size)]]
    top_idx.sort()  # stable file order

    _write_ply_structured(out_path, header_lines, arr[top_idx])
    return int(top_idx.size)


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


def compute_splat_manifest(
    ply_path: Path,
    fov_deg: float = 55.0,
    measured_up_colmap_frame: list[float] | None = None,
    metric_scale_applied: bool = False,
    initial_camera_position: list[float] | None = None,
    initial_camera_rotation: list[float] | None = None,
) -> dict[str, Any]:
    """Bake orientation + framing the web viewer can apply deterministically.

    Works in the viewer's POST-flip space (the viewer renders splatMesh with
    rotation=[PI,0,0], i.e. raw*(1,-1,-1)); the correction_quaternion is applied
    to the PARENT group on top of that flip.

    Q2 (finishes AF10's deferred half): when measured_up_colmap_frame is
    provided (recover_metric_scale's Kabsch-recovered rotation applied to
    ARKit's mean gravity vector — see run_pipeline), it is authoritative and
    used directly instead of floor-plane PCA (up_axis "Y_UP_MEASURED"). This
    was deferred in AF10 specifically because deriving the rotation between
    ARKit's and COLMAP's independent frames required real cross-frame
    registration — recover_metric_scale now does exactly that (Q1). PCA
    remains the fallback whenever no poses exist (web captures) or the
    correspondence was too weak to trust (recover_metric_scale returned None).

    R8.1: initial_camera_position/rotation (already carried through the crop
    -> recenter -> scale pipeline by run_pipeline's caller, and already
    flipped into this SAME *[1,-1,-1] post-flip space) are a real capture pose
    from the middle of the walk — the "open at the captured view" headline.
    When absent (no lidar_poses, or COLMAP couldn't register enough frames
    near the median time), initial_camera is omitted and viewers fall back to
    fallback_camera (the pre-R8 synthetic orbit camera, computed below
    exactly as before — kept under its old name recommended_orbit_camera too,
    for zero regression on any consumer not yet updated to read
    fallback_camera).
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

    if measured_up_colmap_frame is not None:
        # Q2: measured gravity, transformed into this model's own (raw PLY)
        # frame by recover_metric_scale's Kabsch rotation, then into the same
        # post-flip viewer space `pts` already uses above.
        raw_up = np.array(measured_up_colmap_frame, dtype=np.float64)
        raw_up_norm = np.linalg.norm(raw_up)
        if raw_up_norm > 1e-9:
            raw_up = raw_up / raw_up_norm
            flipped_up = raw_up * np.array([1.0, -1.0, -1.0])
            flipped_up = flipped_up / (np.linalg.norm(flipped_up) or 1.0)
            q = _quat_from_to(flipped_up, np.array([0.0, 1.0, 0.0]))
            tilt_deg = float(np.degrees(np.arccos(float(np.clip(flipped_up[1], -1.0, 1.0)))))
            manifest_up_axis = "Y_UP_MEASURED"
        else:
            measured_up_colmap_frame = None  # fall through to PCA below

    if measured_up_colmap_frame is None:
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

    fallback_camera = {
        "position": pos.tolist(),
        "target": center.tolist(),
        "fov": fov_deg,
        "near": max(radius / 500.0, 0.01),
        "far": float(dist + radius * 8.0),
    }

    initial_camera = None
    if initial_camera_position is not None and initial_camera_rotation is not None:
        initial_camera = {
            "position": [float(v) for v in initial_camera_position],
            "rotation": [float(v) for v in initial_camera_rotation],
            "source": "capture_pose",
        }

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
        # R8.1: a real capture pose to open on — preferred over fallback_camera
        # (the synthetic orbit camera below) whenever available.
        "initial_camera": initial_camera,
        "fallback_camera": fallback_camera,
        # Kept under the old name too — zero regression for any consumer not
        # yet updated to read fallback_camera (AF11's original field).
        "recommended_orbit_camera": fallback_camera,
        "interior_entry_point": [float(center[0]), floor_y + 1.6, float(center[2])],
        # Q1: lets the viewer upgrade the measurement disclaimer when a real
        # metric scale factor was baked into this model's positions.
        "metric_scale_applied": metric_scale_applied,
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
    force_colmap: bool = False
    match_tolerance_sec: float | None = None
    debug_artifacts: bool = False
    roll_correction_deg: float = 0.0

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
        raw_tolerance = payload.get("matchToleranceSec")
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
            force_colmap=bool(payload.get("forceColmap", False)),
            match_tolerance_sec=float(raw_tolerance) if raw_tolerance is not None else None,
            debug_artifacts=bool(payload.get("debugArtifacts", False)),
            roll_correction_deg=float(payload.get("rollCorrectionDeg", 0.0) or 0.0),
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

    # Q1: when lidar_poses exist, prefetch + parse them up front — cheap (a
    # small JSON), and needed by the COLMAP-path metric-scale recovery below
    # regardless of which alignment path this job ends up using. Independent
    # of try_lidar_bypass's own poses handling (the two never run in the same
    # job under colmap_first).
    poses_data: dict[str, Any] | None = None
    video_start_times: dict[int, float] = {}
    if job.lidar_poses_key:
        try:
            poses_prefetch_path = source_dir / "_lidar_poses_prefetch.json"
            s3.download_file(bucket, job.lidar_poses_key, str(poses_prefetch_path))
            maybe_gunzip(poses_prefetch_path)
            with poses_prefetch_path.open(encoding="utf-8") as f:
                poses_data = json.load(f)
            video_start_times = resolve_video_start_times(poses_data, source_dir, job.source_keys)
        except Exception as poses_exc:  # noqa: BLE001
            print(f"[scale-recovery] poses prefetch failed (non-fatal): {type(poses_exc).__name__}: {poses_exc}")
            poses_data = None

    ingest_stats = materialize_images(
        source_dir, images_dir, job.source_keys, job.is360_flags,
        video_start_times=video_start_times,
    )

    match_tolerance = (
        job.match_tolerance_sec if job.match_tolerance_sec is not None else DEFAULT_MATCH_TOLERANCE_SEC
    )

    post_progress(job.job_id, "align", 25)
    lidar_bypass_used = False
    lidar_ply_init = False
    bypass_stats: dict[str, Any] = {}
    skip_bypass_for_strategy = ALIGNMENT_STRATEGY == "colmap_first"
    if job.lidar_poses_key and (job.force_colmap or skip_bypass_for_strategy):
        reason = "force_colmap=true" if job.force_colmap else f"ALIGNMENT_STRATEGY={ALIGNMENT_STRATEGY}"
        print(f"[align] lidarPosesKey present but skipping ARKit bypass ({reason})")
    elif job.lidar_poses_key:
        lidar_bypass_used, lidar_ply_init, bypass_stats = try_lidar_bypass(
            s3, bucket, job.lidar_poses_key, job.lidar_ply_key,
            source_dir, work_root, processed_dir,
            source_keys=job.source_keys,
            match_tolerance_sec=match_tolerance,
            roll_correction_deg=job.roll_correction_deg,
        )

    colmap_images_total: int | None = None
    colmap_images_registered: int | None = None
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
        colmap_images_total = len([
            p for p in images_dir.iterdir()
            if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        ])
        colmap_images_registered = count_registered_images(processed_dir)

        # Q1/Q2: recover metric scale + measured-gravity orientation by
        # comparing COLMAP's solved trajectory against ARKit's for the same
        # frames — only possible when this capture has lidar_poses.
        scale_info: dict[str, Any] = {
            "scaleFactor": None, "framePairsUsed": 0, "scaleResidual": None,
            "scaleSkipped": "no_lidar_poses", "measuredUpColmapFrame": None,
        }
        if poses_data is not None:
            scale_info = recover_metric_scale(
                processed_dir, poses_data, ingest_stats.get("frameAbsTimes") or {},
                images_dir=images_dir,
            )

        # R8.1: pick a real capture frame near the median walk time to open
        # the model on — same scope decision as Q1/Q2 (COLMAP path only).
        representative_frame = select_representative_frame(
            processed_dir,
            ingest_stats.get("frameAbsTimes") or {},
            ingest_stats.get("frameSharpness") or {},
            images_dir,
        )
        initial_camera_skipped: str | None = None if representative_frame else "no_registered_frame_matched"
    else:
        matching_method = "lidar_bypass"
        scale_info = {
            "scaleFactor": None, "framePairsUsed": 0, "scaleResidual": None,
            "scaleSkipped": "bypass_path_not_in_scope", "measuredUpColmapFrame": None,
        }
        representative_frame = None
        initial_camera_skipped = "bypass_path_not_in_scope"

    iterations = quality_speed_iterations(job.quality, job.speed)
    if lidar_bypass_used and lidar_ply_init:
        # PLY-seeded splatfacto converges from real geometry rather than random
        # init, reducing the iterations needed for equivalent quality by ~30%.
        iterations = max(10_000, int(iterations * 0.70))
        print(f"[lidar-bypass] PLY init active — reduced iterations to {iterations}")

    debug_transforms_key: str | None = None
    if job.debug_artifacts:
        transforms_path = processed_dir / "transforms.json"
        if transforms_path.is_file():
            candidate_key = output_storage_key(job.org_id, job.space_id, job.job_id)[: -len(".spz")] + ".transforms.json"
            try:
                s3.upload_file(
                    str(transforms_path),
                    bucket,
                    candidate_key,
                    ExtraArgs={"ContentType": "application/json"},
                )
                debug_transforms_key = candidate_key
                print(f"[debug] uploaded transforms.json to {candidate_key}")
            except Exception as debug_exc:  # noqa: BLE001
                print(f"[debug] transforms.json upload failed (non-fatal): {debug_exc}")

    post_progress(job.job_id, "train", 45)
    # Training is self-silent for many minutes; heartbeat 45→84 so the UI shows movement,
    # and hard-timeout at 60 min (AF2, was 40) so a hung train fails visibly instead of
    # hanging until Modal's container kill (which posts no callback).
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
        expected_sec=1350,
        timeout=3600,
        env={"CUDA_VISIBLE_DEVICES": "0"},
    )

    post_progress(job.job_id, "optimize", 85)
    config_path = find_latest_file(train_dir, "**/config.yml")

    # Best-effort final eval PSNR for quality_metrics — never fails the job.
    train_psnr: float | None = None
    try:
        eval_json_path = work_root / "eval_metrics.json"
        run_cmd(
            [
                "ns-eval",
                "--load-config", str(config_path),
                "--output-path", str(eval_json_path),
            ],
            timeout=600,
        )
        if eval_json_path.is_file():
            eval_data = json.loads(eval_json_path.read_text(encoding="utf-8"))
            train_psnr = (eval_data.get("results") or {}).get("psnr")
    except Exception as eval_exc:  # noqa: BLE001
        print(f"[metrics] ns-eval failed (non-fatal): {type(eval_exc).__name__}: {eval_exc}")

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

    raw_ply_path = find_latest_file(export_dir, "**/*.ply")

    # AF9 (crop + recenter) + AF3 (splat-count ceiling): one full-property pass
    # over the raw ns-export output, BEFORE any opacity/scale filtering, so
    # everything downstream (spz conversion, bounds, manifest, floor plan)
    # operates on the cropped/capped/recentered cloud.
    cropped_ply_path = export_dir / "model_cropped.ply"
    crop_stats = crop_recenter_and_cap_ply(
        raw_ply_path, cropped_ply_path, scale_factor=scale_info.get("scaleFactor") or 1.0,
    )
    ply_path = cropped_ply_path

    # R8.1: carry the representative frame's RAW pose through the SAME
    # crop -> recenter -> scale -> viewer-flip pipeline crop_recenter_and_cap_ply
    # just applied to the splat positions, so initial_camera lands in exactly
    # the manifest/viewer space (bounds/fallback_camera's "pts" space, i.e.
    # raw*[1,-1,-1] — see compute_splat_manifest) the shipped model uses.
    initial_camera_position: list[float] | None = None
    initial_camera_rotation: list[float] | None = None
    if representative_frame is not None:
        try:
            import numpy as np

            crop_center = np.array(crop_stats.get("cropCenter") or [0.0, 0.0, 0.0], dtype=np.float64)
            scale_factor = float(scale_info.get("scaleFactor") or 1.0)
            flip = np.array([1.0, -1.0, -1.0])

            raw_pos = np.array(representative_frame["position"], dtype=np.float64)
            pos_pts = ((raw_pos - crop_center) * scale_factor) * flip
            initial_camera_position = pos_pts.tolist()

            raw_rot = np.array(representative_frame["rotationMatrix"], dtype=np.float64)
            flip_mat = np.diag(flip)
            rot_pts = flip_mat @ raw_rot @ flip_mat  # flip is its own inverse (F @ F = I)
            initial_camera_rotation = _quat_from_matrix(rot_pts).tolist()
        except Exception as pose_exc:  # noqa: BLE001
            initial_camera_position = None
            initial_camera_rotation = None
            initial_camera_skipped = f"pose_transform_failed:{type(pose_exc).__name__}"
            print(f"[initial-camera] pose transform failed (non-fatal): {pose_exc}")

    spz_path = export_dir / "model.spz"
    export_filter_stats = splat_transform_clean_export(ply_path, spz_path)

    if not spz_path.is_file():
        raise RuntimeError("SPZ export did not produce model.spz")

    post_progress(job.job_id, "export", 95)
    bounds = compute_ply_bounds(ply_path)
    splat_count = _ply_vertex_count(ply_path)
    file_size = spz_path.stat().st_size

    # AF1: ready-gate, evaluated on the LOCAL files before uploading anything
    # to R2 — a failing job should never publish or charge, and shouldn't
    # waste an upload + manifest + floor-plan pass either. Raising here routes
    # to process_job's except-block, which posts a "failed" callback; the
    # callback route never creates a model row or deducts credits for a
    # failed job, so this is the actual enforcement point.
    ready_gates = evaluate_ready_gates(train_psnr, splat_count, file_size)
    if ready_gates["failed"]:
        print(f"[ready-gate] FAILED: {json.dumps(ready_gates)}")
        raise RuntimeError(ready_gates["userMessage"])
    print(f"[ready-gate] passed: {json.dumps(ready_gates)}")

    out_key = output_storage_key(job.org_id, job.space_id, job.job_id)
    s3.upload_file(
        str(spz_path),
        bucket,
        out_key,
        ExtraArgs={"ContentType": "application/octet-stream"},
    )

    # Bake an orientation/framing manifest the web viewer applies deterministically.
    # Non-fatal: a failure here must never fail the job. Uploaded to the sibling
    # "<job>.manifest.json" key; the app derives its URL from the model storage key.
    manifest_key: str | None = None
    manifest: dict = {}
    try:
        manifest = compute_splat_manifest(
            ply_path,
            measured_up_colmap_frame=scale_info.get("measuredUpColmapFrame"),
            metric_scale_applied=scale_info.get("scaleFactor") is not None,
            initial_camera_position=initial_camera_position,
            initial_camera_rotation=initial_camera_rotation,
        )
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
            # Diagnostic instrumentation (see scripts/ops/diagnose-twin-poses.mjs).
            "alignmentPath": "arkit_bypass" if lidar_bypass_used else "colmap",
            "forceColmap": job.force_colmap,
            "matchToleranceSec": match_tolerance,
            "framesExtracted": bypass_stats.get("extractedCount"),
            "framesMatched": bypass_stats.get("matchedCount"),
            "matchDeltaMeanMs": bypass_stats.get("matchDeltaMeanMs"),
            "matchDeltaMaxMs": bypass_stats.get("matchDeltaMaxMs"),
            "colmapImagesTotal": colmap_images_total,
            "colmapImagesRegistered": colmap_images_registered,
            "trainPsnr": train_psnr,
            "debugTransformsKey": debug_transforms_key,
            "rollCorrectionDeg": job.roll_correction_deg,
            "alignmentStrategy": ALIGNMENT_STRATEGY,
            "readyGates": ready_gates,
            "crop": crop_stats,
            "exportFilter": export_filter_stats,
            "sharpFrameSelection": ingest_stats.get("sharpFrameSelection") or bypass_stats.get("sharpFrameSelection"),
            "gravityDataAvailable": bool(job.lidar_poses_key),
            # Q1 (metric scale) + Q2 (measured-gravity orientation) — both
            # derived from the same ARKit<->COLMAP correspondence.
            "scaleFactor": scale_info.get("scaleFactor"),
            "framePairsUsed": scale_info.get("framePairsUsed"),
            "scaleResidual": scale_info.get("scaleResidual"),
            "scaleSkipped": scale_info.get("scaleSkipped"),
            "measuredOrientationApplied": scale_info.get("measuredUpColmapFrame") is not None,
            # R8.1 ("open at the captured view")
            "initialCameraSource": "capture_pose" if initial_camera_position is not None else None,
            "initialCameraSkipped": None if initial_camera_position is not None else initial_camera_skipped,
            "representativeFrameAbsTime": representative_frame.get("absTime") if representative_frame else None,
            "representativeFrameMedianTime": representative_frame.get("medianTime") if representative_frame else None,
            "representativeFrameSharpness": representative_frame.get("sharpness") if representative_frame else None,
            "representativeFrameCandidateCount": representative_frame.get("candidateCount") if representative_frame else None,
            # R8.3(b) metric-aware spike clamp
            "spikeClampedCount": crop_stats.get("spikeClampedCount"),
            "spikeClampMaxExtentM": crop_stats.get("spikeClampMaxExtentM"),
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