"""Ingest validation for the metric processor. Fail clearly; never guess."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from arkit_io import iter_depth_records, load_pose_frames, load_poses_document, scale_intrinsics
from constants import MIN_CONFIDENCE, PREVIEW_PLY_ROLE, TIMESTAMP_TOLERANCE_S


class IngestError(ValueError):
    """A capture that must not be reconstructed until the operator fixes the inputs."""


def _require_intrinsics(frame: dict[str, Any], index: int) -> dict[str, float]:
    k = frame.get("intrinsics")
    if not isinstance(k, dict):
        raise IngestError(f"pose frame {index} is missing intrinsics")
    for key in ("fx", "fy", "cx", "cy"):
        try:
            value = float(k[key])
        except (KeyError, TypeError, ValueError) as exc:
            raise IngestError(f"pose frame {index} intrinsics.{key} is missing or invalid") from exc
        if not (value > 0) and key in ("fx", "fy"):
            raise IngestError(f"pose frame {index} intrinsics.{key} must be positive")
        if key in ("cx", "cy") and value < 0:
            raise IngestError(f"pose frame {index} intrinsics.{key} is negative")
    return {key: float(k[key]) for key in ("fx", "fy", "cx", "cy")}


def _clip_ids(doc: dict[str, Any], frames: list[dict[str, Any]]) -> dict[str, Any]:
    clip_indexes = sorted({int(f["clip_index"]) for f in frames if f.get("clip_index") is not None})
    clips = doc.get("clips") if isinstance(doc.get("clips"), list) else []
    declared = sorted({int(c["index"]) for c in clips if isinstance(c, dict) and c.get("index") is not None})
    if declared and clip_indexes and set(clip_indexes) - set(declared):
        raise IngestError(
            f"ARKit clip_index {clip_indexes} does not match poses.clips {declared}"
        )
    return {
        "poseVersion": doc.get("version"),
        "clipIndexes": clip_indexes,
        "declaredClips": declared,
        "sessionStartTime": doc.get("session_start_time"),
        "sessionStartArTimestamp": doc.get("session_start_ar_timestamp"),
    }


def inspect_preview_ply(path: str | Path | None) -> dict[str, Any]:
    """Record that a preview PLY exists. Never load it as reconstruction truth."""
    if not path:
        return {"present": False, "role": PREVIEW_PLY_ROLE, "usedAsMaster": False}
    ply = Path(path)
    return {
        "present": ply.is_file(),
        "path": str(ply) if ply.exists() else None,
        "bytes": ply.stat().st_size if ply.is_file() else 0,
        "role": PREVIEW_PLY_ROLE,
        "usedAsMaster": False,
        "note": "preview_point_cloud.ply is display-only; metric reconstruction uses .s360depth + c2w keyframes",
    }


def validate_ingest(
    depth_path: str | Path,
    poses_path: str | Path,
    *,
    preview_ply: str | Path | None = None,
    tolerance_s: float = TIMESTAMP_TOLERANCE_S,
) -> dict[str, Any]:
    depth_path = Path(depth_path)
    poses_path = Path(poses_path)
    if not depth_path.is_file():
        raise IngestError(f"missing required .s360depth: {depth_path}")
    if not poses_path.is_file():
        raise IngestError(f"missing required lidar_poses.json: {poses_path}")

    try:
        records = list(iter_depth_records(depth_path))
    except ValueError as exc:
        raise IngestError(str(exc)) from exc
    if not records:
        raise IngestError("S360DEPTH1 stream contains zero frames")

    doc = load_poses_document(poses_path)
    frames = load_pose_frames(poses_path)
    if not frames:
        raise IngestError("lidar_poses.json has no usable 4x4 keyframes")

    widths = {r["width"] for r in records}
    heights = {r["height"] for r in records}
    if len(widths) != 1 or len(heights) != 1:
        raise IngestError(f"depth dimensions are not uniform: {sorted(widths)} x {sorted(heights)}")
    depth_w, depth_h = records[0]["width"], records[0]["height"]

    pose_wh = {(int(f.get("w") or 0), int(f.get("h") or 0)) for f in frames}
    if any(w <= 0 or h <= 0 for w, h in pose_wh):
        raise IngestError("pose frames are missing RGB width/height")

    for i, frame in enumerate(frames):
        k = _require_intrinsics(frame, i)
        w, h = int(frame["w"]), int(frame["h"])
        fx, fy, cx, cy = scale_intrinsics(k, w, h, depth_w, depth_h)
        if not (0 < cx < depth_w and 0 < cy < depth_h):
            raise IngestError(
                f"scaled principal point ({cx:.1f},{cy:.1f}) is outside depth {depth_w}x{depth_h}"
            )
        if fx <= 0 or fy <= 0:
            raise IngestError(f"pose frame {i} scaled focal length is not positive")

    identity = _clip_ids(doc, frames)

    dts: list[float] = []
    if len(records) != len(frames):
        raise IngestError(
            f"frame/pose count mismatch: depth={len(records)} poses={len(frames)}. "
            "Refusing to guess pairing for a metric reconstruction."
        )
    for rec, frame in zip(records, frames):
        dt = abs(float(rec["timestamp"]) - float(frame.get("timestamp") or 0.0))
        dts.append(dt)
        if dt > tolerance_s:
            raise IngestError(
                f"timestamp mismatch at index {rec['index']}: depth={rec['timestamp']} "
                f"pose={frame.get('timestamp')} dt={dt:.4f}s (max {tolerance_s}s)"
            )

    conf_hist = {0: 0, 1: 0, 2: 0, "other": 0}
    medium_or_better = 0
    for rec in records:
        conf = rec["confidence"]
        for value, count in zip(*_bincount(conf)):
            if value in (0, 1, 2):
                conf_hist[int(value)] += int(count)
            else:
                conf_hist["other"] += int(count)
        medium_or_better += int((conf >= MIN_CONFIDENCE).sum())
    if medium_or_better == 0:
        raise IngestError("no pixels at ARKit confidence >= medium")

    return {
        "ok": True,
        "magic": "S360DEPTH1",
        "depthFrames": len(records),
        "poseFrames": len(frames),
        "pairs": len(records),
        "depthSize": [depth_w, depth_h],
        "rgbSize": sorted(pose_wh),
        "timestampDtMaxS": max(dts) if dts else 0.0,
        "timestampDtMeanS": (sum(dts) / len(dts)) if dts else 0.0,
        "confidenceHistogram": conf_hist,
        "mediumOrBetterPixels": medium_or_better,
        "arkit": identity,
        "preview": inspect_preview_ply(preview_ply),
        "processingMaster": [".s360depth", "lidar_poses.json"],
    }


def _bincount(conf):
    import numpy as np

    flat = np.asarray(conf).reshape(-1)
    counts = np.bincount(flat, minlength=3)
    values = list(range(len(counts)))
    return values, counts.tolist()
