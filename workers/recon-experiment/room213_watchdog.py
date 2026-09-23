"""Room 213 unattended policy. The scheduled Modal function only applies this.

Infrastructure failures may be relaunched at most three times for the same
signature. A deterministic error is not relaunched; seeing it again halts.
Stage-1 starts once, and only when the frozen gates say TRAINING READY.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

STALE_S = 12 * 60
INFRA_LIMIT = 3
IN_PROGRESS = {
    "starting",
    "preflight_verify",
    "preflight_demux",
    "preflight_charuco",
    "masks",
    "faces",
    "sfm_extract",
    "sfm_match",
    "sfm_map",
    "sfm_rig",
    "scale",
    "splits",
    "loader",
    "dataset",
    "gates",
    "training",
    "evaluation",
}
INFRA_MARKERS = (
    "preempt",
    "timeout",
    "timed out",
    "worker lost",
    "connection reset",
    "unavailable",
    "capacity",
    "sigkill",
    "oom",
    "reclaim",
    "transport",
    "cancelled",
    "canceled",
)


def _parse_ts(value: str | None) -> datetime | None:
    if not value:
        return None
    text = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def external_cpu_build_running(apps: list[dict[str, Any]]) -> bool:
    """True when a detached/ephemeral recon-experiment app still has tasks.

    The deployed app's own watchdog tick is not counted. Callers pass the
    deployed function's own running-input count separately.
    """
    for app in apps:
        name = str(app.get("description") or "")
        if "recon-experiment" not in name:
            continue
        state = str(app.get("state") or "")
        if state in {"detached", "ephemeral", "initializing"} and int(app.get("n_running_tasks") or 0) > 0:
            return True
    return False


def _fresh(status: dict[str, Any] | None, now: datetime) -> bool:
    if not status:
        return False
    stamp = _parse_ts(status.get("timestamp_utc"))
    if stamp is None:
        return False
    return (now - stamp).total_seconds() <= STALE_S


def _deterministic(status: dict[str, Any] | None) -> str | None:
    if not status:
        return None
    stage = str(status.get("stage") or "")
    error = str(status.get("last_error") or "")
    if stage not in {"failed", "halted", "training_failed"}:
        return None
    low = error.lower()
    if any(marker in low for marker in INFRA_MARKERS):
        return None
    return error or stage


def decide(
    *,
    status: dict[str, Any] | None,
    verdict: dict[str, Any] | None,
    now: datetime,
    build_running: bool,
    stage1_running: bool,
    external_build_running: bool,
    external_check_ok: bool,
    stage1_summary_exists: bool,
    state: dict[str, Any] | None,
) -> dict[str, Any]:
    state = dict(state or {})
    counts = dict(state.get("infra_counts") or {})
    state["infra_counts"] = counts
    if state.get("halted"):
        return {"action": "halt", "reason": state.get("halt_reason"), "state": state}
    if not external_check_ok:
        return {"action": "wait", "reason": "cannot see whether the current CPU run is still alive", "state": state}
    if external_build_running or build_running:
        return {"action": "wait", "reason": "build already running", "state": state}
    if stage1_running:
        return {"action": "wait", "reason": "stage1 already running", "state": state}

    ready = (verdict or {}).get("dataset") == "TRAINING READY"
    if ready:
        if state.get("stage1_launched") or stage1_summary_exists:
            return {"action": "wait", "reason": "stage1 already authorized", "state": state}
        state["stage1_launched"] = True
        return {"action": "launch_stage1", "reason": "TRAINING READY", "state": state}

    signature = _deterministic(status)
    if signature:
        if state.get("deterministic_error") == signature:
            state["halted"] = True
            state["halt_reason"] = signature
            return {"action": "halt", "reason": signature, "state": state}
        state["deterministic_error"] = signature
        state["halted"] = True
        state["halt_reason"] = signature
        return {"action": "halt", "reason": signature, "state": state}

    if (verdict or {}).get("dataset") == "BLOCKED" or (status or {}).get("stage") == "finished":
        return {"action": "wait", "reason": "build finished without TRAINING READY", "state": state}

    stage = str((status or {}).get("stage") or "")
    stale_running = stage in IN_PROGRESS and not _fresh(status, now)
    if stale_running:
        sig = f"stale:{stage}"
        seen = int(counts.get(sig) or 0)
        if seen >= INFRA_LIMIT:
            state["halted"] = True
            state["halt_reason"] = f"{sig} repeated {seen} times"
            return {"action": "halt", "reason": state["halt_reason"], "state": state}
        counts[sig] = seen + 1
        return {"action": "launch_build", "reason": sig, "state": state}

    if status is None and not state.get("uncommitted_replacement_used"):
        state["uncommitted_replacement_used"] = True
        return {"action": "launch_build", "reason": "replace the uncommitted CPU run once", "state": state}
    return {"action": "wait", "reason": "nothing to launch", "state": state}
