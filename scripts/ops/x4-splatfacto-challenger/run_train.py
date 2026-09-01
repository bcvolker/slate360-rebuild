"""Train Splatfacto A (baseline) or B (bilateral grid). Camera optimizer stays off."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from paths import CONFIG, SHARED, SPLAT_RUN, ns_train  # noqa: E402
from train_args import build_train_args, camera_optimizer_is_off  # noqa: E402


def sample_vram(stop: threading.Event, samples: list[int]) -> None:
    while not stop.wait(2.0):
        try:
            out = subprocess.check_output(
                ["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
                text=True,
            )
            samples.append(int(out.strip().splitlines()[0].split()[0]))
        except Exception:
            return


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--experiment", required=True, choices=("A", "B"))
    p.add_argument("--data", default=str(SHARED))
    p.add_argument("--out", default=str(SPLAT_RUN))
    p.add_argument("--iterations", type=int, default=int(CONFIG["max_num_iterations"]))
    args = p.parse_args()

    data = Path(args.data)
    meta = json.loads((data / "DATASET.json").read_text())
    scene_scale = float(meta["scene_scale"])
    out = Path(args.out)
    exp_dir = out / args.experiment
    exp_dir.mkdir(parents=True, exist_ok=True)
    bilateral = args.experiment == "B"
    argv = build_train_args(
        data,
        exp_dir,
        bilateral_grid=bilateral,
        iterations=args.iterations,
        scene_scale=scene_scale,
        experiment=args.experiment,
    )
    if not camera_optimizer_is_off(argv):
        raise SystemExit("refusing to train: camera optimizer is not off")
    argv[0] = str(ns_train())
    (exp_dir / "train_argv.json").write_text(json.dumps(argv, indent=2) + "\n")

    env = os.environ.copy()
    env["HOME"] = "/home/rian_"
    env["PYTHONIOENCODING"] = "utf-8"
    env["CUDA_VISIBLE_DEVICES"] = "0"
    samples: list[int] = []
    stop = threading.Event()
    sampler = threading.Thread(target=sample_vram, args=(stop, samples), daemon=True)
    sampler.start()
    t0 = time.time()
    log_path = exp_dir / "train.log"
    print(" ".join(argv), flush=True)
    with log_path.open("w", encoding="utf-8") as log:
        proc = subprocess.run(argv, cwd=str(exp_dir), env=env, stdout=log, stderr=subprocess.STDOUT)
    runtime = time.time() - t0
    stop.set()
    sampler.join(timeout=5)
    stats = {
        "experiment": args.experiment,
        "bilateral_grid": bilateral,
        "camera_optimizer": "off",
        "rasterize_mode": "classic",
        "iterations": args.iterations,
        "runtime_sec": runtime,
        "peak_vram_mib": max(samples) if samples else None,
        "exit_code": proc.returncode,
        "argv": argv,
    }
    (exp_dir / "TRAIN_STATS.json").write_text(json.dumps(stats, indent=2) + "\n")
    print(json.dumps({k: stats[k] for k in ("experiment", "runtime_sec", "peak_vram_mib", "exit_code")}, indent=2))
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
