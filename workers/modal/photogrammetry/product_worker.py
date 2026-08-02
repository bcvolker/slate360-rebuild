"""Product exterior photogrammetry worker.

This is the product boundary around the proven ASU COLMAP baseline. It keeps
drone reconstruction separate from the Gaussian-splat worker and emits one
client-viewable GLB plus machine-readable orthomosaic/QC artifacts.

The first product contract is deliberately honest:
the model is local/UNREGISTERED unless a later georeferencing stage supplies a
CRS and checkpoint residuals. GPS EXIF is still used for spatial matching.
"""

from __future__ import annotations

import io
import json
import math
import os
import shutil
import struct
import subprocess
import tempfile
import threading
import traceback
from pathlib import Path
from typing import Any

import modal

try:
    from fastapi import Header
except ModuleNotFoundError:  # pragma: no cover - only the web image serves HTTP
    def Header(default=None, **_kwargs):  # type: ignore[misc]
        return default


APP_NAME = "slate360-photogrammetry-product"
SECRET_NAME = "slate360-twin-worker"
WEB_ENDPOINT_LABEL = "reconstruct-exterior"
COLMAP_IMAGE = (
    "colmap/colmap:20260729.7675@"
    "sha256:b9ab6c240ed8198d8b65fe3e23f16606c568e33e1ba865ca9d16429594e8c6b5"
)

app = modal.App(APP_NAME)
worker_secret = modal.Secret.from_name(SECRET_NAME)
vol = modal.Volume.from_name("slate360-photogrammetry-product", create_if_missing=True)

image = (
    modal.Image.from_registry(COLMAP_IMAGE, add_python="3.11")
    .pip_install(
        "boto3==1.35.99",
        "numpy<2",
        "opencv-python-headless==4.10.0.84",
        "pillow",
        "pycolmap==4.1.1",
        "requests==2.32.3",
    )
)
web_image = modal.Image.debian_slim(python_version="3.11").pip_install("fastapi[standard]")


def _run(args: list[str], *, cwd: Path | None = None) -> str:
    print("$", " ".join(args), flush=True)
    result = subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        capture_output=True,
        text=True,
        env={**os.environ, "QT_QPA_PLATFORM": "offscreen"},
    )
    output = "\n".join(part for part in (result.stdout, result.stderr) if part)
    if output:
        print(output[-6000:], flush=True)
    if result.returncode:
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(args)}")
    return output


def _s3_client():
    import boto3

    endpoint = os.environ.get("R2_ENDPOINT", "").strip()
    if not endpoint and os.environ.get("CLOUDFLARE_ACCOUNT_ID"):
        endpoint = f"https://{os.environ['CLOUDFLARE_ACCOUNT_ID']}.r2.cloudflarestorage.com"
    if not endpoint:
        raise RuntimeError("R2_ENDPOINT or CLOUDFLARE_ACCOUNT_ID is required")
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name=os.environ.get("R2_REGION", "auto"),
    )


def _download_sources(s3, bucket: str, source_keys: list[str], out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for index, key in enumerate(source_keys):
        suffix = Path(key).suffix.lower() or ".jpg"
        destination = out_dir / f"source_{index:04d}{suffix}"
        s3.download_file(bucket, key, str(destination))
        paths.append(destination)
    if not paths:
        raise RuntimeError("No exterior source files were supplied")
    return paths


def _find_sparse_model(root: Path) -> Path:
    candidates = sorted(
        path for path in (root / "sparse").glob("*") if (path / "images.bin").is_file()
    )
    if not candidates:
        raise RuntimeError("COLMAP registered no sparse reconstruction")
    return candidates[0]


def _run_sparse(images: Path, root: Path, max_image_size: int) -> tuple[Path, dict[str, Any]]:
    database = root / "database.db"
    sparse = root / "sparse"
    sparse.mkdir(parents=True, exist_ok=True)
    _run(
        [
            "colmap",
            "feature_extractor",
            "--database_path",
            str(database),
            "--image_path",
            str(images),
            "--ImageReader.single_camera_per_folder",
            "1",
            "--FeatureExtraction.max_image_size",
            str(max_image_size),
            "--FeatureExtraction.use_gpu",
            "1",
        ]
    )
    _run(
        [
            "colmap",
            "spatial_matcher",
            "--database_path",
            str(database),
            "--FeatureMatching.guided_matching",
            "1",
        ]
    )
    _run(
        [
            "colmap",
            "sequential_matcher",
            "--database_path",
            str(database),
            "--SequentialMatching.overlap",
            "20",
            "--FeatureMatching.guided_matching",
            "1",
        ]
    )
    _run(
        [
            "colmap",
            "mapper",
            "--database_path",
            str(database),
            "--image_path",
            str(images),
            "--output_path",
            str(sparse),
            "--Mapper.ba_use_gpu",
            "1",
        ]
    )
    model = _find_sparse_model(root)
    metrics: dict[str, Any] = {"sparseModelPath": str(model)}
    try:
        import pycolmap

        reconstruction = pycolmap.Reconstruction(str(model))
        metrics["registeredImages"] = int(len(reconstruction.images))
        metrics["meanReprojectionError"] = round(
            float(reconstruction.compute_mean_reprojection_error()), 4
        )
    except Exception as exc:  # pragma: no cover - depends on Modal's pycolmap build
        metrics["reconstructionMetricsError"] = f"{type(exc).__name__}: {exc}"
    return model, metrics


def _run_dense(images: Path, model: Path, root: Path, max_image_size: int) -> Path:
    dense = root / "dense"
    dense.mkdir(parents=True, exist_ok=True)
    _run(
        [
            "colmap",
            "image_undistorter",
            "--image_path",
            str(images),
            "--input_path",
            str(model),
            "--output_path",
            str(dense),
            "--output_type",
            "COLMAP",
            "--max_image_size",
            str(max_image_size),
        ]
    )
    _run(
        [
            "colmap",
            "patch_match_stereo",
            "--workspace_path",
            str(dense),
            "--workspace_format",
            "COLMAP",
            "--PatchMatchStereo.geom_consistency",
            "true",
            "--PatchMatchStereo.cache_size",
            "16",
        ]
    )
    fused = dense / "fused.ply"
    _run(
        [
            "colmap",
            "stereo_fusion",
            "--workspace_path",
            str(dense),
            "--workspace_format",
            "COLMAP",
            "--input_type",
            "geometric",
            "--StereoFusion.cache_size",
            "16",
            "--output_path",
            str(fused),
        ]
    )
    if not fused.is_file():
        raise RuntimeError("COLMAP dense fusion produced no fused.ply")
    return fused


def _run_textured_mesh(images: Path, model: Path, dense: Path, root: Path) -> Path:
    texture_workspace = root / "texture"
    texture_workspace.mkdir(parents=True, exist_ok=True)
    _run(
        [
            "colmap",
            "image_undistorter",
            "--image_path",
            str(images),
            "--input_path",
            str(model),
            "--output_path",
            str(texture_workspace),
            "--output_type",
            "COLMAP",
        ]
    )
    raw_mesh = root / "mesh_raw.ply"
    _run(
        [
            "colmap",
            "poisson_mesher",
            "--input_path",
            str(dense / "fused.ply"),
            "--output_path",
            str(raw_mesh),
        ]
    )
    textured_dir = root / "textured"
    textured_dir.mkdir(parents=True, exist_ok=True)
    _run(
        [
            "colmap",
            "mesh_texturer",
            "--workspace_path",
            str(texture_workspace),
            "--input_path",
            str(raw_mesh),
            "--output_path",
            str(textured_dir),
            "--output_type",
            "BIN",
        ]
    )
    mesh = textured_dir / "mesh.ply"
    texture = textured_dir / "texture.png"
    if not mesh.is_file() or not texture.is_file():
        raise RuntimeError("COLMAP texturer produced no mesh.ply/texture.png pair")
    return mesh


def _ply_vertices(path: Path) -> tuple[Any, Any]:
    import numpy as np

    with path.open("rb") as handle:
        header: list[str] = []
        line = handle.readline()
        while line and line.strip() != b"end_header":
            header.append(line.decode("ascii", "ignore").strip())
            line = handle.readline()
        if not line:
            raise RuntimeError(f"Invalid PLY header: {path}")
        vertex_count = next(
            int(row.split()[-1]) for row in header if row.startswith("element vertex")
        )
        properties = [
            row.split()
            for row in header
            if row.startswith("property ") and not row.startswith("property list")
        ]
        names = [row[2] for row in properties]
        types = [row[1] for row in properties]
        type_map = {
            "float": "<f4",
            "float32": "<f4",
            "double": "<f8",
            "uchar": "u1",
            "uint8": "u1",
            "int": "<i4",
            "int32": "<i4",
        }
        dtype = np.dtype([(name, type_map[type_name]) for name, type_name in zip(names, types)])
        vertices = np.fromfile(handle, dtype=dtype, count=vertex_count)
    xyz = np.column_stack([vertices["x"], vertices["y"], vertices["z"]]).astype("f4")
    rgb = (
        np.column_stack([vertices["red"], vertices["green"], vertices["blue"]]).astype("u1")
        if all(name in vertices.dtype.names for name in ("red", "green", "blue"))
        else np.full((len(vertices), 3), 180, dtype="u1")
    )
    return xyz, rgb


def _textured_ply_to_glb(mesh_path: Path, texture_path: Path, output_path: Path) -> dict[str, Any]:
    import numpy as np
    from PIL import Image

    with mesh_path.open("rb") as handle:
        header: list[str] = []
        line = handle.readline()
        while line and line.strip() != b"end_header":
            header.append(line.decode("ascii", "ignore").strip())
            line = handle.readline()
        if not line or not any(row == "format binary_little_endian 1.0" for row in header):
            raise RuntimeError("Only binary little-endian textured PLY is supported")
        vertex_count = next(
            int(row.split()[-1]) for row in header if row.startswith("element vertex")
        )
        face_count = next(
            int(row.split()[-1]) for row in header if row.startswith("element face")
        )
        vertex_rows = [row for row in header if row.startswith("property ") and not row.startswith("property list")]
        names = [row.split()[-1] for row in vertex_rows]
        types = [row.split()[1] for row in vertex_rows]
        type_map = {"float": "<f4", "double": "<f8", "uchar": "u1", "uint8": "u1", "int": "<i4"}
        dtype = np.dtype([(name, type_map[type_name]) for name, type_name in zip(names, types)])
        vertices = np.fromfile(handle, dtype=dtype, count=vertex_count)
        faces = handle.read()

    offset = 0
    positions: list[list[float]] = []
    uvs: list[list[float]] = []
    for _ in range(face_count):
        if offset >= len(faces):
            raise RuntimeError("Truncated textured PLY face data")
        index_count = faces[offset]
        offset += 1 + index_count * 4
        if offset >= len(faces):
            raise RuntimeError("Textured PLY has no UV list")
        uv_count = faces[offset]
        offset += 1
        if uv_count != 6:
            raise RuntimeError(f"Unsupported textured PLY UV count: {uv_count}")
        indices_start = offset - 1 - index_count * 4 - 1
        indices = np.frombuffer(
            faces[indices_start + 1 : indices_start + 1 + index_count * 4],
            dtype="<i4",
        )
        uv_values = np.frombuffer(faces[offset : offset + 24], dtype="<f4").reshape(-1, 2)
        offset += 24
        if len(indices) != 3 or len(uv_values) != 3:
            raise RuntimeError("Only triangular textured PLY faces are supported")
        for index, uv in zip(indices, uv_values):
            positions.append(vertices[index][["x", "y", "z"]].tolist())
            uvs.append([float(uv[0]), 1.0 - float(uv[1])])

    pos = np.asarray(positions, dtype="<f4")
    uv = np.asarray(uvs, dtype="<f4")
    image = Image.open(texture_path).convert("RGB")
    buffer_parts: list[bytes] = []
    views: list[dict[str, Any]] = []
    accessors: list[dict[str, Any]] = []
    offset = 0

    def add_buffer(data: bytes, target: int | None = None) -> int:
        nonlocal offset
        padding = b"\0" * ((4 - len(data) % 4) % 4)
        buffer_parts.append(data + padding)
        view: dict[str, Any] = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        views.append(view)
        index = len(views) - 1
        offset += len(data) + len(padding)
        return index

    def add_accessor(view: int, count: int, kind: str, minimum=None, maximum=None) -> int:
        accessor: dict[str, Any] = {
            "bufferView": view,
            "componentType": 5126,
            "count": count,
            "type": kind,
        }
        if minimum is not None:
            accessor["min"] = minimum
            accessor["max"] = maximum
        accessors.append(accessor)
        return len(accessors) - 1

    position_view = add_buffer(pos.tobytes(), 34962)
    uv_view = add_buffer(uv.tobytes(), 34962)
    image_buffer = io.BytesIO()
    image.save(image_buffer, format="JPEG", quality=90, optimize=True)
    image_view = add_buffer(image_buffer.getvalue())
    position_accessor = add_accessor(
        position_view,
        len(pos),
        "VEC3",
        pos.min(axis=0).tolist(),
        pos.max(axis=0).tolist(),
    )
    uv_accessor = add_accessor(uv_view, len(uv), "VEC2")
    gltf = {
        "asset": {"version": "2.0", "generator": "slate360 exterior photogrammetry"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{
            "primitives": [{
                "attributes": {"POSITION": position_accessor, "TEXCOORD_0": uv_accessor},
                "material": 0,
            }]
        }],
        "materials": [{
            "pbrMetallicRoughness": {
                "baseColorTexture": {"index": 0},
                "metallicFactor": 0.0,
                "roughnessFactor": 1.0,
            },
            "doubleSided": True,
        }],
        "textures": [{"source": 0, "sampler": 0}],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
        "images": [{"bufferView": image_view, "mimeType": "image/jpeg"}],
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": offset}],
    }
    json_bytes = json.dumps(gltf, separators=(",", ":")).encode()
    json_bytes += b" " * ((4 - len(json_bytes) % 4) % 4)
    binary = b"".join(buffer_parts)
    glb = (
        struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(json_bytes) + 8 + len(binary))
        + struct.pack("<I4s", len(json_bytes), b"JSON")
        + json_bytes
        + struct.pack("<I4s", len(binary), b"BIN\0")
        + binary
    )
    output_path.write_bytes(glb)
    return {"vertices": int(len(pos)), "faces": int(len(pos) // 3), "bytes": len(glb)}


def _rasterize_ortho(fused: Path, output_dir: Path, gsd_m: float = 0.03) -> dict[str, Any]:
    import cv2
    import numpy as np

    xyz, rgb = _ply_vertices(fused)
    x, y, z = xyz[:, 0], xyz[:, 1], xyz[:, 2]
    x0, x1 = np.percentile(x, [0.5, 99.5])
    y0, y1 = np.percentile(y, [0.5, 99.5])
    width = max(1, int((x1 - x0) / gsd_m))
    height = max(1, int((y1 - y0) / gsd_m))
    cx = np.clip(((x - x0) / gsd_m).astype("i4"), 0, width - 1)
    cy = np.clip(((y1 - y) / gsd_m).astype("i4"), 0, height - 1)
    flat = cy.astype("i8") * width + cx
    order = np.lexsort((-z, flat))
    selected = np.r_[True, flat[order][1:] != flat[order][:-1]]
    pixels = flat[order][selected]
    image = np.zeros((width * height, 3), dtype="u1")
    image[pixels] = rgb[order][selected]
    image = image.reshape(height, width, 3)
    output_dir.mkdir(parents=True, exist_ok=True)
    ortho_path = output_dir / "orthomosaic.jpg"
    cv2.imwrite(str(ortho_path), image[:, :, ::-1], [cv2.IMWRITE_JPEG_QUALITY, 90])
    np.savez_compressed(output_dir / "dem.npz", dem=z, gsd_m=gsd_m, origin=[float(x0), float(y1)])
    return {
        "orthomosaic": str(ortho_path),
        "gsdM": gsd_m,
        "width": width,
        "height": height,
        "bounds": {
            "min": [float(x.min()), float(z.min()), float(y.min())],
            "max": [float(x.max()), float(z.max()), float(y.max())],
        },
    }


def _upload(s3, bucket: str, path: Path, key: str, content_type: str) -> None:
    s3.upload_file(
        str(path),
        bucket,
        key,
        ExtraArgs={"ContentType": content_type},
    )


# Current pipeline position, reported by the heartbeat thread. Stage names are
# mapped onto the progress route's fixed vocabulary (upload/align/train/optimize/
# export) so no app change is needed: download→upload, sparse→align, dense→train,
# texture/GLB→optimize, derivatives→export.
_PROGRESS = {"stage": "upload", "pct": 6}


def _set_stage(job_id: str, stage: str, pct: int) -> None:
    _PROGRESS["stage"] = stage
    _PROGRESS["pct"] = pct
    _post_progress(job_id)


def _post_progress(job_id: str) -> None:
    """Best-effort signed heartbeat. The stale-job recovery keys on last activity
    (updated_at), so a silent multi-hour COLMAP stage MUST keep posting or the DB
    marks the job failed while the container is still working (Phase 1 exterior
    failure mode). Never raises — a flaky heartbeat must not kill a live job."""
    import hashlib
    import hmac
    import requests

    if not job_id:
        return
    try:
        raw = json.dumps(
            {"stage": _PROGRESS["stage"], "progress_pct": _PROGRESS["pct"]},
            separators=(",", ":"),
        ).encode()
        signature = hmac.new(
            os.environ["GPU_WORKER_SECRET_KEY"].encode(), raw, hashlib.sha256
        ).hexdigest()
        resp = requests.post(
            f"{os.environ['SITE_URL'].rstrip('/')}/api/twin/jobs/{job_id}/progress",
            data=raw,
            headers={
                "Content-Type": "application/json",
                "x-worker-signature": f"sha256={signature}",
            },
            timeout=15,
        )
        if resp.status_code >= 400:
            print(f"[progress] rejected ({resp.status_code}): {resp.text[:300]}", flush=True)
    except Exception as exc:  # noqa: BLE001
        print(f"[progress] heartbeat failed (non-fatal): {type(exc).__name__}: {exc}", flush=True)


def _callback(payload: dict[str, Any]) -> None:
    import hmac
    import hashlib
    import requests

    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()
    signature = hmac.new(
        os.environ["GPU_WORKER_SECRET_KEY"].encode(), raw, hashlib.sha256
    ).hexdigest()
    response = requests.post(
        f"{os.environ['SITE_URL'].rstrip('/')}/api/digital-twin/jobs/callback",
        data=raw,
        headers={"Content-Type": "application/json", "x-worker-signature": f"sha256={signature}"},
        timeout=60,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Callback rejected ({response.status_code}): {response.text[:1000]}")


def _run_exterior(payload: dict[str, Any], root: Path) -> dict[str, Any]:
    bucket = os.environ["R2_BUCKET"]
    s3 = _s3_client()
    source_keys = [str(key) for key in payload.get("sourceKeys", [])]
    job_id = str(payload.get("jobId") or "")
    images = root / "images"
    _set_stage(job_id, "upload", 6)
    _download_sources(s3, bucket, source_keys, images)
    max_image_size = 2400 if payload.get("quality") == "high" else 1600
    _set_stage(job_id, "align", 20)
    model, sparse_metrics = _run_sparse(images, root, max_image_size)
    _set_stage(job_id, "train", 45)
    fused = _run_dense(images, model, root, max_image_size)
    _set_stage(job_id, "optimize", 75)
    textured_mesh = _run_textured_mesh(images, model, root / "dense", root)
    glb = root / "exterior.glb"
    glb_metrics = _textured_ply_to_glb(
        textured_mesh,
        root / "textured" / "texture.png",
        glb,
    )
    ortho_metrics = _rasterize_ortho(fused, root / "ortho")
    registered_images = int(sparse_metrics.get("registeredImages") or 0)
    qc = {
        "contractVersion": "exterior.v1",
        "sourceRole": payload.get("sourceRole", "drone"),
        "sourceCount": len(source_keys),
        "registeredImages": registered_images,
        "totalImages": len(source_keys),
        "registrationPct": round(
            100.0 * registered_images / max(1, len(source_keys)),
            2,
        ),
        "meanReprojectionError": sparse_metrics.get("meanReprojectionError"),
        "georeferenceStatus": "UNREGISTERED",
        "crs": None,
        "densePointCount": int(len(_ply_vertices(fused)[0])),
        "glb": glb_metrics,
        "ortho": ortho_metrics,
    }
    _set_stage(job_id, "export", 90)
    qc_path = root / "qc.json"
    qc_path.write_text(json.dumps(qc, indent=2) + "\n", encoding="utf-8")
    prefix = f"orgs/{payload['orgId']}/digital-twin/{payload['spaceId']}/models/{payload['jobId']}"
    keys = {
        "glb": f"{prefix}.glb",
        "orthomosaic": f"{prefix}.orthomosaic.jpg",
        "dem": f"{prefix}.dem.npz",
        "qc": f"{prefix}.qc.json",
    }
    _upload(s3, bucket, glb, keys["glb"], "model/gltf-binary")
    _upload(s3, bucket, Path(ortho_metrics["orthomosaic"]), keys["orthomosaic"], "image/jpeg")
    _upload(s3, bucket, root / "ortho" / "dem.npz", keys["dem"], "application/octet-stream")
    _upload(s3, bucket, qc_path, keys["qc"], "application/json")
    return {
        "outputKey": keys["glb"],
        "fileSizeBytes": glb.stat().st_size,
        "qualityMetrics": {**qc, "derivativeKeys": keys},
        "bounds": ortho_metrics["bounds"],
        "modelFormat": "glb",
    }


@app.function(image=image, gpu="A10G", volumes={"/data": vol}, secrets=[worker_secret], timeout=12 * 3600)
def process_exterior_job(payload: dict[str, Any]) -> None:
    job_id = str(payload.get("jobId") or "")
    root = Path("/tmp") / f"exterior-job-{job_id or 'unknown'}"
    shutil.rmtree(root, ignore_errors=True)
    root.mkdir(parents=True, exist_ok=True)
    stop_beat = threading.Event()

    def _beat() -> None:
        while not stop_beat.wait(60):
            _post_progress(job_id)

    heartbeat = threading.Thread(target=_beat, daemon=True)
    heartbeat.start()
    try:
        result = _run_exterior(payload, root)
        _callback({
            "jobId": job_id,
            "status": "completed",
            "outputKey": result["outputKey"],
            "modelFormat": result["modelFormat"],
            "fileSizeBytes": result["fileSizeBytes"],
            "newAssetIds": payload.get("newAssetIds", []),
            "bounds": result["bounds"],
            "qualityMetrics": result["qualityMetrics"],
            "georef": {
                "status": result["qualityMetrics"]["georeferenceStatus"],
                "crs": result["qualityMetrics"]["crs"],
            },
        })
    except Exception as exc:
        print(traceback.format_exc(), flush=True)
        if job_id:
            _callback({
                "jobId": job_id,
                "status": "failed",
                "errorLog": f"{type(exc).__name__}: {exc}"[:4000],
            })
        raise
    finally:
        stop_beat.set()
        shutil.rmtree(root, ignore_errors=True)


@app.function(image=web_image, secrets=[worker_secret], timeout=60)
@modal.fastapi_endpoint(method="POST", label=WEB_ENDPOINT_LABEL)
def reconstruct_exterior(body: dict[str, Any], x_dispatch_token: str = Header(default="")):
    from fastapi.responses import JSONResponse
    import hmac

    expected = os.environ.get("GPU_WORKER_SECRET_KEY", "").strip()
    supplied = (x_dispatch_token or "").strip()
    required = os.environ.get("MODAL_DISPATCH_AUTH_REQUIRED", "").strip().lower() in {"1", "true", "yes"}
    if not expected:
        return JSONResponse(status_code=500, content={"error": "worker secret not configured"})
    if not supplied and required:
        return JSONResponse(status_code=401, content={"error": "dispatch token required"})
    if supplied and not hmac.compare_digest(supplied, expected):
        return JSONResponse(status_code=401, content={"error": "invalid dispatch token"})
    if not isinstance(body, dict) or not body.get("jobId") or not body.get("sourceKeys"):
        return JSONResponse(status_code=400, content={"error": "jobId and sourceKeys are required"})
    try:
        call = process_exterior_job.spawn(body)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": f"Failed to enqueue job: {exc}"})
    return JSONResponse(
        status_code=200,
        content={"accepted": True, "jobId": body["jobId"]},
        headers={"x-modal-run-id": call.object_id},
    )
