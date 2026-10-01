"""R213 CONTROL vs TABLE-ROI discriminator (approved 2026-09-30). Spirula release v2026.9.30 (tag commit 1943edaf),
Ubuntu Vulkan build, ONE image => identical binary for both runs (sha recorded and asserted equal).
Both runs: A's frozen workspace (images, masks, sparse/0 poses+intrinsics) and `train 360-camera` defaults (30k steps,
1M cap). The ONLY difference: ROI adds `--roi-region <table box json>` (defaults roi_outside_weight 1e-4,
roi_mask_pixels on). Outputs under conditions/ROI930/<control|roi>/."""
import modal

app = modal.App("slate360-room213-roi930")
vol = modal.Volume.from_name("slate360-recon-experiments")
REL = "https://github.com/harry7557558/spirula-studio/releases/download/v2026.9.30/spirula-2026.9.30-ubuntu-vulkan-x86_64.zip"
image = (modal.Image.from_registry("ubuntu:24.04", add_python="3.11")
         .apt_install("libvulkan1", "vulkan-tools", "unzip", "wget", "ffmpeg", "libgomp1", "libgl1", "libglib2.0-0t64", "libegl1", "libx11-6",
                      "libxext6", "libopengl0", "libglx0", "libxrandr2", "libxinerama1", "libxcursor1", "libxi6", "libwayland-client0",
                      "libxkbcommon0", "libdbus-1-3", "libgtk-3-0t64")
         .run_commands(f"wget -q -O /tmp/sp.zip {REL} && sha256sum /tmp/sp.zip > /opt/zip.sha256 && mkdir -p /opt/spirula && cd /opt/spirula && unzip -q /tmp/sp.zip")
         .env({"NVIDIA_DRIVER_CAPABILITIES": "all", "NVIDIA_VISIBLE_DEVICES": "all"}))
SP = "/opt/spirula/spirula"; A_WS = "/vol/room213/2026-09-29/capture/conditions/A/ws"; ROOT = "/vol/room213/2026-09-29/capture/conditions/ROI930"


@app.function(image=image, gpu="L40S", cpu=16.0, memory=131072, timeout=3 * 3600, volumes={"/vol": vol}, retries=0)
def train_v1(which: str, roi_json: str = "") -> dict:
    import hashlib, json, shutil, subprocess, time
    from pathlib import Path
    vol.reload(); out = Path(f"{ROOT}/{which}"); out.mkdir(parents=True, exist_ok=True)
    if Path(f"{out}/run").exists(): raise RuntimeError("single run; output exists")
    bsha = hashlib.sha256(open(SP, "rb").read()).hexdigest(); zsha = open("/opt/zip.sha256").read().split()[0]
    ver = subprocess.run([SP, "--version"], capture_output=True, text=True); vtxt = (ver.stdout + ver.stderr).strip()[:300]
    cmd = [SP, "train", "360-camera", "--data", A_WS, "--image-dir", "images", "--mask-dir", "masks", "--output-dir-prefix", str(out),
           "--output-dir-name", "run", "--disable-viewer", "1", "--device", "0"]
    if roi_json:
        Path(f"{out}/roi.json").write_text(roi_json); cmd += ["--roi-region", f"{out}/roi.json"]
    t0 = time.time()
    with open(f"{out}/train.log", "w") as log:
        r = subprocess.run(cmd, stdout=log, stderr=subprocess.STDOUT, timeout=3 * 3600 - 300)
    res = {"which": which, "exit": r.returncode, "seconds": round(time.time() - t0), "binary_sha256": bsha, "zip_sha256": zsha, "version": vtxt,
           "cmd": " ".join(cmd), "log_tail": open(f"{out}/train.log", errors="replace").read()[-3000:]}
    json.dump(res, open(f"{out}/result.json", "w"), indent=1); vol.commit()
    return res
