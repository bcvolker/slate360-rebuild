r"""How separable is the deck from the building roofs by elevation?

The current mask uses a single global deck_z with a +/-1.0 m band. The deck
SLOPES (it drains), so a constant-z band has to be loose to keep the whole deck
-- and at 1.0 m it also admits roofs and parapets that sit near deck level.
That is why findings landed on building roofs.

If a robust plane fit tracks the deck slope, the band can tighten a lot without
losing deck, and roofs fall outside it.
"""
import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"
z5 = np.load(DELIV + r"\panorama_registered.npz")
T = z5["temperatures"].astype(np.float32)
TH, TW = T.shape
fin = np.isfinite(T)
DEM = np.load(DELIV + r"\dem_v3.npz")["dem"].astype(np.float32)[
    5327:5327 + TH, 2942:2942 + TW]

poly = np.array([[1450, 250], [4750, 180], [4950, 700], [4950, 2700],
                 [4300, 3050], [2050, 3600], [1450, 3300]], np.int32)
region = np.zeros((TH, TW), np.uint8)
cv2.fillPoly(region, [(poly * (TW / 6067.0)).astype(np.int32)], 1)

inside = (region > 0) & fin & np.isfinite(DEM)
z = DEM[inside]
print("pixels in survey polygon:", inside.sum())
for q in (1, 5, 10, 25, 50, 75, 90, 95, 99):
    print("  p%-3d %8.2f m" % (q, np.percentile(z, q)))

hist, edges = np.histogram(z, bins=60)
print("\nelevation histogram (m : count):")
for c, e in zip(hist, edges):
    if c > inside.sum() * 0.004:
        print("  %7.2f  %s %d" % (e, "#" * int(60 * c / hist.max()), c))

# robust plane fit on the dominant (deck) population
zmed = np.median(z)
sel = inside & (np.abs(DEM - zmed) < 1.5)
ys, xs = np.nonzero(sel)
A = np.c_[xs, ys, np.ones(len(xs))]
coef, *_ = np.linalg.lstsq(A, DEM[sel], rcond=None)
for _ in range(3):
    pred = A @ coef
    res = DEM[sel] - pred
    keep = np.abs(res) < 2.5 * np.std(res)
    A, sel_z = A[keep], DEM[sel][keep]
    coef, *_ = np.linalg.lstsq(A, sel_z, rcond=None)
    ys, xs = ys[keep], xs[keep]

YY, XX = np.mgrid[0:TH, 0:TW]
plane = coef[0] * XX + coef[1] * YY + coef[2]
d = DEM - plane
print("\nplane fit: dz/dx %.5f m/px  dz/dy %.5f m/px  z0 %.2f" % tuple(coef))
print("deck slope: %.2f%% along x, %.2f%% along y"
      % (coef[0] / 0.03 * 100, coef[1] / 0.03 * 100))
dd = d[inside]
print("residual to plane inside polygon:")
for q in (1, 5, 25, 50, 75, 90, 95, 99):
    print("  p%-3d %8.2f m" % (q, np.percentile(dd, q)))

for band in (0.20, 0.30, 0.40, 0.50, 1.00):
    keep = inside & (np.abs(d) < band)
    print("band +/-%.2f m -> %6.2f%% of polygon kept"
          % (band, 100 * keep.sum() / inside.sum()))
np.save(DELIV + r"\deck_plane_resid.npy", d.astype(np.float32))
print("saved deck_plane_resid.npy")
