"""Room 213 detail diagnostic (render-only). Separate Modal app; never touches slate360-spirula-hardened jobs/outputs,
slate360-backyard-exp, the benchmark volume (mounted READ-ONLY) or any accepted run prefix (read-only).

GPU function `spirula_stages` renders both models at the matched pinhole cameras through Spirula's own eval path:
  stage A  --resume <terminal step-000030000.ckpt> (state.tar = the SAVED state), --num-iterations 30000 -> 0 steps
           trained; exercises the patched resume path (fd1afca1+resume-nsh: checkpoint num_sh 15 == target 15, so no
           host adapt). Rejected in analysis if the log shows any trained step or a layout adapt.
  stage B  --init-ply <exported splat.ply>, --num-iterations 0 -> the PLY reader (seed_splats_from_ply) fills the
           world, the loop runs 0 steps, eval renders it. convert_initial_point_cloud_color unset (false): DC copied raw.
Both use the model's own resolved flags (3dgut, warp 0, SH 3, PPISP/grid off, 1M cap) on a small diagnostic COLMAP
dataset: 2 original training fisheye frames (train split, required by the parser; never trained on) + the 12 matched
pinhole views as the eval split, GT = the rectified source reference.

deploy: cd workers/modal/room213-detail-diag && PYTHONIOENCODING=utf-8 python -m modal deploy diag_app.py"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

import modal

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "spirula-experimental"))
from pin import BINARY_R2_KEY, BINARY_SHA256, CUDA_BASE_IMAGE, SPIRULA_BIN, SPIRULA_BUILD_ID, SPIRULA_SHA_FILE  # noqa: E402

APP_NAME = "slate360-room213-detail-diag"
DIAG = "experimental/spirula-hardened/detail-diag-2026-09-25"
GOLD_RUN = "/vol/room213/2026-09-21/spirula_bench_v1/runs/room213_spirula_full"
EDGE_FINAL = "experimental/spirula-hardened/runs/room213-edgeaware-densify-v1/final/room213-edgeaware-densify-v1-a01"
DS_OBJ = "experimental/spirula-hardened/datasets/room213-golden-v1"
MODELS = {
    "golden": {"state": "3d0784644c6a0547fe3432aa00267f14e636362a0af456dc25cc18692a719e89",
               "ply": "7e7b5d18af92d5f4b751977d6d96f2251b896c46f1dbb37d356eed3dd0823a62",
               "config": "91ca1988b44e0b29ed9a25cd494201adc3a644a72340c09e1f1cb526a9fde685", "densify": "ssim_cs"},
    "edge": {"state": "7fea0dcaf7f017896ecaa2ee0c886a2c815ee7380405d89e48ed37bef6a64c94",
             "ply": "a74847f5cd83f9e91bfdbffaabb72e40acd1ec86a2f968654be7058b0d91e5ee",
             "config": "42953a6f03076ca9aa8f210539297393f7c019b5478fa56463f3c64ee71142f0", "densify": "edge_aware"},
}
TRAIN_FRAMES = ["camera1/frame_00036_train.png", "camera2/frame_00104_train.png"]

app = modal.App(APP_NAME)
secret = modal.Secret.from_name("slate360-twin-worker")
vol = modal.Volume.from_name("slate360-recon-experiments")


def _fetch_binary(key, want, bin_path, sha_file, build_id):
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


gpu_image = (modal.Image.from_registry(CUDA_BASE_IMAGE, add_python="3.11")
             .apt_install("libgomp1", "libgl1", "libglib2.0-0")
             .pip_install("boto3", "numpy<2", "opencv-python-headless<4.11", "scipy"))
gpu_image = gpu_image.add_local_python_source("pin", copy=True).run_function(_fetch_binary, secrets=[secret], kwargs={
    "key": BINARY_R2_KEY, "want": BINARY_SHA256, "bin_path": SPIRULA_BIN, "sha_file": SPIRULA_SHA_FILE,
    "build_id": SPIRULA_BUILD_ID})


def _s3():
    import boto3
    ep = os.environ.get("R2_ENDPOINT") or f"https://{os.environ['CLOUDFLARE_ACCOUNT_ID'].strip()}.r2.cloudflarestorage.com"
    return boto3.client("s3", endpoint_url=ep, aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"], region_name="auto"), os.environ["R2_BUCKET"]


def _sha(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for blk in iter(lambda: f.read(1 << 22), b""):
            h.update(blk)
    return h.hexdigest()


def _get_checked(s3, b, key, dest: Path, want: str):
    dest.parent.mkdir(parents=True, exist_ok=True)
    s3.download_file(b, key, str(dest))
    if _sha(dest) != want:
        raise RuntimeError(f"{key} sha mismatch")


def _dataset(s3, b, root: Path, view_names: list[str] | None, views_key: str = "refs/views.json") -> dict:
    """Diagnostic COLMAP dataset: verbatim fisheye cameras 1,2 + pinhole cameras 3 (f=640) and 4 (f=1280)."""
    views = json.loads(s3.get_object(Bucket=b, Key=f"{DIAG}/{views_key}")["Body"].read())
    man = json.loads(s3.get_object(Bucket=b, Key=f"{DS_OBJ}/dataset_manifest.json")["Body"].read())
    files = {f["path"]: f for f in man["files"]}
    sp = root / "sparse" / "0"
    sp.mkdir(parents=True)
    gsp = Path("/vol/room213/2026-09-21/spirula_bench_v1/dataset/sparse/0")
    cam_lines = [ln for ln in (gsp / "cameras.txt").read_text().splitlines() if ln and not ln.startswith("#")][:2]
    cam_lines += ["3 PINHOLE 1280 720 640.0 640.0 640.0 360.0", "4 PINHOLE 1280 720 1280.0 1280.0 640.0 360.0"]
    (sp / "cameras.txt").write_text("\n".join(cam_lines) + "\n")
    img_lines = []
    for ln in (gsp / "images.txt").read_text().splitlines():
        p = ln.split()
        if len(p) == 10 and p[9] in TRAIN_FRAMES:
            img_lines += [ln, ""]
    order = []
    for k, v in enumerate(views["views"]):
        if view_names and v["name"] not in view_names:
            continue
        name = f"diag/v{k:03d}_{v['name']}_eval.png"
        q, t = v["w2c_qvec"], v["w2c_t"]
        img_lines += [f"{1000 + k} {q[0]!r} {q[1]!r} {q[2]!r} {q[3]!r} {t[0]!r} {t[1]!r} {t[2]!r} "
                      f"{3 if v['f'] == 640 else 4} {name}", ""]
        order.append(v["name"])
        dst = root / "images" / name
        dst.parent.mkdir(parents=True, exist_ok=True)
        s3.download_file(b, f"{DIAG}/{Path(views_key).parent.as_posix()}/ref_{v['name']}.png", str(dst))
    (sp / "images.txt").write_text("\n".join(img_lines) + "\n")
    shutil.copyfile(gsp / "points3D.txt", sp / "points3D.txt")
    for fr in TRAIN_FRAMES:
        for kind in ("images", "masks"):
            f = files[f"{kind}/{fr}"]
            _get_checked(s3, b, f"{DS_OBJ}/objects/{f['sha256']}", root / kind / fr, f["sha256"])
    # eval split order = sorted name order of *_eval images (ColmapParser sorts frames by name)
    return {"evalOrder": order, "imagesTxt": (sp / "images.txt").read_text(), "camerasTxt": (sp / "cameras.txt").read_text()}


def _flags(densify: str, iters: str) -> list[str]:
    fl = [["--data-format", "colmap"], ["--image-dir", "images"], ["--mask-dir", "masks"], ["--load-masks", "1"],
          ["--eval-mode", "filename"], ["--warp-to-pinhole", "0"], ["--train-resolution-divisor", "1"],
          ["--primitive", "3dgut"], ["--cap-max", "1000000"], ["--num-iterations", iters],
          ["--use-bilateral-grid", "0"], ["--use-bilateral-grid-for-geometry", "0"], ["--use-ppisp", "0"],
          ["--load-depths", "0"], ["--load-normals", "0"], ["--normal-supervision-weight", "0"],
          ["--depth-supervision-weight", "0"], ["--steps-per-save", "5000"], ["--save-only-latest-checkpoint", "0"],
          ["--save-full-checkpoint", "1"], ["--save-eval-images", "1"], ["--disable-viewer", "1"],
          ["--keep-viewer-alive", "0"], ["--densify-loss-map-mode", densify]]
    return [x for pair in fl for x in pair]


@app.function(image=gpu_image, gpu="L40S", cpu=8.0, memory=65536, timeout=5400, max_containers=1, retries=0,
              secrets=[secret], volumes={"/vol": vol.read_only()})
def spirula_stages(models: list[str], stages: list[str], tag: str = "main", view_names: list[str] | None = None,
                   views_key: str = "refs/views.json") -> dict:
    t0 = time.time()
    s3, b = _s3()
    binsha = _sha(Path(SPIRULA_BIN))
    if binsha != BINARY_SHA256:
        raise RuntimeError("binary is not the pinned patched build")
    gpu = subprocess.check_output(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"], text=True).strip()
    work = Path("/tmp/dd")
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir()
    data = work / "dataset"
    ds = _dataset(s3, b, data, view_names, views_key)
    out = {"build": SPIRULA_BUILD_ID, "binarySha256": binsha, "gpu": gpu, "dataset": ds, "runs": {}}
    base = f"{DIAG}/spirula/{tag}"
    for m in models:
        spec = MODELS[m]
        mdir = work / m
        ck = mdir / "src" / "step-000030000.ckpt"
        ck.mkdir(parents=True)
        if m == "golden":
            for src, dst, want in ((f"{GOLD_RUN}/step-000030000.ckpt/state.tar", ck / "state.tar", spec["state"]),
                                   (f"{GOLD_RUN}/step-000030000.ckpt/splat.ply", ck / "splat.ply", spec["ply"]),
                                   (f"{GOLD_RUN}/config.json", mdir / "src" / "config.json", spec["config"])):
                shutil.copyfile(src, dst)
                if _sha(dst) != want:
                    raise RuntimeError(f"{src} sha mismatch")
        else:
            _get_checked(s3, b, f"{EDGE_FINAL}/run/step-000030000.ckpt/state.tar", ck / "state.tar", spec["state"])
            _get_checked(s3, b, f"{EDGE_FINAL}/run/step-000030000.ckpt/splat.ply", ck / "splat.ply", spec["ply"])
            _get_checked(s3, b, f"{EDGE_FINAL}/run/config.json", mdir / "src" / "config.json", spec["config"])
        for st in stages:
            name = f"{m}_{st}"
            if st == "A":
                cmd = [SPIRULA_BIN, "train", "3dgs", "--data", str(data)] + _flags(spec["densify"], "30000") + \
                      ["--output-dir-prefix", str(mdir), "--output-dir-name", name, "--resume", str(ck)]
            else:
                ply = mdir / "export.ply"
                shutil.copyfile(ck / "splat.ply", ply)
                cmd = [SPIRULA_BIN, "train", "3dgs", "--data", str(data)] + _flags(spec["densify"], "0") + \
                      ["--output-dir-prefix", str(mdir), "--output-dir-name", name, "--init-ply", str(ply)]
            log = mdir / f"{name}.log"
            t1 = time.time()
            with log.open("w") as f:
                r = subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT, cwd="/tmp", timeout=1800)
            txt = log.read_text(errors="replace")
            run = mdir / name
            rec = {"cmd": cmd, "exit": r.returncode, "wallS": round(time.time() - t1, 1),
                   "trainedStepLines": len(re.findall(r"^step\s+\d+/", txt, re.M)),
                   "resumedLine": re.findall(r"Resumed from .*", txt)[:2],
                   "adapted": "Checkpoint layout differs" in txt,
                   "seedOrPlyLines": [ln for ln in txt.splitlines() if "seed" in ln.lower() or ".ply" in ln.lower()][:8],
                   "evalWritten": (run / "metrics.json").is_file(), "logTail": txt[-3000:]}
            if run.is_dir():
                stj = run / "scene_transform.json"
                rec["sceneTransform"] = json.loads(stj.read_text()) if stj.is_file() else None
                cfgp = run / "config.json"
                rec["resolvedConfig"] = json.loads(cfgp.read_text()) if cfgp.is_file() else None
                files = sorted(run.glob("eval-*.png")) + [p for p in (run / "metrics.json",) if p.is_file()]
                up = {}
                for p in files:
                    s3.upload_file(str(p), b, f"{base}/{name}/{p.name}")
                    up[p.name] = _sha(p)
                rec["uploaded"] = up
            s3.upload_file(str(log), b, f"{base}/{name}/{log.name}")
            out["runs"][name] = rec
            s3.put_object(Bucket=b, Key=f"{base}/result_partial.json", Body=json.dumps(out, indent=1, default=str).encode())
    out["elapsedS"] = round(time.time() - t0, 1)
    s3.put_object(Bucket=b, Key=f"{base}/result.json", Body=json.dumps(out, indent=1, default=str).encode())
    return out
