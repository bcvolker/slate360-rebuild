r"""Definitive resolution diagnostic: take one L3 tile (what the viewer shows at
full zoom) and the SAME ground from the native DroneDeploy GeoTIFF, display both
at the same physical scale. If the L3 tile is visibly softer -> the ENU warp is
the culprit and we must serve native-grid tiles. If they match -> the pipeline is
fine and the issue is display/level-selection.
"""
import os

import cv2
import numpy as np
import tifffile

D = r"C:\ASU-Survey\deliverables"
OUT = r"C:\ASU-Survey\out"

# pick an L3 tile with real deck texture (drain / HVAC area)
# L3 grid: 12135x8133, 512px tiles. tile (8,7) ~ x4096-4608, y3584-4096
tx, ty = 8, 7
tile = cv2.imread(os.path.join(D, "tiles", "L3", "%d_%d.png" % (tx, ty)), cv2.IMREAD_UNCHANGED)
print("L3 tile", tile.shape if tile is not None else "MISSING")
tile_rgb = tile[:, :, :3]

# same ground from native GeoTIFF: map frame px -> source px via inverse affine
M = np.load(os.path.join(D, "m1_lossless_affine.npy"))
Minv = cv2.invertAffineTransform(M)
fx0, fy0 = tx * 512, ty * 512
fpts = np.float32([[fx0, fy0], [fx0 + 512, fy0], [fx0, fy0 + 512]])
spts = cv2.transform(fpts.reshape(-1, 1, 2), Minv).reshape(-1, 2)
sx0, sy0 = spts[0]
ssz = int(np.hypot(spts[1][0] - spts[0][0], spts[1][1] - spts[0][1]))
arr = tifffile.TiffFile(os.path.join(D, "dd_ortho_lossless.tif")).pages[0].asarray()
nat = arr[int(sy0):int(sy0) + ssz, int(sx0):int(sx0) + ssz, :3][:, :, ::-1]
print("native crop", nat.shape, "(source px for the same 512px tile)")


def acut(bgr):
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    return float(cv2.Laplacian(g, cv2.CV_32F).var())


# display both at 2x for the eye, side by side, native upsampled to tile size
nat_disp = cv2.resize(nat, (512, 512), interpolation=cv2.INTER_LANCZOS4)
print("acutance -- L3 tile: %.1f   native(matched): %.1f   native(own res): %.1f"
      % (acut(tile_rgb), acut(nat_disp), acut(nat)))


def lab(im, t):
    im = cv2.resize(im, (512, 512), interpolation=cv2.INTER_NEAREST).copy()
    cv2.putText(im, t, (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 4)
    cv2.putText(im, t, (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 1)
    return im


out = np.hstack([lab(tile_rgb, "L3 tile (viewer)"), lab(nat, "native GeoTIFF")])
cv2.imwrite(os.path.join(OUT, "diag_tile_vs_native.jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 96])
print("wrote diag_tile_vs_native.jpg")
