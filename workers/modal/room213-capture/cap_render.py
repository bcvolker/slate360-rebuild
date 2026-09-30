"""Native renders at ARBITRARY pinhole cameras for the capture benchmark (render-only; models are never modified).
  render_release(ply, sparse_dir, views, tag)  official Spirula v2026.9.24 release (Vulkan), `360-camera` preset flags,
                                               --init-ply, 0 iterations (same path as the R213-OFFICIAL-REF renders)
  render_golden(views, tag)                    golden unpatched fd1afca1 CUDA build, golden bench flags, --init-ply
                                               (same path as the G1/golden native renders)
  rectify(cond, views, tag)                    SOURCE references: the condition's own fisheye frame resampled into a
                                               pinhole view through its SfM camera model (bilinear, no other processing)
A view = {name, R (world->cam 3x3, OpenCV), t (3), f, W, H} in THAT model's frame. Renders are identified by GT content
(each view gets a unique encoded GT), never by output order. Outputs under /vol/room213/2026-09-29/capture/renders/<tag>/."""
import modal

from cap_ingest import DST
from cap_official import COND_ROOT, SP, check_bin, image as rel_image

app = modal.App("slate360-room213-capture-render")
vol = modal.Volume.from_name("slate360-recon-experiments")
rimage = rel_image.pip_install("pycolmap==4.2.0", "scipy").add_local_file("cap_ingest.py", "/root/cap_ingest.py").add_local_file("cap_official.py", "/root/cap_official.py")
gimage = (modal.Image.from_registry("nvidia/cuda:12.8.1-devel-ubuntu22.04", add_python="3.11")
          .apt_install("libgomp1", "libgl1", "libglib2.0-0").pip_install("numpy<2", "opencv-python-headless<4.11", "pycolmap==4.2.0", "scipy", "boto3")
          .env({"NVIDIA_DRIVER_CAPABILITIES": "compute,utility"})
          .add_local_file("cap_ingest.py", "/root/cap_ingest.py").add_local_file("cap_official.py", "/root/cap_official.py"))
OUT = f"{DST}/renders"
GOLD_TOOLS = "/vol/tools/spirula/fd1afca1c47f89c98c8e64929f1c73b82571e5f3/spirula"
GOLD_SHA = "24cf3ca8bcde6ce3b6491a44abe7d15fd24b329874f6fa4f8b823863854dc5a3"
GOLD_DS = "/vol/room213/2026-09-21/spirula_bench_v1/dataset"
GOLD_PLY = ("/vol/room213/2026-09-21/spirula_bench_v1/runs/room213_spirula_full/step-000030000.ckpt/splat.ply", "7e7b5d18af92d5f4b751977d6d96f2251b896c46f1dbb37d356eed3dd0823a62")


def _dataset(root, cam_lines, train_lines, train_files, views, points_txt=""):
    """COLMAP text dataset: given train frames (parser needs >=1) + one eval image per view with an encoded unique GT."""
    import shutil, numpy as np, cv2
    from pathlib import Path
    from scipy.spatial.transform import Rotation as Rot
    (root / "sparse/0").mkdir(parents=True)
    sizes = {}
    for k, v in enumerate(views):
        sizes.setdefault((v["W"], v["H"], v["f"]), 100 + len(sizes))
    cams = cam_lines + [f"{cid} PINHOLE {W} {H} {float(f)!r} {float(f)!r} {W / 2!r} {H / 2!r}" for (W, H, f), cid in sizes.items()]
    (root / "sparse/0/cameras.txt").write_text("\n".join(cams) + "\n")
    lines = list(train_lines)
    for src, dst in train_files:
        (root / "images" / dst).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, root / "images" / dst)
    gts = {}
    for k, v in enumerate(views):
        q = Rot.from_matrix(np.array(v["R"])).as_quat(); t = [float(x) for x in v["t"]]
        name = f"view/v{k:04d}_eval.png"
        lines += [f"{5000 + k} {float(q[3])!r} {float(q[0])!r} {float(q[1])!r} {float(q[2])!r} {t[0]!r} {t[1]!r} {t[2]!r} {sizes[(v['W'], v['H'], v['f'])]} {name}", ""]
        img = np.zeros((v["H"], v["W"], 3), np.uint8); img[..., 0] = k // 256; img[..., 1] = k % 256; img[..., 2] = 91
        (root / "images" / name).parent.mkdir(parents=True, exist_ok=True); cv2.imwrite(str(root / "images" / name), img); gts[k] = img
    (root / "sparse/0/images.txt").write_text("\n".join(lines) + "\n")
    (root / "sparse/0/points3D.txt").write_text(points_txt)
    return gts


def _collect(run, views, gts, dest):
    import shutil, numpy as np, cv2
    from pathlib import Path
    Path(dest).mkdir(parents=True, exist_ok=True); got = {}
    for g in sorted(Path(run).glob("eval-gt-*.png")):
        im = cv2.imread(str(g)); b, gg = int(np.median(im[..., 0])), int(np.median(im[..., 1]))
        k = b * 256 + gg
        if k < len(views) and int(np.median(im[..., 2])) == 91:
            shutil.copyfile(str(g).replace("eval-gt-", "eval-render-"), f"{dest}/{views[k]['name']}.png"); got[views[k]["name"]] = True
    return got


@app.function(image=rimage, gpu="L40S", cpu=16.0, memory=65536, timeout=3 * 3600, volumes={"/vol": vol})
def render_release_v2(ply: str, sparse_dir: str, images_dir: str, views: list, tag: str) -> dict:
    import subprocess, time, shutil, pycolmap
    from pathlib import Path
    from scipy.spatial.transform import Rotation as Rot
    check_bin(); vol.reload(); root = Path("/tmp/rr/dataset"); shutil.rmtree("/tmp/rr", ignore_errors=True)
    rec = pycolmap.Reconstruction(sparse_dir)
    import os; os.makedirs("/tmp/rr_txt", exist_ok=True); rec.write_text("/tmp/rr_txt")
    cam_lines = [l for l in open("/tmp/rr_txt/cameras.txt").read().splitlines() if l and not l.startswith("#")][:1]
    cid = int(cam_lines[0].split()[0]); im = next(i for i in rec.images.values() if i.camera_id == cid)
    c = im.cam_from_world(); q = Rot.from_matrix(c.rotation.matrix()).as_quat(); tt = [float(x) for x in c.translation]
    nm = "train/" + im.name.replace("/", "_").replace(".jpg", "_train.jpg")
    train = [f"1 {float(q[3])!r} {float(q[0])!r} {float(q[1])!r} {float(q[2])!r} {tt[0]!r} {tt[1]!r} {tt[2]!r} {cid} {nm}", ""]
    pts = "".join(f"{pid} {float(p.xyz[0])!r} {float(p.xyz[1])!r} {float(p.xyz[2])!r} {int(p.color[0])} {int(p.color[1])} {int(p.color[2])} 0" + chr(10)
                  for pid, p in list(rec.points3D.items())[:100000])
    gts = _dataset(root, cam_lines, train, [(f"{images_dir}/{im.name}", nm)], views, pts)
    cmd = f"{SP} train 360-camera --data {root} --image-dir images --mask-dir masks --num-iterations 0 --init-ply {ply} " \
          f"--save-eval-images 1 --eval-mode filename --disable-viewer 1 --output-dir-prefix /tmp/rr --output-dir-name r --device 0"
    t0 = time.time(); r = subprocess.run(["bash", "-c", cmd], capture_output=True, text=True, timeout=3 * 3600)
    got = _collect("/tmp/rr/r", views, gts, f"{OUT}/{tag}"); vol.commit()
    return {"exit": r.returncode, "seconds": round(time.time() - t0), "rendered": len(got), "views": len(views), "log_tail": (r.stdout + r.stderr)[-1200:]}


@app.function(image=gimage, gpu="L40S", cpu=16.0, memory=65536, timeout=3 * 3600, volumes={"/vol": vol})
def render_golden_v2(views: list, tag: str) -> dict:
    import hashlib, os, shutil, subprocess, time
    from pathlib import Path
    vol.reload(); b = "/tmp/spg"; shutil.copy(GOLD_TOOLS, b); os.chmod(b, 0o755)
    assert hashlib.sha256(open(b, "rb").read()).hexdigest() == GOLD_SHA
    assert hashlib.sha256(open(GOLD_PLY[0], "rb").read()).hexdigest() == GOLD_PLY[1]
    shutil.rmtree("/tmp/gr", ignore_errors=True); root = Path("/tmp/gr/dataset")
    cams = [l for l in open(f"{GOLD_DS}/sparse/0/cameras.txt").read().splitlines() if l and not l.startswith("#")][:2]
    tr = next(l for l in open(f"{GOLD_DS}/sparse/0/images.txt").read().splitlines() if l.split() and l.split()[-1] == "camera1/frame_00036_train.png")
    gts = _dataset(root, cams, [tr, ""], [(f"{GOLD_DS}/images/camera1/frame_00036_train.png", "camera1/frame_00036_train.png")], views,
                   open(f"{GOLD_DS}/sparse/0/points3D.txt").read())
    flags = "--data-format colmap --image-dir images --mask-dir masks --load-masks 1 --eval-mode filename --warp-to-pinhole 0 --train-resolution-divisor 1 " \
            "--primitive 3dgut --cap-max 1000000 --num-iterations 0 --use-bilateral-grid 0 --use-bilateral-grid-for-geometry 0 --use-ppisp 0 " \
            "--load-depths 0 --load-normals 0 --normal-supervision-weight 0 --depth-supervision-weight 0 --save-eval-images 1 --disable-viewer 1 --keep-viewer-alive 0"
    t0 = time.time(); r = subprocess.run(["bash", "-c", f"{b} train 3dgs --data {root} {flags} --init-ply {GOLD_PLY[0]} --output-dir-prefix /tmp/gr --output-dir-name r"],
                                         capture_output=True, text=True, timeout=3 * 3600, cwd="/tmp")
    got = _collect("/tmp/gr/r", views, gts, f"{OUT}/{tag}"); vol.commit()
    return {"exit": r.returncode, "seconds": round(time.time() - t0), "rendered": len(got), "views": len(views), "log_tail": (r.stdout + r.stderr)[-1200:]}


@app.function(image=rimage, cpu=8.0, memory=32768, timeout=3600, volumes={"/vol": vol})
def rectify_v2(sparse_dir: str, images_dir: str, picks: list, tag: str) -> dict:
    """picks: [{name, image (sparse image name), R, t, f, W, H}] — pinhole view in the SAME frame as sparse_dir."""
    import numpy as np, cv2, pycolmap
    from pathlib import Path
    vol.reload(); rec = pycolmap.Reconstruction(sparse_dir); by = {i.name: i for i in rec.images.values()}
    d = Path(f"{OUT}/{tag}"); d.mkdir(parents=True, exist_ok=True); done = []
    for p in picks:
        im = by[p["image"]]; cam = rec.cameras[im.camera_id]; src = cv2.imread(f"{images_dir}/{p['image']}")
        W, H, f = p["W"], p["H"], p["f"]; yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
        dv = np.stack([(xx + 0.5 - W / 2) / f, (yy + 0.5 - H / 2) / f, np.ones_like(xx)], -1).reshape(-1, 3)
        Rv = np.array(p["R"]); dw = dv @ Rv                                   # view cam -> world (R^T d)
        cw = im.cam_from_world(); Rs = np.asarray(cw.rotation.matrix()); ds = dw @ Rs.T
        ok = np.ones(len(ds), bool) if "EQUIRECT" in str(cam.model) else ds[:, 2] > 1e-3   # panoramas cover every direction
        uv = np.full((len(ds), 2), -1.0); uv[ok] = np.asarray(cam.img_from_cam(ds[ok]))
        m = cv2.remap(src, uv[:, 0].reshape(H, W).astype(np.float32) - 0.5, uv[:, 1].reshape(H, W).astype(np.float32) - 0.5, cv2.INTER_LINEAR)  # COLMAP pixel centres at +0.5
        cv2.imwrite(str(d / f"{p['name']}.png"), m); done.append(p["name"])
    vol.commit()
    return {"rectified": len(done)}
