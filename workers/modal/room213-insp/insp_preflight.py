"""R213-INSP Phase 0 preflight (2026-09-30). NO TRAINING.
Question: does UNSTITCHED X4 72MP photo data register to the video at <=0.5 px where the in-camera-stitched panoramas
were ~5 px off? No .insp exists yet, but the 9/29 .dng files are the camera's UNSTITCHED dual-fisheye raw frames
(verified by decoding: two 5952x5952 lens circles side by side), shot at the SAME positions/instants as the stitched
.jpg panoramas used in AX6c. So this is a stitched-vs-unstitched A/B on identical exposures.
  develop:  rawpy (camera WB, sRGB, 8-bit) -> packed 11904x5952 image == what an .insp carries (camera ISP differs: this
            is a GEOMETRY proxy, never used for a quality claim)
  split:    Spirula's official .insp handling replicated verbatim (gui/DatasetPrep.cpp split_packed_image +
            Pano360.cpp packed_lens_crop): left half -> cam0, right half -> cam1, exact crop (no resampling), JPEG q95
            (kPhotoJpegQuality); lens pair declared rig kind `dual-fisheye` (SfmRunner.cpp apply_known_lenses)
  masks:    official `sam mask` border + `sam track` person mask (same prompt as every condition)
  sfm:      A's frames+masks (byte copies) + the 6 lens pairs, AX6c's exact official flags, stills folder declared
            thin-prism-fisheye with its OWN intrinsics per lens (camera-mode folder: photo calibration is NOT assumed
            equal to video calibration). Output only under conditions/AXd/."""
import modal

from cap_official import COND_ROOT, SP, check_bin, image as rel_image, sh

app = modal.App("slate360-room213-insp-preflight")
vol = modal.Volume.from_name("slate360-recon-experiments")
img = (rel_image.pip_install("rawpy", "pillow").add_local_file("cap_official.py", "/root/cap_official.py")
       .add_local_file("cap_ingest.py", "/root/cap_ingest.py"))
RAW = "/vol/room213/2026-09-29/capture/raw"
SAM = "/vol/room213/2026-09-29/ref/models/sam3-q4_0.ggml"
STATIONS = ["083", "084", "086", "088", "089", "091"]
ALL_STILLS = ["081", "082", "083", "084", "085", "086", "087", "088", "089", "090", "091"]


@app.function(image=img, gpu="L40S", cpu=32.0, memory=131072, timeout=4 * 3600, volumes={"/vol": vol}, retries=0)
def preflight_v3(cond: str = "AXd", base_cond: str = "A", stages: list = ["prep", "sfm"], still_focal: float = 0.0,
                 stations: list = STATIONS, exp_shift: float = 1.0) -> dict:
    import glob, json, shutil, time
    from pathlib import Path
    import cv2, numpy as np, rawpy
    from PIL import Image
    check_bin(); vol.reload()
    B_ = f"{COND_ROOT}/{base_cond}/ws"; R = f"{COND_ROOT}/{cond}"; WS = f"{R}/ws"; out = {}
    if "prep" in stages:
        for sub in ("images", "masks"):
            Path(f"{WS}/{sub}").mkdir(parents=True, exist_ok=True)
            for d in Path(f"{B_}/{sub}").iterdir():
                if not Path(f"{WS}/{sub}/{d.name}").exists(): shutil.copytree(str(d), f"{WS}/{sub}/{d.name}")
        info = {}
        for st in stations:
            dng = glob.glob(f"{RAW}/IMG_*_{st}.dng")[0]; stem = Path(dng).stem
            with rawpy.imread(dng) as r:
                rgb = r.postprocess(use_camera_wb=True, output_bps=8, no_auto_bright=exp_shift != 1.0, bright=1.0,
                                    exp_shift=exp_shift, exp_preserve_highlights=0.8)
            H, W = rgb.shape[:2]; lw = W // 2                                      # packed_lens_count: 2 lenses, exact
            info[stem] = {"developed_wh": [W, H], "lens_wh": [lw, H]}
            for k in range(2):
                d = Path(f"{WS}/images/x4dng/cam{k}"); d.mkdir(parents=True, exist_ok=True)
                Image.fromarray(np.ascontiguousarray(rgb[:, k * lw:(k + 1) * lw])).save(d / f"{stem}.jpg", quality=95)
        for k in range(2):
            idir, bdir, adir, mdir = f"{WS}/images/x4dng/cam{k}", f"{R}/work/border/cam{k}", f"{R}/work/ai/cam{k}", Path(f"{WS}/masks/x4dng/cam{k}")
            sh(f"{SP} sam mask {idir} --out {bdir} --device 0", f"{R}/prep.log")
            sh(f"{SP} sam track --model {SAM} --frames {idir} --text 'person; hand; backpack; shadow of person' --max-size 1600 "
               f"--dilate-ratio 0.05 --out {adir} --device 0", f"{R}/prep.log")
            stems = sorted(Path(p).stem for p in glob.glob(f"{idir}/*.jpg")); ais = sorted(glob.glob(f"{adir}/*.png")); mdir.mkdir(parents=True, exist_ok=True)
            assert len(ais) == len(stems), (k, len(ais), len(stems))
            for s_, a in zip(stems, ais):
                b = cv2.imread(f"{bdir}/{s_}.png", 0); m = cv2.imread(a, 0)
                if m.shape != b.shape: m = cv2.resize(m, (b.shape[1], b.shape[0]), interpolation=cv2.INTER_NEAREST)
                cv2.imwrite(str(mdir / f"{s_}.png"), ((b > 0) & (m > 0)).astype(np.uint8) * 255)
        man = open(f"{B_}/.spirula_manifest.yaml").read().replace(B_, WS)
        man = man.replace("cameras:\n", "cameras:\n  - prefix: x4dng\n    model: thin-prism-fisheye\n", 1)
        man = man.replace("rigs:\n", "rigs:\n  - name: x4dng\n    kind: dual-fisheye\n    members:\n      - x4dng/cam0\n      - x4dng/cam1\n", 1)
        Path(f"{WS}/.spirula_manifest.yaml").write_text(man)
        out["prep"] = info; vol.commit()
    if "sfm" in stages:
        if still_focal > 0:        # the GUI's official per-input "focal x width" prior (SfmRunner.cpp build_manifest -> focal:)
            man = open(f"{WS}/.spirula_manifest.yaml").read()
            if "    focal:" not in man:
                old = "  - prefix: x4dng\n    model: thin-prism-fisheye\n"
                man = man.replace(old, old + f"    focal: {still_focal:.1f}\n", 1)
                Path(f"{WS}/.spirula_manifest.yaml").write_text(man)
            import shutil as _sh
            for d in ("sparse", ".progress", "features", "matches.bin", ".resume"):
                q = Path(f"{WS}/{d}"); _sh.rmtree(q, ignore_errors=True) if q.is_dir() else q.unlink(missing_ok=True)
        log = f"{R}/sfm.log"; t0 = time.time()
        rc, _ = sh(f"{SP} sfm auto {WS}/images -o {WS} --progress-dir {WS}/.progress --quality high --data-type video "
                   f"--camera-model thin-prism-fisheye --camera-mode folder --mapper flat --features sift --matcher bruteforce "
                   f"--no-prefilter-sequential --manifest {WS}/.spirula_manifest.yaml --metric-gps horizontal --masks {WS}/masks", log)
        out["sfm"] = {"exit": rc, "seconds": round(time.time() - t0), "log_tail": open(log, errors="replace").read()[-5000:]}
    json.dump(out, open(f"{R}/preflight_result.json", "w"), indent=1, default=str); vol.commit()
    return out
