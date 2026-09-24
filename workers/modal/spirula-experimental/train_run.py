"""Trainer subprocess with a runtime limit that does NOT depend on the process writing anything.

stdout/stderr go straight to a file; the parent polls the process and the wall clock every `poll_s` seconds.
On a limit (or a hook's stop request, or a hook exception) the whole process group gets SIGINT, then SIGKILL after
`grace_s`. NOTE: `spirula train` saves nothing on SIGINT; recovery uses the periodic durable checkpoints only."""

from __future__ import annotations

import os
import signal
import subprocess
import time
from collections.abc import Callable
from pathlib import Path


class TrainOverrun(RuntimeError):
    pass


def run_trainer(cmd: list[str], log_path: Path, limit_s: float, *, env: dict | None = None,
                on_poll: Callable[[float], str | None] | None = None, poll_s: float = 5.0,
                grace_s: float = 90.0, cwd: str | None = None) -> dict:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    start = time.monotonic()
    stop_reason = None
    with log_path.open("w", encoding="utf-8") as log:
        log.write("command: " + " ".join(cmd) + "\n"); log.flush()
        proc = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT, env=env, cwd=cwd, start_new_session=True)
        while proc.poll() is None:
            time.sleep(poll_s)
            elapsed = time.monotonic() - start
            if stop_reason is None and elapsed > limit_s:
                stop_reason = f"runtime limit {limit_s:.0f}s exceeded"
            if stop_reason is None and on_poll is not None:
                try:
                    stop_reason = on_poll(elapsed)
                except Exception as exc:  # noqa: BLE001 - a failing hook must never leave a trainer running
                    stop_reason = f"poll hook failed: {type(exc).__name__}: {str(exc)[:200]}"
            if stop_reason is not None:
                _stop(proc, grace_s)
                break
        code = proc.wait()
    return {"exitCode": code, "elapsedS": round(time.monotonic() - start, 1), "stopReason": stop_reason}


def _stop(proc: subprocess.Popen, grace_s: float) -> None:
    try:
        os.killpg(proc.pid, signal.SIGINT)
    except ProcessLookupError:
        return
    t = time.monotonic()
    while proc.poll() is None and time.monotonic() - t < grace_s:
        time.sleep(1)
    if proc.poll() is None:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
