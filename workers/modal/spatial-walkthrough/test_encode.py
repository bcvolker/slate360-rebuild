"""Encode helper tests — no Modal runtime required."""

from ingest import callback_base_url, gop_for_fps
from bake_privacy import interpolate_keyframes, keep_segments, lerp_yaw, wrap_yaw


def test_gop_near_one_second():
    assert gop_for_fps(29.97) == 30
    assert gop_for_fps(30) == 30
    assert gop_for_fps(60) == 60
    assert gop_for_fps(0) == 30


def test_callback_allowlist(monkeypatch):
    monkeypatch.setenv("SITE_URL", "https://www.slate360.ai")
    assert callback_base_url({}) == "https://www.slate360.ai"
    assert callback_base_url({"callbackBaseUrl": "https://spatial-live-smoke.vercel.app"}) == (
        "https://spatial-live-smoke.vercel.app"
    )
    assert callback_base_url({"callbackBaseUrl": "https://evil.example"}) == "https://www.slate360.ai"
    assert callback_base_url({"callbackBaseUrl": "http://127.0.0.1:3000"}) == "http://127.0.0.1:3000"


def test_lerp_yaw_shortest_path():
    mid = lerp_yaw(170, -170, 0.5)
    assert abs(abs(wrap_yaw(mid)) - 180) < 0.01


def test_piecewise_skip_omits_excluded_range():
    a = {"t": 0, "yawCenter": 180, "yawWidth": 40, "pitchTop": -10, "pitchBottom": -70, "nadirRadius": 0.2, "feather": 0}
    b = {"t": 10, "yawCenter": 180, "yawWidth": 90, "pitchTop": 8, "pitchBottom": -28, "nadirRadius": 0.38, "feather": 0}
    segs = keep_segments(20, [0, 10], [(4, 8)])
    assert segs[0][0] == 0.0
    assert not any(start <= 6 < end for start, end in segs)
    mid = interpolate_keyframes([a, b], 5)
    assert mid is not None
    assert mid["yawWidth"] == 65


def test_union_patches_keep_independent_regions():
    from bake_privacy import union_patches_at

    rear = [{"t": 0, "yawCenter": 180, "yawWidth": 40, "pitchTop": -10, "pitchBottom": -70, "nadirRadius": 0.2}]
    panel = [{"t": 0, "yawCenter": 20, "yawWidth": 30, "pitchTop": 0, "pitchBottom": -20, "nadirRadius": 0.1}]
    patches = union_patches_at([rear, panel], 0, {"enabled": True, "rearYawCenter": 180, "rearYawWidth": 64})
    assert len(patches) == 2
    assert patches[0]["rearYawCenter"] == 180
    assert patches[1]["rearYawCenter"] == 20
