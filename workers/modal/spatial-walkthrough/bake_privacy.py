"""Piecewise CLIENT/PUBLIC privacy bake helpers. MASTER is never rewritten."""

from __future__ import annotations

from typing import Any


def wrap_yaw(deg: float) -> float:
    x = ((deg + 180) % 360 + 360) % 360
    return x - 180


def lerp(a: float, b: float, u: float) -> float:
    return a + (b - a) * u


def lerp_yaw(a: float, b: float, u: float) -> float:
    delta = wrap_yaw(b - a)
    return wrap_yaw(a + delta * u)


def _num(v: Any, fallback: float = 0.0) -> float:
    try:
        n = float(v)
    except (TypeError, ValueError):
        return fallback
    return n if n == n else fallback


def interpolate_keyframes(frames: list[dict[str, Any]], t: float) -> dict[str, Any] | None:
    ordered = sorted((f for f in frames if f and isinstance(f, dict)), key=lambda f: _num(f.get("t"), 0))
    if not ordered:
        return None
    if t <= _num(ordered[0].get("t")):
        return {**ordered[0], "t": t}
    last = ordered[-1]
    if t >= _num(last.get("t")):
        return {**last, "t": t}
    i = 0
    while i < len(ordered) - 1 and _num(ordered[i + 1].get("t")) < t:
        i += 1
    a, b = ordered[i], ordered[i + 1]
    span = _num(b.get("t")) - _num(a.get("t"))
    u = 0.0 if span <= 0 else (t - _num(a.get("t"))) / span
    return {
        "t": t,
        "yawCenter": lerp_yaw(_num(a.get("yawCenter"), 180), _num(b.get("yawCenter"), 180), u),
        "yawWidth": lerp(_num(a.get("yawWidth"), 64), _num(b.get("yawWidth"), 64), u),
        "pitchTop": lerp(_num(a.get("pitchTop", a.get("pitchMax")), -18), _num(b.get("pitchTop", b.get("pitchMax")), -18), u),
        "pitchBottom": lerp(_num(a.get("pitchBottom", a.get("pitchMin")), -88), _num(b.get("pitchBottom", b.get("pitchMin")), -88), u),
        "nadirRadius": lerp(_num(a.get("nadirRadius"), 0.22), _num(b.get("nadirRadius"), 0.22), u),
        "feather": lerp(_num(a.get("feather"), 0), _num(b.get("feather"), 0), u),
        "style": a.get("style") if u < 0.5 else b.get("style"),
    }


def interpolate_orientation(frames: list[dict[str, Any]], t: float) -> dict[str, float]:
    ordered = sorted((f for f in frames if f and isinstance(f, dict)), key=lambda f: _num(f.get("t"), 0))
    zero = {"t": t, "rollDeg": 0.0, "pitchDeg": 0.0, "yawDeg": 0.0}
    if not ordered:
        return zero
    if t <= _num(ordered[0].get("t")):
        return {
            "t": t,
            "rollDeg": _num(ordered[0].get("rollDeg")),
            "pitchDeg": _num(ordered[0].get("pitchDeg")),
            "yawDeg": wrap_yaw(_num(ordered[0].get("yawDeg"))),
        }
    last = ordered[-1]
    if t >= _num(last.get("t")):
        return {
            "t": t,
            "rollDeg": _num(last.get("rollDeg")),
            "pitchDeg": _num(last.get("pitchDeg")),
            "yawDeg": wrap_yaw(_num(last.get("yawDeg"))),
        }
    i = 0
    while i < len(ordered) - 1 and _num(ordered[i + 1].get("t")) < t:
        i += 1
    a, b = ordered[i], ordered[i + 1]
    span = _num(b.get("t")) - _num(a.get("t"))
    u = 0.0 if span <= 0 else (t - _num(a.get("t"))) / span
    return {
        "t": t,
        "rollDeg": lerp(_num(a.get("rollDeg")), _num(b.get("rollDeg")), u),
        "pitchDeg": lerp(_num(a.get("pitchDeg")), _num(b.get("pitchDeg")), u),
        "yawDeg": lerp_yaw(_num(a.get("yawDeg")), _num(b.get("yawDeg")), u),
    }


def split_times(duration: float, keyframe_ts: list[float], skip_iv: list[tuple[float, float]]) -> list[float]:
    marks = {0.0, max(duration, 0.0)}
    for t in keyframe_ts:
        if 0 < t < duration:
            marks.add(round(t, 3))
    for start, end in skip_iv:
        if 0 < start < duration:
            marks.add(round(start, 3))
        if 0 < end < duration:
            marks.add(round(end, 3))
    return sorted(marks)


def in_skip(t: float, skip_iv: list[tuple[float, float]]) -> bool:
    for start, end in skip_iv:
        if start <= t < end:
            return True
    return False


def keep_segments(duration: float, keyframe_ts: list[float], skip_iv: list[tuple[float, float]]) -> list[tuple[float, float]]:
    times = split_times(duration, keyframe_ts, skip_iv)
    out: list[tuple[float, float]] = []
    for i in range(len(times) - 1):
        a, b = times[i], times[i + 1]
        if b - a < 0.04:
            continue
        mid = (a + b) / 2
        if in_skip(mid, skip_iv):
            continue
        out.append((a, b))
    return out


def frame_to_patch(frame: dict[str, Any], base: dict[str, Any] | None = None) -> dict[str, Any]:
    seed = dict(base or {})
    seed.update({
        "enabled": True,
        "rearYawCenter": _num(frame.get("yawCenter"), seed.get("rearYawCenter", 180)),
        "rearYawWidth": _num(frame.get("yawWidth"), seed.get("rearYawWidth", 64)),
        "pitchMax": _num(frame.get("pitchTop"), seed.get("pitchMax", -18)),
        "pitchMin": _num(frame.get("pitchBottom"), seed.get("pitchMin", -88)),
        "nadirRadius": _num(frame.get("nadirRadius"), seed.get("nadirRadius", 0.22)),
        "nadirVerticalExtent": _num(frame.get("nadirRadius"), seed.get("nadirVerticalExtent", 0.22)),
        "style": frame.get("style") or seed.get("style") or "solid",
        "feather": _num(frame.get("feather"), 0),
    })
    return seed


def union_patches_at(
    regions: list[list[dict[str, Any]]],
    t: float,
    fallback: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    patches: list[dict[str, Any]] = []
    for frames in regions:
        frame = interpolate_keyframes(frames, t)
        if frame:
            patches.append(frame_to_patch(frame, fallback))
    if not patches and fallback and fallback.get("enabled") is not False:
        patches.append(dict(fallback))
    return patches
