"""Hardened experimental Spirula worker (Modal). No web endpoint and no production callback in this milestone.

Entrypoints (all launched from a deployed app with Function.spawn / .remote; nothing depends on a local terminal):
  package_golden   CPU  build the immutable golden Room 213 package in R2 from the direct benchmark (read-only)
  package_fixture  CPU  build the small real-Spirula fixture used for the kill-and-resume proof
  lock_probe       CPU  acquire a run lease (duplicate-launch evidence)
  train_attempt    GPU  one attempt of a logical run: prepared dataset -> exact Spirula train-only command -> gate
The GPU function is max_containers=1 (one trainer at a time) with retries=0 (no automatic retries)."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path

import modal

from pin import BINARY_SHA256, CUDA_BASE_IMAGE, GPU, R2_ROOT, SPIRULA_BIN, SPIRULA_SHA, SPIRULA_SHA_FILE

APP_NAME = "slate360-spirula-hardened"
SECRET_NAME = "slate360-twin-worker"
LOCAL_BINARY = os.environ.get("SPIRULA_GOLDEN_BINARY", "")
MODULES = ("pin", "storage", "ids", "inventory", "gate", "jobspec", "runlock", "cost_guard", "train_run",
           "attempt", "dspackage")

app = modal.App(APP_NAME)
secret = modal.Secret.from_name(SECRET_NAME)
golden_vol = modal.Volume.from_name("slate360-recon-experiments")

cpu_image = (modal.Image.debian_slim(python_version="3.11").apt_install("libgl1", "libglib2.0-0")
             .pip_install("boto3", "numpy<2", "opencv-python-headless<4.11", "scipy")
             .add_local_python_source(*MODULES, "testkit", "test_hardening"))
gpu_image = (modal.Image.from_registry(CUDA_BASE_IMAGE, add_python="3.11")
             .apt_install("libgomp1", "libgl1", "libglib2.0-0")
             .pip_install("boto3", "numpy<2", "opencv-python-headless<4.11", "scipy"))
if LOCAL_BINARY:
    h = hashlib.sha256(Path(LOCAL_BINARY).read_bytes()).hexdigest()
    if h != BINARY_SHA256:
        raise RuntimeError(f"local Spirula binary {h} is not the golden build {BINARY_SHA256}")
    gpu_image = (gpu_image.add_local_file(LOCAL_BINARY, SPIRULA_BIN, copy=True)
                 .run_commands(f"chmod 755 {SPIRULA_BIN} && printf '%s\\n' {SPIRULA_SHA} > {SPIRULA_SHA_FILE}"
                               f" && printf '%s\\n' cuda > /opt/spirula/BACKEND"))
gpu_image = gpu_image.add_local_python_source(*MODULES)


def _hardware() -> dict:
    from inventory import sha256_file
    sha = Path(SPIRULA_SHA_FILE).read_text().strip()
    backend = Path("/opt/spirula/BACKEND").read_text().strip()
    binsha = sha256_file(Path(SPIRULA_BIN))
    try:
        gpu = subprocess.check_output(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
                                      text=True).strip()
    except (FileNotFoundError, subprocess.CalledProcessError) as exc:
        raise RuntimeError("nvidia-smi failed; refusing a CPU fallback") from exc
    if not gpu:
        raise RuntimeError("no GPU listed; refusing a CPU fallback")
    return {"spirulaSha": sha, "binarySha256": binsha, "backend": backend, "gpuName": gpu}


def _call_finished(call_id: str | None):
    """True only when the platform reports that call as ended (returned or raised)."""
    if not call_id:
        return None
    try:
        modal.FunctionCall.from_id(call_id).get(timeout=0)
        return True
    except TimeoutError:
        return False
    except Exception as exc:  # noqa: BLE001 - a finished call that raised is still finished
        return "running" not in str(exc).lower()


@app.function(image=gpu_image, gpu=GPU, cpu=16.0, memory=131072, timeout=4 * 60 * 60, max_containers=1,
              retries=0, scaledown_window=2, secrets=[secret])
def train_attempt(job_key: str, job_sha: str, attempt_id: str, inject_interrupt_after_step: int = 0) -> dict:
    from attempt import Ctx, run_attempt
    from storage import bucket, client
    work = Path("/tmp/spirula-work")
    fresh = {"workExistedAtStart": work.exists(), "taskId": os.environ.get("MODAL_TASK_ID")}
    ctx = Ctx(s3=client(), bucket=bucket(), root=R2_ROOT, binary=SPIRULA_BIN, hw=_hardware(),
              call_id=modal.current_function_call_id(), is_call_finished=_call_finished, work=work)
    out = run_attempt(ctx, job_key, job_sha, attempt_id, inject_interrupt_after_step)
    out["container"] = fresh
    return out


@app.function(image=cpu_image, cpu=1.0, timeout=600, secrets=[secret])
def lock_probe(run_id: str, attempt_id: str, hold_s: int = 20) -> dict:
    import time
    from runlock import LockRefused, R2Store, RunLock
    from storage import bucket, client
    lock = RunLock(R2Store(client(), bucket()), R2_ROOT, run_id, attempt_id, modal.current_function_call_id(),
                   _call_finished)
    try:
        got = lock.acquire()
    except LockRefused as exc:
        return {"acquired": False, "reason": str(exc)}
    time.sleep(hold_s)
    return {"acquired": True, **got}


@app.function(image=cpu_image, cpu=8.0, memory=32768, timeout=2 * 60 * 60, secrets=[secret],
              volumes={"/vol": golden_vol.read_only()})
def package_golden() -> dict:
    """Read-only on the golden benchmark; writes only new objects under R2_ROOT."""
    import glob
    from gate import normalized_config_sha
    from jobspec import canonical_sha
    from dspackage import dataset_manifest, put_json, upload_objects
    from storage import bucket, client
    s3, b = client(), bucket()
    base = "/vol/room213/2026-09-21/spirula_bench_v1"
    ds = Path(f"{base}/dataset")
    sman = json.load(open(f"{base}/dataset_manifest.json"))
    roles = {m["new"]: m["role"] for m in sman["images"]}
    roles.update({w["name"]: "walkthrough_eval_pinhole" for w in sman["walk"]})
    man = dataset_manifest(ds, dataset_id="room213-golden-v1", lens_folders={"camera1": 1, "camera2": 2},
                           lens_of_camera={"1": "x4-lens-stream-0", "2": "x4-lens-stream-1"}, split_rule="filename",
                           role_of=roles, extra={"sourceSolve": "fullcircle/data/room213/sparse/0 (COLMAP 3.12.6)",
                                                 "walkPoses": sman["walk"]})
    pre = f"{R2_ROOT}/datasets/room213-golden-v1"
    up = upload_objects(s3, b, f"{pre}/objects", ds, man["files"])
    man_sha = put_json(s3, b, f"{pre}/dataset_manifest.json", man)
    ds_sha = canonical_sha(man["files"])
    launch = json.load(open(sorted(glob.glob(f"{base}/launch_full_*.json"))[-1]))
    cmd = launch["cmd"]; flags = []
    i = cmd.index("--data") + 2
    while i < len(cmd):
        if cmd[i] in ("--output-dir-prefix", "--output-dir-name"):
            i += 2; continue
        flags.append([cmd[i], cmd[i + 1]]); i += 2
    cfg = json.load(open(f"{base}/runs/room213_spirula_full/config.json"))
    dump_raw = open(f"{base}/cameras_dump_train.json", "rb").read()
    s3.put_object(Bucket=b, Key=f"{pre}/golden_camera_dump.json", Body=dump_raw)
    s3.put_object(Bucket=b, Key=f"{pre}/golden_resolved_config.json", Body=json.dumps(cfg, indent=1).encode())
    job = {"schema": "spirula-job-v1", "runId": "room213-golden-repro-v1", "spirulaSha": SPIRULA_SHA,
           "binarySha256": BINARY_SHA256, "backend": "cuda", "gpu": GPU, "preset": cmd[cmd.index("train") + 1],
           "flags": flags, "expectedResolvedConfigSha256": normalized_config_sha(cfg),
           "dataset": {"manifestKey": f"{pre}/dataset_manifest.json", "manifestSha256": man_sha,
                       "datasetSha256": ds_sha, "objectsPrefix": f"{pre}/objects"},
           "terminalStep": 30000, "shDegree": 3, "countMin": 900000, "countMax": 1000000, "evalExpected": True,
           "expectedMinutes": 40, "requiredArtifactTypes": ["master-ply", "terminal-state", "resolved-config",
                                                            "train-log", "attempt-record", "fidelity-report",
                                                            "camera-dump-check", "eval-metrics"],
           "cameraDump": {"key": f"{pre}/golden_camera_dump.json", "sha256": hashlib.sha256(dump_raw).hexdigest(),
                          "goldenDataRoot": f"{base}/dataset"},
           "notes": "Exact golden recipe from the direct benchmark launch record; only output paths differ."}
    job_raw = json.dumps(job, indent=1, sort_keys=True).encode()
    job_key = f"{R2_ROOT}/jobs/room213-golden-repro-v1.json"
    s3.put_object(Bucket=b, Key=job_key, Body=job_raw, ContentType="application/json")
    golden_ply = f"{base}/runs/room213_spirula_full/step-000030000.ckpt/splat.ply"
    from inventory import sha256_file
    return {"datasetManifestKey": f"{pre}/dataset_manifest.json", "datasetManifestSha256": man_sha,
            "datasetSha256": ds_sha, "files": len(man["files"]), "images": len(man["images"]), "upload": up,
            "jobKey": job_key, "jobSha256": hashlib.sha256(job_raw).hexdigest(), "job": job,
            "goldenMasterPlySha256": sha256_file(Path(golden_ply)),
            "imagesByRole": {r: sum(1 for im in man["images"] if im["role"] == r) for r in set(roles.values())}}


@app.function(image=cpu_image, cpu=2.0, timeout=1800, secrets=[secret])
def package_fixture(run_id: str = "fixture-resume-v1") -> dict:
    import shutil
    from jobspec import canonical_sha
    from dspackage import build_fixture, dataset_manifest, put_json, upload_objects
    from storage import bucket, client
    s3, b = client(), bucket()
    root = Path("/tmp/fixture")
    shutil.rmtree(root, ignore_errors=True)
    build_fixture(root)
    man = dataset_manifest(root, dataset_id=run_id, lens_folders={"camera1": 1, "camera2": 2},
                           lens_of_camera={"1": "lens-a", "2": "lens-b"}, split_rule="filename", role_of={})
    pre = f"{R2_ROOT}/datasets/{run_id}"
    upload_objects(s3, b, f"{pre}/objects", root, man["files"])
    man_sha = put_json(s3, b, f"{pre}/dataset_manifest.json", man)
    flags = [["--data-format", "colmap"], ["--image-dir", "images"], ["--mask-dir", "masks"], ["--load-masks", "1"],
             ["--eval-mode", "filename"], ["--warp-to-pinhole", "0"], ["--train-resolution-divisor", "1"],
             ["--primitive", "3dgut"], ["--cap-max", "20000"], ["--num-iterations", "30000"],
             ["--use-bilateral-grid", "0"], ["--use-bilateral-grid-for-geometry", "0"], ["--use-ppisp", "0"],
             ["--load-depths", "0"], ["--load-normals", "0"], ["--normal-supervision-weight", "0"],
             ["--depth-supervision-weight", "0"], ["--steps-per-save", "5000"], ["--save-only-latest-checkpoint", "0"],
             ["--save-full-checkpoint", "1"], ["--save-eval-images", "0"], ["--disable-viewer", "1"],
             ["--keep-viewer-alive", "0"]]
    job = {"schema": "spirula-job-v1", "runId": run_id, "spirulaSha": SPIRULA_SHA, "binarySha256": BINARY_SHA256,
           "backend": "cuda", "gpu": GPU, "preset": "3dgs", "flags": flags, "expectedResolvedConfigSha256": "PENDING",
           "dataset": {"manifestKey": f"{pre}/dataset_manifest.json", "manifestSha256": man_sha,
                       "datasetSha256": canonical_sha(man["files"]), "objectsPrefix": f"{pre}/objects"},
           "terminalStep": 30000, "shDegree": 3, "countMin": 1, "countMax": 20000, "evalExpected": True,
           "expectedMinutes": 15, "requiredArtifactTypes": ["master-ply", "terminal-state", "resolved-config",
                                                            "train-log", "attempt-record", "fidelity-report",
                                                            "eval-metrics"],
           "notes": "Resume fixture: real Spirula, same flag family as Room 213, small cap."}
    return {"job": job, "datasetFiles": len(man["files"]), "images": len(man["images"])}


@app.function(image=cpu_image, cpu=1.0, timeout=300, secrets=[secret])
def put_job(key: str, job: dict) -> dict:
    from storage import bucket, client
    raw = json.dumps(job, indent=1, sort_keys=True).encode()
    client().put_object(Bucket=bucket(), Key=key, Body=raw, ContentType="application/json")
    return {"key": key, "sha256": hashlib.sha256(raw).hexdigest()}


@app.function(image=gpu_image, gpu=GPU, cpu=8.0, memory=65536, timeout=1800, max_containers=1, retries=0,
              secrets=[secret])
def config_probe(job_key: str, job_sha: str) -> dict:
    """Fixture bootstrap only: start the fixture trainer until Spirula writes its resolved config.json, then stop.
    Returns the normalized config hash that the fixture job then pins. (The Room 213 job pins the GOLDEN run's
    config.json instead.)"""
    import time
    from gate import normalized_config_sha
    from jobspec import build_command, load_job, materialize
    from storage import bucket, client
    from train_run import run_trainer
    s3, b = client(), bucket()
    job = load_job(s3.get_object(Bucket=b, Key=job_key)["Body"].read(), job_sha)
    work = Path("/tmp/cfgprobe"); data = work / "dataset"
    materialize(s3, b, job, data)
    cmd = build_command(SPIRULA_BIN, job, str(data), str(work), "probe")
    cfg = work / "probe" / "config.json"
    res = run_trainer(cmd, work / "probe.log", 600, poll_s=1.0,
                      on_poll=lambda e: "config written" if cfg.is_file() and cfg.stat().st_size > 100 else None)
    time.sleep(1)
    return {"sha": normalized_config_sha(json.loads(cfg.read_text())), "config": json.loads(cfg.read_text()),
            "run": res}


@app.function(image=cpu_image, cpu=2.0, timeout=900)
def selftest() -> dict:
    """The full hardening probe suite on Linux (process-group, signal and runtime probes included)."""
    import io
    import unittest
    buf = io.StringIO()
    suite = unittest.defaultTestLoader.loadTestsFromName("test_hardening")
    res = unittest.TextTestRunner(stream=buf, verbosity=2).run(suite)
    return {"ran": res.testsRun, "failures": len(res.failures), "errors": len(res.errors),
            "skipped": len(res.skipped), "ok": res.wasSuccessful(), "log": buf.getvalue()[-12000:]}


@app.function(image=gpu_image, gpu=GPU, cpu=8.0, memory=65536, timeout=3600, max_containers=1, retries=0,
              secrets=[secret])
def fidelity_probe(job_key: str, job_sha: str) -> dict:
    """Blocker-8 evidence WITHOUT training: materialize the immutable package, exhaustive fidelity over every image,
    then Spirula's own camera dump (SS_DUMP_CAMERAS exits before training) compared field-by-field to the golden dump."""
    import time
    from jobspec import build_command, compare_camera_dump, load_job, materialize, verify_fidelity
    from storage import bucket, client
    t0 = time.time()
    s3, b = client(), bucket()
    hw = _hardware()
    job = load_job(s3.get_object(Bucket=b, Key=job_key)["Body"].read(), job_sha)
    work = Path("/tmp/fid"); data = work / "dataset"
    man = materialize(s3, b, job, data)
    fid = verify_fidelity(data, man)
    t_fid = time.time() - t0
    ref = job["cameraDump"]
    raw = s3.get_object(Bucket=b, Key=ref["key"])["Body"].read()
    assert hashlib.sha256(raw).hexdigest() == ref["sha256"]
    dump = work / "camera_dump.json"
    cmd = build_command(SPIRULA_BIN, job, str(data), str(work), "dumprun")
    r = subprocess.run(cmd, env={**os.environ, "SS_DUMP_CAMERAS": str(dump)}, capture_output=True, text=True,
                       timeout=1800, cwd="/tmp")
    out = {"hardware": hw, "fidelity": fid, "fidelitySeconds": round(t_fid), "dumpExit": r.returncode,
           "dumpTail": (r.stdout + r.stderr)[-1500:], "elapsedS": round(time.time() - t0)}
    if dump.is_file():
        d = json.loads(dump.read_text())
        out["cameraDumpCheck"] = compare_camera_dump(d, json.loads(raw), str(data), ref["goldenDataRoot"])
        out["dumpSha256"] = hashlib.sha256(dump.read_bytes()).hexdigest()
        out["trainFrameScale"] = d.get("train_frame_scale"); out["numPoints"] = d.get("num_points")
    return out
