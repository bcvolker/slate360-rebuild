#!/usr/bin/env python3
"""Camera poses for a Gaussian-splat train, with pycolmap (BSD). Runs in WSL.

    sfm.py --mode 2d  --images <dir> --out <dir> [--camera-model PINHOLE]
    sfm.py --mode 360 --images <dir> --out <dir> [--face-px 1600] [--faces 4|5]

2D  : one shared pinhole camera, sequential matching (video order), incremental
      mapping. Output is a COLMAP text model Brush reads directly.
360 : each equirect frame is rendered into 90-degree cube faces that share ONE
      rig pose per timestamp (COLMAP camera rig). Faces are never solved
      independently — that was the failure mode of the old cloud worker.

Writes <out>/brush/{images,sparse/0} plus <out>/sfm_report.json and prints
STAGE / PROGRESS / RESULT lines for the studio.
"""
from __future__ import annotations

import argparse
import json
import math
import shutil
import sys
import time
from pathlib import Path

import numpy as np
import pycolmap

EXTS = {".jpg", ".jpeg", ".png"}
FACES = {  # name -> (yaw, pitch) in degrees, ERP camera frame (x right, y down, z forward)
    "front": (0.0, 0.0),
    "right": (90.0, 0.0),
    "back": (180.0, 0.0),
    "left": (270.0, 0.0),
    "up": (0.0, 90.0),
}
# Side faces are rendered wider than 90° so neighbours overlap (110° → 20° shared on
# each seam). Four butt-jointed 90° faces gave SIFT nothing to match across the cut and
# left half the faces unregistered (AOB 205: 48%). The up face stays at 90°.
FOV_DEG = 110.0
UP_FOV_DEG = 90.0


def log(msg: str) -> None:
    print(msg, flush=True)


def rot_erp_from_face(yaw_deg: float, pitch_deg: float) -> np.ndarray:
    """Maps face-camera directions into the ERP camera frame (same math as faces.py)."""
    yaw, pitch = math.radians(yaw_deg), math.radians(pitch_deg)
    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], dtype=np.float64)
    rp = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]], dtype=np.float64)
    return ry @ rp


def face_fov(name: str) -> float:
    return UP_FOV_DEG if name == "up" else FOV_DEG


def erp_to_face(erp: np.ndarray, yaw_deg: float, pitch_deg: float, out: int, fov_deg: float = FOV_DEG) -> np.ndarray:
    import cv2

    h, w = erp.shape[:2]
    yy, xx = np.meshgrid(np.arange(out, dtype=np.float32), np.arange(out, dtype=np.float32), indexing="ij")
    f = 0.5 * out / math.tan(math.radians(fov_deg) * 0.5)
    x = (xx - (out - 1) / 2.0) / f
    y = (yy - (out - 1) / 2.0) / f
    z = np.ones_like(x)
    n = np.sqrt(x * x + y * y + z * z)
    d = np.stack([x / n, y / n, z / n], axis=-1) @ rot_erp_from_face(yaw_deg, pitch_deg).T.astype(np.float32)
    lon = np.arctan2(d[..., 0], d[..., 2])
    lat = np.arcsin(np.clip(-d[..., 1], -1, 1))
    u = (lon / (2 * math.pi) + 0.5) * w
    v = (0.5 - lat / math.pi) * h
    return cv2.remap(erp, np.clip(u, 0, w - 1).astype(np.float32), np.clip(v, 0, h - 1).astype(np.float32),
                     cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)


def list_images(d: Path) -> list[Path]:
    return sorted(p for p in d.iterdir() if p.suffix.lower() in EXTS)


def render_faces(images: list[Path], dst: Path, face_px: int, faces: list[str]) -> None:
    import cv2

    for name in faces:
        (dst / name).mkdir(parents=True, exist_ok=True)
    total = len(images)
    for i, src in enumerate(images, 1):
        erp = cv2.imread(str(src), cv2.IMREAD_COLOR)
        if erp is None:
            continue
        for name in faces:
            yaw, pitch = FACES[name]
            face = erp_to_face(erp, yaw, pitch, face_px, face_fov(name))
            cv2.imwrite(str(dst / name / (src.stem + ".jpg")), face, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if i % 5 == 0 or i == total:
            log(f"PROGRESS faces {i} {total}")


def pinhole_camera(face_px: int, fov_deg: float = FOV_DEG) -> pycolmap.Camera:
    fx = 0.5 * face_px / math.tan(math.radians(fov_deg) * 0.5)
    cx = (face_px - 1) / 2.0
    return pycolmap.Camera(model="PINHOLE", width=face_px, height=face_px, params=[fx, fx, cx, cx])


def run_matching(db: Path, n_images: int, matching: pycolmap.FeatureMatchingOptions, mode: str = "auto") -> None:
    # "auto" assumes filename order tracks capture order (true for our own video-frame
    # extraction). A drone mapping export (or any dataset renamed/shuffled by a third-party
    # tool) breaks that assumption, so callers with non-sequential filenames must pass
    # mode="exhaustive" explicitly rather than silently getting garbage pairs.
    use_exhaustive = mode == "exhaustive" or (mode == "auto" and n_images <= 120)
    if use_exhaustive:
        log("STAGE match exhaustive")
        pycolmap.match_exhaustive(db, matching_options=matching)
    else:
        log("STAGE match sequential")
        seq = pycolmap.SequentialPairingOptions()
        seq.overlap = 30  # frames of video; quadratic adds sparse long-range pairs for loop closure
        seq.quadratic_overlap = True
        seq.expand_rig_images = True
        seq.loop_detection = False
        pycolmap.match_sequential(db, matching_options=matching, pairing_options=seq)


def best_reconstruction(recs: dict) -> pycolmap.Reconstruction | None:
    if not recs:
        return None
    return max(recs.values(), key=lambda r: r.num_reg_images())


def export_for_brush(rec: pycolmap.Reconstruction, image_root: Path, out: Path) -> dict:
    brush = out / "brush"
    sparse = brush / "sparse" / "0"
    img_out = brush / "images"
    if brush.exists():
        shutil.rmtree(brush)
    sparse.mkdir(parents=True)
    img_out.mkdir(parents=True)
    rec.write_text(str(sparse))
    kept = 0
    for image in rec.images.values():
        src = image_root / image.name
        dst = img_out / image.name
        dst.parent.mkdir(parents=True, exist_ok=True)
        if src.exists():
            try:
                dst.hardlink_to(src)
            except OSError:
                shutil.copy2(src, dst)
            kept += 1
    stats = rec.compute_num_observations() if hasattr(rec, "compute_num_observations") else 0
    return {
        "registered_images": rec.num_reg_images(),
        "points3d": rec.num_points3D(),
        "observations": int(stats),
        "mean_reproj_error": float(rec.compute_mean_reprojection_error()),
        "mean_track_length": float(rec.compute_mean_track_length()),
        "images_exported": kept,
        "brush_dataset": str(brush),
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--mode", choices=["2d", "360"], required=True)
    p.add_argument("--images", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--camera-model", default="PINHOLE")
    p.add_argument("--face-px", type=int, default=2048)
    p.add_argument("--faces", type=int, default=4, choices=[4, 5])
    p.add_argument("--max-image-size", type=int, default=2400)
    p.add_argument("--threads", type=int, default=-1)
    p.add_argument("--matching", choices=["auto", "exhaustive", "sequential"], default="auto",
                    help="auto assumes filenames track capture order; a shuffled/renamed image set (e.g. a "
                         "third-party drone export) needs --matching exhaustive")
    a = p.parse_args()

    images_dir = Path(a.images)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    db = out / "database.db"
    if db.exists():
        db.unlink()
    t0 = time.time()

    sift = pycolmap.FeatureExtractionOptions()
    sift.max_image_size = a.max_image_size
    sift.num_threads = a.threads
    sift.use_gpu = False  # pip wheel has no CUDA SIFT; CPU is fine at this scale
    # 360 faces are 1600 px and there are 4-5 per panorama; 4096 features each is plenty.
    sift.sift.max_num_features = 4096 if a.mode == "360" else 8192
    matching = pycolmap.FeatureMatchingOptions()
    matching.num_threads = a.threads
    matching.use_gpu = False
    use_cuda = False

    if a.mode == "2d":
        imgs = list_images(images_dir)
        log(f"INFO images {len(imgs)}")
        if len(imgs) < 20:
            log("RESULT error too few images")
            return 5
        reader = pycolmap.ImageReaderOptions()
        reader.camera_model = a.camera_model
        log("STAGE features")
        pycolmap.extract_features(db, images_dir, camera_mode=pycolmap.CameraMode.SINGLE,
                                 reader_options=reader, extraction_options=sift)
        run_matching(db, len(imgs), matching, a.matching)
        image_root = images_dir
    else:
        erps = list_images(images_dir)
        log(f"INFO panoramas {len(erps)}")
        if len(erps) < 10:
            log("RESULT error too few panoramas")
            return 5
        faces = ["front", "right", "back", "left"] + (["up"] if a.faces == 5 else [])
        face_root = out / "faces"
        if face_root.exists():
            shutil.rmtree(face_root)
        log("STAGE faces")
        render_faces(erps, face_root, a.face_px, faces)
        reader = pycolmap.ImageReaderOptions()
        reader.camera_model = "PINHOLE"
        cam = pinhole_camera(a.face_px)
        reader.camera_params = ",".join(str(v) for v in cam.params)
        log("STAGE features")
        pycolmap.extract_features(db, face_root, camera_mode=pycolmap.CameraMode.PER_FOLDER,
                                 reader_options=reader, extraction_options=sift)
        # One rig per panorama: the front face is the reference sensor; every other
        # face is a fixed rotation of it. cam_from_rig maps rig (ERP) -> face camera.
        rig = pycolmap.RigConfig()
        rig_cams = []
        for name in faces:
            rc = pycolmap.RigConfigCamera()
            rc.image_prefix = f"{name}/"
            if name == "front":
                rc.ref_sensor = True
            else:
                yaw, pitch = FACES[name]
                r_face = rot_erp_from_face(yaw, pitch)
                rc.cam_from_rig = pycolmap.Rigid3d(pycolmap.Rotation3d(r_face.T), np.zeros(3))
            rig_cams.append(rc)
        rig.cameras = rig_cams
        database = pycolmap.Database.open(str(db))
        pycolmap.apply_rig_config([rig], database)
        database.close()
        run_matching(db, len(erps), matching, a.matching)
        image_root = face_root

    log("STAGE mapping")
    opts = pycolmap.IncrementalPipelineOptions()
    opts.num_threads = a.threads
    opts.ba_refine_focal_length = a.mode == "2d"
    opts.ba_refine_principal_point = False
    opts.ba_refine_extra_params = a.mode == "2d"
    if a.mode == "360":
        opts.ba_refine_sensor_from_rig = False  # faces are exact 90-degree rotations
    opts.min_model_size = 10
    sparse = out / "sparse"
    if sparse.exists():
        shutil.rmtree(sparse)
    sparse.mkdir()
    recs = pycolmap.incremental_mapping(db, image_root, sparse, options=opts)
    rec = best_reconstruction(recs)
    if rec is None or rec.num_reg_images() == 0:
        log("RESULT error no reconstruction")
        return 6

    total_images = sum(1 for _ in image_root.rglob("*") if _.suffix.lower() in EXTS)
    report = export_for_brush(rec, image_root, out)
    report.update({
        "mode": a.mode,
        "total_images": total_images,
        "registered_fraction": round(report["registered_images"] / max(total_images, 1), 3),
        "models_found": len(recs),
        "seconds": round(time.time() - t0, 1),
        "cuda": use_cuda,
    })
    frac = report["registered_fraction"]
    reproj = report["mean_reproj_error"]
    # Reconstruction gate (panel review 2026-09-09): training on a half-registered pose
    # graph only sharpens the ghosts. AOB 205 at 48% would have stopped here.
    report["coverage"] = "good" if frac >= 0.9 else "fair" if frac >= 0.7 else "poor"
    (out / "sfm_report.json").write_text(json.dumps(report, indent=2))
    log("RESULT sfm " + json.dumps(report))
    if frac < 0.7:
        log(f"INFO Only {int(frac * 100)}% of images could be placed (gate is 70%). Recapture: sharper frames, "
            "slower walk, exposure locked, no low-pass or horizon-lock export for the 360.")
        return 7
    if frac < 0.9 or reproj > 0.8:
        log(f"INFO {int(frac * 100)}% placed, {reproj:.2f} px reprojection — below the 90% / 0.8 px target. "
            "Expect thin spots; fine for a preview, recapture for a deliverable.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
