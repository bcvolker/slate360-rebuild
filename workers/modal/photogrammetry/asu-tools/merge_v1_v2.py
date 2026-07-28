r"""Merge both DroneDeploy exports into the single best 2D map source.

v2 (dd_v2_placed_1cm.png, State Plane ft, 1.009cm/px, real DD alpha) is
verifiably sharper (visual crop check, tools/out/v1_vs_v2_detail.jpg) but its
footprint is essentially a subset of v1's -- it does NOT close the southern
coverage gap. v1 (deck_ortho_hires_1cm.png, Mercator, 1.078cm/px) covers more
area including that southern strip.

Strategy: v2 wherever it has real (DroneDeploy-declared) coverage, else v1,
else true transparency. Both are already placed into the identical 1cm deck
frame, so this is a plain per-pixel select -- no further warping.
"""
import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"

v1 = cv2.imread(DELIV + r"\deck_ortho_hires_1cm.png", cv2.IMREAD_UNCHANGED)
# _refined: v2's raw exact-reprojection placement carried its own ~18cm
# systematic GPS/datum-class offset relative to the thermal-proven v1 (found
# by the same grid-correlation check used throughout this session -- never
# trust a placement without measuring it against a proven reference). Corrected
# in place; residual after correction is 4.7cm median, consistent with v1's own
# noise floor.
v2 = cv2.imread(DELIV + r"\dd_v2_placed_1cm_refined.png", cv2.IMREAD_UNCHANGED)
assert v1.shape == v2.shape, (v1.shape, v2.shape)

a1 = v1[:, :, 3] > 0
a2 = v2[:, :, 3] > 0

out = v1.copy()
out[a2] = v2[a2]           # v2 wins wherever it has real coverage
out[:, :, 3] = ((a1 | a2).astype(np.uint8)) * 255

cv2.imwrite(DELIV + r"\deck_ortho_merged_1cm.png", out, [cv2.IMWRITE_PNG_COMPRESSION, 6])
cov = (out[:, :, 3] > 0).mean()
v2_frac = a2.mean()
print("merged coverage %.1f%%  (v2 supplies %.1f%% of the frame, v1 fills the rest)"
      % (100 * cov, 100 * v2_frac))
