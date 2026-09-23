"""Hard cost gates. Rates are the configured card, not a live invoice."""

from __future__ import annotations

GPU_USD_PER_HOUR = {
    "T4": 0.59,
    "L4": 0.80,
    "A10G": 1.10,
    "L40S": 1.95,
    "A100": 3.73,
}

MAX_UNAPPROVED_USD = 5.0
MAX_UNAPPROVED_MINUTES = 240
APPROVAL_TOKEN = "BRIAN_APPROVED"
SMOKE_GPU = "T4"
SMOKE_EXPECTED_MINUTES = 20


class CostRejected(RuntimeError):
    pass


def project_cost(gpu: str, expected_minutes: float) -> dict:
    if gpu not in GPU_USD_PER_HOUR:
        raise CostRejected(f"unknown GPU type {gpu}")
    if expected_minutes <= 0:
        raise CostRejected("expectedMinutes must be positive")
    usd = GPU_USD_PER_HOUR[gpu] * (expected_minutes / 60.0)
    return {
        "gpu": gpu,
        "usdPerHour": GPU_USD_PER_HOUR[gpu],
        "expectedMinutes": expected_minutes,
        "expectedUsd": round(usd, 4),
        "maxContainers": 1,
        "timeoutMinutes": expected_minutes * 2,
    }


def assert_allowed(gpu: str, expected_minutes: float, approval: str | None) -> dict:
    report = project_cost(gpu, expected_minutes)
    approved = approval == APPROVAL_TOKEN
    report["approved"] = approved
    if not approved and report["expectedUsd"] > MAX_UNAPPROVED_USD:
        raise CostRejected(
            f"projected ${report['expectedUsd']} exceeds ${MAX_UNAPPROVED_USD} without approval"
        )
    if not approved and expected_minutes > MAX_UNAPPROVED_MINUTES:
        raise CostRejected(
            f"projected {expected_minutes} min exceeds {MAX_UNAPPROVED_MINUTES} without approval"
        )
    return report


def account_attempts(attempts: list[dict]) -> dict:
    """Sum GPU time for the one trainer, including a failed start and a resume."""
    if not attempts:
        raise CostRejected("no attempts to account")
    if any(item.get("trainers", 1) != 1 for item in attempts):
        raise CostRejected("more than one paid trainer")
    seconds = 0.0
    rate = float(attempts[0]["usdPerHour"])
    for item in attempts:
        if float(item["usdPerHour"]) != rate:
            raise CostRejected("mixed GPU rates in one experiment")
        seconds += float(item["seconds"])
    return {
        "trainers": 1,
        "attempts": len(attempts),
        "actualSeconds": round(seconds, 1),
        "actualUsd": round(rate * seconds / 3600.0, 4),
        "maxContainers": 1,
    }
