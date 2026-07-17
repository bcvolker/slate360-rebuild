"""Slate360 photogrammetry worker — COLMAP sparse+dense on Modal GPU.

Purpose (ASU survey + P4/J1 pipeline): ~900 DJI mapping photos (EXIF GPS +
serpentine overlap) -> camera poses + dense point cloud -> RGB orthomosaic +
DEM. Downstream: thermal orthorectification (via paired visual frames), slope/
ponding layer, Gaussian-splat input.

Deploy:  cd workers/modal/photogrammetry && PYTHONIOENCODING=utf-8 python -m modal deploy worker.py
Data:    python -m modal volume put asu-rgb-flights <local_dir> /images/<name>
Run:     python -m modal run worker.py::sparse            (poses; ~1-2h A10G)
         python -m modal run worker.py::dense             (point cloud; hours)
         python -m modal run worker.py::ortho             (DEM + orthomosaic)

Notes: official colmap/colmap docker image (CUDA build) — no source compile.
Spatial matching consumes EXIF GPS priors ingested at feature extraction.
"""
from __future__ import annotations
import modal

app = modal.App("slate360-photogrammetry")
vol = modal.Volume.from_name("asu-rgb-flights", create_if_missing=True)

image = (
    modal.Image.from_registry("colmap/colmap:latest", add_python="3.11")
    .pip_install("numpy", "opencv-python-headless", "pillow")
)

WORK = "/data/work"
IMAGES = "/data/images"

# Separate image for Gaussian-splat training. nerfstudio's build kept failing
# (pyliblzfse/fpsample sdists), so we train with a custom gsplat loop instead —
# torch + gsplat only (gsplat JIT-compiles CUDA at first use -> devel image).
splat_image = (
    modal.Image.from_registry("nvidia/cuda:12.1.1-devel-ubuntu22.04",
                              add_python="3.11")
    .apt_install("git", "libgl1", "libglib2.0-0", "build-essential", "ninja-build")
    .run_commands("python -m pip install --upgrade pip setuptools wheel")
    .pip_install("torch==2.1.2+cu121", "torchvision==0.16.2+cu121",
                 index_url="https://download.pytorch.org/whl/cu121")
    .pip_install("numpy<2", "opencv-python-headless")
    .pip_install("gsplat==1.4.0")
    # torch 2.1 cpp_extension imports pkg_resources, removed in setuptools>=70
    .pip_install("setuptools==69.5.1")
    .env({"TORCH_CUDA_ARCH_LIST": "8.6"})
)


@app.function(image=image, volumes={"/data": vol}, timeout=600)
def fixup():
    """One-time: move the MSYS-mangled upload path to the clean /images root."""
    import os, shutil
    src = "/data/C:/Program Files/Git/images"
    if os.path.isdir(src) and not os.path.isdir(IMAGES):
        shutil.move(src, IMAGES)
        shutil.rmtree("/data/C:", ignore_errors=True)
    print(os.listdir(IMAGES))
    vol.commit()
    return "ok"


@app.function(image=image, timeout=600)
def diag():
    import subprocess
    for sub in ["feature_extractor", "spatial_matcher", "mapper"]:
        r = subprocess.run(f"colmap {sub} --help", shell=True, capture_output=True, text=True)
        out = (r.stdout or "") + (r.stderr or "")
        keep = [l for l in out.splitlines() if any(k in l for k in ["gpu", "use_gpu", "guided", "single_camera", "max_image_size", "overlap"])]
        print(f"=== {sub} ===")
        print(chr(10).join(keep[:30]), flush=True)
    v = subprocess.run("colmap --version", shell=True, capture_output=True, text=True)
    print("VERSION:", v.stdout, v.stderr, flush=True)


def _run(cmd: str) -> None:
    import subprocess, sys, os
    print(f"$ {cmd}", flush=True)
    env = dict(os.environ, QT_QPA_PLATFORM="offscreen")  # headless GPU/Qt
    r = subprocess.run(cmd, shell=True, env=env, capture_output=True, text=True)
    if r.stdout:
        print(r.stdout[-4000:], flush=True)
    if r.returncode != 0:
        print("STDERR:", (r.stderr or "")[-4000:], flush=True)
        sys.exit(f"FAILED ({r.returncode}): {cmd}")


@app.function(gpu="A10G", image=image, volumes={"/data": vol}, timeout=6 * 3600)
def sparse(max_image_size: int = 3200, sequential_overlap: int = 20):
    """Feature extraction (GPU SIFT) -> spatial+sequential matching -> mapper."""
    import os, glob, sqlite3
    os.makedirs(WORK, exist_ok=True)
    db = f"{WORK}/database.db"
    n = len(glob.glob(f"{IMAGES}/**/*.JPG", recursive=True)) + len(glob.glob(f"{IMAGES}/**/*.jpg", recursive=True))
    print(f"images on volume: {n}", flush=True)
    if n < 10:
        raise SystemExit("volume has no images — run modal volume put first")

    _run(
        f"colmap feature_extractor --database_path {db} --image_path {IMAGES} "
        f"--ImageReader.single_camera_per_folder 1 "
        f"--FeatureExtraction.max_image_size {max_image_size}"
    )
    vol.commit()
    # spatial matcher uses GPS priors read from EXIF at extraction time
    _run(
        f"colmap spatial_matcher --database_path {db} "
        f"--FeatureMatching.guided_matching 1"
    )
    # belt-and-suspenders for serpentine capture order
    _run(
        f"colmap sequential_matcher --database_path {db} "
        f"--SequentialMatching.overlap {sequential_overlap} "
        f"--FeatureMatching.guided_matching 1"
    )
    vol.commit()
    con = sqlite3.connect(db)
    pairs = con.execute("select count(*) from two_view_geometries where rows > 15").fetchone()[0]
    print(f"verified pairs: {pairs}", flush=True)

    os.makedirs(f"{WORK}/sparse", exist_ok=True)
    _run(
        f"colmap mapper --database_path {db} --image_path {IMAGES} "
        f"--output_path {WORK}/sparse --Mapper.ba_use_gpu 1"
    )
    # report registration
    for model in sorted(glob.glob(f"{WORK}/sparse/*")):
        _run(f"colmap model_analyzer --path {model}")
    vol.commit()
    return "sparse complete"


@app.function(gpu="A10G", image=image, volumes={"/data": vol}, timeout=8 * 3600)
def register_max(model: str = "0_aligned"):
    """Register the 251 pre-dawn MAX visible frames (/images/MAX_102) into the
    existing aligned daytime model — full 6-DoF poses for the thermal rig.
    Local windowed SIFT vs the ortho topped out at median 7 inliers
    (pre-dawn vs daylight); COLMAP's guided matching against many model views
    is the robust path. Output: sparse/{model}_max (BIN + TXT + poses report).
    """
    import glob
    import os

    db = f"{WORK}/database.db"
    n = len(glob.glob(f"{IMAGES}/MAX_102/*.JPG"))
    print(f"MAX frames on volume: {n}", flush=True)
    if n < 10:
        raise SystemExit("upload MAX_102 first")
    # extractor skips images already in the DB; adds only the new folder
    _run(
        f"colmap feature_extractor --database_path {db} --image_path {IMAGES} "
        f"--ImageReader.single_camera_per_folder 1 "
        f"--FeatureExtraction.max_image_size 3200"
    )
    vol.commit()
    _run(
        f"colmap spatial_matcher --database_path {db} "
        f"--FeatureMatching.guided_matching 1"
    )
    vol.commit()
    src = f"{WORK}/sparse/{model}"
    dst = f"{WORK}/sparse/{model}_max"
    os.makedirs(dst, exist_ok=True)
    _run(
        f"colmap image_registrator --database_path {db} "
        f"--input_path {src} --output_path {dst}"
    )
    _run(f"colmap model_analyzer --path {dst}")
    _run(f"colmap model_converter --input_path {dst} --output_path {dst} "
         f"--output_type TXT")
    # count how many MAX frames made it in
    with open(f"{dst}/images.txt", encoding="utf-8", errors="ignore") as f:
        got = sum(1 for line in f if "MAX_102/" in line)
    print(f"registered MAX frames: {got}/{n}", flush=True)
    vol.commit()
    return f"register_max complete: {got}/{n}"


@app.function(gpu="A10G", image=image, volumes={"/data": vol}, timeout=10 * 3600)
def mapper_only():
    """Rerun ONLY the mapper on an already-committed database (crash recovery)."""
    import os, glob
    os.makedirs(f"{WORK}/sparse", exist_ok=True)
    _run(
        f"colmap mapper --database_path {WORK}/database.db --image_path {IMAGES} "
        f"--output_path {WORK}/sparse --Mapper.ba_use_gpu 1"
    )
    vol.commit()
    for model in sorted(glob.glob(f"{WORK}/sparse/*")):
        _run(f"colmap model_analyzer --path {model}")
    vol.commit()
    return "mapper complete"


@app.function(image=image, volumes={"/data": vol}, timeout=1800)
def align(model: str = "0", max_error: float = 3.0):
    """LOAD-BEARING STEP (multi-AI consensus): georegister the sparse model to
    metric ENU at the THERMAL MOSAIC ORIGIN before any dense/ortho/splat work.
    Refs are pre-converted ENU meters (gps_refs_enu.txt) -> ref_is_gps 0 +
    alignment_type custom, so COLMAP XY == thermal-mosaic XY by construction."""
    import os
    src = f"{WORK}/sparse/{model}"
    dst = f"{WORK}/sparse/{model}_aligned"
    os.makedirs(dst, exist_ok=True)
    _run(
        f"colmap model_aligner --input_path {src} --output_path {dst} "
        f"--ref_images_path /data/gps_refs_enu.txt --ref_is_gps 0 "
        f"--alignment_type custom --alignment_max_error {max_error} "
        f"--transform_path {WORK}/align_transform.txt"
    )
    _run(f"colmap model_analyzer --path {dst}")
    # validation (external-review): transform scale sane, rotation det=+1 (no
    # mirror), camera centers vs refs residuals
    import numpy as np
    tf = f"{WORK}/align_transform.txt"
    if os.path.exists(tf):
        vals = np.loadtxt(tf).ravel()
        print(f"ALIGN VALIDATION: transform values = {vals.tolist()}", flush=True)
        if vals.size == 16:
            R = vals.reshape(4, 4)[:3, :3]
            print(f"ALIGN VALIDATION: scale={float(np.cbrt(abs(np.linalg.det(R)))):.4f} "
                  f"(sane 0.3-3.0), det sign={'+' if np.linalg.det(R) > 0 else '-'}", flush=True)
    _run(f"colmap model_converter --input_path {dst} --output_path {dst} --output_type TXT")
    refs = {l.split()[0]: np.array(list(map(float, l.split()[1:4])))
            for l in open("/data/gps_refs_enu.txt")}
    res = []
    for line in open(f"{dst}/images.txt"):
        if line.startswith("#") or len(line.split()) < 10:
            continue
        parts = line.split()
        name = parts[9]
        if name in refs:
            import numpy as np
            qw, qx, qy, qz = map(float, parts[1:5]); t = np.array(list(map(float, parts[5:8])))
            Rm = np.array([[1-2*(qy*qy+qz*qz), 2*(qx*qy-qz*qw), 2*(qx*qz+qy*qw)],
                           [2*(qx*qy+qz*qw), 1-2*(qx*qx+qz*qz), 2*(qy*qz-qx*qw)],
                           [2*(qx*qz-qy*qw), 2*(qy*qz+qx*qw), 1-2*(qx*qx+qy*qy)]])
            C = -Rm.T @ t
            res.append(float(np.linalg.norm(C[:2] - refs[name][:2])))
    if res:
        import numpy as np
        print(f"ALIGN VALIDATION: {len(res)} cameras matched to refs; horizontal "
              f"residual median {np.median(res):.2f} m, p90 {np.percentile(res, 90):.2f} m "
              f"(consumer GPS: 1-3 m normal)", flush=True)
    vol.commit()
    return "aligned"


@app.function(gpu="A10G", image=image, volumes={"/data": vol}, timeout=12 * 3600)
def dense(max_image_size: int = 1600, model: str = "0_aligned"):
    """PatchMatch stereo + fusion on the ALIGNED sparse model -> fused.ply.
    1600px (consensus speed/quality point); cache_size forces disk paging
    instead of OOM (external-review recommendation for 917 imgs on 24GB)."""
    import os
    dense_dir = f"{WORK}/dense"
    os.makedirs(dense_dir, exist_ok=True)
    _run(
        f"colmap image_undistorter --image_path {IMAGES} "
        f"--input_path {WORK}/sparse/{model} --output_path {dense_dir} "
        f"--output_type COLMAP --max_image_size {max_image_size}"
    )
    _run(
        f"colmap patch_match_stereo --workspace_path {dense_dir} "
        f"--workspace_format COLMAP --PatchMatchStereo.geom_consistency true "
        f"--PatchMatchStereo.cache_size 16"
    )
    _run(
        f"colmap stereo_fusion --workspace_path {dense_dir} "
        f"--workspace_format COLMAP --input_type geometric "
        f"--StereoFusion.cache_size 16 "
        f"--output_path {dense_dir}/fused.ply"
    )
    vol.commit()
    return "dense complete"


@app.function(image=image, volumes={"/data": vol}, timeout=6 * 3600,
              memory=49152, cpu=8)
def ortho_hires(gsd_m: float = 0.02):
    """TRUE orthophoto (DroneDeploy/Pix4D-class): every output pixel sampled
    from the best-viewing ORIGINAL photo through the DEM (nadir-dominant
    winner-take-all, no feather — round-4 external consensus). Replaces the
    point-splat ortho for presentation. Same projection engine the thermal
    pass reuses (exact overlay alignment by construction)."""
    import os

    import cv2
    import numpy as np

    dem_z = np.load(f"{WORK}/ortho/dem.npz")
    DEM = dem_z["dem"].astype(np.float32)
    DX0, DY1 = [float(v) for v in dem_z["origin"]]
    DG = float(dem_z["gsd_m"])
    DH, DW = DEM.shape

    # output grid covers the same extent at gsd_m
    OW = int(DW * DG / gsd_m)
    OH = int(DH * DG / gsd_m)
    print(f"output {OW}x{OH} @ {gsd_m*100:.0f}mm", flush=True)
    xs = DX0 + (np.arange(OW, dtype=np.float32) + 0.5) * gsd_m
    ys = DY1 - (np.arange(OH, dtype=np.float32) + 0.5) * gsd_m

    # parse TXT model (aligned + MAX registered)
    sparse = f"{WORK}/sparse/0_aligned_max"
    cams = {}
    for line in open(f"{sparse}/cameras.txt"):
        if line.startswith("#"):
            continue
        p = line.split()
        cams[int(p[0])] = {"model": p[1], "w": int(p[2]), "h": int(p[3]),
                           "params": [float(v) for v in p[4:]]}
    views = []
    lines = [l for l in open(f"{sparse}/images.txt") if not l.startswith("#")]
    for i in range(0, len(lines), 2):
        p = lines[i].split()
        if len(p) < 10:
            continue
        name = p[9]
        if name.startswith("MAX_102/"):
            continue  # RGB ortho: daylight mapping photos only
        q = np.array([float(v) for v in p[1:5]])
        t = np.array([float(v) for v in p[5:8]], np.float32)
        w, x, y, z = q
        R = np.array([
            [1-2*(y*y+z*z), 2*(x*y-w*z), 2*(x*z+w*y)],
            [2*(x*y+w*z), 1-2*(x*x+z*z), 2*(y*z-w*x)],
            [2*(x*z-w*y), 2*(y*z+w*x), 1-2*(x*x+y*y)]], np.float32)
        views.append({"R": R, "t": t, "cam": int(p[8]), "name": name,
                      "C": (-R.T @ t)})
    print(f"{len(views)} RGB views", flush=True)

    best = np.zeros((OH, OW), np.float32)
    out = np.zeros((OH, OW, 3), np.uint8)
    ground_z = float(np.nanmedian(DEM))

    # PASS 1 — per-image gain compensation (round-5 consensus): median
    # luminance of each photo's central region; normalize to the global
    # median before compositing. Kills the exposure quilt from the
    # pre-dawn->sunrise brightness drift across the mission.
    meds = np.zeros(len(views), np.float32)
    for vi, v in enumerate(views):
        img = cv2.imread(f"{IMAGES}/{v['name']}", cv2.IMREAD_GRAYSCALE)
        if img is None:
            continue
        h2, w2 = img.shape
        meds[vi] = np.median(img[h2//4:3*h2//4:8, w2//4:3*w2//4:8])
    target = float(np.median(meds[meds > 0]))
    gains = np.where(meds > 0, np.clip(target / np.maximum(meds, 1), 0.6, 1.7),
                     1.0)
    print(f"gain-comp: target {target:.0f}, gains {gains.min():.2f}.."
          f"{gains.max():.2f}", flush=True)

    for vi, v in enumerate(views):
        c = cams[v["cam"]]
        f, cx, cy, k = c["params"][:4]  # SIMPLE_RADIAL
        R, t, C = v["R"], v["t"], v["C"]
        # footprint bbox: corner rays onto the median ground plane
        corners = np.array([[0, 0], [c["w"], 0], [0, c["h"]], [c["w"], c["h"]]],
                           np.float32)
        xn = (corners[:, 0] - cx) / f
        yn = (corners[:, 1] - cy) / f
        dirs = (R.T @ np.stack([xn, yn, np.ones(4, np.float32)])).T
        s = (ground_z - C[2]) / dirs[:, 2]
        gx = C[0] + s * dirs[:, 0]
        gy = C[1] + s * dirs[:, 1]
        M = 8.0
        ca = np.clip(((min(gx.min(), C[0]) - M - DX0) / gsd_m), 0, OW-1).astype(int)
        cb = np.clip(((max(gx.max(), C[0]) + M - DX0) / gsd_m), 0, OW-1).astype(int)
        ra = np.clip(((DY1 - max(gy.max(), C[1]) - M) / gsd_m), 0, OH-1).astype(int)
        rb = np.clip(((DY1 - (min(gy.min(), C[1]) - M)) / gsd_m), 0, OH-1).astype(int)
        if cb - ca < 2 or rb - ra < 2:
            continue
        img = cv2.imread(f"{IMAGES}/{v['name']}")
        if img is None:
            continue
        X, Y = np.meshgrid(xs[ca:cb], ys[ra:rb])
        dc = np.clip(((X - DX0) / DG).astype(np.int32), 0, DW-1)
        dr = np.clip(((DY1 - Y) / DG).astype(np.int32), 0, DH-1)
        Z = DEM[dr, dc]
        P = np.stack([X.ravel(), Y.ravel(),
                      np.nan_to_num(Z, nan=ground_z).ravel()])
        Xc = R @ P + t[:, None]
        zc = Xc[2]
        front = zc > 1.0
        xn2 = Xc[0] / np.maximum(zc, 1e-6)
        yn2 = Xc[1] / np.maximum(zc, 1e-6)
        r2 = xn2*xn2 + yn2*yn2
        d = 1.0 + k * r2
        u = f * xn2 * d + cx
        vv = f * yn2 * d + cy
        inb = front & (u >= 0) & (u < c["w"]-1) & (vv >= 0) & (vv < c["h"]-1)
        # score: nadirness^2 * center weight
        dx = P[0] - C[0]; dy = P[1] - C[1]; dz = P[2] - C[2]
        dist = np.sqrt(dx*dx + dy*dy + dz*dz) + 1e-6
        nad = np.clip(-dz / dist, 0, 1) ** 2
        ctr = np.clip(1.0 - 0.5*(((u-cx)/cx)**2 + ((vv-cy)/cy)**2), 0.05, 1)
        sc = np.where(inb, nad * ctr, 0).astype(np.float32).reshape(X.shape)
        cur = best[ra:rb, ca:cb]
        win = sc > cur
        if not win.any():
            continue
        ui = np.clip(u.astype(np.int32), 0, c["w"]-1).reshape(X.shape)
        vi2 = np.clip(vv.astype(np.int32), 0, c["h"]-1).reshape(X.shape)
        colors = np.clip(img[vi2[win], ui[win]].astype(np.float32)
                         * gains[vi], 0, 255).astype(np.uint8)
        blk = out[ra:rb, ca:cb]
        blk[win] = colors
        out[ra:rb, ca:cb] = blk
        cur[win] = sc[win]
        best[ra:rb, ca:cb] = cur
        if vi % 50 == 0:
            print(f"[{vi}/{len(views)}] {v['name']} filled "
                  f"{100.0*(best > 0).mean():.1f}%", flush=True)

    os.makedirs(f"{WORK}/ortho_hires", exist_ok=True)
    cv2.imwrite(f"{WORK}/ortho_hires/orthomosaic.jpg", out,
                [cv2.IMWRITE_JPEG_QUALITY, 92])
    np.savez_compressed(f"{WORK}/ortho_hires/meta.npz",
                        origin=[DX0, DY1], gsd_m=gsd_m,
                        coverage=float((best > 0).mean()))
    vol.commit()
    return f"ortho_hires complete: {OW}x{OH}, cover {(best>0).mean()*100:.1f}%"


def _read_colmap_bin(sparse_dir):
    """Minimal COLMAP BIN readers (cameras/images/points3D) — no pycolmap
    dependency, no API drift. Returns (cams, views, xyz, rgb)."""
    import struct

    import numpy as np

    def read(f, fmt):
        return struct.unpack(fmt, f.read(struct.calcsize(fmt)))

    cams = {}
    with open(f"{sparse_dir}/cameras.bin", "rb") as f:
        (n,) = read(f, "<Q")
        for _ in range(n):
            cid, model, w, h = read(f, "<iiQQ")
            n_params = {0: 3, 1: 4, 2: 4, 3: 5, 4: 8, 5: 8, 6: 12}[model]
            params = read(f, "<" + "d" * n_params)
            cams[cid] = {"model": model, "w": int(w), "h": int(h),
                         "params": params}
    views = []
    with open(f"{sparse_dir}/images.bin", "rb") as f:
        (n,) = read(f, "<Q")
        for _ in range(n):
            _iid, qw, qx, qy, qz, tx, ty, tz, cid = read(f, "<idddddddi")
            name = b""
            while True:
                c = f.read(1)
                if c == b"\x00":
                    break
                name += c
            (n2d,) = read(f, "<Q")
            f.seek(24 * n2d, 1)
            views.append({"q": (qw, qx, qy, qz), "t": (tx, ty, tz),
                          "cam": cid, "name": name.decode()})
    pts, cols = [], []
    with open(f"{sparse_dir}/points3D.bin", "rb") as f:
        (n,) = read(f, "<Q")
        for _ in range(n):
            _pid, x, y, z, r, g, b, _err = read(f, "<QdddBBBd")
            (tl,) = read(f, "<Q")
            f.seek(8 * tl, 1)
            pts.append((x, y, z))
            cols.append((r, g, b))
    return cams, views, np.array(pts, np.float32), np.array(cols, np.float32)


@app.function(gpu="A10G", image=splat_image, volumes={"/data": vol},
              timeout=12 * 3600)
def splat(iters: int = 30000, sh_degree: int = 2, init_cap: int = 1200000):
    """Custom gsplat 3DGS training on the dense workspace (undistorted PINHOLE
    cameras + 1600px images). NO pose normalization — the splat stays in the
    metric ENU frame shared with ortho/DEM/thermal. Exports 3DGS-format
    {WORK}/splat/scene.ply."""
    import math
    import os
    import random

    import cv2
    import numpy as np
    import torch
    import torch.nn.functional as F
    from gsplat import rasterization
    from gsplat.strategy import DefaultStrategy

    dev = "cuda"
    sparse_dir = f"{WORK}/dense/sparse"
    img_dir = f"{WORK}/dense/images"
    cams, views, xyz, rgb = _read_colmap_bin(sparse_dir)
    print(f"{len(views)} views, {len(xyz)} init points", flush=True)

    def qvec2rot(q):
        w, x, y, z = q
        return np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
            [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
            [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
        ], np.float32)

    viewmats, Ks, paths, sizes, centers = [], [], [], [], []
    for v in views:
        c = cams[v["cam"]]
        fx, fy, cx, cy = c["params"][:4]  # PINHOLE from image_undistorter
        R = qvec2rot(v["q"])
        t = np.array(v["t"], np.float32)
        M = np.eye(4, dtype=np.float32)
        M[:3, :3] = R
        M[:3, 3] = t
        viewmats.append(M)
        Ks.append(np.array([[fx, 0, cx], [0, fy, cy], [0, 0, 1]], np.float32))
        paths.append(os.path.join(img_dir, v["name"]))
        sizes.append((c["w"], c["h"]))
        centers.append(-R.T @ t)
    centers = np.stack(centers)
    scene_scale = float(np.median(np.linalg.norm(
        centers - centers.mean(0), axis=1))) * 1.1
    print(f"scene scale {scene_scale:.1f} m", flush=True)

    if len(xyz) > init_cap:
        sel = np.random.default_rng(0).choice(len(xyz), init_cap, replace=False)
        xyz, rgb = xyz[sel], rgb[sel]
    N = len(xyz)
    means = torch.tensor(xyz, device=dev)
    # init scale = log(mean 3-NN distance) approximated by local density
    d2 = torch.cdist(means[:4096], means[:4096])
    d2.fill_diagonal_(1e9)
    est = d2.topk(3, largest=False).values.mean().item()
    scales = torch.log(torch.full((N, 3), max(est, 0.02), device=dev))
    quats = torch.zeros((N, 4), device=dev)
    quats[:, 0] = 1
    opac = torch.logit(torch.full((N,), 0.1, device=dev))
    sh0 = ((torch.tensor(rgb, device=dev) / 255.0 - 0.5) / 0.28209).unsqueeze(1)
    shN = torch.zeros((N, (sh_degree + 1) ** 2 - 1, 3), device=dev)

    params = torch.nn.ParameterDict({
        "means": torch.nn.Parameter(means),
        "scales": torch.nn.Parameter(scales),
        "quats": torch.nn.Parameter(quats),
        "opacities": torch.nn.Parameter(opac),
        "sh0": torch.nn.Parameter(sh0),
        "shN": torch.nn.Parameter(shN),
    }).to(dev)
    lrs = {"means": 1.6e-4 * scene_scale, "scales": 5e-3, "quats": 1e-3,
           "opacities": 5e-2, "sh0": 2.5e-3, "shN": 2.5e-3 / 20}
    opts = {k: torch.optim.Adam([params[k]], lr=lrs[k], eps=1e-15)
            for k in params}
    strategy = DefaultStrategy(verbose=False)
    strategy.check_sanity(params, opts)
    state = strategy.initialize_state(scene_scale=scene_scale)

    def ssim(a, b):  # dependency-free SSIM (11x11 gaussian window)
        g = torch.tensor(cv2.getGaussianKernel(11, 1.5), dtype=torch.float32,
                         device=dev).float()
        win = (g @ g.T).expand(3, 1, 11, 11)
        mu1 = F.conv2d(a, win, padding=5, groups=3)
        mu2 = F.conv2d(b, win, padding=5, groups=3)
        s1 = F.conv2d(a * a, win, padding=5, groups=3) - mu1 ** 2
        s2 = F.conv2d(b * b, win, padding=5, groups=3) - mu2 ** 2
        s12 = F.conv2d(a * b, win, padding=5, groups=3) - mu1 * mu2
        c1, c2 = 0.01 ** 2, 0.03 ** 2
        return (((2 * mu1 * mu2 + c1) * (2 * s12 + c2))
                / ((mu1 ** 2 + mu2 ** 2 + c1) * (s1 + s2 + c2))).mean()

    order = list(range(len(views)))
    random.seed(0)
    for step in range(iters):
        i = order[step % len(order)]
        if step % len(order) == 0:
            random.shuffle(order)
        img = cv2.imread(paths[i])
        if img is None:
            continue
        gt = torch.tensor(img[:, :, ::-1].copy(), dtype=torch.float32,
                          device=dev) / 255.0
        H_, W_ = gt.shape[:2]
        vm = torch.tensor(viewmats[i], device=dev)[None]
        K = torch.tensor(Ks[i], device=dev)[None]
        deg = min(step // 2000, sh_degree)
        colors = torch.cat([params["sh0"], params["shN"]], 1)
        render, _alpha, info = rasterization(
            params["means"], params["quats"] / params["quats"].norm(
                dim=-1, keepdim=True),
            torch.exp(params["scales"]), torch.sigmoid(params["opacities"]),
            colors, vm, K, W_, H_, sh_degree=deg, packed=False,
            absgrad=True)
        strategy.step_pre_backward(params, opts, state, step, info)
        pred = render[0].clamp(0, 1)
        l1 = (pred - gt).abs().mean()
        loss = 0.8 * l1 + 0.2 * (1 - ssim(
            pred.permute(2, 0, 1)[None], gt.permute(2, 0, 1)[None]))
        loss.backward()
        strategy.step_post_backward(params, opts, state, step, info,
                                    packed=False)
        for o in opts.values():
            o.step()
            o.zero_grad(set_to_none=True)
        if step % 500 == 0:
            print(f"[{step}/{iters}] loss {loss.item():.4f} "
                  f"gaussians {len(params['means'])}", flush=True)
        if step % 5000 == 4999:
            vol.commit()

    # export 3DGS-format PLY
    os.makedirs(f"{WORK}/splat", exist_ok=True)
    with torch.no_grad():
        m = params["means"].cpu().numpy()
        s = params["scales"].cpu().numpy()
        q = params["quats"].cpu().numpy()
        o = params["opacities"].cpu().numpy()
        c0 = params["sh0"].cpu().numpy().reshape(len(m), -1)
        cN = params["shN"].cpu().numpy().transpose(0, 2, 1).reshape(len(m), -1)
    n = len(m)
    props = (["x", "y", "z", "nx", "ny", "nz"]
             + [f"f_dc_{i}" for i in range(3)]
             + [f"f_rest_{i}" for i in range(cN.shape[1])]
             + ["opacity"] + [f"scale_{i}" for i in range(3)]
             + [f"rot_{i}" for i in range(4)])
    header = ("ply\nformat binary_little_endian 1.0\n"
              f"element vertex {n}\n"
              + "".join(f"property float {p}\n" for p in props)
              + "end_header\n")
    data = np.hstack([m, np.zeros((n, 3), np.float32), c0, cN,
                      o[:, None], s, q]).astype(np.float32)
    with open(f"{WORK}/splat/scene.ply", "wb") as f:
        f.write(header.encode())
        f.write(data.tobytes())
    vol.commit()
    print(f"exported {n} gaussians -> {WORK}/splat/scene.ply", flush=True)
    return f"splat complete: {n} gaussians"


@app.function(image=image, volumes={"/data": vol}, timeout=4 * 3600, memory=32768)
def ortho(gsd_m: float = 0.03):
    """Rasterize the fused point cloud top-down -> RGB orthomosaic + DEM (npz)."""
    import numpy as np, struct, os

    ply = f"{WORK}/dense/fused.ply"
    # minimal binary_little_endian PLY reader (x,y,z,nx,ny,nz,r,g,b layout from COLMAP)
    with open(ply, "rb") as f:
        n_vertex, props, line = 0, [], b""
        while line.strip() != b"end_header":
            line = f.readline()
            if line.startswith(b"element vertex"):
                n_vertex = int(line.split()[-1])
            elif line.startswith(b"property"):
                props.append(line.split()[-1].decode())
        rec = f.read()
    # COLMAP fused.ply: float x,y,z,nx,ny,nz + uchar r,g,b = 27 bytes
    itemsize = 27
    pts = np.frombuffer(rec[: n_vertex * itemsize], dtype=np.uint8).reshape(n_vertex, itemsize)
    xyz = pts[:, :12].copy().view(np.float32).reshape(n_vertex, 3)
    rgb = pts[:, 24:27].copy()
    print(f"points: {n_vertex:,}", flush=True)

    x, y, z = xyz[:, 0], xyz[:, 1], xyz[:, 2]
    x0, x1 = np.percentile(x, [0.5, 99.5]); y0, y1 = np.percentile(y, [0.5, 99.5])
    keep = (x >= x0) & (x <= x1) & (y >= y0) & (y <= y1)
    x, y, z, rgb = x[keep], y[keep], z[keep], rgb[keep]
    W = int((x1 - x0) / gsd_m); H = int((y1 - y0) / gsd_m)
    print(f"canvas {W}x{H} @ {gsd_m*100:.0f}cm", flush=True)
    cx = np.clip(((x - x0) / gsd_m).astype(np.int32), 0, W - 1)
    cy = np.clip(((y1 - y) / gsd_m).astype(np.int32), 0, H - 1)
    flat = cy.astype(np.int64) * W + cx

    # QUALITY PASS (review consensus): per cell take the median of the TOP-N
    # highest points (rejects outliers + noise; single-winner z-buffer was the
    # source of the sparse/dark render). Vectorized via lexsort groups.
    import cv2
    order = np.lexsort((-z, flat))          # group by cell, z descending
    fs, zs, rs = flat[order], z[order], rgb[order]
    grp_start = np.flatnonzero(np.r_[True, fs[1:] != fs[:-1]])
    grp_end = np.r_[grp_start[1:], fs.size]
    TOPN = 5
    dem = np.full(W * H, np.nan, np.float32)
    img = np.zeros((W * H, 3), np.uint8)
    # median index within the top-N slice of each group
    take = grp_start + np.minimum((grp_end - grp_start), TOPN) // 2
    cells = fs[grp_start]
    dem[cells] = zs[take]
    img[cells] = rs[take]
    dem = dem.reshape(H, W); img = img.reshape(H, W, 3)

    # DEM: median filter (outlier spikes) then fill holes from nearest valid
    hole = ~np.isfinite(dem)
    dem_f = cv2.medianBlur(np.nan_to_num(dem, nan=0).astype(np.float32), 5)
    dem = np.where(hole, np.nan, dem_f)
    if hole.any():
        _, labels = cv2.distanceTransformWithLabels(
            hole.astype(np.uint8), cv2.DIST_L2, 5,
            labelType=cv2.DIST_LABEL_PIXEL)
        valid_idx = np.flatnonzero(~hole.ravel())
        # map label -> nearest valid pixel value
        lab_of_valid = labels.ravel()[valid_idx]
        fill_lut = np.zeros(labels.max() + 1, np.float32)
        fill_lut[lab_of_valid] = dem.ravel()[valid_idx]
        dem_filled = fill_lut[labels.ravel()].reshape(H, W)
        dem = np.where(hole, dem_filled, dem)

    # RGB fill: at 3cm GSD the cloud covers only ~15% of cells, so empty
    # pixels are a CONNECTED speckle sea — component-size inpaint can't see
    # them. Fill each empty cell from its nearest valid pixel (same LUT trick
    # as the DEM), capped at 12 px (~36 cm) so true no-coverage stays dark.
    if hole.any():
        dist, labels = cv2.distanceTransformWithLabels(
            hole.astype(np.uint8), cv2.DIST_L2, 5,
            labelType=cv2.DIST_LABEL_PIXEL)
        valid_idx = np.flatnonzero(~hole.ravel())
        lab_of_valid = labels.ravel()[valid_idx]
        rgb_lut = np.zeros((labels.max() + 1, 3), np.uint8)
        rgb_lut[lab_of_valid] = img.reshape(-1, 3)[valid_idx]
        filled = rgb_lut[labels.ravel()].reshape(H, W, 3)
        near = hole & (dist <= 12)
        img = np.where(near[..., None], filled, img)
        # light median to knock down splat noise without smearing edges
        img = cv2.medianBlur(img, 3)
    os.makedirs(f"{WORK}/ortho", exist_ok=True)
    cv2.imwrite(f"{WORK}/ortho/orthomosaic.jpg", img[:, :, ::-1], [cv2.IMWRITE_JPEG_QUALITY, 90])
    np.savez_compressed(f"{WORK}/ortho/dem.npz", dem=dem, gsd_m=gsd_m,
                        origin=[float(x0), float(y1)])
    vol.commit()
    return f"ortho complete: {W}x{H}"
