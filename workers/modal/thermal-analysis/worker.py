"""
Slate360 Thermal Analysis — Modal CPU worker.

HTTP contract (POST /process):
  Request JSON: jobId, sessionId, orgId, jobType, captures[], sessionMeta?
  jobType: extract | align | analyze | report | full_pipeline
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import traceback
from pathlib import Path
from typing import Any

import modal
import requests
from fastapi.responses import JSONResponse

from pipeline import (
    build_report_bundle,
    process_capture_analyze,
    process_capture_align,
    process_capture_extract,
)

APP_NAME = "slate360-thermal-analysis"
SECRET_NAME = "slate360-thermal-worker"
WEB_ENDPOINT_LABEL = "process"
MAX_DURATION_SECONDS = 3600

app = modal.App(APP_NAME)
worker_secret = modal.Secret.from_name(SECRET_NAME)

cpu_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1", "libglib2.0-0", "libgomp1")
    .run_commands(
        "apt-get update",
        "apt-get install -y libimage-exiftool-perl",
        "exiftool -ver",
    )
    .pip_install(
        "fastapi[standard]==0.115.6",
        "boto3==1.35.99",
        "numpy==2.1.3",
        "opencv-python-headless==4.10.0.84",
        "pillow==11.0.0",
        "matplotlib==3.9.2",
        "reportlab==4.2.5",
        "requests==2.32.3",
    )
)


def dumps_json(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sign_callback_body(raw_body: bytes, secret: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def post_callback(payload: dict[str, Any]) -> None:
    site_url = os.environ["SITE_URL"].rstrip("/")
    secret = os.environ["GPU_WORKER_SECRET_KEY"]
    url = f"{site_url}/api/ops/thermal/jobs/callback"
    raw_body = dumps_json(payload)
    headers = {
        "Content-Type": "application/json",
        "x-worker-signature": sign_callback_body(raw_body, secret),
    }
    resp = requests.post(url, data=raw_body, headers=headers, timeout=60)
    if resp.status_code >= 400:
        raise RuntimeError(f"Callback rejected ({resp.status_code}): {resp.text[:2000]}")


def _count_action_anomalies(results: list[dict[str, Any]]) -> int:
    total = 0
    for row in results:
        for anomaly in row.get("anomalies") or []:
            if anomaly.get("severity") == "action":
                total += 1
    return total


@app.function(
    image=cpu_image,
    cpu=4,
    memory=8192,
    timeout=MAX_DURATION_SECONDS,
    secrets=[worker_secret],
)
def process_thermal_job(payload: dict[str, Any]) -> None:
    from r2_utils import s3_client

    job_id = str(payload["jobId"])
    session_id = str(payload["sessionId"])
    org_id = str(payload["orgId"])
    job_type = str(payload.get("jobType") or "extract")
    captures = payload.get("captures") or []
    session_meta = payload.get("sessionMeta") or {"name": "Thermal Session"}
    analysis_params = session_meta.get("analysis_params") if isinstance(session_meta, dict) else None

    if not captures:
        post_callback({"jobId": job_id, "status": "failed", "errorLog": "No captures provided"})
        return

    bucket = os.environ["R2_BUCKET"]
    s3 = s3_client()
    work_dir = Path(f"/tmp/thermal/{job_id}")
    work_dir.mkdir(parents=True, exist_ok=True)

    try:
        extract_results: list[dict[str, Any]] = []
        analyze_results: list[dict[str, Any]] = []

        if job_type in ("extract", "full_pipeline"):
            post_callback({"jobId": job_id, "status": "progress", "progressPct": 10, "stage": "extract"})
            total = len(captures)
            for index, capture in enumerate(captures, start=1):
                extract_results.append(
                    process_capture_extract(s3, bucket, org_id, session_id, capture, work_dir)
                )
                post_callback(
                    {
                        "jobId": job_id,
                        "status": "progress",
                        "progressPct": 10 + int(35 * index / max(total, 1)),
                        "stage": f"extract_{index}_of_{total}",
                    }
                )
            if job_type == "extract":
                post_callback(
                    {
                        "jobId": job_id,
                        "status": "completed",
                        "progressPct": 100,
                        "stage": "complete",
                        "captureResults": extract_results,
                    }
                )
                return

            analyze_captures = [
                {
                    "captureId": row["captureId"],
                    "npzDataPath": row.get("npzDataPath"),
                    "previewPath": row.get("previewPath"),
                    "filename": next(
                        (c.get("filename") for c in captures if c.get("captureId") == row["captureId"]),
                        None,
                    ),
                }
                for row in extract_results
                if row.get("npzDataPath")
            ]
            captures = analyze_captures

        if job_type in ("analyze", "full_pipeline"):
            post_callback({"jobId": job_id, "status": "progress", "progressPct": 50, "stage": "analyze"})
            total = len(captures)
            for index, capture in enumerate(captures, start=1):
                analyze_results.append(
                    process_capture_analyze(s3, bucket, org_id, session_id, capture, work_dir, analysis_params)
                )
                post_callback(
                    {
                        "jobId": job_id,
                        "status": "progress",
                        "progressPct": 50 + int(30 * index / max(total, 1)),
                        "stage": f"analyze_{index}_of_{total}",
                    }
                )
            if job_type == "analyze":
                post_callback(
                    {
                        "jobId": job_id,
                        "status": "completed",
                        "progressPct": 100,
                        "stage": "complete",
                        "analyzeResults": analyze_results,
                        "qualityMetrics": {
                            "critical_anomalies": _count_action_anomalies(analyze_results),
                        },
                    }
                )
                return

            report_captures = []
            for capture in captures:
                match = next((r for r in analyze_results if r["captureId"] == capture["captureId"]), None)
                report_captures.append({**capture, "anomalies": (match or {}).get("anomalies") or []})
            captures = report_captures

        align_results: list[dict[str, Any]] = []
        if job_type in ("align", "full_pipeline"):
            post_callback({"jobId": job_id, "status": "progress", "progressPct": 70, "stage": "align"})
            total = len(captures)
            linked = session_meta.get("linked_space_id")
            for index, capture in enumerate(captures, start=1):
                align_results.append(
                    process_capture_align(s3, bucket, org_id, session_id, capture, work_dir, linked)
                )
                post_callback(
                    {
                        "jobId": job_id,
                        "status": "progress",
                        "progressPct": 70 + int(15 * index / max(total, 1)),
                        "stage": f"align_{index}_of_{total}",
                    }
                )
            if job_type == "align":
                post_callback(
                    {
                        "jobId": job_id,
                        "status": "completed",
                        "progressPct": 100,
                        "stage": "complete",
                        "alignResults": align_results,
                    }
                )
                return

            # for full_pipeline, attach to captures for report
            for capture in captures:
                match = next((r for r in align_results if r["captureId"] == capture["captureId"]), None)
                if match:
                    capture["alignManifest"] = match.get("alignManifest")
                    capture["alignmentQuality"] = (match.get("qualityMetrics") or {}).get("alignment_quality")

        if job_type in ("report", "full_pipeline"):
            post_callback({"jobId": job_id, "status": "progress", "progressPct": 85, "stage": "report"})
            report_output = build_report_bundle(
                s3, bucket, org_id, session_id, job_id, session_meta, captures, work_dir
            )
            completed_payload: dict[str, Any] = {
                "jobId": job_id,
                "status": "completed",
                "progressPct": 100,
                "stage": "complete",
                "reportOutput": report_output,
                "qualityMetrics": {
                    **(session_meta.get("summary") or {}),
                    "critical_anomalies": _count_action_anomalies(analyze_results),
                },
            }
            if job_type == "full_pipeline":
                completed_payload["captureResults"] = extract_results
                completed_payload["analyzeResults"] = analyze_results
                completed_payload["alignResults"] = align_results
            post_callback(completed_payload)
            return

        post_callback({"jobId": job_id, "status": "failed", "errorLog": f"Unsupported jobType: {job_type}"})
    except Exception as exc:
        post_callback(
            {
                "jobId": job_id,
                "status": "failed",
                "errorLog": str(exc),
                "trace": traceback.format_exc()[-4000:],
            }
        )
        raise


@app.function(image=cpu_image, secrets=[worker_secret])
@modal.fastapi_endpoint(method="POST", label=WEB_ENDPOINT_LABEL)
def process(body: dict):
    fc = process_thermal_job.spawn(body)
    return JSONResponse({"accepted": True}, headers={"x-modal-run-id": fc.object_id})
