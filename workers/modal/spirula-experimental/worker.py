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

from pin import (BINARY_R2_KEY, BINARY_SHA256, CUDA_BASE_IMAGE, GPU, R2_ROOT, SPIRULA_BIN, SPIRULA_BUILD_ID,
                 SPIRULA_SHA, SPIRULA_SHA_FILE)

APP_NAME = "slate360-spirula-hardened"
SECRET_NAME = "slate360-twin-worker"
MODULES = ("pin", "storage", "ids", "inventory", "gate", "jobspec", "runlock", "cost_guard", "train_run", "abtools",
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


def _fetch_binary(key: str, want: str, bin_path: str, sha_file: str, build_id: str):
    """Image build step: pull the patched build from R2 and refuse the image unless its sha256 is the pinned one."""
    import hashlib as _h
    import os as _os
    import boto3
    ep = _os.environ.get("R2_ENDPOINT") or f"https://{_os.environ['CLOUDFLARE_ACCOUNT_ID'].strip()}.r2.cloudflarestorage.com"
    s3 = boto3.client("s3", endpoint_url=ep, aws_access_key_id=_os.environ["R2_ACCESS_KEY_ID"],
                      aws_secret_access_key=_os.environ["R2_SECRET_ACCESS_KEY"], region_name="auto")
    _os.makedirs("/opt/spirula/bin", exist_ok=True)
    s3.download_file(_os.environ["R2_BUCKET"], key, bin_path)
    h = _h.sha256(open(bin_path, "rb").read()).hexdigest()
    if h != want:
        raise RuntimeError(f"fetched Spirula binary {h} is not the pinned build {want}")
    _os.chmod(bin_path, 0o755)
    open(sha_file, "w").write(build_id + chr(10))
    open("/opt/spirula/BACKEND", "w").write("cuda" + chr(10))


gpu_image = gpu_image.add_local_python_source("pin", copy=True).run_function(_fetch_binary, secrets=[secret], kwargs={
    "key": BINARY_R2_KEY, "want": BINARY_SHA256, "bin_path": SPIRULA_BIN, "sha_file": SPIRULA_SHA_FILE,
    "build_id": SPIRULA_BUILD_ID})
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
    job = {"schema": "spirula-job-v1", "runId": "room213-golden-repro-v1", "spirulaSha": SPIRULA_BUILD_ID,
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
    job = {"schema": "spirula-job-v1", "runId": run_id, "spirulaSha": SPIRULA_BUILD_ID, "binarySha256": BINARY_SHA256,
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


build_image = (modal.Image.from_registry(CUDA_BASE_IMAGE, add_python="3.11")
               .apt_install("git", "wget", "ca-certificates", "build-essential", "ninja-build", "libgomp1", "libgl1",
                            "libglib2.0-0", "python3")
               .run_commands("pip install cmake==3.31.6").pip_install("boto3")
               .env({"NVIDIA_DRIVER_CAPABILITIES": "compute,utility"}).add_local_python_source(*MODULES))

RESUME_PATCH_OLD = "    target.num_sh         = (cfg.sh_degree + 1) * (cfg.sh_degree + 1);\n"
RESUME_PATCH_NEW = "    target.num_sh         = (cfg.sh_degree + 1) * (cfg.sh_degree + 1) - 1;\n"


@app.function(image=build_image, cpu=32.0, memory=131072, timeout=4 * 60 * 60, secrets=[secret])
def build_patched() -> dict:
    """Golden build recipe (same image, cmake, flags) + ONE line: the resume target counts SH rest coefficients
    ((d+1)^2 - 1) like fresh init and the checkpoint writer do. Output goes to R2, recorded as upstream SHA + patch."""
    import time
    from inventory import sha256_file
    from storage import bucket, client
    t0 = time.time(); src = Path("/tmp/spirula-src")
    r0 = subprocess.run(["bash", "-c", f"git clone -q https://github.com/harry7557558/spirula-studio.git {src} && "
                         f"cd {src} && git checkout -q {SPIRULA_SHA} && git rev-parse HEAD"],
                        capture_output=True, text=True)
    if r0.stdout.strip() != SPIRULA_SHA:
        raise RuntimeError(f"checkout failed: {r0.stdout} {r0.stderr}")
    f = src / "src/app/TrainerCore.cpp"
    text = f.read_text()
    if text.count(RESUME_PATCH_OLD) != 1:
        raise RuntimeError("patch anchor not found exactly once")
    f.write_text(text.replace(RESUME_PATCH_OLD, RESUME_PATCH_NEW))
    diff = subprocess.run(["git", "-C", str(src), "diff"], capture_output=True, text=True).stdout
    patch_sha = hashlib.sha256(diff.encode()).hexdigest()
    r = subprocess.run(["bash", "-c", f"cd {src} && bash build_develop.bash -DSS_BACKEND=cuda -DSS_BUILD_GUI=OFF "
                        "-DTORCH_CUDA_ARCH_LIST=8.9 -DSS_CHECK_COMMENTS=OFF"], capture_output=True, text=True)
    binp = src / "build_cuda/spirula"
    out = {"ok": binp.is_file(), "exit": r.returncode, "elapsedS": round(time.time() - t0), "patchSha256": patch_sha,
           "diff": diff, "tail": (r.stdout + r.stderr)[-2000:]}
    if binp.is_file():
        s3, b = client(), bucket()
        out["binarySha256"] = sha256_file(binp); out["bytes"] = binp.stat().st_size
        pre = f"{R2_ROOT}/tools/spirula/{SPIRULA_SHA}+resume-nsh-{patch_sha[:12]}"
        s3.upload_file(str(binp), b, f"{pre}/spirula")
        s3.put_object(Bucket=b, Key=f"{pre}/resume-nsh.patch", Body=diff.encode())
        s3.put_object(Bucket=b, Key=f"{pre}/build.json", Body=json.dumps({k: v for k, v in out.items()}).encode())
        out["r2Prefix"] = pre
    return out


compare_image = (modal.Image.debian_slim(python_version="3.11").apt_install("libgl1", "libglib2.0-0", "ffmpeg")
                 .pip_install("boto3", "numpy<2", "opencv-python-headless<4.11").add_local_python_source(*MODULES, "compare"))


@app.function(image=compare_image, cpu=16.0, memory=65536, timeout=2 * 60 * 60, secrets=[secret],
              volumes={"/vol": golden_vol.read_only()})
def compare_golden(final_prefix: str) -> dict:
    """Read-only on the golden run; downloads the worker's accepted artifacts from R2 (hash-checked against the
    stored inventory), compares, and uploads the comparison under <final_prefix>/../compare/."""
    import base64
    from compare import compare
    from storage import bucket, client
    s3, b = client(), bucket()
    inv = json.loads(s3.get_object(Bucket=b, Key=f"{final_prefix}/inventory.json")["Body"].read())
    root = Path("/tmp/worker")
    for it in inv["items"]:
        if not (it["path"].startswith("run/") and (it["type"] in ("master-ply", "eval-image", "eval-metrics"))):
            continue
        dest = root / it["path"][len("run/"):]; dest.parent.mkdir(parents=True, exist_ok=True)
        body = s3.get_object(Bucket=b, Key=f"{final_prefix}/{it['path']}")["Body"].read()
        if hashlib.sha256(body).hexdigest() != it["sha256"]:
            raise RuntimeError(f"{it['path']} does not match the accepted inventory")
        dest.write_bytes(body)
    out = Path("/tmp/compare")
    res = compare(root, out)
    cpre = final_prefix.rsplit("/final/", 1)[0] + "/compare"
    files = {}
    for p in sorted(out.glob("*")):
        if p.is_file():
            s3.upload_file(str(p), b, f"{cpre}/{p.name}")
            if p.suffix == ".jpg":
                files[p.name] = base64.b64encode(p.read_bytes()).decode()
    s3.put_object(Bucket=b, Key=f"{cpre}/compare.json", Body=json.dumps(res, indent=1).encode())
    return {"result": res, "images": files, "prefix": cpre}


diag_image = (modal.Image.debian_slim(python_version="3.11").apt_install("libgl1", "libglib2.0-0")
              .pip_install("boto3", "numpy<2", "opencv-python-headless<4.11", "scipy").add_local_python_source(*MODULES, "softdiag", "srcaudit", "ppispcheck"))


@app.function(image=diag_image, cpu=16.0, memory=65536, timeout=3600, volumes={"/vol": golden_vol.read_only()})
def soft_diagnostic() -> dict:
    """Step 0: read-only analysis of the existing 1M model's soft regions (no training, no tuning)."""
    from softdiag import run
    return run()


def _job(s3, b, key, sha):
    from jobspec import load_job
    job = load_job(s3.get_object(Bucket=b, Key=key)["Body"].read(), sha)
    job["datasetSha256"] = job["dataset"]["datasetSha256"]
    return job


@app.function(image=gpu_image, gpu=GPU, cpu=16.0, memory=131072, timeout=2 * 60 * 60, max_containers=1, retries=0,
              secrets=[secret])
def ab_prepare(job_key: str, job_sha: str, ref_final_prefix: str, probe_steps: int = 3000,
               check_warp: bool = False) -> dict:
    """Before an A/B launch: resolved-config hash + diff vs golden, (warp) face-pose inheritance check, and a bounded
    throughput probe calibrated against the reference run's own step timeline. Produces no accepted artifact."""
    import time
    from abtools import parse_timeline, throughput_probe, warp_camera_check
    from gate import normalized_config_sha
    from jobspec import build_command, materialize
    from storage import bucket, client
    from train_run import run_trainer
    s3, b = client(), bucket(); t0 = time.time()
    job = _job(s3, b, job_key, job_sha)
    work = Path("/tmp/abprep"); data = work / "dataset"
    materialize(s3, b, job, data)
    out = {"hardware": _hardware()}
    cfgp = work / "cfg" / "config.json"
    run_trainer(build_command(SPIRULA_BIN, job, str(data), str(work), "cfg"), work / "cfg.log", 900, poll_s=1.0,
                on_poll=lambda e: "config written" if cfgp.is_file() and cfgp.stat().st_size > 100 else None)
    time.sleep(1)
    cfg = json.loads(cfgp.read_text())
    gcfg = json.loads(s3.get_object(Bucket=b, Key=f"{R2_ROOT}/datasets/room213-golden-v1/golden_resolved_config.json")["Body"].read())
    skip = {"data", "output_dir_prefix", "output_dir_name", "resume"}
    out["resolvedConfigSha256"] = normalized_config_sha(cfg)
    out["configDiffVsGolden"] = {k: {"golden": gcfg.get(k), "this": cfg.get(k)} for k in sorted(set(cfg) | set(gcfg))
                                 if k not in skip and cfg.get(k) != gcfg.get(k)}
    if check_warp:
        gd = json.loads(s3.get_object(Bucket=b, Key=f"{R2_ROOT}/datasets/room213-golden-v1/golden_camera_dump.json")["Body"].read())
        out["warpCameraCheck"] = warp_camera_check(SPIRULA_BIN, job, data, work, gd)
    out["probe"] = throughput_probe(SPIRULA_BIN, job, data, work, probe_steps, 3600)
    ref = parse_timeline(s3.get_object(Bucket=b, Key=f"{ref_final_prefix}/train.log")["Body"].read().decode(errors="replace"))
    out["referenceTimeline"] = ref[::10] + ref[-1:]
    pr = out["probe"]["steps"]
    if pr and ref:
        s_last, _, e_last = pr[-1]
        e_ref = next(e for s, _, e in ref if s >= s_last)
        out["probeVsReferenceAtStep"] = {"step": s_last, "probeS": e_last, "referenceS": e_ref,
                                         "ratio": round(e_last / max(e_ref, 1e-6), 3), "referenceTotalS": ref[-1][2]}
    out["elapsedS"] = round(time.time() - t0)
    return out


@app.function(image=gpu_image, gpu=GPU, cpu=16.0, memory=131072, timeout=3 * 60 * 60, max_containers=1, retries=0,
              secrets=[secret])
def ab_native_render(final_prefix: str, native_job_key: str, native_job_sha: str, cap: str, iters: str,
                     out_prefix: str) -> dict:
    """Render an accepted model at the native fisheye eval cameras (see abtools.native_rerender) and upload the eval
    renders with an inventory + fresh read. Evaluation only; never an accepted training artifact."""
    import hashlib as _h
    import time
    from abtools import native_rerender
    from inventory import build_inventory, upload_inventory, verify_remote
    from jobspec import materialize
    from storage import bucket, client
    s3, b = client(), bucket(); t0 = time.time()
    job = _job(s3, b, native_job_key, native_job_sha)
    inv = json.loads(s3.get_object(Bucket=b, Key=f"{final_prefix}/inventory.json")["Body"].read())
    work = Path("/tmp/nr"); data = work / "dataset"
    import shutil
    shutil.rmtree(work, ignore_errors=True)
    ck = work / "src" / f"step-{int(iters):09d}.ckpt"; ck.mkdir(parents=True)
    for it in inv["items"]:
        if it["type"] in ("terminal-state", "master-ply", "resolved-config"):
            body = s3.get_object(Bucket=b, Key=f"{final_prefix}/{it['path']}")["Body"].read()
            if _h.sha256(body).hexdigest() != it["sha256"]:
                raise RuntimeError(f"{it['path']} does not match the accepted inventory")
            # the run's own resolved config sits beside the checkpoint (Spirula rebuilds the config from it; every
            # explicit CLI flag -- the native dataset flags -- then overrides it)
            dest = ck.parent / "config.json" if it["type"] == "resolved-config" else ck / Path(it["path"]).name
            dest.write_bytes(body)
    materialize(s3, b, job, data)
    res = native_rerender(SPIRULA_BIN, job, data, work, ck, cap, iters)
    run = work / "nrender"
    res["runListing"] = sorted(p.name for p in run.iterdir())[:40] if run.exists() else None
    res["srcListing"] = sorted(str(p.relative_to(work)) for p in (work / "src").rglob("*")); res["codeVersion"] = "nr-3"
    if not res["evalWritten"] or res["adapted"] or not res["resumed"] or res["trainedSteps"]:
        res["log"] = (work / "nrender.log").read_text(errors="replace")[-6000:]
        return res
    files = [(p.relative_to(work).as_posix(), "eval-image", None) for p in sorted(run.glob("eval-*.png"))]
    files += [("nrender/metrics.json", "eval-metrics", None), ("nrender.log", "render-log", None)]
    inv2 = build_inventory(work, files, "native-render", "native-render")
    upload_inventory(s3, b, out_prefix, work, inv2)
    res["inventory"] = verify_remote(s3, b, out_prefix, inv2, {"eval-image", "eval-metrics"})
    res["evalImages"] = len(files) - 2; res["elapsedS"] = round(time.time() - t0); res["outPrefix"] = out_prefix
    return res


ab_cmp_image = (modal.Image.debian_slim(python_version="3.11").apt_install("libgl1", "libglib2.0-0", "ffmpeg")
                .pip_install("boto3", "numpy<2", "opencv-python-headless<4.11", "scipy")
                .pip_install("torch==2.5.1", "torchvision==0.20.1", index_url="https://download.pytorch.org/whl/cpu")
                .pip_install("lpips==0.1.4").run_commands("python -c \"import lpips; lpips.LPIPS(net='alex', verbose=False)\"")
                .add_local_python_source(*MODULES, "abcompare"))


@app.function(image=ab_cmp_image, cpu=16.0, memory=65536, timeout=3 * 60 * 60, secrets=[secret],
              volumes={"/vol": golden_vol.read_only()})
def ab_compare(prefixes: dict, out_prefix: str) -> dict:
    """prefixes: {label: R2 prefix holding an eval render set with inventory.json (native cameras)}."""
    import base64
    from abcompare import compare_ab
    from storage import bucket, client
    s3, b = client(), bucket()
    runs = {}
    for lab, pre in prefixes.items():
        inv = json.loads(s3.get_object(Bucket=b, Key=f"{pre}/inventory.json")["Body"].read())
        d = Path(f"/tmp/ab/{lab}")
        for it in inv["items"]:
            if it["type"] != "eval-image":
                continue
            body = s3.get_object(Bucket=b, Key=f"{pre}/{it['path']}")["Body"].read()
            if hashlib.sha256(body).hexdigest() != it["sha256"]:
                raise RuntimeError(f"{lab}: {it['path']} does not match its inventory")
            dest = d / Path(it["path"]).name; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(body)
        runs[lab] = d
    out = Path("/tmp/ab_out")
    res = compare_ab(runs, out)
    imgs = {}
    for p in sorted(out.glob("*")):
        if p.is_file():
            s3.upload_file(str(p), b, f"{out_prefix}/{p.name}")
            if p.suffix == ".jpg":
                imgs[p.name] = base64.b64encode(p.read_bytes()).decode()
    s3.put_object(Bucket=b, Key=f"{out_prefix}/ab.json", Body=json.dumps(res, indent=1).encode())
    return {"result": res, "images": imgs}


@app.function(image=diag_image, cpu=16.0, memory=65536, timeout=3600, volumes={"/vol": golden_vol.read_only()})
def soft_crossview() -> dict:
    """Step 0b: is the source's fine texture real (consistent across neighbouring views) or noise?"""
    from softdiag import crossview
    return crossview()


@app.function(image=diag_image, cpu=4.0, memory=16384, timeout=1800, volumes={"/vol": golden_vol.read_only()})
def soft_grain() -> dict:
    from softdiag import grain_floor
    return grain_floor()


@app.function(image=cpu_image, cpu=8.0, memory=32768, timeout=2 * 60 * 60, secrets=[secret])
def reverify_final(job_key: str, job_sha: str, attempt_id: str) -> dict:
    """Acceptance re-check for an attempt whose training + local gate checks finished and whose artifacts were fully
    uploaded, but whose fresh-read verification hit a transport error. Uses ONLY the attempt's own pre-upload
    inventory.json; re-downloads and re-validates terminal state, master PLY, resolved config and the train log with
    the same gate functions. Records `acceptance-recheck.json`; it does not retrain or rewrite any artifact."""
    import tempfile
    from gate import (GateRejected, check_ply, exit_acceptable, normalized_config_sha, parse_state_tar,
                      terminal_evidence)
    from inventory import verify_remote
    from storage import bucket, client
    s3, b = client(), bucket()
    job = _job(s3, b, job_key, job_sha)
    pre = f"{R2_ROOT}/runs/{job['runId']}/final/{attempt_id}"
    inv = json.loads(s3.get_object(Bucket=b, Key=f"{pre}/inventory.json")["Body"].read())
    if inv["attemptId"] != attempt_id or inv["runId"] != job["runId"]:
        raise GateRejected("inventory belongs to another attempt")
    by = {it["type"]: it for it in inv["items"] if it["type"] in ("terminal-state", "master-ply", "resolved-config", "train-log")}
    T = int(job["terminalStep"]); d = Path(tempfile.mkdtemp())
    for k, it in by.items():
        body = s3.get_object(Bucket=b, Key=f"{pre}/{it['path']}")["Body"].read()
        if hashlib.sha256(body).hexdigest() != it["sha256"]:
            raise GateRejected(f"{it['path']} differs from the pre-upload inventory")
        (d / k).write_bytes(body)
    log = (d / "train-log").read_text(errors="replace")
    exit_code = -11 if "=== Spirula Studio crash report ===" in log else 0
    out = {"exit": exit_acceptable(exit_code, log)["acceptedAs"], "evidence": terminal_evidence(log, T, bool(job["evalExpected"]))}
    st = parse_state_tar(d / "terminal-state")
    if st["step"] != T or by["terminal-state"]["terminalStep"] != T:
        raise GateRejected("terminal state is not step T")
    out["stateTar"] = {k: v for k, v in st.items() if k != "state"}
    out["masterPly"] = check_ply(d / "master-ply", int(job["shDegree"]), int(job["countMin"]), int(job["countMax"]))
    cfg = normalized_config_sha(json.loads((d / "resolved-config").read_text()))
    if cfg != job["expectedResolvedConfigSha256"]:
        raise GateRejected("resolved config differs from the job")
    out["resolvedConfigSha256"] = cfg
    out["inventory"] = verify_remote(s3, b, pre, inv, set(job["requiredArtifactTypes"]))
    out["note"] = "acceptance re-check after a transport timeout in the original fresh read; no retraining"
    s3.put_object(Bucket=b, Key=f"{pre}/acceptance-recheck.json", Body=json.dumps(out, indent=1).encode())
    return out


@app.function(image=diag_image, cpu=16.0, memory=65536, timeout=3 * 3600, secrets=[secret],
              volumes={"/vol": golden_vol.read_only()})
def source_audit(freeze_key: str = "") -> dict:
    """Prerequisite 4 (read-only): geometric multi-view repeatability of the predefined targets; optionally freeze."""
    from srcaudit import audit
    res = audit()
    if freeze_key:
        from storage import bucket, client
        client().put_object(Bucket=bucket(), Key=freeze_key, Body=json.dumps(res, indent=1).encode())
    return res


@app.function(image=diag_image, cpu=8.0, memory=32768, timeout=3600, secrets=[secret],
              volumes={"/vol": golden_vol.read_only()})
def frozen_target_views(audit_key: str, freeze_key: str) -> dict:
    from srcaudit import target_views
    from storage import bucket, client
    s3, b = client(), bucket()
    res = target_views(json.loads(s3.get_object(Bucket=b, Key=audit_key)["Body"].read()))
    s3.put_object(Bucket=b, Key=freeze_key, Body=json.dumps(
        {"frozen": res["frozen"], "views": [{k: v for k, v in x.items() if k != "rectifiedSourcePng"} for x in res["views"]]},
        indent=1).encode())
    return res


@app.function(image=diag_image, cpu=8.0, memory=32768, timeout=3600, secrets=[secret],
              volumes={"/vol": golden_vol.read_only()})
def ppisp_engagement(final_prefix: str, ckpt5000_prefix: str, render_eval_index_prefix: str = "") -> dict:
    """Experiment-1 check: learned PPISP parameters, optimizer state, and the effect of a learned correction."""
    import cv2
    import numpy as np
    from ppispcheck import check
    from storage import bucket, client
    s3, b = client(), bucket()
    get = lambda k: s3.get_object(Bucket=b, Key=k)["Body"].read()
    inv = json.loads(get(f"{final_prefix}/inventory.json"))
    st_item = next(it for it in inv["items"] if it["type"] == "terminal-state")
    final_state = get(f"{final_prefix}/{st_item['path']}")
    if hashlib.sha256(final_state).hexdigest() != st_item["sha256"]:
        raise RuntimeError("terminal state differs from the accepted inventory")
    ck = json.loads(get(f"{ckpt5000_prefix}/ckpt.json"))
    c5 = get(f"{ckpt5000_prefix}/" + next(it["path"] for it in ck["inventory"]["items"] if it["type"] == "ckpt-state"))
    dump = json.loads(get(f"{R2_ROOT}/datasets/room213-golden-v1/golden_camera_dump.json"))
    names = [x.split("/dataset/images/")[-1] for x in dump["image_filenames"]]
    G = "/vol/room213/2026-09-21/spirula_bench_v1"
    ev = json.load(open(f"{G}/eval_full/eval.json"))
    man = json.load(open(f"{G}/dataset_manifest.json"))
    fx = man["fixed_eval"]["camera2/frame_00103.png"]
    gold_gt = (Path(G) / "runs/room213_spirula_full" / f"eval-gt-{ev['identified'][fx]['eval_index']:05d}.png").read_bytes()
    h = hashlib.sha256(gold_gt).hexdigest()
    ren = gt = None
    for it in inv["items"]:
        if it["type"] == "eval-image" and "eval-gt-" in it["path"] and it["sha256"] == h:
            gt = cv2.imdecode(np.frombuffer(get(f"{final_prefix}/{it['path']}"), np.uint8), cv2.IMREAD_COLOR)
            rp = it["path"].replace("eval-gt-", "eval-render-")
            ren = cv2.imdecode(np.frombuffer(get(f"{final_prefix}/{rp}"), np.uint8), cv2.IMREAD_COLOR)
    twin = names.index("camera2/frame_00103_train.png")
    mask = cv2.imread(f"{G}/dataset/masks/{fx}", 0) > 127
    return check(final_state, c5, names, ren, gt, twin, mask)


lineage_image = (modal.Image.debian_slim(python_version="3.11").apt_install("libgl1", "libglib2.0-0", "ffmpeg")
                 .pip_install("boto3", "numpy<2", "opencv-python-headless<4.11", "scipy", "av")
                 .add_local_python_source(*MODULES, "srcaudit", "lineage", "lineage_ext"))


@app.function(image=lineage_image, cpu=16.0, memory=98304, timeout=3 * 3600, secrets=[secret],
              volumes={"/vol": golden_vol.read_only()})
def feature_lineage(frozen_key: str, final_3m: str, final_ppisp: str, extra: dict | None = None) -> dict:
    """Mandatory root-cause diagnostic (read-only): lineage, multi-view agreement, allocation for 3 frozen edges."""
    import base64
    import av
    import cv2
    import numpy as np
    from lineage import run, sheets, stage_sheet
    from storage import bucket, client
    s3, b = client(), bucket()
    get = lambda k: s3.get_object(Bucket=b, Key=k)["Body"].read()
    G = "/vol/room213/2026-09-21/spirula_bench_v1"
    frozen = json.loads(get(frozen_key))["frozen"]
    # decoded .insv frame (camera2 = stream 1, frame 1120)
    c = av.open("/vol/room213/2026-09-21/raw-capture-test/VID_20260921_111410_00_075.insv")
    dec = None
    for i, fr in enumerate(c.decode(c.streams.video[1])):
        if i == 1120:
            dec = fr.to_ndarray(format="bgr24"); break
    ev = json.load(open(f"{G}/eval_full/eval.json")); man = json.load(open(f"{G}/dataset_manifest.json"))
    fx = man["fixed_eval"]["camera2/frame_00103.png"]; gi = ev["identified"][fx]["eval_index"]
    gold_gt = (Path(G) / "runs/room213_spirula_full" / f"eval-gt-{gi:05d}.png").read_bytes()
    h = hashlib.sha256(gold_gt).hexdigest()
    renders = {"1M": cv2.imread(f"{G}/runs/room213_spirula_full/eval-render-{gi:05d}.png")}
    for lab, pre in (("3M", final_3m), ("PPISP_1M", final_ppisp), *((extra or {}).items())):
        inv = json.loads(get(f"{pre}/inventory.json"))
        it = next(x for x in inv["items"] if x["type"] == "eval-image" and "eval-gt-" in x["path"] and x["sha256"] == h)
        renders[lab] = cv2.imdecode(np.frombuffer(get(f"{pre}/{it['path'].replace('eval-gt-', 'eval-render-')}"), np.uint8), cv2.IMREAD_COLOR)
    inv3 = json.loads(get(f"{final_3m}/inventory.json"))
    ply3 = next(x for x in inv3["items"] if x["type"] == "master-ply")
    Path("/tmp/m3.ply").write_bytes(get(f"{final_3m}/{ply3['path']}"))
    if hashlib.sha256(Path("/tmp/m3.ply").read_bytes()).hexdigest() != ply3["sha256"]:
        raise RuntimeError("3M PLY differs from its accepted inventory")
    res = run({"frozenAnchors": frozen}, f"{G}/runs/room213_spirula_full/step-000030000.ckpt/splat.ply", "/tmp/m3.ply",
              renders, dec)
    stage_imgs = {"decoded_insv": dec, "dataset_png": cv2.imread(f"{G}/dataset/images/camera2/frame_00103_train.png"),
                  "loss_tensor_evalgt": cv2.imread(f"{G}/runs/room213_spirula_full/eval-gt-{gi:05d}.png"),
                  **{f"spirula_render_{k}": v for k, v in renders.items()}}
    imgs = {f"validation_{k}.jpg": base64.b64encode(v).decode() for k, v in sheets(res).items()}
    imgs.update({f"lineage_{k}.jpg": base64.b64encode(v).decode() for k, v in stage_sheet(res, stage_imgs).items()})
    s3.put_object(Bucket=b, Key=f"{R2_ROOT}/photoreal/feature_lineage{'_x' if extra else ''}.json", Body=json.dumps(res, indent=1, default=float).encode())
    return {"result": res, "images": imgs}


@app.function(image=lineage_image, cpu=16.0, memory=65536, timeout=3 * 3600, secrets=[secret],
              volumes={"/vol": golden_vol.read_only()})
def feature_lineage_ext(final_3m: str, final_ppisp: str, only: str = "", extra: dict | None = None) -> dict:
    """Extended read-only lineage: baseboard edge, ceiling tile corner (2D residual), carpet texture patch."""
    import base64
    import av
    import cv2
    import numpy as np
    from lineage_ext import run, sheets
    from storage import bucket, client
    s3, b = client(), bucket()
    get = lambda k: s3.get_object(Bucket=b, Key=k)["Body"].read()
    G = "/vol/room213/2026-09-21/spirula_bench_v1"
    c = av.open("/vol/room213/2026-09-21/raw-capture-test/VID_20260921_111410_00_075.insv")
    dec = None
    for i, fr in enumerate(c.decode(c.streams.video[1])):
        if i == 1120:
            dec = fr.to_ndarray(format="bgr24"); break
    ev = json.load(open(f"{G}/eval_full/eval.json")); man = json.load(open(f"{G}/dataset_manifest.json"))
    fx = man["fixed_eval"]["camera2/frame_00103.png"]; gi = ev["identified"][fx]["eval_index"]
    h = hashlib.sha256((Path(G) / "runs/room213_spirula_full" / f"eval-gt-{gi:05d}.png").read_bytes()).hexdigest()
    gray = lambda im: cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
    stages = {"decoded_insv_frame": gray(dec),
              "spirula_dataset_png": gray(cv2.imread(f"{G}/dataset/images/camera2/frame_00103_train.png")),
              "loss_tensor_evalgt": gray(cv2.imread(f"{G}/runs/room213_spirula_full/eval-gt-{gi:05d}.png")),
              "spirula_render_1M": gray(cv2.imread(f"{G}/runs/room213_spirula_full/eval-render-{gi:05d}.png"))}
    for lab, pre in (("3M", final_3m), ("PPISP_1M", final_ppisp), *((extra or {}).items())):
        inv = json.loads(get(f"{pre}/inventory.json"))
        it = next(x for x in inv["items"] if x["type"] == "eval-image" and "eval-gt-" in x["path"] and x["sha256"] == h)
        stages[f"spirula_render_{lab}"] = gray(cv2.imdecode(np.frombuffer(get(f"{pre}/{it['path'].replace('eval-gt-', 'eval-render-')}"), np.uint8), cv2.IMREAD_COLOR))
    res = run(f"{G}/runs/room213_spirula_full/step-000030000.ckpt/splat.ply", stages, only)
    imgs = {f"validation_{k}.jpg": base64.b64encode(v).decode() for k, v in sheets(res).items()}
    s3.put_object(Bucket=b, Key=f"{R2_ROOT}/photoreal/feature_lineage_ext{'_' + only if only else ''}{'_x' if extra else ''}.json", Body=json.dumps(res, indent=1, default=float).encode())
    return {"result": res, "images": imgs}


@app.function(image=diag_image, cpu=8.0, memory=32768, timeout=1800, volumes={"/vol": golden_vol.read_only()})
def target_error_map() -> dict:
    """Is each frozen target HIGH error (actively targeted by SSIM-CS densification) or LOW error (ignored) in the
    1M model at the fixed training camera? Per-pixel 1-SSIM_cs (the densify_loss_map_mode) and |render-source|,
    32-px window mean at each target, ranked against every valid pixel of the view."""
    import cv2
    import numpy as np
    G = "/vol/room213/2026-09-21/spirula_bench_v1"
    ev = json.load(open(f"{G}/eval_full/eval.json")); man = json.load(open(f"{G}/dataset_manifest.json"))
    fx = man["fixed_eval"]["camera2/frame_00103.png"]; gi = ev["identified"][fx]["eval_index"]
    gt = cv2.cvtColor(cv2.imread(f"{G}/dataset/images/camera2/frame_00103_train.png"), cv2.COLOR_BGR2GRAY).astype(np.float64)
    rd = cv2.cvtColor(cv2.imread(f"{G}/runs/room213_spirula_full/eval-render-{gi:05d}.png"), cv2.COLOR_BGR2GRAY).astype(np.float64)
    m = cv2.imread(f"{G}/dataset/masks/{fx}", 0) > 127
    bl = lambda x: cv2.GaussianBlur(x, (11, 11), 1.5)
    mu_a, mu_b = bl(rd), bl(gt)
    va = bl(rd * rd) - mu_a ** 2; vb = bl(gt * gt) - mu_b ** 2; cov = bl(rd * gt) - mu_a * mu_b
    C2 = (0.03 * 255) ** 2
    cs = (2 * cov + C2) / (va + vb + C2)
    err_cs = 1 - cs; err_l1 = np.abs(rd - gt)
    win = lambda e: cv2.blur(e, (33, 33))
    E_cs, E_l1 = win(err_cs), win(err_l1)
    valid_cs = E_cs[m]; valid_l1 = E_l1[m]
    pts = {"chair_slat": (2701, 2811), "table_edge": (2428, 3035), "window_frame": (1801, 2285), "baseboard": (756, 2878),
           "tile_corner": (995, 1018), "carpet": (1029, 3093)}
    out = {"view": fx, "imageMedian1mSSIMcs": round(float(np.median(valid_cs)), 4), "imageMedianL1": round(float(np.median(valid_l1)), 2)}
    for k, (x, y) in pts.items():
        a, b = float(E_cs[y, x]), float(E_l1[y, x])
        out[k] = {"err1mSSIMcs": round(a, 4), "percentileSSIMcs": round(float((valid_cs < a).mean() * 100), 1),
                  "errL1": round(b, 2), "percentileL1": round(float((valid_l1 < b).mean() * 100), 1)}
    return out
