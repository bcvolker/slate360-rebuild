r"""Place the second DroneDeploy export (dd_hires_ortho_v2.tif, RGBA,
12345x11017, EPSG:6405 NAD83(2011) Arizona Central ft) into the deck ENU frame.

Same exact-reprojection discipline as the first hires JPG (place_hires_ortho.py),
but this source is in State Plane feet, not Web Mercator -- the SAME CRS the LAS
point cloud uses, so this establishes one shared, tested transform for both.

The TIFF's own alpha channel (verified binary 0/255, DroneDeploy's real nodata
mask -- 29.3% nodata) replaces the white-threshold heuristic used on the JPG.
"""
import json

import numpy as np
import tifffile
from pyproj import Transformer

DELIV = r"C:\ASU-Survey\deliverables"
ANCHOR_LAT, ANCHOR_LON = 33.4277667, -111.9322333
SRC = DELIV + r"\dd_hires_ortho_v2.tif"

t = tifffile.TiffFile(SRC)
page = t.pages[0]
arr = page.asarray()  # RGBA uint8
IH, IW = arr.shape[:2]
print("image", IW, "x", IH, "channels", arr.shape[2])

tags = {tag.name: tag.value for tag in page.tags}
sx, sy, _ = tags["ModelPixelScaleTag"]
_, _, _, ox, oy, _ = tags["ModelTiepointTag"]
print("pixel scale (ft): %.6f, %.6f   origin (ft E,N): %.3f, %.3f" % (sx, sy, ox, oy))

# pixel(col,row) -> EPSG:6405 (ft), pixel-CENTER convention (same as the .tfw)
def px_to_sp(col, row):
    return ox + sx * col, oy - sy * row

to_geo = Transformer.from_crs("EPSG:6405", "EPSG:4326", always_xy=True)
enu_pipeline = (
    f"+proj=pipeline +step +proj=cart +ellps=GRS80 "
    f"+step +proj=topocentric +ellps=GRS80 "
    f"+lat_0={ANCHOR_LAT} +lon_0={ANCHOR_LON} +h_0=0"
)
to_enu = Transformer.from_pipeline(enu_pipeline)

def sp_to_enu(Ex, Ny):
    lon, lat = to_geo.transform(Ex, Ny)
    e, n, u = to_enu.transform(lon, lat, 0.0)
    return e, n

corners_px = [(0, 0), (IW, 0), (IW, IH), (0, IH)]
corners_enu = [sp_to_enu(*px_to_sp(c, r)) for c, r in corners_px]
for (c, r), (e, n) in zip(corners_px, corners_enu):
    print("  px(%d,%d) -> ENU(%.3f, %.3f)" % (c, r, e, n))

ex_span = np.hypot(corners_enu[1][0] - corners_enu[0][0], corners_enu[1][1] - corners_enu[0][1])
true_gsd = ex_span / IW
print("true ground GSD across top edge: %.5f m/px (%.4f cm/px)" % (true_gsd, true_gsd * 100))

import cv2
X0, Y0, X1, Y1 = -66.66, -70.04, 54.69, 11.29
GSD = 0.01
W1, H1 = 12135, 8133

def enu_to_frame_px(e, n):
    return (e - X0) / GSD, (Y1 - n) / GSD

frame_pts = np.float32([enu_to_frame_px(e, n) for e, n in corners_enu])
src_pts = np.float32(corners_px)
M = cv2.getAffineTransform(src_pts[:3], frame_pts[:3])
pred4 = M @ np.array([src_pts[3][0], src_pts[3][1], 1.0])
err4 = np.hypot(pred4[0] - frame_pts[3][0], pred4[1] - frame_pts[3][1])
print("4th-corner affine-consistency check: %.2f px (%.1f cm)" % (err4, err4 * GSD * 100))

# warp RGB and alpha separately (warpAffine on 4-channel is fine, but keep
# alpha nearest-neighbor so the true/false nodata boundary doesn't blur)
rgb = arr[:, :, :3][:, :, ::-1].copy()  # RGB->BGR for cv2
alpha = arr[:, :, 3].copy()

warp_rgb = cv2.warpAffine(rgb, M, (W1, H1), flags=cv2.INTER_CUBIC, borderValue=(0, 0, 0))
warp_a = cv2.warpAffine(alpha, M, (W1, H1), flags=cv2.INTER_NEAREST, borderValue=0)

rgba_out = cv2.cvtColor(warp_rgb, cv2.COLOR_BGR2BGRA)
rgba_out[:, :, 3] = warp_a
cv2.imwrite(DELIV + r"\dd_v2_placed_1cm.png", rgba_out, [cv2.IMWRITE_PNG_COMPRESSION, 6])
print("wrote dd_v2_placed_1cm.png  coverage %.1f%%" % (100 * (warp_a > 0).mean()))
np.save(DELIV + r"\dd_v2_to_frame_affine.npy", M)
