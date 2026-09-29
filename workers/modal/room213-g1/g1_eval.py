"""R213-G1 native evaluation (2026-09-28). GOLDEN and G1 exported PLYs rendered through Spirula's own eval path (stage B:
--init-ply, 0 iterations, the golden flags; verified earlier to equal the saved-state render within 1 grey level) at
IDENTICAL cameras: the 12 locked matched pinhole views (6 targets x f640/f1280), the 24 true held-out fisheye frames
(*_eval), and all 800 walkthrough poses. Renders are identified by their GT content (walk GTs carry an encoded index), not
by output order. Same unpatched golden binary. Writes only under /vol/room213/2026-09-28/g1/eval/.
Usage: python -m modal run g1_eval.py::evaluate
"""
import modal

app = modal.App("slate360-room213-g1-eval")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = (modal.Image.from_registry("nvidia/cuda:12.8.1-devel-ubuntu22.04", add_python="3.11")
         .apt_install("libgomp1", "libgl1", "libglib2.0-0", "ffmpeg")
         .pip_install("numpy<2", "opencv-python-headless<4.11", "scipy", "torch==2.6.0", "lpips")
         .env({"NVIDIA_DRIVER_CAPABILITIES": "compute,utility"})
         .add_local_dir("refs", "/root/refs"))
TOOLS = "/vol/tools/spirula/fd1afca1c47f89c98c8e64929f1c73b82571e5f3"
GOLDEN_BINARY_SHA256 = "24cf3ca8bcde6ce3b6491a44abe7d15fd24b329874f6fa4f8b823863854dc5a3"
DS = "/vol/room213/2026-09-21/spirula_bench_v1/dataset"
G1 = "/vol/room213/2026-09-28/g1"
PLYS = {"golden": ("/vol/room213/2026-09-21/spirula_bench_v1/runs/room213_spirula_full/step-000030000.ckpt/splat.ply",
                   "7e7b5d18af92d5f4b751977d6d96f2251b896c46f1dbb37d356eed3dd0823a62"),
        "g1": (f"{G1}/runs/room213_g1/step-000030000.ckpt/splat.ply", None)}
TRAIN_FRAMES = ["camera1/frame_00036_train.png", "camera2/frame_00104_train.png"]


def flags(data):
    return ["--data", data, "--data-format", "colmap", "--image-dir", "images", "--mask-dir", "masks", "--load-masks", "1",
            "--eval-mode", "filename", "--warp-to-pinhole", "0", "--train-resolution-divisor", "1", "--primitive", "3dgut",
            "--cap-max", "1000000", "--num-iterations", "0", "--use-bilateral-grid", "0", "--use-bilateral-grid-for-geometry", "0",
            "--use-ppisp", "0", "--load-depths", "0", "--load-normals", "0", "--normal-supervision-weight", "0",
            "--depth-supervision-weight", "0", "--save-eval-images", "1", "--disable-viewer", "1", "--keep-viewer-alive", "0"]


@app.function(image=image, gpu="L40S", cpu=16.0, memory=65536, timeout=3 * 3600, volumes={"/vol": vol})
def evaluate(models: list = ["golden", "g1"]) -> dict:
    import hashlib, json, os, shutil, subprocess, time, numpy as np, cv2, torch, lpips
    from pathlib import Path
    vol.reload(); t0 = time.time()
    b = "/tmp/spirula"; shutil.copy(f"{TOOLS}/spirula", b); os.chmod(b, 0o755)
    assert hashlib.sha256(open(b, "rb").read()).hexdigest() == GOLDEN_BINARY_SHA256
    views = json.load(open("/root/refs/views.json"))["views"]
    root = Path("/tmp/ev/dataset"); (root / "sparse/0").mkdir(parents=True)
    cams = [l for l in open(f"{DS}/sparse/0/cameras.txt").read().splitlines() if l and not l.startswith("#")]
    assert cams[2].startswith("3 PINHOLE 1280 720 640.0 640.0 640.0 360.0")
    (root / "sparse/0/cameras.txt").write_text("\n".join(cams[:3] + ["4 PINHOLE 1280 720 1280.0 1280.0 640.0 360.0"]) + "\n")
    lines = [l for l in open(f"{DS}/sparse/0/images.txt").read().splitlines() if l.strip()]
    keep = [l for l in lines if l.split()[9] in TRAIN_FRAMES or (l.split()[9].startswith("camera") and l.split()[9].endswith("_eval.png"))
            or l.split()[9].startswith("walk/")]
    gts = {}                                        # name -> GT path we provide (identification by content)
    for l in keep:
        n = l.split()[9]; d = root / "images" / n; d.parent.mkdir(parents=True, exist_ok=True)
        if n.startswith("walk/"):
            k = int(n[7:12]); im = np.zeros((720, 1280, 3), np.uint8); im[..., 0] = k // 256; im[..., 1] = k % 256; im[..., 2] = 77
            cv2.imwrite(str(d), im)
        else:
            os.symlink(f"{DS}/images/{n}", d)
            (root / "masks" / n).parent.mkdir(parents=True, exist_ok=True); os.symlink(f"{DS}/masks/{n}", root / "masks" / n)
        gts[n] = str(d)
    for k, v in enumerate(views):
        n = f"diag/v{k:03d}_{v['name']}_eval.png"; q, t = v["w2c_qvec"], v["w2c_t"]
        keep.append(f"{2000 + k} {q[0]!r} {q[1]!r} {q[2]!r} {q[3]!r} {t[0]!r} {t[1]!r} {t[2]!r} {3 if v['f'] == 640 else 4} {n}")
        d = root / "images" / n; d.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(f"/root/refs/ref_{v['name']}.png", d); gts[n] = str(d)
    (root / "sparse/0/images.txt").write_text("".join(l + "\n\n" for l in keep))
    shutil.copyfile(f"{DS}/sparse/0/points3D.txt", root / "sparse/0/points3D.txt")
    thumb = lambda im: cv2.resize(im, (48, 27) if im.shape[1] != im.shape[0] else (32, 32), interpolation=cv2.INTER_AREA).astype(np.float32)
    ref_th = {n: thumb(cv2.imread(p)) for n, p in gts.items()}
    out = {"models": {}, "n_eval_inputs": len(gts)}
    lp = lpips.LPIPS(net="alex").cuda()
    for m in models:
        ply, want = PLYS[m]; sh = hashlib.sha256(open(ply, "rb").read()).hexdigest()
        if want: assert sh == want
        od = Path(f"/tmp/ev/{m}"); od.mkdir(parents=True)
        cmd = [b, "train", "3dgs", *flags(str(root)), "--init-ply", ply, "--output-dir-prefix", str(od), "--output-dir-name", "r"]
        t1 = time.time(); r = subprocess.run(cmd, capture_output=True, text=True, cwd="/tmp", timeout=7200)
        run = od / "r"; dest = Path(f"{G1}/eval/{m}"); dest.mkdir(parents=True, exist_ok=True)
        mapping = {}
        for g in sorted(run.glob("eval-gt-*.png")):
            gi = cv2.imread(str(g)); th = thumb(gi)
            cand = [(float(np.abs(th - v).mean()), n) for n, v in ref_th.items() if v.shape == th.shape]
            err, n = min(cand); mapping[n] = {"idx": g.name[8:13], "thumb_err": err}
            rd = run / g.name.replace("eval-gt-", "eval-render-"); tgt = dest / n; tgt.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(rd, tgt)
        # held-out metrics (masked by the dataset mask), secondary
        met = {}
        for n in [x for x in mapping if x.startswith("camera")]:
            rimg = cv2.imread(str(dest / n)).astype(np.float32); gimg = cv2.imread(gts[n]).astype(np.float32)
            mk = cv2.imread(f"{DS}/masks/{n}", 0) > 127
            mse = ((rimg - gimg) ** 2)[mk].mean(); psnr = float(10 * np.log10(255 ** 2 / mse))
            gr, gg = cv2.cvtColor(rimg, cv2.COLOR_BGR2GRAY), cv2.cvtColor(gimg, cv2.COLOR_BGR2GRAY)
            mu1, mu2 = cv2.GaussianBlur(gr, (11, 11), 1.5), cv2.GaussianBlur(gg, (11, 11), 1.5)
            s11 = cv2.GaussianBlur(gr * gr, (11, 11), 1.5) - mu1 ** 2; s22 = cv2.GaussianBlur(gg * gg, (11, 11), 1.5) - mu2 ** 2; s12 = cv2.GaussianBlur(gr * gg, (11, 11), 1.5) - mu1 * mu2
            C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
            ssim = float((((2 * mu1 * mu2 + C1) * (2 * s12 + C2)) / ((mu1 ** 2 + mu2 ** 2 + C1) * (s11 + s22 + C2)))[mk].mean())
            ds_ = lambda x: torch.from_numpy(cv2.resize(x, (1280, 1280), interpolation=cv2.INTER_AREA)[..., ::-1].copy()).permute(2, 0, 1)[None].cuda() / 127.5 - 1
            mk2 = torch.from_numpy(cv2.resize(mk.astype(np.uint8), (1280, 1280), interpolation=cv2.INTER_NEAREST).astype(np.float32)).cuda()[None, None]
            with torch.no_grad():
                l = float(lp(ds_(rimg) * mk2, ds_(gimg) * mk2).item())
            met[n] = {"psnr": psnr, "ssim": ssim, "lpips_1280_masked": l}
        # walkthrough video (ordered by encoded index)
        wd = dest / "walk"; frames = sorted(wd.glob("w_*_eval.png"))
        out["models"][m] = {"ply_sha256": sh, "exit": r.returncode, "render_s": round(time.time() - t1), "n_mapped": len(mapping),
                            "max_thumb_err": max(v["thumb_err"] for v in mapping.values()), "heldout": met,
                            "heldout_mean": {k: float(np.mean([v[k] for v in met.values()])) for k in ("psnr", "ssim", "lpips_1280_masked")} if met else None,
                            "walk_frames": len(frames), "log_tail": (r.stdout + r.stderr)[-1500:]}
        vol.commit()
    gw, g1w = Path(f"{G1}/eval/golden/walk"), Path(f"{G1}/eval/g1/walk")
    if gw.is_dir() and g1w.is_dir():
        subprocess.run(["bash", "-c", f"ffmpeg -y -loglevel error -framerate 20 -i {gw}/w_%05d_eval.png -framerate 20 -i {g1w}/w_%05d_eval.png "
                        f"-filter_complex hstack=inputs=2 -c:v libx264 -crf 16 -pix_fmt yuv420p {G1}/eval/walk_golden_left_g1_right.mp4"])
    out["elapsed_s"] = round(time.time() - t0)
    json.dump(out, open(f"{G1}/eval/eval.json", "w"), indent=1); vol.commit()
    return {k: v for k, v in out.items()} | {"models": {m: {k: v for k, v in d.items() if k != "heldout"} for m, d in out["models"].items()}}
