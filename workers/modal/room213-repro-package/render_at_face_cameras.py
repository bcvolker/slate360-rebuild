"""Render a trained splat.ply at the exact training-face cameras with the official release binary (no training).
Same path we used for the measurements: `train 360-camera --init-ply <ply> --num-iterations 0 --eval-mode filename`
on a throwaway COLMAP-text dataset containing one real training frame (the parser needs >= 1) plus one PINHOLE eval
camera per view. Each eval view gets a uniquely encoded GT image so renders are matched by content, not output order.

Usage:
  python render_at_face_cameras.py <spirula binary> <splat.ply> <cameras/sparse_0> <physical_frames dir> \
         <cameras/face_cameras_T_table.json> <out dir>
"""
import json, shutil, subprocess, sys
from pathlib import Path

import cv2, numpy as np, pycolmap
from scipy.spatial.transform import Rotation as Rot

SP, PLY, SPARSE, IMAGES, VIEWS, OUT = sys.argv[1:7]
views = json.load(open(VIEWS))["views"]
work = Path("_render_tmp"); shutil.rmtree(work, ignore_errors=True); root = work / "dataset"; (root / "sparse/0").mkdir(parents=True)

rec = pycolmap.Reconstruction(SPARSE); txt = work / "txt"; txt.mkdir(); rec.write_text(str(txt))
cam_lines = [l for l in open(txt / "cameras.txt").read().splitlines() if l and not l.startswith("#")][:1]
cid = int(cam_lines[0].split()[0])
im = next(i for i in rec.images.values() if i.camera_id == cid and (Path(IMAGES) / i.name).exists())
c = im.cam_from_world(); q = Rot.from_matrix(c.rotation.matrix()).as_quat(); t = [float(x) for x in c.translation]
nm = "train/" + im.name.replace("/", "_").replace(".jpg", "_train.jpg")
lines = [f"1 {q[3]!r} {q[0]!r} {q[1]!r} {q[2]!r} {t[0]!r} {t[1]!r} {t[2]!r} {cid} {nm}", ""]
(root / "images" / nm).parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(Path(IMAGES) / im.name, root / "images" / nm)

sizes = {}
for v in views: sizes.setdefault((v["W"], v["H"], v["f"]), 100 + len(sizes))
cams = cam_lines + [f"{k} PINHOLE {W} {H} {float(f)!r} {float(f)!r} {W / 2!r} {H / 2!r}" for (W, H, f), k in sizes.items()]
(root / "sparse/0/cameras.txt").write_text("\n".join(cams) + "\n")
for k, v in enumerate(views):
    q = Rot.from_matrix(np.array(v["R"])).as_quat(); t = [float(x) for x in v["t"]]; name = f"view/v{k:04d}_eval.png"
    lines += [f"{5000 + k} {q[3]!r} {q[0]!r} {q[1]!r} {q[2]!r} {t[0]!r} {t[1]!r} {t[2]!r} {sizes[(v['W'], v['H'], v['f'])]} {name}", ""]
    img = np.zeros((v["H"], v["W"], 3), np.uint8); img[..., 0] = k // 256; img[..., 1] = k % 256; img[..., 2] = 91
    (root / "images" / name).parent.mkdir(parents=True, exist_ok=True); cv2.imwrite(str(root / "images" / name), img)
(root / "sparse/0/images.txt").write_text("\n".join(lines) + "\n")
(root / "sparse/0/points3D.txt").write_text("".join(f"{pid} {p.xyz[0]!r} {p.xyz[1]!r} {p.xyz[2]!r} {int(p.color[0])} {int(p.color[1])} {int(p.color[2])} 0\n"
                                                    for pid, p in list(rec.points3D.items())[:100000]))

cmd = [SP, "train", "360-camera", "--data", str(root), "--image-dir", "images", "--mask-dir", "masks", "--num-iterations", "0",
       "--init-ply", PLY, "--save-eval-images", "1", "--eval-mode", "filename", "--disable-viewer", "1",
       "--output-dir-prefix", str(work), "--output-dir-name", "r", "--device", "0"]
subprocess.run(cmd, check=True)

Path(OUT).mkdir(parents=True, exist_ok=True); n = 0
for g in sorted((work / "r").glob("eval-gt-*.png")):
    gi = cv2.imread(str(g)); k = int(np.median(gi[..., 0])) * 256 + int(np.median(gi[..., 1]))
    if k < len(views) and int(np.median(gi[..., 2])) == 91:
        shutil.copyfile(str(g).replace("eval-gt-", "eval-render-"), Path(OUT) / f"{views[k]['name']}.png"); n += 1
print(f"rendered {n}/{len(views)} -> {OUT}")
