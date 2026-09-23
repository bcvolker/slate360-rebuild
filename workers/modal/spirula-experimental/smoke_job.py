"""Train, park the checkpoint, restore it, resume. The binary is injected."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
from pathlib import Path

from lifecycle import transition
from package_validate import sha256_file
from pin import SPIRULA_SHA
from ply_validate import inspect_ply
from preview import render_centers
from train_command import argv, smoke_overrides
from train_run import run_command


def _status(path: Path, current: str, nxt: str, hook=None, **extra) -> str:
    current = transition(current, nxt)
    body = {"status": current, "trainerSha": SPIRULA_SHA, **extra}
    path.write_text(json.dumps(body, indent=2), encoding="utf-8")
    if hook is not None:
        try:
            hook(path)
        except Exception as exc:  # noqa: BLE001 — status upload must not abort training
            print(f"status publish failed: {exc}")
    return current


def _write_attempt(work: Path, data: Path, command: list[str], terminal: int) -> None:
    manifest = json.loads((data / "manifest.json").read_text(encoding="utf-8"))
    lines = [f"{item['path']}:{sha256_file(data / item['path'])}" for item in manifest["files"]]
    body = {
        "experimentId": manifest["experimentId"],
        "configSha256": hashlib.sha256(" ".join(command).encode("utf-8")).hexdigest(),
        "datasetSha256": hashlib.sha256("\n".join(sorted(lines)).encode("utf-8")).hexdigest(),
        "terminalStep": terminal,
    }
    (work / "attempt.json").write_text(json.dumps(body, indent=2), encoding="utf-8")


def _training_finished(code: int, log: Path, out: Path) -> bool:
    if code == 0:
        return True
    text = log.read_text(encoding="utf-8", errors="replace") if log.is_file() else ""
    return "Training complete" in text and any(out.glob("step-*.ckpt"))


def _master_ply(out: Path) -> Path:
    ply = out / "splat.ply"
    if ply.is_file():
        return ply
    nested = sorted(out.glob("step-*.ckpt/splat.ply"))
    if not nested:
        raise RuntimeError("resume did not write splat.ply")
    shutil.copyfile(nested[-1], ply)
    return ply


def _latest_ckpt(out: Path) -> Path:
    found = sorted(out.glob("step-*.ckpt"))
    if not found:
        raise RuntimeError(f"no checkpoint under {out}")
    return found[-1]


def execute(work: Path, command_prefix: list[str], expected_seconds: float, on_status=None) -> dict:
    os.chdir(work)
    data = work / "dataset"
    out_name = "smoke"
    out = work / "outputs" / out_name
    persistent = work / "persistent"
    logs = work / "logs"
    status_path = work / "status.json"
    state = "queued"

    def mark(current: str, nxt: str, **extra) -> str:
        return _status(status_path, current, nxt, hook=on_status, **extra)

    state = mark(state, "preparing")
    state = mark(state, "validating")
    first = command_prefix + argv(str(data), out_name, None, {**smoke_overrides(), "num_iterations": 4, "steps_per_save": 2})[1:]
    state = mark(state, "training", command=first)
    code = run_command(first, logs / "train.log", expected_seconds)
    if not _training_finished(code, logs / "train.log", out):
        mark(state, "failed", returncode=code)
        raise RuntimeError(f"train exited {code}")
    ckpt = _latest_ckpt(out)
    if persistent.exists():
        shutil.rmtree(persistent)
    shutil.copytree(out, persistent)
    shutil.rmtree(out)
    if out.exists():
        raise RuntimeError("local output survived deletion")
    shutil.copytree(persistent, out)
    restored = _latest_ckpt(out)
    second = command_prefix + argv(str(data), out_name, str(out), {**smoke_overrides(), "num_iterations": 6, "steps_per_save": 2})[1:]
    _write_attempt(work, data, second, 6)
    code = run_command(second, logs / "resume.log", expected_seconds)
    if not _training_finished(code, logs / "resume.log", out):
        mark(state, "failed", returncode=code)
        raise RuntimeError(f"resume exited {code}")
    if "--resume" not in (logs / "resume.log").read_text(encoding="utf-8"):
        raise RuntimeError("resume log does not record the resume command")
    try:
        ply = _master_ply(out)
        ply_report = inspect_ply(ply, max_count=50_000_000)
    except Exception as exc:
        mark(state, "failed", error=str(exc))
        raise
    state = mark(state, "exporting", ply=ply_report, shutdownExit=code)
    state = mark(state, "evaluating")
    preview = render_centers(data, ply, work / "preview.png")
    if code != 0:
        return {
            "status": "pending-acceptance",
            "exitCode": code,
            "ply": str(ply),
            "preview": preview,
            "checkpoint": restored.name,
        }
    state = mark(
        state,
        "completed",
        checkpoint=restored.name,
        parkedFrom=ckpt.name,
        preview=preview,
        exitCode=0,
    )
    return {"status": state, "exitCode": 0, "ply": str(ply), "preview": preview, "checkpoint": restored.name}
