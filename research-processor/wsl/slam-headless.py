#!/usr/bin/env python3
"""Headless __main__ for authors' slam.py.

This file stays the multiprocessing spawn target so child processes also force
Agg before evo imports TkAgg. Does not pass --eval.
"""
import matplotlib

matplotlib.use("Agg", force=True)
_real = matplotlib.use


def _use(backend, *a, **k):
    name = str(backend).lower()
    if "tk" in name or "qt" in name:
        backend = "Agg"
    k["force"] = True
    return _real(backend, *a, **k)


matplotlib.use = _use

import os
import sys
from argparse import ArgumentParser
from datetime import datetime
from pathlib import Path

odgs = Path.home() / "slate360-engines" / "odgs-slam" / "source"
sys.path.insert(0, str(Path.home() / "slate360-engines" / "odgs-slam"))
sys.path.insert(0, str(odgs))

import torch.multiprocessing as mp
import wandb
import yaml
from gaussian_splatting.utils.system_utils import mkdir_p
from slam import SLAM
from utils.config_utils import load_config
from utils.logging_utils import Log
from no_gt_eval import apply_no_gt_save_patch

apply_no_gt_save_patch()
import queue
import threading
import torch.multiprocessing as tmp


class _InProcess(threading.Thread):
    """WSL2 cannot share CUDA tensors across spawned processes (invalid resource handle)."""

    def __init__(self, group=None, target=None, name=None, args=(), kwargs=None, daemon=None):
        super().__init__(target=target, name=name, args=args or (), kwargs=kwargs or {}, daemon=True)


class _ThreadQueue:
    def __init__(self, *args, **kwargs):
        self._q = queue.Queue()

    def put(self, item, block=True, timeout=None):
        self._q.put(item, block=block, timeout=timeout)

    def get(self, block=True, timeout=None):
        return self._q.get(block=block, timeout=timeout)

    def empty(self):
        return self._q.empty()

    def qsize(self):
        return self._q.qsize()


tmp.Process = _InProcess
tmp.Queue = _ThreadQueue

if __name__ == "__main__":
    parser = ArgumentParser(description="ODGS-SLAM (headless research wrapper)")
    parser.add_argument("--config", type=str, required=True)
    parser.add_argument("--eval", action="store_true")
    args = parser.parse_args()
    if args.eval:
        raise SystemExit("refusing --eval (enables W&B)")

    mp.set_start_method("spawn")
    config = load_config(args.config)
    save_dir = None

    if config["Results"]["save_results"]:
        mkdir_p(config["Results"]["save_dir"])
        current_datetime = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
        path = config["Dataset"]["dataset_path"].split("/")
        save_dir = os.path.join(
            config["Results"]["save_dir"], path[-3] + "_" + path[-2], current_datetime
        )
        config["Results"]["save_dir"] = save_dir
        mkdir_p(save_dir)
        with open(os.path.join(save_dir, "config.yml"), "w") as file:
            yaml.dump(config, file)
        Log("saving results in " + save_dir, tag="Eval")
        wandb.init(
            project="ODGS-SLAM",
            name=f"preview_{current_datetime}",
            config=config,
            mode=None if config["Results"]["use_wandb"] else "disabled",
        )
        wandb.define_metric("frame_idx")
        wandb.define_metric("ate*", step_metric="frame_idx")

    slam = SLAM(config, save_dir=save_dir)
    slam.run()
    wandb.finish()
    Log("Done.", tag="ODGS-SLAM")
