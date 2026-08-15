"""Tests for the poses-v6 photo→image filename join in build_pose_prior_keyframes.

Photos-mode captures upload stills (e.g. twin_photo_3.jpg) that materialize_images
writes as "{sanitize_stem(stem)}_{idx:04d}.jpg". Their pose frames carry
`"photo": <upload filename>` and no clip time base, so they must join by filename,
not timestamp — and only when the stem maps one frame to exactly one image.

Run: python test_photo_pose_join.py
"""

from __future__ import annotations

import sys
import tempfile
import types
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

# worker.py imports modal at module scope; stub it so these pure-function tests run anywhere.
if "modal" not in sys.modules:
    stub = types.ModuleType("modal")

    class _Img:
        def __getattr__(self, _):
            return lambda *a, **k: self

    class _App:
        def __init__(self, *a, **k):
            pass

        def function(self, *a, **k):
            return lambda fn: fn

        def local_entrypoint(self, *a, **k):
            return lambda fn: fn

    stub.App = _App
    stub.Image = types.SimpleNamespace(
        from_registry=lambda *a, **k: _Img(), debian_slim=lambda *a, **k: _Img()
    )
    stub.Volume = types.SimpleNamespace(from_name=lambda *a, **k: object())
    stub.Secret = types.SimpleNamespace(from_name=lambda *a, **k: object())
    _decorator = lambda *a, **k: (lambda fn: fn)  # noqa: E731
    for _name in ("enter", "method", "fastapi_endpoint", "web_endpoint", "asgi_app"):
        setattr(stub, _name, _decorator)
    sys.modules["modal"] = stub

from worker import build_pose_prior_keyframes, sanitize_stem  # noqa: E402

results: list[bool] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    results.append(bool(cond))
    print(f"  [{'PASS' if cond else 'FAIL'}] {name}" + (f"  ({detail})" if detail else ""))


def transform_at(px: float, py: float, pz: float) -> list[float]:
    """Column-major 4x4 identity rotation with the given translation."""
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, px, py, pz, 1]


def photo_frame(photo: str, ts: float, pos=(0.0, 0.0, 0.0), **extra) -> dict:
    frame = {
        "timestamp": ts,
        "transform_4x4": transform_at(*pos),
        "tracking_state": "normal",
        "gravity": [0.0, -1.0, 0.0],
        "photo": photo,
    }
    frame.update(extra)
    return frame


def clip_frame(ts: float, pos=(0.0, 0.0, 0.0)) -> dict:
    return {
        "timestamp": ts,
        "transform_4x4": transform_at(*pos),
        "tracking_state": "normal",
        "clip_index": 0,
    }


def make_images(images_dir: Path, names: list[str]) -> None:
    images_dir.mkdir(parents=True, exist_ok=True)
    for name in names:
        (images_dir / name).write_bytes(b"\xff\xd8\xff\xd9")


def test_photo_filename_join() -> None:
    print("\nPhoto filename join")
    with tempfile.TemporaryDirectory() as tmp:
        images_dir = Path(tmp) / "images"
        make_images(images_dir, ["twin_photo_3_0007.jpg", "twin_photo_4_0008.jpg"])
        poses = {"frames": [
            photo_frame("twin_photo_3.jpg", 100.0, pos=(1.0, 2.0, 3.0)),
            photo_frame("twin_photo_4.jpg", 105.0, pos=(4.0, 5.0, 6.0)),
        ]}
        keyframes = build_pose_prior_keyframes(poses, images_dir, frame_abs_times={})
        check("both photos joined", len(keyframes) == 2, f"{len(keyframes)}/2")
        by_name = {k.image_name: k for k in keyframes}
        kf3 = by_name.get("twin_photo_3_0007.jpg")
        check("joined to the materialized image name", kf3 is not None)
        check("position comes from the column-major transform",
              kf3 is not None and kf3.position == (1.0, 2.0, 3.0),
              str(kf3.position) if kf3 else "-")
        check("gravity carried through", kf3 is not None and kf3.gravity == (0.0, -1.0, 0.0))
        check("timestamp carried through", kf3 is not None and kf3.timestamp == 100.0)


def test_stem_disambiguation() -> None:
    print("\nStem disambiguation guards")
    with tempfile.TemporaryDirectory() as tmp:
        # twin_photo_1 must not swallow twin_photo_10's materialized image.
        images_dir = Path(tmp) / "images"
        make_images(images_dir, ["twin_photo_1_0002.jpg", "twin_photo_10_0003.jpg"])
        poses = {"frames": [
            photo_frame("twin_photo_1.jpg", 10.0, pos=(1.0, 0.0, 0.0)),
            photo_frame("twin_photo_10.jpg", 20.0, pos=(10.0, 0.0, 0.0)),
        ]}
        keyframes = build_pose_prior_keyframes(poses, images_dir, frame_abs_times={})
        by_name = {k.image_name: k.position[0] for k in keyframes}
        check("prefix stems stay separate", by_name == {
            "twin_photo_1_0002.jpg": 1.0, "twin_photo_10_0003.jpg": 10.0}, str(by_name))

    with tempfile.TemporaryDirectory() as tmp:
        # Same upload filename materialized twice (two source keys) — ambiguous, omit.
        images_dir = Path(tmp) / "images"
        make_images(images_dir, ["twin_photo_2_0001.jpg", "twin_photo_2_0004.jpg"])
        poses = {"frames": [photo_frame("twin_photo_2.jpg", 10.0)]}
        keyframes = build_pose_prior_keyframes(poses, images_dir, frame_abs_times={})
        check("duplicate materialized stems are omitted", keyframes == [], str(keyframes))

    with tempfile.TemporaryDirectory() as tmp:
        # Two pose frames tagging the same photo — ambiguous, omit.
        images_dir = Path(tmp) / "images"
        make_images(images_dir, ["twin_photo_5_0000.jpg"])
        poses = {"frames": [
            photo_frame("twin_photo_5.jpg", 10.0),
            photo_frame("twin_photo_5.jpg", 11.0),
        ]}
        keyframes = build_pose_prior_keyframes(poses, images_dir, frame_abs_times={})
        check("duplicate photo tags are omitted", keyframes == [], str(keyframes))

    with tempfile.TemporaryDirectory() as tmp:
        # Photo frame with no materialized image — omitted, no crash.
        images_dir = Path(tmp) / "images"
        make_images(images_dir, ["clip_a_0000.jpg"])
        poses = {"frames": [photo_frame("twin_photo_9.jpg", 10.0)]}
        keyframes = build_pose_prior_keyframes(poses, images_dir, frame_abs_times={})
        check("unmatched photo frame is omitted", keyframes == [])


def test_sanitized_stems_match() -> None:
    print("\nStem sanitization symmetry")
    original = "twin photo (3).jpg"
    stem = sanitize_stem(Path(original).stem)
    with tempfile.TemporaryDirectory() as tmp:
        images_dir = Path(tmp) / "images"
        make_images(images_dir, [f"{stem}_0001.jpg"])
        poses = {"frames": [photo_frame(original, 10.0, pos=(7.0, 8.0, 9.0))]}
        keyframes = build_pose_prior_keyframes(poses, images_dir, frame_abs_times={})
        check("sanitized upload name joins its sanitized image",
              len(keyframes) == 1 and keyframes[0].image_name == f"{stem}_0001.jpg",
              f"stem={stem!r}")


def test_coexists_with_timestamp_join() -> None:
    print("\nCoexistence with the timestamp join")
    with tempfile.TemporaryDirectory() as tmp:
        images_dir = Path(tmp) / "images"
        make_images(images_dir, ["clip_a_0000.jpg", "clip_a_0001.jpg", "twin_photo_3_0002.jpg"])
        poses = {"frames": [
            clip_frame(50.0, pos=(0.0, 0.0, 0.0)),
            clip_frame(51.0, pos=(0.5, 0.0, 0.0)),
            photo_frame("twin_photo_3.jpg", 200.0, pos=(9.0, 9.0, 9.0)),
        ]}
        frame_abs_times = {"clip_a_0000.jpg": 50.0, "clip_a_0001.jpg": 51.0}
        keyframes = build_pose_prior_keyframes(poses, images_dir, frame_abs_times)
        names = sorted(k.image_name for k in keyframes)
        check("video frames still join by timestamp and the photo by filename",
              names == ["clip_a_0000.jpg", "clip_a_0001.jpg", "twin_photo_3_0002.jpg"],
              str(names))
        by_name = {k.image_name: k for k in keyframes}
        check("photo keyframe uses the photo pose, not a timestamp neighbour",
              by_name["twin_photo_3_0002.jpg"].position == (9.0, 9.0, 9.0))

    with tempfile.TemporaryDirectory() as tmp:
        # A video-extracted frame whose stem collides with a photo tag must not be
        # claimed by the filename join — frame_abs_times ownership wins.
        images_dir = Path(tmp) / "images"
        make_images(images_dir, ["twin_photo_3_0000.jpg"])
        poses = {"frames": [photo_frame("twin_photo_3.jpg", 999.0, pos=(9.0, 9.0, 9.0))]}
        # The image exists but belongs to a video (it has an abs time); the pose frame's
        # timestamp is far outside tolerance, so NOTHING should join.
        keyframes = build_pose_prior_keyframes(
            poses, images_dir, frame_abs_times={"twin_photo_3_0000.jpg": 50.0}
        )
        check("video-owned images are not claimed by the filename join",
              keyframes == [], str(keyframes))


def test_bad_transform_omitted() -> None:
    print("\nUnusable frames")
    with tempfile.TemporaryDirectory() as tmp:
        images_dir = Path(tmp) / "images"
        make_images(images_dir, ["twin_photo_1_0000.jpg"])
        frame = photo_frame("twin_photo_1.jpg", 10.0)
        frame["transform_4x4"] = [1.0, 2.0, 3.0]  # wrong length
        keyframes = build_pose_prior_keyframes({"frames": [frame]}, images_dir, {})
        check("malformed transform is omitted", keyframes == [])


def main() -> int:
    test_photo_filename_join()
    test_stem_disambiguation()
    test_sanitized_stems_match()
    test_coexists_with_timestamp_join()
    test_bad_transform_omitted()
    passed, total = sum(results), len(results)
    print(f"\n{passed}/{total} passed\n")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
