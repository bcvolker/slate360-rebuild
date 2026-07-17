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
