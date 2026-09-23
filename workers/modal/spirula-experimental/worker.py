"""Modal app for the experimental Spirula trainer.

The twin reconstruction worker is not imported. Spirula source is cloned at
image build from the pinned SHA and is not vendored into Slate360.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
import urllib.request
from pathlib import Path

import modal

try:
    from fastapi import Header
except ModuleNotFoundError:
    def Header(default=None, **_kwargs):  # type: ignore[misc]
        return default

from acceptance import accept_attempt
from claims import claim_experiment
from cost_guard import assert_allowed
from pin import CUDA_BASE_IMAGE, IMAGE_APT, SPIRULA_BIN, SPIRULA_SHA, SPIRULA_SHA_FILE
from smoke_job import execute
from storage import bucket, client, download_prefix, release_lock, try_lock, upload_tree
from synthetic_dataset import build
from package_validate import validate_package

APP_NAME = "slate360-spirula-experimental"
SECRET_NAME = "slate360-twin-worker"
VOLUME_NAME = "spirula-experimental-checkpoints"

_build_script_path = Path(__file__).with_name("image_build.sh")
if _build_script_path.is_file():
    _build_script_bytes = _build_script_path.read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    if SPIRULA_SHA.encode() not in _build_script_bytes:
        raise RuntimeError("image_build.sh does not contain the pinned SHA")
    if _build_script_path.read_bytes() != _build_script_bytes:
        _build_script_path.write_bytes(_build_script_bytes)

app = modal.App(APP_NAME)
secret = modal.Secret.from_name(SECRET_NAME)
volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)

gpu_image = (
    modal.Image.from_registry(CUDA_BASE_IMAGE, add_python="3.11")
    .apt_install(*IMAGE_APT)
    .pip_install("boto3")
    .add_local_file("image_build.sh", "/tmp/spirula_image_build.sh", copy=True)
    .run_commands("bash /tmp/spirula_image_build.sh")
)
web_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("fastapi[standard]", "boto3")
    .add_local_python_source(
        "cost_guard",
        "pin",
        "smoke_job",
        "storage",
        "synthetic_dataset",
        "package_validate",
        "colmap_validate",
        "ply_validate",
        "train_command",
        "train_run",
        "preview",
        "lifecycle",
        "acceptance",
        "claims",
    )
)
gpu_image = gpu_image.add_local_python_source(
    "cost_guard",
    "pin",
    "smoke_job",
    "storage",
    "synthetic_dataset",
    "package_validate",
    "colmap_validate",
    "ply_validate",
    "train_command",
    "train_run",
    "preview",
    "lifecycle",
    "acceptance",
    "claims",
)


def assert_cuda_device() -> dict:
    sha = Path(SPIRULA_SHA_FILE).read_text(encoding="utf-8").strip()
    backend = Path("/opt/spirula/BACKEND").read_text(encoding="utf-8").strip()
    if sha != SPIRULA_SHA:
        raise RuntimeError(f"image SHA {sha} != pin {SPIRULA_SHA}")
    if backend != "cuda":
        raise RuntimeError(f"backend {backend} is not cuda")
    if not Path(SPIRULA_BIN).is_file():
        raise RuntimeError("spirula binary missing")
    try:
        listing = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
            text=True,
            stderr=subprocess.STDOUT,
        ).strip()
    except (FileNotFoundError, subprocess.CalledProcessError) as exc:
        raise RuntimeError("nvidia-smi failed; refusing a CPU fallback") from exc
    if not listing:
        raise RuntimeError("no GPU listed; refusing a CPU fallback")
    return {"sha": sha, "backend": backend, "nvidiaSmi": listing, "binary": SPIRULA_BIN}


def _callback(payload: dict) -> str:
    secret_value = os.environ.get("GPU_WORKER_SECRET_KEY", "").strip()
    site = os.environ.get("SITE_URL", "").rstrip("/")
    if not secret_value or not site:
        return "callback skipped: SITE_URL or secret missing"
    import hashlib
    import hmac

    raw = json.dumps(payload).encode("utf-8")
    signature = hmac.new(secret_value.encode("utf-8"), raw, hashlib.sha256).hexdigest()
    request = urllib.request.Request(
        f"{site}/api/internal/spirula-experimental/callback",
        data=raw,
        headers={"Content-Type": "application/json", "x-worker-signature": signature},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return f"callback {response.status}"
    except Exception as exc:  # noqa: BLE001 — a failed callback must not delete artifacts
        return f"callback failed: {exc}"


@app.function(
    image=gpu_image,
    gpu="T4",
    timeout=40 * 60,
    max_containers=1,
    secrets=[secret],
    volumes={"/checkpoints": volume},
)
def run_smoke(experiment_id: str) -> dict:
    """Tiny synthetic train. Does not read Room 213 and does not raise cap_max."""
    if not experiment_id or "/" in experiment_id:
        raise RuntimeError("experimentId is required")
    cost = assert_allowed("T4", 20, None)
    s3 = client()
    claim = claim_experiment(lambda key, body: try_lock(s3, key, body), lambda key: release_lock(s3, key), experiment_id)
    if not claim["claimed"]:
        return {"skipped": True, "reason": claim["reason"]}
    hardware: dict = {}
    work = Path("/tmp") / experiment_id
    prefix = f"experimental/spirula/{experiment_id}"
    started = time.time()
    try:
        hardware = assert_cuda_device()
        if work.exists():
            shutil.rmtree(work)
        build(work / "dataset", experiment_id=experiment_id)
        validation = validate_package(work / "dataset")
        (work / "validation.json").write_text(json.dumps(validation, indent=2), encoding="utf-8")

        def publish_status(path: Path) -> None:
            client().upload_file(
                str(path),
                bucket(),
                f"{prefix}/status.json",
                ExtraArgs={"ContentType": "application/json"},
            )

        result = execute(work, [SPIRULA_BIN], expected_seconds=20 * 60, on_status=publish_status)
        elapsed = time.time() - started
        cost = {
            **cost,
            **hardware,
            "actualSeconds": round(elapsed, 1),
            "actualUsd": round(cost["usdPerHour"] * elapsed / 3600, 4),
        }
        (work / "cost.json").write_text(json.dumps(cost, indent=2), encoding="utf-8")
        park = Path("/checkpoints") / experiment_id
        if park.exists():
            shutil.rmtree(park)
        shutil.copytree(work / "persistent", park)
        volume.commit()
        s3 = client()
        keys = upload_tree(s3, prefix, work)
        keys += upload_tree(s3, f"{prefix}/checkpoint", park)
        if result.get("status") == "pending-acceptance":
            fresh = Path("/tmp") / f"{experiment_id}-fresh"
            if fresh.exists():
                shutil.rmtree(fresh)
            remote = download_prefix(s3, prefix, fresh)
            decision = accept_attempt(fresh, int(result["exitCode"]), remote)
            (work / "acceptance.json").write_text(json.dumps(decision, indent=2), encoding="utf-8")
            s3.upload_file(
                str(work / "acceptance.json"),
                bucket(),
                f"{prefix}/acceptance.json",
                ExtraArgs={"ContentType": "application/json"},
            )
            result = {**result, "status": "completed", "acceptance": decision}
        callback = _callback(
            {
                "experimentId": experiment_id,
                "status": "completed",
                "trainerSha": SPIRULA_SHA,
                "artifactPrefix": prefix,
                "metrics": result.get("preview"),
                "cost": cost,
                "hardware": hardware,
                "exitCode": result.get("exitCode"),
                "crash": (result.get("acceptance") or {}).get("crash"),
            }
        )
        return {
            "experimentId": experiment_id,
            "prefix": prefix,
            "objects": len(keys),
            "callback": callback,
            "hardware": hardware,
        }
    except Exception as exc:
        fail = work / "error.txt"
        fail.parent.mkdir(parents=True, exist_ok=True)
        elapsed = time.time() - started
        cost = {
            **cost,
            **hardware,
            "actualSeconds": round(elapsed, 1),
            "actualUsd": round(cost["usdPerHour"] * elapsed / 3600, 4),
        }
        (work / "cost.json").write_text(json.dumps(cost, indent=2), encoding="utf-8")
        fail.write_text(str(exc), encoding="utf-8")
        try:
            upload_tree(client(), prefix, work)
        except Exception as upload_exc:  # noqa: BLE001
            print(f"artifact upload failed: {upload_exc}")
        callback = _callback(
            {
                "experimentId": experiment_id,
                "status": "failed",
                "trainerSha": SPIRULA_SHA,
                "artifactPrefix": prefix,
                "error": str(exc)[:2000],
                "cost": cost,
                "hardware": hardware,
            }
        )
        print(callback)
        raise
    finally:
        try:
            release_lock(client(), ACTIVE_KEY)
        except Exception as lock_exc:  # noqa: BLE001
            print(f"lock release failed: {lock_exc}")


@app.function(image=web_image, secrets=[secret], timeout=60)
@modal.fastapi_endpoint(method="POST", label="spirula-experimental")
def launch(body: dict, x_dispatch_token: str = Header(default="")):
    import hmac
    from fastapi.responses import JSONResponse

    expected = os.environ.get("GPU_WORKER_SECRET_KEY", "").strip()
    supplied = (x_dispatch_token or "").strip()
    if not expected or not supplied or len(supplied) != len(expected) or not hmac.compare_digest(supplied, expected):
        return JSONResponse(status_code=401, content={"error": "dispatch token required"})
    if not isinstance(body, dict):
        return JSONResponse(status_code=400, content={"error": "JSON object required"})
    if body.get("profile") != "smoke":
        return JSONResponse(status_code=403, content={"error": "only the smoke profile can launch"})
    experiment_id = str(body.get("experimentId") or "")
    if not experiment_id:
        return JSONResponse(status_code=400, content={"error": "experimentId is required"})
    try:
        assert_allowed("T4", 20, None)
        s3 = client()
        from botocore.exceptions import ClientError

        try:
            s3.head_object(Bucket=os.environ["R2_BUCKET"], Key=started_key(experiment_id))
            return JSONResponse(status_code=409, content={"error": "experiment already started"})
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code not in {"404", "NoSuchKey", "NotFound"}:
                raise
        call = run_smoke.spawn(experiment_id)
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(status_code=500, content={"error": str(exc)})
    return JSONResponse(
        status_code=202,
        content={"accepted": True, "experimentId": experiment_id, "callId": call.object_id},
        headers={"x-modal-run-id": call.object_id},
    )


@app.local_entrypoint()
def smoke(experiment_id: str = "spirula-smoke-v1"):
    print(json.dumps(run_smoke.remote(experiment_id), indent=2))
