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


def splat_transform_clean_export(ply_path: Path, spz_path: Path) -> None:
    """Conservative CPU-only post-export cleanup: low opacity and spiky scales."""
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


def compute_splat_manifest(ply_path: Path, fov_deg: float = 55.0) -> dict[str, Any]:
    """Bake orientation + framing the web viewer can apply deterministically.

    Works in the viewer's POST-flip space (the viewer renders splatMesh with
    rotation=[PI,0,0], i.e. raw*(1,-1,-1)); the correction_quaternion is applied
    to the PARENT group on top of that flip.
    """
    import numpy as np

    raw = _read_ply_xyz(ply_path)
    pts = raw * np.array([1.0, -1.0, -1.0])  # match viewer rotation=[Math.PI,0,0]

    lo = np.percentile(pts, 1, axis=0)
    hi = np.percentile(pts, 99, axis=0)
    mask = np.all((pts >= lo) & (pts <= hi), axis=1)
    core = pts[mask] if int(mask.sum()) >= 100 else pts

    cmin = core.min(axis=0)
    cmax = core.max(axis=0)
    center = (cmin + cmax) / 2.0
    radius = float(np.linalg.norm(cmax - cmin) / 2.0) or 1.0

    # Floor cluster = bottom 25% by Y; PCA smallest-variance axis ≈ floor normal.
    ycut = np.percentile(core[:, 1], 25)
    floor = core[core[:, 1] <= ycut]
    if floor.shape[0] < 50:
        floor = core
    cen = floor - floor.mean(axis=0)
    cov = (cen.T @ cen) / max(len(floor) - 1, 1)
    _evals, evecs = np.linalg.eigh(cov)  # ascending
    normal = evecs[:, 0]
    if normal[1] < 0:
        normal = -normal
    tilt_deg = float(np.degrees(np.arccos(float(np.clip(normal[1], -1.0, 1.0)))))
    q = _quat_from_to(normal, np.array([0.0, 1.0, 0.0]))

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
        "up_axis": "Y_UP" if tilt_deg < 8.0 else "TILTED",
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

    # Bake an orientation/framing manifest the web viewer applies deterministically.
    # Non-fatal: a failure here must never fail the job. Uploaded to the sibling
    # "<job>.manifest.json" key; the app derives its URL from the model storage key.
    manifest_key: str | None = None
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

    return {
        "outputKey": out_key,
        "manifestKey": manifest_key,
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