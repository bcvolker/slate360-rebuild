"""Hard cost gates with a cumulative per-run ledger that survives failed and resumed attempts.

Rates are the configured card, not a live invoice. Ledger key: <root>/runs/<runId>/ledger.json (written by the lease
owner only). A launch is refused if cumulative spend + this attempt's projection exceeds the unapproved caps."""

from __future__ import annotations

import json
import time

GPU_USD_PER_HOUR = {"T4": 0.59, "L4": 0.80, "A10G": 1.10, "L40S": 1.95, "A100": 3.73}
MAX_UNAPPROVED_USD = 5.0
MAX_UNAPPROVED_MINUTES = 240
APPROVAL_TOKEN = "BRIAN_APPROVED"
AUTOMATIC_RETRIES = 0          # stays 0 until verified recovery is signed off


class CostRejected(RuntimeError):
    pass


def project_cost(gpu: str, expected_minutes: float) -> dict:
    if gpu not in GPU_USD_PER_HOUR:
        raise CostRejected(f"unknown GPU type {gpu}")
    if expected_minutes <= 0:
        raise CostRejected("expectedMinutes must be positive")
    return {"gpu": gpu, "usdPerHour": GPU_USD_PER_HOUR[gpu], "expectedMinutes": expected_minutes,
            "expectedUsd": round(GPU_USD_PER_HOUR[gpu] * expected_minutes / 60.0, 4), "maxContainers": 1}


def assert_allowed(gpu: str, expected_minutes: float, approval: str | None, ledger: dict | None = None) -> dict:
    rep = project_cost(gpu, expected_minutes)
    prior_usd = float((ledger or {}).get("cumulativeUsd", 0.0))
    prior_min = float((ledger or {}).get("cumulativeGpuSeconds", 0.0)) / 60.0
    rep.update({"priorUsd": prior_usd, "priorMinutes": round(prior_min, 2),
                "totalProjectedUsd": round(prior_usd + rep["expectedUsd"], 4),
                "totalProjectedMinutes": round(prior_min + expected_minutes, 2),
                "approved": approval == APPROVAL_TOKEN})
    if not rep["approved"] and rep["totalProjectedUsd"] > MAX_UNAPPROVED_USD:
        raise CostRejected(f"projected ${rep['totalProjectedUsd']} (incl. prior attempts) exceeds ${MAX_UNAPPROVED_USD}")
    if not rep["approved"] and rep["totalProjectedMinutes"] > MAX_UNAPPROVED_MINUTES:
        raise CostRejected(f"projected {rep['totalProjectedMinutes']} min exceeds {MAX_UNAPPROVED_MINUTES} min")
    return rep


class Ledger:
    def __init__(self, s3, bucket: str, key: str):
        self.s3 = s3; self.bucket = bucket; self.key = key

    def load(self) -> dict:
        from botocore.exceptions import ClientError
        try:
            return json.loads(self.s3.get_object(Bucket=self.bucket, Key=self.key)["Body"].read())
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in {"NoSuchKey", "404", "NotFound"}:
                return {"attempts": [], "cumulativeGpuSeconds": 0.0, "cumulativeWallSeconds": 0.0,
                        "cumulativeUsd": 0.0, "attemptCount": 0}
            raise

    def record(self, attempt_id: str, gpu: str, gpu_seconds: float, wall_seconds: float, outcome: str) -> dict:
        led = self.load()
        usd = GPU_USD_PER_HOUR[gpu] * gpu_seconds / 3600.0
        led["attempts"].append({"attemptId": attempt_id, "gpu": gpu, "gpuSeconds": round(gpu_seconds, 1),
                                "wallSeconds": round(wall_seconds, 1), "usd": round(usd, 4), "outcome": outcome,
                                "recordedAt": time.time()})
        led["cumulativeGpuSeconds"] = round(sum(a["gpuSeconds"] for a in led["attempts"]), 1)
        led["cumulativeWallSeconds"] = round(sum(a["wallSeconds"] for a in led["attempts"]), 1)
        led["cumulativeUsd"] = round(sum(a["usd"] for a in led["attempts"]), 4)
        led["attemptCount"] = len(led["attempts"])
        self.s3.put_object(Bucket=self.bucket, Key=self.key, Body=json.dumps(led, indent=1).encode(),
                           ContentType="application/json")
        return led
