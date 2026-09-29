"""R213-G1 hard preflight gate + dataset assembly (CPU). Per frame:
 A  every evaluable room-shell class (floor / ceiling / walls, >= 3000 guided px) has median normal error <= 5 deg
    against the solved planes, and at least one class is evaluable;
 B  adjacent-exposure (same lens, exposure e-1 / e+1) world-normal disagreement on the same surface (reprojected range
    within 5 %) has pooled median <= 6 deg, with >= 2000 compared px (480 grid) from at least one neighbour.
Failing frames get an all-black map. Thresholds are fixed (no loosening). Assembles /vol/.../g1/dataset (golden images and
masks by directory symlink, sparse/0 byte copy verified, normals/), hashes, report, contact sheets.
Usage: python -m modal run g1_gate.py::gate
"""
import modal

app = modal.App("slate360-room213-g1-gate")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = modal.Image.debian_slim(python_version="3.11").pip_install("numpy<2.1", "opencv-python-headless", "pycolmap==4.2.0")
BENCH = "/vol/room213/2026-09-21/spirula_bench_v1"
DS = f"{BENCH}/dataset"
FCS = "/vol/room213/2026-09-21/fullcircle/data/room213/sparse/0"
G1 = "/vol/room213/2026-09-28/g1"
A_MAX, B_MAX, B_MINPX = 5.0, 6.0, 2000


@app.function(image=image, volumes={"/vol": vol}, timeout=3600, cpu=8.0, memory=32768)
def gate() -> dict:
    import json, os, re, shutil, hashlib, numpy as np, cv2, pycolmap
    from pathlib import Path
    vol.reload()
    frames = {f["name"]: f for f in json.load(open(f"{G1}/maps_frames.json"))}
    rec = pycolmap.Reconstruction(FCS); byname = {im.name: im for im in rec.images.values()}
    S = 480; sc = 3840 / S; gy, gx = np.mgrid[0:S, 0:S].astype(np.float64)
    pix = np.stack([(gx + 0.5) * sc - 0.5, (gy + 0.5) * sc - 0.5], -1).reshape(-1, 2)
    cache = {}

    def load(name):
        if name not in cache:
            im = byname[frames[name]["src"]]; cam = rec.cameras[im.camera_id]; a = np.load(f"{G1}/aux/{name.replace('/', '__')}.npz")
            d = np.asarray(cam.cam_from_img(pix)); d = np.concatenate([d, np.ones((len(d), 1))], 1); d /= np.linalg.norm(d, axis=1, keepdims=True)
            cfw = im.cam_from_world(); R = np.asarray(cfw.rotation.matrix()); t = np.asarray(cfw.translation)
            cache[name] = dict(cam=cam, R=R, t=t, C=-R.T @ t, d=d, r=a["range"].reshape(-1), n=a["nworld"].reshape(-1, 3).astype(np.float64),
                               v=a["valid"].reshape(-1), prev=a["preview"])
        return cache[name]

    def compare(a, b):
        A, B = load(a), load(b)
        ok = A["v"] & np.isfinite(A["r"]) & (A["r"] > 0)
        X = A["C"] + (A["d"][ok] @ A["R"]) * A["r"][ok][:, None]; nA = A["n"][ok]
        Xc = X @ B["R"].T + B["t"]; fr = Xc[:, 2] > 0.1
        p = np.full((len(X), 2), -1.0); p[fr] = np.asarray(B["cam"].img_from_cam(Xc[fr]))
        gi = (p[:, 1] / sc).astype(int); gj = (p[:, 0] / sc).astype(int); inb = fr & (gi >= 0) & (gj >= 0) & (gi < S) & (gj < S)
        k = gi[inb] * S + gj[inb]; okb = B["v"][k] & np.isfinite(B["r"][k])
        dist = np.linalg.norm(X[inb][okb] - B["C"], axis=1); rel = (B["r"][k][okb] - dist) / dist; same = np.abs(rel) < 0.05
        ang = np.degrees(np.arccos(np.clip((nA[inb][okb][same] * B["n"][k][okb][same]).sum(1), -1, 1)))
        return ang
    key = {}
    for n in frames:
        m = re.match(r"camera(\d)/frame_(\d+)_", n); key[(int(m[1]), int(m[2]))] = n
    report = []
    for n, f in frames.items():
        L, e = map(int, re.match(r"camera(\d)/frame_(\d+)_", n).groups())
        A = f["gateA"]; a_ok = bool(A) and all(v["median_deg"] <= A_MAX for v in A.values())
        angs, nbr = [], {}
        for de in (-1, 1):
            o = key.get((L, e + de))
            if o:
                x = compare(n, o)
                nbr[o] = {"px": int(len(x)), "median_deg": float(np.median(x)) if len(x) else None}
                if len(x) >= B_MINPX: angs.append(x)
        b_med = float(np.median(np.concatenate(angs))) if angs else None
        b_ok = b_med is not None and b_med <= B_MAX
        report.append({**f, "lens": L, "exposure": e, "A_pass": a_ok, "B_median_deg": b_med, "B_pass": b_ok, "neighbours": nbr, "PASS": a_ok and b_ok})
    # ---- assemble dataset (golden inputs untouched: directory symlinks + verified sparse copy)
    ds = Path(f"{G1}/dataset")
    if ds.exists(): shutil.rmtree(ds)
    (ds / "sparse/0").mkdir(parents=True)
    os.symlink(f"{DS}/images", ds / "images"); os.symlink(f"{DS}/masks", ds / "masks")
    sh = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
    sparse = {}
    for fn in ("cameras.txt", "images.txt", "points3D.txt"):
        shutil.copyfile(f"{DS}/sparse/0/{fn}", ds / "sparse/0" / fn)
        sparse[fn] = sh(ds / "sparse/0" / fn)
        assert sparse[fn] == sh(f"{DS}/sparse/0/{fn}")
    man = json.load(open(f"{BENCH}/dataset_manifest.json"))
    passed = {r["name"]: r for r in report if r["PASS"]}
    src_pass = {r["src"]: r["name"] for r in passed.values()}
    black_f = np.zeros((1920, 1920, 3), np.uint8); black_w = np.zeros((720, 1280, 3), np.uint8)
    written = {}
    for m in man["images"] + [{"new": w["name"], "role": "walk"} for w in man["walk"]]:
        dst = ds / "normals" / m["new"]; dst.parent.mkdir(parents=True, exist_ok=True)
        srcmap = None
        if m["role"] in ("train", "holdout_eval") and m["new"] in passed: srcmap = m["new"]
        elif m["role"] == "fixed_eval_duplicate" and m["src"] in src_pass: srcmap = src_pass[m["src"]]
        if srcmap:
            shutil.copyfile(f"{G1}/maps_raw/{srcmap.replace('/', '__')}", dst)
        else:
            cv2.imwrite(str(dst), black_w if m["role"] == "walk" else black_f)
        written[m["new"]] = {"sha256": sh(dst), "guided": bool(srcmap), "role": m["role"]}
    maps_hash = hashlib.sha256("".join(f"{k} {v['sha256']}\n" for k, v in sorted(written.items())).encode()).hexdigest()
    golden_manifest_sha = sh(f"{BENCH}/dataset_manifest.json")
    dataset_hash = hashlib.sha256(f"golden_manifest {golden_manifest_sha}\n{json.dumps(sparse, sort_keys=True)}\nnormals {maps_hash}\n".encode()).hexdigest()
    # ---- stats (train frames are what the loss sees)
    tr = [r for r in report if r["name"].endswith("_train.png")]
    trp = [r for r in tr if r["PASS"]]
    plane = [v["median_deg"] for r in trp for v in r["gateA"].values()]
    summary = {"dataset_id": "room213-golden-v1+normals-moge2b-v1", "dataset_hash": dataset_hash, "normals_map_set_hash": maps_hash,
               "golden_dataset_manifest_sha256": golden_manifest_sha, "sparse_sha256": sparse,
               "frames_total": len(report), "frames_pass": sum(r["PASS"] for r in report),
               "train_frames": len(tr), "train_pass": len(trp), "train_black": len(tr) - len(trp),
               "fail_A": sum(not r["A_pass"] for r in report), "fail_B": sum(not r["B_pass"] for r in report),
               "B_not_evaluable": sum(r["B_median_deg"] is None for r in report),
               "guided_px_pct_of_train_circle": 100 * float(np.mean([r["valid_frac_of_circle"] if r["PASS"] else 0 for r in tr])),
               "guided_px_pct_within_passing": 100 * float(np.mean([r["valid_frac_of_circle"] for r in trp])) if trp else None,
               "median_plane_error_deg_passing": float(np.median(plane)) if plane else None,
               "median_adjacent_disagreement_deg_passing": float(np.median([r["B_median_deg"] for r in trp])) if trp else None,
               "mask_fracs_mean": {k: float(np.mean([r["masked_frac_of_circle"][k] for r in report])) for k in report[0]["masked_frac_of_circle"]}}
    json.dump({"summary": summary, "frames": report, "normals_files": written}, open(f"{G1}/gate_report.json", "w"), indent=1)
    # ---- contact sheet of maps ACTUALLY eligible (passing train frames): preview | map, 120 px each
    tiles = []
    for r in sorted(trp, key=lambda r: r["name"]):
        a = load(r["name"]); mp = cv2.imread(f"{G1}/maps_raw/{r['name'].replace('/', '__')}")
        t = np.hstack([cv2.resize(a["prev"], (120, 120), interpolation=cv2.INTER_AREA), cv2.resize(mp, (120, 120), interpolation=cv2.INTER_AREA)])
        cv2.putText(t, r["name"].split("/")[0][-1] + ":" + r["name"].split("_")[1], (2, 10), 0, 0.3, (255, 255, 255), 1)
        tiles.append(t)
    while len(tiles) % 12: tiles.append(np.zeros_like(tiles[0]))
    if tiles: cv2.imwrite(f"{G1}/contact_eligible.jpg", np.vstack([np.hstack(tiles[i:i + 12]) for i in range(0, len(tiles), 12)]), [cv2.IMWRITE_JPEG_QUALITY, 90])
    vol.commit()
    return summary
