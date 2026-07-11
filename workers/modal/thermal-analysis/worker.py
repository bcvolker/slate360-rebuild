"""
Slate360 Thermal Analysis — Modal CPU worker.

HTTP contract (POST /process):
  Request JSON: jobId, sessionId, orgId, jobType, captures[], sessionMeta?
  jobType: extract | extract_analyze | align | analyze | report | full_pipeline
    extract_analyze = decode + find problems, no report (honest "decode + find" path)
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
    .apt_install("libgl1", "libglib2.0-0", "libgomp1", "ffmpeg")
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
        "anthropic>=0.40",
    )
    # Modern Modal does not auto-mount the entrypoint's directory, so the worker's
    # sibling modules must be added explicitly or `from pipeline import ...` fails
    # at container startup (ModuleNotFoundError -> crash loop).
    .add_local_python_source("pipeline", "extract", "analyze", "report", "r2_utils", "timelapse", "panorama")
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

        if job_type in ("extract", "extract_analyze", "full_pipeline"):
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

        if job_type in ("analyze", "extract_analyze", "full_pipeline"):
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
            if job_type in ("analyze", "extract_analyze"):
                completed_payload: dict[str, Any] = {
                    "jobId": job_id,
                    "status": "completed",
                    "progressPct": 100,
                    "stage": "complete",
                    "analyzeResults": analyze_results,
                    "qualityMetrics": {
                        "critical_anomalies": _count_action_anomalies(analyze_results),
                    },
                }
                # extract_analyze also produced NPZ/previews — surface them so the
                # UI can render the freshly-decoded captures (decode + find, no report).
                if job_type == "extract_analyze":
                    completed_payload["captureResults"] = extract_results
                post_callback(completed_payload)
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


def post_motion_callback(payload: dict[str, Any]) -> None:
    site_url = os.environ["SITE_URL"].rstrip("/")
    secret = os.environ["GPU_WORKER_SECRET_KEY"]
    url = f"{site_url}/api/ops/thermal/timelapse/callback"
    raw_body = dumps_json(payload)
    headers = {
        "Content-Type": "application/json",
        "x-worker-signature": sign_callback_body(raw_body, secret),
    }
    try:
        requests.post(url, data=raw_body, headers=headers, timeout=60)
    except Exception as exc:  # noqa: BLE001 — best-effort; render already uploaded
        print(f"[motion callback] failed: {exc}")


@app.function(image=cpu_image, secrets=[worker_secret], timeout=MAX_DURATION_SECONDS)
def render_motion_job(payload: dict[str, Any]) -> None:
    import tempfile

    from r2_utils import s3_client
    from timelapse import render_motion

    job_id = payload.get("jobId")
    session_id = payload.get("sessionId")
    org_id = payload.get("orgId")
    request_index = payload.get("requestIndex")
    try:
        s3 = s3_client()
        bucket = os.environ["R2_BUCKET"]
        with tempfile.TemporaryDirectory() as td:
            result = render_motion(
                s3, bucket, str(org_id), str(session_id), str(job_id),
                payload.get("frames") or [], payload.get("settings") or {}, Path(td),
            )
        post_motion_callback({
            "jobId": job_id, "sessionId": session_id, "requestIndex": request_index,
            "status": "completed", "mp4Key": result["key"], "frames": result["frames"],
        })
    except Exception as exc:  # noqa: BLE001
        post_motion_callback({
            "jobId": job_id, "sessionId": session_id, "requestIndex": request_index,
            "status": "failed", "errorLog": str(exc)[:500],
        })


@app.function(image=cpu_image, secrets=[worker_secret])
@modal.fastapi_endpoint(method="POST", label="timelapse")
def timelapse(body: dict):
    fc = render_motion_job.spawn(body)
    return JSONResponse({"accepted": True}, headers={"x-modal-run-id": fc.object_id})


# ──────────────────────────────────────────────────────────────────────────────
# Scene-aware AI interpretation (opt-in). Looks at the image to understand the
# SCENE, then writes neutral, observation-first, scene-grounded findings. A code
# validator vetoes any cause the scene doesn't support (no "electrical" on a door).
# Numbers are authoritative from the detector; the model never invents temperatures.
# ──────────────────────────────────────────────────────────────────────────────

# Scene → allowed cause families (the validator's hard filter). Empty = neutral only.
SCENE_CAUSES: dict[str, list[str]] = {
    "building_envelope_exterior": ["air_leakage", "insulation_variation", "thermal_bridge", "moisture_pattern", "solar_loading"],
    "building_envelope_interior": ["air_leakage", "insulation_variation", "thermal_bridge", "moisture_pattern"],
    "entry_door_or_window": ["air_leakage", "weatherseal", "thermal_bridge", "solar_loading", "moisture_pattern"],
    "roof": ["moisture_pattern", "insulation_variation", "membrane_variation", "solar_loading"],
    "electrical_equipment": ["electrical_resistance", "loose_connection", "load_imbalance"],
    "mechanical_equipment": ["mechanical_friction", "bearing_condition", "airflow"],
    "pipe_or_plumbing": ["moisture_pattern", "flow_blockage", "insulation_variation"],
    "unknown": [],
}
# Inspection profile → cause families it cares about. Effective set = SCENE ∩ PROFILE
# (scene wins; profile narrows). "general" imposes no extra restriction.
PROFILE_CAUSES: dict[str, list[str] | None] = {
    "general": None,
    "building": ["air_leakage", "insulation_variation", "thermal_bridge", "moisture_pattern", "solar_loading", "weatherseal", "membrane_variation"],
    "roof": ["moisture_pattern", "insulation_variation", "membrane_variation", "solar_loading"],
    "electrical": ["electrical_resistance", "loose_connection", "load_imbalance"],
    "mechanical": ["mechanical_friction", "bearing_condition", "airflow"],
    "drone": ["moisture_pattern", "insulation_variation", "membrane_variation", "solar_loading"],
}
_INTERPRET_SYSTEM = (
    "You are assisting a thermographer. You are shown a THERMAL image (false-color: color = temperature, "
    "NOT real-world material color — never read a red region as a red object or as fire). Identify the SCENE "
    "from the structure shown. Then, for each anomaly (whose authoritative measured numbers are given as text), "
    "write a NEUTRAL, observation-first description grounded in a visible element. You may ONLY suggest causes "
    "from the scene's ALLOWED set; if none fit or you cannot anchor the anomaly to a visible element, leave "
    "suggested_causes empty. Never state a cause as fact. Never invent temperatures. Output JSON only."
)
_VLM_USD_PER_MTOK_IN = 5.0   # claude-opus-4-8 input
_VLM_USD_PER_MTOK_OUT = 25.0  # claude-opus-4-8 output


def _media_type(data: bytes) -> str:
    return "image/png" if data[:2] == b"\x89P" else "image/jpeg"


def _usage_ledger_key(org_id: str) -> str:
    from datetime import datetime, timezone
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    return f"orgs/{org_id}/thermal/ai-usage-{month}.json"


def _read_spend(s3, bucket: str, org_id: str) -> float:
    try:
        raw = s3.get_object(Bucket=bucket, Key=_usage_ledger_key(org_id))["Body"].read()
        return float(json.loads(raw).get("cost_usd", 0.0))
    except Exception:
        return 0.0


def _write_spend(s3, bucket: str, org_id: str, cost_usd: float) -> None:
    from datetime import datetime, timezone
    body = json.dumps({"cost_usd": round(cost_usd, 6), "updated_at": datetime.now(timezone.utc).isoformat()}).encode()
    try:
        s3.put_object(Bucket=bucket, Key=_usage_ledger_key(org_id), Body=body, ContentType="application/json")
    except Exception as exc:  # noqa: BLE001 — cap is best-effort; don't crash the job
        print(f"[interpret] spend ledger write failed: {exc}")


def post_interpret_callback(payload: dict[str, Any]) -> None:
    site_url = os.environ["SITE_URL"].rstrip("/")
    secret = os.environ["GPU_WORKER_SECRET_KEY"]
    url = f"{site_url}/api/ops/thermal/interpret/callback"
    raw_body = dumps_json(payload)
    headers = {"Content-Type": "application/json", "x-worker-signature": sign_callback_body(raw_body, secret)}
    resp = requests.post(url, data=raw_body, headers=headers, timeout=60)
    if resp.status_code >= 400:
        raise RuntimeError(f"Interpret callback rejected ({resp.status_code}): {resp.text[:1000]}")


def _interpret_one(client, model: str, image_bytes: bytes, anomalies: list, allowed: set[str]):
    """One Anthropic vision call + code validation for a single capture. Returns
    (scene_dict, total_in_tokens, total_out_tokens)."""
    facts = "\n".join(
        f"  anomaly[{i}]: type={a.get('type')} pattern={a.get('pattern')} "
        f"peak_C={a.get('temp_c')} deltaT_C={a.get('delta_c')} severity={a.get('severity')}"
        for i, a in enumerate(anomalies)
    )
    user = (
        "Choose scene_class from: " + ", ".join(SCENE_CAUSES.keys()) + "\n\n"
        f"ANOMALY_FACTS (authoritative; do not restate numbers as causes):\n{facts}\n\n"
        'Respond JSON only: {"scene_class":"...","scene_confidence":0-1,"visible_elements":["..."],'
        '"findings":[{"anomaly_index":int,"observation":"neutral, references a visible element",'
        '"anchored":bool,"suggested_causes":[{"label_id":"from the scene allowed set","confidence":0-1}]}]}'
    )
    msg = client.messages.create(
        model=model, max_tokens=1500, system=_INTERPRET_SYSTEM,
        messages=[{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": _media_type(image_bytes),
                                          "data": __import__("base64").b64encode(image_bytes).decode()}},
            {"type": "text", "text": user},
        ]}],
    )
    raw = "".join(b.text for b in msg.content if b.type == "text").strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1].replace("json", "", 1).strip()
    in_tok = getattr(msg.usage, "input_tokens", 0) or 0
    out_tok = getattr(msg.usage, "output_tokens", 0) or 0
    try:
        p = json.loads(raw)
    except Exception:
        return None, in_tok, out_tok
    scene = p.get("scene_class", "unknown")
    eff = set(SCENE_CAUSES.get(scene, []))
    if allowed:
        eff &= allowed
    low_conf = float(p.get("scene_confidence", 0)) < 0.55
    findings = []
    for f in p.get("findings", []):
        kept = [
            sc.get("label_id") for sc in (f.get("suggested_causes") or [])
            if (not low_conf) and f.get("anchored")
            and sc.get("label_id") in eff and float(sc.get("confidence", 0)) >= 0.45
        ]
        findings.append({
            "anomaly_index": f.get("anomaly_index"),
            "observation": str(f.get("observation") or "")[:600],
            "suggested_causes": [c for c in kept if c],
        })
    return (
        {"scene_class": scene, "scene_confidence": p.get("scene_confidence"),
         "visible_elements": (p.get("visible_elements") or [])[:8], "findings": findings},
        in_tok, out_tok,
    )


@app.function(image=cpu_image, cpu=2, memory=4096, timeout=MAX_DURATION_SECONDS, secrets=[worker_secret])
def interpret_thermal_job(payload: dict[str, Any]) -> None:
    import anthropic
    from r2_utils import s3_client

    session_id = str(payload["sessionId"])
    org_id = str(payload["orgId"])
    captures = payload.get("captures") or []
    profile = str(payload.get("profile") or "general")
    model = os.environ.get("THERMAL_VLM_MODEL", "claude-opus-4-8")
    cap_usd = float(os.environ.get("THERMAL_VLM_MONTHLY_USD_CAP", payload.get("monthlyCapUsd") or 25.0))

    bucket = os.environ["R2_BUCKET"]
    s3 = s3_client()
    profile_allowed = PROFILE_CAUSES.get(profile)
    allowed_set = set(profile_allowed) if profile_allowed else set()

    try:
        spent = _read_spend(s3, bucket, org_id)
        if spent >= cap_usd:
            post_interpret_callback({
                "sessionId": session_id, "status": "capped",
                "errorLog": f"Monthly AI budget reached (${spent:.2f} of ${cap_usd:.2f}). Raise the cap to continue.",
            })
            return

        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        results: list[dict[str, Any]] = []
        run_cost = 0.0
        for cap in captures:
            anoms = cap.get("anomalies") or []
            preview_path = cap.get("previewPath")
            if not anoms or not preview_path:
                continue
            if spent + run_cost >= cap_usd:
                break  # stop mid-batch if the cap is hit
            try:
                img_bytes = s3.get_object(Bucket=bucket, Key=preview_path)["Body"].read()
            except Exception as exc:  # noqa: BLE001
                print(f"[interpret] preview fetch failed {preview_path}: {exc}")
                continue
            scene, in_tok, out_tok = _interpret_one(client, model, img_bytes, anoms, allowed_set)
            run_cost += in_tok * _VLM_USD_PER_MTOK_IN / 1e6 + out_tok * _VLM_USD_PER_MTOK_OUT / 1e6
            if scene is not None:
                results.append({"captureId": cap.get("captureId"), **scene})

        _write_spend(s3, bucket, org_id, spent + run_cost)
        post_interpret_callback({
            "sessionId": session_id, "status": "completed", "results": results,
            "usage": {"cost_usd": round(run_cost, 4), "model": model,
                      "month_to_date_usd": round(spent + run_cost, 4), "cap_usd": cap_usd},
        })
    except Exception as exc:  # noqa: BLE001
        post_interpret_callback({"sessionId": session_id, "status": "failed",
                                 "errorLog": str(exc)[:800], "trace": traceback.format_exc()[-2000:]})
        raise


@app.function(image=cpu_image, secrets=[worker_secret])
@modal.fastapi_endpoint(method="POST", label="interpret")
def interpret(body: dict):
    fc = interpret_thermal_job.spawn(body)
    return JSONResponse({"accepted": True}, headers={"x-modal-run-id": fc.object_id})


# ──────────────────────────────────────────────────────────────────────────────
# S6.6 Analyst chat — grounded Q&A over an inspection's findings, synchronous
# (a chat turn needs to come back in the request/response cycle, unlike the
# batch interpret job above — no job row, no callback). The USD ledger cap is
# shared with interpret (same org, same month, same _read_spend/_write_spend).
# ──────────────────────────────────────────────────────────────────────────────

_CHAT_SYSTEM = (
    "You are a thermal-inspection analyst assistant helping a thermographer review ONE image's findings. "
    "You are given the image's authoritative measured facts as text (never re-derive numbers yourself). "
    "Answer questions grounded ONLY in the given facts and any attached documents — say so plainly if something "
    "isn't covered. If the user's message corrects or disputes a specific finding (e.g. 'finding 2 is X, not Y'), "
    "reply conversationally AND append, on its own line, a fenced block starting with ```revision-proposal "
    "containing exactly one JSON object {\"anomaly_index\": int, \"note\": \"revised, neutral one-sentence "
    "observation\"} — omit this block entirely when no correction is implied. Never silently rewrite a finding "
    "without this proposal block; the operator always accepts or dismisses it."
)
_CHAT_USD_PER_MTOK_IN = 5.0   # claude-opus-4-8 input (matches _VLM_USD_PER_MTOK_IN)
_CHAT_USD_PER_MTOK_OUT = 25.0


@app.function(image=cpu_image, cpu=1, memory=2048, timeout=120, secrets=[worker_secret])
@modal.fastapi_endpoint(method="POST", label="thermal-chat")
def chat(body: dict):
    import anthropic
    from r2_utils import s3_client

    org_id = str(body.get("orgId") or "")
    grounding = str(body.get("groundingContext") or "")
    history = body.get("history") or []
    message = str(body.get("message") or "")
    model = os.environ.get("THERMAL_VLM_MODEL", "claude-opus-4-8")
    cap_usd = float(os.environ.get("THERMAL_VLM_MONTHLY_USD_CAP", body.get("monthlyCapUsd") or 25.0))

    if not message.strip():
        return JSONResponse({"error": "message is required"}, status_code=400)

    try:
        bucket = os.environ["R2_BUCKET"]
        s3 = s3_client()
        spent = _read_spend(s3, bucket, org_id) if org_id else 0.0
        if org_id and spent >= cap_usd:
            return JSONResponse(
                {"error": f"Monthly AI budget reached (${spent:.2f} of ${cap_usd:.2f}). Raise the cap to continue."},
                status_code=402,
            )

        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        messages = [{"role": m.get("role"), "content": str(m.get("content") or "")} for m in history if m.get("role") in ("user", "assistant")]
        messages.append({"role": "user", "content": f"INSPECTION FACTS:\n{grounding}\n\nQUESTION: {message}"})
        msg = client.messages.create(model=model, max_tokens=800, system=_CHAT_SYSTEM, messages=messages)
        reply = "".join(b.text for b in msg.content if b.type == "text").strip()
        in_tok = getattr(msg.usage, "input_tokens", 0) or 0
        out_tok = getattr(msg.usage, "output_tokens", 0) or 0
        cost = in_tok * _CHAT_USD_PER_MTOK_IN / 1e6 + out_tok * _CHAT_USD_PER_MTOK_OUT / 1e6
        if org_id:
            _write_spend(s3, bucket, org_id, spent + cost)
        return JSONResponse({"reply": reply, "usage": {"cost_usd": round(cost, 4), "model": model}})
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"error": str(exc)[:500]}, status_code=500)


# ──────────────────────────────────────────────────────────────────────────────
# PAN — panorama stitching. Async job (spawn+callback, no thermal_processing_jobs
# row — same "session-metadata-tracked request" pattern the timelapse job uses,
# since the job_type CHECK constraint is DDL-gated per the R1 doc note).
# ──────────────────────────────────────────────────────────────────────────────


def post_panorama_callback(payload: dict[str, Any]) -> None:
    site_url = os.environ["SITE_URL"].rstrip("/")
    secret = os.environ["GPU_WORKER_SECRET_KEY"]
    url = f"{site_url}/api/ops/thermal/panorama/callback"
    raw_body = dumps_json(payload)
    headers = {"Content-Type": "application/json", "x-worker-signature": sign_callback_body(raw_body, secret)}
    resp = requests.post(url, data=raw_body, headers=headers, timeout=60)
    if resp.status_code >= 400:
        raise RuntimeError(f"Panorama callback rejected ({resp.status_code}): {resp.text[:1000]}")


@app.function(image=cpu_image, cpu=4, memory=8192, timeout=MAX_DURATION_SECONDS, secrets=[worker_secret])
def stitch_panorama_job(payload: dict[str, Any]) -> None:
    import tempfile
    import uuid

    import numpy as np

    from extract import false_color_preview
    from panorama import stitch_panorama_grids
    from pipeline import processed_keys
    from r2_utils import download_object, s3_client, upload_file

    session_id = str(payload["sessionId"])
    org_id = str(payload["orgId"])
    request_index = payload.get("requestIndex")
    sources = payload.get("captures") or []  # [{captureId, npzDataPath, filename}]
    new_capture_id = str(uuid.uuid4())

    try:
        s3 = s3_client()
        bucket = os.environ["R2_BUCKET"]
        if len(sources) < 2:
            raise ValueError("Panorama needs at least 2 source images")

        with tempfile.TemporaryDirectory() as td:
            work_dir = Path(td)
            temps_list = []
            for src in sources:
                local = work_dir / f"{src['captureId']}.npz"
                download_object(s3, bucket, str(src["npzDataPath"]), str(local))
                temps_list.append(np.load(local)["temperatures"].astype(np.float32))

            stitched = stitch_panorama_grids(temps_list)

            npz_key, preview_key, _quality_key = processed_keys(org_id, session_id, new_capture_id)
            local_npz = work_dir / f"{new_capture_id}.npz"
            local_preview = work_dir / f"{new_capture_id}.jpg"
            np.savez_compressed(local_npz, temperatures=stitched)
            false_color_preview(stitched, local_preview)
            upload_file(s3, bucket, str(local_npz), npz_key, "application/octet-stream")
            upload_file(s3, bucket, str(local_preview), preview_key, "image/jpeg")

        filenames = [str(s.get("filename") or s["captureId"]) for s in sources]
        post_panorama_callback({
            "sessionId": session_id,
            "requestIndex": request_index,
            "status": "completed",
            "capture": {
                "id": new_capture_id,
                "filename": f"panorama-{len(sources)}-frames.jpg",
                "npzDataPath": npz_key,
                "previewPath": preview_key,
                "storagePath": preview_key,
                "minC": round(float(np.min(stitched)), 2),
                "maxC": round(float(np.max(stitched)), 2),
                "sourceCaptureIds": [s["captureId"] for s in sources],
                "sourceFilenames": filenames,
            },
        })
    except Exception as exc:  # noqa: BLE001
        post_panorama_callback({
            "sessionId": session_id, "requestIndex": request_index,
            "status": "failed", "errorLog": str(exc)[:500],
        })


@app.function(image=cpu_image, secrets=[worker_secret])
@modal.fastapi_endpoint(method="POST", label="panorama")
def panorama_endpoint(body: dict):
    fc = stitch_panorama_job.spawn(body)
    return JSONResponse({"accepted": True}, headers={"x-modal-run-id": fc.object_id})
