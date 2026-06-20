"""
Slate360 Design Studio — preview/asset-gen worker (Modal).

Mirrors the thermal/twin worker pattern: a FastAPI endpoint accepts a job,
processes asynchronously, and POSTs a signed (HMAC) callback to the app.

Modes:
  - mock (default): echoes the source as the preview so the pipeline works
    end-to-end with no GPU spend. Flip on real generation by implementing the
    TODOs below and setting MODAL_DESIGN_ENDPOINT in .env.local.
  - image_render:  FLUX.1 (open-weight) concept render of the scene.
  - image_to_3d:   Hunyuan3D-2 / TripoSR (open-weight) photo|text -> GLB.

Deploy:
  cd workers/modal/design-preview
  PYTHONIOENCODING=utf-8 python -m modal deploy worker.py
Set the printed endpoint as MODAL_DESIGN_ENDPOINT (label: process).
"""

import hashlib
import hmac
import json
import os
import urllib.request

import modal

app = modal.App("slate360-design-preview")

image = (
    modal.Image.debian_slim()
    .pip_install("fastapi[standard]", "boto3")
    # Real generation deps (uncomment when implementing):
    # .pip_install("torch", "diffusers", "transformers", "trimesh")
    # .pip_install("hy3dgen")  # Hunyuan3D
)


def _sign(raw: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def _callback(payload: dict) -> None:
    site = os.environ["SITE_URL"].rstrip("/")
    secret = os.environ["GPU_WORKER_SECRET_KEY"]
    raw = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{site}/api/design-studio/jobs/callback",
        data=raw,
        headers={
            "Content-Type": "application/json",
            "x-worker-signature": f"sha256={_sign(raw, secret)}",
        },
        method="POST",
    )
    urllib.request.urlopen(req, timeout=30)


@app.function(
    image=image,
    # gpu="A10G",            # enable when running real generation
    timeout=300,
    secrets=[modal.Secret.from_name("slate360-design")],  # SITE_URL, GPU_WORKER_SECRET_KEY, R2_*
)
def process_design_job(payload: dict) -> None:
    job_id = payload["jobId"]
    variant_id = payload["variantId"]
    job_type = payload.get("jobType", "preview")
    source_key = payload.get("sourceKey")

    try:
        _callback({"jobId": job_id, "status": "progress", "progressPct": 20, "stage": job_type})

        if job_type in ("preview", "mock") or os.environ.get("DESIGN_MOCK") == "1":
            # Mock: reuse the source asset as the preview.
            _callback({
                "jobId": job_id,
                "status": "completed",
                "previewKey": source_key,
                "modelFormat": payload.get("sourceFormat"),
            })
            return

        # TODO image_render: render scene -> FLUX img2img with the plan -> R2 -> previewKey
        # TODO image_to_3d:  reference photo/text -> Hunyuan3D/TripoSR -> GLB -> R2 -> outputKey
        # out_key = upload_r2(f"orgs/{payload['orgId']}/design-studio/.../{job_id}.glb", glb_bytes)
        # _callback({"jobId": job_id, "status": "completed", "outputKey": out_key, "modelFormat": "glb"})

        # Until implemented, fall back to mock so the loop never hangs.
        _callback({"jobId": job_id, "status": "completed", "previewKey": source_key})
    except Exception as exc:  # noqa: BLE001
        _callback({"jobId": job_id, "status": "failed", "errorLog": str(exc)[:500]})
        raise


@app.function(image=image)
@modal.fastapi_endpoint(method="POST", label="process")
def process(payload: dict):
    """Accept a job and run it in the background; return immediately."""
    call = process_design_job.spawn(payload)
    return {"accepted": True, "jobId": payload.get("jobId")}, 200, {"x-modal-run-id": call.object_id}
