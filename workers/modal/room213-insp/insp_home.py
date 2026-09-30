"""Home .insp preflight (R213-INSP Phase 0b). NO TRAINING. Scope, as approved: file format, lens extraction, dimensions,
camera/rig handling, basic registration. Four images do NOT validate photo calibration.
Usage (local):  python insp_home.py <run> <file1.insp> [<file2.insp> ...]
  1. uploads the .insp files byte-for-byte to /vol/insp_home/<run>/raw (sha256 recorded)
  2. container facts: JPEG dims, EXIF (make/model/exposure/ISO/focal/orientation), APP-segment inventory
  3. official split replicated verbatim (gui/DatasetPrep.cpp split_packed_image): packed_lens_count by aspect
     (2 if w/h >= sqrt 2, exact if within 1%), left half -> cam0, right half -> cam1, exact crop, EXIF turn after the
     cut, JPEG q95 (kPhotoJpegQuality)
  4. per lens: dims, fisheye circle radius/centre (measured), mean level
  5. official `sam mask` border masks; stills-only `sfm auto --data-type individual` with the dual-fisheye rig and the
     official focal prior (focal x width, as the GUI writes it) -> registered lenses, reprojection, solved intrinsics,
     rig rotation/baseline vs the video rig (179.85 deg, 2.85 cm)
  6. training-face plan from the code (CameraMath.cpp:400-404)"""
import modal

from cap_official import SP, check_bin, image as rel_image, sh

app = modal.App("slate360-insp-home-preflight")
vol = modal.Volume.from_name("slate360-recon-experiments")
img = rel_image.pip_install("pillow", "pycolmap==4.2.0", "scipy").add_local_file("cap_official.py", "/root/cap_official.py").add_local_file(
    "cap_ingest.py", "/root/cap_ingest.py")
ROOT = "/vol/insp_home"


def exif_facts(path):
    from PIL import Image, ExifTags
    im = Image.open(path); ex = im.getexif(); sub = ex.get_ifd(0x8769)
    tag = {**{ExifTags.TAGS.get(k, k): v for k, v in ex.items()}, **{ExifTags.TAGS.get(k, k): v for k, v in sub.items()}}
    keep = ("Make", "Model", "Software", "DateTimeOriginal", "ExposureTime", "ISOSpeedRatings", "FNumber", "FocalLength",
            "FocalLengthIn35mmFilm", "Orientation", "WhiteBalance", "ExposureProgram")
    segs, data, i = [], open(path, "rb").read(), 2
    while i < len(data) - 4 and data[i] == 0xFF and data[i + 1] not in (0xDA, 0xD9):
        n = int.from_bytes(data[i + 2:i + 4], "big"); segs.append((hex(data[i + 1]), n, data[i + 4:i + 14].split(b"\0")[0][:10].decode("latin1"))); i += 2 + n
    return {"format": im.format, "size": im.size, "mode": im.mode, "exif": {k: str(tag[k]) for k in keep if k in tag},
            "app_segments": segs[:20], "bytes_total": len(data), "bytes_after_eoi": len(data) - (data.rfind(b"\xff\xd9") + 2)}


def circle(gray):
    import numpy as np
    h, w = gray.shape; cy, cx = h // 2, w // 2; m = gray > max(8, 0.1 * np.percentile(gray, 99))
    row, col = np.where(m[cy])[0], np.where(m[:, cx])[0]
    return {"x_extent": [int(row.min()), int(row.max())] if len(row) else None, "y_extent": [int(col.min()), int(col.max())] if len(col) else None,
            "radius_px": float((row.max() - row.min() + col.max() - col.min()) / 4) if len(row) and len(col) else None}


@app.function(image=img, gpu="L40S", cpu=16.0, memory=65536, timeout=2 * 3600, volumes={"/vol": vol}, retries=0)
def home_preflight_v1(run: str, focal_factor: float = 0.264) -> dict:
    import glob, json, math, time
    from pathlib import Path
    import numpy as np, pycolmap
    from PIL import Image
    from scipy.spatial.transform import Rotation as Rot
    check_bin(); vol.reload(); R = Path(f"{ROOT}/{run}"); WS = R / "ws"; out = {"files": {}}
    for f in sorted(glob.glob(f"{R}/raw/*")):
        fa = exif_facts(f); w, h = fa["size"]; r = w / h; lenses = 2 if r >= math.sqrt(2) else 1; exact = abs(r / lenses - 1) <= 0.01
        pix = Image.open(f).convert("RGB"); orient = int(fa["exif"].get("Orientation", "1") or 1); stem = Path(f).stem; lw = w // lenses
        lens = {}
        for k in range(lenses):
            half = pix.crop((k * lw, 0, (k + 1) * lw, h))
            turn = {2: Image.FLIP_LEFT_RIGHT, 3: Image.ROTATE_180, 4: Image.FLIP_TOP_BOTTOM, 6: Image.ROTATE_270, 8: Image.ROTATE_90}
            if orient in turn: half = half.transpose(turn[orient])        # EXIF turn AFTER the cut, as the GUI does
            d = WS / "images" / "insp" / f"cam{k}"; d.mkdir(parents=True, exist_ok=True); half.save(d / f"{stem}.jpg", quality=95)
            g = np.asarray(half.convert("L")); lens[f"cam{k}"] = {"size": list(half.size), "mean_level": float(g.mean()), "circle": circle(g)}
        out["files"][Path(f).name] = {**fa, "packed_lenses": lenses, "packed_exact": exact, "lenses": lens}
    for k in range(2):
        sh(f"{SP} sam mask {WS}/images/insp/cam{k} --out {WS}/masks/insp/cam{k} --device 0", f"{R}/prep.log")
    lw = next(iter(out["files"].values()))["lenses"]["cam0"]["size"][0]; focal = focal_factor * lw
    (WS / ".spirula_manifest.yaml").write_text(
        f"image_dir: {WS}/images\nmask_dir: {WS}/masks\nmask_flipped: false\ncameras:\n  - prefix: insp\n    model: thin-prism-fisheye\n"
        f"    focal: {focal:.1f}\nrigs:\n  - name: insp\n    kind: dual-fisheye\n    members:\n      - insp/cam0\n      - insp/cam1\n")
    t0 = time.time()
    rc, _ = sh(f"{SP} sfm auto {WS}/images -o {WS} --progress-dir {WS}/.progress --quality high --data-type individual "
               f"--camera-model thin-prism-fisheye --camera-mode folder --mapper flat --features sift --matcher bruteforce "
               f"--manifest {WS}/.spirula_manifest.yaml --masks {WS}/masks", f"{R}/sfm.log")
    log = open(f"{R}/sfm.log", errors="replace").read()
    out["sfm"] = {"exit": rc, "seconds": round(time.time() - t0), "focal_prior_px": focal,
                  "summary": [l for l in log.splitlines() if l.startswith("[run]") or "focal" in l.lower() or "Rig insp" in l][-25:]}
    sp = sorted(glob.glob(f"{WS}/sparse/*"))
    if sp:
        rec = pycolmap.Reconstruction(sp[0]); P = rec.points3D; res = {}
        for im in rec.images.values():
            cam = rec.cameras[im.camera_id]; cw = im.cam_from_world(); Rm, t = np.asarray(cw.rotation.matrix()), np.asarray(cw.translation)
            e = [np.linalg.norm(np.asarray(cam.img_from_cam((Rm @ P[p.point3D_id].xyz + t)[None]))[0] - np.asarray(p.xy)) for p in im.points2D if p.has_point3D()]
            res[im.name] = {"obs": len(e), "reproj_mean_px": float(np.mean(e)) if e else None}
        pairs = {}
        for im in rec.images.values():
            k = im.name.rsplit("/", 2); pairs.setdefault(k[-1], {})[k[1]] = im
        rig = []
        for s_, d in pairs.items():
            if len(d) == 2:
                Ra, Rb = (np.asarray(d[c].cam_from_world().rotation.matrix()) for c in ("cam0", "cam1"))
                rig.append({"stem": s_, "rot_deg": float(np.degrees(Rot.from_matrix(Rb @ Ra.T).magnitude())),
                            "baseline_cm": float(100 * np.linalg.norm(np.asarray(d["cam1"].projection_center()) - np.asarray(d["cam0"].projection_center())))})
        out["model"] = {"images_registered": len(rec.images), "points": len(P), "per_image": res, "rig": rig,
                        "cameras": {cid: {"model": str(c.model), "wh": [c.width, c.height], "params": [round(float(x), 5) for x in c.params]} for cid, c in rec.cameras.items()}}
    S = math.ceil(math.sqrt(lw * lw / 5)); half_ = (S + 1) // 2
    out["training_faces_code_derived"] = {"faces_per_lens": 5, "face_px": 2 * half_, "face_focal": half_, "loss_scales": 1 if 2 * half_ < 1920 else min(4, int(math.log2(2 * half_ / 1920)) + 2)}
    json.dump(out, open(R / "home_preflight.json", "w"), indent=1, default=str); vol.commit()
    return out


if __name__ == "__main__":
    import hashlib, json, sys
    from pathlib import Path
    run, files = sys.argv[1], sys.argv[2:]
    with vol.batch_upload(force=True) as b:
        for f in files: b.put_file(f, f"/insp_home/{run}/raw/{Path(f).name}")
    print(json.dumps({Path(f).name: hashlib.sha256(open(f, "rb").read()).hexdigest() for f in files}, indent=1))
    res = modal.Function.from_name("slate360-insp-home-preflight", "home_preflight_v1").spawn(run).get()
    print(json.dumps(res, indent=1, default=str))
