"""R213-LFS-IGS-1: export A's exact training faces + PINHOLE COLMAP model for LichtFeld (no SfM).

Replicates Spirula v2026.9.24 (183b2c6d) as run for A (`360-camera`, warp_to_pinhole, uniform face fit):
- RGB: stb_image decode (src/external/stb_image_impl.cpp; same library Spirula's DataManager uses), /255, then one float
  bilinear tap per face pixel centre (warp.slang _wp_bilinear: x-0.5, floor, 4 taps) along the face ray
  az + u*ax + v*ay (warp.slang _wp_face_ray), projected with the THIN_PRISM_FISHEYE source model.
- Faces: 5 per fisheye, 1718x1718, f = c = 859 (CameraMath.cpp plan_split_faces, uniform fit).
- Mask: binarise (!=0), erode by mask_boundary_offset 0.005*sqrt(W*H) px with the signed EDT rule
  (DistanceTransform.h: keep if dist_to_fg - dist_to_bg <= offset), then per face nearest sample (floor, out of bounds = 0)
  (warp.slang _wp_mask_byte). Images without a mask file -> all ones (DataManager.cpp decode_mask_of).
- Output faces: 8-bit JPEG quality 100, 4:4:4 (LichtFeld caches JPEG bytes as-is; non-JPEG inputs would be re-encoded
  to q95 inside its loader). Masks: 8-bit PNG 0/255, white = train (LichtFeld --mask-mode ignore).
- COLMAP: one PINHOLE camera 1718 1718 859 859 859 859; image pose = M_k * (R, t); points3D = A's 665,307 points
  (xyz, rgb, error) with empty tracks (LichtFeld --min-track-length default 0 keeps them).
Usage: modal deploy lfs_export.py; spawn export_v2 (writes conditions/LFS_IGS1/data + export_report.json)."""
import modal

app = modal.App("slate360-lfs-export")
vol = modal.Volume.from_name("slate360-recon-experiments")
STB = "https://raw.githubusercontent.com/harry7557558/spirula-studio/183b2c6df72f42ecb9a0500cdad96749847da171/src/external/stb_image.h"
STBC = r'''
#define STB_IMAGE_IMPLEMENTATION
#define STBI_NO_PSD
#define STBI_NO_HDR
#define STBI_NO_PIC
#define STBI_NO_GIF
#include "stb_image.h"
#include <string.h>
int decode(const char* p, unsigned char* out, int ew, int eh, int ch) {
  int w, h, c; unsigned char* img = stbi_load(p, &w, &h, &c, ch);
  if (!img) return -1; if (w != ew || h != eh) { stbi_image_free(img); return -2; }
  memcpy(out, img, (size_t)w * h * ch); stbi_image_free(img); return 0; }
'''
image = (modal.Image.debian_slim(python_version="3.11").apt_install("gcc", "wget", "libgl1", "libglib2.0-0")
         .pip_install("numpy", "opencv-python-headless==4.10.0.84", "scipy", "pycolmap==3.11.1")
         .run_commands(f"mkdir -p /opt/stb && wget -q -O /opt/stb/stb_image.h {STB}",
                       f"cat > /opt/stb/stbdec.c <<'EOF'\n{STBC}\nEOF",
                       "gcc -O2 -shared -fPIC -o /opt/stb/libstbdec.so /opt/stb/stbdec.c"))
A = "/vol/room213/2026-09-29/capture/conditions/A/ws"
OUT = "/vol/room213/2026-09-29/capture/conditions/LFS_IGS1/data"
FISH_AXES = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
             [[0, -1, 0], [0, 0, 1], [-1, 0, 0]], [[1, 0, 0], [0, 0, 1], [0, -1, 0]]]
S, F = 1718, 859.0


def stb_load(path, w, h, ch):
    import ctypes, numpy as np
    lib = ctypes.CDLL("/opt/stb/libstbdec.so"); buf = np.empty((h, w, ch) if ch > 1 else (h, w), np.uint8)
    r = lib.decode(path.encode(), buf.ctypes.data_as(ctypes.c_void_p), w, h, ch)
    if r: raise RuntimeError(f"stb decode {r}: {path}")
    return buf


def project(params, d):
    import numpy as np
    fx, fy, cx, cy, k1, k2, p1, p2, k3, k4, sx1, sx2 = params
    r = np.hypot(d[:, 0], d[:, 1]); th = np.arctan2(r, d[:, 2]); th2 = th * th
    thd = th * (1 + k1 * th2 + k2 * th2 ** 2 + k3 * th2 ** 3 + k4 * th2 ** 4)
    s = np.where(r > 1e-12, thd / np.maximum(r, 1e-12), 1.0)
    u, v = d[:, 0] * s, d[:, 1] * s
    u2, v2, uv = u * u, v * v, u * v; rr = u2 + v2
    du = 2 * p1 * uv + p2 * (rr + 2 * u2) + sx1 * rr
    dv = 2 * p2 * uv + p1 * (rr + 2 * v2) + sx2 * rr
    return np.stack([fx * (u + du) + cx, fy * (v + dv) + cy], 1), th


def face_maps(params):
    """Per face: continuous source coords (pixel centre at +0.5) for every face pixel centre, and theta."""
    import numpy as np
    jj, ii = np.meshgrid(np.arange(S) + 0.5, np.arange(S) + 0.5, indexing="ij")
    df = np.stack([(ii - F) / F, (jj - F) / F, np.ones_like(ii)], -1).reshape(-1, 3)
    out = []
    for M in FISH_AXES:
        uv, th = project(params, df @ np.array(M, float))
        out.append((uv[:, 0].reshape(S, S), uv[:, 1].reshape(S, S), th.reshape(S, S)))
    return out


def bilinear(img, X, Y):
    """warp.slang _wp_bilinear: x-=0.5, clamp to [-8, W+8], floor, 4 taps; out-of-image taps contribute 0 (padding)."""
    import numpy as np
    H, W = img.shape[:2]
    x = np.clip(X - 0.5, -8, W + 8); y = np.clip(Y - 0.5, -8, H + 8)
    x0 = np.floor(x).astype(np.int64); y0 = np.floor(y).astype(np.int64); wx1 = (x - x0)[..., None]; wy1 = (y - y0)[..., None]
    acc = np.zeros(X.shape + (img.shape[2],), np.float64)
    for dx, dy, w in ((0, 0, (1 - wx1) * (1 - wy1)), (1, 0, wx1 * (1 - wy1)), (0, 1, (1 - wx1) * wy1), (1, 1, wx1 * wy1)):
        xi, yi = x0 + dx, y0 + dy; ok = (xi >= 0) & (xi < W) & (yi >= 0) & (yi < H)
        v = img[np.clip(yi, 0, H - 1), np.clip(xi, 0, W - 1)].astype(np.float64) / 255.0
        acc += np.where(ok[..., None], v, 0.0) * w
    return acc


def erode_mask(m):
    import numpy as np
    from scipy.ndimage import distance_transform_edt
    off = -0.005 * np.sqrt(m.shape[0] * m.shape[1])
    fg = m != 0
    if fg.all() or not fg.any(): return fg
    d_fg = distance_transform_edt(~fg); d_bg = distance_transform_edt(fg)   # distance to nearest fg / bg pixel
    return (d_fg - d_bg) <= off


def do_image(job):
    import cv2, numpy as np, os
    name, params, w, h, maps_key = job
    maps = _MAPS[maps_key]
    stem = name.replace("/", "_").rsplit(".", 1)[0]; res = []
    if all(os.path.exists(f"{OUT}/images/{stem}_f{k}.jpg") and os.path.exists(f"{OUT}/masks/{stem}_f{k}.png") for k in range(5)):
        return name, [{"face": f"{stem}_f{k}", "mask_frac": None, "quant_err_max": None, "reused": True} for k in range(5)]
    img = stb_load(f"{A}/images/{name}", w, h, 3)
    mp = f"{A}/masks/{os.path.splitext(name)[0]}.png"
    msrc = erode_mask(stb_load(mp, w, h, 1)) if os.path.exists(mp) else np.ones((h, w), bool)
    for k, (X, Y, th) in enumerate(maps):
        face = bilinear(img, X, Y)
        q = np.clip(np.round(face * 255.0), 0, 255).astype(np.uint8)
        fn = f"{stem}_f{k}"
        cv2.imwrite(f"{OUT}/images/{fn}.jpg", q[..., ::-1], [cv2.IMWRITE_JPEG_QUALITY, 100, cv2.IMWRITE_JPEG_SAMPLING_FACTOR, cv2.IMWRITE_JPEG_SAMPLING_FACTOR_444])
        xs = np.floor(np.clip(X, -8, w + 8)).astype(np.int64); ys = np.floor(np.clip(Y, -8, h + 8)).astype(np.int64)
        inb = (xs >= 0) & (xs < w) & (ys >= 0) & (ys < h) & (th < np.radians(110))
        fm = np.where(inb, msrc[np.clip(ys, 0, h - 1), np.clip(xs, 0, w - 1)], False)
        cv2.imwrite(f"{OUT}/masks/{fn}.png", (fm * 255).astype(np.uint8))
        res.append({"face": fn, "mask_frac": float(fm.mean()), "quant_err_max": float(np.abs(q / 255.0 - face).max())})
    return name, res


_MAPS = {}


def _cfw(im):
    c = im.cam_from_world
    return c() if callable(c) else c


@app.function(image=image, cpu=32.0, memory=131072, timeout=4 * 3600, volumes={"/vol": vol}, retries=0)
def export_v2() -> dict:
    import json, os, struct, time, numpy as np, pycolmap
    from multiprocessing import Pool
    from pathlib import Path
    vol.reload(); t0 = time.time()
    if Path(f"{OUT}/sparse/0/images.bin").exists(): raise RuntimeError("export exists")
    for d in ("images", "masks", "sparse/0"): Path(f"{OUT}/{d}").mkdir(parents=True, exist_ok=True)
    rec = pycolmap.Reconstruction(f"{A}/sparse/0")
    cams = {cid: c for cid, c in rec.cameras.items()}
    for cid, c in cams.items():
        assert "THIN_PRISM" in str(c.model), c.model
        _MAPS[cid] = face_maps(list(c.params))
    jobs = [(im.name, list(cams[im.camera_id].params), cams[im.camera_id].width, cams[im.camera_id].height, im.camera_id)
            for im in sorted(rec.images.values(), key=lambda i: i.name)]
    with Pool(30) as pool:
        done = dict(pool.imap_unordered(do_image, jobs, chunksize=4))
    vol.commit()
    # ---- COLMAP binary (PINHOLE, one camera) ----
    def quat(R):
        return np.asarray(pycolmap.Rotation3d(R).quat)  # xyzw
    with open(f"{OUT}/sparse/0/cameras.bin", "wb") as f:
        f.write(struct.pack("<Q", 1)); f.write(struct.pack("<iiQQ", 1, 1, S, S)); f.write(struct.pack("<4d", F, F, F, F))
    rows = []; iid = 0
    for im in sorted(rec.images.values(), key=lambda i: i.name):
        cw = _cfw(im); Rs = np.asarray(cw.rotation.matrix()); ts = np.asarray(cw.translation)
        stem = im.name.replace("/", "_").rsplit(".", 1)[0]
        for k, M in enumerate(FISH_AXES):
            iid += 1; Rf = np.array(M, float) @ Rs; tf = np.array(M, float) @ ts
            x, y, z, w = quat(Rf); rows.append((iid, (w, x, y, z), tf, f"{stem}_f{k}.jpg", im.name, k))
    with open(f"{OUT}/sparse/0/images.bin", "wb") as f:
        f.write(struct.pack("<Q", len(rows)))
        for iid, q, t, name, _, _ in rows:
            f.write(struct.pack("<i4d3di", iid, *q, *t, 1)); f.write(name.encode() + b"\0"); f.write(struct.pack("<Q", 0))
    pts = rec.points3D
    with open(f"{OUT}/sparse/0/points3D.bin", "wb") as f:
        f.write(struct.pack("<Q", len(pts)))
        for pid, p in pts.items():
            f.write(struct.pack("<Q3d3Bd", pid, *np.asarray(p.xyz), *[int(c) for c in p.color], float(p.error))); f.write(struct.pack("<Q", 0))
    json.dump([{"image_id": r[0], "name": r[3], "src": r[4], "face": r[5]} for r in rows], open(f"{OUT}/face_index.json", "w"))
    mf = [x["mask_frac"] for v in done.values() for x in v if x["mask_frac"] is not None]
    qe = [x["quant_err_max"] for v in done.values() for x in v if x["quant_err_max"] is not None]
    if not mf: mf, qe = [float("nan")], [float("nan")]
    rep = {"src_images": len(jobs), "faces": len(rows), "points3D": len(pts), "cameras_src": {int(k): str(v.model) for k, v in cams.items()},
           "mask_frac_min_p50_max": [float(np.min(mf)), float(np.median(mf)), float(np.max(mf))],
           "faces_mask_empty": int(sum(1 for x in mf if x == 0)), "quant_err_max": float(np.max(qe)), "seconds": round(time.time() - t0), "faces_reused": sum(1 for v in done.values() for x in v if x.get("reused"))}
    json.dump(rep, open(f"{OUT}/../export_report.json", "w"), indent=1); vol.commit()
    return rep
