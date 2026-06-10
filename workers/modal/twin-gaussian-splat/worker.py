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
import hashlib
import hmac
import json
import os
import re
import shutil
import subprocess
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
    )
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
        "node --version",
        "npm --version",
        "colmap -h >/dev/null",
        "ffmpeg -version >/dev/null",
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


def splat_transform_clean_export(ply_path: Path, spz_path: Path) -> None:
    """Conservative post-export cleanup: low opacity, spiky scales, floaters."""
    run_cmd(
        [
            "npx",
            "-y",
            "@playcanvas/splat-transform",
            "-w",
            str(ply_path),
            "--filter-nan",
            "--filter-value",
            "opacity,gte,0.05",
            "--filter-value",
            "scale_0,lte,0.5",
            "--filter-value",
            "scale_1,lte,0.5",
            "--filter-value",
            "scale_2,lte,0.5",
            "--filter-floaters",
            str(spz_path),
            "--spz-version",
            "3",
        ]
    )


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


def quality_speed_iterations(quality: str, speed: str) -> int:
    base = {"draft": 15_000, "standard": 30_000, "high": 45_000}.get(quality, 30_000)
    if speed == "fast":
        return max(10_000, int(base * 0.65))
    if speed == "slow":
        return int(base * 1.35)
    return base


def run_cmd(cmd: list[str], *, cwd: Path | None = None, env: dict[str, str] | None = None) -> None:
    merged_env = os.environ.copy()
    # COLMAP (via nerfstudio) needs a headless Qt platform on Modal GPU containers.
    merged_env["QT_QPA_PLATFORM"] = "offscreen"
    if env:
        merged_env.update(env)
    proc = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        env=merged_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        tail = (proc.stdout or "")[-8000:]
        raise RuntimeError(
            f"Command failed ({proc.returncode}): {' '.join(cmd)}\n{tail}"
        )


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


def compute_ply_bounds(ply_path: Path) -> dict[str, dict[str, float]]:
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
        for line in header_lines:
            if line.startswith("element vertex"):
                vertex_count = int(line.split()[-1])
                break
        if vertex_count <= 0:
            raise RuntimeError(f"Could not parse vertex count from {ply_path}")

        is_binary = "format binary_little_endian" in header
        coords: list[tuple[float, float, float]] = []

        if is_binary:
            dtype: list[tuple[str, str]] = []
            for line in header_lines:
                if line.startswith("property float x"):
                    dtype = [("x", "f4"), ("y", "f4"), ("z", "f4")]
                    break
            if not dtype:
                raise RuntimeError(f"Unsupported binary PLY layout: {ply_path}")
            arr = np.fromfile(fh, dtype=dtype, count=vertex_count)
            xs, ys, zs = arr["x"], arr["y"], arr["z"]
        else:
            for _ in range(vertex_count):
                parts = fh.readline().decode("utf-8", errors="ignore").split()
                if len(parts) < 3:
                    continue
                coords.append((float(parts[0]), float(parts[1]), float(parts[2])))
            xs = np.array([c[0] for c in coords], dtype=np.float64)
            ys = np.array([c[1] for c in coords], dtype=np.float64)
            zs = np.array([c[2] for c in coords], dtype=np.float64)

    return {
        "min": {"x": float(xs.min()), "y": float(ys.min()), "z": float(zs.min())},
        "max": {"x": float(xs.max()), "y": float(ys.max()), "z": float(zs.max())},
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
        )


def run_pipeline(job: JobInput, work_root: Path) -> dict[str, Any]:
    bucket = os.environ["R2_BUCKET"]
    s3 = s3_client()

    source_dir = work_root / "source"
    images_dir = work_root / "images"
    processed_dir = work_root / "processed"
    train_dir = work_root / "train"
    export_dir = work_root / "export"

    download_sources(s3, bucket, job.source_keys, source_dir)
    ingest_stats = materialize_images(
        source_dir, images_dir, job.source_keys, job.is360_flags
    )
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

    iterations = quality_speed_iterations(job.quality, job.speed)
    run_cmd(
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
        ],
        env={"CUDA_VISIBLE_DEVICES": "0"},
    )

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

    return {
        "outputKey": out_key,
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
            "orientationMethod": "up",
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