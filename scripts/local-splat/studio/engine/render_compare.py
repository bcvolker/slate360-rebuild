"""Render two PLYs (original vs cleaned) from the same training cameras side by side."""
import sys
from pathlib import Path
import numpy as np, torch, torch.nn.functional as F
from PIL import Image
from gsplat.rendering import rasterization
import pycolmap

ply_a, ply_b, sparse, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4])
dev = torch.device("cuda")

def load(ply):
    raw = ply.read_bytes(); end = raw.index(b"end_header\n"); header = raw[:end].decode()
    n = int([l for l in header.splitlines() if l.startswith("element vertex")][0].split()[2])
    props = [l.split()[2] for l in header.splitlines() if l.startswith("property")]
    arr = np.frombuffer(raw[end + 11:], dtype=np.dtype([(p, "<f4") for p in props]), count=n)
    means = np.column_stack([arr["x"], arr["y"], arr["z"]]).astype(np.float32)
    dc = np.column_stack([arr["f_dc_0"], arr["f_dc_1"], arr["f_dc_2"]]).astype(np.float32)
    rest = np.column_stack([arr[f"f_rest_{i}"] for i in range(45)]).astype(np.float32)
    sh = np.stack([rest[:, ch * 15:(ch + 1) * 15] for ch in range(3)], axis=2)
    return dict(
        means=torch.from_numpy(means).to(dev),
        scales=torch.exp(torch.from_numpy(np.column_stack([arr["scale_0"], arr["scale_1"], arr["scale_2"]]).astype(np.float32)).to(dev)),
        quats=F.normalize(torch.from_numpy(np.column_stack([arr["rot_0"], arr["rot_1"], arr["rot_2"], arr["rot_3"]]).astype(np.float32)).to(dev), dim=-1),
        opacities=torch.sigmoid(torch.from_numpy(arr["opacity"].astype(np.float32)).to(dev)),
        colors=torch.cat([torch.from_numpy(dc).to(dev)[:, None, :], torch.from_numpy(sh).to(dev)], 1),
    ), n

rec = pycolmap.Reconstruction(str(sparse))
imgs = sorted(rec.images.values(), key=lambda i: i.name)
picks = [imgs[len(imgs) // 4], imgs[len(imgs) // 2], imgs[3 * len(imgs) // 4]]
rows = []
for ply in (ply_a, ply_b):
    P, n = load(ply)
    tiles = []
    for im in picks:
        cam = rec.cameras[im.camera_id]
        W, H = cam.width, cam.height
        scale = 640 / W
        K = np.array(cam.calibration_matrix(), np.float32); K[:2] *= scale
        w2c = np.eye(4, dtype=np.float32); w2c[:3, :4] = im.cam_from_world().matrix()
        with torch.no_grad():
            img, _, _ = rasterization(P["means"], P["quats"], P["scales"], P["opacities"], P["colors"],
                                      torch.from_numpy(w2c).to(dev)[None], torch.from_numpy(K).to(dev)[None],
                                      int(W * scale), int(H * scale), sh_degree=3, render_mode="RGB")
        tiles.append((img[0].clamp(0, 1).cpu().numpy() * 255).astype(np.uint8))
    rows.append(np.concatenate(tiles, axis=1))
    print(ply.name, "splats", n)
sheet = np.concatenate(rows, axis=0)
Image.fromarray(sheet).save(out)
print("saved", out, sheet.shape)
