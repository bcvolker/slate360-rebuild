"""Empirical verification, required before launch: does exp6_instrumentation.py's
track-only snapshot path (the one that fires unconditionally for BOTH K6 and L6) actually
leave training behavior unchanged? Runs three tiny (50-step) real training jobs on the real
grouped-safe dataset -- baseline (no instrumentation), tracked (SPLAT_LAB_EXP6_SCALE_TRACK_STEPS
set, like both K6 and L6), and pruned (track + SPLAT_LAB_EXP6_LATE_PRUNE_STEP set, like L6) --
and compares final Gaussian count, exit code, and step reached. Read-only against the frozen
dataset; writes only to a scratch directory.

Also replicates the EXACT wrap-status.json consumption train_arm_exp6.py's run_arm() does
(json.loads(wrap_path.read_text())) for every run. This is not redundant with checking
training behavior: the 2026-09-18 incident had unchanged training behavior (checkpoints,
exit code, step count all identical) but still lost both arms' results, because
exp6_instrumentation.py's snapshot logger was appending JSON-lines into the same file
ns_train_wrap.py writes as a single JSON object, breaking run_arm()'s parse of it in
post-processing -- a code path this smoke test previously never exercised.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


def _run(*, data_dir: Path, out_dir: Path, extra_env: dict[str, str], wrap: Path) -> dict:
    cmd = [
        sys.executable, str(wrap), "splatfacto",
        "--data", str(data_dir),
        "--output-dir", str(out_dir),
        "--max-num-iterations", "50",
        "--machine.seed", "42",
        "--pipeline.model.sh-degree", "3",
        "--pipeline.model.sh-degree-interval", "533",
        "--pipeline.model.warmup-length", "6016",
        "--pipeline.model.refine-every", "100",
        "--pipeline.model.reset-alpha-every", "30",
        "--pipeline.model.cull-alpha-thresh", "0.005",
        "--pipeline.model.cull-scale-thresh", "0.08",
        "--pipeline.model.densify-grad-thresh", "0.0008",
        "--pipeline.model.use-absgrad", "True",
        "--pipeline.model.stop-split-at", "11000",
        "--pipeline.model.stop-screen-size-at", "4000",
        "--pipeline.model.use-bilateral-grid", "True",
        "--pipeline.model.use-scale-regularization", "True",
        "--pipeline.datamanager.cache-images", "cpu",
        "--pipeline.datamanager.cache-images-type", "uint8",
        "--pipeline.datamanager.masks-on-gpu", "False",
        "--logging.local-writer.enable", "True",
        "--logging.steps-per-log", "10",
        "--steps-per-save", "10",
        "--save-only-latest-checkpoint", "False",
        "--steps-per-eval-batch", "100000",
        "--steps-per-eval-image", "100000",
        "--steps-per-eval-all-images", "100000",
        "--vis", "tensorboard",
    ]
    env = dict(os.environ)
    env.update({
        "SPLAT_LAB_EXP3": "1",
        "EXP3_STATUS_DIR": str(out_dir),
        "EXP3_MAX_LIVE_GAUSSIANS": "3500000",
        "SPLAT_LAB_WRAP_STATUS_PATH": str(out_dir / "wrap-status.json"),
    })
    env.update(extra_env)
    out_dir.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=900, env=env)
    log = out_dir / "smoke.log"
    log.write_text(proc.stdout + "\n" + proc.stderr, encoding="utf-8")
    snapshots = [json.loads(line[len("EXP6_SCALE_SNAPSHOT "):])
                 for line in proc.stdout.splitlines() if line.startswith("EXP6_SCALE_SNAPSHOT ")]
    ckpts = sorted(out_dir.rglob("step-*.ckpt"))

    # Replicate train_arm_exp6.run_arm()'s exact wrap-status.json consumption -- the code
    # path the 2026-09-18 incident crashed in, which this smoke test previously never ran.
    wrap_path = out_dir / "wrap-status.json"
    wrap_parse_ok = True
    wrap_parse_error = None
    if wrap_path.is_file():
        try:
            json.loads(wrap_path.read_text())
        except Exception as e:  # noqa: BLE001 -- must catch exactly what run_arm() would hit
            wrap_parse_ok = False
            wrap_parse_error = f"{type(e).__name__}: {e}"

    return {
        "exit_code": proc.returncode,
        "n_checkpoints": len(ckpts),
        "last_checkpoint": ckpts[-1].name if ckpts else None,
        "snapshots": snapshots,
        "armed_line": next((l for l in proc.stdout.splitlines() if "EXP6_INSTRUMENTATION_ARMED" in l), None),
        "wrap_status_json_parse_ok": wrap_parse_ok,
        "wrap_status_json_parse_error": wrap_parse_error,
        "log_tail": (proc.stdout + proc.stderr)[-1500:],
    }


def main() -> None:
    vol = Path("/vol")
    data_dir = vol / "inputs" / "cecc2763" / "views-exp5-grouped"
    work = Path("/tmp") / "exp6-smoke"
    import shutil
    if work.exists():
        shutil.rmtree(work)
    wrap = Path("/root/splat-lab/ns_train_wrap.py")

    baseline = _run(data_dir=data_dir, out_dir=work / "baseline", extra_env={}, wrap=wrap)
    tracked = _run(data_dir=data_dir, out_dir=work / "tracked",
                    extra_env={"SPLAT_LAB_EXP6_SCALE_TRACK_STEPS": "20,40"}, wrap=wrap)
    pruned = _run(data_dir=data_dir, out_dir=work / "pruned",
                  extra_env={"SPLAT_LAB_EXP6_SCALE_TRACK_STEPS": "20,40",
                             "SPLAT_LAB_EXP6_LATE_PRUNE_STEP": "30",
                             "SPLAT_LAB_EXP6_LATE_PRUNE_THRESH": "0.08"}, wrap=wrap)

    out = {
        "baseline": {k: v for k, v in baseline.items() if k != "log_tail"},
        "tracked": {k: v for k, v in tracked.items() if k != "log_tail"},
        "pruned": {k: v for k, v in pruned.items() if k != "log_tail"},
        "comparison": {
            "all_exit_0": baseline["exit_code"] == 0 and tracked["exit_code"] == 0 and pruned["exit_code"] == 0,
            "same_n_checkpoints_baseline_vs_tracked": baseline["n_checkpoints"] == tracked["n_checkpoints"],
            "same_last_checkpoint_baseline_vs_tracked": baseline["last_checkpoint"] == tracked["last_checkpoint"],
            "tracked_run_produced_2_snapshots": len(tracked["snapshots"]) == 2,
            "tracked_run_no_removal": all("n_removed" not in s for s in tracked["snapshots"]),
            "pruned_run_produced_post_prune_snapshot": any(
                s.get("phase") == "post_prune" for s in pruned["snapshots"]
            ),
            "all_wrap_status_json_parse_ok": (
                baseline["wrap_status_json_parse_ok"]
                and tracked["wrap_status_json_parse_ok"]
                and pruned["wrap_status_json_parse_ok"]
            ),
        },
    }
    print(json.dumps(out, indent=2, default=str))
    if not out["comparison"]["all_exit_0"] or not out["comparison"]["all_wrap_status_json_parse_ok"]:
        print("BASELINE LOG TAIL:", baseline["log_tail"])
        print("TRACKED LOG TAIL:", tracked["log_tail"])
        print("PRUNED LOG TAIL:", pruned["log_tail"])


if __name__ == "__main__":
    main()
