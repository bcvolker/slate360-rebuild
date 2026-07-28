r"""All 4 external reviews flagged the same gap: my MI fit was translation+
rotation only, no SCALE. A tiny uncorrected scale error (0.3-0.5%) produces
exactly the observed symptom -- center aligned, drift growing toward edges
(18-30cm at 60m radius for 0.3-0.5% scale error). Test this BEFORE building a
non-rigid spline: fit similarity (uniform scale) and affine (independent x/y
scale + shear) via same-modality COLMAP<->DroneDeploy RGB matches, and see how
much residual each removes vs the current translation+rotation-only fit.
"""
import os

import cv2
import numpy as np

D = r"C:\ASU-Survey\deliverables"
OUT = r"C:\ASU-Survey\out"

colmap = cv2.imread(os.path.join(D, "colmap_rgb_orthomosaic_v3.jpg"))
z = np.load(os.path.join(D, "thermal_final.npz"))
TH, TW = z["temperatures"].shape
colcrop = colmap[5327:5327 + TH, 2942:2942 + TW]
dd = cv2.imread(os.path.join(D, "deck_ortho_final_1cm.png"), cv2.IMREAD_UNCHANGED)
ddc = cv2.resize(dd[:, :, :3], (TW, TH), interpolation=cv2.INTER_AREA)

sift = cv2.SIFT_create(nfeatures=20000)
k1, d1 = sift.detectAndCompute(cv2.cvtColor(colcrop, cv2.COLOR_BGR2GRAY), None)
k2, d2 = sift.detectAndCompute(cv2.cvtColor(ddc, cv2.COLOR_BGR2GRAY), None)
print("keypoints: colmap %d, dd %d" % (len(k1), len(k2)))
raw = cv2.BFMatcher().knnMatch(d1, d2, k=2)
good = [m for m, n in raw if m.distance < 0.75 * n.distance]
src = np.float32([k1[m.queryIdx].pt for m in good])
dst = np.float32([k2[m.trainIdx].pt for m in good])
print("good matches: %d" % len(good))


def eval_model(name, M, mask=None):
    if M is None:
        print("%s: FAILED" % name)
        return None
    s, d = (src, dst) if mask is None else (src[mask.ravel() > 0], dst[mask.ravel() > 0])
    ones = np.ones((len(s), 1))
    pred = (M @ np.hstack([s, ones]).T).T
    res = np.hypot(pred[:, 0] - d[:, 0], pred[:, 1] - d[:, 1])
    a = M[:, :2]
    scale = np.sqrt(abs(np.linalg.det(a)))
    print("%-12s scale=%.4f  n=%d  residual px: median %.2f p90 %.2f max %.2f  (cm: %.1f/%.1f/%.1f)"
          % (name, scale, len(s), np.median(res), np.percentile(res, 90), res.max(),
             np.median(res) * 3, np.percentile(res, 90) * 3, res.max() * 3))
    return res


M_sim, mask_sim = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC,
                                              ransacReprojThreshold=8, maxIters=10000)
eval_model("similarity", M_sim, mask_sim)

M_aff, mask_aff = cv2.estimateAffine2D(src, dst, method=cv2.RANSAC,
                                       ransacReprojThreshold=8, maxIters=10000)
eval_model("affine", M_aff, mask_aff)
print("similarity inliers: %d/%d   affine inliers: %d/%d"
      % (mask_sim.sum() if mask_sim is not None else 0, len(src),
         mask_aff.sum() if mask_aff is not None else 0, len(src)))

if M_sim is not None:
    a = M_sim[:, :2]
    scale = np.sqrt(abs(np.linalg.det(a)))
    print("\nsimilarity scale = %.5f (%.3f%% from 1.0)" % (scale, (scale - 1) * 100))
    print("at 60m radius, this scale error alone predicts %.0f cm drift"
          % (abs(scale - 1) * 6000))

# residual quiver plot (similarity model, INLIERS ONLY) to see the error PATTERN
if M_sim is not None:
    inl = mask_sim.ravel() > 0
    s, d = src[inl], dst[inl]
    ones = np.ones((len(s), 1))
    pred = (M_sim @ np.hstack([s, ones]).T).T
    err = d - pred
    vis = ddc.copy()
    for i in range(len(s)):
        p = tuple(d[i].astype(int))
        cv2.circle(vis, p, 3, (0, 255, 255), -1)
        e = tuple((d[i] + err[i] * 15).astype(int))  # 15x exaggerated
        cv2.arrowedLine(vis, p, e, (0, 0, 255), 2, tipLength=0.3)
    cv2.imwrite(os.path.join(OUT, "t_residual_quiver.jpg"),
                cv2.resize(vis, (1400, int(1400 * TH / TW))), [cv2.IMWRITE_JPEG_QUALITY, 90])
    print("wrote t_residual_quiver.jpg (arrows = similarity-model residual, INLIERS ONLY, 15x exaggerated)")
