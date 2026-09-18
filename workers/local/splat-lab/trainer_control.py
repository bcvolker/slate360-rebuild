"""Truthful splatfacto schedule / cap / checkpoint helpers.

DefaultStrategy has no Gaussian cap. stop-split-at is an absolute global step.
ns-train --max-num-iterations is additional-on-resume (Lab evidence 8fb02e4e).
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

CKPT_RE = re.compile(r"step-(\d+)\.ckpt$")
ACTUAL_IMAGES_PER_OPTIMIZER_STEP = 1
ACTUAL_BATCH_EVIDENCE = (
    "splatfacto FullImageDatamanager samples one full image per optimizer step; "
    "_train_cmd does not pass a datamanager batch size; images_per_step is planning-only"
)
DEFAULT_STRATEGY_CAP = "unsupported"
PAUSE_CAP = 250


class UnsupportedSplatCap(ValueError):
    """Raised when a splat cap is requested for DefaultStrategy."""


def resolve_cap_contract(
    *,
    strategy: str,
    max_splats_millions: float,
    view_count: int,
    auto_cap: int | None = None,
) -> dict[str, Any]:
    """Return what the trainer will actually do. Never invent an enforced cap."""
    strategy = (strategy or "default").lower()
    requested = float(max_splats_millions or 0.0)
    if strategy in {"default", ""}:
        if requested > 0:
            raise UnsupportedSplatCap(
                "DefaultStrategy does not enforce a Gaussian cap "
                f"(requested {requested:g}M). Refuse the setting or use MCMC cap_max."
            )
        return {
            "mode": DEFAULT_STRATEGY_CAP,
            "enforced": False,
            "requested_millions": requested,
            "legacy_auto_formula": auto_cap,
            "note": "auto views*500 is planning metadata only and is not passed to the trainer",
        }
    if strategy == "mcmc":
        limit = int(requested * 1_000_000) if requested > 0 else auto_cap
        return {
            "mode": "mcmc_cap_max",
            "enforced": True,
            "limit": limit,
            "requested_millions": requested,
        }
    raise UnsupportedSplatCap(f"unknown strategy {strategy!r}")


def resolve_train_schedule(
    *,
    steps: int,
    already: int,
    refine_stop_iter: int | None = None,
    env_stop_split_at: int = 0,
) -> dict[str, Any]:
    """Build CLI values with absolute refinement and remainder iteration count."""
    already = max(0, int(already or 0))
    steps = int(steps)
    run_iters = steps if already <= 0 else max(1, steps - already)
    if refine_stop_iter is not None and int(refine_stop_iter) > 0:
        split_until = int(refine_stop_iter)
        split_source = "refine_stop_iter"
    elif env_stop_split_at > 0:
        split_until = int(env_stop_split_at)
        split_source = "SPLAT_LAB_STOP_SPLIT_AT"
    else:
        split_until = max(1, round(steps * 0.85))
        split_source = "steps_times_0.85"
    return {
        "requested_absolute_max_step": steps,
        "loaded_absolute_step": already,
        "cli_max_num_iterations": run_iters,
        "max_num_iterations_semantics": "additional_on_resume",
        "requested_refine_stop_iter": refine_stop_iter,
        "effective_refine_stop_iter": split_until,
        "stop_split_at_absolute": split_until,
        "stop_split_source": split_source,
        "actual_images_per_optimizer_step": ACTUAL_IMAGES_PER_OPTIMIZER_STEP,
        "actual_images_per_optimizer_step_evidence": ACTUAL_BATCH_EVIDENCE,
    }


def parse_ckpt_step(path: Path) -> int | None:
    m = CKPT_RE.search(Path(path).name)
    if not m:
        return None
    return int(m.group(1))


def select_checkpoint(
    root: Path,
    identity: dict[str, Any] | None = None,
) -> Path | None:
    """Pick the highest validated absolute step. Never sort by mtime."""
    root = Path(root)
    if not root.exists():
        return None
    candidates: list[tuple[int, Path]] = []
    for ckpt in root.rglob("step-*.ckpt"):
        step = parse_ckpt_step(ckpt)
        if step is None:
            continue
        if identity is not None and not checkpoint_identity_matches(ckpt, identity, step):
            continue
        if not checkpoint_readable(ckpt):
            continue
        candidates.append((step, ckpt))
    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0])
    return candidates[-1][1]


def checkpoint_identity_path(ckpt: Path) -> Path:
    return Path(ckpt).with_suffix(ckpt.suffix + ".identity.json")


def write_checkpoint_identity(ckpt: Path, identity: dict[str, Any]) -> None:
    payload = dict(identity)
    payload["absolute_step"] = parse_ckpt_step(ckpt)
    payload["ckpt_name"] = Path(ckpt).name
    dest = checkpoint_identity_path(ckpt)
    tmp = dest.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(tmp, dest)


def checkpoint_identity_matches(ckpt: Path, identity: dict[str, Any], step: int) -> bool:
    path = checkpoint_identity_path(ckpt)
    if not path.is_file():
        return False
    try:
        got = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    keys = ("job_id", "source_hash", "pose_hash", "mask_hash", "recipe_hash")
    for key in keys:
        if identity.get(key) != got.get(key):
            return False
    return int(got.get("absolute_step") or -1) == int(step)


def checkpoint_readable(ckpt: Path) -> bool:
    try:
        return Path(ckpt).is_file() and Path(ckpt).stat().st_size > 64
    except OSError:
        return False


def wrap_pause_effective(requested: int | float | None) -> dict[str, Any]:
    if requested is None:
        return {
            "requested_pause_refine_after_reset": None,
            "effective_pause_refine_after_reset": None,
            "pause_clamped": False,
        }
    req = int(requested)
    effective = min(req, PAUSE_CAP) if req > PAUSE_CAP else req
    return {
        "requested_pause_refine_after_reset": req,
        "effective_pause_refine_after_reset": effective,
        "pause_clamped": effective != req,
        "pause_cap": PAUSE_CAP,
    }
