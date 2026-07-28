r"""Register the full-res DroneDeploy ortho into my thermal frame and render it
straight into the 1cm deck frame the tile pyramid uses.

Direct full-res SIFT returned a DEGENERATE transform (repetitive parking-lot /
stadium-seat texture makes RANSAC collapse to a point). The low-res match at
~2200px wide was robust and visually verified, so mirror it: match a downscaled
DD ortho, then scale the transform back up. Same math, robust inliers.

Frames:
  DD full-res px --M_full--> colmap ortho px (3cm ENU) --S--> deck 1cm px
  deck crop starts at colmap (2942,5327) @3cm; 1cm is 3x finer:
  u = 3*(c-2942),  v = 3*(r-5327).
"""
import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"

dd = cv2.imread(DELIV + r"\dd_ortho_fullres.png")
mine = cv2.imread(DELIV + r"\colmap_rgb_orthomosaic_v3.jpg")
print("DD", dd.shape, "mine", mine.shape)

# match at the resolution that worked (~2200 wide)
SW = 2200
s_pre = SW / dd.shape[1]                      # full-res -> small
dds = cv2.resize(dd, (SW, int(dd.shape[0] * s_pre)), interpolation=cv2.INTER_AREA)

gd = cv2.cvtColor(dds, cv2.COLOR_BGR2GRAY)
gm = cv2.cvtColor(mine, cv2.COLOR_BGR2GRAY)
sift = cv2.SIFT_create(nfeatures=20000)
k1, d1 = sift.detectAndCompute(gd, None)
k2, d2 = sift.detectAndCompute(gm, None)
raw = cv2.BFMatcher().knnMatch(d1, d2, k=2)
good = [m for m, n in raw if m.distance < 0.75 * n.distance]
src = np.float32([k1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
dst = np.float32([k2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
Ms, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC,
                                      ransacReprojThreshold=6.0,
                                      maxIters=20000, confidence=0.999)
inl = inl.ravel().astype(bool)
scale_s = np.hypot(Ms[0, 0], Ms[0, 1])
rot = np.degrees(np.arctan2(Ms[1, 0], Ms[0, 0]))
proj = (Ms @ np.c_[src.reshape(-1, 2), np.ones(len(src))].T).T
res = np.hypot(*(proj - dst.reshape(-1, 2)).T)[inl]
print("inliers %d/%d  scale %.4f  rot %.2f  residual median %.1f cm p90 %.1f cm"
      % (inl.sum(), len(good), scale_s, rot,
         np.median(res) * 3, np.percentile(res, 90) * 3))
assert 0.3 < scale_s < 6 and inl.sum() > 30 and np.median(res) > 0.05, \
    "registration looks degenerate"

# Ms maps small-DD -> colmap. small-DD = s_pre * fullres, so
# M_full = Ms @ diag(s_pre): scale the linear part by s_pre, keep translation.
M = Ms.copy()
M[:, 0] *= s_pre
M[:, 1] *= s_pre

def h(m):
    return np.vstack([m, [0, 0, 1]])
S = np.array([[3.0, 0.0, -3 * 2942], [0.0, 3.0, -3 * 5327]])
comp = (h(S) @ h(M))[:2]

W1, H1 = 12135, 8133
warp = cv2.warpAffine(dd, comp, (W1, H1), flags=cv2.INTER_CUBIC,
                      borderValue=(0, 0, 0))
cv2.imwrite(DELIV + r"\deck_ortho_dd_1cm.jpg", warp,
            [cv2.IMWRITE_JPEG_QUALITY, 92])
print("wrote deck_ortho_dd_1cm.jpg %dx%d coverage %.1f%%"
      % (W1, H1, 100 * (warp.max(2) > 6).mean()))
np.save(DELIV + r"\dd_fullres_to_mine_affine.npy", M)

# proof: blend against the thermal-aligned base
base = cv2.imread(DELIV + r"\deck_ortho_toned_1cm.jpg")
blend = cv2.addWeighted(base, 0.5, warp, 0.5, 0)
cv2.imwrite(r"C:\ASU-Survey\out\dd_deck_vs_base.jpg",
            cv2.resize(blend, (1600, int(1600 * H1 / W1))),
            [cv2.IMWRITE_JPEG_QUALITY, 88])
print("wrote out/dd_deck_vs_base.jpg")
