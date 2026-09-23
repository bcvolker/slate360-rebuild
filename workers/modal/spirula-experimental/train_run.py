"""Subprocess wrapper. Kills the train if it runs past twice the estimate."""

from __future__ import annotations

import subprocess
import time
from collections.abc import Callable
from pathlib import Path


class TrainOverrun(RuntimeError):
    pass


def run_command(cmd: list[str], log_path: Path, expected_seconds: float, on_line: Callable[[str], None] | None = None) -> int:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    start = time.time()
    limit = expected_seconds * 2
    with log_path.open("w", encoding="utf-8") as log:
        log.write("command: " + " ".join(cmd) + "\n")
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        assert proc.stdout is not None
        for line in proc.stdout:
            log.write(line)
            log.flush()
            if on_line:
                on_line(line.rstrip())
            if time.time() - start > limit:
                proc.kill()
                proc.wait(timeout=10)
                raise TrainOverrun(f"runtime exceeded {limit:.0f}s (2x expected)")
        code = proc.wait()
    return code
