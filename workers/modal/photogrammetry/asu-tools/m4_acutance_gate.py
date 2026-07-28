r"""M4: acutance gate. Measure sharpness (variance of Laplacian) of the SAME
physical crop at each pipeline stage: (a) the lossless DD export master,
(b) the placed/warped master, (c) the reconstructed finest-tile mosaic. Proves
where any blur enters. Ship rule: (b) >= 0.90*(a) [one Lanczos warp is mild],
(c) == (b) within noise [finest tiles are byte copies].
"""
import glob
import os

import cv2
import numpy as np
import tifffile

D = r"C:\ASU-Survey\deliverables"
TILES = os.path.join(D, "tiles")


def acut(bgr):
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    return float(cv2.Laplacian(g, cv2.CV_32F).var())


# (b) placed master crop: pick a textured deck area (HVAC region on left building)
placed = cv2.imread(os.path.join(D, "deck_ortho_final_1cm.png"), cv2.IMREAD_UNCHANGED)
# frame px of a known sharp feature cluster (left-building HVAC ~ x 3800-4600, y 3400-4200 in 12135-frame)
cx, cy, s = 4200, 3800, 400
b_crop = placed[cy:cy + s, cx:cx + s, :3]
print("(b) placed/warped master acutance: %.1f" % acut(b_crop))

# (c) reconstruct the same region from finest tiles
meta_w, meta_h = 12135, 8133
TS = 512
tile_ext = "png"
recon = np.zeros((s, s, 3), np.uint8)
for yy in range(cy, cy + s):
    pass
# assemble by tile grid
L = 3
for ty in range((cy) // TS, (cy + s) // TS + 1):
    for tx in range((cx) // TS, (cx + s) // TS + 1):
        p = os.path.join(TILES, "L%d" % L, "%d_%d.%s" % (tx, ty, tile_ext))
        if not os.path.exists(p):
            continue
        tile = cv2.imread(p, cv2.IMREAD_UNCHANGED)
        if tile is None:
            continue
        tile = tile[:, :, :3]
        ox, oy = tx * TS, ty * TS
        for j in range(tile.shape[0]):
            gy = oy + j
            if gy < cy or gy >= cy + s:
                continue
            for cond in [True]:
                pass
        # vectorized copy of the overlapping region
        y0 = max(cy, oy); y1 = min(cy + s, oy + tile.shape[0])
        x0 = max(cx, ox); x1 = min(cx + s, ox + tile.shape[1])
        if y1 <= y0 or x1 <= x0:
            continue
        recon[y0 - cy:y1 - cy, x0 - cx:x1 - cx] = tile[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
print("(c) finest-tile reconstruction acutance: %.1f" % acut(recon))

# (a) DD export master, same physical spot. Map frame px back through the placement
# affine inverse to source px, crop there, so we compare the SAME ground.
M = np.load(os.path.join(D, "m1_lossless_affine.npy"))
Minv = cv2.invertAffineTransform(M)
# frame corner pts of our crop -> source px
fpts = np.float32([[cx, cy], [cx + s, cy], [cx, cy + s]])
spts = cv2.transform(fpts.reshape(-1, 1, 2), Minv).reshape(-1, 2)
sx0, sy0 = spts[0]
ssz = int(np.hypot(spts[1][0] - spts[0][0], spts[1][1] - spts[0][1]))
arr = tifffile.TiffFile(os.path.join(D, "dd_ortho_lossless.tif")).pages[0].asarray()
a_crop = arr[int(sy0):int(sy0) + ssz, int(sx0):int(sx0) + ssz, :3][:, :, ::-1]
print("(a) DD lossless export master acutance: %.1f  (source crop %dpx)" % (acut(a_crop), ssz))

# save the three crops for eyes
for nm, im in [("a_export", a_crop), ("b_warped", b_crop), ("c_tiles", recon)]:
    cv2.imwrite(os.path.join(r"C:\ASU-Survey\out", "m4_%s.jpg" % nm),
                cv2.resize(im, (400, 400), interpolation=cv2.INTER_NEAREST),
                [cv2.IMWRITE_JPEG_QUALITY, 95])
print("wrote m4_a_export/b_warped/c_tiles.jpg")
