"""Tests for train-profile / metric-authority separation.

The load-bearing invariant: a splat that is presented as agreeing with the mesh must have been
trained with the cameras frozen. Run: python test_train_profiles.py
"""

from __future__ import annotations

import sys
import types
from pathlib import Path

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

from worker import POSE_REFINING_PROFILES, build_train_args, is_metric_authority  # noqa: E402

FAILURES: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    if cond:
        print(f"  ok   {name}")
    else:
        print(f"  FAIL {name} {detail}")
        FAILURES.append(name)


def opt_value(args: list[str], flag: str) -> str | None:
    return args[args.index(flag) + 1] if flag in args else None


def args_for(profile: str) -> list[str]:
    return build_train_args(Path("/in"), Path("/out"), 30_000, profile)


CAM = "--pipeline.model.camera-optimizer.mode"


def test_camera_optimizer_is_always_explicit():
    for profile in ("baseline", "quality", "visual"):
        check(f"{profile}: camera optimizer stated explicitly, not left to a library default",
              CAM in args_for(profile))


def test_metric_profiles_freeze_cameras():
    for profile in ("baseline", "quality"):
        check(f"{profile}: cameras frozen", opt_value(args_for(profile), CAM) == "off",
              f"got {opt_value(args_for(profile), CAM)}")


def test_visual_profile_refines_and_is_marked_non_metric():
    check("visual: cameras refined", opt_value(args_for("visual"), CAM) == "SO3xR3")
    check("visual: flagged non-metric", is_metric_authority("visual") is False)
    check("visual is the only pose-refining profile", POSE_REFINING_PROFILES == {"visual"})


def test_metric_authority_matches_the_flag_actually_passed():
    # The invariant that matters: the recorded flag must never disagree with the argv.
    for profile in ("baseline", "quality", "visual", "unknown_profile"):
        frozen = opt_value(args_for(profile), CAM) == "off"
        check(f"{profile}: metricAuthority agrees with argv",
              is_metric_authority(profile) == frozen,
              f"authority={is_metric_authority(profile)} frozen={frozen}")


def test_quality_keeps_its_appearance_flags():
    q = args_for("quality")
    check("quality: bilateral grid on", opt_value(q, "--pipeline.model.use-bilateral-grid") == "True")
    check("quality: antialiased raster",
          opt_value(q, "--pipeline.model.rasterize-mode") == "antialiased")
    check("quality: denser densification",
          opt_value(q, "--pipeline.model.densify-grad-thresh") == "0.0005")


def test_visual_is_quality_plus_pose_refinement():
    q, v = args_for("quality"), args_for("visual")
    diff = [a for a in v if a not in q] + [a for a in q if a not in v]
    check("visual differs from quality ONLY in the camera optimizer",
          set(diff) <= {"SO3xR3", "off"}, f"diff={diff}")


def test_baseline_has_no_enhancement_flags():
    b = args_for("baseline")
    for flag in ("--pipeline.model.use-bilateral-grid", "--pipeline.model.rasterize-mode",
                 "--pipeline.model.densify-grad-thresh", "--pipeline.model.max-gauss-ratio"):
        check(f"baseline: {flag} absent", flag not in b)


def test_unknown_profile_is_safe():
    check("unknown profile falls back to metric", is_metric_authority("nonsense") is True)
    check("unknown profile freezes cameras", opt_value(args_for("nonsense"), CAM) == "off")


if __name__ == "__main__":
    for fn in [v for k, v in sorted(globals().items()) if k.startswith("test_")]:
        print(fn.__name__)
        fn()
    print()
    if FAILURES:
        raise SystemExit(f"{len(FAILURES)} failed: {FAILURES}")
    print("all train-profile tests passed")
