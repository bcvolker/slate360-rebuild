"""Splat Lab local runner — configuration knobs.

Mirrors the AirVis Studio training knobs (recovered from AirVisStudio.Core.dll
strings) and the existing Slate360 twin-gaussian-splat Modal worker contract.
All knobs have safe defaults; the web UI overrides per job.
"""
from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path

PRESETS = ("classic", "lite", "object", "safe")
SH_DEGREES = (0, 1, 2, 3)


@dataclass
class SplatLabConfig:
    """Per-job configuration. Serialized into the job manifest."""

    input_path: str
    output_dir: str
    job_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])

    # Input kind
    is360: bool = False
    remove_people: bool = True

    # Training knobs (AirVis field names, for parity)
    resolution_limit: int = 1920          # SplatTrainerImageResolutionLimit
    sh_degree: int = 1                     # SplatShDegree (0-3)
    max_splats_millions: float = 1.5       # SplatMaxSplatsCapMillions
    training_steps: int = 7000             # SplatTrainingSteps
    images_per_step: int = 0               # 0 = auto: clamp(ceil(cameras/5000),1,64)
    preset: str = "classic"                # trainingPreset

    # Frame extraction
    fps: float = 2.0

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
        return errs

    @property
    def job_dir(self) -> Path:
        return Path(self.output_dir) / self.job_id

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)

    def resolve_images_per_step(self, camera_count: int) -> int:
        """AirVis auto rule: clamp(ceil(registered_cameras/5000), 1, 64)."""
        if self.images_per_step and self.images_per_step > 0:
            return max(1, min(64, int(self.images_per_step)))
        if camera_count <= 0:
            return 1
        import math
        return max(1, min(64, math.ceil(camera_count / 5000)))
