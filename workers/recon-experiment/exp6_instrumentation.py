"""Experiment 6 runtime instrumentation: read-only scale/population snapshots at fixed
steps (both arms) and, for L6 only, one optimizer-aware, scale-only prune fired exactly
once, entirely outside gsplat's own refine/grow/prune cycle.

Renamed and extended from exp6_late_prune_patch.py after the launch-approval revision that
added matched step-16000 (and 18000/19999) instrumentation. The prune mechanism itself is
byte-for-byte the same as before: gsplat.strategy.ops.remove() (the identical function
DefaultStrategy._prune_gs already uses internally), called once, so Adam's exp_avg/exp_avg_sq
moment buffers are correctly sliced for every removed Gaussian, not just the raw parameter
tensors. Does NOT touch DefaultStrategy, does NOT reactivate refine_stop_iter,
stop_screen_size_at, or any other strategy behavior -- those stay governed by the unmodified
exp3_strategy_patch (gated by SPLAT_LAB_EXP3=1, unchanged).

Two independent, additive env-gated mechanisms, both wrapping the SAME
SplatfactoModel.step_post_backward hook (model level, called every step *after*
DefaultStrategy.step_post_backward has already run and already returned early because
step >= refine_stop_iter):

  SPLAT_LAB_EXP6_SCALE_TRACK_STEPS  -- comma-separated step numbers. At each one, for BOTH
                                        K6 and L6 (same value, set identically for both --
                                        this is instrumentation, not a treatment), computes
                                        and logs scale/population statistics. READ-ONLY:
                                        wrapped in torch.no_grad(), never writes to
                                        gauss_params, optimizers, or strategy_state, and
                                        never removes anything. Verified inert on model
                                        state by construction, not just by claim -- see the
                                        assertion at the end of _snapshot().

  SPLAT_LAB_EXP6_LATE_PRUNE_STEP    -- single step number, L6 only. At that step: logs a
                                        "pre_prune" snapshot (same stats function as above,
                                        still read-only), THEN performs the one prune via
                                        ops.remove(), THEN logs a "post_prune" snapshot
                                        (same stats function again, now genuinely different
                                        because the prune already ran) plus n_removed/
                                        pct_removed. This is the only step at which this
                                        module ever mutates model/optimizer state.

Every snapshot (track or prune-paired) is printed as one line, `EXP6_SCALE_SNAPSHOT
{json}`, and appended to SPLAT_LAB_WRAP_STATUS_PATH if set -- both arms produce comparable,
parseable records with no post-hoc GPU dispatch required to recover them.

Applied only when at least one of the two env vars above is set; every Experiment 3/4/5 job,
and any future job that sets neither, is completely unaffected.
"""
from __future__ import annotations

import json
import os


def _parse_steps(raw: str) -> set[int]:
    return {int(s) for s in raw.split(",") if s.strip()}


def _apply_exp6_instrumentation_if_requested() -> None:
    track_raw = os.environ.get("SPLAT_LAB_EXP6_SCALE_TRACK_STEPS", "").strip()
    prune_raw = os.environ.get("SPLAT_LAB_EXP6_LATE_PRUNE_STEP", "").strip()
    if not track_raw and not prune_raw:
        return

    track_steps = _parse_steps(track_raw) if track_raw else set()
    prune_step = int(prune_raw) if prune_raw else None
    threshold = float(os.environ.get("SPLAT_LAB_EXP6_LATE_PRUNE_THRESH", "0.08"))
    status_path = os.environ.get("SPLAT_LAB_WRAP_STATUS_PATH")

    import numpy as np
    import torch
    from gsplat.strategy.ops import remove
    from nerfstudio.models.splatfacto import SplatfactoModel

    orig_step_post_backward = SplatfactoModel.step_post_backward
    pruned = {"done": False}

    def _emit(record: dict) -> None:
        print("EXP6_SCALE_SNAPSHOT " + json.dumps(record), flush=True)
        if status_path:
            try:
                with open(status_path, "a", encoding="utf-8") as f:
                    f.write(json.dumps({"exp6_scale_snapshot": record}) + "\n")
            except OSError:
                pass

    def _snapshot(self, step: int, phase: str) -> dict:
        """Read-only: no_grad, only ever reads gauss_params["scales"], never assigns to
        it or to any optimizer/state object. Returns the stats dict; does not mutate."""
        before_ptr = self.gauss_params["scales"].data_ptr()
        with torch.no_grad():
            max_scale = torch.exp(self.gauss_params["scales"]).max(dim=-1).values
            n = int(max_scale.shape[0])
            arr = max_scale.detach().cpu().numpy()
        # Assert this call did not touch the live parameter tensor's storage.
        assert self.gauss_params["scales"].data_ptr() == before_ptr, (
            "EXP6 instrumentation bug: _snapshot must never mutate gauss_params"
        )
        stats = {
            "step": step, "phase": phase, "total_gaussian_count": n,
            "count_above_0.08": int((arr > 0.08).sum()),
            "count_above_0.10": int((arr > 0.10).sum()),
            "count_above_0.15": int((arr > 0.15).sum()),
            "p99": float(np.percentile(arr, 99)),
            "p99.5": float(np.percentile(arr, 99.5)),
            "p99.9": float(np.percentile(arr, 99.9)),
            "max_scale": float(arr.max()),
        }
        return stats

    def wrapped(self, step):
        orig_step_post_backward(self, step)

        if step in track_steps:
            # Generic snapshot, identical mechanism for K6 and L6, no removal. For L6 at
            # the prune step this fires in addition to the paired pre/post record below
            # (redundant, intentionally so -- an independent cross-check of the same
            # pre-prune state from a separately-triggered code path).
            _emit(_snapshot(self, step, "track"))

        if prune_step is not None and not pruned["done"] and step == prune_step:
            pruned["done"] = True
            pre = _snapshot(self, step, "pre_prune")
            _emit(pre)
            with torch.no_grad():
                max_scale = torch.exp(self.gauss_params["scales"]).max(dim=-1).values
                mask = max_scale > threshold
                n_removed = int(mask.sum().item())
                remove(
                    params=self.gauss_params,
                    optimizers=self.optimizers,
                    state=self.strategy_state,
                    mask=mask,
                )
            post = _snapshot(self, step, "post_prune")
            post["threshold"] = threshold
            post["n_removed"] = n_removed
            post["pct_removed"] = round(100.0 * n_removed / max(1, pre["total_gaussian_count"]), 4)
            assert post["total_gaussian_count"] == pre["total_gaussian_count"] - n_removed
            _emit(post)

    SplatfactoModel.step_post_backward = wrapped
    print(f"EXP6_INSTRUMENTATION_ARMED track_steps={sorted(track_steps)} "
          f"late_prune_step={prune_step} threshold={threshold}", flush=True)


_apply_exp6_instrumentation_if_requested()
