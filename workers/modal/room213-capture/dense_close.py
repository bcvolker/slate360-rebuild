"""R213-DENSE-CLOSE-1 data preparation (approved 2026-09-30). Official Spirula v2026.9.24 throughout.
  1. official `sam extract -s 8 -k 3 --sync -q 95` of 079 into a scratch folder (A's own extraction is untouched)
  2. keep ONLY candidates inside E0 [12,27] s, E1 [36.5,50.5] s, E9 [204,218] s that are >= 4 source frames from EVERY
     original A frame (so no near-duplicates, and none of the reserved +-1/+-2 holdout frames can enter training)
  3. new condition `Adense` = byte copies of A's images + masks, plus the selected frames (both lenses, same stems)
  4. masks for the new frames: official `sam mask` (border) AND `sam track` (same prompt/settings as every condition)
SfM/training then run through the SAME deployed official stage functions that built A (cap_official.stage_sfm /
stage_train, identical flags, 30k steps, 1M cap)."""
import modal

from cap_official import COND_ROOT, SP, check_bin, image, sh

app = modal.App("slate360-room213-dense-close")
vol = modal.Volume.from_name("slate360-recon-experiments")
img = image.add_local_file("cap_official.py", "/root/cap_official.py").add_local_file("cap_ingest.py", "/root/cap_ingest.py")
RAW = "/vol/room213/2026-09-29/capture/raw"; CLIP = "VID_20260929_152303_00_079"; FPS = 29.97
WINDOWS = {"E0": (12.0, 27.0), "E1": (36.5, 50.5), "E9": (204.0, 218.0)}
SAM = "/vol/room213/2026-09-29/ref/models/sam3-q4_0.ggml"


@app.function(image=img, gpu="L40S", cpu=16.0, memory=65536, timeout=3 * 3600, volumes={"/vol": vol}, retries=0)
def prepare_v1(cond: str = "Adense", min_gap: int = 4) -> dict:
    import glob, json, shutil
    from pathlib import Path
    import cv2, numpy as np
    check_bin(); vol.reload()
    A = f"{COND_ROOT}/A/ws"; R = f"{COND_ROOT}/{cond}"; WS = f"{R}/ws"; S8 = f"{R}/work/s8"
    if Path(WS).exists(): raise RuntimeError("condition exists; single preparation")
    log = f"{R}/prep.log"; Path(R).mkdir(parents=True, exist_ok=True)
    sh(f"{SP} sam extract {RAW}/{CLIP}.insv -o {S8} -s 8 -k 3 --sync -q 95 --device 0", log)
    orig = sorted(int(Path(p).stem) for p in glob.glob(f"{A}/images/{CLIP}/cam0/*.jpg"))
    cand = sorted(int(Path(p).stem) for p in glob.glob(f"{S8}/cam0/*.jpg"))
    O = np.array(orig); sel = {}
    for c in cand:
        t = c / FPS; w = next((k for k, (a, b) in WINDOWS.items() if a <= t <= b), None)
        if w is None: continue
        if np.abs(O - c).min() < min_gap: continue
        if not all(Path(f"{S8}/cam{k}/{c:05d}.jpg").exists() for k in (0, 1)): continue
        sel.setdefault(w, []).append(c)
    holdouts = sorted({o + d for o in orig for d in (-2, -1, 1, 2)})
    added = sorted(i for v in sel.values() for i in v); assert not set(added) & set(holdouts) and not set(added) & set(orig)
    for sub in ("images", "masks"):                           # A's data, byte for byte
        shutil.copytree(f"{A}/{sub}", f"{WS}/{sub}")
    tmp = f"{R}/work/new"
    for k in (0, 1):
        d = Path(f"{tmp}/cam{k}"); d.mkdir(parents=True, exist_ok=True)
        for i in added: shutil.copyfile(f"{S8}/cam{k}/{i:05d}.jpg", d / f"{i:05d}.jpg")
        bdir, adir = f"{R}/work/border/cam{k}", f"{R}/work/ai/cam{k}"
        sh(f"{SP} sam mask {d} --out {bdir} --device 0", log)
        sh(f"{SP} sam track --model {SAM} --frames {d} --text 'person; hand; backpack; shadow of person' --max-size 1600 "
           f"--dilate-ratio 0.05 --out {adir} --device 0", log)
        ai = sorted(glob.glob(f"{adir}/*.png")); assert len(ai) == len(added)
        for i, a in zip(added, ai):                              # sam track numbers frames in sorted read order
            b = cv2.imread(f"{bdir}/{i:05d}.png", 0); m = cv2.imread(a, 0)
            if m.shape != b.shape: m = cv2.resize(m, (b.shape[1], b.shape[0]), interpolation=cv2.INTER_NEAREST)
            cv2.imwrite(f"{WS}/masks/{CLIP}/cam{k}/{i:05d}.png", ((b > 0) & (m > 0)).astype(np.uint8) * 255)
            shutil.copyfile(d / f"{i:05d}.jpg", f"{WS}/images/{CLIP}/cam{k}/{i:05d}.jpg")
    n_orig = len(orig); n_new = len(added)
    rep = {"original_pairs": n_orig, "s8_candidates": len(cand), "added_pairs_by_window": {k: len(v) for k, v in sel.items()}, "added_pairs": n_new,
           "added_idx": {k: v for k, v in sel.items()}, "min_gap_frames": min_gap, "holdouts_reserved": len(holdouts), "holdout_overlap": 0,
           "total_input_images": 2 * (n_orig + n_new)}
    json.dump(rep, open(f"{R}/prepare_result.json", "w"), indent=1); vol.commit()
    return rep
