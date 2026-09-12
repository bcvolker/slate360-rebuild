"""Splat Lab local runner — configuration knobs.

Training knobs for the Slate360 Gaussian-splat pipeline. Defaults are the
recommended starting points for high-quality reconstruction. All knobs have
safe defaults; the web UI overrides per job.
"""
from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path

PRESETS = ("classic", "lite", "object", "safe")
SH_DEGREES = (0, 1, 2, 3)
SFM_MODES = ("faster", "hq")
IMAGE_SIZES = ("auto", "4k", "6k", "8k")
QUALITIES = ("test", "medium", "high", "auto")

# Recommended step targets per quality preset (mirrors the proven pipeline).
QUALITY_STEPS = {"test": 5_000, "medium": 30_000, "high": 100_000, "auto": 300_000}
IMAGE_SIZE_PX = {"auto": 7680, "4k": 3840, "6k": 6144, "8k": 7680}


@dataclass
class SplatLabConfig:
    """Per-job configuration. Serialized into the job manifest."""

    input_path: str
    output_dir: str
    job_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])

    # Input kind
    is360: bool = False
    remove_people: bool = True

    # Prepare-images knobs (recommended defaults)
    sfm_mode: str = "faster"            # faster | hq (COLMAP matcher quality)
    image_size: str = "auto"            # auto | 4k | 6k | 8k (target frame size)
    fps: float = 4.0                    # frame extraction rate (3/4/5 recommended)
    max_duration: int = 0              # 0 = use full video; else cap seconds per video
    precompute_360_faces: bool = True   # precompute 6 cube faces for 360 input

    # Training knobs (recommended defaults for high quality)
    resolution_limit: int = 1920       # SplatTrainerImageResolutionLimit
    sh_degree: int = 1                 # SH degree (0-3); 2-3 for highest fidelity
    max_splats_millions: float = 1.5   # splat cap
    training_steps: int = 30_000       # iterations (quality preset overrides if >0)
    images_per_step: int = 0           # 0 = auto: clamp(ceil(cameras/5000),1,64)
    preset: str = "classic"            # trainingPreset
    quality: str = "auto"              # test | medium | high | auto (step target)

    def validate(self) -> list[str]:
        errs: list[str] = []
        if not self.input_path:
            errs.append("input_path is required")
        if self.preset not in PRESETS:
            errs.append(f"preset must be one of {PRESETS}")
        if self.sh_degree not in SH_DEGREES:
            errs.append(f"sh_degree must be one of {SH_DEGREES}")
        if self.max_splats_millions <= 0:
            errs.append("max_splats_millions must be > 0")
        if self.training_steps <= 0:
            errs.append("training_steps must be > 0")
        if self.sfm_mode not in SFM_MODES:
            errs.append(f"sfm_mode must be one of {SFM_MODES}")
        if self.image_size not in IMAGE_SIZES:
            errs.append(f"image_size must be one of {IMAGE_SIZES}")
        if self.quality not in QUALITIES:
            errs.append(f"quality must be one of {QUALITIES}")
        return errs

    @property
    def job_dir(self) -> Path:
        return Path(self.output_dir) / self.job_id

    @property
    def resolved_steps(self) -> int:
        """Quality preset step target, unless training_steps was set higher."""
        target = QUALITY_STEPS.get(self.quality, self.training_steps)
        return max(self.training_steps, target)

    @property
    def resolved_image_px(self) -> int:
        return IMAGE_SIZE_PX.get(self.image_size, 1920)

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)

    def resolve_images_per_step(self, camera_count: int) -> int:
        """Auto rule: clamp(ceil(registered_cameras/5000), 1, 64)."""
        if self.images_per_step and self.images_per_step > 0:
            return max(1, min(64, int(self.images_per_step)))
        if camera_count <= 0:
            return 1
        import math
        return max(1, min(64, math.ceil(camera_count / 5000)))
