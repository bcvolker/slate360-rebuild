"""Research wrapper: skip ATE without genuine GT; always save the Gaussian PLY.

Does not modify pinned ODGS-SLAM source. Imperial College licence: non-commercial
academic research only. Monocular scale is not metric.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

GT_SPAN_EPS = 1e-6
IDENTITY_TOL = 1e-8


def has_genuine_ground_truth(poses_gt) -> bool:
    if poses_gt is None or len(poses_gt) < 2:
        return False
    mats = [np.asarray(p, dtype=np.float64) for p in poses_gt]
    eye = np.eye(4)
    if all(np.allclose(m, eye, atol=IDENTITY_TOL) for m in mats):
        return False
    trans = np.stack([m[:3, 3] for m in mats])
    span = float(np.linalg.norm(trans.max(axis=0) - trans.min(axis=0)))
    return span >= GT_SPAN_EPS


def ate_when_no_ground_truth() -> dict:
    return {
        "ate": None,
        "reason": "no_ground_truth",
        "estimated_trajectory": True,
        "ground_truth_trajectory": False,
    }


def apply_no_gt_save_patch() -> None:
    """Patch eval_utils.evaluate_evo + FrontEnd.run. Call after importing slam."""
    import utils.eval_utils as eu
    import utils.slam_frontend as fe

    orig_evo = eu.evaluate_evo
    orig_save = eu.save_gaussians
    orig_run = fe.FrontEnd.run

    def evaluate_evo_safe(poses_gt, poses_est, plot_dir, label, monocular=False):
        if has_genuine_ground_truth(poses_gt):
            return orig_evo(poses_gt, poses_est, plot_dir, label, monocular=monocular)
        payload = ate_when_no_ground_truth()
        if plot_dir:
            Path(plot_dir).mkdir(parents=True, exist_ok=True)
            (Path(plot_dir) / f"ate_{label}.json").write_text(
                json.dumps(payload, indent=2) + "\n", encoding="utf-8"
            )
        from utils.logging_utils import Log

        Log("ATE skipped: no_ground_truth (Umeyama not called)", tag="Eval")
        return None

    def run_then_save(self):
        try:
            orig_run(self)
        finally:
            if getattr(self, "save_results", False) and getattr(self, "gaussians", None) is not None:
                orig_save(self.gaussians, self.save_dir, "final", final=True)
                from utils.logging_utils import Log

                Log("Gaussian PLY save is independent of ATE", tag="Eval")

    eu.evaluate_evo = evaluate_evo_safe
    fe.FrontEnd.run = run_then_save
