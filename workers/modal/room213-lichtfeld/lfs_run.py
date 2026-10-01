"""R213-LFS-IGS-1 runner: LichtFeld Studio (pinned c72a0d85 build from the volume) on the exported A faces, headless, L40S.
Recipe = the upstream documented IGS+ benchmark config `eval/improvedGSplus_optimization_params.json` (unmodified file from the
pinned tree) + CLI: --steps-scaler, --mask-mode ignore, -r 1, --max-width 0, --headless, --export ply.
One generic function; the smoke test, load check and the single benchmark run differ only in `tag`, data subset and args.
Every run: data copied from the volume to local disk, full stdout log, nvidia-smi VRAM sampling every 5 s, wall time.
"""
import modal
from lfs_build import image as build_image, COMMIT

app = modal.App("slate360-lfs-run")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = build_image.env({"NVIDIA_DRIVER_CAPABILITIES": "all", "NVIDIA_VISIBLE_DEVICES": "all"}).add_local_python_source("lfs_build")
DATA = "/vol/room213/2026-09-29/capture/conditions/LFS_IGS1/data"
RUNS = "/vol/room213/2026-09-29/capture/conditions/LFS_IGS1/runs"
TAR = f"/vol/tools/lichtfeld/{COMMIT[:8]}/lfs.tar.zst"


def _subset(src_names: list, out: str):
    """Copy only the faces of `src_names` (fisheye names as in A) + a filtered images.bin (same camera, same points)."""
    import json, shutil, struct
    from pathlib import Path
    idx = json.load(open(f"{DATA}/face_index.json")); keep = [r for r in idx if r["src"] in set(src_names)]
    for d in ("images", "masks", "sparse/0"): Path(f"{out}/{d}").mkdir(parents=True, exist_ok=True)
    for r in keep:
        shutil.copy(f"{DATA}/images/{r['name']}", f"{out}/images/{r['name']}")
        shutil.copy(f"{DATA}/masks/{r['name'][:-4]}.png", f"{out}/masks/{r['name'][:-4]}.png")
    for f in ("cameras.bin", "points3D.bin"): shutil.copy(f"{DATA}/sparse/0/{f}", f"{out}/sparse/0/{f}")
    want = {r["image_id"] for r in keep}; src = open(f"{DATA}/sparse/0/images.bin", "rb"); n = struct.unpack("<Q", src.read(8))[0]; recs = []
    for _ in range(n):
        head = src.read(64); iid = struct.unpack("<i", head[:4])[0]; name = b""
        while (c := src.read(1)) != b"\0": name += c
        npts = src.read(8); assert struct.unpack("<Q", npts)[0] == 0
        if iid in want: recs.append(head + name + b"\0" + npts)
    with open(f"{out}/sparse/0/images.bin", "wb") as f:
        f.write(struct.pack("<Q", len(recs))); [f.write(r) for r in recs]
    return len(keep)


def _pcopy(src, dst, workers=64):
    """Parallel file copy from the volume (single-threaded copytree ran at ~4 MB/s)."""
    import os, shutil
    from concurrent.futures import ThreadPoolExecutor
    files = []
    for root, _, fs in os.walk(src):
        rel = os.path.relpath(root, src); os.makedirs(os.path.join(dst, rel), exist_ok=True)
        files += [(os.path.join(root, f), os.path.join(dst, rel, f)) for f in fs if f != "face_index.json"]
    with ThreadPoolExecutor(workers) as ex: list(ex.map(lambda p: shutil.copyfile(*p), files))


@app.function(image=image, gpu="L40S", cpu=8.0, memory=98304, timeout=12 * 3600, volumes={"/vol": vol}, retries=0)
def lfs_run_v2(tag: str, args: list, subset: list = None, json_overlay: dict = None) -> dict:
    import hashlib, json, os, shutil, subprocess, threading, time
    from pathlib import Path
    vol.reload(); out = Path(f"{RUNS}/{tag}")
    if out.exists(): raise RuntimeError(f"run {tag} exists (single run per tag)")
    out.mkdir(parents=True); t0 = time.time()
    subprocess.run(f"tar -C /root -I zstd -xf {TAR}", shell=True, check=True)
    src = "/root/LichtFeld-Studio"; exe = f"{src}/build-linux-release/LichtFeld-Studio"
    sha = hashlib.sha256(open(exe, "rb").read()).hexdigest()
    head = subprocess.run(["git", "-C", src, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    assert head == COMMIT, head
    cfg = json.load(open(f"{src}/eval/improvedGSplus_optimization_params.json"))
    if json_overlay: cfg.update(json_overlay)
    json.dump(cfg, open(out / "config.json", "w"), indent=1)
    data = "/root/data"
    if subset: n_faces = _subset(subset, data)
    else:
        _pcopy(DATA, data); n_faces = len(os.listdir(f"{data}/images"))
    t_copy = time.time() - t0
    args = list(args)
    for i, a in enumerate(args):          # RUNFILE:<tag>/<path> -> local copy of a previous run's output (resume test)
        if a.startswith("RUNFILE:"):
            rel = a[len("RUNFILE:"):]; shutil.copytree(f"{RUNS}/{rel.split('/')[0]}/out", "/root/prev", dirs_exist_ok=True)
            args[i] = "/root/prev/" + "/".join(rel.split("/")[2:])
    cmd = [exe, "-d", data, "-o", "/root/out", "--images", "images", "--config", str(out / "config.json"), "--headless",
           "--mask-mode", "ignore", "-r", "1", "--max-width", "0", "--export", "ply"] + list(args)
    vram = []; stop = threading.Event()

    def sample():
        while not stop.is_set():
            r = subprocess.run(["nvidia-smi", "--query-gpu=memory.used,utilization.gpu", "--format=csv,noheader,nounits"], capture_output=True, text=True)
            vram.append((round(time.time() - t0), r.stdout.strip())); stop.wait(5)
    th = threading.Thread(target=sample, daemon=True); th.start()
    gpu = subprocess.run(["nvidia-smi", "--query-gpu=name,driver_version,memory.total", "--format=csv,noheader"], capture_output=True, text=True).stdout.strip()
    t1 = time.time()
    with open(out / "train.log", "w") as log:
        r = subprocess.run(cmd, stdout=log, stderr=subprocess.STDOUT, timeout=12 * 3600 - 900)
    t_train = time.time() - t1; stop.set(); th.join()
    if Path("/root/out").exists():
        shutil.copytree("/root/out", out / "out", dirs_exist_ok=True)
    peak = max((int(v.split(",")[0]) for _, v in vram if v), default=None)
    res = {"tag": tag, "exit": r.returncode, "commit": head, "exe_sha256": sha, "gpu": gpu, "cmd": " ".join(cmd), "faces": n_faces,
           "copy_s": round(t_copy), "train_wall_s": round(t_train), "vram_peak_mib": peak, "vram_samples": vram[::6],
           "log_tail": open(out / "train.log", errors="replace").read()[-4000:]}
    json.dump(res, open(out / "result.json", "w"), indent=1); vol.commit()
    return res
