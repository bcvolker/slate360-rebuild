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
    # MINIMAL WIRING FIX (proven defect, 2026-09-22): the trainer calls the PUBLIC hooks
    # post_backward / post_optimizer_step, but GSStrategy implements them as _post_backward /
    # _post_optimizer_step, so BaseStrategy's no-op stubs win and densify/prune/gradient-accumulation
    # are dead code (runtime-confirmed: 2000 calls to the public hooks, 0 to the underscored ones,
    # gradient buffer identically 0.0). MCMCStrategy names its hook correctly, which is why it works.
    # Two module-level aliases dispatch the existing implementations. No threshold, schedule,
    # clone/split logic, opacity reset, optimizer or SH setting is altered.
    .run_commands(
        "printf '\\n\\n# --- minimal wiring fix: dispatch the existing GSStrategy hooks (see fullcircle.py) ---\\n"
        "GSStrategy.post_backward = GSStrategy._post_backward\\n"
        "GSStrategy.post_optimizer_step = GSStrategy._post_optimizer_step\\n' "
        ">> /workspace/fullcircle/threedgrut/strategy/gs.py && "
        "tail -4 /workspace/fullcircle/threedgrut/strategy/gs.py && "
        "/opt/conda/envs/fullcircle/bin/python -c \""
        "import sys; sys.path.insert(0,'/workspace/fullcircle');"
        "from threedgrut.strategy.gs import GSStrategy as G;"
        "assert 'post_optimizer_step' in G.__dict__ and 'post_backward' in G.__dict__;"
        "print('WIRING FIX OK:', G.post_optimizer_step.__qualname__, G.post_backward.__qualname__)\"")
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


@app.function(image=fc_image, timeout=60 * 60, cpu=16.0, memory=32 * 1024, volumes={"/vol": vol})
def fc_validate() -> dict[str, Any]:
    """Phase 2: quick GO/NO-GO on the native camera solution. Read-only, no training.
    (a) leave-one-out reprojection on native fisheye frames through the self-calibrated cameras,
        stratified by lens / walk / image radius / cross-walk -- detects H1-scale coherent error;
    (b) physical plausibility: the known 32.26 mm inter-lens baseline is used ONLY as an external
        ruler (never as a constraint) to convert the arbitrary COLMAP scale into metres;
    (c) confirms nothing was won by discarding the room or a lens."""
    import numpy as np
    import pycolmap
    from pathlib import Path

    p1 = json.loads(open(f"{FC}/phase1_colmap.json").read())
    rec = pycolmap.Reconstruction(f"{DATA}/sparse/{p1['best_component']}")
    demux = json.loads(open(f"{R213}/preflight/demux.json").read())
    exposures = sorted({f"{d['video']}@{d['t']:.3f}" for d in demux}, key=lambda e: (e.split("@")[0], float(e.split("@")[1])))
    meta = {}
    for im in rec.images.values():
        stem = Path(im.name).stem; r_ = int(stem.replace("_test", "").split("_")[-1])
        meta[im.image_id] = {"rank": r_, "walk": exposures[r_].split("_00_")[1].split(".insv")[0],
                             "lens": 0 if im.name.startswith("camera1") else 1}
    cams = {im.image_id: rec.camera(im.camera_id) for im in rec.images.values()}
    pose = {im.image_id: (np.asarray(im.cam_from_world().rotation.matrix()), np.asarray(im.cam_from_world().translation))
            for im in rec.images.values()}
    centre = {i: -R.T @ t for i, (R, t) in pose.items()}
    out: dict[str, Any] = {}

    # ---- (b) external ruler: inter-lens distance per exposure, then metric scale
    by_rank: dict[int, dict[int, int]] = {}
    for iid, m in meta.items():
        by_rank.setdefault(m["rank"], {})[m["lens"]] = iid
    base = np.array([np.linalg.norm(centre[v[0]] - centre[v[1]]) for v in by_rank.values() if len(v) == 2])
    scale = 0.03226 / float(np.median(base))
    out["inter_lens_baseline_colmap_units"] = {"n_exposures": int(len(base)), "median": float(np.median(base)),
                                               "cv": float(base.std() / base.mean()),
                                               "p10_p90": [float(np.percentile(base, 10)), float(np.percentile(base, 90))]}
    out["metric_scale_m_per_unit_from_32.26mm"] = scale
    C = np.array([centre[i] for i in sorted(centre)]) * scale
    P = np.array([np.asarray(pt.xyz) for pt in rec.points3D.values()]) * scale
    lo, hi = np.percentile(P, 5, axis=0), np.percentile(P, 95, axis=0)
    out["trajectory_extent_m"] = (C.max(0) - C.min(0)).tolist()
    out["points_p5_p95_extent_m"] = (hi - lo).tolist()
    per_walk = {}
    for w in ("020", "021", "075"):
        cc = np.array([centre[i] * scale for i, m in meta.items() if m["walk"] == w])
        if len(cc): per_walk[w] = {"n_images": len(cc), "extent_m": (cc.max(0) - cc.min(0)).tolist(),
                                   "centroid_m": cc.mean(0).tolist()}
    out["per_walk"] = per_walk
    if "021" in per_walk and "075" in per_walk:
        out["walk_centroid_separation_m"] = float(np.linalg.norm(np.array(per_walk["021"]["centroid_m"]) - np.array(per_walk["075"]["centroid_m"])))

    # ---- (a) leave-one-out reprojection on native frames, 4+ distinct exposures per point
    rng = np.random.default_rng(213); tests = []
    pts = [(pid, pt) for pid, pt in rec.points3D.items() if pt.track.length() >= 5]
    rng.shuffle(pts)
    for pid, pt in pts[:4000]:
        obs = {}
        for el in pt.track.elements:
            m = meta.get(el.image_id)
            if m and m["rank"] not in obs:   # one observation per physical exposure
                obs[m["rank"]] = (el.image_id, np.asarray(rec.image(el.image_id).point2D(el.point2D_idx).xy))
        if len(obs) < 4: continue
        sel = list(obs.values())[:4]
        for k in range(4):
            fit = [sel[j] for j in range(4) if j != k]; held = sel[k]
            A = np.zeros((3, 3)); b = np.zeros(3)
            for iid, xy in fit:
                n = cams[iid].cam_from_img(xy.reshape(1, 2))[0]
                d = np.array([n[0], n[1], 1.0]); d /= np.linalg.norm(d)
                R, t = pose[iid]; dw = R.T @ d; c = centre[iid]
                M = np.eye(3) - np.outer(dw, dw); A += M; b += M @ c
            try:
                X = np.linalg.lstsq(A, b, rcond=None)[0]
            except np.linalg.LinAlgError:
                continue
            iid, xy = held; R, t = pose[iid]; Xc = R @ X + t
            if Xc[2] <= 1e-6: continue
            uv = cams[iid].img_from_cam(Xc.reshape(1, 3))[0]
            e = float(np.linalg.norm(uv - xy))
            m = meta[iid]
            tests.append({"err_px": e, "lens": m["lens"], "walk": m["walk"],
                          "radius": float(np.linalg.norm(xy - 1920.0)),
                          "cross_walk": m["walk"] not in {meta[i2]["walk"] for i2, _ in fit},
                          "depth_m": float(Xc[2] * scale)})
        if len(tests) > 12000: break

    def agg(ts):
        if not ts: return {"n": 0}
        e = np.array([t["err_px"] for t in ts])
        return {"n": int(len(e)), "median_px": float(np.median(e)), "p95_px": float(np.percentile(e, 95)),
                "p99_px": float(np.percentile(e, 99)), "frac_gt5px": float((e > 5).mean()), "frac_gt20px": float((e > 20).mean())}
    R_ = lambda a, b_: [t for t in tests if a <= t["radius"] < b_]
    out["loo_native"] = {
        "overall": agg(tests), "lens0": agg([t for t in tests if t["lens"] == 0]), "lens1": agg([t for t in tests if t["lens"] == 1]),
        "walk021": agg([t for t in tests if t["walk"] == "021"]), "walk075": agg([t for t in tests if t["walk"] == "075"]),
        "cross_walk": agg([t for t in tests if t["cross_walk"]]),
        "radius_0_800": agg(R_(0, 800)), "radius_800_1300": agg(R_(800, 1300)),
        "radius_1300_1700": agg(R_(1300, 1700)), "radius_1700_2100": agg(R_(1700, 2100)),
        "depth_lt2m": agg([t for t in tests if t["depth_m"] < 2]), "depth_2_5m": agg([t for t in tests if 2 <= t["depth_m"] < 5]),
        "note": "native 3840^2 fisheye pixels, self-calibrated OPENCV_FISHEYE cameras, triangulated from 3 distinct physical exposures and predicted into a 4th; SIFT coordinates (the H1 landmark test established these agree with independent measurements to ~1.7 px, so this detects H1-scale 5-18 px failures)"}
    out["coverage"] = {"registered_images": p1["n_registered_images"], "of": 242,
                       "registered_per_camera": p1["registered_per_camera"],
                       "registered_exposures_per_walk": p1["registered_exposures_per_walk"],
                       "nothing_discarded": p1["n_registered_images"] == 242}
    json.dump(out, open(f"{FC}/phase2_validation.json", "w"), indent=1)
    vol.commit()
    return out


@app.function(image=fc_image, gpu="L40S", timeout=2 * 60 * 60, cpu=16.0, memory=64 * 1024, volumes={"/vol": vol})
def fc_stage_train_inputs() -> dict[str, Any]:
    """Phase 3a: put the reconstruction and masks into the exact layout the FullCircle trainer expects.
    Three facts read out of the released code first (see the Phase 1/2 doc):
      * the loader reads `sparse/0`, but our best component is whichever the mapper numbered it;
      * training masks live at masks{_N}/masks-5{_N}/<cam>/<stem>_mask.png and are INVERTED relative to
        ours (trainer.py:530 keeps `1 - mask`), so person/rim must be 255;
      * .png inputs are never auto-downsampled, so images_N/ and masks_N/ must be pre-built."""
    import shutil
    import numpy as np
    import cv2
    from pathlib import Path

    p1 = json.loads(open(f"{FC}/phase1_colmap.json").read())
    best = p1["best_component"]
    out: dict[str, Any] = {"best_component_from_mapper": best}
    sp = Path(f"{DATA}/sparse")
    if best != 0:
        if (sp / "0").exists() and not (sp / "degenerate_0").exists():
            (sp / "0").rename(sp / "degenerate_0")
        if (sp / str(best)).exists():
            (sp / str(best)).rename(sp / "0")
        out["sparse_restructured"] = f"component {best} -> sparse/0; old sparse/0 -> sparse/degenerate_0"
    out["sparse0_files"] = sorted(p.name for p in (sp / "0").iterdir())

    # border mask: one file for both lenses, so the largest circle centred at the principal point (1920,1920)
    # that fits inside BOTH fitted lens circles, times 0.98
    r_common = min(FRAME_CIRCLE[l][2] - float(np.hypot(FRAME_CIRCLE[l][0] - 1920.0, FRAME_CIRCLE[l][1] - 1920.0))
                   for l in (0, 1))
    r_use = r_common * BORDER_FRAC
    yy, xx = np.mgrid[0:3840, 0:3840]
    bm = (((xx - 1920.0) ** 2 + (yy - 1920.0) ** 2) <= r_use ** 2).astype(np.uint8) * 255
    cv2.imwrite(f"{FC}/mask_border.png", bm)
    out["border_mask"] = {"centre": [1920, 1920], "radius_px": round(r_use, 1), "valid_frac": float((bm > 0).mean())}

    # training masks: INVERSE of the colmap masks (255 = capturer/rim = exclude)
    made = {"1": 0, "2": 0}
    for factor in (1, 2):
        sfx = "" if factor == 1 else f"_{factor}"
        for cam in ("camera1", "camera2"):
            src_dir = Path(f"{DATA}/masks-colmap/{cam}")
            dst_dir = Path(f"{DATA}/masks{sfx}/masks-5{sfx}/{cam}"); dst_dir.mkdir(parents=True, exist_ok=True)
            img_dst = Path(f"{DATA}/images{sfx}/{cam}")
            if factor > 1:
                img_dst.mkdir(parents=True, exist_ok=True)
            for src in sorted(src_dir.glob("*.png.png")):
                stem = src.name[:-8]                       # frame_00000.png.png -> frame_00000
                dst = dst_dir / f"{stem}_mask.png"
                if not dst.exists():
                    m = cv2.imread(str(src), 0)
                    inv = 255 - m                          # 255 where the trainer must EXCLUDE
                    if factor > 1:
                        inv = cv2.resize(inv, (3840 // factor, 3840 // factor), interpolation=cv2.INTER_NEAREST)
                    cv2.imwrite(str(dst), inv); made[str(factor)] += 1
                if factor > 1:
                    di = img_dst / f"{stem}.png"
                    if not di.exists():
                        im = cv2.imread(f"{DATA}/images/{cam}/{stem}.png")
                        cv2.imwrite(str(di), cv2.resize(im, (3840 // factor, 3840 // factor), interpolation=cv2.INTER_AREA))
    out["masks_written"] = made
    # sanity: the trainer keeps (1 - mask); confirm a known person pixel is now excluded
    chk = cv2.imread(sorted(Path(f"{DATA}/masks/masks-5/camera1").glob("*_mask.png"))[0].as_posix(), 0)
    out["train_mask_sanity"] = {"frac_excluded_255": float((chk > 127).mean()),
                                "note": "must be small-ish (person + rim); if it were ~0.9 the polarity is wrong"}
    vol.commit()
    return out


@app.function(image=fc_image, timeout=30 * 60, cpu=8.0, memory=32 * 1024, volumes={"/vol": vol})
def fc_verify_masks() -> dict[str, Any]:
    """Pre-launch visual verification: training-mask polarity per lens, border-mask overlay on native frames,
    and the actual train/holdout counts the loader will see."""
    import numpy as np
    import cv2
    from pathlib import Path

    masks_meta = json.loads(open(f"{R213}/build/masks.json").read())
    worst = {0: [], 1: []}
    for m in masks_meta:
        worst[m["lens"]].append((m["masked_frac"], m["png"]))
    for k in worst:
        worst[k].sort(reverse=True)
    demux = json.loads(open(f"{R213}/preflight/demux.json").read())
    exposures = sorted({f"{d['video']}@{d['t']:.3f}" for d in demux}, key=lambda e: (e.split("@")[0], float(e.split("@")[1])))
    rank = {e: i for i, e in enumerate(exposures)}
    png2name = {}
    hold = set(json.loads(open(f"{R213}/build/splits.json").read())["appearance_holdout_exposures"])
    for d in demux:
        exp = f"{d['video']}@{d['t']:.3f}"
        png2name[d["png"]] = (f"camera{d['lens'] + 1}", f"frame_{rank[exp]:05d}" + ("_test" if exp in hold else ""))
    bm = cv2.imread(f"{FC}/mask_border.png", 0)
    tiles = []
    picked = []
    for lens in (0, 1):
        for frac, png in worst[lens][:2] + worst[lens][len(worst[lens]) // 2:len(worst[lens]) // 2 + 1]:
            cam, name = png2name[png]
            img = cv2.imread(f"{DATA}/images/{cam}/{name}.png")
            tm = cv2.imread(f"{DATA}/masks/masks-5/{cam}/{name}_mask.png", 0)   # 255 = EXCLUDE
            if img is None or tm is None:
                continue
            ov = img.copy()
            ov[tm > 127] = (0.45 * ov[tm > 127] + 0.55 * np.array([0, 0, 255])).astype(np.uint8)  # red = excluded
            cv2.circle(ov, (1920, 1920), int(round(1979.7)), (0, 255, 0), 8)                       # border mask edge
            ov = cv2.resize(ov, (640, 640))
            cv2.putText(ov, f"L{lens} {cam} {name}", (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            cv2.putText(ov, f"person {frac*100:.1f}%  excluded(red) {100*(tm>127).mean():.1f}%", (8, 620),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            tiles.append(ov)
            picked.append({"lens": lens, "image": f"{cam}/{name}.png", "person_frac": round(frac, 4),
                           "excluded_frac": round(float((tm > 127).mean()), 4)})
    if tiles:
        while len(tiles) % 3:
            tiles.append(np.zeros_like(tiles[0]))
        cv2.imwrite(f"{FC}/mask_verification.png", np.vstack([np.hstack(tiles[i:i + 3]) for i in range(0, len(tiles), 3)]))
    n_train = len(list(Path(f"{DATA}/images/camera1").glob("*.png"))) + len(list(Path(f"{DATA}/images/camera2").glob("*.png")))
    n_test = len([p for p in Path(f"{DATA}/images/camera1").glob("*_test.png")]) + \
             len([p for p in Path(f"{DATA}/images/camera2").glob("*_test.png")])
    vol.commit()
    return {"samples": picked, "sheet": f"{FC}/mask_verification.png",
            "images_total": n_train, "holdout_images": n_test, "train_images": n_train - n_test,
            "holdout_exposures": len(hold), "border_mask_valid_frac": float((bm > 0).mean())}


@app.function(image=fc_image, gpu="L40S", timeout=2 * 60 * 60, cpu=16.0, memory=64 * 1024, volumes={"/vol": vol})
def fc_probe(iters: int = 150) -> dict[str, Any]:
    """Phase 3b: short throughput/memory probe to choose the training resolution (no full run)."""
    import subprocess
    import threading
    import time
    res: dict[str, Any] = {}
    for factor in (2, 1):
        peak = [0]
        stop = threading.Event()

        def poll():
            while not stop.wait(2):
                try:
                    r = subprocess.run(["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
                                       capture_output=True, text=True, timeout=10)
                    peak[0] = max(peak[0], int(r.stdout.strip().split("\n")[0]))
                except Exception:  # noqa: BLE001
                    pass
        threading.Thread(target=poll, daemon=True).start()
        t0 = time.time()
        cmd = [PY, "train.py", "--config-name", "apps/colmap_3dgrt.yaml",
               f"path={DATA}", f"out_dir=/tmp/probe{factor}", f"experiment_name=probe{factor}",
               f"dataset.downsample_factor={factor}", 'dataset.test_frame_suffix=_test',
               f"border_mask_train={FC}/mask_border.png", f"border_mask_test={FC}/mask_border.png",
               f"n_iterations={iters}", "test_last=false", "compute_extra_metrics=false", "num_workers=8"]
        r = subprocess.run(cmd, capture_output=True, text=True, cwd="/workspace/fullcircle")
        stop.set(); el = time.time() - t0
        open(f"{FC}/probe_{factor}.log", "w").write((r.stdout[-8000:] + "\n" + r.stderr[-8000:]))
        res[f"downsample_{factor}"] = {"resolution": 3840 // factor, "exit": r.returncode, "elapsed_s": round(el, 1),
                                       "iters": iters, "it_per_s": round(iters / el, 3) if r.returncode == 0 and el > 0 else None,
                                       "peak_gpu_mib": peak[0],
                                       "tail": (r.stdout[-700:] + r.stderr[-700:]) if r.returncode != 0 else (r.stdout[-400:])}
    vol.commit()
    json.dump(res, open(f"{FC}/probe.json", "w"), indent=1)
    return res


@app.function(image=fc_image, gpu="L40S", timeout=8 * 60 * 60, cpu=16.0, memory=64 * 1024, volumes={"/vol": vol})
def fc_train(downsample: int = 1, iterations: int = 30000) -> dict[str, Any]:
    """Phase 3c: THE single 3DGRT run. Released configs/apps/colmap_3dgrt.yaml, unchanged except our paths,
    masks, holdout split and the probe-chosen resolution."""
    import subprocess
    import threading
    import time
    run_dir = f"{FC}/runs"
    log_path = f"{FC}/train.log"
    cmd = [PY, "train.py", "--config-name", "apps/colmap_3dgrt.yaml",
           f"path={DATA}", f"out_dir={run_dir}", "experiment_name=room213_native",
           f"dataset.downsample_factor={downsample}", "dataset.test_frame_suffix=_test",
           f"border_mask_train={FC}/mask_border.png", f"border_mask_test={FC}/mask_border.png",
           f"n_iterations={iterations}",
           # resumable checkpoints: `checkpoint.iterations` is only read by save_checkpoint(), which
           # serialises state -- extending the list changes nothing about training itself.
           "checkpoint.iterations=[7000,15000,20000,25000,30000]"]
    json.dump({"cmd": cmd, "downsample": downsample, "iterations": iterations}, open(f"{FC}/train_cmd.json", "w"), indent=1)
    t0 = time.time(); stop = threading.Event(); peak = [0]

    def monitor():
        while not stop.wait(60):
            try:
                tail = open(log_path, errors="replace").read()[-3000:]
                # surface densification activity in the heartbeat so growth can be watched live
                stats = [l.strip()[-70:] for l in tail.splitlines() if "Cloned" in l or "Splitted" in l][-2:]
                _status(densify_recent=stats)
                r = subprocess.run(["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
                                   capture_output=True, text=True, timeout=10)
                peak[0] = max(peak[0], int(r.stdout.strip().split("\n")[0]))
                _status(stage="fc_train", elapsed_s=round(time.time() - t0), peak_gpu_mib=peak[0],
                        downsample=downsample, iterations=iterations, log_tail=tail[-400:])
                vol.commit()
            except Exception:  # noqa: BLE001
                pass
    threading.Thread(target=monitor, daemon=True).start()
    with open(log_path, "w") as lf:
        r = subprocess.run(cmd, stdout=lf, stderr=subprocess.STDOUT, cwd="/workspace/fullcircle")
    stop.set(); el = time.time() - t0
    from pathlib import Path
    arts = sorted(str(p)[len(FC) + 1:] for p in Path(run_dir).rglob("*") if p.suffix in (".pt", ".ply", ".json", ".yaml"))
    out = {"exit_code": r.returncode, "elapsed_s": round(el), "it_per_s": round(iterations / el, 3) if el else None,
           "peak_gpu_mib": peak[0], "downsample": downsample, "resolution": 3840 // downsample,
           "iterations": iterations, "artifacts": arts[:40],
           "log_tail": open(log_path, errors="replace").read()[-2500:]}
    json.dump(out, open(f"{FC}/train_result.json", "w"), indent=1)
    _status(stage="fc_train_done", exit_code=r.returncode, elapsed_s=round(el))
    vol.commit()
    return out


@app.function(image=fc_image, gpu="L40S", timeout=3 * 60 * 60, cpu=16.0, memory=64 * 1024, volumes={"/vol": vol})
def fc_final_analysis() -> dict[str, Any]:
    """Phase 4a: render every frame from the final checkpoint, then analyse the SAME physical view that was
    dumped at step 15k -- region by region, never from global brightness alone."""
    import subprocess
    import numpy as np
    import cv2
    from pathlib import Path

    run = sorted(Path(f"{FC}/runs/room213_native").iterdir())[-1]
    ckpt = run / "ckpt_last.pt"
    out: dict[str, Any] = {"run_dir": str(run), "ckpt_exists": ckpt.is_file()}
    rdir = f"{FC}/final_renders"
    if not Path(f"{rdir}/.done").exists():
        r = subprocess.run([PY, "render.py", "--checkpoint", str(ckpt), "--path", DATA, "--out-dir", rdir],
                           capture_output=True, text=True, cwd="/workspace/fullcircle")
        open(f"{FC}/render_all.log", "w").write(r.stdout[-8000:] + "\n" + r.stderr[-8000:])
        out["render_exit"] = r.returncode
        if r.returncode == 0:
            Path(f"{rdir}/.done").touch()
    out["render_tree"] = sorted(str(p)[len(rdir) + 1:] for p in Path(rdir).rglob("*") if p.is_file())[:60]

    # ---- identify the frame that was dumped at step 15000 by matching its GT against the staged images
    gt15 = cv2.imread(f"{run}/training_images/gt/gt_step_015000.png")
    tgt = cv2.resize(gt15, (128, 128)).astype(np.float32)
    best = (1e18, None)
    for cam in ("camera1", "camera2"):
        for p in sorted(Path(f"{DATA}/images/{cam}").glob("*.png")):
            im = cv2.imread(str(p))
            if im is None:
                continue
            d = float(np.abs(cv2.resize(im, (128, 128)).astype(np.float32) - tgt).mean())
            if d < best[0]:
                best = (d, f"{cam}/{p.name}")
    out["step15k_view"] = {"matched_image": best[1], "mean_abs_diff": round(best[0], 3)}
    name = best[1]
    gt = cv2.imread(f"{DATA}/images/{name}")
    cand = [p for p in Path(rdir).rglob("*.png") if Path(name).stem in p.name and "gt" not in p.parent.name.lower()]
    out["final_render_candidates"] = [str(p)[len(rdir) + 1:] for p in cand][:6]
    if not cand:
        json.dump(out, open(f"{FC}/final_analysis.json", "w"), indent=1); vol.commit(); return out
    ren = cv2.imread(str(cand[0]))
    if ren.shape != gt.shape:
        ren = cv2.resize(ren, (gt.shape[1], gt.shape[0]))
    border = cv2.imread(f"{FC}/mask_border.png", 0) > 0
    trmask = cv2.imread(f"{DATA}/masks/masks-5/{Path(name).parent.name}/{Path(name).stem}_mask.png", 0)
    excl = trmask > 127                                    # capturer/rim, excluded from supervision
    h, w = gt.shape[:2]
    xx = np.arange(w)[None, :].repeat(h, 0); yy = np.arange(h)[:, None].repeat(w, 1)
    rad = np.hypot(xx - w / 2, yy - h / 2)
    regions = {"left_hazy": border & ~excl & (xx < w / 2), "right_tables_chairs": border & ~excl & (xx >= w / 2)}
    dist_to_excl = cv2.distanceTransform((~excl).astype(np.uint8), cv2.DIST_L2, 3)

    def analyse(m):
        g = gt[m].astype(np.float32); rr = ren[m].astype(np.float32)
        lg = cv2.cvtColor(gt, cv2.COLOR_BGR2GRAY).astype(np.float32); lr = cv2.cvtColor(ren, cv2.COLOR_BGR2GRAY).astype(np.float32)
        sg = cv2.cvtColor(gt, cv2.COLOR_BGR2HSV)[:, :, 1].astype(np.float32); sr = cv2.cvtColor(ren, cv2.COLOR_BGR2HSV)[:, :, 1].astype(np.float32)
        def grad(img):
            gx = cv2.Sobel(img, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(img, cv2.CV_32F, 0, 1, ksize=3)
            return np.hypot(gx, gy)
        gg, gr = grad(lg), grad(lr)
        def pct(a): return [round(float(np.percentile(a, q)), 1) for q in (1, 5, 25, 50, 75, 95, 99)]
        return {"n_px": int(m.sum()),
                "luminance_percentiles_gt": pct(lg[m]), "luminance_percentiles_render": pct(lr[m]),
                "rms_contrast_gt": round(float(lg[m].std()), 2), "rms_contrast_render": round(float(lr[m].std()), 2),
                "edge_gradient_mean_gt": round(float(gg[m].mean()), 2), "edge_gradient_mean_render": round(float(gr[m].mean()), 2),
                "edge_ratio_render_over_gt": round(float(gr[m].mean() / max(gg[m].mean(), 1e-6)), 3),
                "saturation_mean_gt": round(float(sg[m].mean()), 2), "saturation_mean_render": round(float(sr[m].mean()), 2),
                "mae_rgb": round(float(np.abs(g - rr).mean()), 2),
                "render_minus_gt_mean": round(float((lr[m] - lg[m]).mean()), 2),
                "dark_pixels_gt_lt60_frac": round(float((lg[m] < 60).mean()), 4),
                "dark_pixels_render_lt60_frac": round(float((lr[m] < 60).mean()), 4),
                "veil_frac_gtdark_renderbright": round(float(((lg[m] < 60) & (lr[m] > 100)).mean()), 4),
                "mean_radius_px": round(float(rad[m].mean()), 1),
                "mean_dist_to_excluded_px": round(float(dist_to_excl[m].mean()), 1)}

    out["matched_view_regions"] = {k: analyse(v) for k, v in regions.items()}
    # where are the worst pixels? radius + distance to excluded regions
    lg = cv2.cvtColor(gt, cv2.COLOR_BGR2GRAY).astype(np.float32); lr = cv2.cvtColor(ren, cv2.COLOR_BGR2GRAY).astype(np.float32)
    err = np.abs(lr - lg); valid = border & ~excl
    thr = float(np.percentile(err[valid], 90)); worst = valid & (err >= thr)
    out["worst_decile"] = {"threshold_abs_luma": round(thr, 1),
                           "mean_radius_px": round(float(rad[worst].mean()), 1), "all_valid_mean_radius_px": round(float(rad[valid].mean()), 1),
                           "mean_dist_to_excluded_px": round(float(dist_to_excl[worst].mean()), 1),
                           "all_valid_mean_dist_to_excluded_px": round(float(dist_to_excl[valid].mean()), 1),
                           "frac_in_left_half": round(float((worst & (xx < w / 2)).sum() / max(worst.sum(), 1)), 3)}
    # side-by-side sheet, plus a heat map of the signed error
    sbs = np.hstack([cv2.resize(gt, (760, 760)), cv2.resize(ren, (760, 760))])
    heat = cv2.applyColorMap(np.clip((lr - lg) * 1.6 + 128, 0, 255).astype(np.uint8), cv2.COLORMAP_COOLWARM if hasattr(cv2, "COLORMAP_COOLWARM") else cv2.COLORMAP_JET)
    heat[~valid] = 0
    sheet = np.hstack([sbs, cv2.resize(heat, (760, 760))])
    for i, lab in enumerate(["GT (native fisheye)", "final 3DGRT render", "render - GT (blue=dark, red=bright)"]):
        cv2.putText(sheet, lab, (20 + 760 * i, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
    cv2.imwrite(f"{FC}/matched_view_final.png", sheet)
    json.dump(out, open(f"{FC}/final_analysis.json", "w"), indent=1)
    vol.commit()
    return out


@app.function(image=fc_image, timeout=60 * 60, cpu=8.0, memory=32 * 1024, volumes={"/vol": vol})
def fc_analyze_dump(step: str = "025000") -> dict[str, Any]:
    """Region-separated analysis of a MATCHED training dump (render and GT are the same physical view).
    Used when the run ended before the final checkpoint; identical metrics to the planned final analysis."""
    import numpy as np
    import cv2
    from pathlib import Path

    run = sorted(Path(f"{FC}/runs/room213_native").iterdir())[-1]
    ti = run / "training_images"
    gt = cv2.imread(str(ti / "gt" / f"gt_step_{step}.png"))
    ren = cv2.imread(str(ti / "renders" / f"render_step_{step}.png"))
    out: dict[str, Any] = {"step": step, "run_dir": str(run)}
    if gt is None or ren is None:
        out["error"] = "dump missing"; return out
    # identify which staged frame this is, so the real capturer mask can be used
    tgt = cv2.resize(gt, (128, 128)).astype(np.float32); best = (1e18, None)
    for cam in ("camera1", "camera2"):
        for p in sorted(Path(f"{DATA}/images/{cam}").glob("*.png")):
            im = cv2.imread(str(p))
            if im is None: continue
            d = float(np.abs(cv2.resize(im, (128, 128)).astype(np.float32) - tgt).mean())
            if d < best[0]: best = (d, f"{cam}/{p.name}")
    out["matched_image"] = best[1]; out["match_mean_abs_diff"] = round(best[0], 3)
    name = best[1]
    trmask = cv2.imread(f"{DATA}/masks/masks-5/{Path(name).parent.name}/{Path(name).stem}_mask.png", 0)
    excl = (trmask > 127) if trmask is not None else np.zeros(gt.shape[:2], bool)
    border = cv2.imread(f"{FC}/mask_border.png", 0) > 0
    h, w = gt.shape[:2]
    xx = np.arange(w)[None, :].repeat(h, 0); yy = np.arange(h)[:, None].repeat(w, 1)
    rad = np.hypot(xx - w / 2, yy - h / 2)
    dist_excl = cv2.distanceTransform((~excl).astype(np.uint8), cv2.DIST_L2, 3)
    lg = cv2.cvtColor(gt, cv2.COLOR_BGR2GRAY).astype(np.float32); lr = cv2.cvtColor(ren, cv2.COLOR_BGR2GRAY).astype(np.float32)
    sg = cv2.cvtColor(gt, cv2.COLOR_BGR2HSV)[:, :, 1].astype(np.float32); sr = cv2.cvtColor(ren, cv2.COLOR_BGR2HSV)[:, :, 1].astype(np.float32)
    def grad(img):
        return np.hypot(cv2.Sobel(img, cv2.CV_32F, 1, 0, 3), cv2.Sobel(img, cv2.CV_32F, 0, 1, 3))
    gg, gr = grad(lg), grad(lr)
    valid = border & ~excl
    regions = {"left_hazy": valid & (xx < w / 2), "right_tables_chairs": valid & (xx >= w / 2)}
    def pct(a): return [round(float(np.percentile(a, q)), 1) for q in (1, 5, 25, 50, 75, 95, 99)]
    def analyse(m):
        return {"n_px": int(m.sum()),
                "luminance_pct_gt": pct(lg[m]), "luminance_pct_render": pct(lr[m]),
                "rms_contrast_gt": round(float(lg[m].std()), 2), "rms_contrast_render": round(float(lr[m].std()), 2),
                "contrast_ratio_render_over_gt": round(float(lr[m].std() / max(lg[m].std(), 1e-6)), 3),
                "edge_grad_gt": round(float(gg[m].mean()), 2), "edge_grad_render": round(float(gr[m].mean()), 2),
                "edge_ratio": round(float(gr[m].mean() / max(gg[m].mean(), 1e-6)), 3),
                "saturation_gt": round(float(sg[m].mean()), 2), "saturation_render": round(float(sr[m].mean()), 2),
                "mae_luma": round(float(np.abs(lr[m] - lg[m]).mean()), 2),
                "render_minus_gt_mean": round(float((lr[m] - lg[m]).mean()), 2),
                "gt_dark_lt60_frac": round(float((lg[m] < 60).mean()), 4),
                "render_dark_lt60_frac": round(float((lr[m] < 60).mean()), 4),
                "veil_frac_gtdark_renderbright": round(float(((lg[m] < 60) & (lr[m] > 100)).mean()), 4),
                "mean_radius_px": round(float(rad[m].mean()), 1),
                "mean_dist_to_excluded_px": round(float(dist_excl[m].mean()), 1)}
    out["regions"] = {k: analyse(v) for k, v in regions.items()}
    err = np.abs(lr - lg); thr = float(np.percentile(err[valid], 90)); worst = valid & (err >= thr)
    out["worst_decile"] = {"threshold": round(thr, 1), "frac_left_half": round(float((worst & (xx < w / 2)).sum() / max(worst.sum(), 1)), 3),
                           "mean_radius_px": round(float(rad[worst].mean()), 1), "baseline_radius_px": round(float(rad[valid].mean()), 1),
                           "mean_dist_to_excluded_px": round(float(dist_excl[worst].mean()), 1),
                           "baseline_dist_to_excluded_px": round(float(dist_excl[valid].mean()), 1)}
    sbs = np.hstack([cv2.resize(gt, (720, 720)), cv2.resize(ren, (720, 720))])
    heat = cv2.applyColorMap(np.clip((lr - lg) * 1.6 + 128, 0, 255).astype(np.uint8), cv2.COLORMAP_JET); heat[~valid] = 0
    sheet = np.hstack([sbs, cv2.resize(heat, (720, 720))])
    for i, lab in enumerate([f"GT {name}", f"render @{int(step)}", "render-GT (red=too bright)"]):
        cv2.putText(sheet, lab, (16 + 720 * i, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    cv2.imwrite(f"{FC}/matched_view_{step}.png", sheet)
    json.dump(out, open(f"{FC}/analysis_{step}.json", "w"), indent=1); vol.commit()
    return out


@app.function(image=fc_image, gpu="L40S", timeout=2 * 60 * 60, cpu=16.0, memory=64 * 1024, volumes={"/vol": vol})
def fc_densify_diag(iterations: int = 3000) -> dict[str, Any]:
    """Densification diagnostic. Same dataset, cameras, masks, resolution and config as the 30k run -- ONLY
    n_iterations changes. Instrumentation is counters wrapped around the strategy hooks; no quality setting,
    threshold, colour path or schedule is touched."""
    import subprocess
    probe = "/workspace/fullcircle/diag_densify.py"
    open(probe, "w").write('''
import atexit, json, sys, runpy, torch
import threedgrut.strategy.base as B
import threedgrut.strategy.gs as G

OUT = "%s/densify_diag.json"
import collections
C = collections.defaultdict(int)
SNAP, GRAD = [], []

def wrap(cls, name, label=None):
    if name not in cls.__dict__:
        return
    label = label or name
    orig = cls.__dict__[name]
    def f(self, *a, **k):
        C[label] += 1
        # record particle count and the live gradient buffer at each optimizer-step hook
        if name == "post_optimizer_step":
            step = a[0] if a else k.get("step", -1)
            try:
                n = int(self.model.num_gaussians)
            except Exception:
                n = -1
            if step in (1, 250, 500, 750, 1000, 1250, 1500, 1750, 2000) or step %% 500 == 0:
                acc = getattr(self, "densify_grad_norm_accum", None)
                den = getattr(self, "densify_grad_norm_denom", None)
                g = {}
                if acc is not None and acc.numel():
                    gn = (acc / den.clamp(min=1)).squeeze()
                    gn = gn[~gn.isnan()]
                    if gn.numel():
                        q = torch.quantile(gn.float(), torch.tensor([0.5, 0.9, 0.99, 1.0], device=gn.device))
                        g = {"grad_p50": float(q[0]), "grad_p90": float(q[1]), "grad_p99": float(q[2]),
                             "grad_max": float(q[3]), "n_buffer": int(gn.numel()),
                             "n_above_clone_thr": int((gn >= self.clone_grad_threshold).sum()),
                             "clone_thr": float(self.clone_grad_threshold)}
                SNAP.append({"step": int(step), "num_gaussians": n, **g})
        return orig(self, *a, **k)
    setattr(cls, name, f)

for n in ("pre_backward", "post_backward", "post_optimizer_step"):
    wrap(B.BaseStrategy, n, "Base." + n)
for n in ("post_backward", "post_optimizer_step", "_post_backward", "_post_optimizer_step",
          "densify_gaussians", "clone_gaussians", "split_gaussians", "prune_gaussians_opacity",
          "update_gradient_buffer", "reset_density", "decay_density", "prune_gaussians_scale"):
    wrap(G.GSStrategy, n, "GS." + n)

def dump():
    json.dump({"hook_call_counts": dict(C), "snapshots": SNAP,
               "gs_defines_public_post_optimizer_step": "post_optimizer_step" in G.GSStrategy.__dict__,
               "gs_defines_underscore": "_post_optimizer_step" in G.GSStrategy.__dict__,
               "base_public_is_noop": B.BaseStrategy.post_optimizer_step.__qualname__},
              open(OUT, "w"), indent=1)
atexit.register(dump)

sys.argv = ["train.py"] + sys.argv[1:]
runpy.run_path("/workspace/fullcircle/train.py", run_name="__main__")
''' % FC)
    cmd = [PY, probe, "--config-name", "apps/colmap_3dgrt.yaml",
           f"path={DATA}", "out_dir=/tmp/densify_diag", "experiment_name=densify_diag",
           "dataset.downsample_factor=1", "dataset.test_frame_suffix=_test",
           f"border_mask_train={FC}/mask_border.png", f"border_mask_test={FC}/mask_border.png",
           f"n_iterations={iterations}", "test_last=false", "compute_extra_metrics=false"]
    import threading
    import time
    peak = [0]; stop = threading.Event()

    def poll():
        while not stop.wait(3):
            try:
                q = subprocess.run(["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
                                   capture_output=True, text=True, timeout=10)
                peak[0] = max(peak[0], int(q.stdout.strip().split("\n")[0]))
            except Exception:  # noqa: BLE001
                pass
    threading.Thread(target=poll, daemon=True).start()
    t0 = time.time()
    r = subprocess.run(cmd, capture_output=True, text=True, cwd="/workspace/fullcircle")
    stop.set(); el = time.time() - t0
    log = r.stdout[-40000:] + "\n" + r.stderr[-40000:]
    open(f"{FC}/densify_diag.log", "w").write(log)
    res: dict[str, Any] = {"exit": r.returncode, "elapsed_s": round(el, 1),
                           "it_per_s": round(iterations / el, 3) if el else None, "peak_gpu_mib": peak[0]}
    try:
        res.update(json.loads(open(f"{FC}/densify_diag.json").read()))
    except Exception as e:  # noqa: BLE001
        res["read_error"] = str(e)
    # the released code prints "Cloned N / M" / "Splitted N / M" when print_stats is on
    res["stat_lines"] = [l.strip() for l in log.splitlines() if "Cloned" in l or "Splitted" in l or "Pruned" in l][:20]
    json.dump(res, open(f"{FC}/densify_diag_result.json", "w"), indent=1)
    vol.commit()
    return res


# fixed physical camera analysed at step 25k in the broken (non-densifying) run; crop boxes are in 720-px panel
# coordinates of that frame and scale x(3840/720). Chosen from the viewed GT frame, not from any render.
FIXED_VIEW = "camera2/frame_00103.png"
CROPS_720 = {"ceiling_grid": (200, 60, 560, 300), "window_frames": (140, 350, 440, 470),
             "chair_backs": (360, 420, 560, 540), "table_edges": (380, 450, 580, 560),
             "door_hardware": (575, 340, 660, 430), "carpet": (60, 520, 250, 640)}

RENDER_FIXED_SRC = '''import sys
sys.path.insert(0, "/workspace/fullcircle")
import threedgrut.datasets as D
_o = D.make_test
def mt(*a, **k):
    cfg = k["config"] if "config" in k else a[1]
    cfg.dataset.test_frame_suffix = sys.argv[3]
    return _o(*a, **k)
D.make_test = mt
from threedgrut.render import Renderer
Renderer.from_checkpoint(checkpoint_path=sys.argv[1], path=sys.argv[4], out_dir=sys.argv[2], save_gt=True,
                         computes_extra_metrics=True).render_all()
'''


@app.function(image=fc_image, gpu="L40S", timeout=2 * 60 * 60, cpu=16.0, memory=64 * 1024, volumes={"/vol": vol})
def fc_checkpoint_series_v2() -> dict[str, Any]:
    """Render the SAME physical camera (camera2/frame_00103) from every saved checkpoint of the fixed-densification
    run, beside the broken run's step-25k render of that camera, and measure edge energy per content region. The
    camera is selected by setting the test-split filename suffix to '00103' (picks frame_00103 on both lenses) --
    the released renderer itself is untouched. Also renders all 24 held-out frames from the final checkpoint through
    the released render.py. Read-only; no training."""
    import subprocess
    import numpy as np
    import cv2
    from pathlib import Path

    runs = sorted(Path(f"{FC}/runs/room213_native").iterdir())
    run = [r for r in runs if (r / "ours_30000").exists()][-1]
    broken = f"{FC}/runs/room213_native/room213-2209_200433"
    out: dict[str, Any] = {"run": str(run), "fixed_view": FIXED_VIEW}
    work = Path(f"{FC}/series"); work.mkdir(exist_ok=True)
    script = work / "render_fixed_v2.py"; script.write_text(RENDER_FIXED_SRC)
    gt_ref = cv2.imread(f"{DATA}/images/{FIXED_VIEW}")
    small_ref = cv2.resize(gt_ref, (256, 256)).astype(np.float32)
    renders: dict[str, Any] = {}
    for step in (7000, 15000, 20000, 25000, 30000):
        ck = run / f"ours_{step}" / f"ckpt_{step}.pt"
        od = work / f"v2_step{step}"
        if not ck.exists():
            continue
        if not any(od.rglob("*.png")):
            r = subprocess.run([PY, str(script), str(ck), str(od), "00103", DATA], capture_output=True, text=True,
                               cwd="/workspace/fullcircle")
            (work / f"render_{step}.log").write_text(r.stdout[-4000:] + "\n" + r.stderr[-4000:])
        best = (1e18, None)
        for g in od.rglob("gt/*.png"):
            im = cv2.imread(str(g))
            if im is None:
                continue
            d = float(np.abs(cv2.resize(im, (256, 256)).astype(np.float32) - small_ref).mean())
            if d < best[0]:
                best = (d, g)
        if best[1] is not None:
            if best[0] > 5.0:
                renders[str(step)] = {"INVALID_view_match_diff": round(best[0], 3)}; continue
            renders[str(step)] = {"path": str(best[1].parent.parent / "renders" / best[1].name),
                                  "gt_match_diff": round(best[0], 3)}
    out["renders_found"] = renders
    brk = cv2.imread(f"{broken}/training_images/renders/render_step_025000.png")
    border = cv2.imread(f"{FC}/mask_border.png", 0) > 0
    trm = cv2.imread(f"{DATA}/masks/masks-5/camera2/frame_00103_mask.png", 0)
    valid = border & ~(trm > 127)
    h, w = gt_ref.shape[:2]
    xx = np.arange(w)[None, :].repeat(h, 0)

    def grad(img):
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
        return np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0, 3), cv2.Sobel(g, cv2.CV_32F, 0, 1, 3))

    gg = grad(gt_ref); sc = w / 720.0
    cols = [("broken_25k", brk)] + [(f"fixed_{k}", cv2.imread(v["path"]))
                                    for k, v in sorted(renders.items(), key=lambda t: int(t[0])) if "path" in v]
    table: dict[str, Any] = {}
    for name, im in cols:
        if im is None:
            continue
        if im.shape != gt_ref.shape:
            im = cv2.resize(im, (w, h))
        gr = grad(im)
        lm, rm = valid & (xx < w / 2), valid & (xx >= w / 2)
        row = {"left_region": round(float(gr[lm].mean() / gg[lm].mean()), 3),
               "right_region": round(float(gr[rm].mean() / gg[rm].mean()), 3)}
        for cn, (x0, y0, x1, y1) in CROPS_720.items():
            X0, Y0, X1, Y1 = int(x0 * sc), int(y0 * sc), int(x1 * sc), int(y1 * sc)
            m = valid[Y0:Y1, X0:X1]
            if m.sum() > 100:
                row[cn] = round(float(gr[Y0:Y1, X0:X1][m].mean() / gg[Y0:Y1, X0:X1][m].mean()), 3)
        table[name] = row
    out["edge_ratio_render_over_gt"] = table

    rows = []
    for cn, (x0, y0, x1, y1) in CROPS_720.items():
        X0, Y0, X1, Y1 = int(x0 * sc), int(y0 * sc), int(x1 * sc), int(y1 * sc)
        tiles = []
        for lab, im in [("GT", gt_ref)] + cols:
            if im is None:
                continue
            if im.shape != gt_ref.shape:
                im = cv2.resize(im, (w, h))
            c = cv2.resize(im[Y0:Y1, X0:X1], (300, max(1, int(300 * (Y1 - Y0) / max(X1 - X0, 1)))))
            c = cv2.copyMakeBorder(c, 26, 0, 0, 4, cv2.BORDER_CONSTANT, value=(0, 0, 0))
            cv2.putText(c, lab, (4, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
            tiles.append(c)
        hm = max(t.shape[0] for t in tiles)
        tiles = [cv2.copyMakeBorder(t, 0, hm - t.shape[0], 0, 0, cv2.BORDER_CONSTANT, value=(0, 0, 0)) for t in tiles]
        strip = np.hstack(tiles)
        lab_img = np.zeros((strip.shape[0], 150, 3), np.uint8)
        cv2.putText(lab_img, cn, (6, strip.shape[0] // 2), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
        rows.append(np.hstack([lab_img, strip]))
    wm = max(r.shape[1] for r in rows)
    rows = [cv2.copyMakeBorder(r, 0, 6, 0, wm - r.shape[1], cv2.BORDER_CONSTANT, value=(0, 0, 0)) for r in rows]
    cv2.imwrite(str(work / "fixed_camera_series_v2.png"), np.vstack(rows))
    fr = [cv2.resize(gt_ref, (900, 900))]
    for im in (brk, cv2.imread(renders["30000"]["path"]) if "path" in renders.get("30000", {}) else None):
        if im is not None:
            fr.append(cv2.resize(im, (900, 900)))
    cv2.imwrite(str(work / "room_view_gt_broken_final_v2.png"), np.hstack(fr))

    hd = work / "heldout"
    if not any(hd.rglob("*.png")):
        r = subprocess.run([PY, "render.py", "--checkpoint", str(run / "ours_30000" / "ckpt_30000.pt"),
                            "--path", DATA, "--out-dir", str(hd)], capture_output=True, text=True,
                           cwd="/workspace/fullcircle")
        (work / "heldout_render.log").write_text(r.stdout[-6000:] + "\n" + r.stderr[-6000:])
    hr = sorted(hd.rglob("renders/*.png")); per = []
    for rp in hr:
        gp = rp.parent.parent / "gt" / rp.name
        a, b = cv2.imread(str(rp)), cv2.imread(str(gp))
        if a is None or b is None or a.shape != b.shape:
            continue
        bm = cv2.resize(border.astype(np.uint8), (a.shape[1], a.shape[0])) > 0
        per.append(float(grad(a)[bm].mean() / grad(b)[bm].mean()))
    out["heldout"] = {"n_frames": len(per),
                      "edge_ratio_median": round(float(np.median(per)), 3) if per else None,
                      "edge_ratio_min_max": [round(min(per), 3), round(max(per), 3)] if per else None,
                      "metrics_txt": next((p.read_text()[-1200:] for p in hd.rglob("metrics.txt")), None)}
    if len(hr) >= 6:
        tiles = []
        for rp in [hr[i] for i in np.linspace(0, len(hr) - 1, 6).astype(int)]:
            a = cv2.imread(str(rp)); b = cv2.imread(str(rp.parent.parent / "gt" / rp.name))
            tiles.append(np.vstack([cv2.resize(b, (420, 420)), cv2.resize(a, (420, 420))]))
        cv2.imwrite(str(work / "heldout_gt_over_render.png"), np.hstack(tiles))
    json.dump(out, open(work / "series_v2.json", "w"), indent=1)
    vol.commit()
    return out


@app.function(image=fc_image, gpu="L40S", timeout=3 * 60 * 60, cpu=16.0, memory=64 * 1024, volumes={"/vol": vol})
def fc_patch_diag_run(src: str) -> dict[str, Any]:
    """Final pre-correction diagnostic (read-only). The analysis script source is passed in so the exact code that ran
    is recorded on the volume; it executes in the fullcircle env with pycolmap pinned to the version used elsewhere."""
    import subprocess
    from pathlib import Path
    Path(f"{FC}/patch_diag").mkdir(parents=True, exist_ok=True)
    Path(f"{FC}/patch_diag/fc_patch_diag.py").write_text(src)
    pin = subprocess.run([PY, "-m", "pip", "install", "-q", "pycolmap==4.2.0"], capture_output=True, text=True)
    r = subprocess.run([PY, f"{FC}/patch_diag/fc_patch_diag.py"], capture_output=True, text=True, cwd="/workspace/fullcircle")
    Path(f"{FC}/patch_diag/run.log").write_text(pin.stdout[-800:] + pin.stderr[-800:] + "\n" + r.stdout[-30000:] + "\n" + r.stderr[-20000:])
    vol.commit()
    out: dict[str, Any] = {"exit": r.returncode, "stderr_tail": r.stderr[-3000:]}
    try:
        out["result"] = json.loads(Path(f"{FC}/patch_diag/patch_diag.json").read_text())
    except Exception as e:  # noqa: BLE001
        out["read_error"] = str(e)
    return out


@app.local_entrypoint()
def main(phase: str = "smoke", force: bool = False, iters: int = 150, downsample: int = 1, iterations: int = 30000, step: str = "025000"):
    if phase == "series":
        print(json.dumps(fc_checkpoint_series_v2.remote(), indent=1)); return
    if phase == "densify_diag":
        print(json.dumps(fc_densify_diag.remote(iterations), indent=1)); return
    if phase == "analyze_dump":
        print(json.dumps(fc_analyze_dump.remote(step), indent=1)); return
    if phase == "final":
        print(json.dumps(fc_final_analysis.remote(), indent=1)); return
    if phase == "train":
        print(json.dumps(fc_train.remote(downsample, iterations), indent=1)); return
    if phase == "verify":
        print(json.dumps(fc_verify_masks.remote(), indent=1)); return
    if phase == "stage_train":
        print(json.dumps(fc_stage_train_inputs.remote(), indent=1)); return
    if phase == "probe":
        print(json.dumps(fc_probe.remote(iters), indent=1)); return
    if phase == "validate":
        print(json.dumps(fc_validate.remote(), indent=1))
        return
    if phase == "smoke":
        print(json.dumps(fc_smoke.remote(), indent=1))
    elif phase == "colmap":
        print(json.dumps(fc_stage_and_colmap.remote(force), indent=1))
