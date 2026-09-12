"""Splat Lab local runner - configuration knobs.

Training knobs for the Slate360 Gaussian-splat pipeline. Defaults are the
recommended starting points for high-quality reconstruction. All knobs have
safe defaults; the web UI overrides per job.

Parity notes (docs/ops/SPLAT_LAB_PARITY_BUILD_PLAN.md): the reference studio
registers each 360 panorama once (native EQUIRECTANGULAR SfM), then derives
16 pinhole training views per panorama. Proven mirrors that: spherical_mode
defaults to "native" (verified working on stock COLMAP 4.1.0), and the
views stage renders VIEW_LAYOUT canonical views from each registered
panorama pose. "rig" mode (6 cube faces registered independently via a
COLMAP rig) is a fallback for captures where native under-registers.
"""
from __future__ import annotations

import json
import math
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path

PRESETS = ("classic", "lite", "object", "safe")
SH_DEGREES = (0, 1, 2, 3)
SPHERICAL_MODES = ("native", "rig")
IMAGE_SIZES = ("auto", "4k", "6k", "8k")
QUALITIES = ("test", "medium", "high", "auto")
VIEW_IMAGE_SIZES = ("768", "1024", "1280", "1920", "max")

# Recommended step targets per quality preset. "auto" instead follows the
# reference's own formula: views * 50 / images_per_step, floor 25,000
# (resolved_steps() below) so it scales with the actual capture size.
QUALITY_STEPS = {"test": 5_000, "medium": 30_000, "high": 100_000}
IMAGE_SIZE_PX = {"auto": 7680, "4k": 3840, "6k": 6144, "8k": 7680}

# 16 canonical 90 deg pinhole views per panorama (matches the reference's own
# "canonical16-fov90-max1280-v1" layout): 8 around the horizon, 4 tilted up
# 45 deg, 4 tilted down 45 deg. Order is fixed so file names are stable.
VIEW_YAWS_HORIZON = (0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0)
VIEW_YAWS_TILT = (0.0, 90.0, 180.0, 270.0)
VIEW_LAYOUT = (
    [(yaw, 0.0) for yaw in VIEW_YAWS_HORIZON]
    + [(yaw, 45.0) for yaw in VIEW_YAWS_TILT]
    + [(yaw, -45.0) for yaw in VIEW_YAWS_TILT]
)
assert len(VIEW_LAYOUT) == 16

# Auto step/cap formula constants (reference kitchen job: 13,040 views,
# imagesPerStep 2 -> 326,000 steps; splat cap 6,520,000; verified in
# splats/0/airvisstudio-splat.json). GPU_SAFE_SPLATS mirrors the reference's
# own GPU-safe limit for a 24 GB card (their splatCapResolution.GpuSafeLimit
# was about 17.4M on this same RTX 3090).
STEPS_PER_VIEW = 50
STEPS_FLOOR = 25_000
SPLATS_PER_VIEW = 500
GPU_SAFE_SPLATS = 17_400_000

# Training-image RAM budget (nerfstudio 1.1.5 caches every training image in
# process RAM or VRAM - no disk streaming, verified via `ns-train --help`).
# Root-caused 2026-09-12 on a real 272-panorama/1280px run: raw pixel bytes
# alone (views * W^2 * 3B) undercounts real usage by roughly 3x once
# PyTorch/nerfstudio's own overhead (mask cache, prefetch buffers, tensor
# copies) is included - a 21.4 GB raw estimate actually used ~61 GB RSS and
# pushed WSL2 into heavy swapping (15/16 GB swap used), cratering training
# from ~6 it/s to under 2 it/s. RAM_OVERHEAD_FACTOR folds that in so the UI's
# estimate reflects real usage, not just raw pixels. WSL2's memory ceiling
# was also raised from its ~62 GB default to 100 GB via .wslconfig (see
# docs/ops/SPLAT_LAB_PARITY_BUILD_PLAN.md) - RAM_BUDGET_BYTES leaves
# headroom under that for the OS and other concurrent pipeline stages.
RAM_OVERHEAD_FACTOR = 3.0
RAM_BUDGET_BYTES = 75 * 1024 ** 3  # target ceiling under WSL2's 100 GB (see .wslconfig)

VIEW_IMAGE_SIZES_PX = {"768": 768, "1024": 1024, "1280": 1280, "1920": 1920}


def view_px(view_image_size: str, pano_width: int = 7680) -> int:
    """Resolve the Image size knob to a pixel width for the 16 training views."""
    if view_image_size == "max":
        return max(256, pano_width // 4)
    return int(VIEW_IMAGE_SIZES_PX.get(view_image_size, 1280))


def ram_estimate_bytes(view_count: int, w: int) -> int:
    """Realistic estimate of actual RSS during training, not just raw pixel
    bytes - see RAM_OVERHEAD_FACTOR above for why the multiplier is needed."""
    return int(view_count * w * w * 3 * RAM_OVERHEAD_FACTOR)


def resolve_auto_steps(view_count: int, images_per_step: int) -> int:
    """views * 50 / images_per_step, floor 25,000 (reference's own formula)."""
    if view_count <= 0 or images_per_step <= 0:
        return STEPS_FLOOR
    return max(STEPS_FLOOR, round(view_count * STEPS_PER_VIEW / images_per_step))


def resolve_auto_splat_cap(view_count: int) -> int:
    """views * 500, capped by the GPU-safe ceiling for this card."""
    return min(GPU_SAFE_SPLATS, max(1, view_count) * SPLATS_PER_VIEW)


@dataclass
class SplatLabConfig:
    """Per-job configuration. Serialized into the job manifest."""

    input_path: str
    output_dir: str
    job_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    workspace_name: str = ""

    # Which desktop clone launched this job (proven = quality baseline).
    clone: str = "proven"
    use_lidar: bool = False
    use_rtk: bool = False

    # Input kind
    is360: bool = False
    remove_people: bool = True

    # Prepare-images knobs
    spherical_mode: str = "native"      # native | rig (SfM camera strategy)
    image_size: str = "auto"            # auto | 4k | 6k | 8k (source frame size)
    fps: float = 4.0                    # frame extraction rate (2/3/4/5 recommended)
    max_duration: int = 0               # 0 = use full video; else cap seconds per video
    max_features: int = 16384           # SIFT features per panorama/frame

    # Views stage (training-set generation)
    view_image_size: str = "1280"       # 768 | 1024 | 1280 | 1920 | max

    # Training knobs
    sh_degree: int = 3                  # SH degree (0-3); 3 for highest fidelity
    max_splats_millions: float = 0.0    # 0 = auto (views * 500, GPU-capped)
    training_steps: int = 0             # 0 = follow quality preset; >0 overrides
    images_per_step: int = 2            # matches the reference's own default
    preset: str = "classic"             # trainingPreset
    quality: str = "auto"               # test | medium | high | auto (step target)
    strategy: str = "default"           # default | mcmc (Lab only; mcmc needs gsplat trainer)
    use_bilateral_grid: bool = False

    # Kept for backward compatibility with older jobs' config.json; superseded
    # by view_image_size for new runs.
    resolution_limit: int = 1920
    precompute_360_faces: bool = True

    def validate(self) -> list[str]:
        errs: list[str] = []
        if not self.input_path:
            errs.append("input_path is required")
        if self.preset not in PRESETS:
            errs.append("preset must be one of " + str(PRESETS))
        if self.sh_degree not in SH_DEGREES:
            errs.append("sh_degree must be one of " + str(SH_DEGREES))
        if self.training_steps < 0:
            errs.append("training_steps must be >= 0")
        if self.spherical_mode not in SPHERICAL_MODES:
            errs.append("spherical_mode must be one of " + str(SPHERICAL_MODES))
        if self.image_size not in IMAGE_SIZES:
            errs.append("image_size must be one of " + str(IMAGE_SIZES))
        if self.view_image_size not in VIEW_IMAGE_SIZES:
            errs.append("view_image_size must be one of " + str(VIEW_IMAGE_SIZES))
        if self.quality not in QUALITIES:
            errs.append("quality must be one of " + str(QUALITIES))
        return errs

    @property
    def job_dir(self) -> Path:
        return Path(self.output_dir) / self.job_id

    @property
    def resolved_image_px(self) -> int:
        return IMAGE_SIZE_PX.get(self.image_size, 1920)

    @property
    def resolved_view_px(self) -> int:
        return view_px(self.view_image_size, self.resolved_image_px)

    def resolved_steps(self, view_count: int) -> int:
        """Quality-preset step target, unless training_steps was set > 0."""
        if self.training_steps and self.training_steps > 0:
            return self.training_steps
        if self.quality == "auto":
            return resolve_auto_steps(view_count, self.images_per_step)
        return QUALITY_STEPS.get(self.quality, 30_000)

    def resolved_splat_cap(self, view_count: int) -> int:
        if self.max_splats_millions and self.max_splats_millions > 0:
            return int(self.max_splats_millions * 1_000_000)
        return resolve_auto_splat_cap(view_count)

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)

    def resolve_images_per_step(self, view_count: int) -> int:
        if self.images_per_step and self.images_per_step > 0:
            return max(1, min(64, int(self.images_per_step)))
        if view_count <= 0:
            return 1
        return max(1, min(64, math.ceil(view_count / 6500)))
