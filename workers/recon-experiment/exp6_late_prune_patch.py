"""Experiment 6: one optimizer-aware, scale-only prune fired exactly once at a chosen step,
entirely outside gsplat's own refine/grow/prune cycle.

Does NOT touch DefaultStrategy, does NOT reactivate refine_stop_iter, stop_screen_size_at,
or any other strategy behavior -- those stay governed by the unmodified exp3_strategy_patch
(gated by SPLAT_LAB_EXP3=1, unchanged). This patch wraps SplatfactoModel.step_post_backward
(the model-level hook, called every step, *after* strategy.step_post_backward has already
run and already returned early because step >= refine_stop_iter) and, at exactly one step,
calls gsplat's own ops.remove() -- the identical, already-installed function
DefaultStrategy._prune_gs uses internally -- so Adam's exp_avg/exp_avg_sq moment buffers are
correctly sliced for every removed Gaussian, not just the raw parameter tensors.

Applied only when SPLAT_LAB_EXP6_LATE_PRUNE_STEP is set (an integer step number); Experiment
3/4/5 jobs never set it and are unaffected.
"""
from __future__ import annotations

import json
import os


def _apply_exp6_late_prune_if_requested() -> None:
    step_str = os.environ.get("SPLAT_LAB_EXP6_LATE_PRUNE_STEP", "").strip()
    if not step_str:
        return
    prune_step = int(step_str)
    threshold = float(os.environ.get("SPLAT_LAB_EXP6_LATE_PRUNE_THRESH", "0.08"))
    status_path = os.environ.get("SPLAT_LAB_WRAP_STATUS_PATH")

    import torch
    from gsplat.strategy.ops import remove
    from nerfstudio.models.splatfacto import SplatfactoModel

    orig_step_post_backward = SplatfactoModel.step_post_backward
    fired = {"done": False}

    def wrapped(self, step):
        orig_step_post_backward(self, step)
        if fired["done"] or step != prune_step:
            return
        fired["done"] = True
        with torch.no_grad():
            max_scale = torch.exp(self.gauss_params["scales"]).max(dim=-1).values
            mask = max_scale > threshold
            n_before = int(max_scale.shape[0])
            n_remove = int(mask.sum().item())
            remove(
                params=self.gauss_params,
                optimizers=self.optimizers,
                state=self.strategy_state,
                mask=mask,
            )
        record = {
            "step": step,
            "threshold": threshold,
            "n_before": n_before,
            "n_removed": n_remove,
            "n_after": n_before - n_remove,
        }
        print("EXP6_LATE_PRUNE " + json.dumps(record), flush=True)
        if status_path:
            try:
                with open(status_path, "a", encoding="utf-8") as f:
                    f.write(json.dumps({"exp6_late_prune": record}) + "\n")
            except OSError:
                pass

    SplatfactoModel.step_post_backward = wrapped
    print(f"EXP6_LATE_PRUNE_PATCH_ARMED step={prune_step} threshold={threshold}", flush=True)


_apply_exp6_late_prune_if_requested()
