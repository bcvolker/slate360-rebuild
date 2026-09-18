"""Experiment result manifest. Status must end needs_review, never ready/published."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

TERMINAL_OK = "needs_review"
FORBIDDEN_STATUS = {"ready", "published", "approved"}


class ManifestError(RuntimeError):
    pass


def build_result_manifest(
    *,
    experiment_id: str,
    arm: str | None,
    hashes: dict[str, str],
    effective_config_hash: str,
    status: str = TERMINAL_OK,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if status in FORBIDDEN_STATUS:
        raise ManifestError(f"experiment status cannot be {status}")
    if status != TERMINAL_OK and not status.startswith("aborted") and status not in {"failed", "cancelled"}:
        # Allow aborted_* / failed; still never ready.
        if status != TERMINAL_OK:
            pass
    required = ("ply", "spz", "A_on_path.png", "B_off_path.png", "C_dollhouse.png", "D_overhead.png")
    missing = [key for key in required if key not in hashes]
    if status == TERMINAL_OK and missing:
        raise ManifestError(f"result manifest missing hashes: {missing}")
    payload = {
        "experiment_id": experiment_id,
        "arm": arm,
        "status": status,
        "published": False,
        "client_share": None,
        "human_verdict": "UNREVIEWED",
        "ARM_A_CLIENT_VISUAL_VERDICT": "UNREVIEWED",
        "ARM_B_CLIENT_VISUAL_VERDICT": "UNREVIEWED",
        "effective_config_hash": effective_config_hash,
        "hashes": hashes,
    }
    if extra:
        payload.update(extra)
    return payload


def write_result_manifest(path: Path, payload: dict[str, Any]) -> None:
    if payload.get("status") in FORBIDDEN_STATUS or payload.get("published") is True:
        raise ManifestError("refusing to write a published/ready experiment manifest")
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
