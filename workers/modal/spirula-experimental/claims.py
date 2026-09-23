"""One paid trainer per experiment. A callback never starts another."""

from __future__ import annotations

from storage import ACTIVE_KEY, started_key

TERMINAL = ("completed", "failed", "cancelled")


def claim_experiment(try_lock, release, experiment_id: str) -> dict:
    if not try_lock(ACTIVE_KEY, experiment_id.encode("utf-8")):
        return {"claimed": False, "spawn": False, "reason": "gpu busy"}
    if not try_lock(started_key(experiment_id), b"1"):
        release(ACTIVE_KEY)
        return {"claimed": False, "spawn": False, "reason": "experiment already started"}
    return {"claimed": True, "spawn": True, "reason": "claimed"}


def callback_effect(current_status: str | None) -> dict:
    """Record a terminal callback. Never spawn a trainer."""
    if current_status in TERMINAL:
        return {"spawn": False, "idempotent": True, "update": False}
    return {"spawn": False, "idempotent": False, "update": True}


class MemoryLocks:
    def __init__(self) -> None:
        self.held: dict[str, bytes] = {}

    def try_lock(self, key: str, body: bytes) -> bool:
        if key in self.held:
            return False
        self.held[key] = body
        return True

    def release(self, key: str) -> None:
        self.held.pop(key, None)
