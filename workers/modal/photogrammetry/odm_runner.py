"""ODM (OpenDroneMap) full pipeline on the 917 mapping photos — the
round-10 consensus benchmark/product path: professionally-finished
orthophoto (graph-cut seams + multiband blending built in) + DSM +
textured 3D mesh, one job.

Deploy:  PYTHONIOENCODING=utf-8 python -m modal deploy odm_runner.py
Run:     PYTHONIOENCODING=utf-8 python -m modal run --detach odm_runner.py::run_odm
Outputs: /work/odm/asu/odm_orthophoto/odm_orthophoto.tif,
         /work/odm/asu/odm_texturing/odm_textured_model_geo.glb (+obj),
         /work/odm/asu/odm_dem/dsm.tif
"""
from __future__ import annotations

import modal

app = modal.App("slate360-odm")
vol = modal.Volume.from_name("asu-rgb-flights")

image = modal.Image.from_registry("opendronemap/odm:3.5.4", add_python="3.11")


@app.function(image=image, volumes={"/data": vol}, timeout=23 * 3600,
              cpu=16, memory=98304)
def run_odm(ortho_cm: float = 1.0):
    import glob
    import os
    import shutil
    import subprocess
    import sys

    proj = "/data/work/odm/asu"
    imgdir = f"{proj}/images"
    if not os.path.isdir(imgdir) or len(os.listdir(imgdir)) < 900:
        os.makedirs(imgdir, exist_ok=True)
        srcs = sorted(glob.glob("/data/images/DJI_*/**/*.JPG", recursive=True))
        print(f"staging {len(srcs)} photos", flush=True)
        for p in srcs:
            dst = os.path.join(imgdir, os.path.basename(p))
            if not os.path.exists(dst):
                shutil.copy(p, dst)
        vol.commit()
    n = len(os.listdir(imgdir))
    print(f"images staged: {n}", flush=True)

    cmd = [
        "python3", "/code/run.py",
        "--project-path", "/data/work/odm", "asu",
        "--orthophoto-resolution", str(ortho_cm),
        "--dsm",
        "--dem-resolution", "2.0",
        "--mesh-size", "600000",
        "--mesh-octree-depth", "11",
        "--pc-quality", "high",
        "--feature-quality", "high",
        "--max-concurrency", "16",
        "--skip-report",
        "--gltf",
    ]
    print("$ " + " ".join(cmd), flush=True)
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, text=True)
    for line in p.stdout:
        sys.stdout.write(line)
        sys.stdout.flush()
    rc = p.wait()
    vol.commit()
    if rc != 0:
        raise SystemExit(f"ODM failed rc={rc}")
    for f in ["odm_orthophoto/odm_orthophoto.tif", "odm_dem/dsm.tif",
              "odm_texturing/odm_textured_model_geo.obj"]:
        path = f"{proj}/{f}"
        print(f, os.path.exists(path),
              os.path.getsize(path) // 1e6 if os.path.exists(path) else 0,
              "MB", flush=True)
    return "odm complete"
