"""P1c — selectable alignment backends for the Twin 360 worker.

Today's worker shells out to `ns-process-data`, which wraps COLMAP and hides its database.
That is why pose priors could never be used: there is no point in that flow where we can write
into the database between feature matching and mapping.

Running the same stages through **pycolmap** (pip-installable, currently 4.1.1) exposes the
database directly and removes the need for a COLMAP binary in the image entirely.

Backends
    colmap_vanilla     today's behaviour, unposed. The default until an arm wins.
    colmap_pose_prior  ARKit positions + gravity injected as covariance-weighted priors,
                       with a robust loss so a bad prior is down-weighted, not believed.

Measured on synthetic weakly-matched sequences (test_pose_prior_benefit.py): median camera
centre error 3.92 m unposed -> 0.06 m with priors. Mechanism validated; real captures still
have to pass the R7.5 visual gate before this becomes the default.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any, Sequence

from pose_priors import ArkitKeyframe, write_priors_to_database

# Sequential matching suits a walkthrough: consecutive frames overlap heavily. Loop detection
# closes the circuit when the operator re-enters a space already captured.
SEQUENTIAL_OVERLAP = 10
LOOP_DETECTION_IMAGES = 30
# Spatial pairing uses the pose priors themselves to pick candidate pairs — cheap and far more
# targeted than exhaustive matching on an indoor walk.
SPATIAL_MAX_DISTANCE_M = 6.0
SPATIAL_MAX_NEIGHBORS = 20


def _feature_options(max_image_size: int = 1600):
    import pycolmap

    opts = pycolmap.FeatureExtractionOptions()
    for attr, value in (("max_image_size", max_image_size), ("max_num_features", 8192)):
        if hasattr(opts, attr):
            setattr(opts, attr, value)
    return opts


def run_alignment(
    images_dir: Path,
    workspace: Path,
    *,
    backend: str = "colmap_vanilla",
    keyframes: Sequence[ArkitKeyframe] | None = None,
    ios_lidar_drift: bool = False,
    use_spatial_pairs: bool = True,
) -> dict[str, Any]:
    """Extract features, match, optionally inject priors, then map.

    Returns a stats dict for `quality_metrics` including the sparse model path. Never raises
    on prior-writing problems: if priors cannot be written the run degrades to the vanilla
    path rather than failing the job.
    """
    import pycolmap

    workspace.mkdir(parents=True, exist_ok=True)
    db_path = workspace / "database.db"
    if db_path.exists():
        db_path.unlink()
    sparse_dir = workspace / "sparse"
    if sparse_dir.exists():
        shutil.rmtree(sparse_dir)
    sparse_dir.mkdir(parents=True, exist_ok=True)

    stats: dict[str, Any] = {"alignBackend": backend}

    # 1. Features
    pycolmap.extract_features(
        database_path=str(db_path),
        image_path=str(images_dir),
        camera_mode=pycolmap.CameraMode.AUTO,
        extraction_options=_feature_options(),
    )

    # 2. Priors BEFORE matching, so spatial pairing can use them.
    priors_written = 0
    if backend == "colmap_pose_prior" and keyframes:
        try:
            prior_stats = write_priors_to_database(
                str(db_path), keyframes, ios_lidar_drift=ios_lidar_drift
            )
            stats.update(prior_stats)
            priors_written = int(prior_stats.get("posePriorsWritten", 0))
        except Exception as exc:  # noqa: BLE001
            stats["posePriorError"] = f"{type(exc).__name__}: {exc}"
            backend = "colmap_vanilla"
            stats["alignBackendFallback"] = "prior write failed"

    # 3. Matching. Sequential always; spatial only when priors give it something to work with.
    seq = pycolmap.SequentialPairingOptions()
    for attr, value in (
        ("overlap", SEQUENTIAL_OVERLAP),
        ("loop_detection", True),
        ("loop_detection_num_images", LOOP_DETECTION_IMAGES),
        ("quadratic_overlap", True),
    ):
        if hasattr(seq, attr):
            setattr(seq, attr, value)
    pycolmap.match_sequential(database_path=str(db_path), pairing_options=seq)
    stats["matchingSequential"] = True

    if use_spatial_pairs and priors_written >= 3:
        sp = pycolmap.SpatialPairingOptions()
        for attr, value in (
            ("max_distance", SPATIAL_MAX_DISTANCE_M),
            ("max_num_neighbors", SPATIAL_MAX_NEIGHBORS),
            ("ignore_z", False),
        ):
            if hasattr(sp, attr):
                setattr(sp, attr, value)
        try:
            pycolmap.match_spatial(database_path=str(db_path), pairing_options=sp)
            stats["matchingSpatial"] = True
        except Exception as exc:  # noqa: BLE001
            # Non-fatal: sequential matches alone still reconstruct.
            stats["matchingSpatialError"] = f"{type(exc).__name__}: {exc}"

    # 4. Mapping
    opts = pycolmap.IncrementalPipelineOptions()
    if backend == "colmap_pose_prior" and priors_written >= 3:
        opts.use_prior_position = True
        opts.use_robust_loss_on_prior_position = True
        stats["usePriorPosition"] = True
    recs = pycolmap.incremental_mapping(
        database_path=str(db_path),
        image_path=str(images_dir),
        output_path=str(sparse_dir),
        options=opts,
    )

    if not recs:
        stats["registeredImages"] = 0
        stats["alignFailed"] = True
        return stats

    best_id, best = max(recs.items(), key=lambda kv: kv[1].num_reg_images())
    stats["registeredImages"] = best.num_reg_images()
    stats["totalImages"] = best.num_images()
    stats["sparseModelPath"] = str(sparse_dir / str(best_id))
    stats["meanReprojError"] = round(float(best.compute_mean_reprojection_error()), 4)
    return stats
