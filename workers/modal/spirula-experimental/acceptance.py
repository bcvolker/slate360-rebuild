"""SIGSEGV may be accepted only after a fresh storage read matches this attempt."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from package_validate import sha256_file
from ply_validate import inspect_ply

STEP_LINE = re.compile(r"step\s+(\d+)/\1\b")


class AcceptRejected(RuntimeError):
    pass


def _sha256_bytes(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def dataset_signature(dataset: Path) -> str:
    manifest = json.loads((dataset / "manifest.json").read_text(encoding="utf-8"))
    lines = []
    for item in manifest["files"]:
        rel = item["path"].replace("\\", "/")
        digest = sha256_file(dataset / rel)
        if digest != item["sha256"]:
            raise AcceptRejected(f"dataset file {rel} does not match the manifest")
        lines.append(f"{rel}:{digest}")
    return _sha256_bytes("\n".join(sorted(lines)).encode("utf-8"))


def _crash_text(log: str) -> str:
    marker = "=== Spirula Studio crash report ==="
    if marker not in log:
        return ""
    return log[log.index(marker):].strip()


def _terminal_step(log: str) -> int | None:
    found = [int(match.group(1)) for match in STEP_LINE.finditer(log)]
    return found[-1] if found else None


def accept_attempt(root: Path, exit_code: int, remote_sha256: dict[str, str]) -> dict:
    """Read only `root`, which must be a fresh storage download."""
    if not remote_sha256:
        raise AcceptRejected("acceptance requires hashes from a storage read")
    attempt_path = root / "attempt.json"
    if not attempt_path.is_file():
        raise AcceptRejected("attempt.json is missing")
    attempt = json.loads(attempt_path.read_text(encoding="utf-8"))
    validation = json.loads((root / "validation.json").read_text(encoding="utf-8"))
    attempt_id = str(attempt.get("experimentId") or "")
    if not attempt_id or attempt_id != validation.get("experimentId"):
        raise AcceptRejected("attempt id does not own these outputs")
    dataset_hash = dataset_signature(root / "dataset")
    if dataset_hash != attempt.get("datasetSha256"):
        raise AcceptRejected("dataset hash does not match this attempt")
    log_path = root / "logs" / "resume.log"
    if not log_path.is_file():
        log_path = root / "logs" / "train.log"
    log = log_path.read_text(encoding="utf-8", errors="replace")
    command = ""
    for line in log.splitlines():
        if line.startswith("command:"):
            command = line.split(":", 1)[1].strip()
            break
    config_hash = _sha256_bytes(command.encode("utf-8"))
    if config_hash != attempt.get("configSha256"):
        raise AcceptRejected("resolved config hash does not match this attempt")
    requested = int(attempt["terminalStep"])
    observed = _terminal_step(log)
    if observed != requested:
        raise AcceptRejected(f"log terminal step {observed} != requested {requested}")
    ckpt = root / "outputs" / "smoke" / f"step-{requested:09d}.ckpt"
    if not (ckpt / "state.tar").is_file() and not (ckpt / "state.txt").is_file():
        raise AcceptRejected("final checkpoint does not correspond to the terminal step")
    ply = root / "outputs" / "smoke" / "splat.ply"
    ply_report = inspect_ply(ply, max_count=50_000_000)
    crash = _crash_text(log)
    if exit_code != 0 and "SIGSEGV" not in crash and "crash report" not in crash:
        raise AcceptRejected("non-zero exit has no crash diagnostics")
    mismatches = []
    for rel, digest in sorted(remote_sha256.items()):
        path = root / rel
        if not path.is_file() or sha256_file(path) != digest:
            mismatches.append(rel)
    if mismatches:
        raise AcceptRejected(f"storage integrity mismatch: {mismatches}")
    return {
        "accepted": True,
        "experimentId": attempt_id,
        "exitCode": exit_code,
        "crash": crash,
        "terminalStep": requested,
        "configSha256": config_hash,
        "datasetSha256": dataset_hash,
        "ply": ply_report,
        "source": "storage-read",
    }


def historical_checklist(root: Path, remote_sha256: dict[str, str], attempt_id: str) -> dict:
    """What a fresh download of an already-finished smoke can prove."""
    validation = json.loads((root / "validation.json").read_text(encoding="utf-8"))
    resume = (root / "logs" / "resume.log").read_text(encoding="utf-8", errors="replace")
    dataset_ok = True
    dataset_error = ""
    try:
        dataset_signature(root / "dataset")
    except AcceptRejected as exc:
        dataset_ok = False
        dataset_error = str(exc)
    ply = root / "outputs" / "smoke" / "splat.ply"
    ply_report = inspect_ply(ply, max_count=50_000_000)
    step = _terminal_step(resume)
    ckpt = root / "outputs" / "smoke" / f"step-{step:09d}.ckpt" if step else None
    integrity = [
        rel for rel, digest in remote_sha256.items()
        if not (root / rel).is_file() or sha256_file(root / rel) != digest
    ]
    return {
        "attemptOwnsOutputs": validation.get("experimentId") == attempt_id,
        "datasetMatchesManifest": dataset_ok,
        "datasetError": dataset_error,
        "logTerminalStep": step,
        "resumed": "Resumed from" in resume and "--resume" in resume,
        "checkpointMatchesTerminalStep": bool(ckpt and (ckpt / "state.tar").is_file()),
        "ply": ply_report,
        "crash": _crash_text(resume),
        "integrityMismatches": integrity,
        "attemptJsonPresent": (root / "attempt.json").is_file(),
        "objectCount": len(remote_sha256),
        "remoteSha256": remote_sha256,
    }
