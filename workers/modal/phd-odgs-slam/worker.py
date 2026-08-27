"""PhD-research ODGS-SLAM on Modal.

Imperial College licence: non-commercial academic research only. This app must
stay isolated from production twin workers, Trigger tasks, and customer APIs.
Do not import this module from Next.js or from workers/modal/twin-gaussian-splat.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import modal

from smoke_data import write_smoke_panoramas

APP_NAME = "slate360-phd-odgs-slam"
ODGS_SHA = "1efc06fc7ad5e9eb552da58daecac41a2d9a8cf3"
ODGS_DIR = "/opt/odgs-slam"
SMOKE_FRAMES = 8

app = modal.App(APP_NAME)

odgs_image = (
    modal.Image.from_registry("nvidia/cuda:12.6.0-devel-ubuntu22.04", add_python="3.10")
    .apt_install(
        "git",
        "build-essential",
        "ninja-build",
        "libgl1",
        "libglib2.0-0",
        "libegl1",
        "libglfw3",
        "libgomp1",
        "xvfb",
        "ca-certificates",
        "wget",
    )
    .run_commands(
        f"git clone --recursive https://github.com/odgs-slam/odgs-slam.git {ODGS_DIR}",
        f"cd {ODGS_DIR} && git checkout {ODGS_SHA} && git submodule update --init --recursive",
    )
    .run_commands(
        "pip install torch==2.5.1 torchvision==0.20.1 "
        "--index-url https://download.pytorch.org/whl/cu124",
    )
    .run_commands(
        f"cd {ODGS_DIR} && pip install pyyaml scipy pillow && pip install -r requirements_general.txt",
        f"cd {ODGS_DIR}/submodules/simple-knn && git apply ../simple-knn_glog-and-flt-limits.patch",
        f"cd {ODGS_DIR}/submodules/diff-gaussian-rasterization && git apply ../diff-gaussian-rasterization_glog-cstdint-and-lerpcpp20.patch",
        f"cd {ODGS_DIR}/submodules/omni-gaussian-rasterization && git apply ../omni-gaussian-rasterization_glog-and-cstdint.patch",
        f"cd {ODGS_DIR} && "
        "export TORCH_CUDA_ARCH_LIST='8.6' CC=gcc CXX=g++ && "
        "pip install submodules/simple-knn && "
        "pip install submodules/diff-gaussian-rasterization && "
        "pip install submodules/omni-gaussian-rasterization",
    )
    .env(
        {
            "WANDB_MODE": "disabled",
            "PYOPENGL_PLATFORM": "egl",
            "PYTHONUNBUFFERED": "1",
        }
    )
    .add_local_python_source("smoke_data")
)


def _write_smoke_config(cam_dir: Path, save_dir: Path) -> Path:
    cfg = save_dir / "smoke.yml"
    cfg.write_text(
        "\n".join(
            [
                f"inherit_from: {ODGS_DIR}/configs/rgb/rgb_render_ex_r1.yml",
                "Dataset:",
                f"  dataset_path: {cam_dir.as_posix()}",
                f"  max_num_frames: {SMOKE_FRAMES}",
                "  image_downsample: 1",
                "  Calibration:",
                "    cx: 256.0",
                "    cy: 128.0",
                "    height: 256",
                "    width: 512",
                "    depth_scale: 1.0",
                "Results:",
                "  use_gui: false",
                "  use_wandb: false",
                "  eval_rendering: false",
                "  save_results: true",
                f"  save_dir: {save_dir.as_posix()}",
                "Training:",
                "  init_itr_num: 200",
                "  mapping_itr_num: 20",
                "  tracking_itr_num: 20",
                "  single_thread: true",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    return cfg


@app.function(
    image=odgs_image,
    gpu="A10G",
    timeout=20 * 60,
    memory=32768,
)
def run_smoke() -> dict:
    """Authors' slam.py, 8 tiny ERP frames, GUI off. Not the 193 GB zip."""
    work = Path("/tmp/odgs-smoke")
    save = Path("/tmp/odgs-results")
    work.mkdir(parents=True, exist_ok=True)
    save.mkdir(parents=True, exist_ok=True)
    Path("/usr/local/lib/python3.10/site-packages/sitecustomize.py").write_text(
        "import matplotlib\n"
        "matplotlib.use('Agg', force=True)\n"
        "_real = matplotlib.use\n"
        "def _use(backend, *a, **k):\n"
        "    name = str(backend).lower()\n"
        "    if 'tk' in name or 'qt' in name:\n"
        "        backend = 'Agg'\n"
        "    k['force'] = True\n"
        "    return _real(backend, *a, **k)\n"
        "matplotlib.use = _use\n",
        encoding="utf-8",
    )
    cam_dir = write_smoke_panoramas(work, n_frames=SMOKE_FRAMES)
    cfg = _write_smoke_config(cam_dir, save)

    env = os.environ.copy()
    env["PYTHONPATH"] = ODGS_DIR
    env["MPLBACKEND"] = "Agg"
    env["WANDB_MODE"] = "disabled"
    cmd = [
        "xvfb-run",
        "-a",
        sys.executable,
        str(Path(ODGS_DIR) / "slam.py"),
        "--config",
        str(cfg),
    ]
    proc = subprocess.run(
        cmd,
        cwd=ODGS_DIR,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    tail = (proc.stdout or "")[-4000:] + "\n" + (proc.stderr or "")[-4000:]
    stats = list(save.rglob("final_run_stats.json"))
    return {
        "ok": proc.returncode == 0,
        "returncode": proc.returncode,
        "stats_path": str(stats[0]) if stats else None,
        "log_tail": tail,
    }


@app.local_entrypoint()
def main(confirm: str = "no") -> None:
    if confirm != "yes":
        raise SystemExit(
            "Refusing GPU spend. Re-run with --confirm=yes after the USD estimate is approved."
        )
    print("ODGS-SLAM smoke: A10G, 8 frames, authors' slam.py, no 193GB download.")
    print("Quoted band: image bake ~$1.50–$8 once, then this run ~$0.21–$0.51.")
    result = run_smoke.remote()
    print(result)
    if not result.get("ok"):
        raise SystemExit(f"smoke failed rc={result.get('returncode')}")
