r"""Keystone test: can the DroneDeploy ortho be registered into my thermal frame
with a clean 2D similarity?

Both are true nadir orthophotos of the same stadium, so a rotation+scale+
translation should align them with many inliers. If it does, the whole plan
holds: DD ortho becomes the clean base map, warped into the exact frame the
thermal panorama is already aligned to -> swipe works, thermal alignment
preserved, no re-registration of the fragile temperature grid.
"""
import cv2
import numpy as np

OUT = r"C:\ASU-Survey\out"
DELIV = r"C:\ASU-Survey\deliverables"

# DroneDeploy ortho render -> autocrop the white page margins to just the map
dd = cv2.imread(OUT + r"\dd_ortho_page.png")
g = cv2.cvtColor(dd, cv2.COLOR_BGR2GRAY)
nonwhite = (g < 235).astype(np.uint8)
nonwhite = cv2.morphologyEx(nonwhite, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
ys, xs = np.nonzero(nonwhite)
# drop the title text band at very top by taking the largest solid block
x0, x1 = xs.min(), xs.max()
y0, y1 = ys.min(), ys.max()
ddm = dd[y0:y1, x0:x1]
print("DD map crop", ddm.shape)
cv2.imwrite(OUT + r"\dd_map_only.jpg", ddm, [cv2.IMWRITE_JPEG_QUALITY, 92])

# my reference ortho (ENU axis-aligned, 3 cm)
mine = cv2.imread(DELIV + r"\colmap_rgb_orthomosaic_v3.jpg")
print("my ortho", mine.shape)

gm = cv2.cvtColor(mine, cv2.COLOR_BGR2GRAY)
gd = cv2.cvtColor(ddm, cv2.COLOR_BGR2GRAY)

sift = cv2.SIFT_create(nfeatures=20000)
k1, d1 = sift.detectAndCompute(gd, None)   # DD (source)
k2, d2 = sift.detectAndCompute(gm, None)   # mine (target)
print("kp DD %d  mine %d" % (len(k1), len(k2)))

bf = cv2.BFMatcher()
raw = bf.knnMatch(d1, d2, k=2)
good = [m for m, n in raw if m.distance < 0.75 * n.distance]
print("good matches", len(good))

src = np.float32([k1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
dst = np.float32([k2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC,
                                     ransacReprojThreshold=6.0,
                                     maxIters=20000, confidence=0.999)
inl = inl.ravel().astype(bool)
scale = np.hypot(M[0, 0], M[0, 1])
rot = np.degrees(np.arctan2(M[1, 0], M[0, 0]))
print("inliers %d / %d" % (inl.sum(), len(good)))
print("similarity: scale %.4f  rot %.2f deg  tx %.1f ty %.1f"
      % (scale, rot, M[0, 2], M[1, 2]))

# residual on inliers
proj = (M @ np.c_[src.reshape(-1, 2), np.ones(len(src))].T).T
res = np.hypot(*(proj - dst.reshape(-1, 2)).T)[inl]
print("inlier residual px (3cm): median %.2f  p90 %.2f  = %.1f/%.1f cm"
      % (np.median(res), np.percentile(res, 90),
         np.median(res) * 3, np.percentile(res, 90) * 3))

# warp DD into my frame and blend for a visual check
warp = cv2.warpAffine(ddm, M, (mine.shape[1], mine.shape[0]))
blend = cv2.addWeighted(mine, 0.5, warp, 0.5, 0)
cv2.imwrite(OUT + r"\dd_registered_blend.jpg",
            cv2.resize(blend, (1600, int(1600 * blend.shape[0] / blend.shape[1]))),
            [cv2.IMWRITE_JPEG_QUALITY, 88])
np.save(DELIV + r"\dd_to_mine_affine.npy", M)
print("saved dd_to_mine_affine.npy + blend")
