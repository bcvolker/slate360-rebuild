"""Room 213 -> Spirula developer repro package. PACKAGING ONLY: copies existing artifacts, derives the 4 full training
faces with the existing forensic face warp, re-runs the existing edge measurement as a self-check. No training.
  stage()   -> /vol/room213/2026-09-29/share/repro_stage (small files) + summary
  pack(readme) -> zip on the volume + MANIFEST
  upload()  -> private R2 object + 7-day presigned GET, verified"""
import modal

app = modal.App("slate360-room213-repro-pkg")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = (modal.Image.from_registry("ubuntu:24.04", add_python="3.11").apt_install("libgl1", "libglib2.0-0t64", "ffmpeg")
         .pip_install("numpy", "opencv-python-headless", "pycolmap==4.2.0", "scipy", "boto3", "requests")
         .add_local_dir("stage", "/root/stage"))
D = "/vol/room213/2026-09-29"
WS = f"{D}/capture/conditions/A/ws"; CLIP = "VID_20260929_152303_00_079"; INSV = f"{D}/capture/raw/{CLIP}.insv"
CP = f"{D}/forensic/cp1"; ST = f"{D}/share/repro_stage"; ZIPNAME = "room213_spirula_repro_2026-09-30.zip"; ZIP = f"{D}/share/{ZIPNAME}"
CLOSE = ["o06", "o07", "o08", "o09"]; FPS = 30000 / 1001
KEY = f"private-developer-share/room213/{ZIPNAME}"


def big_files(P):
    """(source path on the volume, arcname) for byte-identical copies that are too big to stage."""
    obs = [o for o in P["targets"]["T_table"]["observations"] if o["tag"] in CLOSE]
    out = [(INSV, f"source/{CLIP}.insv"), (f"{WS}/outputs/ref/step-000030000.ckpt/splat.ply", "model/splat_A_step30000.ply")]
    for o in obs:
        idx = o["image"].split("/")[-1]
        for cam in ("cam0", "cam1"):
            out.append((f"{WS}/images/{CLIP}/{cam}/{idx}", f"physical_frames/{CLIP}/{cam}/{idx}"))
            out.append((f"{WS}/masks/{CLIP}/{cam}/{idx[:-4]}.png", f"masks/{CLIP}/{cam}/{idx[:-4]}.png"))
    import glob, os
    for p in sorted(glob.glob(f"{WS}/sparse/0/*")): out.append((p, f"cameras/sparse_0/{os.path.basename(p)}"))
    for t in CLOSE:
        out += [(f"{CP}/T_table/{t}_src_native.png", f"target/crops/{t}_physical_lens_crop.png"),
                (f"{CP}/T_table/{t}_train_face.png", f"target/crops/{t}_training_face_crop.png"),
                (f"{CP}/T_table/A/T_table_{t}_face_crop.png", f"target/crops/{t}_render_A_crop.png"),
                (f"{CP}/T_table/Adense/T_table_{t}_face_crop.png", f"target/crops/{t}_render_DENSE_CLOSE_crop.png"),
                (f"{D}/capture/renders/cp1_A/T_table_{t}.png", f"target/full_renders/{t}_render_A_1718.png"),
                (f"{D}/capture/renders/cp1_Adense/T_table_{t}.png", f"target/full_renders/{t}_render_DENSE_CLOSE_1718.png"),
                (f"{CP}/T_table/{t}_train_face.npy", f"diagnostics/measure_T_table/T_table/{t}_train_face.npy"),
                (f"{CP}/T_table/A/T_table_{t}_face_crop.png", f"diagnostics/measure_T_table/T_table/A/T_table_{t}_face_crop.png"),
                (f"{CP}/T_table/Adense/T_table_{t}_face_crop.png", f"diagnostics/measure_T_table/T_table/Adense/T_table_{t}_face_crop.png")]
        for d in (-2, -1, 0, 1, 2):
            p = f"{CP}/T_table/adj/{t}_d{d:+d}.npy"
            if os.path.exists(p): out.append((p, f"diagnostics/measure_T_table/T_table/adj/{t}_d{d:+d}.npy"))
    return out


@app.function(image=image, cpu=8.0, memory=32768, timeout=3600, volumes={"/vol": vol})
def stage() -> dict:
    import json, os, re, shutil, struct, subprocess, sys, hashlib
    from pathlib import Path
    import cv2, numpy as np, pycolmap
    sys.path.insert(0, "/root/stage/diagnostics/scripts")
    from forensic_geom import face_pixels, face_plan
    vol.reload(); S = Path(ST); shutil.rmtree(S, ignore_errors=True); S.mkdir(parents=True)
    P = json.load(open(f"{CP}/prep.json")); T = P["targets"]["T_table"]; obs = [o for o in T["observations"] if o["tag"] in CLOSE]
    rec = pycolmap.Reconstruction(f"{WS}/sparse/0"); summ = {}

    # training faces: the full 1718^2 face each close observation's target falls in (exact forensic warp, as the loss sees it)
    (S / "training_faces").mkdir(); chk = {}
    for o in obs:
        im = rec.images[o["image_id"]]; cam = rec.cameras[im.camera_id]; axes, f, side, _ = face_plan(cam)
        img = cv2.imread(f"{WS}/images/{o['image']}", cv2.IMREAD_COLOR)[..., ::-1]
        fc, mx, my = face_pixels(cam, img, o["face"], 0, 0, side, side)
        stem = o["image"].split("/")[-1][:-4]; base = f"{o['tag']}_{CLIP[-3:]}_cam0_{stem}_face{o['face']}"
        cv2.imwrite(str(S / "training_faces" / f"{base}.png"), np.clip(fc[..., ::-1] * 255 + 0.5, 0, 255).astype(np.uint8))
        mk = cv2.imread(f"{WS}/masks/{o['image'][:-4]}.png", 0)
        cv2.imwrite(str(S / "training_faces" / f"{base}_mask.png"), cv2.remap(mk, mx, my, cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0))
        u0, v0, u1, v1 = o["face_bbox"]; ref = np.load(f"{CP}/T_table/{o['tag']}_train_face.npy")
        chk[o["tag"]] = {"face_size": side, "f": f, "max_abs_diff_vs_diagnostic_crop": float(np.abs(fc[v0:v1, u0:u1] - ref).max())}
    summ["face_check"] = chk

    # cameras: exact face cameras used for the renders + text export of the 8 frames + camera models
    (S / "cameras").mkdir(); names = {f"T_table_{t}" for t in CLOSE}
    views = [v for v in P["render_views"] if v["name"] in names]
    json.dump({"note": "world->camera (OpenCV), PINHOLE f=cx=cy=859 on 1718x1718; = SfM image pose premultiplied by the face axes (face 0 = identity)",
               "views": views, "observations": obs}, open(S / "cameras/face_cameras_T_table.json", "w"), indent=1)
    want = set()
    for o in obs:
        idx = o["image"].split("/")[-1]; want |= {f"{CLIP}/cam0/{idx}", f"{CLIP}/cam1/{idx}"}
    tmp = Path("/tmp/txt"); shutil.rmtree(tmp, ignore_errors=True); tmp.mkdir(); rec.write_text(str(tmp))
    shutil.copy(tmp / "cameras.txt", S / "cameras/cameras.txt")
    lines = open(tmp / "images.txt").read().splitlines(); keep = [l for l in lines[:4] if l.startswith("#")]
    for i in range(len(lines)):
        p = lines[i].split()
        if lines[i] and not lines[i].startswith("#") and len(p) >= 10 and p[-1] in want: keep.append(lines[i]); keep.append("")  # pose line only, 2D points dropped
    (S / "cameras/images_T_table_subset.txt").write_text("\n".join(keep) + "\n")
    man = open(f"{WS}/.spirula_manifest.yaml").read().replace(f"{WS}/", "").replace(INSV, f"source/{CLIP}.insv")
    (S / "cameras/spirula_manifest.yaml").write_text(man)

    # config: the run's own config.json/scene_transform.json (absolute volume paths made relative)
    (S / "config").mkdir()
    for n in ("config.json", "scene_transform.json"):
        s = open(f"{WS}/outputs/ref/{n}").read().replace(f"{WS}/", "").replace(WS, ".")
        (S / "config" / f"train_{n}").write_text(s)
    rc = open("/root/stage/config/resolved_config_A.json").read().replace(f"{WS}/", "").replace(WS, ".")
    (S / "config/resolved_config_A.json").write_text(rc)

    # target definition + measurement harness input (prep.json reduced to T_table; analyze_edges skips missing views)
    (S / "target").mkdir(); (S / "diagnostics/measure_T_table").mkdir(parents=True)
    tgt = {k: v for k, v in T.items() if k not in ("sweep",)}
    json.dump({"frame": "Spirula A SfM/world frame (cameras/sparse_0)", "X": T["X"], "plane_normal": T["n"], "plane_u": T["u"], "plane_v": T["v"],
               "close_tags": CLOSE, "close_observations": obs, "all_observations": T["observations"], "novel_views": T["novel"]},
              open(S / "target/table_target.json", "w"), indent=1)
    json.dump({"run": P["run"], "cond": "A", "targets": {"T_table": tgt}, "render_views": views}, open(S / "diagnostics/measure_T_table/prep.json", "w"), indent=1)

    # source metadata: container streams, trailer record index, per-frame exposure (record 4) around the close frames
    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", INSV], capture_output=True, text=True).stdout)
    f = open(INSV, "rb"); f.seek(0, 2); n = f.tell(); f.seek(n - 72); h = f.read(72); extra = struct.unpack("<I", h[32:36])[0]
    f.seek(n - extra); blob = f.read(extra); off = extra - 72; idxb = blob[off - 256:off - 6]; ents = {}
    for i in range(len(idxb) - 9):
        rid, fmt, size, o_ = struct.unpack("<BBII", idxb[i:i + 10])
        if rid and size and 0 <= o_ and o_ + size <= extra:
            if rid == 4:
                if size % 16: continue
                e = np.frombuffer(blob[o_:o_ + size], dtype=[("t", "<u8"), ("e", "<f8")])["e"]
                if not (np.all(e > 1e-5) and np.all(e < 1)): continue
            ents.setdefault(rid, (size, o_))
    a = np.frombuffer(blob[ents[4][1]:ents[4][1] + ents[4][0]], dtype=[("t", "<u8"), ("e", "<f8")])
    nfr = int(pr["streams"][0]["nb_frames"])
    per = []
    for o in obs:
        idx = int(o["image"].split("/")[-1][:-4]); t_s = idx / FPS
        j = int(np.argmin(np.abs((a["t"] - a["t"][0]) / 1000.0 - t_s)))
        per.append({"tag": o["tag"], "frame_index": idx, "pts_s": round(t_s, 4), "exposure_s_nearest_record": float(a["e"][j]),
                    "one_over": round(1 / float(a["e"][j]), 1), "exposure_s_pm15_frames_minmax": [float(a["e"][max(0, j - 15):j + 16].min()), float(a["e"][max(0, j - 15):j + 16].max())]})
    meta = {"file": f"{CLIP}.insv", "bytes": n, "duration_s": float(pr["format"]["duration"]), "frames_per_lens_track": nfr, "fps": "30000/1001",
            "streams": [{k: s.get(k) for k in ("index", "codec_type", "codec_name", "profile", "pix_fmt", "width", "height", "r_frame_rate", "nb_frames", "bit_rate")} for s in pr["streams"]],
            "insta360_trailer": {"bytes": extra, "record_ids_present": sorted(int(k) for k in ents if k < 64),
                                 "exposure_record_4": {"entries": int(len(a)), "layout": "<u8 timestamp_ms, <f8 exposure_s>",
                                                       "clip_p10_p50_p90_s": [float(np.percentile(a["e"], q)) for q in (10, 50, 90)]},
                                 "gps_record_7_present": 7 in ents},
            "container_location_tags": {k: v for k, v in pr["format"].get("tags", {}).items() if "loc" in k.lower() or "xyz" in k.lower() or "gps" in k.lower()},
            "close_observation_exposure": per}
    (S / "source").mkdir(); json.dump(meta, open(S / "source/insv_metadata.json", "w"), indent=1); summ["source"] = meta

    # copy the locally staged files (diagnostics, scripts, figures) next to the generated ones
    for p in Path("/root/stage").rglob("*"):
        if p.is_file() and "config" not in p.parts:
            d = S / p.relative_to("/root/stage"); d.parent.mkdir(parents=True, exist_ok=True); shutil.copy(p, d)

    # self-check: re-run the existing measurement on the packaged inputs only
    M = Path("/tmp/meas"); shutil.rmtree(M, ignore_errors=True); shutil.copytree(S / "diagnostics/measure_T_table", M)
    for src, arc in big_files(P):
        if arc.startswith("diagnostics/measure_T_table/"):
            d = M / arc[len("diagnostics/measure_T_table/"):]; d.parent.mkdir(parents=True, exist_ok=True); shutil.copy(src, d)
    for model in ("A", "Adense"):
        r = subprocess.run([sys.executable, str(S / "diagnostics/scripts/analyze_edges.py"), str(M), f"{WS}/sparse/0", f"/tmp/meas_{model}.json"],
                           capture_output=True, text=True, env={**os.environ, "MODEL": model}, cwd="/tmp")
        try:
            c = json.load(open(f"/tmp/meas_{model}.json"))["T_table"]["summary"]["CLOSE"]
            summ[f"recheck_{model}"] = {k: round(c[k], 3) for k in ("n_views", "width_gt_px", "width_render_aligned_px", "width_ratio_render_gt", "width_ratio_neighbour_gt")}
        except Exception as e:
            summ[f"recheck_{model}"] = {"error": str(e), "log": (r.stdout + r.stderr)[-1500:]}

    # privacy scan of every staged text file
    pats = {"aws_key": r"AKIA[0-9A-Z]{16}", "jwt": r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}", "github": r"gh[pousr]_[A-Za-z0-9]{20,}|github_pat_",
            "supabase": r"sbp_[a-f0-9]{20,}|supabase\.co", "stripe": r"sk_(live|test)_", "modal": r"\b(ak|as)-[A-Za-z0-9]{16,}", "r2": r"r2\.cloudflarestorage|R2_SECRET|R2_ACCESS",
            "generic": r"(?i)(api[_-]?key|secret|password|token)\s*[:=]", "local_user_path": r"C:\\\\Users|/Users/|/home/", "url": r"https?://[^\s\"')]+", "email": r"[\w.+-]+@[\w-]+\.[\w.]+"}
    hits = []
    for p in S.rglob("*"):
        if p.suffix in (".json", ".py", ".txt", ".yaml", ".md"):
            s = p.read_text(errors="replace")
            for k, rx in pats.items():
                for m in re.finditer(rx, s): hits.append({"file": str(p.relative_to(S)), "kind": k, "match": m.group(0)[:80]})
    summ["privacy_hits"] = hits
    summ["staged_files"] = sorted(str(p.relative_to(S)) for p in S.rglob("*") if p.is_file())
    vol.commit(); return summ


@app.function(image=image, cpu=4.0, memory=8192, timeout=3 * 3600, volumes={"/vol": vol})
def pack(readme: str) -> dict:
    import hashlib, json, os, zipfile
    from pathlib import Path
    vol.reload(); S = Path(ST); (S / "README.md").write_text(readme)
    P = json.load(open(f"{CP}/prep.json")); items = [(str(p), str(p.relative_to(S)).replace(os.sep, "/")) for p in sorted(S.rglob("*")) if p.is_file() and "__pycache__" not in p.parts and p.name != "MANIFEST.json"]
    items += big_files(P)
    seen = set(); man = []
    for src, arc in items:
        assert arc not in seen, arc; seen.add(arc)
        h = hashlib.sha256()
        with open(src, "rb") as f:
            for b in iter(lambda: f.read(1 << 24), b""): h.update(b)
        man.append({"path": arc, "bytes": os.path.getsize(src), "sha256": h.hexdigest()})
    man.sort(key=lambda m: m["path"]); (S / "MANIFEST.json").write_text(json.dumps({"files": man}, indent=1))
    root = "room213_spirula_repro/"; stored = (".insv", ".ply", ".jpg", ".png", ".npy")
    if os.path.exists(ZIP): os.remove(ZIP)
    with zipfile.ZipFile(ZIP, "w", allowZip64=True) as z:
        z.write(S / "README.md", root + "README.md", compress_type=zipfile.ZIP_DEFLATED)
        z.write(S / "MANIFEST.json", root + "MANIFEST.json", compress_type=zipfile.ZIP_DEFLATED)
        for src, arc in items:
            if arc in ("README.md", "MANIFEST.json"): continue
            z.write(src, root + arc, compress_type=zipfile.ZIP_STORED if arc.endswith(stored) else zipfile.ZIP_DEFLATED)
    with zipfile.ZipFile(ZIP) as z: bad = z.testzip()
    h = hashlib.sha256()
    with open(ZIP, "rb") as f:
        for b in iter(lambda: f.read(1 << 24), b""): h.update(b)
    vol.commit()
    return {"zip": ZIP, "bytes": os.path.getsize(ZIP), "sha256": h.hexdigest(), "testzip_bad": bad, "n_files": len(man) + 2,
            "by_top": {t: sum(m["bytes"] for m in man if m["path"].split("/")[0] == t) for t in sorted({m["path"].split("/")[0] for m in man})}}


@app.function(image=image, cpu=4.0, memory=8192, timeout=3 * 3600, volumes={"/vol": vol}, secrets=[modal.Secret.from_name("slate360-twin-worker")])
def upload(expected_sha: str) -> dict:
    import hashlib, os, time, requests, boto3
    from boto3.s3.transfer import TransferConfig
    from botocore.config import Config
    vol.reload()
    s3 = boto3.client("s3", endpoint_url=os.environ["R2_ENDPOINT"], aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                      aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"], region_name="auto", config=Config(signature_version="s3v4"))
    B = os.environ["R2_BUCKET"]
    s3.upload_file(ZIP, B, KEY, ExtraArgs={"ContentType": "application/zip", "Metadata": {"sha256": expected_sha}},
                   Config=TransferConfig(multipart_threshold=64 << 20, multipart_chunksize=128 << 20, max_concurrency=8))
    hd = s3.head_object(Bucket=B, Key=KEY)
    try: acl = s3.get_object_acl(Bucket=B, Key=KEY)["Grants"]
    except Exception as e: acl = f"n/a ({type(e).__name__})"
    t0 = time.time(); exp = 7 * 24 * 3600
    url = s3.generate_presigned_url("get_object", Params={"Bucket": B, "Key": KEY}, ExpiresIn=exp)
    h = hashlib.sha256(); n = 0
    with requests.get(url, stream=True, timeout=600) as r:                     # no credentials: plain HTTPS GET
        r.raise_for_status()
        for b in r.iter_content(1 << 22): h.update(b); n += len(b)
    unsigned = requests.get(f"{os.environ['R2_ENDPOINT'].rstrip('/')}/{B}/{KEY}", timeout=60, headers={"Range": "bytes=0-15"})
    return {"bucket": B, "key": KEY, "head_bytes": hd["ContentLength"], "head_meta_sha": hd.get("Metadata", {}).get("sha256"), "acl": str(acl)[:300],
            "presigned_url": url, "signed_at_unix": int(t0), "expires_unix": int(t0) + exp, "download_bytes": n, "download_sha256": h.hexdigest(),
            "download_matches": h.hexdigest() == expected_sha, "unsigned_status": unsigned.status_code, "unsigned_body": unsigned.text[:200]}
