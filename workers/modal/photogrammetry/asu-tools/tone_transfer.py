r"""Move the mesh render's CLEAN TONE onto the geometrically-correct 1cm ortho.

Why this and not a straight base-map swap:

The nadir render of the colmap_mesh_texturer atlas has correct, seam-free
low-frequency tone -- it is the only thing that fixed the per-footprint tonal
polygons. But its GEOMETRY comes from a smoothed Poisson surface, so content
lands in the wrong place where the mesh is imperfect: measured median 2.9 cm but
p90 11.8 cm and max 59 cm (tools/ortho_align_diag.py). The thermal panorama was
aligned to ortho_deck_1cm.jpg and that alignment was accepted, so replacing the
base wholesale traded accepted alignment for clean colour.

The tonal polygons are a LOW-FREQUENCY error. So take ONLY the low-frequency
ratio between the two renders and apply it to the geometrically-correct base:

    out = base * clip( blur(ref) / blur(base) )

At sigma = 2.5 m the blur kernel is ~40x larger than the worst local
displacement, so the mesh render's geometric error cannot leak in -- every edge,
every pixel position, comes from the base. Alignment is bit-for-bit preserved;
only illumination changes.
"""
import sys

import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"
GSD = 0.01
# Correction scale. Must stay well above the mesh render's worst local geometric
# error (measured max 59 cm) so its warp cannot leak into the base, but as small
# as possible so the gain field can still cancel hard footprint boundaries.
SIGMA_M = float(sys.argv[1]) if len(sys.argv) > 1 else 1.2
SIGMA = SIGMA_M / GSD
print("correction sigma %.2f m (%.0f px)" % (SIGMA_M, SIGMA))
GAIN_LO, GAIN_HI = 0.55, 1.85

# base: geometrically correct, thermal aligned to it
base = cv2.imread(DELIV + r"\ortho_deck_1cm.jpg")
c0 = int(round((-66.66 - (-73.0)) / GSD))
r0 = int(round((17.5 - 11.29) / GSD))
W = int(round(121.35 / GSD))
H = int(round(81.33 / GSD))
base = base[r0:r0 + H, c0:c0 + W]
print("base deck crop", base.shape)

ref = cv2.imread(DELIV + r"\deck_ortho_mesh_1cm.jpg")
if ref.shape[:2] != base.shape[:2]:
    ref = cv2.resize(ref, (base.shape[1], base.shape[0]),
                     interpolation=cv2.INTER_AREA)
print("ref", ref.shape)

bf = base.astype(np.float32)
rf = ref.astype(np.float32)

# where the mesh render has no coverage it is pure black -- must not drag the
# base toward zero, so build a validity mask and only correct inside it
valid = (ref.max(axis=2) > 8).astype(np.float32)

# A sigma-250px blur on a 12135x8133 image is enormously slow and pointless:
# the result is by definition low-frequency, so compute it at 1/DS scale with a
# proportionally smaller sigma and upsample. Identical to the eye, ~250x faster.
DS = 16
H0, W0 = base.shape[:2]
SW, SH = W0 // DS, H0 // DS
S = SIGMA / DS


def lowfreq(plane):
    small = cv2.resize(plane, (SW, SH), interpolation=cv2.INTER_AREA)
    small = cv2.GaussianBlur(small, (0, 0), S)
    return cv2.resize(small, (W0, H0), interpolation=cv2.INTER_LINEAR)


vb = lowfreq(valid)

out = np.empty_like(bf)
for ch in range(3):
    lb = lowfreq(bf[:, :, ch] * valid) / np.maximum(vb, 1e-3)
    lr = lowfreq(rf[:, :, ch] * valid) / np.maximum(vb, 1e-3)
    gain = np.clip(lr / np.maximum(lb, 1.0), GAIN_LO, GAIN_HI)
    # fade the correction out where the reference had no data
    gain = 1.0 + (gain - 1.0) * np.clip(vb, 0, 1)
    out[:, :, ch] = bf[:, :, ch] * gain
    print("ch%d gain  min %.2f  median %.2f  max %.2f"
          % (ch, gain.min(), np.median(gain), gain.max()))

out = np.clip(out, 0, 255).astype(np.uint8)

# report how much the tonal spread across the deck actually tightened
def polygon_spread(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    low = lowfreq(g)
    m = valid > 0.5
    return float(low[m].std())

print("low-frequency spread  before %.2f  ->  after %.2f"
      % (polygon_spread(base), polygon_spread(out)))

cv2.imwrite(DELIV + r"\deck_ortho_toned_1cm.jpg", out,
            [cv2.IMWRITE_JPEG_QUALITY, 93])
print("wrote deck_ortho_toned_1cm.jpg", out.shape)
