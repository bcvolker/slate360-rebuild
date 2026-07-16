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


def _run(cmd: str) -> None:
    import subprocess, sys
    print(f"$ {cmd}", flush=True)
    r = subprocess.run(cmd, shell=True)
    if r.returncode != 0:
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
        f"--SiftExtraction.use_gpu 1 --SiftExtraction.max_image_size {max_image_size}"
    )
    # spatial matcher uses GPS priors read from EXIF at extraction time
    _run(
        f"colmap spatial_matcher --database_path {db} "
        f"--SiftMatching.use_gpu 1 --SiftMatching.guided_matching 1"
    )
    # belt-and-suspenders for serpentine capture order
    _run(
        f"colmap sequential_matcher --database_path {db} "
        f"--SequentialMatching.overlap {sequential_overlap} "
        f"--SiftMatching.use_gpu 1 --SiftMatching.guided_matching 1"
    )
    con = sqlite3.connect(db)
    pairs = con.execute("select count(*) from two_view_geometries where rows > 15").fetchone()[0]
    print(f"verified pairs: {pairs}", flush=True)

    os.makedirs(f"{WORK}/sparse", exist_ok=True)
    _run(
        f"colmap mapper --database_path {db} --image_path {IMAGES} "
        f"--output_path {WORK}/sparse"
    )
    # report registration
    for model in sorted(glob.glob(f"{WORK}/sparse/*")):
        _run(f"colmap model_analyzer --path {model}")
    vol.commit()
    return "sparse complete"


@app.function(gpu="A10G", image=image, volumes={"/data": vol}, timeout=12 * 3600)
def dense(max_image_size: int = 1800, model: str = "0"):
    """PatchMatch stereo + fusion on the sparse model -> fused.ply."""
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
        f"--workspace_format COLMAP --PatchMatchStereo.geom_consistency true"
    )
    _run(
        f"colmap stereo_fusion --workspace_path {dense_dir} "
        f"--workspace_format COLMAP --input_type geometric "
        f"--output_path {dense_dir}/fused.ply"
    )
    vol.commit()
    return "dense complete"


@app.function(image=image, volumes={"/data": vol}, timeout=2 * 3600, memory=32768)
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
    # z-buffer: highest point wins per cell (top-down view)
    order = np.argsort(z)  # ascending; later (higher) overwrites
    dem = np.full(W * H, np.nan, np.float32)
    img = np.zeros((W * H, 3), np.uint8)
    dem[flat[order]] = z[order]
    img[flat[order]] = rgb[order]
    dem = dem.reshape(H, W); img = img.reshape(H, W, 3)

    import cv2
    os.makedirs(f"{WORK}/ortho", exist_ok=True)
    cv2.imwrite(f"{WORK}/ortho/orthomosaic.jpg", img[:, :, ::-1], [cv2.IMWRITE_JPEG_QUALITY, 90])
    np.savez_compressed(f"{WORK}/ortho/dem.npz", dem=dem, gsd_m=gsd_m,
                        origin=[float(x0), float(y1)])
    vol.commit()
    return f"ortho complete: {W}x{H}"
