"""Official Spirula v2026.9.24 workflow for STILL-IMAGE conditions, mirroring the desktop app's defaults for a folder of
images under the `360-camera` dataset preset (src/app/gui/SourceList.cpp apply_capture_defaults / dataset_adapt_preset):
2:1 panoramas -> camera model `equirectangular`; perspective photos -> the app's default lens; data type `individual`;
automatic pairing; one camera per folder; SAM 3 person masking (same prompt/settings as the video conditions); training
`train 360-camera` identical to every other condition. Originals are copied unchanged into the workspace."""
import modal

from cap_official import COND_ROOT, SP, app as _unused, check_bin, image, sh  # noqa: F401

app = modal.App("slate360-room213-capture-official-images")
vol = modal.Volume.from_name("slate360-recon-experiments")
img = image.add_local_file("cap_official.py", "/root/cap_official.py").add_local_file("cap_ingest.py", "/root/cap_ingest.py")
SAM = "/vol/room213/2026-09-29/ref/models/sam3-q4_0.ggml"


@app.function(image=img, gpu="L40S", cpu=32.0, memory=131072, timeout=12 * 3600, volumes={"/vol": vol}, retries=0)
def pipeline_images(cond: str, groups: dict, camera_model: str, stages: list = ["prep", "sfm", "train"]) -> dict:
    """groups: {folder_name: [absolute source paths]}; camera_model: 'equirectangular' or '' (app default for photos)."""
    import json, shutil, glob, time, cv2, numpy as np
    from pathlib import Path
    check_bin(); vol.reload()
    R = f"{COND_ROOT}/{cond}"; WS = f"{R}/ws"; Path(WS).mkdir(parents=True, exist_ok=True); out = {}
    if "prep" in stages:
        log = f"{R}/prep.log"
        for g, files in groups.items():
            d = Path(f"{WS}/images/{g}"); d.mkdir(parents=True, exist_ok=True)
            for f in files:
                if not (d / Path(f).name).exists(): shutil.copyfile(f, d / Path(f).name)
            ai, md = f"{R}/work/ai/{g}", Path(f"{WS}/masks/{g}"); md.mkdir(parents=True, exist_ok=True)
            sh(f"{SP} sam track --model {SAM} --frames {d} --text 'person; hand; backpack; shadow of person' --max-size 1600 --dilate-ratio 0.05 --out {ai} --device 0", log)
            stems = sorted(Path(p).stem for p in glob.glob(f"{d}/*.jpg")); ais = sorted(glob.glob(f"{ai}/*.png"))
            assert len(stems) == len(ais), (g, len(stems), len(ais))
            for s_, a in zip(stems, ais):
                m = cv2.imread(a, 0); src = cv2.imread(str(d / f"{s_}.jpg"), cv2.IMREAD_REDUCED_GRAYSCALE_2)
                shp = cv2.imread(str(d / f"{s_}.jpg"), cv2.IMREAD_UNCHANGED).shape[:2]
                if m.shape != shp: m = cv2.resize(m, (shp[1], shp[0]), interpolation=cv2.INTER_NEAREST)
                cv2.imwrite(str(md / f"{s_}.png"), (m > 0).astype(np.uint8) * 255)
        out["prep"] = {g: len(v) for g, v in groups.items()}; vol.commit()
    if "sfm" in stages:
        log = f"{R}/sfm.log"; cm = f"--camera-model {camera_model} " if camera_model else ""
        t0 = time.time()
        rc, _ = sh(f"{SP} sfm auto {WS}/images -o {WS} --progress-dir {WS}/.progress --quality high --data-type individual {cm}"
                   f"--camera-mode folder --mapper flat --features sift --matcher bruteforce --masks {WS}/masks", log)
        out["sfm"] = {"exit": rc, "seconds": round(time.time() - t0), "log_tail": open(log, errors="replace").read()[-3500:]}; vol.commit()
        json.dump(out, open(f"{R}/pipeline_result.json", "w"), indent=1)
        if rc not in (0, 3, 4): return out
    if "train" in stages:
        log = f"{R}/train.log"; t0 = time.time()
        if Path(f"{WS}/outputs/ref").exists(): raise RuntimeError("single run; output exists")
        rc, _ = sh(f"{SP} train 360-camera --data {WS} --image-dir images --mask-dir masks --output-dir-prefix {WS}/outputs "
                   f"--output-dir-name ref --disable-viewer 1 --device 0", log, timeout=11 * 3600)
        out["train"] = {"exit": rc, "seconds": round(time.time() - t0), "log_tail": open(log, errors="replace").read()[-2500:]}
    json.dump(out, open(f"{R}/pipeline_result.json", "w"), indent=1); vol.commit()
    return out


@app.function(image=img, gpu="L40S", cpu=32.0, memory=131072, timeout=12 * 3600, volumes={"/vol": vol}, retries=0)
def pipeline_hybrid(cond: str, base_cond: str, stills: list, stills_model: str = "equirectangular", pairs: str = "",
                    stages: list = ["prep", "sfm"]) -> dict:
    """X4-only (or mixed) hybrid: the base condition's extracted frames + masks (linked, untouched) + a stills folder.
    SfM = the base condition's exact official flags and manifest, plus ONE camera entry declaring the stills folder's model
    (equirectangular for 2:1 panoramas, as the app does). `pairs` optionally adds the documented content-based pairing
    (`--pairs auto`) if sequential pairing cannot link stills to video frames. Nothing else changes."""
    import json, os, glob, shutil, time, cv2, numpy as np
    from pathlib import Path
    check_bin(); vol.reload()
    B_ = f"{COND_ROOT}/{base_cond}/ws"; R = f"{COND_ROOT}/{cond}"; WS = f"{R}/ws"; out = {}
    if "prep" in stages:
        for sub in ("images", "masks"):
            Path(f"{WS}/{sub}").mkdir(parents=True, exist_ok=True)
            for d in Path(f"{B_}/{sub}").iterdir():
                if not Path(f"{WS}/{sub}/{d.name}").exists(): os.symlink(str(d), f"{WS}/{sub}/{d.name}")
        d = Path(f"{WS}/images/x4stills"); d.mkdir(parents=True, exist_ok=True)
        for f in stills:
            if not (d / Path(f).name).exists(): shutil.copyfile(f, d / Path(f).name)
        ai, md = f"{R}/work/ai/x4stills", Path(f"{WS}/masks/x4stills"); md.mkdir(parents=True, exist_ok=True)
        sh(f"{SP} sam track --model {SAM} --frames {d} --text 'person; hand; backpack; shadow of person' --max-size 1600 --dilate-ratio 0.05 --out {ai} --device 0", f"{R}/prep.log")
        stems = sorted(Path(p).stem for p in glob.glob(f"{d}/*.jpg")); ais = sorted(glob.glob(f"{ai}/*.png")); assert len(stems) == len(ais)
        for s_, a in zip(stems, ais):
            m = cv2.imread(a, 0); shp = cv2.imread(str(d / f"{s_}.jpg"), cv2.IMREAD_UNCHANGED).shape[:2]
            if m.shape != shp: m = cv2.resize(m, (shp[1], shp[0]), interpolation=cv2.INTER_NEAREST)
            cv2.imwrite(str(md / f"{s_}.png"), (m > 0).astype(np.uint8) * 255)
        man = open(f"{B_}/.spirula_manifest.yaml").read().replace(B_, WS)
        man = man.replace("cameras:\n", f"cameras:\n  - prefix: x4stills\n    model: {stills_model}\n", 1)
        Path(f"{WS}/.spirula_manifest.yaml").write_text(man); out["prep"] = {"stills": len(stems)}; vol.commit()
    if "sfm" in stages:
        log = f"{R}/sfm.log"; t0 = time.time(); pz = f"--pairs {pairs} " if pairs else ""
        rc, _ = sh(f"{SP} sfm auto {WS}/images -o {WS} --progress-dir {WS}/.progress --quality high --data-type video "
                   f"--camera-model thin-prism-fisheye --camera-mode folder --mapper flat --features sift --matcher bruteforce "
                   f"--no-prefilter-sequential {pz}--manifest {WS}/.spirula_manifest.yaml --metric-gps horizontal --masks {WS}/masks", log)
        out["sfm"] = {"exit": rc, "seconds": round(time.time() - t0), "log_tail": open(log, errors="replace").read()[-6000:]}; vol.commit()
    if "train" in stages:
        log = f"{R}/train.log"; t0 = time.time()
        if Path(f"{WS}/outputs/ref").exists(): raise RuntimeError("single run; output exists")
        rc, _ = sh(f"{SP} train 360-camera --data {WS} --image-dir images --mask-dir masks --output-dir-prefix {WS}/outputs "
                   f"--output-dir-name ref --disable-viewer 1 --device 0", log, timeout=11 * 3600)
        out["train"] = {"exit": rc, "seconds": round(time.time() - t0), "log_tail": open(log, errors="replace").read()[-2500:]}
    json.dump(out, open(f"{R}/pipeline_result.json", "w"), indent=1); vol.commit()
    return out
