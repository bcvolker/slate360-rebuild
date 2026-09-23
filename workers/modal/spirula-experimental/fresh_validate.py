"""Re-read spirula-smoke-v2 from R2 into an empty directory. Does not train."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from acceptance import AcceptRejected, accept_attempt, historical_checklist
from storage import client, download_prefix

ATTEMPT = "spirula-smoke-v2"
PREFIX = f"experimental/spirula/{ATTEMPT}"


def _load_env() -> None:
    env_path = Path(r"C:\s360\.env.local")
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def main() -> int:
    _load_env()
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp) / ATTEMPT
        remote = download_prefix(client(), PREFIX, root)
        report = historical_checklist(root, remote, ATTEMPT)
        strict = None
        try:
            strict = accept_attempt(root, -11, remote)
        except AcceptRejected as exc:
            strict = {"accepted": False, "reason": str(exc)}
        printable = {key: value for key, value in report.items() if key != "remoteSha256"}
        printable["strictAcceptance"] = strict
        printable["remoteSha256"] = report["remoteSha256"]
        print(json.dumps(printable, indent=2))
        required = (
            report["attemptOwnsOutputs"]
            and report["datasetMatchesManifest"]
            and report["logTerminalStep"] == 6
            and report["resumed"]
            and report["checkpointMatchesTerminalStep"]
            and report["ply"]["gaussianCount"] >= 1
            and not report["integrityMismatches"]
        )
        return 0 if required else 1


if __name__ == "__main__":
    raise SystemExit(main())
