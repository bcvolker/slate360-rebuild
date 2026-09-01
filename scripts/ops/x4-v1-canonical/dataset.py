#!/usr/bin/env python3
"""Serialize the existing Route B COLMAP model for V1 canonical training.

Does not rerun SfM. Does not derive new poses. Equatorial faces only.
True holdout: every 8th panorama timestamp, all four faces.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

EQUATORIAL = ("front", "right", "back", "left")
HOLDOUT_EVERY = 8
WORK = Path("/home/rian_/route_b_x4")
EXPECTED_PANOS = 166
EXPECTED_CAMS = 664
EXPECTED_POINTS = 53944
EXPECTED_PX = 800


def face_of(name: str) -> str:
    return Path(name).parts[0]


def timestamp_of(name: str) -> float:
    return int(Path(name).stem) / 1000.0


def split_roles(times: list[float], every: int = HOLDOUT_EVERY) -> list[str]:
    uniq = sorted(set(times))
    hold = {t for i, t in enumerate(uniq) if i % every == 0}
    roles = ["holdout" if t in hold else "train" for t in times]
    if set(t for t, r in zip(times, roles) if r == "holdout") & set(
        t for t, r in zip(times, roles) if r == "train"
    ):
        raise AssertionError("holdout timestamps leaked into train")
    return roles


def load_colmap(work: Path):
    import pycolmap

    rec = pycolmap.Reconstruction(str(work / "sparse" / "0"))
    Ks = {}
    for cid, cam in rec.cameras.items():
        pr = cam.params
        Ks[cid] = (float(pr[0]), float(pr[1]), float(pr[2]), int(cam.width), int(cam.height))
    cameras = []
    img_root = work / "images"
    for im in rec.images.values():
        if not im.has_pose:
            continue
        face = face_of(im.name)
        if face not in EQUATORIAL:
            continue
        path = img_root / im.name
        if not path.is_file():
            continue
        world_from_cam = im.cam_from_world().inverse()
        R = np.array(world_from_cam.rotation.matrix(), np.float32)
        t = np.array(world_from_cam.translation, np.float32)
        w2c = np.eye(4, dtype=np.float32)
        w2c[:3, :3] = R.T
        w2c[:3, 3] = -R.T @ t
        f, cx, cy, w, h = Ks[im.camera_id]
        K = np.array([[f, 0, cx], [0, f, cy], [0, 0, 1]], np.float32)
        cameras.append({
            "t": timestamp_of(im.name),
            "face": face,
            "name": im.name.replace("\\", "/"),
            "view": w2c.tolist(),
            "K": K.tolist(),
            "w": int(w),
            "h": int(h),
        })
    cameras.sort(key=lambda c: (c["t"], EQUATORIAL.index(c["face"])))
    pts = np.array([pt.xyz for pt in rec.points3D.values()], np.float32)
    cols = np.array([np.array(pt.color, np.uint8) for pt in rec.points3D.values()])
    return cameras, pts, cols


def attach_split(cameras: list[dict]) -> dict:
    times = [float(c["t"]) for c in cameras]
    roles = split_roles(times)
    for cam, role in zip(cameras, roles):
        cam["role"] = role
    hold_t = sorted({c["t"] for c in cameras if c["role"] == "holdout"})
    train_t = sorted({c["t"] for c in cameras if c["role"] == "train"})
    panos = sorted({c["t"] for c in cameras})
    return {
        "n_panos": len(panos),
        "n_train_panos": len(train_t),
        "n_holdout_panos": len(hold_t),
        "holdout_times": hold_t,
        "every": HOLDOUT_EVERY,
        "n_cameras": len(cameras),
        "n_train": sum(1 for c in cameras if c["role"] == "train"),
        "n_holdout": sum(1 for c in cameras if c["role"] == "holdout"),
    }


def validate(cameras: list[dict], xyz: np.ndarray, split: dict) -> None:
    faces = {c["face"] for c in cameras}
    if faces != set(EQUATORIAL):
        raise SystemExit(f"unexpected faces {faces}")
    if any(c["face"] in ("up", "down") for c in cameras):
        raise SystemExit("zenith/nadir leaked into V1 dataset")
    if split["n_panos"] != EXPECTED_PANOS:
        raise SystemExit(f"expected {EXPECTED_PANOS} panos, got {split['n_panos']}")
    if split["n_cameras"] != EXPECTED_CAMS:
        raise SystemExit(f"expected {EXPECTED_CAMS} cameras, got {split['n_cameras']}")
    if len(xyz) != EXPECTED_POINTS:
        raise SystemExit(f"expected {EXPECTED_POINTS} points, got {len(xyz)}")
    if any(c["w"] != EXPECTED_PX or c["h"] != EXPECTED_PX for c in cameras):
        raise SystemExit("face size is not 800x800")
    hold = {c["t"] for c in cameras if c["role"] == "holdout"}
    train = {c["t"] for c in cameras if c["role"] == "train"}
    if hold & train:
        raise SystemExit("holdout panorama leaked into train")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--work", default=str(WORK))
    p.add_argument("--out", required=True)
    args = p.parse_args()
    cameras, xyz, rgb = load_colmap(Path(args.work))
    split = attach_split(cameras)
    validate(cameras, xyz, split)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    np.save(out / "init_xyz.npy", xyz)
    np.save(out / "init_rgb.npy", rgb)
    (out / "cameras.json").write_text(json.dumps(cameras) + "\n")
    (out / "split.json").write_text(json.dumps(split, indent=2) + "\n")
    meta = {
        "source": "Route B pycolmap sparse/0 — poses not recomputed",
        "images": str(Path(args.work) / "images"),
        "faces": list(EQUATORIAL),
        "zenith_nadir": False,
        "pose_opt": False,
        "face_px": EXPECTED_PX,
        "init_points": int(len(xyz)),
        "sfm_rerun": False,
        "arkit_used": False,
        "v2_used": False,
        **split,
    }
    (out / "DATASET.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
