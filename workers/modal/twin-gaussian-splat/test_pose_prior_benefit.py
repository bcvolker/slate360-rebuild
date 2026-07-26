"""Empirical A/B of the Phase 1 hypothesis: do pose priors improve reconstruction?

The whole of Phase 1 rests on one claim — that feeding ARKit positions into bundle adjustment
as covariance-weighted priors produces a better-conditioned solve than running unposed. That
claim was inherited from research and had never been measured on our side.

This measures it. pycolmap can synthesise a dataset with KNOWN ground-truth poses plus pose
priors, so we can reconstruct the same scene twice — priors off vs priors on — and compare both
runs against truth. Synthetic, so it isolates the mechanism from capture quality.

Run: python3 workers/modal/twin-gaussian-splat/test_pose_prior_benefit.py
"""

from __future__ import annotations

import math
import random
import statistics
import tempfile
from pathlib import Path

import pycolmap


def build_dataset(db_path: Path, *, prior_noise_m: float, seed: int):
    """Synthesise a scene, then CORRUPT its priors to imitate ARKit drift.

    Important: SyntheticDatasetOptions has no noise field, so the priors it emits are exact
    ground truth. Reconstructing against exact priors is circular — it hands the solver the
    answer and always "wins". The priors are therefore perturbed below with a random walk,
    which is what ARKit actually produces: small per-frame error plus accumulating drift.
    """
    opts = pycolmap.SyntheticDatasetOptions()
    opts.num_rigs = 1
    opts.num_cameras_per_rig = 1
    opts.num_frames_per_rig = 18          # a short walkthrough
    opts.num_points3D = 900
    opts.camera_width = 1600
    opts.camera_height = 1200
    opts.prior_position = True            # emit pose priors
    opts.prior_gravity = True
    opts.prior_position_coordinate_system = pycolmap.PosePriorCoordinateSystem.CARTESIAN
    # Weak, noisy observations: this is where a prior should earn its keep.
    opts.inlier_match_ratio = 0.55
    opts.match_sparsity = 0.45
    opts.track_length = 6

    db = pycolmap.Database.open(str(db_path))
    try:
        gt = pycolmap.synthesize_dataset(opts, db)
        _corrupt_priors(db, prior_noise_m=prior_noise_m, seed=seed)
    finally:
        db.close()
    return gt


def _corrupt_priors(db, *, prior_noise_m: float, seed: int) -> float:
    """Replace exact priors with ARKit-like ones: per-frame noise + accumulating drift.

    Returns the mean introduced position error, so the test can report what the solver was
    actually given rather than assuming.
    """
    rng = random.Random(seed)
    priors = list(db.read_all_pose_priors())
    drift = [0.0, 0.0, 0.0]
    introduced = []
    for i, prior in enumerate(priors):
        # Random walk: drift accumulates across the sequence, as VIO error does.
        for axis in range(3):
            drift[axis] += rng.gauss(0.0, prior_noise_m * 0.35)
        pos = list(prior.position)
        new = [pos[a] + drift[a] + rng.gauss(0.0, prior_noise_m) for a in range(3)]
        introduced.append(math.dist(pos, new))
        prior.position = new
        var = (prior_noise_m * (1.0 + 0.4 * i)) ** 2
        prior.position_covariance = [[var, 0, 0], [0, var, 0], [0, 0, var]]
        db.update_pose_prior(prior)
    return statistics.mean(introduced) if introduced else 0.0


def reconstruct(db_path: Path, out_dir: Path, *, use_priors: bool):
    opts = pycolmap.IncrementalPipelineOptions()
    opts.use_prior_position = use_priors
    opts.use_robust_loss_on_prior_position = use_priors
    out_dir.mkdir(parents=True, exist_ok=True)
    recs = pycolmap.incremental_mapping(
        database_path=str(db_path),
        image_path=str(out_dir),          # synthetic: no image files are read
        output_path=str(out_dir),
        options=opts,
    )
    if not recs:
        return None
    return max(recs.values(), key=lambda r: r.num_reg_images())


def pose_error_vs_truth(rec, gt) -> tuple[float, float] | None:
    """Median absolute camera-centre error after aligning to ground truth (metres)."""
    if rec is None or rec.num_reg_images() < 3:
        return None
    # Unposed SfM has an arbitrary gauge (scale/rotation/translation), so raw centre
    # differences are meaningless. Align to ground truth first; if alignment FAILS, report
    # None rather than a bogus number.
    try:
        rec_align = pycolmap.Reconstruction(rec)
        sim3 = pycolmap.align_reconstructions_via_proj_centers(
            rec_align, gt, max_proj_center_error=1e9
        )
        if sim3 is None:
            return None
        target = rec_align
    except Exception:
        return None

    errors = []
    gt_centres = {img.name: img.projection_center() for img in gt.images.values()}
    for img in target.images.values():
        truth = gt_centres.get(img.name)
        if truth is None:
            continue
        c = img.projection_center()
        errors.append(math.dist(list(c), list(truth)))
    if not errors:
        return None
    return statistics.median(errors), max(errors)


def run_trial(seed: int, prior_noise_m: float) -> dict:
    row: dict = {"seed": seed}
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        results = {}
        for label, use_priors in (("off", False), ("on", True)):
            db_path = root / f"db_{label}.db"
            gt = build_dataset(db_path, prior_noise_m=prior_noise_m, seed=seed)
            rec = reconstruct(db_path, root / f"out_{label}", use_priors=use_priors)
            reg = rec.num_reg_images() if rec else 0
            err = pose_error_vs_truth(rec, gt)
            results[label] = {
                "registered": reg,
                "total": gt.num_images(),
                "median_err": None if err is None else err[0],
            }
        row.update(results)
    return row


def main() -> int:
    print("\nPose-prior A/B on synthetic scenes (weak matches: 55% inliers, 45% sparsity)")
    print("Same scene reconstructed twice — priors OFF vs ON — scored against ground truth.\n")
    print(f"  {'seed':>4}  {'registered off/on':>20}  {'median centre err off/on':>28}")
    print("  " + "-" * 58)

    rows = []
    for seed in (1, 2, 3, 4, 5):
        try:
            rows.append(run_trial(seed, prior_noise_m=0.05))
        except Exception as exc:  # noqa: BLE001
            print(f"  seed {seed}: trial failed — {type(exc).__name__}: {exc}")
    if not rows:
        print("\n  No trials completed.\n")
        return 1

    for r in rows:
        off, on = r["off"], r["on"]
        reg = f"{off['registered']}/{off['total']}  ->  {on['registered']}/{on['total']}"
        eo = "—" if off["median_err"] is None else f"{off['median_err']:.4f}"
        eon = "—" if on["median_err"] is None else f"{on['median_err']:.4f}"
        print(f"  {r['seed']:>4}  {reg:>20}  {eo:>12} -> {eon:>12}")

    reg_off = statistics.mean(r["off"]["registered"] for r in rows)
    reg_on = statistics.mean(r["on"]["registered"] for r in rows)
    errs_off = [r["off"]["median_err"] for r in rows if r["off"]["median_err"] is not None]
    errs_on = [r["on"]["median_err"] for r in rows if r["on"]["median_err"] is not None]

    print("\n  Summary")
    print(f"    mean registered images : {reg_off:.1f} (off)  ->  {reg_on:.1f} (on)")
    if errs_off and errs_on:
        print(f"    mean median-centre err : {statistics.mean(errs_off):.4f} (off)"
              f"  ->  {statistics.mean(errs_on):.4f} (on)")
    print()
    print("  Interpretation: priors help when they raise registration or lower centre error.")
    print("  Synthetic only — this validates the MECHANISM, not our capture quality. The real")
    print("  gate remains an A/B on benchmark captures with a visual check (R7.5).\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
