"""Room 213 bounded FullCircle native-fisheye reference attempt (authorised 2026-09-22).

Runs the RELEASED FullCircle workflow (theialab/fullcircle @ 6d5afc16, Apache-2.0 -- a fork of
nv-tlabs/3dgrut) on our raw X4 physical-lens frames with minimal customisation:
  Phase 1  scripts/run_colmap.sh equivalent: COLMAP feature_extractor (OPENCV_FISHEYE, one shared
           camera per lens folder, masks) -> exhaustive_matcher -> mapper. Self-calibrated from our
           native images. NO H1 poses, NO factory Mei, NO rig constraint, NO perspective faces.
  Phase 2  quick native-image GO/NO-GO check on the resulting camera solution.
  Phase 3  ONE 3DGRT training run (configs/apps/colmap_3dgrt.yaml) after a throughput probe.

Deviations from the released scripts, deliberately minimal and recorded:
  * their run_colmap.sh calls a COLMAP 3.12 binary; we execute the identical three steps through
    pycolmap 4.2 (the same COLMAP library) to reuse our working image -- same camera model, same
    single-camera-per-folder mode, same exhaustive matcher, same default mapper options;
  * masking/ (ultralytics YOLOv8 = AGPL-3.0 + SAM) is NOT installed: we already have person masks.
    Only the idea of their mask_train.png fisheye-border mask is reproduced, from our own lens-circle fit.
"""
from __future__ import annotations

import json
import sys
import threading
from typing import Any

import modal

APP_NAME = "slate360-fullcircle"
FC_COMMIT = "6d5afc167b83f27aba99c869fd887f99e970987a"
app = modal.App(APP_NAME)
vol = modal.Volume.from_name("slate360-recon-experiments")

# Base: CUDA 12.8 devel on ubuntu 22.04 (jammy) -> default gcc 11, which install_env.sh requires.
# TORCH_CUDA_ARCH_LIST is left exactly as the released script sets it for CUDA 12.8.1
# ("7.5;8.0;8.6;9.0;10.0;12.0"); sm_86 cubins are binary-forward-compatible on the L40S (sm_89).
fc_image = (
    modal.Image.from_registry("nvidia/cuda:12.8.1-devel-ubuntu22.04", add_python=None)
    .apt_install("ca-certificates", "wget", "git", "curl", "build-essential", "gcc-11", "g++-11",
                 "libgl1-mesa-dev", "libglib2.0-0", "cmake", "ninja-build")
    .run_commands(
        "curl -fsSL -o /tmp/miniconda.sh https://repo.anaconda.com/miniconda/Miniconda3-py311_25.1.1-2-Linux-x86_64.sh"
        " && bash /tmp/miniconda.sh -b -p /opt/conda && rm /tmp/miniconda.sh",
        f"git clone --recursive https://github.com/theialab/fullcircle.git /workspace/fullcircle"
        f" && cd /workspace/fullcircle && git checkout {FC_COMMIT} && git submodule update --init --recursive",
    )
    .env({"PATH": "/opt/conda/bin:$PATH", "FORCE_CUDA": "1", "CUDA_VERSION": "12.8.1",
          "NVIDIA_DRIVER_CAPABILITIES": "compute,utility,graphics"})
    .run_commands(
        "cd /workspace/fullcircle && CUDA_VERSION=12.8.1 bash install_env.sh fullcircle 2>&1 | tail -40",
        gpu="L40S",   # the extension builds query torch.cuda during setup
    )
    # threedgrut/datasets/dataset_colmap.py imports `ncore.sensors` and `ncore.data`, but the released
    # setup.py declares install_requires=[] and install_env.sh never installs it (same gap upstream in
    # nv-tlabs/3dgrut). nvidia-ncore is NVIDIA's own Apache-2.0 package (github.com/NVIDIA/ncore).
    # `simplejpeg`/`scipy` are likewise imported (datasetNcore.py) but undeclared; threedgrut/datasets/__init__.py
    # imports every dataset module eagerly, so they are needed even though we only use ColmapDataset.
    .run_commands("/opt/conda/envs/fullcircle/bin/pip install nvidia-ncore simplejpeg scipy")
    # The pycolmap PyPI wheel is built WITHOUT CUDA/OpenGL SIFT ("Cannot use GPU feature extraction
    # without CUDA or OpenGL support"), so it cannot reproduce FullCircle's GPU feature extraction and
    # matching -- a real incompatibility. conda-forge ships the exact released major.minor with CUDA,
    # so we install COLMAP 3.12.6 (cuda_126) in its own env and run scripts/run_colmap.sh verbatim.
    .run_commands("conda create -n colmap312 -y -c conda-forge 'colmap=3.12.6=cuda*' && "
                  "/opt/conda/envs/colmap312/bin/colmap -h 2>&1 | head -3")
    .pip_install("pycolmap==4.2.0", "numpy<2", "opencv-python-headless<4.11")   # our Phase-1 driver only
)

PY = "/opt/conda/envs/fullcircle/bin/python"


@app.function(image=fc_image, gpu="L40S", timeout=30 * 60, volumes={"/vol": vol})
def fc_smoke() -> dict[str, Any]:
    """Prove the released stack builds and imports on our GPU before any data work."""
    import subprocess
    out: dict[str, Any] = {"commit": FC_COMMIT}
    r = subprocess.run([PY, "-c",
                        "import torch, sys; print(torch.__version__, torch.version.cuda, torch.cuda.is_available(),"
                        " torch.cuda.get_device_name(0), torch.cuda.get_arch_list())"],
                       capture_output=True, text=True, cwd="/workspace/fullcircle")
    out["torch"] = (r.stdout + r.stderr).strip()[-400:]
    r = subprocess.run([PY, "-c", "import threedgrut, threedgrt_tracer, threedgut_tracer; print('imports ok')"],
                       capture_output=True, text=True, cwd="/workspace/fullcircle")
    out["threedgrut_import"] = (r.stdout + r.stderr).strip()[-800:]
    r = subprocess.run([PY, "-c",
                        "from threedgrut.datasets.dataset_colmap import ColmapDataset; import inspect;"
                        " print([p for p in inspect.signature(ColmapDataset.__init__).parameters])"],
                       capture_output=True, text=True, cwd="/workspace/fullcircle")
    out["dataset_signature"] = (r.stdout + r.stderr).strip()[-600:]
    import pycolmap
    out["pycolmap"] = pycolmap.__version__
    return out


R213 = "/vol/room213/2026-09-21"
FC = f"{R213}/fullcircle"
DATA = f"{FC}/data/room213"
# lens-circle fits of the decoded 3840^2 streams (same constants the closed build used); 0.98 drops the vignette rim,
# mirroring FullCircle's fixed mask_train.png fisheye-border mask.
FRAME_CIRCLE = {0: (1870.9, 1855.5, 2101.2), 1: (1925.8, 1843.8, 2106.2)}
BORDER_FRAC = 0.98


def _status(**kw):
    from datetime import datetime, timezone
    p = f"{R213}/status.json"
    try:
        base = json.loads(open(p).read())
    except Exception:  # noqa: BLE001
        base = {}
    base.update({"timestamp_utc": datetime.now(timezone.utc).isoformat(), "phase": "fullcircle", **kw})
    open(p, "w").write(json.dumps(base, indent=1))


@app.function(image=fc_image, gpu="L40S", timeout=6 * 60 * 60, volumes={"/vol": vol})
def fc_stage_and_colmap(force: bool = False) -> dict[str, Any]:
    """Phase 1: stage the native frames into FullCircle's layout, then run its camera-estimation
    workflow via pycolmap 4.2 with every option pinned to COLMAP 3.12 values (see
    docs/ops/ROOM213_FULLCIRCLE_COLMAP_EQUIVALENCE_2026-09-22.md). No H1, no Mei, no rig, no faces."""
    import os
    import time
    import numpy as np
    import cv2
    import pycolmap
    from pathlib import Path

    t0 = time.time()
    demux = json.loads(open(f"{R213}/preflight/demux.json").read())
    splits = json.loads(open(f"{R213}/build/splits.json").read())
    hold = set(splits["appearance_holdout_exposures"])
    exposures = sorted({f"{d['video']}@{d['t']:.3f}" for d in demux}, key=lambda e: (e.split("@")[0], float(e.split("@")[1])))
    rank = {e: i for i, e in enumerate(exposures)}
    for sub in ("images/camera1", "images/camera2", "masks/camera1", "masks/camera2",
                "masks-colmap/camera1", "masks-colmap/camera2", "sparse"):
        Path(f"{DATA}/{sub}").mkdir(parents=True, exist_ok=True)
    _status(stage="fc_stage", n_exposures=len(exposures), n_frames=len(demux))
    # border masks (one per lens, reused for every frame of that lens)
    border = {}
    for lens, (cx, cy, r) in FRAME_CIRCLE.items():
        yy, xx = np.mgrid[0:3840, 0:3840]
        border[lens] = ((xx - cx) ** 2 + (yy - cy) ** 2 <= (r * BORDER_FRAC) ** 2).astype(np.uint8) * 255
    staged = {"train": 0, "test": 0}
    for d in demux:
        exp = f"{d['video']}@{d['t']:.3f}"; lens = d["lens"]; cam = f"camera{lens + 1}"
        name = f"frame_{rank[exp]:05d}" + ("_test" if exp in hold else "")
        staged["test" if exp in hold else "train"] += 1
        img_dst = Path(f"{DATA}/images/{cam}/{name}.png")
        if not img_dst.exists():
            os.symlink(f"{R213}/preflight/frames/{d['png']}", img_dst)
        mcol = Path(f"{DATA}/masks-colmap/{cam}/{name}.png.png")   # COLMAP appends .png to the image filename
        mtr = Path(f"{DATA}/masks/{cam}/{name}.png")
        if not mcol.exists() or not mtr.exists() or force:
            person = cv2.imread(f"{R213}/build/masks/{d['png'][:-4]}_mask.png", 0)   # 255 = keep, 0 = person
            if person is None:
                person = np.full((3840, 3840), 255, np.uint8)
            usable = cv2.bitwise_and(person, border[lens])                            # 0 = ignored by COLMAP
            cv2.imwrite(str(mcol), usable)
            cv2.imwrite(str(mtr), usable)
    vol.commit()
    _status(stage="fc_colmap_extract", staged=staged, elapsed_s=round(time.time() - t0))

    import subprocess
    COLMAP = "/opt/conda/envs/colmap312/bin/colmap"
    db = f"{DATA}/database.db"
    out: dict[str, Any] = {"staged": staged, "n_exposures": len(exposures), "held_out_exposures": sorted(hold),
                           "colmap": subprocess.run([COLMAP, "-h"], capture_output=True, text=True).stdout.split("\n")[0][:80]}
    if force and os.path.exists(db):
        os.remove(db)

    def run(tag: str, args: list[str]) -> float:
        t = time.time()
        r = subprocess.run([COLMAP] + args, capture_output=True, text=True)
        log = (r.stdout[-4000:] + "\n" + r.stderr[-4000:])
        open(f"{FC}/colmap_{tag}.log", "w").write(log)
        if r.returncode != 0:
            raise RuntimeError(f"colmap {tag} exited {r.returncode}: {log[-1500:]}")
        return round(time.time() - t)

    # ---- FullCircle scripts/run_colmap.sh, verbatim flags, COLMAP 3.12.6 defaults for everything else
    if not os.path.exists(db):
        out["extract_s"] = run("extract", [
            "feature_extractor",
            "--image_path", f"{DATA}/images",
            "--database_path", db,
            "--ImageReader.mask_path", f"{DATA}/masks-colmap",
            "--ImageReader.single_camera_per_folder", "1",
            "--ImageReader.camera_model", "OPENCV_FISHEYE"])
        vol.commit()
    import sqlite3
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    n_imgs = con.execute("select count(*) from images").fetchone()[0]
    n_pairs = con.execute("select count(*) from two_view_geometries where rows>0").fetchone()[0]
    con.close()
    out["n_images_in_db"] = n_imgs
    if n_pairs == 0:
        _status(stage="fc_colmap_match", n_images=n_imgs, expected_pairs=n_imgs * (n_imgs - 1) // 2)
        out["match_s"] = run("match", ["exhaustive_matcher", "--database_path", db])
        vol.commit()
    _status(stage="fc_colmap_map", n_images=n_imgs)
    Path(f"{DATA}/sparse").mkdir(parents=True, exist_ok=True)
    out["map_s"] = run("map", ["mapper", "--image_path", f"{DATA}/images", "--database_path", db,
                               "--output_path", f"{DATA}/sparse"])
    comps = sorted(p for p in Path(f"{DATA}/sparse").iterdir() if p.is_dir() and p.name.isdigit())
    out["n_components"] = len(comps)
    if comps:
        recs = {int(p.name): pycolmap.Reconstruction(str(p)) for p in comps}
        best_id = max(recs, key=lambda k: recs[k].num_reg_images())
        rec = recs[best_id]
        cams = {}
        for cid, c in rec.cameras.items():
            cams[str(cid)] = {"model": c.model_name if hasattr(c, "model_name") else str(c.model),
                              "w": c.width, "h": c.height, "params": [round(float(p), 4) for p in c.params]}
        per_cam: dict[str, int] = {}
        per_walk: dict[str, set] = {}
        for im in rec.images.values():
            per_cam[str(im.camera_id)] = per_cam.get(str(im.camera_id), 0) + 1
            r_ = int(Path(im.name).stem.replace("_test", "").split("_")[-1])
            walk = exposures[r_].split("_00_")[1].split(".insv")[0]
            per_walk.setdefault(walk, set()).add(r_)
        out["registered_exposures_per_walk"] = {w: len(v) for w, v in sorted(per_walk.items())}
        out["n_registered_exposures"] = len({r_ for v in per_walk.values() for r_ in v})
        out["both_walks_connected"] = len([w for w in per_walk if w in ("021", "075")]) == 2
        out.update({"best_component": int(best_id), "n_registered_images": rec.num_reg_images(),
                    "n_points": rec.num_points3D(), "mean_reproj_px": float(rec.compute_mean_reprojection_error()),
                    "mean_track_len": float(rec.compute_mean_track_length()),
                    "cameras": cams, "registered_per_camera": per_cam,
                    "component_sizes": {str(k): v.num_reg_images() for k, v in recs.items()}})
    json.dump(out, open(f"{FC}/phase1_colmap.json", "w"), indent=1)
    vol.commit()
    _status(stage="fc_colmap_done", **{k: out[k] for k in ("n_registered_images", "n_components") if k in out})
    return out


@app.local_entrypoint()
def main(phase: str = "smoke", force: bool = False):
    if phase == "smoke":
        print(json.dumps(fc_smoke.remote(), indent=1))
    elif phase == "colmap":
        print(json.dumps(fc_stage_and_colmap.remote(force), indent=1))
