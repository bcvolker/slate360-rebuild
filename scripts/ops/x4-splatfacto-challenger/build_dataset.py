"""Build the shared 4-face Nerfstudio dataset. Does not rerun SfM."""
from __future__ import annotations

import argparse
import json
import math
import shutil
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from cameras import equatorial_cameras  # noqa: E402
from opengl import opencv_c2w_to_opengl  # noqa: E402
from paths import CONFIG, FACE_PX, SHARED, SPARSE_PLY, TRAJ, V2_FACES  # noqa: E402


def _link_or_copy(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        return
    try:
        dst.hardlink_to(src)
    except OSError:
        shutil.copy2(src, dst)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--traj", default=str(TRAJ))
    p.add_argument("--faces", default=str(V2_FACES))
    p.add_argument("--sparse-ply", default=str(SPARSE_PLY))
    p.add_argument("--out", default=str(SHARED))
    p.add_argument("--face-px", type=int, default=FACE_PX)
    args = p.parse_args()

    trained, split, lock = equatorial_cameras(Path(args.traj), args.face_px)
    face_dir = Path(args.faces)
    missing = [c["name"] for c in trained if not (face_dir / c["name"]).is_file()]
    if missing:
        raise SystemExit(f"missing {len(missing)} face images, e.g. {missing[:3]}")

    out = Path(args.out)
    img_dir = out / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    for cam in trained:
        _link_or_copy(face_dir / cam["name"], img_dir / cam["name"])

    fx = 0.5 * args.face_px / math.tan(math.radians(90.0) * 0.5)
    cx = (args.face_px - 1) / 2.0
    centers = np.array([np.array(c["c2w"])[:3, 3] for c in trained], dtype=np.float64)
    extent = float(np.max(np.abs(centers)))
    scene_scale = max(32.0, math.ceil(extent * 2.0))

    frames = []
    train_files = []
    val_files = []
    for cam in trained:
        rel = f"images/{cam['name']}"
        c2w_gl = opencv_c2w_to_opengl(np.array(cam["c2w"], dtype=np.float64))
        frames.append({
            "file_path": rel,
            "transform_matrix": c2w_gl.tolist(),
            "t": cam["t"],
            "face": cam["face"],
            "role": cam["role"],
        })
        if cam["role"] == "holdout":
            val_files.append(rel)
        else:
            train_files.append(rel)

    sparse_dest = out / "x4_sparse.ply"
    if Path(args.sparse_ply).is_file() and not sparse_dest.exists():
        shutil.copy2(args.sparse_ply, sparse_dest)

    transforms = {
        "camera_model": "OPENCV",
        "fl_x": fx,
        "fl_y": fx,
        "cx": cx,
        "cy": cx,
        "w": args.face_px,
        "h": args.face_px,
        "k1": 0.0,
        "k2": 0.0,
        "p1": 0.0,
        "p2": 0.0,
        "orientation_override": "none",
        "ply_file_path": "x4_sparse.ply",
        "applied_transform": [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]],
        "applied_scale": 1.0,
        "frames": frames,
        "train_filenames": train_files,
        "val_filenames": val_files,
        "test_filenames": val_files,
    }
    (out / "transforms.json").write_text(json.dumps(transforms, indent=2) + "\n")
    (out / "cameras.json").write_text(json.dumps(trained) + "\n")
    split_out = {k: split[k] for k in ("n_panos", "n_train_panos", "n_holdout_panos", "holdout_times", "every", "roles")}
    (out / "split.json").write_text(json.dumps(split_out, indent=2) + "\n")
    meta = {
        "engine_target": "brush+splatfacto shared",
        "n_cameras": len(trained),
        "n_train": sum(1 for c in trained if c["role"] == "train"),
        "n_holdout": sum(1 for c in trained if c["role"] == "holdout"),
        "faces": sorted({c["face"] for c in trained}),
        "nadir": False,
        "zenith": False,
        "face_px": args.face_px,
        "holdout_every": split["every"],
        "scene_scale": scene_scale,
        "pose_opt": False,
        "sfm_rerun": False,
        "arkit_used": False,
        "colmap_lock": lock,
        "config": CONFIG,
    }
    (out / "DATASET.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps({k: meta[k] for k in ("n_cameras", "n_train", "n_holdout", "faces", "scene_scale", "colmap_lock")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
