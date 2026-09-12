"""Shared pipeline types. Kept separate to avoid circular imports between
pipeline.py and the stage modules."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class StageResult:
    name: str
    status: str  # running|done|failed|blocked|skipped
    elapsed_s: float = 0.0
    detail: str = ""
    artifacts: list[str] = field(default_factory=list)
    error: str = ""
