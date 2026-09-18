#!/usr/bin/env python3
"""One-command laptop/cloud preflight for Room 213 Experiment 3.

Makes NO reconstruction changes and invokes NO GPU training. Verifies, in order:
  1. this is the expected git branch/HEAD (advisory only — never blocks)
  2. Modal CLI is installed and authenticated
  3. the canonical Room 213 input artifact exists on the Modal volume and its
     portable content hashes match the committed recipe (dispatches the tiny
     CPU-only `verify-exp3-inputs` Modal phase — no GPU, no training)
  4. the Experiment 3 frozen recipe exists and carries the portable hash correction
  5. Arm C / Arm D resolved diff is `ok=true` with only `densify_grad_thresh` differing

Usage (from the repo root, on any machine with `modal` installed and authenticated):
    python workers/recon-experiment/laptop_preflight.py

Prints `LAPTOP_CLOUD_PIPELINE_READY` and exits 0 on success. On any failure, prints
`LAPTOP_CLOUD_PIPELINE_BLOCKED: <exact blocker>` and exits 1.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RECON = Path(__file__).resolve().parent
WORKER = REPO_ROOT / "workers" / "modal" / "recon-experiment" / "worker.py"
EXPECTED_BRANCH = "feature/recon-controlled-experiment-v1"

sys.path.insert(0, str(RECON))


class Blocked(Exception):
    pass


def _run(cmd: list[str], timeout: int = 60) -> str:
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError as exc:
        raise Blocked(f"command not found: {cmd[0]} ({exc})") from exc
    except subprocess.TimeoutExpired as exc:
        raise Blocked(f"command timed out after {timeout}s: {' '.join(cmd)}") from exc
    if proc.returncode != 0:
        raise Blocked(f"`{' '.join(cmd)}` exited {proc.returncode}: {(proc.stderr or proc.stdout).strip()[:600]}")
    return proc.stdout


def check_git_state() -> dict:
    try:
        branch = _run(["git", "-C", str(REPO_ROOT), "branch", "--show-current"]).strip()
        head = _run(["git", "-C", str(REPO_ROOT), "rev-parse", "HEAD"]).strip()
    except Blocked as exc:
        return {"ok": False, "advisory_only": True, "detail": str(exc)}
    ok = branch == EXPECTED_BRANCH
    return {"ok": ok, "advisory_only": True, "branch": branch, "head": head,
             "expected_branch": EXPECTED_BRANCH,
             "detail": None if ok else f"on branch {branch!r}, expected {EXPECTED_BRANCH!r} (not a hard blocker)"}


def check_modal_auth() -> dict:
    out = _run(["modal", "profile", "current"], timeout=30).strip()
    if not out:
        raise Blocked("`modal profile current` returned nothing — not authenticated")
    return {"ok": True, "profile": out}


def _extract_json_object(text: str) -> dict:
    """Modal CLI output is `<build/run chrome><one JSON object><more CLI chrome>`.
    Find the first '{' and read forward tracking brace depth (respecting quoted
    strings) so trailing lines like "Stopping app - ..." never get swept into the
    parse — a naive "first '{' to end of output" slice fails on that trailing text."""
    start = text.find("{")
    if start == -1:
        raise Blocked(f"could not find JSON result in Modal output: {text[-600:]}")
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                blob = text[start : i + 1]
                try:
                    return json.loads(blob)
                except json.JSONDecodeError as exc:
                    raise Blocked(f"could not parse Modal output as JSON: {exc}; blob tail: {blob[-600:]}") from exc
    raise Blocked(f"unterminated JSON object in Modal output: {text[-600:]}")


def check_cloud_inputs() -> dict:
    """Dispatches the CPU-only `verify-exp3-inputs` phase: real verify_inputs(),
    zero GPU, seconds of runtime, no training."""
    out = _run(["modal", "run", str(WORKER), "--phase", "verify-exp3-inputs"], timeout=180)
    result = _extract_json_object(out)
    if not result.get("ok"):
        raise Blocked(f"verify_inputs() failed on Modal: {result.get('error')}")
    return {"ok": True, "identity": result.get("identity")}


def check_recipe_and_diff() -> dict:
    recipe_path = REPO_ROOT / "qa" / "exp3-frozen-recipe.json"
    if not recipe_path.is_file():
        raise Blocked(f"missing {recipe_path}")
    doc = json.loads(recipe_path.read_text(encoding="utf-8"))
    correction = doc.get("hash_correction")
    if not correction or not correction.get("new_mask_hash"):
        raise Blocked("qa/exp3-frozen-recipe.json has no hash_correction record — "
                       "recipe predates the portable-hash fix; regenerate it "
                       "(see docs/ops/RECON_LAPTOP_CLOUD_OPERATIONS.md)")
    import exp3

    recipe = doc["recipe"]
    cfg_c = exp3.resolved_arm_config(exp3.ARM_C, recipe)
    cfg_d = exp3.resolved_arm_config(exp3.ARM_D, recipe)
    diff = exp3.preflight_diff(cfg_c, cfg_d)
    if not diff["ok"]:
        raise Blocked(f"Arm C/D resolved diff is not ok=true: differing keys {diff['differing_keys']}")
    return {"ok": True, "recipe_hash": doc.get("recipe_hash"),
            "mask_hash_portable": recipe.get("mask_hash"), "diff": diff}


def main() -> int:
    report: dict = {}
    try:
        report["git"] = check_git_state()  # advisory only, never raises
        report["modal_auth"] = check_modal_auth()
        report["cloud_inputs"] = check_cloud_inputs()
        report["recipe_and_diff"] = check_recipe_and_diff()
    except Blocked as exc:
        report["blocked_on"] = str(exc)
        print(json.dumps(report, indent=2, default=str))
        print(f"LAPTOP_CLOUD_PIPELINE_BLOCKED: {exc}")
        return 1
    print(json.dumps(report, indent=2, default=str))
    print("LAPTOP_CLOUD_PIPELINE_READY")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
