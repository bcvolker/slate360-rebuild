r"""THE FIX: place the DroneDeploy map so it aligns to the THERMAL, by
registering it (RGB->RGB, reliable) to the colmap orthophoto the thermal is
already locked to -- instead of by its own georef (which put it 1-3m off the
thermal).

Verified premise (tools/t_thermal_vs_colmap.jpg): the thermal sits EXACTLY on
colmap_rgb_orthomosaic_v3.jpg crop [5327:, 2942:] (the accepted alignment).

Chain: DD lossless px --SIFT--> colmap-crop px (3cm) --x3--> 1cm deck frame.
ONE Lanczos warp for sharpness. DD's own alpha for the footprint.
"""
import os

import cv2
import numpy as np
import tifffile

D = r"C:\ASU-Survey\deliverables"
OUT = r"C:\ASU-Survey\out"

arr = tifffile.TiffFile(os.path.join(D, "dd_ortho_lossless.tif")).pages[0].asarray()
dd_rgb = arr[:, :, :3][:, :, ::-1].copy()  # BGR
dd_alpha = arr[:, :, 3]
IH, IW = dd_rgb.shape[:2]

colmap = cv2.imread(os.path.join(D, "colmap_rgb_orthomosaic_v3.jpg"))
TH, TW = 2711, 4045
crop = colmap[5327:5327 + TH, 2942:2942 + TW]  # thermal frame at 3cm
print("DD", IW, "x", IH, "  colmap crop", crop.shape)

# SIFT match at reduced DD res (full-res is degenerate on repetitive texture)
SW = 2400
s_pre = SW / IW
dds = cv2.resize(dd_rgb, (SW, int(IH * s_pre)), interpolation=cv2.INTER_AREA)
sift = cv2.SIFT_create(nfeatures=20000)
k1, d1 = sift.detectAndCompute(cv2.cvtColor(dds, cv2.COLOR_BGR2GRAY), None)
k2, d2 = sift.detectAndCompute(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY), None)
raw = cv2.BFMatcher().knnMatch(d1, d2, k=2)
good = [m for m, n in raw if m.distance < 0.75 * n.distance]
src = np.float32([k1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
dst = np.float32([k2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
Ms, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC,
                                      ransacReprojThreshold=6, maxIters=20000, confidence=0.999)
inl = inl.ravel().astype(bool)
proj = (Ms @ np.c_[src.reshape(-1, 2), np.ones(len(src))].T).T
res = np.hypot(*(proj - dst.reshape(-1, 2)).T)[inl]
print("SIFT DD->colmap: %d inliers, residual median %.1f cm p90 %.1f cm"
      % (inl.sum(), np.median(res) * 3, np.percentile(res, 90) * 3))
assert inl.sum() > 30 and np.median(res) > 0.05, "degenerate"

# Ms: small-DD -> crop(3cm). full-DD -> small-DD is diag(s_pre).
# crop(3cm) -> 1cm frame is x3. Compose all into one 2x3.
M = Ms.copy()
M[:, 0] *= s_pre
M[:, 1] *= s_pre  # now full-DD -> crop3cm

def h(m):
    return np.vstack([m, [0, 0, 1]])
S3 = np.array([[3.0, 0, 0], [0, 3.0, 0]])          # crop3cm -> 1cm frame
comp = (h(S3) @ h(M))[:2]

W1, H1 = 12135, 8133
rgb_w = cv2.warpAffine(dd_rgb, comp, (W1, H1), flags=cv2.INTER_LANCZOS4, borderValue=(0, 0, 0))
a_w = cv2.warpAffine(dd_alpha, comp, (W1, H1), flags=cv2.INTER_NEAREST, borderValue=0)
out = cv2.cvtColor(rgb_w, cv2.COLOR_BGR2BGRA)
out[:, :, 3] = a_w
cv2.imwrite(os.path.join(D, "deck_ortho_colmapaligned_1cm.png"), out, [cv2.IMWRITE_PNG_COMPRESSION, 3])
print("wrote deck_ortho_colmapaligned_1cm.png  coverage %.1f%%" % (100 * (a_w > 0).mean()))

# proof: overlay thermal on the NEW aligned map
z = np.load(os.path.join(D, "mosaic_main_flight_v5.npz"))
T = z["temperatures"].astype(np.float32)
fin = np.isfinite(T)
mapc = cv2.resize(out[:, :, :3], (TW, TH), interpolation=cv2.INTER_AREA)
lo, hi = np.nanpercentile(T[fin], 2), np.nanpercentile(T[fin], 98)
x = np.clip((T - lo) / max(hi - lo, 1e-6), 0, 1)
x = np.nan_to_num(x)
heat = cv2.applyColorMap((x * 255).astype(np.uint8), cv2.COLORMAP_INFERNO)
al = (fin.astype(np.float32) * 0.5)[..., None]
over = (mapc.astype(np.float32) * (1 - al) + heat.astype(np.float32) * al).astype(np.uint8)
cv2.imwrite(os.path.join(OUT, "t_dd_aligned_proof.jpg"),
            cv2.resize(over, (1500, int(1500 * TH / TW))), [cv2.IMWRITE_JPEG_QUALITY, 90])
print("wrote t_dd_aligned_proof.jpg")
