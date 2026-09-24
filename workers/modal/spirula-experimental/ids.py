"""Conservative identifiers for logical runs and attempts. They become filesystem paths and R2 key segments."""

from __future__ import annotations

import re

_ID = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,62})[a-z0-9]$")


class BadId(ValueError):
    pass


def check_id(value: object, what: str = "id") -> str:
    """Lowercase letters, digits and single hyphens, 3..64 chars, no leading/trailing hyphen.
    Rejects '.', '..', '/', '\\', whitespace, control characters, uppercase and anything else."""
    if not isinstance(value, str):
        raise BadId(f"{what} must be a string")
    if not _ID.fullmatch(value) or "--" in value:
        raise BadId(f"{what} {value!r} is not an allowed identifier")
    return value


def attempt_id(run_id: str, n: int) -> str:
    check_id(run_id, "runId")
    if not isinstance(n, int) or n < 1 or n > 99:
        raise BadId("attempt number must be 1..99")
    return check_id(f"{run_id}-a{n:02d}", "attemptId")
