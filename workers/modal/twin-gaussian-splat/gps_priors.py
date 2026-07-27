"""GPS fixes from an iPhone capture -> georeferencing priors, correctly weighted.

The phone stamps every keyframe with its last known CLLocation. CoreLocation delivers
roughly 1 Hz while keyframes are written far more often, so the SAME fix is copied into many
keyframes. Feeding all of them to a solver as independent observations over-weights that one
measurement by sqrt(n) — 30 copies of a 5 m fix would out-vote a genuinely good one.

This module collapses repeats to one prior per physical fix and inflates its uncertainty by
how stale it was when the keyframe was taken. It is deliberately conservative: a phone fix is
evidence about where the building is on Earth, not about the shape of the twin. Local geometry
comes from ARKit + SfM (see pose_priors.py); GPS only pins the finished block to a map.

Schema: poses.json v5 adds `gps.fixTime` / `gps.age`. v4 captures lack them — every keyframe
then looks like an independent fix, so v4 input is collapsed by identical coordinates instead.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Iterable

# CoreLocation signals an invalid measurement with a negative accuracy, not with null.
INVALID_ACCURACY = 0.0

# A fix better than this is not achievable with a phone GNSS chip; treat it as a bad report
# rather than believing it. (Sub-metre needs RTK/dual-frequency and correction data.)
MIN_CREDIBLE_HACC_M = 1.0

# Walking pace. A fix that was `age` seconds old describes where the phone WAS; the keyframe
# may be up to walk_speed * age away from it.
WALK_SPEED_MPS = 1.4

# Beyond this the fix says nothing useful about this keyframe.
MAX_FIX_AGE_S = 5.0

# Vertical GNSS is markedly worse than horizontal even when vAcc claims otherwise.
MIN_SIGMA_V_M = 3.0

# Fixes within this many seconds are the same physical measurement.
FIX_TIME_EPSILON_S = 0.05


@dataclass
class GpsPrior:
    """One physical GNSS fix, bound to the single best keyframe that saw it."""
    image_name: str
    lat: float
    lon: float
    alt: float | None
    sigma_h: float
    sigma_v: float | None
    fix_time: float | None
    age: float


def _fix_key(gps: dict[str, Any]) -> tuple:
    """Identity of a physical fix.

    v5: the fix timestamp, quantised. v4 (no fixTime): the coordinate triple, which is exactly
    equal across copies because the same CLLocation object was read each time.
    """
    ft = gps.get("fixTime")
    if isinstance(ft, (int, float)):
        return ("t", round(float(ft) / FIX_TIME_EPSILON_S))
    return ("c", gps.get("lat"), gps.get("lon"), gps.get("alt"))


def _age_of(gps: dict[str, Any], keyframe_time: float | None) -> float:
    age = gps.get("age")
    if isinstance(age, (int, float)) and age >= 0:
        return float(age)
    ft = gps.get("fixTime")
    if isinstance(ft, (int, float)) and isinstance(keyframe_time, (int, float)):
        return max(0.0, float(keyframe_time) - float(ft))
    return 0.0  # v4: unknowable, and assuming staleness would discard every fix


def build_gps_priors(keyframes: Iterable[dict[str, Any]]) -> list[GpsPrior]:
    """Collapse per-keyframe GPS stamps into one weighted prior per physical fix.

    Keyframes are dicts as they appear in poses.json (`image_name`/`name`, `timestamp`, `gps`).
    Returns priors ordered by fix time; keyframes without usable GPS are dropped silently —
    an indoor capture legitimately has none, and that is not an error.
    """
    best: dict[tuple, GpsPrior] = {}

    for kf in keyframes:
        gps = kf.get("gps")
        if not isinstance(gps, dict):
            continue
        lat, lon = gps.get("lat"), gps.get("lon")
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            continue

        hacc = gps.get("hAcc")
        if not isinstance(hacc, (int, float)) or hacc <= INVALID_ACCURACY:
            continue
        hacc = max(float(hacc), MIN_CREDIBLE_HACC_M)

        age = _age_of(gps, kf.get("timestamp"))
        if age > MAX_FIX_AGE_S:
            continue

        # Reported accuracy and motion-since-fix are independent error sources.
        sigma_h = math.hypot(hacc, WALK_SPEED_MPS * age)

        vacc = gps.get("vAcc")
        alt = gps.get("alt")
        if (
            isinstance(vacc, (int, float)) and vacc > INVALID_ACCURACY
            and isinstance(alt, (int, float))
        ):
            sigma_v = max(float(vacc), MIN_SIGMA_V_M)
        else:
            alt, sigma_v = None, None

        name = kf.get("image_name") or kf.get("name")
        if not name:
            continue

        prior = GpsPrior(
            image_name=str(name), lat=float(lat), lon=float(lon), alt=alt,
            sigma_h=sigma_h, sigma_v=sigma_v,
            fix_time=gps.get("fixTime") if isinstance(gps.get("fixTime"), (int, float)) else None,
            age=age,
        )
        key = _fix_key(gps)
        incumbent = best.get(key)
        # Keep the keyframe that saw this fix freshest — it is the one the fix describes.
        if incumbent is None or prior.age < incumbent.age:
            best[key] = prior

    return sorted(best.values(), key=lambda p: (p.fix_time if p.fix_time is not None else 0.0,
                                                p.image_name))


def gps_prior_stats(priors: list[GpsPrior], raw_keyframe_count: int) -> dict[str, Any]:
    """Summary for `quality_metrics` — collapse ratio is the number worth watching."""
    if not priors:
        return {"gpsPriors": 0, "gpsKeyframesSeen": raw_keyframe_count}
    sigmas = sorted(p.sigma_h for p in priors)
    mid = sigmas[len(sigmas) // 2]
    return {
        "gpsPriors": len(priors),
        "gpsKeyframesSeen": raw_keyframe_count,
        "gpsCollapseRatio": round(raw_keyframe_count / len(priors), 2),
        "gpsMedianSigmaH": round(mid, 2),
        "gpsBestSigmaH": round(sigmas[0], 2),
        "gpsHasAltitude": any(p.sigma_v is not None for p in priors),
    }
