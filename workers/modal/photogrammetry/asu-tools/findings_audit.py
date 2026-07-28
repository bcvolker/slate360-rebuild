r"""Where do the existing findings actually sit? Deck, roof, or off-survey?

Brian: "many of the areas we are not looking for are in the analysis -- they are
either on the roof of a building or outside the sun deck." Before re-running the
analysis, establish for EACH finding which of those it is, so the fix targets the
real leak instead of guessing.

Roofs sit +2.2..+6.4 m above the deck plane (deck_plane_diag.py), so elevation
classifies them unambiguously.
"""
import json

import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"
z5 = np.load(DELIV + r"\panorama_registered.npz")
T = z5["temperatures"].astype(np.float32)
TH, TW = T.shape
print("thermal canvas %dx%d" % (TW, TH))
DEM = np.load(DELIV + r"\dem_v3.npz")["dem"].astype(np.float32)[
    5327:5327 + TH, 2942:2942 + TW]

poly6067 = np.array([[1450, 250], [4750, 180], [4950, 700], [4950, 2700],
                     [4300, 3050], [2050, 3600], [1450, 3300]], np.int32)
region = np.zeros((TH, TW), np.uint8)
cv2.fillPoly(region, [(poly6067 * (TW / 6067.0)).astype(np.int32)], 1)

deck_z = np.nanmedian(DEM[(region > 0) & np.isfinite(DEM)])
print("deck_z = %.2f m" % deck_z)

fd = json.load(open(DELIV + r"\findings.json"))
rows = []
for f in fd["findings"]:
    x = int(round(f["fx"] * TW))
    y = int(round(f["fy"] * TH))
    x = min(max(x, 0), TW - 1)
    y = min(max(y, 0), TH - 1)
    r = 12
    patch = DEM[max(0, y - r):y + r, max(0, x - r):x + r]
    patch = patch[np.isfinite(patch)]
    dz = float(np.median(patch) - deck_z) if patch.size else float("nan")
    inpoly = bool(region[y, x])
    if not inpoly:
        cls = "OFF-SURVEY"
    elif np.isnan(dz):
        cls = "NO-DEM"
    elif dz > 0.8:
        cls = "ROOF/RAISED (+%.1f m)" % dz
    elif dz < -0.8:
        cls = "BELOW DECK (%.1f m)" % dz
    else:
        cls = "deck"
    rows.append((f.get("id", "?"), f.get("tier", "?"), round(f["dT_F"], 1),
                 round(dz, 2) if not np.isnan(dz) else None, cls))

for r in rows:
    print("  %-6s tier %-10s dT %6.1fF  dz %-7s  %s" % r)

bad = [r for r in rows if r[4] != "deck"]
print("\n%d findings total, %d NOT on deck (%.0f%%)"
      % (len(rows), len(bad), 100 * len(bad) / max(len(rows), 1)))
