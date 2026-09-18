"""Modal app: Room 213 diagnostic experiment. Does NOT flatten 360 or run SfM."""
from __future__ import annotations

import json
import os
import shutil
import sys
import tarfile
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
    if phase != "exp3":
        raise SystemExit("phase must be exp2, exp3, or verify")
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
