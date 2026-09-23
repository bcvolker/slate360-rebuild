"""Policy tests for the Room 213 watchdog. No Modal calls."""
from datetime import datetime, timedelta, timezone

from room213_watchdog import decide, external_cpu_build_running

NOW = datetime(2026, 9, 21, 20, 40, tzinfo=timezone.utc)


def _status(stage: str, age_s: int, error: str | None = None) -> dict:
    stamp = (NOW - timedelta(seconds=age_s)).isoformat()
    return {"stage": stage, "timestamp_utc": stamp, "last_error": error}


def test_detached_run_blocks_a_second_build():
    apps = [{"description": "slate360-recon-experiment", "state": "detached", "n_running_tasks": 1}]
    assert external_cpu_build_running(apps) is True
    out = decide(
        status=None, verdict=None, now=NOW, build_running=False, stage1_running=False,
        external_build_running=True, external_check_ok=True, stage1_summary_exists=False, state={},
    )
    assert out["action"] == "wait"


def test_stage1_launches_once_on_training_ready():
    verdict = {"dataset": "TRAINING READY"}
    first = decide(
        status=_status("finished", 30), verdict=verdict, now=NOW, build_running=False,
        stage1_running=False, external_build_running=False, external_check_ok=True,
        stage1_summary_exists=False, state={},
    )
    assert first["action"] == "launch_stage1"
    second = decide(
        status=_status("finished", 30), verdict=verdict, now=NOW, build_running=False,
        stage1_running=False, external_build_running=False, external_check_ok=True,
        stage1_summary_exists=False, state=first["state"],
    )
    assert second["action"] == "wait"


def test_deterministic_error_halts_and_does_not_relaunch():
    out = decide(
        status=_status("failed", 30, "ValueError: rig solve diverged"), verdict=None, now=NOW,
        build_running=False, stage1_running=False, external_build_running=False,
        external_check_ok=True, stage1_summary_exists=False, state={},
    )
    assert out["action"] == "halt"
    again = decide(
        status=_status("failed", 30, "ValueError: rig solve diverged"), verdict=None, now=NOW,
        build_running=False, stage1_running=False, external_build_running=False,
        external_check_ok=True, stage1_summary_exists=False, state=out["state"],
    )
    assert again["action"] == "halt"


def test_stale_stage_relaunches_at_most_three_times():
    state: dict = {}
    for _ in range(3):
        out = decide(
            status=_status("faces", 20 * 60), verdict=None, now=NOW, build_running=False,
            stage1_running=False, external_build_running=False, external_check_ok=True,
            stage1_summary_exists=False, state=state,
        )
        assert out["action"] == "launch_build"
        state = out["state"]
    halted = decide(
        status=_status("faces", 20 * 60), verdict=None, now=NOW, build_running=False,
        stage1_running=False, external_build_running=False, external_check_ok=True,
        stage1_summary_exists=False, state=state,
    )
    assert halted["action"] == "halt"


def test_unknown_app_list_does_not_launch():
    out = decide(
        status=None, verdict=None, now=NOW, build_running=False, stage1_running=False,
        external_build_running=False, external_check_ok=False, stage1_summary_exists=False, state={},
    )
    assert out["action"] == "wait"


if __name__ == "__main__":
    test_detached_run_blocks_a_second_build()
    test_stage1_launches_once_on_training_ready()
    test_deterministic_error_halts_and_does_not_relaunch()
    test_stale_stage_relaunches_at_most_three_times()
    test_unknown_app_list_does_not_launch()
    print("ok")
