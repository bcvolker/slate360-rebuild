"""ns-train wrapper: skip pin_memory copies and clamp densify pause.

Nerfstudio's FullImageDatamanager calls tensor.pin_memory() after caching
every training image. That duplicates the cache. 7712×1280 uint8 is already
~35 GB; the pin copy SIGKILLs WSL at 64 GB (job 91b7d4bd, exit -9).

Splatfacto also sets gsplat DefaultStrategy.pause_refine_after_reset to
num_train_images + refine_every. Densify only runs when
`step % reset_every >= pause`. reset_every is 3000, so any job with more
than ~2900 views (backyard is 7712) never splits. TensorBoard on both
backyard trains stayed at 383,657 gaussians for every logged step.
"""
from __future__ import annotations

import sys

import torch

_PAUSE_CAP = 250

_ORIG_PIN = torch.Tensor.pin_memory
_SKIP_BYTES = 256 * 1024


def _pin_memory(self, *args, **kwargs):  # noqa: ANN001
    if self.numel() * self.element_size() >= _SKIP_BYTES:
        return self
    return _ORIG_PIN(self, *args, **kwargs)


torch.Tensor.pin_memory = _pin_memory  # type: ignore[method-assign]


def _clamp_densify_pause() -> None:
    from gsplat.strategy.default import DefaultStrategy

    orig = DefaultStrategy.__init__

    def wrapped(self, *args, **kwargs):  # noqa: ANN001
        pause = kwargs.get("pause_refine_after_reset")
        requested = pause if isinstance(pause, (int, float)) else None
        if isinstance(pause, (int, float)) and pause > _PAUSE_CAP:
            kwargs["pause_refine_after_reset"] = _PAUSE_CAP
        effective = kwargs.get("pause_refine_after_reset", requested)
        _write_pause_status(requested, effective)
        return orig(self, *args, **kwargs)

    DefaultStrategy.__init__ = wrapped  # type: ignore[method-assign]


def _write_pause_status(requested, effective) -> None:
    import json
    import os
    from pathlib import Path

    dest = os.environ.get("SPLAT_LAB_WRAP_STATUS_PATH")
    if not dest:
        return
    payload = {
        "requested_pause_refine_after_reset": requested,
        "effective_pause_refine_after_reset": effective,
        "pause_clamped": (
            requested is not None and effective is not None and int(requested) != int(effective)
        ),
        "pause_cap": _PAUSE_CAP,
    }
    path = Path(dest)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


_clamp_densify_pause()


def _apply_exp3_patch_if_requested() -> None:
    """Room 213 Experiment 3 only (SPLAT_LAB_EXP3=1): corrected gsplat 1.5.3 opacity-reset
    predicate (upstream PR #776 equivalent), warm-up accumulator clear, hard population guard.
    Lab jobs never set the variable and are unaffected. See recon-experiment/exp3_strategy_patch.py."""
    import os
    from pathlib import Path

    if os.environ.get("SPLAT_LAB_EXP3") != "1":
        return
    here = Path(__file__).resolve()
    for candidate in (Path("/root/recon-experiment"), here.parents[2] / "recon-experiment"):
        if (candidate / "exp3_strategy_patch.py").is_file() and str(candidate) not in sys.path:
            sys.path.insert(0, str(candidate))
    import exp3_strategy_patch

    exp3_strategy_patch.apply(status_dir=os.environ.get("EXP3_STATUS_DIR"))


_apply_exp3_patch_if_requested()


def _apply_exp6_instrumentation_if_requested() -> None:
    import os
    from pathlib import Path

    if not (os.environ.get("SPLAT_LAB_EXP6_LATE_PRUNE_STEP", "").strip()
            or os.environ.get("SPLAT_LAB_EXP6_SCALE_TRACK_STEPS", "").strip()):
        return
    here = Path(__file__).resolve()
    for candidate in (Path("/root/recon-experiment"), here.parents[2] / "recon-experiment"):
        if (candidate / "exp6_instrumentation.py").is_file() and str(candidate) not in sys.path:
            sys.path.insert(0, str(candidate))
    import exp6_instrumentation  # noqa: F401 -- applies itself on import, see module docstring


_apply_exp6_instrumentation_if_requested()

from nerfstudio.scripts.train import entrypoint  # noqa: E402

if __name__ == "__main__":
    sys.argv[0] = "ns-train"
    entrypoint()
