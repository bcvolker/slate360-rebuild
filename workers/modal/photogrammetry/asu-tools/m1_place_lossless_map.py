r"""M1-M2: intake the new LOSSLESS DroneDeploy GeoTIFF (dd_ortho_lossless.tif,
Deflate-compressed = zero JPEG damage, 14818x11660, EPSG:6405 State Plane ft,
GSD 1.076 cm/px; native per the processing report is 0.51in = 1.295 cm/px, so
this export carries all real detail) and place it into the deck ENU frame with a
SINGLE Lanczos warp -- replacing the previous three-stacked-bicubic-warp path
that was the main cause of the on-screen blur.

Chain: State Plane px -> geographic -> local ENU (exact pyproj) -> frame px.
Then ONE composed affine = placement then translation-refinement (vs the proven
prior base), warped once with INTER_LANCZOS4. Real alpha from the file itself.
"""
import os

import cv2
import numpy as np
import tifffile
from pyproj import Transformer

D = r"C:\ASU-Survey\deliverables"
ANCHOR_LAT, ANCHOR_LON = 33.4277667, -111.9322333
SRC = os.path.join(D, "dd_ortho_lossless.tif")

t = tifffile.TiffFile(SRC)
page = t.pages[0]
arr = page.asarray()
IH, IW = arr.shape[:2]
print("image", IW, "x", IH, "channels", arr.shape[2], "compression", page.compression)
tags = {tag.name: tag.value for tag in page.tags}
sx, sy, _ = tags["ModelPixelScaleTag"]
_, _, _, ox, oy, _ = tags["ModelTiepointTag"]
print("pixel scale ft %.6f  origin ft %.3f, %.3f  -> GSD %.4f cm/px"
      % (sx, ox, oy, sx * 0.3048 * 100))


def px_to_sp(col, row):
    return ox + sx * col, oy - sy * row


to_geo = Transformer.from_crs("EPSG:6405", "EPSG:4326", always_xy=True)
to_enu = Transformer.from_pipeline(
    f"+proj=pipeline +step +proj=cart +ellps=GRS80 "
    f"+step +proj=topocentric +ellps=GRS80 "
    f"+lat_0={ANCHOR_LAT} +lon_0={ANCHOR_LON} +h_0=0")


def sp_to_enu(Ex, Ny):
    lon, lat = to_geo.transform(Ex, Ny)
    e, n, u = to_enu.transform(lon, lat, 0.0)
    return e, n


X0, Y0, X1, Y1 = -66.66, -70.04, 54.69, 11.29
GSD = 0.01
W1, H1 = 12135, 8133


def enu_to_frame(e, n):
    return (e - X0) / GSD, (Y1 - n) / GSD


corners_px = [(0, 0), (IW, 0), (IW, IH), (0, IH)]
frame_pts = np.float32([enu_to_frame(*sp_to_enu(*px_to_sp(c, r)))
                        for c, r in corners_px])
src_pts = np.float32(corners_px)
M_place = cv2.getAffineTransform(src_pts[:3], frame_pts[:3])
pred4 = M_place @ np.array([src_pts[3][0], src_pts[3][1], 1.0])
err4 = np.hypot(pred4[0] - frame_pts[3][0], pred4[1] - frame_pts[3][1])
print("placement 4th-corner consistency: %.2f px (%.1f cm)" % (err4, err4 * GSD * 100))

# --- translation refinement vs the proven prior base, BEFORE warping (measure
# on a cheap placement, then fold the shift into ONE final warp) ---
rgb = arr[:, :, :3][:, :, ::-1]
prov = cv2.warpAffine(rgb, M_place, (W1, H1), flags=cv2.INTER_AREA, borderValue=(0, 0, 0))
ref = cv2.imread(os.path.join(D, "deck_ortho_merged_1cm.png"), cv2.IMREAD_UNCHANGED)[:, :, :3]
gp = cv2.cvtColor(prov, cv2.COLOR_BGR2GRAY).astype(np.float32)
gr = cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY).astype(np.float32)
TS = 200
recs = []
for gy in range(0, H1 - TS, TS):
    for gx in range(0, W1 - TS, TS):
        a = gr[gy:gy + TS, gx:gx + TS]
        b = gp[gy:gy + TS, gx:gx + TS]
        if a.std() < 12 or b.std() < 12:
            continue
        win = cv2.createHanningWindow((TS, TS), cv2.CV_32F)
        (dx, dy), resp = cv2.phaseCorrelate(a, b, win)
        if resp < 0.15:
            continue
        recs.append((dx, dy))
recs = np.array(recs)
dx = float(np.median(recs[:, 0])) if len(recs) else 0.0
dy = float(np.median(recs[:, 1])) if len(recs) else 0.0
print("refinement grid: %d cells, shift dx=%.2f dy=%.2f px (align new onto ref => -dx,-dy)"
      % (len(recs), dx, dy))

# compose ONE affine: placement then (-dx,-dy) translation
M_final = M_place.copy()
M_final[0, 2] += -dx
M_final[1, 2] += -dy

rgb_w = cv2.warpAffine(rgb, M_final, (W1, H1), flags=cv2.INTER_LANCZOS4, borderValue=(0, 0, 0))
alpha_w = cv2.warpAffine(arr[:, :, 3], M_final, (W1, H1), flags=cv2.INTER_NEAREST, borderValue=0)
out = cv2.cvtColor(rgb_w, cv2.COLOR_BGR2BGRA)
out[:, :, 3] = alpha_w
cv2.imwrite(os.path.join(D, "deck_ortho_lossless_placed_1cm.png"), out,
            [cv2.IMWRITE_PNG_COMPRESSION, 3])
print("wrote deck_ortho_lossless_placed_1cm.png  coverage %.1f%%  (ONE Lanczos warp)"
      % (100 * (alpha_w > 0).mean()))
np.save(os.path.join(D, "m1_lossless_affine.npy"), M_final)
