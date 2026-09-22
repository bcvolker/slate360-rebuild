"""Modal app: Room 213 diagnostic experiment. Does NOT flatten 360 or run SfM."""
from __future__ import annotations

import json
import os
import shutil
import sys
import tarfile
import threading
from pathlib import Path
from typing import Any

import modal

APP_NAME = "slate360-recon-experiment"
SECRET_NAME = "slate360-twin-worker"

GPU_RENDER = "A10G"
GPU_TRAIN = "L40S"
RENDER_TIMEOUT = 15 * 60
TRAIN_TIMEOUT = 90 * 60
# Experiment 3: 16k steps + ns-eval at two steps + exports/renders. The runner's own runtime
# guard is 150 min (exp3.MAX_RUNTIME_S); the function timeout sits above it.
TRAIN_TIMEOUT_EXP3 = 170 * 60
MEMORY_MIB = 80 * 1024
CPU = 8.0

_HERE = Path(__file__).resolve()
try:
    ROOT = _HERE.parents[3]
except IndexError:
    ROOT = Path("/root")
if (ROOT / "workers" / "recon-experiment").is_dir():
    RECON = ROOT / "workers" / "recon-experiment"
    LAB = ROOT / "workers" / "local" / "splat-lab"
else:
    RECON = Path("/root/recon-experiment")
    LAB = Path("/root/splat-lab")

app = modal.App(APP_NAME)

try:
    worker_secret = modal.Secret.from_name(SECRET_NAME)
except Exception:  # noqa: BLE001
    worker_secret = None

gpu_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.4.1-devel-ubuntu22.04",
        add_python="3.10",
    )
    .apt_install(
        "libgl1",
        "libglib2.0-0",
        "git",
        "curl",
        "ca-certificates",
        "gnupg",
        "libegl1",
        "libgles2",
        "libopengl0",
        "libusb-1.0-0",
        "libgomp1",
        "build-essential",
        "ninja-build",
        "clang",
        "cmake",
    )
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
        "node --version",
        "nvcc --version",
    )
    .pip_install("numpy==1.26.4", "pillow", "boto3", "tensorboard")
    .run_commands(
        "pip install torch==2.5.1 torchvision==0.20.1 "
        "--index-url https://download.pytorch.org/whl/cu124",
        "pip install ninja jaxtyping rich",
        "export CC=gcc CXX=g++ && clang --version && pip install nerfstudio==1.1.5",
        "pip install torch==2.5.1 torchvision==0.20.1 "
        "--index-url https://download.pytorch.org/whl/cu124 --force-reinstall",
        "pip install gsplat==1.5.3 --force-reinstall --no-deps",
        "python -c \"import torch, gsplat; "
        "assert torch.__version__.startswith('2.5.1'), torch.__version__; "
        "assert gsplat.__version__ == '1.5.3', gsplat.__version__; "
        "print('pinned', torch.__version__, gsplat.__version__)\"",
    )
    .run_commands(
        # PyPI gsplat 1.5.3 is CPU-only; JIT CUDA ops here (L40S = sm_89).
        "export CUDA_HOME=/usr/local/cuda TORCH_CUDA_ARCH_LIST=8.9 MAX_JOBS=4 "
        "&& python -c \"from gsplat.cuda._backend import _C; "
        "assert _C is not None, 'gsplat CUDA ops missing'; "
        "print('gsplat CUDA ok')\"",
    )
    .pip_install("av", "pycolmap")  # dual-track .insv demux + rig SfM for the 2026-09-21 raw-rig preflight (CPU stages)
    .add_local_dir(str(RECON), remote_path="/root/recon-experiment")
    .add_local_dir(str(LAB), remote_path="/root/splat-lab")
)

ckpt_vol = modal.Volume.from_name("slate360-recon-experiments", create_if_missing=True)


def _r2():
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=os.environ.get("R2_ENDPOINT"),
        aws_access_key_id=os.environ.get("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("R2_SECRET_ACCESS_KEY"),
        region_name=os.environ.get("R2_REGION") or "auto",
    )


def _download(bucket: str, key: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    _r2().download_file(bucket, key, str(dest))


def _upload(bucket: str, key: str, src: Path) -> None:
    _r2().upload_file(str(src), bucket, key)


def _commit_every(stop: threading.Event, every_s: int = 300) -> None:
    """Publish volume writes while a long job is still running.

    Checkpoints, face files, and status.json are invisible to the watchdog
    until commit. A preemption before the final commit must not drop them.
    """
    while not stop.wait(every_s):
        try:
            ckpt_vol.commit()
        except Exception as exc:  # noqa: BLE001
            print(f"[volume] commit failed (non-fatal): {type(exc).__name__}: {exc}", flush=True)


@app.function(
    image=gpu_image,
    gpu=GPU_RENDER,
    timeout=RENDER_TIMEOUT,
    memory=MEMORY_MIB,
    cpu=CPU,
    secrets=[worker_secret] if worker_secret is not None else [],
    retries=0,
)
def render_exp1(payload: dict[str, Any]) -> dict[str, Any]:
    """Experiment 1 render helper. Not used for Experiment 2 training."""
    sys.path.insert(0, "/root/recon-experiment")
    from harness import run_exp1

    work = Path("/tmp/exp1")
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    qa = work / "qa"
    local = payload.get("local") or {}
    if local.get("ply"):
        args = type("A", (), {
            "ply": local["ply"], "spz": local["spz"], "poses": local["poses"],
            "qa_dir": str(qa), "dataset": payload.get("dataset") or "room213",
            "derive_poses": bool(local.get("derive_poses")),
            "transforms": local.get("transforms"), "dataparser": local.get("dataparser"),
        })()
        summary = run_exp1(args)
    else:
        bucket = os.environ["R2_BUCKET"]
        prefix = payload["input_prefix"].rstrip("/")
        ply, spz, poses = work / "input.ply", work / "input.spz", work / "visual-poses.json"
        _download(bucket, f"{prefix}/inputs/output.ply", ply)
        _download(bucket, f"{prefix}/inputs/output.spz", spz)
        _download(bucket, f"{prefix}/inputs/visual-poses.json", poses)
        args = type("A", (), {
            "ply": str(ply), "spz": str(spz), "poses": str(poses),
            "qa_dir": str(qa), "dataset": payload.get("dataset") or "room213",
            "derive_poses": False, "transforms": None, "dataparser": None,
        })()
        summary = run_exp1(args)
    summary["status"] = "needs_review"
    summary["published"] = False
    return summary


def _ensure_inputs(vol: Path) -> Path:
    data = vol / "inputs" / "cecc2763"
    marker = data / "views" / "transforms.json"
    tar = vol / "inputs" / "cecc2763.tar"
    if marker.is_file():
        return data / "views"
    if tar.is_file():
        data.mkdir(parents=True, exist_ok=True)
        with tarfile.open(tar, "r") as tf:
            tf.extractall(data)
        if not marker.is_file() and (data / "views" / "transforms.json").is_file():
            pass
        if not (data / "sfm" / "points.ply").is_file():
            nested = data / "sfm" / "points.ply"
            if not nested.is_file():
                raise FileNotFoundError("extracted tar missing sfm/points.ply")
        ckpt_vol.commit()
    if not marker.is_file():
        raise FileNotFoundError("frozen views missing on volume; put cecc2763.tar or views/")
    return data / "views"


def _ensure_exp5_grouped_inputs(vol: Path) -> Path:
    """Stage the panorama-grouped-safe views directory, regenerated on the volume from the
    frozen original transforms.json using exp5.build_grouped_safe_frames -- the single
    source of truth also used by the preflight verification -- never from a separately
    uploaded copy that could drift. images/ and masks/ are symlinked to the original views/
    (same files, no ~1.5 GB duplication); only transforms.json differs (fewer frames)."""
    sys.path.insert(0, "/root/recon-experiment")
    import exp5
    from hashes import sha256_file

    views = _ensure_inputs(vol)  # the original, unmodified 6016-frame tree
    grouped = views.parent / "views-exp5-grouped"
    grouped_transforms = grouped / "transforms.json"
    if grouped_transforms.is_file():
        got = sha256_file(grouped_transforms)
        if got == exp5.EXPECTED_GROUPED_SAFE_TRANSFORMS_SHA256:
            return grouped
        raise RuntimeError(f"staged grouped transforms.json hash mismatch: {got}")

    grouped.mkdir(parents=True, exist_ok=True)
    built = exp5.build_grouped_safe_frames(views / "transforms.json")
    grouped_transforms.write_text(json.dumps(built["grouped_doc"], indent=2) + "\n", encoding="utf-8")
    got = sha256_file(grouped_transforms)
    if got != exp5.EXPECTED_GROUPED_SAFE_TRANSFORMS_SHA256:
        grouped_transforms.unlink()
        raise RuntimeError(f"freshly staged grouped transforms.json hash {got} != expected "
                            f"{exp5.EXPECTED_GROUPED_SAFE_TRANSFORMS_SHA256} -- refusing to stage")
    for name in ("images", "masks"):
        link = grouped / name
        if not link.exists():
            link.symlink_to(views / name)
    ckpt_vol.commit()
    return grouped


@app.function(
    image=gpu_image,
    timeout=30 * 60,
    memory=8192,
    cpu=2.0,
    volumes={"/vol": ckpt_vol},
    retries=0,
)
def stage_inputs() -> str:
    """Extract frozen views once so both L40S arms read the same tree."""
    views = _ensure_inputs(Path("/vol"))
    ckpt_vol.commit()
    return str(views)


@app.function(
    image=gpu_image,
    timeout=20 * 60,
    memory=8192,
    cpu=2.0,
    volumes={"/vol": ckpt_vol},
    retries=0,
)
def verify_canonical_inputs() -> dict[str, Any]:
    """CPU-only, no GPU, no training: portable-hash the canonical Room 213 inputs.

    Hashes (a) the live extracted volume tree `_ensure_inputs` already returns for
    training, and (b) a *fresh* extraction of the immutable `inputs/cecc2763.tar` into
    an ephemeral scratch directory that is never written back to the volume — so this
    never touches `inputs/cecc2763/` or the tar. Used by the laptop preflight and by
    the portable-hash three-way audit; see docs/ops/ROOM213_MASK_PROVENANCE_2026-09-17.md.
    """
    sys.path.insert(0, "/root/recon-experiment")
    from hashes import sha256_dir, sha256_file

    vol = Path("/vol")
    live_views = _ensure_inputs(vol)  # returns the ALREADY-extracted tree; extracts once if absent
    live = {
        "mask_hash": sha256_dir(live_views / "masks", ("*.png",)),
        "pose_hash": sha256_file(live_views / "transforms.json"),
        "seed_hash": sha256_file(live_views.parent / "sfm" / "points.ply"),
    }

    tar_path = vol / "inputs" / "cecc2763.tar"
    scratch = Path("/tmp/verify-canonical-inputs")
    if scratch.exists():
        shutil.rmtree(scratch)
    scratch.mkdir(parents=True)
    with tarfile.open(tar_path, "r") as tf:
        tf.extractall(scratch)
    tar_views = scratch / "views"
    tar_hashes = {
        "mask_hash": sha256_dir(tar_views / "masks", ("*.png",)),
        "pose_hash": sha256_file(tar_views / "transforms.json"),
        "seed_hash": sha256_file(tar_views.parent / "sfm" / "points.ply"),
    }
    shutil.rmtree(scratch)  # ephemeral; the persistent volume tree is untouched

    return {
        "tar_sha256": sha256_file(tar_path),
        "tar_bytes": tar_path.stat().st_size,
        "live_volume_tree": str(live_views),
        "live_volume_portable_hashes": live,
        "tar_fresh_extraction_portable_hashes": tar_hashes,
        "live_equals_tar": live == tar_hashes,
    }


@app.function(
    image=gpu_image,
    timeout=10 * 60,
    memory=8192,
    cpu=2.0,
    volumes={"/vol": ckpt_vol},
    retries=0,
)
def run_verify_inputs_exp3(recipe: dict[str, Any]) -> dict[str, Any]:
    """Literally the train_arm_exp3.verify_inputs() gate Arm C/D run before training,
    invoked standalone (no GPU, no ns-train) so the portable-hash fix can be proven
    against Modal without spending a training budget."""
    sys.path.insert(0, "/root/recon-experiment")
    from train_arm_exp3 import verify_inputs

    views = _ensure_inputs(Path("/vol"))
    try:
        identity = verify_inputs(views, recipe)
        return {"ok": True, "identity": identity}
    except RuntimeError as exc:
        return {"ok": False, "error": str(exc)}


@app.function(
    image=gpu_image,
    gpu=GPU_TRAIN,
    timeout=TRAIN_TIMEOUT,
    memory=MEMORY_MIB,
    cpu=CPU,
    volumes={"/vol": ckpt_vol},
    secrets=[worker_secret] if worker_secret is not None else [],
    retries=0,
)
def train_arm(payload: dict[str, Any]) -> dict[str, Any]:
    """Experiment 2: one arm, L40S, refine_stop_iter is the only changed variable."""
    os.environ.setdefault("OPEN3D_CPU_RENDERING", "true")
    sys.path.insert(0, "/root/recon-experiment")
    sys.path.insert(0, "/root/splat-lab")
    from train_arm import run_arm

    vol = Path("/vol")
    views = _ensure_inputs(vol)
    arm = payload["arm"]
    recipe = payload["recipe"]
    work = Path("/tmp") / "arm" / arm["name"]
    if work.exists():
        shutil.rmtree(work)
    poses = vol / "inputs" / "visual-poses.json"
    if not poses.is_file():
        poses = Path("/root/recon-experiment") / "visual-poses.json"
    result = run_arm(work=work, data_dir=views, poses=poses, arm=arm, recipe=recipe)
    durable = vol / "experiments" / "room213-densification" / arm["name"]
    if durable.exists():
        shutil.rmtree(durable)
    shutil.copytree(work, durable)
    ckpt_vol.commit()
    return result


@app.function(
    image=gpu_image,
    gpu=GPU_TRAIN,
    timeout=TRAIN_TIMEOUT_EXP3,
    memory=MEMORY_MIB,
    cpu=CPU,
    volumes={"/vol": ckpt_vol},
    secrets=[worker_secret] if worker_secret is not None else [],
    retries=0,
)
def train_arm_exp3(payload: dict[str, Any]) -> dict[str, Any]:
    """Experiment 3: one corrected arm, L40S, densify_grad_thresh is the only changed variable."""
    os.environ.setdefault("OPEN3D_CPU_RENDERING", "true")
    sys.path.insert(0, "/root/recon-experiment")
    sys.path.insert(0, "/root/splat-lab")
    from train_arm_exp3 import run_arm

    vol = Path("/vol")
    views = _ensure_inputs(vol)
    arm = payload["arm"]
    recipe = payload["recipe"]
    work = Path("/tmp") / "exp3" / arm["name"]
    if work.exists():
        shutil.rmtree(work)
    poses = Path("/root/recon-experiment") / "visual-poses.json"
    result = run_arm(work=work, data_dir=views, poses=poses, arm=arm, recipe=recipe)
    durable = vol / "experiments" / "room213-exp3" / arm["name"]
    if durable.exists():
        shutil.rmtree(durable)
    shutil.copytree(work, durable)
    ckpt_vol.commit()
    return result


TRAIN_TIMEOUT_EXP4 = 170 * 60


@app.function(
    image=gpu_image,
    gpu=GPU_TRAIN,
    timeout=TRAIN_TIMEOUT_EXP4,
    memory=MEMORY_MIB,
    cpu=CPU,
    volumes={"/vol": ckpt_vol},
    secrets=[worker_secret] if worker_secret is not None else [],
    retries=0,
)
def train_arm_exp4(payload: dict[str, Any]) -> dict[str, Any]:
    """Experiment 4: one arm, L40S, cull_scale_thresh is the only changed variable.

    Same dataset/split, same opacity-reset patch, same guards as Experiment 3 -- see
    train_arm_exp4.py / exp4.py for what is and is not allowed to differ from Arm D."""
    os.environ.setdefault("OPEN3D_CPU_RENDERING", "true")
    sys.path.insert(0, "/root/recon-experiment")
    sys.path.insert(0, "/root/splat-lab")
    from train_arm_exp4 import run_arm

    vol = Path("/vol")
    views = _ensure_inputs(vol)
    arm = payload["arm"]
    recipe = payload["recipe"]
    work = Path("/tmp") / "exp4" / arm["name"]
    if work.exists():
        shutil.rmtree(work)
    poses = Path("/root/recon-experiment") / "visual-poses.json"
    result = run_arm(work=work, data_dir=views, poses=poses, arm=arm, recipe=recipe)
    durable = vol / "experiments" / "room213-exp4" / arm["name"]
    if durable.exists():
        shutil.rmtree(durable)
    shutil.copytree(work, durable)
    ckpt_vol.commit()
    return result


HAZE_DIAGNOSTIC_TIMEOUT = 100 * 60


@app.function(
    image=gpu_image,
    gpu=GPU_TRAIN,
    timeout=HAZE_DIAGNOSTIC_TIMEOUT,
    memory=MEMORY_MIB,
    cpu=CPU,
    volumes={"/vol": ckpt_vol},
    secrets=[worker_secret] if worker_secret is not None else [],
    retries=0,
)
def haze_diagnostic() -> dict[str, Any]:
    """Post-hoc diagnostic only. READ-ONLY against experiments/room213-exp3/<ARM>/ -- never
    opens Arm C or Arm D's durable checkpoints for writing, never retrains. Writes exclusively
    to a new, separate volume path: experiments/room213-exp3-cleanup-diagnostic/."""
    sys.path.insert(0, "/root/recon-experiment")
    sys.path.insert(0, "/root/splat-lab")
    from exp3_haze_diagnostic_run import run as run_diagnostic

    vol = Path("/vol")
    _ensure_inputs(vol)  # read-only: frozen views must already be staged
    work = Path("/tmp") / "haze-diagnostic"
    if work.exists():
        shutil.rmtree(work)
    result = run_diagnostic(vol=vol, work=work)
    durable = vol / "experiments" / "room213-exp3-cleanup-diagnostic"
    if durable.exists():
        shutil.rmtree(durable)
    shutil.copytree(work, durable)
    ckpt_vol.commit()
    result["status"] = "needs_review"
    result["HUMAN_VISUAL_VERDICT"] = "UNREVIEWED"
    return result


@app.function(
    image=gpu_image,
    gpu=GPU_TRAIN,
    timeout=30 * 60,
    memory=MEMORY_MIB,
    cpu=CPU,
    volumes={"/vol": ckpt_vol},
    retries=0,
)
def exp4_results() -> dict[str, Any]:
    """Experiment 4 results: exact scale-threshold counts/percentiles, projected footprint,
    and QA renders computed directly from D4 and E4's own actual step-15999 checkpoints.
    Read-only against experiments/room213-exp4/<ARM>/; never trains, never writes there.
    Writes only to a new, separate volume path: experiments/room213-exp4-results/."""
    sys.path.insert(0, "/root/recon-experiment")
    sys.path.insert(0, "/root/splat-lab")
    from exp4_results_gpu import run as run_results

    vol = Path("/vol")
    work = Path("/tmp") / "exp4-results"
    if work.exists():
        shutil.rmtree(work)
    result = run_results(vol=vol, work=work)
    durable = vol / "experiments" / "room213-exp4-results"
    if durable.exists():
        shutil.rmtree(durable)
    shutil.copytree(work, durable)
    ckpt_vol.commit()
    return result


TRAIN_TIMEOUT_EXP5 = 170 * 60


@app.function(
    image=gpu_image,
    gpu=GPU_TRAIN,
    timeout=TRAIN_TIMEOUT_EXP5,
    memory=MEMORY_MIB,
    cpu=CPU,
    volumes={"/vol": ckpt_vol},
    secrets=[worker_secret] if worker_secret is not None else [],
    retries=0,
)
def train_arm_exp5(payload: dict[str, Any]) -> dict[str, Any]:
    """Experiment 5: one arm, L40S, cull_scale_thresh is the only changed variable, trained
    on the panorama-grouped-safe pool (see train_arm_exp5.py / exp5.py)."""
    os.environ.setdefault("OPEN3D_CPU_RENDERING", "true")
    sys.path.insert(0, "/root/recon-experiment")
    sys.path.insert(0, "/root/splat-lab")
    from train_arm_exp5 import run_arm

    vol = Path("/vol")
    full_views = _ensure_inputs(vol)
    grouped_views = _ensure_exp5_grouped_inputs(vol)
    arm = payload["arm"]
    recipe = payload["recipe"]
    work = Path("/tmp") / "exp5" / arm["name"]
    if work.exists():
        shutil.rmtree(work)
    poses = Path("/root/recon-experiment") / "visual-poses.json"
    result = run_arm(work=work, grouped_data_dir=grouped_views, full_transforms_path=full_views / "transforms.json",
                      poses=poses, arm=arm, recipe=recipe)
    durable = vol / "experiments" / "room213-exp5" / arm["name"]
    if durable.exists():
        shutil.rmtree(durable)
    shutil.copytree(work, durable)
    ckpt_vol.commit()
    return result


TRAIN_TIMEOUT_EXP6 = 200 * 60  # K6 runs longer (up to 20k+ steps); generous headroom


@app.function(
    image=gpu_image,
    gpu=GPU_TRAIN,
    timeout=TRAIN_TIMEOUT_EXP6,
    memory=MEMORY_MIB,
    cpu=CPU,
    volumes={"/vol": ckpt_vol},
    secrets=[worker_secret] if worker_secret is not None else [],
    retries=0,
)
def train_arm_exp6(payload: dict[str, Any]) -> dict[str, Any]:
    """Experiment 6: one arm, L40S, max_num_iterations (+ K6's late scale-only prune) is
    the treatment. Reuses the SAME panorama-grouped-safe pool Experiment 5 staged -- no
    restaging (see train_arm_exp6.py / exp6.py)."""
    os.environ.setdefault("OPEN3D_CPU_RENDERING", "true")
    sys.path.insert(0, "/root/recon-experiment")
    sys.path.insert(0, "/root/splat-lab")
    from train_arm_exp6 import run_arm

    vol = Path("/vol")
    full_views = _ensure_inputs(vol)
    grouped_views = _ensure_exp5_grouped_inputs(vol)
    arm = payload["arm"]
    recipe = payload["recipe"]
    work = Path("/tmp") / "exp6" / arm["name"]
    if work.exists():
        shutil.rmtree(work)
    poses = Path("/root/recon-experiment") / "visual-poses.json"
    result = run_arm(work=work, grouped_data_dir=grouped_views, full_transforms_path=full_views / "transforms.json",
                      poses=poses, arm=arm, recipe=recipe)
    durable = vol / "experiments" / "room213-exp6" / arm["name"]
    if durable.exists():
        shutil.rmtree(durable)
    shutil.copytree(work, durable)
    ckpt_vol.commit()
    return result


@app.function(
    image=gpu_image,
    gpu=GPU_TRAIN,
    timeout=60 * 60,
    memory=MEMORY_MIB,
    cpu=CPU,
    volumes={"/vol": ckpt_vol},
    retries=0,
)
def exp5_grouped_results() -> dict[str, Any]:
    """Experiment 5 grouped-validation results: real PSNR/SSIM/LPIPS on the 38 withheld
    panoramas for both G5 and H5's actual checkpoints (exp5_grouped_eval.py), plus the same
    scale-statistics/footprint/QA-render pass Experiment 4 used (exp4_results_gpu.py,
    pointed at experiments/room213-exp5/<ARM>/ instead of room213-exp4). Read-only against
    both arms' checkpoints. Writes only to experiments/room213-exp5-results/."""
    sys.path.insert(0, "/root/recon-experiment")
    sys.path.insert(0, "/root/splat-lab")
    import exp5
    from exp5_grouped_eval import evaluate_grouped, select_panels, render_panel
    from exp4_results_gpu import _find_ckpt, ckpt_tensors, load_ckpt_state, scale_stats, footprint_report, render_qa_4, scale_histogram_png, to_png
    from poses import load_poses

    vol = Path("/vol")
    full_views = _ensure_inputs(vol)
    work = Path("/tmp") / "exp5-results"
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)

    # No recipe lookup needed here: qa/ (where the frozen recipes live) is not mounted into
    # this container's image, and every value this function actually uses -- the panorama
    # holdout, dataparser transform -- is recomputed directly below from files that ARE
    # mounted (the frozen views tree, visual-poses.json), the same single source of truth
    # the preflight and training already used.
    dataparser = json.loads((Path("/root/recon-experiment") / "visual-poses.json").read_text())["dataparser"]
    built = exp5.build_grouped_safe_frames(full_views / "transforms.json")
    # built["by_pano"] maps panorama id -> list of file_path STRINGS (identity/verification
    # use); panel rendering needs the FULL frame dict (pose/intrinsics), so build that
    # separately from the same full transforms.json rather than reusing by_pano's shape.
    full_doc = json.loads((full_views / "transforms.json").read_text(encoding="utf-8"))
    frames_by_pano: dict[str, list[dict[str, Any]]] = {}
    for fr in full_doc["frames"]:
        frames_by_pano.setdefault(fr["file_path"].split("/")[-1].split("_v")[0], []).append(fr)

    out: dict[str, Any] = {"arms": {}}
    tensors_by_arm = {}
    for key, arm_name in (("g5", "ROOM213_G5_CONTROL"), ("h5", "ROOM213_H5_SCALE_CONTROL")):
        grouped_eval = evaluate_grouped(
            vol=vol, work=work, arm_name=arm_name, full_transforms_path=full_views / "transforms.json",
            images_dir=full_views / "images", dataparser=dataparser,
            withheld_panoramas=built["val_panos"], pool_panoramas=built["train_panos"], ckpt_step=15999,
        )
        arm_dir = vol / "experiments" / "room213-exp5" / arm_name
        ckpt = _find_ckpt(arm_dir / "train", 15999)
        payload = load_ckpt_state(ckpt)
        tensors = ckpt_tensors(payload, "cuda")
        tensors_by_arm[key] = tensors
        stats, max_scale = scale_stats(tensors)
        poses_doc = load_poses(Path("/root/recon-experiment/visual-poses.json"))
        footprint = footprint_report(tensors, poses_doc["poses"], work / key / "footprint")
        render_hashes = render_qa_4(tensors, poses_doc["poses"], "cuda", work / key / "qa" / "step-15999")
        out["arms"][key] = {
            "arm_name": arm_name, "grouped_eval_summary": {k: v for k, v in grouped_eval.items() if k != "per_panorama"},
            "scale_stats": stats, "projected_footprint": footprint, "render_hashes": render_hashes,
        }

    panel_meta = {}
    h5_grouped = json.loads((work / "grouped-eval-ROOM213_H5_SCALE_CONTROL.json").read_text())
    picks = select_panels(h5_grouped)
    for tag, pano in picks.items():
        frs = sorted(frames_by_pano[pano], key=lambda f: f["file_path"])
        fr = frs[0]  # representative view per panorama (v00)
        from exp5_grouped_eval import _frame_pose
        pose = _frame_pose(fr, dataparser)
        src_path = full_views / "images" / Path(fr["file_path"]).name
        dest = work / "panels" / f"{tag}_{pano}.png"
        h = render_panel(tensors_g5=tensors_by_arm["g5"], tensors_h5=tensors_by_arm["h5"], pose=pose, src_path=src_path, dest=dest)
        panel_meta[tag] = {"panorama": pano, "file_path": fr["file_path"], "sha256": h,
                            "distance_to_nearest_training_panorama": h5_grouped["per_panorama"][pano]["distance_to_nearest_training_panorama"],
                            "h5_aggregate": h5_grouped["per_panorama"][pano]["aggregate"]}
    out["panels"] = panel_meta

    (work / "exp5-results.json").write_text(json.dumps(out, indent=2, default=str) + "\n", encoding="utf-8")
    durable = vol / "experiments" / "room213-exp5-results"
    if durable.exists():
        shutil.rmtree(durable)
    shutil.copytree(work, durable)
    ckpt_vol.commit()
    return out


@app.function(
    image=gpu_image,
    gpu=GPU_TRAIN,
    timeout=20 * 60,
    memory=MEMORY_MIB,
    cpu=CPU,
    volumes={"/vol": ckpt_vol},
    retries=0,
)
def exp5_evaluator_sanity_check() -> str:
    """Evaluator validation for Experiment 5: scores one existing eval image via stock
    nerfstudio ns-eval's own per-image path and the new direct grouped evaluator, on the
    same checkpoint (D4). Read-only, no training. Kept as reusable validation tooling, not
    training-specific -- can be re-run against any future checkpoint if the evaluator code
    changes."""
    sys.path.insert(0, "/root/recon-experiment")
    sys.path.insert(0, "/root/splat-lab")
    import io
    import contextlib

    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        import exp5_evaluator_sanity_check as m
        m.main()
    return buf.getvalue()


@app.function(
    image=gpu_image,
    gpu=GPU_TRAIN,
    timeout=15 * 60,
    memory=MEMORY_MIB,
    cpu=CPU,
    volumes={"/vol": ckpt_vol},
    retries=0,
)
def exp6_scale_evolution() -> str:
    """Experiment 6 preflight: scale-tail evolution across H5's kept checkpoints,
    read-only, no training."""
    sys.path.insert(0, "/root/recon-experiment")
    sys.path.insert(0, "/root/splat-lab")
    import io
    import contextlib

    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        import exp6_scale_evolution as m
        m.main()
    return buf.getvalue()


@app.function(
    image=gpu_image,
    gpu=GPU_TRAIN,
    timeout=15 * 60,
    memory=MEMORY_MIB,
    cpu=CPU,
    volumes={"/vol": ckpt_vol},
    retries=0,
)
def exp6_instrumentation_smoke_test() -> str:
    """Pre-launch verification for Experiment 6: two tiny (50-step) real training runs,
    with and without the track-only instrumentation, confirming it does not change
    training behavior. Read-only against the frozen dataset; not part of the deliverable."""
    sys.path.insert(0, "/root/recon-experiment")
    sys.path.insert(0, "/root/splat-lab")
    import io
    import contextlib

    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        import exp6_instrumentation_smoke_test as m
        m.main()
    return buf.getvalue()


@app.function(
    image=gpu_image,
    timeout=5 * 60,
    memory=8 * 1024,
    cpu=2.0,
    retries=0,
)
def nerfstudio_downscale_introspect() -> str:
    """Read-only introspection (CPU only, no GPU, no data touched): what resize method does
    nerfstudio 1.1.5's progressive-resolution image caching actually use for the 320/640
    training-resolution stages? Needed to know whether a local PIL-BILINEAR simulation of
    those stages (used by the source-detail forensic audit) matches what training actually
    saw, or whether nerfstudio's own downscale path antialiases differently."""
    import inspect
    import numpy as np

    out = []
    from nerfstudio.data.datasets.base_dataset import InputDataset
    src = inspect.getsource(InputDataset)
    import re
    for m in re.finditer(r"def \w*(get_image|downscale)\w*\([^)]*\):.*?(?=\n    def |\Z)", src, re.S):
        out.append(m.group(0))
    out.append("=== grep for resize/INTER/BILINEAR across nerfstudio package ===")
    import subprocess
    grep = subprocess.run(
        ["grep", "-rn", "-E", "cv2\\.resize|INTER_AREA|Image\\.resize|BILINEAR|downscale_factor",
         "/usr/local/lib/python3.10/site-packages/nerfstudio/data/"],
        capture_output=True, text=True,
    )
    out.append(grep.stdout)

    out.append("=== base_dataset.py context around the BILINEAR resize (is this the LIVE per-step path?) ===")
    with open("/usr/local/lib/python3.10/site-packages/nerfstudio/data/datasets/base_dataset.py") as f:
        lines = f.readlines()
    out.append("".join(lines[max(0, 73 - 25):73 + 10]))

    out.append("=== splatfacto.py: how does num_downscales / resolution_schedule actually resize per-step? ===")
    grep2 = subprocess.run(
        ["grep", "-n", "-E", "num_downscales|resolution_schedule|avg_pool|interpolate|downscale|_downscale",
         "/usr/local/lib/python3.10/site-packages/nerfstudio/models/splatfacto.py"],
        capture_output=True, text=True,
    )
    out.append(grep2.stdout)
    grep3 = subprocess.run(
        ["grep", "-rn", "-E", "num_downscales|resolution_schedule|_downscale_if_required|avg_pool",
         "/usr/local/lib/python3.10/site-packages/nerfstudio/data/datamanagers/full_images_datamanager.py"],
        capture_output=True, text=True,
    )
    out.append(grep3.stdout)

    out.append("=== nerfstudio_dataparser.py auto-downscale (MAX_AUTO_RESOLUTION) -- does a 2560 face get silently halved? ===")
    grep4 = subprocess.run(["grep", "-n", "-E", "MAX_AUTO_RESOLUTION|downscale_factor|max_res", "/usr/local/lib/python3.10/site-packages/nerfstudio/data/dataparsers/nerfstudio_dataparser.py"], capture_output=True, text=True)
    out.append(grep4.stdout)
    with open("/usr/local/lib/python3.10/site-packages/nerfstudio/data/dataparsers/nerfstudio_dataparser.py") as f:
        dl = f.readlines()
    out.append("".join(dl[466:492]))
    out.append("=== splatfacto camera optimizer default + method_configs splatfacto datamanager/dataparser settings ===")
    grep5 = subprocess.run(["grep", "-n", "-E", "camera_optimizer|CameraOptimizerConfig|mode=", "/usr/local/lib/python3.10/site-packages/nerfstudio/models/splatfacto.py"], capture_output=True, text=True)
    out.append(grep5.stdout)
    grep6 = subprocess.run(["grep", "-n", "-A12", "method=\"splatfacto\"", "/usr/local/lib/python3.10/site-packages/nerfstudio/configs/method_configs.py"], capture_output=True, text=True)
    out.append(grep6.stdout[:2500])
    out.append("=== splatfacto.py: full source of resize_image()/_get_downscale_factor()/_downscale_if_required() -- the LIVE per-step path ===")
    with open("/usr/local/lib/python3.10/site-packages/nerfstudio/models/splatfacto.py") as f:
        sp_lines = f.readlines()
    out.append("".join(sp_lines[100:125]))
    out.append("---")
    out.append("".join(sp_lines[470:500]))

    # Run the SAME synthetic period-6px pattern through nerfstudio's actual downscale
    # function (if identifiable) for a directly comparable number to the local PIL test.
    try:
        from nerfstudio.data.utils.data_utils import get_image_mask_tensor_from_path  # noqa: F401
    except Exception as e:  # noqa: BLE001
        out.append(f"data_utils import note: {e}")

    size = 1280
    x = np.arange(size)
    pattern = (np.sin(2 * np.pi * x / 6.0) > 0).astype(np.uint8) * 255
    img = np.tile(pattern, (size, 1))

    def lapvar(a):
        a = a.astype(np.float32)
        L = (-4 * a + np.roll(a, 1, 0) + np.roll(a, -1, 0) + np.roll(a, 1, 1) + np.roll(a, -1, 1))[2:-2, 2:-2]
        return float(L.var())

    import cv2
    for scale, label in ((1, "1280"), (2, "640 cv2.INTER_AREA"), (4, "320 cv2.INTER_AREA"),
                          (2, "640 cv2.INTER_LINEAR"), (4, "320 cv2.INTER_LINEAR")):
        if scale == 1:
            b = img
        elif "AREA" in label:
            b = cv2.resize(img, (size // scale, size // scale), interpolation=cv2.INTER_AREA)
        else:
            b = cv2.resize(img, (size // scale, size // scale), interpolation=cv2.INTER_LINEAR)
        out.append(f"{label} lapvar {lapvar(b):.1f} shape {b.shape}")

    return "\n".join(out)


@app.function(
    image=gpu_image,
    timeout=6 * 60 * 60,
    memory=32 * 1024,
    cpu=8.0,
    volumes={"/vol": ckpt_vol},
    retries=0,
)
def room213_raw_preflight() -> str:
    """Room 213 2026-09-21 raw-rig preflight stages 1-4 (verify / demux / ChArUco / splits).
    CPU only, no GPU, no training, no face generation, no camera-model fit. Reads only the
    raw-capture-test prefix, writes only room213/2026-09-21/preflight/. Idempotent -- rerun
    after more source files land on the volume."""
    sys.path.insert(0, "/root/recon-experiment")
    import io
    import contextlib

    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        import room213_raw_preflight as m
        m.main()
    ckpt_vol.commit()
    return buf.getvalue()


@app.function(
    image=gpu_image,
    timeout=2 * 60 * 60,
    memory=16 * 1024,
    cpu=4.0,
    volumes={"/vol": ckpt_vol},
    retries=0,
)
def room213_reassemble(payload: dict[str, Any]) -> dict[str, Any]:
    """Concatenate chunked uploads (name.partNNN) on the volume into the original file and
    verify SHA256 against the expected digest. Parts are removed only after a match."""
    import hashlib
    vol = Path("/vol"); d = vol / "room213" / "2026-09-21" / "raw-capture-test"; parts_dir = d / "parts"
    name = payload["name"]; expected = payload["sha256"]
    parts = sorted(parts_dir.glob(name + ".part*"))
    out = d / name; h = hashlib.sha256()
    with open(out, "wb") as w:
        for p in parts:
            with open(p, "rb") as r:
                for chunk in iter(lambda: r.read(64 * 1024 * 1024), b""):
                    w.write(chunk); h.update(chunk)
    ok = h.hexdigest() == expected
    if ok:
        for p in parts:
            p.unlink()
    else:
        out.unlink(missing_ok=True)
    ckpt_vol.commit()
    return {"name": name, "n_parts": len(parts), "size": out.stat().st_size if ok else None, "sha256_ok": ok, "got": h.hexdigest()}


@app.function(
    image=gpu_image,
    # CPU only: the GPU was needed solely for the Mask R-CNN person masks, which are already
    # on the volume (stage skips existing outputs). Two A10G runs (19:57, 20:24) were cancelled
    # by capacity reclaim mid-stage; faces/SfM/scale/loader are CPU work anyway.
    timeout=8 * 60 * 60,
    memory=64 * 1024,
    cpu=32.0,
    volumes={"/vol": ckpt_vol},
    secrets=[worker_secret] if worker_secret is not None else [],
    retries=0,  # the watchdog owns relaunch policy (infra vs code classification, max 3)
)
def room213_raw_build() -> str:
    """Room 213 raw-rig dataset build (stages 5-9): person masks (torchvision Mask R-CNN,
    GPU), 2560 Mei faces, constrained rig SfM/BA (pycolmap; factory intrinsics + 32.26 mm
    fixed, inter-lens rotation the only rig parameter, no per-face optimisation), holdouts,
    metric-scale + LiDAR checks, loader detail survival. NO Gaussian training."""
    sys.path.insert(0, "/root/recon-experiment")
    import io
    import contextlib

    stop = threading.Event()
    threading.Thread(target=_commit_every, args=(stop,), daemon=True).start()
    try:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            import room213_raw_build as m
            m.main()
        ckpt_vol.commit()
        return buf.getvalue()
    finally:
        stop.set()


@app.function(
    image=gpu_image,
    timeout=8 * 60 * 60,
    memory=4 * 1024,
    cpu=1.0,
    volumes={"/vol": ckpt_vol},
    retries=0,
)
def room213_raw_pipeline() -> str:
    """Remote orchestrator: preflight (verify/demux/ChArUco/splits) then build (masks/faces/
    rig SfM/splits/scale/loader). Runs entirely inside Modal so the laptop can be off once
    this function has started. NO Gaussian training."""
    pre = room213_raw_preflight.remote()
    verify = json.loads((Path("/vol/room213/2026-09-21/preflight/verify.json")).read_text())
    # only the three .insv originals gate the build; stills/LRVs are not build inputs
    bad_vid = [m for m in verify["missing"] if m.startswith("VID_")] + [b["filename"] for b in verify["present_bad"] if b["filename"].startswith("VID_")]
    if bad_vid:
        return pre + chr(10) + "BUILD SKIPPED: video verify failed for %s" % bad_vid
    build = room213_raw_build.remote()
    return pre + chr(10) + "===== BUILD =====" + chr(10) + build


R213 = Path("/vol/room213/2026-09-21")
INFRA_PATTERNS = ("cancel", "preempt", "ClientClosed", "Runner terminated", "timed out", "Timeout", "connection", "Connection",
                  "Internal", "unavailable", "capacity", "grpc", "GRPC", "heartbeat", "OOM", "out of memory", "Killed")


def _wd_load() -> dict[str, Any]:
    p = R213 / "watchdog.json"
    return json.loads(p.read_text()) if p.is_file() else {"relaunches": {}, "events": []}


def _wd_save(state: dict[str, Any]) -> None:
    (R213 / "watchdog.json").write_text(json.dumps(state, indent=1))
    ckpt_vol.commit()


def _wd_event(state: dict[str, Any], msg: str) -> None:
    from datetime import datetime, timezone
    state["events"].append({"t": datetime.now(timezone.utc).isoformat(), "msg": msg})
    state["events"] = state["events"][-200:]
    print("WATCHDOG", msg, flush=True)


def _call_state(call_id):
    """running | done | failed(+message) | none for a spawned FunctionCall."""
    if not call_id:
        return "none", None
    try:
        fc = modal.FunctionCall.from_id(call_id)
        fc.get(timeout=0)
        return "done", None
    except TimeoutError:
        return "running", None
    except Exception as e:  # noqa: BLE001
        return "failed", f"{type(e).__name__}: {str(e)[:400]}"


def _classify(msg: str) -> str:
    return "infra" if any(p in msg for p in INFRA_PATTERNS) else "code"


def _detached_cpu_build_running() -> tuple[bool, bool]:
    """(alive, check_ok). A detached recon-experiment app with tasks is the current CPU build."""
    import asyncio
    from modal.client import _Client
    from modal_proto import api_pb2

    async def _query() -> bool:
        client = await _Client.from_env()
        resp = await client.stub.AppList(api_pb2.AppListRequest())
        for row in resp.apps:
            if "recon-experiment" not in (row.description or ""):
                continue
            if row.state in (
                api_pb2.APP_STATE_DETACHED,
                api_pb2.APP_STATE_DETACHED_DISCONNECTED,
                api_pb2.APP_STATE_EPHEMERAL,
            ) and int(row.n_running_tasks or 0) > 0:
                return True
        return False

    try:
        return asyncio.run(_query()), True
    except Exception as exc:  # noqa: BLE001
        print(f"[watchdog] app list failed: {type(exc).__name__}: {exc}", flush=True)
        return False, False


@app.function(
    image=gpu_image,
    schedule=modal.Period(minutes=10),
    timeout=10 * 60,
    memory=2 * 1024,
    cpu=1.0,
    volumes={"/vol": ckpt_vol},
    retries=0,
)
def room213_watchdog() -> dict[str, Any]:
    """Every 10 min (deployed): keep the Room 213 raw-rig build alive, relaunch on infrastructure
    failures (max 3 per identical failure), halt on a repeated deterministic error, and -- only
    when build/verdict.json says TRAINING READY and AUTO_TRAIN_AUTHORIZED exists -- launch the
    single authorized Stage-1 training run once, resuming it from a verified checkpoint on
    infrastructure loss. All state lives on the volume."""
    from datetime import datetime, timezone
    ckpt_vol.reload()
    st = _wd_load()
    if st.get("halted"):
        return {"halted": st["halted"]}
    status = json.loads((R213 / "status.json").read_text()) if (R213 / "status.json").is_file() else {}
    verdict_p = R213 / "build" / "verdict.json"
    build_done = verdict_p.is_file() and (R213 / "build" / "stage_done" / "sfm.json").is_file()

    def relaunch(kind, fn, key, msg):
        cls = _classify(msg)
        sig = f"{kind}:{cls}:{msg[:80]}"
        n = st["relaunches"].get(sig, 0)
        if cls == "code" and n >= 1:
            st["halted"] = f"{kind} failed twice with the same code/data error: {msg}"
            _wd_event(st, st["halted"]); return
        if n >= 3:
            st["halted"] = f"{kind} exceeded 3 relaunches for: {msg}"
            _wd_event(st, st["halted"]); return
        st["relaunches"][sig] = n + 1
        call = fn.spawn(); st[key] = call.object_id
        _wd_event(st, f"{kind} relaunched ({cls} #{n + 1}) as {call.object_id} after: {msg}")

    if not build_done:
        state, msg = _call_state(st.get("build_call_id"))
        if state == "running" and status.get("timestamp_utc"):
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(status["timestamp_utc"])).total_seconds()
            # mapping/rig stages cannot report progress mid-call; everything else heartbeats every 5 min
            if age > 40 * 60 and status.get("stage") not in ("sfm_map", "sfm_rig"):
                _wd_event(st, f"build heartbeat stale {int(age)}s in stage {status.get('stage')} -- cancelling for relaunch")
                try:
                    modal.FunctionCall.from_id(st["build_call_id"]).cancel()
                except Exception as e:  # noqa: BLE001
                    _wd_event(st, f"cancel failed: {e}")
                state, msg = "failed", "heartbeat stale (treated as infrastructure hang)"
        if state == "none":
            # The detached CPU run is a different Modal app. Spawning here while it
            # still has tasks would run two builds. Replace it once, after it is gone.
            detached_alive, apps_visible = _detached_cpu_build_running()
            if not apps_visible:
                _wd_event(st, "could not list apps; not launching a second build")
            elif detached_alive:
                st["external_build_seen"] = True
                _wd_event(st, "detached CPU build still running; not launching another")
            elif st.get("external_build_seen") or not st.get("replacement_spawned"):
                call = room213_raw_build.spawn(); st["build_call_id"] = call.object_id
                st["replacement_spawned"] = True
                _wd_event(st, f"build launched as {call.object_id}")
        elif state == "failed":
            relaunch("build", room213_raw_build, "build_call_id", msg or "unknown")
        elif state == "done":
            _wd_event(st, "build call finished without verdict/sfm marker -- relaunching (code-failure candidate)")
            relaunch("build", room213_raw_build, "build_call_id", "finished without verdict")
        _wd_save(st); return {"build": state, "status": status.get("stage")}

    verdict = json.loads(verdict_p.read_text())
    if verdict.get("dataset") != "TRAINING READY":
        if not st.get("blocked_reported"):
            _wd_event(st, f"build BLOCKED: {verdict.get('blocking_issue')} -- no training"); st["blocked_reported"] = True
        _wd_save(st); return {"build": "done", "verdict": verdict.get("dataset")}
    if not (R213 / "AUTO_TRAIN_AUTHORIZED").is_file():
        _wd_save(st); return {"build": "done", "verdict": "TRAINING READY", "training": "not authorized (no AUTO_TRAIN_AUTHORIZED file)"}
    if st.get("train_done"):
        _wd_save(st); return {"training": "done"}
    tstate, tmsg = _call_state(st.get("train_call_id"))
    if tstate == "none":
        call = room213_stage1_train.spawn(); st["train_call_id"] = call.object_id
        _wd_event(st, f"STAGE-1 training launched as {call.object_id}")
    elif tstate == "failed":
        relaunch("train", room213_stage1_train, "train_call_id", tmsg or "unknown")
    elif tstate == "done":
        st["train_done"] = True; _wd_event(st, "STAGE-1 training + eval finished")
    _wd_save(st); return {"training": tstate}


@app.function(
    image=gpu_image,
    gpu=GPU_TRAIN,
    timeout=230 * 60,
    memory=MEMORY_MIB,
    cpu=CPU,
    volumes={"/vol": ckpt_vol},
    secrets=[worker_secret] if worker_secret is not None else [],
    retries=0,
)
def room213_stage1_train() -> str:
    """The single authorized Stage-1 run: K6 Splatfacto recipe on the frozen raw-rig dataset
    (2560 faces, rig-constrained poses, masks, frozen holdout). Only additions to the K6 argv:
    `nerfstudio-data --downscale-factor 1 --eval-mode filename` (required to load this input as
    built). Checkpoints on the volume; resumes from the latest verified checkpoint. Followed by
    the frozen evaluation (holdout metrics, holdout renders, feature crops vs GT and vs K6)."""
    sys.path.insert(0, "/root/recon-experiment"); sys.path.insert(0, "/root/splat-lab")
    import io
    import contextlib
    stop = threading.Event()
    threading.Thread(target=_commit_every, args=(stop,), daemon=True).start()
    try:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            import room213_stage1 as m
            m.main()
        ckpt_vol.commit()
        return buf.getvalue()
    finally:
        stop.set()


def _committed_recipe(name: str) -> dict[str, Any]:
    """Recipes live in the repo (qa/*.json) so a fresh clone can launch; /experiments is gitignored."""
    for candidate in (ROOT / "qa" / name, ROOT / "experiments" / "room213-densification" / "frozen-recipe.json"):
        if candidate.is_file():
            return json.loads(candidate.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"missing committed recipe qa/{name}")


@app.local_entrypoint()
def main(phase: str = "exp3"):
    """Launcher: `modal run workers/modal/recon-experiment/worker.py --phase exp3` starts BOTH arms.

    Run only after docs/ops/ROOM213_EXPERIMENT3_FINAL.md has human launch approval.
    """
    sys.path.insert(0, str(RECON))
    if phase == "exp2":
        from experiment import ARM_A, ARM_B, arm_payload

        recipe = _committed_recipe("exp2-frozen-recipe.json")["recipe"]
        print("staging frozen views", stage_inputs.remote())
        a = train_arm.spawn({"arm": ARM_A, "recipe": recipe, **arm_payload(recipe, ARM_A)})
        b = train_arm.spawn({"arm": ARM_B, "recipe": recipe, **arm_payload(recipe, ARM_B)})
        ra, rb = a.get(), b.get()
        print(json.dumps({"arm_a": ra, "arm_b": rb, "status": "needs_review"}, indent=2, default=str))
        return
    if phase == "verify":
        result = verify_canonical_inputs.remote()
        print(json.dumps(result, indent=2, default=str))
        return
    if phase == "verify-exp3-inputs":
        doc = _committed_recipe("exp3-frozen-recipe.json")
        result = run_verify_inputs_exp3.remote(doc["recipe"])
        print(json.dumps(result, indent=2, default=str))
        return
    if phase == "haze-diagnostic":
        result = haze_diagnostic.remote()
        print(json.dumps(result, indent=2, default=str))
        return
    if phase == "exp4-results":
        result = exp4_results.remote()
        print(json.dumps(result, indent=2, default=str))
        return
    if phase == "exp4":
        import exp4

        doc = _committed_recipe("exp3-frozen-recipe.json")  # same frozen dataset identity as Arm D
        recipe = doc["recipe"]
        diff = exp4.preflight_diff(
            exp4.resolved_arm_config(exp4.ARM_D4, recipe), exp4.resolved_arm_config(exp4.ARM_E4, recipe)
        )
        if not diff["ok"] or diff["differing_keys"] != [exp4.CHANGED_VARIABLE]:
            raise SystemExit(f"PREFLIGHT STOP: arms differ in {diff['differing_keys']}")
        print("preflight ok; changed variable:", exp4.CHANGED_VARIABLE, "recipe_hash:", doc["recipe_hash"])
        print("staging frozen views", stage_inputs.remote())
        d4 = train_arm_exp4.spawn({"arm": exp4.ARM_D4, "recipe": recipe})
        e4 = train_arm_exp4.spawn({"arm": exp4.ARM_E4, "recipe": recipe})
        results4: dict[str, Any] = {}
        for name, handle in (("arm_d4", d4), ("arm_e4", e4)):
            try:
                results4[name] = handle.get()
            except Exception as exc:  # noqa: BLE001
                results4[name] = {"status": "failed", "error": str(exc)}
        print(json.dumps(
            {**results4, "status": "needs_review", "HUMAN_VISUAL_VERDICT": "UNREVIEWED"},
            indent=2, default=str,
        ))
        return
    if phase == "exp6-instrumentation-smoke-test":
        print(exp6_instrumentation_smoke_test.remote())
        return
    if phase == "room213-reassemble":
        import json as _j
        print(_j.dumps(room213_reassemble.remote(_j.loads(os.environ["ROOM213_REASSEMBLE"])), indent=1))
        return
    if phase == "room213-watchdog":
        print(json.dumps(room213_watchdog.remote(), indent=1))
        return
    if phase == "room213-stage1-train":
        print(room213_stage1_train.remote())
        return
    if phase == "room213-raw-pipeline":
        print(room213_raw_pipeline.remote())
        return
    if phase == "room213-raw-build":
        print(room213_raw_build.remote())
        return
    if phase == "room213-raw-preflight":
        print(room213_raw_preflight.remote())
        return
    if phase == "nerfstudio-downscale-introspect":
        print(nerfstudio_downscale_introspect.remote())
        return
    if phase == "exp6-scale-evolution":
        print(exp6_scale_evolution.remote())
        return
    if phase == "exp5-sanity-check":
        print(exp5_evaluator_sanity_check.remote())
        return
    if phase == "exp5-grouped-results":
        result = exp5_grouped_results.remote()
        print(json.dumps(result, indent=2, default=str))
        return
    if phase == "exp5":
        import exp5

        doc = _committed_recipe("exp5-frozen-recipe.json")
        recipe = doc["recipe"]
        diff = exp5.preflight_diff(
            exp5.resolved_arm_config(exp5.ARM_G5, recipe), exp5.resolved_arm_config(exp5.ARM_H5, recipe)
        )
        if not diff["ok"] or diff["differing_keys"] != [exp5.CHANGED_VARIABLE]:
            raise SystemExit(f"PREFLIGHT STOP: arms differ in {diff['differing_keys']}")
        print("preflight ok; changed variable:", exp5.CHANGED_VARIABLE, "recipe_hash:", doc["recipe_hash"])
        print("staging frozen views", stage_inputs.remote())
        g5 = train_arm_exp5.spawn({"arm": exp5.ARM_G5, "recipe": recipe})
        h5 = train_arm_exp5.spawn({"arm": exp5.ARM_H5, "recipe": recipe})
        results5: dict[str, Any] = {}
        for name, handle in (("arm_g5", g5), ("arm_h5", h5)):
            try:
                results5[name] = handle.get()
            except Exception as exc:  # noqa: BLE001
                results5[name] = {"status": "failed", "error": str(exc)}
        print(json.dumps(
            {**results5, "status": "needs_review", "HUMAN_VISUAL_VERDICT": "UNREVIEWED"},
            indent=2, default=str,
        ))
        return
    if phase == "exp6":
        import exp5
        import exp6

        doc = _committed_recipe("exp5-frozen-recipe.json")  # same grouped-safe dataset identity as Exp5
        recipe = doc["recipe"]
        cfg_k6 = exp6.resolved_arm_config(exp6.ARM_K6, recipe)
        cfg_l6 = exp6.resolved_arm_config(exp6.ARM_L6, recipe)
        strict = exp6.preflight_diff_k6_vs_l6(cfg_k6, cfg_l6)
        if not strict["ok"]:
            raise SystemExit(f"PREFLIGHT STOP: K6 vs L6 differ unexpectedly in {strict['differing_keys']}")
        cfg_h5 = exp5.resolved_arm_config(exp5.ARM_H5, recipe)
        info = exp6.informational_diff_h5_vs_k6(cfg_h5, cfg_k6)
        print("preflight ok; K6-vs-L6 strict diff:", strict["differing_keys"],
              "| H5-vs-K6 informational (behavioral only):", info["behavioral_differences"],
              "| recipe_hash:", doc["recipe_hash"])
        print("staging frozen views", stage_inputs.remote())
        k6 = train_arm_exp6.spawn({"arm": exp6.ARM_K6, "recipe": recipe})
        l6 = train_arm_exp6.spawn({"arm": exp6.ARM_L6, "recipe": recipe})
        results6: dict[str, Any] = {}
        for name, handle in (("arm_k6", k6), ("arm_l6", l6)):
            try:
                results6[name] = handle.get()
            except Exception as exc:  # noqa: BLE001
                results6[name] = {"status": "failed", "error": str(exc)}
        print(json.dumps(
            {**results6, "h5_16k_reference": "existing, not relaunched -- see docs/ops/exp5-room213-review/h5/",
             "status": "needs_review", "HUMAN_VISUAL_VERDICT": "UNREVIEWED"},
            indent=2, default=str,
        ))
        return
    if phase != "exp3":
        raise SystemExit("phase must be exp2, exp3, exp4, exp4-results, exp5, exp5-grouped-results, "
                          "exp6, exp6-scale-evolution, "
                          "verify, verify-exp3-inputs, or haze-diagnostic")
    import exp3

    doc = _committed_recipe("exp3-frozen-recipe.json")
    recipe = doc["recipe"]
    diff = exp3.preflight_diff(
        exp3.resolved_arm_config(exp3.ARM_C, recipe), exp3.resolved_arm_config(exp3.ARM_D, recipe)
    )
    if not diff["ok"]:
        raise SystemExit(f"PREFLIGHT STOP: arms differ in {diff['differing_keys']}")
    print("preflight ok; changed variable:", exp3.CHANGED_VARIABLE, "recipe_hash:", doc["recipe_hash"])
    print("staging frozen views", stage_inputs.remote())
    c = train_arm_exp3.spawn({"arm": exp3.ARM_C, "recipe": recipe})
    d = train_arm_exp3.spawn({"arm": exp3.ARM_D, "recipe": recipe})
    # Collect each arm's result independently: one arm's exception must never cancel
    # the other's still-running container (an uncaught exception in this entrypoint
    # would otherwise tear down the whole Modal app, per "Stopping app - uncaught
    # exception raised locally", killing a healthy sibling arm mid-training).
    results: dict[str, Any] = {}
    for name, handle in (("arm_c", c), ("arm_d", d)):
        try:
            results[name] = handle.get()
        except Exception as exc:  # noqa: BLE001
            results[name] = {"status": "failed", "error": str(exc)}
    print(json.dumps(
        {**results, "status": "needs_review", "HUMAN_VISUAL_VERDICT": "UNREVIEWED"},
        indent=2, default=str,
    ))
