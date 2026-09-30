"""Room 213 REFERENCE Spirula Studio workflow (2026-09-29). Official release v2026.9.24 (183b2c6), Ubuntu Vulkan build,
driven through its CLI to replicate the desktop app's dataset-creation defaults with the documented 360 path selected:
  frames  `sam extract -s 15 -k 3 --sync -q 95` per .insv (2 fps, sharpest-of-3, lens tracks in lockstep = rig stems)
  masks   `sam mask` fisheye border (auto for fisheye) AND 360-camera dataset preset AI masking
          (SAM 3 sam3-q4_0.ggml, "person; hand; backpack; shadow of person", max-size 1600, dilate 0.05) - CLI approximation:
          `sam track` (tracked, not per-frame independent; the GUI-only per-frame mode has no CLI)
  sfm     `sfm auto` with the GUI's flags + .spirula_manifest.yaml (thin-prism-fisheye per clip/lens folder, dual-fisheye rig
          per clip, sequences, .insv telemetry)
  train   `train 360-camera` (the preset the release recommends for wide fisheye with a visible circle)
Golden inputs (camera solution, sparse model, selected images, init, manifest) are NOT used. Outputs only under
/vol/room213/2026-09-29/ref/. Deploy + spawn (never an ephemeral run for long stages).
"""
import modal

app = modal.App("slate360-room213-capture-official")
vol = modal.Volume.from_name("slate360-recon-experiments")
REL = "https://github.com/harry7557558/spirula-studio/releases/download/v2026.9.24/spirula-2026.9.24-ubuntu-vulkan-x86_64.zip"
REL_SHA = "7e584142e7a9dd6cd8fb3e494a7b0085a26689907885ad57229cb8f4ec81cf97"
SAM = "https://huggingface.co/PABannier/sam3.cpp/resolve/main/sam3-q4_0.ggml"
image = (modal.Image.from_registry("ubuntu:24.04", add_python="3.11")
         .apt_install("libvulkan1", "vulkan-tools", "unzip", "wget", "ffmpeg", "libgomp1", "libgl1", "libglib2.0-0t64", "libegl1", "libx11-6",
                      "libxext6", "libopengl0", "libglx0", "libxrandr2", "libxinerama1", "libxcursor1", "libxi6", "libwayland-client0",
                      "libxkbcommon0", "libdbus-1-3", "libgtk-3-0t64")
         .run_commands(f"wget -q -O /tmp/sp.zip {REL} && mkdir -p /opt/spirula && cd /opt/spirula && unzip -q /tmp/sp.zip")
         .pip_install("numpy", "opencv-python-headless", "pillow")
         .env({"NVIDIA_DRIVER_CAPABILITIES": "all", "NVIDIA_VISIBLE_DEVICES": "all"}))
SP = "/opt/spirula/spirula"
RAW = "/vol/room213/2026-09-29/capture/raw"
COND_ROOT = "/vol/room213/2026-09-29/capture/conditions"


def sh(cmd, log, timeout=6 * 3600):
    import subprocess, time
    t = time.time()
    with open(log, "a") as f:
        f.write(f"\n$ {cmd}\n"); f.flush()
        r = subprocess.run(["bash", "-c", cmd], stdout=f, stderr=subprocess.STDOUT, timeout=timeout)
    return r.returncode, round(time.time() - t)


def check_bin():
    import hashlib
    h = hashlib.sha256(open(SP, "rb").read()).hexdigest()
    assert h == REL_SHA, h
    return h


@app.function(image=image, gpu="L40S", cpu=16.0, memory=65536, timeout=8 * 3600, volumes={"/vol": vol})
def stage_frames(cond: str, clips: list) -> dict:
    R, WS, CLIPS = f"{COND_ROOT}/{cond}", f"{COND_ROOT}/{cond}/ws", clips
    import json, os, glob, shutil, cv2, numpy as np
    from pathlib import Path
    check_bin(); Path(WS).mkdir(parents=True, exist_ok=True); log = f"{R}/frames.log"; out = {}
    model = "/vol/room213/2026-09-29/ref/models/sam3-q4_0.ggml"
    if not Path(model).is_file():
        Path(model).parent.mkdir(parents=True, exist_ok=True); sh(f"wget -q -O {model} {SAM}", log)
    for c in CLIPS:
        img = f"{WS}/images/{c}"
        if not glob.glob(f"{img}/cam1/*.jpg"):
            out[c] = {"extract": sh(f"{SP} sam extract {RAW}/{c}.insv -o {img} -s 15 -k 3 --sync -q 95 --device 0", log)}
        for cam in ("cam0", "cam1"):
            idir, bdir, adir, mdir = f"{img}/{cam}", f"{R}/work/border/{c}/{cam}", f"{R}/work/ai/{c}/{cam}", f"{WS}/masks/{c}/{cam}"
            if glob.glob(f"{mdir}/*.png") and len(glob.glob(f"{mdir}/*.png")) == len(glob.glob(f"{idir}/*.jpg")): continue
            sh(f"{SP} sam mask {idir} --out {bdir} --device 0", log)
            sh(f"{SP} sam track --model {model} --frames {idir} --text 'person; hand; backpack; shadow of person' "
               f"--max-size 1600 --dilate-ratio 0.05 --out {adir} --device 0", log)
            stems = sorted(Path(p).stem for p in glob.glob(f"{idir}/*.jpg")); ai = sorted(glob.glob(f"{adir}/*.png"))
            Path(mdir).mkdir(parents=True, exist_ok=True)
            assert len(ai) == len(stems), (c, cam, len(ai), len(stems))
            for s, a in zip(stems, ai):            # sam track numbers frames in read (sorted) order -> rename to stems, AND border
                b = cv2.imread(f"{bdir}/{s}.png", 0); m = cv2.imread(a, 0)
                if m.shape != b.shape: m = cv2.resize(m, (b.shape[1], b.shape[0]), interpolation=cv2.INTER_NEAREST)
                cv2.imwrite(f"{mdir}/{s}.png", ((b > 0) & (m > 0)).astype(np.uint8) * 255)
            out[f"{c}/{cam}"] = {"frames": len(stems)}
    vol.commit()
    n = {c: {cam: len(glob.glob(f"{WS}/images/{c}/{cam}/*.jpg")) for cam in ("cam0", "cam1")} for c in CLIPS}
    out["counts"] = n; json.dump(out, open(f"{R}/frames_result.json", "w"), indent=1); vol.commit()
    return out


MANIFEST = """image_dir: {ws}/images
mask_dir: {ws}/masks
mask_flipped: false
cameras:
{cams}rigs:
{rigs}sequences:
{seqs}captures:
{caps}"""


@app.function(image=image, gpu="L40S", cpu=32.0, memory=131072, timeout=10 * 3600, volumes={"/vol": vol})
def stage_sfm(cond: str, clips: list) -> dict:
    R, WS, CLIPS = f"{COND_ROOT}/{cond}", f"{COND_ROOT}/{cond}/ws", clips
    import json
    from pathlib import Path
    check_bin(); vol.reload(); log = f"{R}/sfm.log"
    cams = "".join(f"  - prefix: {c}\n    model: thin-prism-fisheye\n" for c in CLIPS)
    rigs = "".join(f"  - name: {c}\n    kind: dual-fisheye\n    members:\n      - {c}/cam0\n      - {c}/cam1\n" for c in CLIPS)
    seqs = "".join(f"  - members:\n      - {c}/cam0\n      - {c}/cam1\n" for c in CLIPS)
    caps = "".join(f"  - prefix: {c}\n    telemetry: {RAW}/{c}.insv\n" for c in CLIPS)
    Path(f"{WS}/.spirula_manifest.yaml").write_text(MANIFEST.format(ws=WS, cams=cams, rigs=rigs, seqs=seqs, caps=caps))
    rc, t = sh(f"{SP} sfm auto {WS}/images -o {WS} --progress-dir {WS}/.progress --quality high --data-type video "
               f"--camera-model thin-prism-fisheye --camera-mode folder --mapper flat --features sift --matcher bruteforce "
               f"--no-prefilter-sequential --manifest {WS}/.spirula_manifest.yaml --metric-gps horizontal --masks {WS}/masks", log)
    res = {"exit": rc, "seconds": t, "log_tail": open(log, errors="replace").read()[-4000:],
           "sparse": sorted(str(p) for p in Path(WS).glob("sparse/*/*"))}
    json.dump(res, open(f"{R}/sfm_result.json", "w"), indent=1); vol.commit()
    return res


@app.function(image=image, gpu="L40S", cpu=16.0, memory=131072, timeout=12 * 3600, volumes={"/vol": vol}, retries=0)
def stage_train(cond: str, clips: list) -> dict:
    R, WS, CLIPS = f"{COND_ROOT}/{cond}", f"{COND_ROOT}/{cond}/ws", clips
    import json, subprocess, time
    from pathlib import Path
    check_bin(); vol.reload(); log = f"{R}/train.log"
    if Path(f"{WS}/outputs/ref").exists(): raise RuntimeError("single run; output exists")
    gpu = subprocess.run(["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"], capture_output=True, text=True).stdout.strip()
    rc, t = sh(f"{SP} train 360-camera --data {WS} --image-dir images --mask-dir masks --output-dir-prefix {WS}/outputs "
               f"--output-dir-name ref --disable-viewer 1 --device 0", log, timeout=11 * 3600)
    txt = open(log, errors="replace").read()
    res = {"exit": rc, "seconds": t, "gpu": gpu, "log_tail": txt[-5000:],
           "run": sorted(p.name for p in Path(f"{WS}/outputs/ref").iterdir())[:40] if Path(f"{WS}/outputs/ref").is_dir() else []}
    json.dump(res, open(f"{R}/train_result.json", "w"), indent=1); vol.commit()
    return res


@app.function(image=image, timeout=24 * 3600, volumes={"/vol": vol})
def pipeline(cond: str, clips: list, stages: list = ["frames", "sfm", "train"]) -> dict:
    R = f"{COND_ROOT}/{cond}"
    import json, time
    out = {}
    for s in stages:
        t = time.time(); out[s] = {"frames": stage_frames, "sfm": stage_sfm, "train": stage_train}[s].remote(cond, clips); out[s]["wall_s"] = round(time.time() - t)
        vol.reload(); json.dump(out, open(f"{R}/pipeline_result.json", "w"), indent=1, default=str); vol.commit()
        if s == "sfm" and out[s].get("exit") not in (0, 3, 4): break
    return out
