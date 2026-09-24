"""Build immutable, content-addressed dataset manifests (golden Room 213 package and the resume fixture)."""

from __future__ import annotations

import json
import math
import os
from pathlib import Path

from inventory import sha256_file
from jobspec import _read_colmap_text, canonical_sha, png_size


def dataset_manifest(root: Path, *, dataset_id: str, lens_folders: dict, lens_of_camera: dict, split_rule: str,
                     role_of: dict, extra: dict | None = None) -> dict:
    """Exhaustive file list (symlinks resolved to their bytes) + per-image camera/lens/split/pose/dims/mask."""
    files = []
    for dirpath, _dirs, names in os.walk(root, followlinks=True):
        for n in names:
            p = Path(dirpath) / n
            rel = p.relative_to(root).as_posix()
            files.append({"path": rel, "sha256": sha256_file(p), "bytes": p.stat().st_size})
    files.sort(key=lambda f: f["path"])
    cams, imgs = _read_colmap_text(root / "sparse" / "0")
    images = []
    for name, im in sorted(imgs.items()):
        folder = name.split("/")[0]
        w, h = png_size(root / "images" / name)
        split = ("train" if "_train" in name else "eval" if "eval" in name else None) if split_rule == "filename" \
            else "train"
        images.append({"name": name, "cameraId": im["cameraId"], "q": im["q"], "t": im["t"],
                       "lens": lens_of_camera.get(str(im["cameraId"])) if folder in lens_folders else None,
                       "split": split, "role": role_of.get(name, "train" if split == "train" else "eval"),
                       "width": w, "height": h, "mask": (root / "masks" / name).is_file()})
    man = {"schema": "spirula-dataset-v1", "datasetId": dataset_id, "files": files, "images": images,
           "cameras": [{"id": cid, **c} for cid, c in sorted(cams.items())],
           "lensFolders": lens_folders, "lensOfCamera": lens_of_camera, "splitRule": split_rule,
           "sceneTransform": "identity", "projection": "native-fisheye-K1", **(extra or {})}
    return man


def upload_objects(s3, bucket: str, prefix: str, root: Path, files: list[dict]) -> dict:
    from botocore.exceptions import ClientError
    up = skip = 0
    done = set()
    for f in files:
        if f["sha256"] in done:
            continue
        key = f"{prefix}/{f['sha256']}"
        try:
            h = s3.head_object(Bucket=bucket, Key=key)
            if h["ContentLength"] == f["bytes"]:
                skip += 1; done.add(f["sha256"]); continue
        except ClientError:
            pass
        s3.upload_file(str(root / f["path"]), bucket, key)
        up += 1; done.add(f["sha256"])
    return {"uploaded": up, "alreadyPresent": skip, "uniqueObjects": len(done)}


def put_json(s3, bucket: str, key: str, obj) -> str:
    import hashlib
    raw = json.dumps(obj, indent=1, sort_keys=True).encode()
    s3.put_object(Bucket=bucket, Key=key, Body=raw, ContentType="application/json")
    return hashlib.sha256(raw).hexdigest()


def build_fixture(root: Path, n_per_lens: int = 6, size: int = 192, seed: int = 213) -> None:
    """Two back-to-back OPENCV_FISHEYE lenses around a textured point cloud. Small, but a real Spirula dataset
    with masks, a filename train/eval split and a sparse model, so the same code path as Room 213 is exercised."""
    import cv2
    import numpy as np
    rng = np.random.default_rng(seed)
    sparse = root / "sparse" / "0"; sparse.mkdir(parents=True)
    f = size / math.pi * 0.9; c = size / 2.0
    (sparse / "cameras.txt").write_text(f"1 OPENCV_FISHEYE {size} {size} {f} {f} {c} {c} 0.02 0 0 0\n"
                                        f"2 OPENCV_FISHEYE {size} {size} {f} {f} {c} {c} 0.02 0 0 0\n")
    pts = rng.normal(size=(400, 3)); pts /= np.linalg.norm(pts, axis=1, keepdims=True); pts *= 4.0
    cols = rng.integers(40, 255, size=(400, 3))
    (sparse / "points3D.txt").write_text("".join(f"{i + 1} {float(p[0])!r} {float(p[1])!r} {float(p[2])!r} {c_[0]} {c_[1]} {c_[2]} 0.5\n"
                                                 for i, (p, c_) in enumerate(zip(pts, cols))))
    lines = []; iid = 1
    for k in range(n_per_lens):
        yaw = 2 * math.pi * k / n_per_lens
        for lens, cam_id, extra_yaw in (("camera1", 1, 0.0), ("camera2", 2, math.pi)):
            a = yaw + extra_yaw
            Rw = np.array([[math.cos(a), 0, math.sin(a)], [0, 1, 0], [-math.sin(a), 0, math.cos(a)]])   # c2w
            C = np.array([0.3 * math.cos(yaw), 0.0, 0.3 * math.sin(yaw)])
            R = Rw.T; t = -R @ C
            from scipy.spatial.transform import Rotation as Rot
            x, y, z, w = (float(v) for v in Rot.from_matrix(R).as_quat())
            t = [float(v) for v in t]
            split = "eval" if k == n_per_lens - 1 else "train"
            name = f"{lens}/f_{k:03d}_{split}.png"
            lines.append(f"{iid} {w!r} {x!r} {y!r} {z!r} {t[0]!r} {t[1]!r} {t[2]!r} {cam_id} {name}\n\n"); iid += 1
            img = np.zeros((size, size, 3), np.uint8)
            Xc = pts @ R.T + t; ok = Xc[:, 2] > 0.05
            th = np.arctan2(np.linalg.norm(Xc[ok, :2], axis=1), Xc[ok, 2]); r = np.linalg.norm(Xc[ok, :2], axis=1)
            u = f * Xc[ok, 0] * th / r + c; v = f * Xc[ok, 1] * th / r + c
            for uu, vv, cc in zip(u, v, cols[ok]):
                cv2.circle(img, (int(uu), int(vv)), 3, tuple(int(x_) for x_ in cc), -1)
            img = cv2.GaussianBlur(img, (0, 0), 0.8)
            (root / "images" / lens).mkdir(parents=True, exist_ok=True)
            (root / "masks" / lens).mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(root / "images" / name), img)
            m = np.zeros((size, size), np.uint8); cv2.circle(m, (size // 2, size // 2), int(size * 0.47), 255, -1)
            cv2.imwrite(str(root / "masks" / name), m)
    (sparse / "images.txt").write_text("".join(lines))
