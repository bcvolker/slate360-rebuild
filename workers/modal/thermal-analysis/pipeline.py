"""Thermal job orchestration helpers for Modal worker."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any

import numpy as np

from analyze import analyze_temperature_array, segment_materials_sam_stub
from extract import (
    build_quality_metrics,
    extract_raw_matrix,
    false_color_preview,
    run_exiftool_json,
)
from report import build_html_report, build_pdf_report, encode_preview_file
from r2_utils import download_object, upload_file


def processed_keys(org_id: str, session_id: str, capture_id: str) -> tuple[str, str, str]:
    base = f"orgs/{org_id}/thermal/{session_id}/processed/{capture_id}"
    return (
        f"{base}/radiometric.npz",
        f"{base}/false_color.jpg",
        f"{base}/quality.json",
    )


def report_keys(org_id: str, session_id: str, job_id: str) -> tuple[str, str]:
    base = f"orgs/{org_id}/thermal/{session_id}/reports/{job_id}"
    return f"{base}/report.pdf", f"{base}/report.html"


def process_capture_extract(
    s3,
    bucket: str,
    org_id: str,
    session_id: str,
    capture: dict[str, Any],
    work_dir: Path,
) -> dict[str, Any]:
    capture_id = str(capture["captureId"])
    storage_path = str(capture["storagePath"])
    filename = str(capture.get("filename") or "capture.jpg")

    local_input = work_dir / f"{capture_id}_{filename}"
    download_object(s3, bucket, storage_path, str(local_input))

    meta = run_exiftool_json(local_input)
    temp_array, extract_meta = extract_raw_matrix(local_input, meta)
    quality = build_quality_metrics(temp_array, meta, extract_meta)

    if temp_array is None:
        return {
            "captureId": capture_id,
            "qualityMetrics": quality,
            "sensorProfile": extract_meta,
            "error": extract_meta.get("error", "Extraction failed"),
        }

    npz_key, preview_key, quality_key = processed_keys(org_id, session_id, capture_id)
    local_npz = work_dir / f"{capture_id}.npz"
    local_preview = work_dir / f"{capture_id}.jpg"
    local_quality = work_dir / f"{capture_id}.json"

    np.savez_compressed(local_npz, temperatures=temp_array)
    false_color_preview(temp_array, local_preview)
    local_quality.write_text(json.dumps({"quality": quality, "extract": extract_meta}, indent=2))

    upload_file(s3, bucket, str(local_npz), npz_key, "application/octet-stream")
    upload_file(s3, bucket, str(local_preview), preview_key, "image/jpeg")
    upload_file(s3, bucket, str(local_quality), quality_key, "application/json")

    return {
        "captureId": capture_id,
        "npzDataPath": npz_key,
        "previewPath": preview_key,
        "qualityMetrics": quality,
        "sensorProfile": extract_meta,
    }


def process_capture_analyze(
    s3,
    bucket: str,
    org_id: str,
    session_id: str,
    capture: dict[str, Any],
    work_dir: Path,
    analysis_params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    capture_id = str(capture["captureId"])
    npz_key = str(capture.get("npzDataPath") or "")
    if not npz_key:
        return {"captureId": capture_id, "error": "Missing NPZ path for analysis", "anomalies": []}

    local_npz = work_dir / f"{capture_id}_analyze.npz"
    download_object(s3, bucket, npz_key, str(local_npz))
    data = np.load(local_npz)
    temp = data["temperatures"]
    anomalies = analyze_temperature_array(temp, analysis_params)
    material_segments = segment_materials_sam_stub(temp)

    return {
        "captureId": capture_id,
        "anomalies": anomalies,
        "qualityMetrics": {
            "anomaly_count": len(anomalies),
            "action_count": sum(1 for a in anomalies if a.get("severity") == "action"),
            "material_segments": material_segments,
        },
    }


def _measure_spots(
    s3, bucket: str, capture: dict[str, Any], work_dir: Path
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Sample calibrated NPZ temperatures at the operator's placed spots and derive
    Δ values vs the first (reference) spot — the FLIR Sp/Dt measurement table."""
    meta = capture.get("metadata") or {}
    spots = meta.get("spots") or []
    npz_key = capture.get("npzDataPath")
    if not spots or not npz_key:
        return [], []
    try:
        local = work_dir / f"{capture['captureId']}_spots.npz"
        download_object(s3, bucket, str(npz_key), str(local))
        temp = np.load(local)["temperatures"]
        h, w = temp.shape[0], temp.shape[1]
    except Exception:
        return [], []

    measured: list[dict[str, Any]] = []
    for i, s in enumerate(spots, start=1):
        try:
            x = int(round(float(s.get("x", 0))))
            y = int(round(float(s.get("y", 0))))
        except (TypeError, ValueError):
            continue
        x = max(0, min(w - 1, x))
        y = max(0, min(h - 1, y))
        measured.append({"label": f"Sp{i}", "temp_c": float(temp[y][x])})

    deltas: list[dict[str, Any]] = []
    if len(measured) >= 2:
        ref = measured[0]
        for m in measured[1:]:
            deltas.append({
                "label": f"Dt{len(deltas) + 1}",
                "a": m["label"],
                "b": ref["label"],
                "value_c": m["temp_c"] - ref["temp_c"],
            })
    return measured, deltas


def build_report_bundle(
    s3,
    bucket: str,
    org_id: str,
    session_id: str,
    job_id: str,
    session_meta: dict[str, Any],
    captures: list[dict[str, Any]],
    work_dir: Path,
) -> dict[str, Any]:
    report_captures: list[dict[str, Any]] = []
    for capture in captures:
        preview_path = capture.get("previewPath")
        local_preview = None
        preview_b64 = None
        if preview_path:
            local_preview = work_dir / f"{capture['captureId']}_report.jpg"
            download_object(s3, bucket, str(preview_path), str(local_preview))
            preview_b64 = encode_preview_file(local_preview)
        spots_measured, deltas_measured = _measure_spots(s3, bucket, capture, work_dir)
        report_captures.append(
            {
                "captureId": capture.get("captureId"),
                "filename": capture.get("filename"),
                "anomalies": capture.get("anomalies") or [],
                "preview_b64": preview_b64,
                "qualityMetrics": capture.get("qualityMetrics") or {},
                "gps": capture.get("gps") or {},
                "metadata": capture.get("metadata") or {},
                "spots_measured": spots_measured,
                "deltas_measured": deltas_measured,
            }
        )

    pdf_key, html_key = report_keys(org_id, session_id, job_id)
    local_pdf = work_dir / "report.pdf"
    local_html = work_dir / "report.html"

    build_pdf_report(session_meta, report_captures, local_pdf)
    local_html.write_text(build_html_report(session_meta, report_captures), encoding="utf-8")

    upload_file(s3, bucket, str(local_pdf), pdf_key, "application/pdf")
    upload_file(s3, bucket, str(local_html), html_key, "text/html; charset=utf-8")

    template = session_meta.get("report_template") or {}
    template_name = template.get("name") or "Executive Summary"
    return {
        "title": f"{session_meta.get('name') or 'Thermal Inspection'} — {template_name}",
        "pdfKey": pdf_key,
        "htmlKey": html_key,
        "templateId": template.get("id") or "executive_one_pager",
    }


def process_capture_align(
    s3,
    bucket: str,
    org_id: str,
    session_id: str,
    capture: dict[str, Any],
    work_dir: Path,
    linked_space_id: str | None = None,
) -> dict[str, Any]:
    """Basic align stub for thermal to twin.
    Uses GPS if available for approximate; full COLMAP + LiDAR is advanced Slice 3.
    Creates a simple manifest for overlay toggle.
    """
    capture_id = str(capture["captureId"])
    gps = capture.get("gps") or capture.get("gps_position") or capture.get("gpsPosition") or {}
    manifest = {
        "captureId": capture_id,
        "method": "gps_approximate" if gps else "none",
        "quality": "approximate" if gps else "none",
        "linked_space_id": linked_space_id,
        "note": "Stub alignment. Full COLMAP pose + LiDAR prior alignment (Slice 3) will produce per-pixel thermal overlay on the Gaussian splat.",
        "gps": gps,
    }
    align_key = f"orgs/{org_id}/thermal/{session_id}/aligned/{capture_id}/manifest.json"
    local_manifest = work_dir / f"{capture_id}_align.json"
    local_manifest.write_text(json.dumps(manifest, indent=2))
    upload_file(s3, bucket, str(local_manifest), align_key, "application/json")

    return {
        "captureId": capture_id,
        "alignManifest": align_key,
        "qualityMetrics": {"alignment_quality": manifest["quality"]},
    }
