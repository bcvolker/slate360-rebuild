#!/usr/bin/env python3
"""OpenSfM reconstruction.json -> GGPS COLMAP dummy-PINHOLE layout.

Our code (Apache-friendly wrapper). Does not import GGPS.
OpenSfM spherical shots become cameras.txt PINHOLE dummy + images.txt + points3D.
GGPS reader ignores PINHOLE params when default_camera_type=3.
"""
from __future__ import annotations

import json
import math
import os
import struct
import sys
from pathlib import Path


def aa_to_R(aa):
    x, y, z = float(aa[0]), float(aa[1]), float(aa[2])
    theta = math.sqrt(x * x + y * y + z * z)
    if theta < 1e-12:
        return ((1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0))
    kx, ky, kz = x / theta, y / theta, z / theta
    c, s = math.cos(theta), math.sin(theta)
    v = 1.0 - c
    return (
        (c + kx * kx * v, kx * ky * v - kz * s, kx * kz * v + ky * s),
        (ky * kx * v + kz * s, c + ky * ky * v, ky * kz * v - kx * s),
        (kz * kx * v - ky * s, kz * ky * v + kx * s, c + kz * kz * v),
    )


def rotmat_to_qvec(R):
    Rxx, Ryx, Rzx = R[0][0], R[1][0], R[2][0]
    Rxy, Ryy, Rzy = R[0][1], R[1][1], R[2][1]
    Rxz, Ryz, Rzz = R[0][2], R[1][2], R[2][2]
    K = [
        [Rxx - Ryy - Rzz, 0, 0, 0],
        [Ryx + Rxy, Ryy - Rxx - Rzz, 0, 0],
        [Rzx + Rxz, Rzy + Ryz, Rzz - Rxx - Ryy, 0],
        [Ryz - Rzy, Rzx - Rxz, Rxy - Ryx, Rxx + Ryy + Rzz],
    ]
    for i in range(4):
        for j in range(i):
            K[j][i] = K[i][j]
    # power iteration on K for largest eigenvector (4x4, fine)
    v = [0.0, 0.0, 0.0, 1.0]
    for _ in range(32):
        nv = [sum(K[i][j] * v[j] for j in range(4)) for i in range(4)]
        n = math.sqrt(sum(a * a for a in nv)) or 1.0
        v = [a / n for a in nv]
    q = [v[3], v[0], v[1], v[2]]
    if q[0] < 0:
        q = [-a for a in q]
    return q


def write_ascii_ply(path, xyz_rgb):
    n = len(xyz_rgb)
    with open(path, "w", encoding="ascii", newline="\n") as f:
        f.write("ply\nformat ascii 1.0\n")
        f.write("element vertex %d\n" % n)
        f.write("property float x\nproperty float y\nproperty float z\n")
        f.write("property uchar red\nproperty uchar green\nproperty uchar blue\n")
        f.write("end_header\n")
        for x, y, z, r, g, b in xyz_rgb:
            f.write("%f %f %f %d %d %d\n" % (x, y, z, r, g, b))


def main():
    if len(sys.argv) < 3:
        print("usage: export_opensfm_to_ggps.py <opensfm_dataset> <scene_dir>", file=sys.stderr)
        return 2
    dataset = Path(sys.argv[1])
    scene = Path(sys.argv[2])
    rec_path = dataset / "reconstruction.json"
    if not rec_path.is_file():
        print("missing %s" % rec_path, file=sys.stderr)
        return 1
    data = json.loads(rec_path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        rec = data[0] if data else {}
    else:
        rec = data
    cameras = rec.get("cameras") or {}
    shots = rec.get("shots") or {}
    points = rec.get("points") or {}
    if not shots:
        print("OpenSfM reconstruction has no shots", file=sys.stderr)
        return 1
    cam0 = next(iter(cameras.values())) if cameras else {}
    width = int(cam0.get("width") or 2)
    height = int(cam0.get("height") or 1)
    proj = str(cam0.get("projection_type") or "")
    print("OpenSfM camera projection_type=%s %dx%d shots=%d points=%d" % (proj, width, height, len(shots), len(points)))
    if proj and proj not in ("spherical", "equirectangular", "panoramic"):
        print("WARNING: expected spherical/equirectangular, got %s" % proj)

    frames = []
    for name in sorted(shots.keys()):
        sh = shots[name]
        R = aa_to_R(sh.get("rotation") or [0, 0, 0])
        t = sh.get("translation") or [0, 0, 0]
        q = rotmat_to_qvec(R)
        frames.append({"name": os.path.basename(name), "qvec": q, "tvec": [float(t[0]), float(t[1]), float(t[2])]})

    xyz_rgb = []
    for p in points.values():
        c = p.get("coordinates") or [0, 0, 0]
        col = p.get("color") or [200, 200, 200]
        xyz_rgb.append((float(c[0]), float(c[1]), float(c[2]), int(col[0]), int(col[1]), int(col[2])))

    sparse = scene / "sparse" / "0"
    rec_dir = scene / "reconstruction"
    sparse.mkdir(parents=True, exist_ok=True)
    rec_dir.mkdir(parents=True, exist_ok=True)

    cam_txt = sparse / "cameras.txt"
    with cam_txt.open("w", encoding="utf-8", newline="\n") as f:
        f.write("# CAMERA_ID, MODEL, WIDTH, HEIGHT, PARAMS[]\n")
        f.write("# dummy PINHOLE for GGPS default_camera_type=3 (ERP)\n")
        fx, fy = float(width), float(height)
        f.write("1 PINHOLE %d %d %.6f %.6f %.6f %.6f\n" % (width, height, fx, fy, width / 2.0, height / 2.0))

    img_txt = sparse / "images.txt"
    with img_txt.open("w", encoding="utf-8", newline="\n") as f:
        f.write("# IMAGE_ID, QW, QX, QY, QZ, TX, TY, TZ, CAMERA_ID, NAME\n")
        f.write("# POINTS2D[] as (X, Y, POINT3D_ID)\n")
        for i, fr in enumerate(frames, start=1):
            q, t = fr["qvec"], fr["tvec"]
            f.write(
                "%d %.10f %.10f %.10f %.10f %.10f %.10f %.10f 1 %s\n"
                % (i, q[0], q[1], q[2], q[3], t[0], t[1], t[2], fr["name"])
            )
            f.write("\n")

    pts_txt = sparse / "points3D.txt"
    with pts_txt.open("w", encoding="utf-8", newline="\n") as f:
        f.write("# POINT3D_ID, X, Y, Z, R, G, B, ERROR, TRACK[]\n")
        for i, row in enumerate(xyz_rgb, start=1):
            x, y, z, r, g, b = row
            f.write("%d %.6f %.6f %.6f %d %d %d 0.0\n" % (i, x, y, z, r, g, b))

    ply = sparse / "points3D.ply"
    write_ascii_ply(ply, xyz_rgb if xyz_rgb else [(0, 0, 0, 200, 200, 200)])
    colorized = rec_dir / "colorized.ply"
    write_ascii_ply(colorized, xyz_rgb if xyz_rgb else [(0, 0, 0, 200, 200, 200)])

    # GGPS prepare script also looks for openMVG JSON; write a tiny spherical stub so layout is honest.
    sfm = {
        "intrinsics": [
            {
                "key": 0,
                "value": {
                    "polymorphic_name": "spherical",
                    "ptr_wrapper": {"data": {"width": width, "height": height}},
                },
            }
        ],
        "views": [],
        "extrinsics": [],
        "note": "Exported from OpenSfM spherical reconstruction by ggps-drop-app. Not an openMVG bin.",
    }
    (rec_dir / "sfm_data_full.json").write_text(json.dumps(sfm, indent=2), encoding="utf-8")

    names = [fr["name"] for fr in frames]
    hold = 8
    train, test = [], []
    for i, n in enumerate(names):
        (test if (i % hold == 0 and len(names) > hold) else train).append(n)
    if not train:
        train = list(names)
        test = []
    (scene / "train.txt").write_text("\n".join(train) + "\n", encoding="utf-8")
    (scene / "test.txt").write_text("\n".join(test) + "\n", encoding="utf-8")

    imgs = scene / "imgs"
    images = scene / "images"
    if not imgs.exists() and images.is_dir():
        try:
            os.symlink("images", imgs, target_is_directory=True)
        except OSError:
            pass
    print("wrote %s (%d frames, %d points)" % (sparse, len(frames), len(xyz_rgb)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
