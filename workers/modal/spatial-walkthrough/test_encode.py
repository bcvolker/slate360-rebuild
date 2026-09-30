"""Encode helper tests — no Modal runtime required."""

from ingest import callback_base_url, gop_for_fps


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
