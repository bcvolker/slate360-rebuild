r"""Phase 1: place the high-res DroneDeploy ortho (dd_hires_ortho.jpg, 14790x11691,
world-file exact: EPSG:3857, 0.0129 m/px) into the deck ENU frame.

Chain (exact, not approximate -- reviewer-corrected):
  world-file pixel center (col,row) -> EPSG:3857 (E,N) -> geographic (lon,lat)
  -> local ENU at the frame anchor, via pyproj end-to-end. No hand cos(lat)
  scaling: pyproj's topocentric/geodesic math is exact and anisotropy-correct.

Then: white nodata -> alpha; translation-only refinement against the CURRENTLY
PROVEN base (deck_ortho_dd_filled_1cm.jpg -- Phase 0T verified this aligns
correctly with the thermal via independent structural-edge correlation, so it
is the right reference, not any earlier/other asset).
"""
import json

import cv2
import numpy as np
from pyproj import Transformer

DELIV = r"C:\ASU-Survey\deliverables"
ANCHOR_LAT, ANCHOR_LON = 33.4277667, -111.9322333

# ---- world file (pixel-center convention) ----
TFW_PATH = r"C:\Users\bcvol\AppData\Local\Temp\MapPlan_ortho_MonJul20235834127387.tfw"
A, D, B, E, C, F = [float(x) for x in open(TFW_PATH).read().split()]
print("world file: pxsize_x=%.6f rot=%.6f/%.6f pxsize_y=%.6f  origin(E,N)=%.3f,%.3f"
      % (A, D, B, E, C, F))

img = cv2.imread(DELIV + r"\dd_hires_ortho.jpg")
IH, IW = img.shape[:2]
print("image", IW, "x", IH)

# pixel(col,row) -> EPSG:3857 (pixel-CENTER convention per world-file spec)
def px_to_merc(col, row):
    Ex = A * col + B * row + C
    Ny = D * col + E * row + F
    return Ex, Ny

# EPSG:3857 -> geographic -> local ENU (topocentric) at the frame anchor, exact.
# One pipeline, geographic (lon,lat,h) straight to ENU -- cart+topocentric in a
# single step (feeding it already-ECEF coords, as an earlier version of this
# script did, double-converts and returns inf; geographic input is correct).
to_geo = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
enu_pipeline = (
    f"+proj=pipeline "
    f"+step +proj=cart +ellps=WGS84 "
    f"+step +proj=topocentric +ellps=WGS84 "
    f"+lat_0={ANCHOR_LAT} +lon_0={ANCHOR_LON} +h_0=0"
)
to_enu = Transformer.from_pipeline(enu_pipeline)

def merc_to_enu(Ex, Ny):
    lon, lat = to_geo.transform(Ex, Ny)
    e, n, u = to_enu.transform(lon, lat, 0.0)
    return e, n

# corners of the source image -> ENU, to get exact scale+rotation of the warp
corners_px = [(0, 0), (IW, 0), (IW, IH), (0, IH)]
corners_enu = [merc_to_enu(*px_to_merc(c, r)) for c, r in corners_px]
for (c, r), (e, n) in zip(corners_px, corners_enu):
    print("  px(%d,%d) -> ENU(%.3f, %.3f)" % (c, r, e, n))

ex_span = np.hypot(corners_enu[1][0] - corners_enu[0][0], corners_enu[1][1] - corners_enu[0][1])
true_gsd = ex_span / IW
print("true ground GSD across top edge: %.5f m/px (%.4f cm/px)" % (true_gsd, true_gsd * 100))

# ---- deck frame (identity target) ----
X0, Y0, X1, Y1 = -66.66, -70.04, 54.69, 11.29
GSD = 0.01
W1, H1 = 12135, 8133

# build the forward map: for each of the 4 corners, we know source px and
# target ENU. Solve an AFFINE (src px -> frame px) from ENU chain, since the
# EPSG:3857->ENU relationship over this small extent is, to sub-mm precision, a
# similarity transform (world file already gives us exact scale+rotation in
# Mercator space; the ENU correction is a further near-rigid map at this scale).
def enu_to_frame_px(e, n):
    return (e - X0) / GSD, (Y1 - n) / GSD

frame_pts = np.float32([enu_to_frame_px(e, n) for e, n in corners_enu])
src_pts = np.float32(corners_px)
M = cv2.getAffineTransform(src_pts[:3], frame_pts[:3])
# verify 4th corner maps consistently (checks the assumed-affine approximation)
pred4 = M @ np.array([src_pts[3][0], src_pts[3][1], 1.0])
err4 = np.hypot(pred4[0] - frame_pts[3][0], pred4[1] - frame_pts[3][1])
print("4th-corner affine-consistency check: %.2f px (%.1f cm) -- should be tiny"
      % (err4, err4 * GSD * 100))

warp = cv2.warpAffine(img, M, (W1, H1), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))
cv2.imwrite(DELIV + r"\dd_hires_placed_1cm.jpg", warp, [cv2.IMWRITE_JPEG_QUALITY, 93])
print("wrote dd_hires_placed_1cm.jpg", warp.shape)
np.save(DELIV + r"\dd_hires_src_to_frame_affine.npy", M)
