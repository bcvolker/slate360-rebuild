"""R213-G1 training (2026-09-28): ONE Spirula run = the golden bench command (spirula_bench.py FLAGS, room213_spirula_full)
with exactly three authorized differences: --load-normals 1, --normal-dir normals, --normal-supervision-weight 0.01.
Same unpatched golden binary (sha-checked), same image, same GPU class. No resume (the unpatched build's resume path
resamples SH); retries=0. Dataset = /vol/room213/2026-09-28/g1/dataset (golden images/masks via symlink, sparse copy,
new normals/). Writes only under /vol/room213/2026-09-28/g1/.
Usage: python -m modal run g1_train.py::check   then   python -m modal run --detach g1_train.py::launch
"""
import modal

app = modal.App("slate360-room213-g1-train")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = (modal.Image.from_registry("nvidia/cuda:12.8.1-devel-ubuntu22.04", add_python="3.11")
         .apt_install("git", "wget", "ca-certificates", "build-essential", "ninja-build", "libgomp1", "libgl1", "libglib2.0-0", "python3", "ffmpeg")
         .run_commands("pip install cmake==3.31.6")
         .pip_install("numpy<2", "opencv-python-headless<4.11", "pycolmap==4.2.0", "scipy")
         .env({"NVIDIA_DRIVER_CAPABILITIES": "compute,utility"}))
TOOLS = "/vol/tools/spirula/fd1afca1c47f89c98c8e64929f1c73b82571e5f3"
GOLDEN_BINARY_SHA256 = "24cf3ca8bcde6ce3b6491a44abe7d15fd24b329874f6fa4f8b823863854dc5a3"
BIN = "/tmp/spirula_bin/spirula"
G1 = "/vol/room213/2026-09-28/g1"
DS = f"{G1}/dataset"
GOLD_RUN = "/vol/room213/2026-09-21/spirula_bench_v1/runs/room213_spirula_full"


def golden_flags(data: str) -> list:
    # verbatim copy of spirula_bench.py FLAGS (the golden command), data path substituted
    return ["--data", data, "--data-format", "colmap", "--image-dir", "images", "--mask-dir", "masks", "--load-masks", "1",
            "--eval-mode", "filename", "--warp-to-pinhole", "0", "--train-resolution-divisor", "1", "--primitive", "3dgut",
            "--cap-max", "1000000", "--num-iterations", "30000",
            "--use-bilateral-grid", "0", "--use-bilateral-grid-for-geometry", "0", "--use-ppisp", "0",
            "--load-depths", "0", "--load-normals", "0", "--normal-supervision-weight", "0", "--depth-supervision-weight", "0",
            "--steps-per-save", "5000", "--save-only-latest-checkpoint", "0", "--save-full-checkpoint", "1",
            "--save-eval-images", "1", "--disable-viewer", "1", "--keep-viewer-alive", "0"]


def g1_flags(data: str) -> list:
    f = golden_flags(data)
    f[f.index("--load-normals") + 1] = "1"
    f[f.index("--normal-supervision-weight") + 1] = "0.01"
    return f + ["--normal-dir", "normals"]


def _bin() -> str:
    import hashlib, os, shutil
    from pathlib import Path
    if not Path(BIN).is_file():
        Path(BIN).parent.mkdir(parents=True, exist_ok=True); shutil.copy(f"{TOOLS}/spirula", BIN); os.chmod(BIN, 0o755)
    h = hashlib.sha256(open(BIN, "rb").read()).hexdigest()
    if h != GOLDEN_BINARY_SHA256:
        raise RuntimeError(f"binary sha {h} is not the golden build")
    return h


@app.function(image=image, gpu="L40S", timeout=1800, volumes={"/vol": vol})
def check() -> dict:
    """Flag existence + dataset parse (0 iterations) + resolved-config diff vs golden, without training."""
    import json, subprocess
    from pathlib import Path
    vol.reload(); sha = _bin()
    help_ = subprocess.run([BIN, "train", "--help"], capture_output=True, text=True); h = help_.stdout + help_.stderr
    flags = {f: (f in h) for f in ("--load-normals", "--normal-dir", "--normal-supervision-weight", "--load-depths")}
    cmd = [BIN, "train", "3dgs", *g1_flags(DS), "--output-dir-prefix", "/tmp/g1chk", "--output-dir-name", "chk"]
    cmd[cmd.index("--num-iterations") + 1] = "1"
    cmd[cmd.index("--save-eval-images") + 1] = "0"
    r = subprocess.run(cmd, capture_output=True, text=True, cwd="/tmp", timeout=1500)
    log = r.stdout + r.stderr
    cfg = json.load(open("/tmp/g1chk/chk/config.json")) if Path("/tmp/g1chk/chk/config.json").is_file() else {}
    gold = json.load(open(f"{GOLD_RUN}/config.json"))
    diff = {k: (gold.get(k), cfg.get(k)) for k in sorted(set(gold) | set(cfg)) if gold.get(k) != cfg.get(k)}
    return {"binary_sha": sha, "flags_in_help": flags, "exit": r.returncode, "config_diff_vs_golden": diff,
            "normal_lines": [l for l in log.splitlines() if "normal" in l.lower()][:20], "log_tail": log[-2500:]}


@app.function(image=image, gpu="L40S", cpu=16.0, memory=131072, timeout=6 * 60 * 60, volumes={"/vol": vol}, retries=0)
def train() -> dict:
    import json, subprocess, threading, time, re
    from pathlib import Path
    vol.reload(); sha = _bin()
    runs = Path(f"{G1}/runs"); runs.mkdir(parents=True, exist_ok=True); run_dir = runs / "room213_g1"
    if run_dir.exists():
        raise RuntimeError("run dir exists: G1 is a single run, refusing to overwrite or resume")
    cmd = [BIN, "train", "3dgs", *g1_flags(DS), "--output-dir-prefix", str(runs), "--output-dir-name", run_dir.name]
    gpu = subprocess.run(["nvidia-smi", "--query-gpu=name,driver_version,memory.total", "--format=csv,noheader"], capture_output=True, text=True).stdout.strip()
    meta = {"cmd": cmd, "binary_sha": sha, "gpu": gpu, "start_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    json.dump(meta, open(f"{G1}/launch_g1.json", "w"), indent=1); vol.commit()
    log_path = f"{G1}/train_g1.log"; t0 = time.time(); stop = threading.Event(); st = {"peak_vram": 0}
    prog = open(f"{G1}/progress_g1.jsonl", "a")
    proc = subprocess.Popen(cmd, stdout=open(log_path, "w"), stderr=subprocess.STDOUT, cwd="/tmp", start_new_session=True)

    def monitor():
        while not stop.wait(30):
            try:
                q = subprocess.run(["nvidia-smi", "--query-gpu=memory.used,utilization.gpu", "--format=csv,noheader,nounits"],
                                   capture_output=True, text=True, timeout=10).stdout.strip().split(",")
                st["peak_vram"] = max(st["peak_vram"], int(q[0]))
                tail = open(log_path, errors="replace").read()[-1500:]
                last = [l for l in re.split(r"[\r\n]", tail) if l.strip()][-1:] or [""]
                prog.write(json.dumps({"t": round(time.time() - t0), "vram_mib": int(q[0]), "gpu_util": int(q[1]), "last_line": last[0][-300:]}) + "\n")
                prog.flush(); vol.commit()
            except Exception as e:  # noqa: BLE001
                prog.write(json.dumps({"monitor_error": str(e)[:200]}) + "\n")
    threading.Thread(target=monitor, daemon=True).start()
    rc = proc.wait(); stop.set()
    out = {**meta, "exit_code": rc, "elapsed_s": round(time.time() - t0), "peak_vram_mib": st["peak_vram"],
           "log_tail": open(log_path, errors="replace").read()[-4000:],
           "run_dir_listing": sorted(p.name for p in run_dir.iterdir())[:40] if run_dir.is_dir() else []}
    json.dump(out, open(f"{G1}/result_g1.json", "w"), indent=1); vol.commit()
    return out


@app.function(image=image, gpu="L40S", cpu=16.0, memory=131072, timeout=3600, volumes={"/vol": vol})
def probe(iters: int = 300) -> dict:
    """Is the normal loss active? 300-iteration runs (before densification starts at 500, so splat order is stable):
    golden flags x2 (GPU non-determinism baseline) and G1 flags x1, all on the G1 dataset; compare parameters."""
    import subprocess, numpy as np
    from pathlib import Path
    vol.reload(); _bin(); res = {}
    def run(tag, fl):
        cmd = [BIN, "train", "3dgs", *fl, "--output-dir-prefix", "/tmp/pr", "--output-dir-name", tag]
        cmd[cmd.index("--num-iterations") + 1] = str(iters); cmd[cmd.index("--save-eval-images") + 1] = "0"
        cmd[cmd.index("--steps-per-save") + 1] = str(iters)
        r = subprocess.run(cmd, capture_output=True, text=True, cwd="/tmp", timeout=1500)
        ply = sorted(Path(f"/tmp/pr/{tag}").glob("step-*/splat.ply"))
        if ply:
            import shutil; Path(f"{G1}/probe").mkdir(parents=True, exist_ok=True); shutil.copyfile(ply[-1], f"{G1}/probe/{tag}_{iters}.ply"); vol.commit()
        res[tag] = {"exit": r.returncode, "ply": str(ply[-1]) if ply else None, "crash": "crash report" in (r.stdout + r.stderr),
                    "tail": (r.stdout + r.stderr)[-600:]}
    wiring = g1_flags(DS); wiring[wiring.index("--normal-supervision-weight") + 1] = "100"   # wiring check only, discarded
    run("gold_a", golden_flags(DS)); run("gold_b", golden_flags(DS)); run("g1", wiring)
    def load(p):
        with open(p, "rb") as f:
            h = b""
            while not h.endswith(b"end_header\n"): h += f.readline()
            k = len([l for l in h.splitlines() if l.startswith(b"property")])
            return np.frombuffer(f.read(), np.float32).reshape(-1, k)
    if all(res[t]["ply"] for t in res):
        A, B, C = (load(res[t]["ply"]) for t in ("gold_a", "gold_b", "g1"))
        if A.shape == B.shape == C.shape:
            res["diff"] = {"gold_a_vs_gold_b_mean_abs": float(np.abs(A - B).mean()), "gold_a_vs_g1_mean_abs": float(np.abs(A - C).mean()),
                           "gold_a_vs_gold_b_frac_changed": float((np.abs(A - B) > 1e-6).any(1).mean()),
                           "gold_a_vs_g1_frac_changed": float((np.abs(A - C) > 1e-6).any(1).mean()), "n": int(len(A))}
        else:
            res["diff"] = {"shapes": [A.shape, B.shape, C.shape]}
    return res


@app.local_entrypoint()
def launch():
    fc = train.spawn()
    print("spawned", fc.object_id)
