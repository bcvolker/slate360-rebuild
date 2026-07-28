r"""Finalize the map: take the colmap-aligned lossless DD map (now aligned to the
thermal), apply a MILD unsharp to match DroneDeploy's viewer presentation (their
viewer sharpens; our raw pixels are identical but flatter), write as the map
source. Alpha preserved. This is the single source the tiler + embed use.
"""
import os

import cv2
import numpy as np

D = r"C:\ASU-Survey\deliverables"

# NO pre-sharpen: the finest tile level (L3) must stay pure native DroneDeploy
# pixels (byte-exact). Sharpening is applied ONLY to the coarse pyramid levels,
# in make_tiles.py, so zoomed-out overviews read crisp while full-zoom stays
# true to the source. deck_ortho_final = the colmap-aligned map, alpha preserved.
m = cv2.imread(os.path.join(D, "deck_ortho_colmapaligned_1cm.png"), cv2.IMREAD_UNCHANGED)
cv2.imwrite(os.path.join(D, "deck_ortho_final_1cm.png"), m, [cv2.IMWRITE_PNG_COMPRESSION, 3])
print("wrote deck_ortho_final_1cm.png (colmap-aligned, native L3, no pre-sharpen), coverage %.1f%%"
      % (100 * (m[:, :, 3] > 0).mean()))
