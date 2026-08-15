"""P1b — write ARKit camera poses into COLMAP's `pose_priors` table.

Why this exists
---------------
The worker currently discards ARKit poses (`ALIGNMENT_STRATEGY="colmap_first"`), solves
unposed, then tries to *recover* metric scale and gravity afterwards. That recovery is
fragile: scale skips with `residual_too_high` run-to-run on identical data, and the floor-PCA
up-axis guess produced the upside-down bug class.

The old "bypass" arm failed (PSNR 9.5-14.7 vs COLMAP 23.3) because it *replaced* COLMAP with
raw ARKit poses — a wrong frame->keyframe assignment became ground truth with no way to reject
it. Pose priors are a third path: positions enter bundle adjustment as covariance-weighted
residuals under a robust loss, so COLMAP still does its own matching and triangulation and a
bad prior gets *down-weighted* rather than believed.

Verified against pycolmap 4.1.1 (the API this module targets):
    PosePrior(position, position_covariance, coordinate_system) with `.gravity`
    Database.write_pose_prior / read_pose_prior / num_pose_priors
    IncrementalPipelineOptions.use_prior_position (default False)
                              .use_robust_loss_on_prior_position (default False)
                              .prior_position_loss_scale (default 7.815)

7.815 is the chi-squared 95% critical value at 3 DOF — i.e. the robust loss starts
down-weighting a position residual once it is beyond 95% confidence for a 3D Gaussian.

Covariance model
----------------
Apple publishes no covariance and no enum->sigma mapping exists in the literature, so the
table below is a tuned STARTING POINT anchored on the ~0.02 m/s ARKit drift reported in the
Sensors 2022 VIO benchmark. Tune on benchmark walks; do not treat as measured truth.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, Sequence

# Base 1-sigma position uncertainty (metres) by ARKit tracking state.
SIGMA_NORMAL = 0.05
SIGMA_INSUFFICIENT_FEATURES = 0.60
SIGMA_EXCESSIVE_MOTION = 1.20
SIGMA_POST_RELOCALIZATION = 0.35
# Relocalization can jump the world frame outright; a prior there is worse than none.
OMIT_STATES = frozenset({"relocalizing", "initializing", "notavailable", "not_available"})
# Seconds after an interruption during which poses stay suspect.
POST_RELOC_WINDOW_S = 1.0

# Random-walk drift growth. ARKit position error accumulates, so absolute positions late in a
# walk are wrong RELATIVE to early ones even while tracking stays `.normal`. Without this term
# uniformly tight priors fight true geometry on long walks.
DRIFT_SIGMA_PER_SQRT_S = 0.02

# iOS 26.4+ carries an Apple-acknowledged LiDAR VIO drift regression (Developer Forums threads
# 827240, 833040): cumulative drift in ARCamera.transform on LiDAR devices, growing with
# walking distance, no config workaround. Inflate globally until Apple ships a fix; the
# multiplier is recorded in quality_metrics so it can be retired.
IOS_2640_DRIFT_MULTIPLIER = 2.5

SIGMA_MIN = 0.02
SIGMA_MAX = 5.0


@dataclass
class ArkitKeyframe:
    """One ARKit keyframe as persisted in poses.json (schema v4-v6).

    v5 adds a `gps` block with `fixTime`/`age`; that path lives in gps_priors.py and does not
    change this dataclass. Local geometry comes from ARKit positions here; GPS only georeferences
    the finished block.

    v6 adds photos-mode PHOTO pose frames: same transform/intrinsics/gps shape, tagged
    `"photo": <upload filename>` and carrying no `clip_index` (snapped between clips). All
    existing consumers match keyframes by timestamp and ignore unknown keys, so photo frames
    ride along untouched today; a filename-based photo→pose join is the intended follow-up.
    """
    image_name: str
    position: tuple[float, float, float]
    timestamp: float
    tracking_state: str = "normal"
    gravity: tuple[float, float, float] | None = None
    seconds_since_interruption: float | None = None


def _normalise_state(state: str | None) -> str:
    """Normalise ARKit state strings.

    ARKit reports compound states like `.limited(.relocalizing)`, which arrive as
    "limited_relocalizing" / "limited(.relocalizing)" / ".limited relocalizing" depending on
    how the Swift layer stringifies them. Strip punctuation and the `limited` qualifier so the
    REASON is what gets matched — otherwise "limited_relocalizing" silently fails to match
    "relocalizing" and a prior gets written for a frame whose world origin may have jumped.
    """
    raw = (state or "normal").strip().lower()
    for ch in ".()[]-":
        raw = raw.replace(ch, " ")
    tokens = [t for t in raw.replace("_", " ").split() if t and t != "limited"]
    return "_".join(tokens) if tokens else "normal"


def sigma_for_keyframe(
    kf: ArkitKeyframe,
    elapsed_s: float,
    ios_lidar_drift: bool = False,
) -> float | None:
    """1-sigma position uncertainty in metres, or None to omit the prior entirely."""
    state = _normalise_state(kf.tracking_state)
    if state in OMIT_STATES or any(tok in OMIT_STATES for tok in state.split("_")):
        return None

    if "insufficientfeatures" in state or "insufficient_features" in state:
        base = SIGMA_INSUFFICIENT_FEATURES
    elif "excessivemotion" in state or "excessive_motion" in state:
        base = SIGMA_EXCESSIVE_MOTION
    else:
        base = SIGMA_NORMAL

    if (
        kf.seconds_since_interruption is not None
        and kf.seconds_since_interruption <= POST_RELOC_WINDOW_S
    ):
        base = max(base, SIGMA_POST_RELOCALIZATION)

    # Random-walk growth from session start.
    drift = DRIFT_SIGMA_PER_SQRT_S * math.sqrt(max(0.0, elapsed_s))
    sigma = math.hypot(base, drift)

    if ios_lidar_drift:
        sigma *= IOS_2640_DRIFT_MULTIPLIER

    return float(min(SIGMA_MAX, max(SIGMA_MIN, sigma)))


def build_priors(
    keyframes: Sequence[ArkitKeyframe],
    ios_lidar_drift: bool = False,
) -> list[tuple[str, tuple[float, float, float], list[list[float]], tuple[float, float, float] | None]]:
    """Compute (image_name, position, 3x3 covariance, gravity) for each usable keyframe.

    Pure and dependency-free so the covariance model can be unit-tested without COLMAP.
    """
    if not keyframes:
        return []
    t0 = min(k.timestamp for k in keyframes)
    out = []
    for kf in keyframes:
        sigma = sigma_for_keyframe(kf, kf.timestamp - t0, ios_lidar_drift)
        if sigma is None:
            continue
        var = sigma * sigma
        cov = [[var, 0.0, 0.0], [0.0, var, 0.0], [0.0, 0.0, var]]
        out.append((kf.image_name, kf.position, cov, kf.gravity))
    return out


def write_priors_to_database(
    database_path: str,
    keyframes: Sequence[ArkitKeyframe],
    ios_lidar_drift: bool = False,
) -> dict[str, int | float]:
    """Write pose priors into a COLMAP database, keyed by image name.

    Returns counts for `quality_metrics`. Images present in the keyframe list but absent from
    the database are skipped (COLMAP may not have registered every frame).
    """
    import pycolmap  # imported lazily so the module stays unit-testable without COLMAP

    priors = build_priors(keyframes, ios_lidar_drift)
    db = pycolmap.Database.open(database_path)
    try:
        # COLMAP 4.x generalised pose priors from image_id to a sensor-generic data handle:
        # write_pose_prior(prior) takes ONLY the prior, and the binding comes from
        # prior.corr_data_id = data_t(sensor_t(CAMERA, camera_id), image_id).
        images = {img.name: img for img in db.read_all_images()}
        written = 0
        skipped_missing = 0
        for image_name, position, cov, gravity in priors:
            image = images.get(image_name)
            if image is None:
                skipped_missing += 1
                continue
            prior = pycolmap.PosePrior()
            prior.position = position
            prior.position_covariance = cov
            prior.coordinate_system = pycolmap.PosePriorCoordinateSystem.CARTESIAN
            if gravity is not None:
                prior.gravity = gravity
            prior.corr_data_id = pycolmap.data_t(
                pycolmap.sensor_t(pycolmap.SensorType.CAMERA, image.camera_id),
                image.image_id,
            )
            db.write_pose_prior(prior)
            written += 1
    finally:
        db.close()

    sigmas = [math.sqrt(c[0][0]) for _, _, c, _ in priors]
    return {
        "posePriorsWritten": written,
        "posePriorsOmitted": len(keyframes) - len(priors),
        "posePriorsSkippedMissing": skipped_missing,
        "posePriorSigmaMin": round(min(sigmas), 4) if sigmas else 0.0,
        "posePriorSigmaMax": round(max(sigmas), 4) if sigmas else 0.0,
        "iosLidarDriftMultiplierApplied": IOS_2640_DRIFT_MULTIPLIER if ios_lidar_drift else 1.0,
    }


def mapper_options(**overrides):
    """IncrementalPipelineOptions configured for pose-prior mapping.

    `use_prior_position` is what actually turns priors on; the `colmap pose_prior_mapper` CLI
    sets it in code rather than exposing it as a `--Mapper.*` flag.
    """
    import pycolmap

    opts = pycolmap.IncrementalPipelineOptions()
    opts.use_prior_position = True
    opts.use_robust_loss_on_prior_position = True  # a bad prior is down-weighted, not believed
    for key, value in overrides.items():
        setattr(opts, key, value)
    return opts
