"""PAN — thermal panorama stitching (Modal CPU worker).

Registers N thermal grids (already-decoded temperature arrays, same shape the
Analyze viewer already reads) via OpenCV ORB feature matching + RANSAC
homography, chains them into one coordinate system, and warps + blends them
into a single wider temperature grid in Celsius — same NPZ format
(`temperatures` float array, shape (height, width)) every other capture
already uses, so the existing grid route/viewer/export work unchanged.

Blending is simple weighted-average over the valid-coverage mask (not
multi-band/seam-confidence blending — see the roster build log for that
scope note). Frames are assumed roughly sequential (the order the operator
selected them in); each frame registers against the PREVIOUS one, and
homographies chain so frame i lands in frame 0's coordinate system.
"""

from __future__ import annotations

import numpy as np

MAX_CANVAS_DIM = 8000  # hard cap so a bad homography can't blow up memory


def _to_u8(temps: np.ndarray) -> np.ndarray:
    lo, hi = float(np.min(temps)), float(np.max(temps))
    span = hi - lo if hi > lo else 1.0
    return np.clip((temps - lo) / span * 255, 0, 255).astype(np.uint8)


MIN_INLIERS = 15
# Thermal imagery has far less corner-rich texture than visible-light photos, so a
# homography estimated from few/weak ORB matches can be numerically "valid" (RANSAC
# returns a matrix) but wildly wrong — large scale/shear/perspective distortion that
# compounds badly once chained across frames (confirmed via a synthetic smoke test:
# an unvalidated homography with 0.58x/0.84x scale terms nearly doubled the stitched
# canvas height). Reject anything outside a plausible walked-sweep range and fall
# back to the translation guess instead of trusting a bad fit.
MAX_SCALE_DEVIATION = 0.35  # accept singular values within [1-0.35, 1+0.35]
MAX_PERSPECTIVE = 1e-3  # |h31|, |h32| beyond this = real perspective warp, reject


def _is_plausible_homography(M: np.ndarray) -> bool:
    if M is None or not np.all(np.isfinite(M)):
        return False
    if abs(M[2, 0]) > MAX_PERSPECTIVE or abs(M[2, 1]) > MAX_PERSPECTIVE:
        return False
    singular_values = np.linalg.svd(M[:2, :2], compute_uv=False)
    return bool(np.all(np.abs(singular_values - 1.0) <= MAX_SCALE_DEVIATION))


def _pairwise_homography(cv2, gray_prev: np.ndarray, gray_cur: np.ndarray, prev_shape: tuple[int, int]) -> np.ndarray:
    """Homography mapping `cur` pixel coords -> `prev` pixel coords. Falls back to a
    half-width horizontal-offset guess (a reasonable prior for a walked panorama
    sweep) when there aren't enough matched features, or the fitted homography looks
    implausible, to solve RANSAC reliably — see MIN_INLIERS/_is_plausible_homography."""
    orb = cv2.ORB_create(nfeatures=3000)
    kp_prev, desc_prev = orb.detectAndCompute(gray_prev, None)
    kp_cur, desc_cur = orb.detectAndCompute(gray_cur, None)
    h_prev, w_prev = prev_shape
    fallback = np.array([[1.0, 0.0, w_prev * 0.5], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]])
    if desc_prev is None or desc_cur is None or len(kp_prev) < 4 or len(kp_cur) < 4:
        return fallback
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = sorted(bf.match(desc_cur, desc_prev), key=lambda m: m.distance)[:200]
    if len(matches) < 4:
        return fallback
    src = np.float32([kp_cur[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
    dst = np.float32([kp_prev[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)
    M, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
    inliers = int(mask.sum()) if mask is not None else 0
    if inliers < MIN_INLIERS or not _is_plausible_homography(M):
        return fallback
    return M


def stitch_panorama_grids(temps_list: list[np.ndarray]) -> np.ndarray:
    """Stitches ≥2 (height, width) float Celsius grids into one wider grid."""
    import cv2

    if len(temps_list) < 2:
        return temps_list[0].astype(np.float32)

    grays = [_to_u8(t) for t in temps_list]

    # H[i]: frame i's pixel coords -> frame 0's coord system (chained).
    homographies = [np.eye(3)]
    for i in range(1, len(temps_list)):
        h_i_to_prev = _pairwise_homography(cv2, grays[i - 1], grays[i], temps_list[i - 1].shape)
        homographies.append(homographies[i - 1] @ h_i_to_prev)

    # Canvas bounds = union of every frame's 4 corners transformed through its homography.
    all_pts = []
    for t, H in zip(temps_list, homographies):
        h, w = t.shape
        corners = np.array([[0, 0, 1], [w, 0, 1], [w, h, 1], [0, h, 1]], dtype=np.float64).T
        warped = H @ corners
        all_pts.append(warped[:2] / warped[2])
    pts = np.concatenate(all_pts, axis=1)
    min_x, min_y = pts.min(axis=1)
    max_x, max_y = pts.max(axis=1)
    offset = np.array([[1.0, 0.0, -min_x], [0.0, 1.0, -min_y], [0.0, 0.0, 1.0]])
    canvas_w = min(int(np.ceil(max_x - min_x)), MAX_CANVAS_DIM)
    canvas_h = min(int(np.ceil(max_y - min_y)), MAX_CANVAS_DIM)

    canvas_sum = np.zeros((canvas_h, canvas_w), dtype=np.float64)
    canvas_count = np.zeros((canvas_h, canvas_w), dtype=np.float64)

    for t, H in zip(temps_list, homographies):
        final_h = (offset @ H).astype(np.float64)
        warped_t = cv2.warpPerspective(t.astype(np.float32), final_h, (canvas_w, canvas_h), flags=cv2.INTER_LINEAR, borderValue=0.0)
        # A separately-warped ones-mask (nearest-neighbor, zero border) marks which
        # canvas pixels this frame actually covers — avoids NaN-interpolation bleed
        # at each frame's warped edge.
        coverage = cv2.warpPerspective(
            np.ones(t.shape, dtype=np.float32), final_h, (canvas_w, canvas_h), flags=cv2.INTER_NEAREST, borderValue=0.0
        )
        valid = coverage > 0.5
        canvas_sum[valid] += warped_t[valid]
        canvas_count[valid] += 1.0

    covered = canvas_count > 0
    safe_count = np.where(covered, canvas_count, 1.0)
    result = canvas_sum / safe_count
    # Neutral fallback for any never-covered gap pixel (shouldn't normally occur).
    result = np.where(covered, result, float(np.mean(temps_list[0])))
    return result.astype(np.float32)
