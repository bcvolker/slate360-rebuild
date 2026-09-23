"""Experiment status. Terminal states are the only ones a retry may leave."""

from __future__ import annotations

STATUSES = (
    "queued",
    "preparing",
    "validating",
    "training",
    "exporting",
    "evaluating",
    "completed",
    "failed",
    "cancelled",
)
ACTIVE = ("preparing", "validating", "training", "exporting", "evaluating")
TERMINAL = ("completed", "failed", "cancelled")

_NEXT = {
    "queued": {"preparing", "failed", "cancelled"},
    "preparing": {"validating", "failed", "cancelled"},
    "validating": {"training", "failed", "cancelled"},
    "training": {"exporting", "failed", "cancelled"},
    "exporting": {"evaluating", "failed", "cancelled"},
    "evaluating": {"completed", "failed", "cancelled"},
    "completed": set(),
    "failed": {"queued"},
    "cancelled": set(),
}


class StatusError(RuntimeError):
    pass


def transition(current: str, nxt: str) -> str:
    if current not in _NEXT or nxt not in _NEXT[current]:
        raise StatusError(f"illegal status {current} -> {nxt}")
    return nxt
