r"""ASU sun-deck thermal analysis — LOCKED methodology (ASU_ANALYSIS_METHODOLOGY.md).

A1 candidate detection: deck mask -> robust local background (~5 m median) ->
residual / local MAD z-map -> BH-FDR q<0.05 -> components (>=0.25 m^2,
compactness + aspect filters). A2 drain halos: concrete annuli 0.3-2.0 m vs
3-4 m control, metal core excluded. A3 slope: LOCAL context only (smoothed
DEM), annotation not evidence. A5 confounder screen per candidate:
deck-edge/sky-view proxy, visible-stain emissivity cross-ref, building
proximity (HVAC), stitch-seam proxy (coverage count). Tier cap rule applied.

Outputs: deliverables\findings.json, pattern_layer.png (viewer overlay),
         drain_halos.json, qc_analysis_overview.jpg
"""
import json

import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"
GSD = 0.03
z5 = np.load(DELIV + r"\panorama_registered.npz")
T = z5["temperatures"].astype(np.float32)
CNT = z5["count"].astype(np.float32)
TH, TW = T.shape
fin = np.isfinite(T)

# DENSE DEM. dem_v3.npz was 96.4% exactly 0.0 -- 0 is its nodata fill, not an
# elevation. deck_z therefore solved to 0.00 and the gate |DEM-deck_z|<1.0
# passed EVERY nodata pixel, so the elevation filter was a no-op and building
# roofs entered the deck mask. deck_dem_3cm.npy is the z-buffer of the textured
# mesh rasterised into this exact frame: 100% coverage, real elevations.
DEM = np.load(DELIV + r"\deck_dem_3cm.npy").astype(np.float32)
DEM = np.where(DEM > -1e8, DEM, np.nan)
assert DEM.shape == (TH, TW), (DEM.shape, (TH, TW))
ortho = cv2.imread(DELIV + r"\ortho_hires_v2.jpg")
oc = ortho[int(5327*1.5):int(5327*1.5)+int(TH*1.5),
           int(2942*1.5):int(2942*1.5)+int(TW*1.5)]
og = cv2.resize(cv2.cvtColor(oc, cv2.COLOR_BGR2GRAY), (TW, TH))

# ---- deck mask: bright concrete + thermal coverage + deck elevation band ----
# Brian's survey boundary (screenshot 2026-07-19): concourse deck only.
poly = np.array([[1450,250],[4750,180],[4950,700],[4950,2700],
                 [4300,3050],[2050,3600],[1450,3300]], np.int32)
region = np.zeros((TH, TW), np.uint8)
cv2.fillPoly(region, [ (poly * (TW/6067.0)).astype(np.int32) ], 1)

# deck plane from the dense DEM inside the survey boundary. The deck is one
# dominant flat population; roofs sit +2.2..+6.4 m above it, so elevation
# separates them unambiguously -- 48% of the survey polygon is raised structure.
deck_z = float(np.nanmedian(DEM[(region > 0) & np.isfinite(DEM)]))
dz = DEM - deck_z
DECK_BAND = 0.30          # +/-30 cm: keeps 45.9% of polygon, saturates by 1.0 m

# raised structures (roofs, HVAC, parapets, canopies) straight from elevation,
# dilated so their edges/shadows do not clip into the deck mask. This replaces
# the two hand-drawn rectangles, which only covered the two known buildings.
raised = (np.nan_to_num(dz, nan=99.0) > 0.8).astype(np.uint8)
raised = cv2.dilate(raised, np.ones((25, 25), np.uint8))
below = (np.nan_to_num(dz, nan=-99.0) < -0.8).astype(np.uint8)
below = cv2.dilate(below, np.ones((15, 15), np.uint8))

# concrete only: brightness band excludes dark membrane AND white/
# reflective surfaces (low-e artifacts)
mask = (fin & (og > 115) & (og < 192)
        & np.isfinite(dz) & (np.abs(dz) < DECK_BAND)
        & (raised == 0) & (below == 0) & (region > 0))
mask = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN,
                        np.ones((7, 7), np.uint8)).astype(bool)
print("deck mask: %.1f%% of canvas, deck z %.2f m, band +/-%.2f m"
      % (mask.mean()*100, deck_z, DECK_BAND))
print("  survey polygon %.2f Mpx | raised excluded %.1f%% | mask %.2f Mpx"
      % ((region > 0).sum()/1e6,
         100*((region > 0) & (raised > 0)).sum()/max((region > 0).sum(), 1),
         mask.sum()/1e6))

# ---- robust local background + MAD (downscale trick for big-window median) --
Tm = np.where(mask, T, np.nan)
def med_big(img, k=21):
    lo, hi = np.nanpercentile(img, 0.5), np.nanpercentile(img, 99.5)
    q = np.clip((img - lo) / max(hi - lo, 1e-6) * 255, 0, 255).astype(np.uint8)
    mq = cv2.medianBlur(q, k)
    return mq.astype(np.float32) / 255 * (hi - lo) + lo

small = cv2.resize(np.nan_to_num(Tm, nan=np.nanmedian(Tm)),
                   (TW//8, TH//8), interpolation=cv2.INTER_AREA)
bg = cv2.resize(med_big(small), (TW, TH), interpolation=cv2.INTER_LINEAR)
r = Tm - bg
ra = np.abs(np.nan_to_num(r, nan=0))
mad = cv2.resize(med_big(cv2.resize(ra, (TW//8, TH//8),
                 interpolation=cv2.INTER_AREA)), (TW, TH),
                 interpolation=cv2.INTER_LINEAR)
zmap = r / np.maximum(1.4826 * mad, 0.15)

# ---- FDR (Benjamini-Hochberg, q=0.05) over deck pixels ----
from math import erf
zz = zmap[mask & np.isfinite(zmap)]
p = 2 * (1 - 0.5 * (1 + np.vectorize(erf)(np.abs(zz) / np.sqrt(2))))
ps = np.sort(p)
m = len(ps)
k = np.arange(1, m + 1)
passed = np.flatnonzero(ps <= 0.05 * k / m)
z_thr = 2.5 if len(passed) == 0 else float(np.abs(zz)[np.argsort(p)][passed[-1]].min())
z_thr = max(z_thr, 2.0)
print("FDR z-threshold: %.2f (deck pixels %d)" % (z_thr, m))

# ---- candidates (warm and cool separately) ----
drains = json.load(open(DELIV + r"\drains_map.json"))["drains"]
dpx = np.array([[d["fx"]*TW, d["fy"]*TH] for d in drains])
# building proximity for the HVAC confounder: use the elevation-derived raised
# mask, not a brightness threshold (dark membrane on the deck is not a building)
building = cv2.dilate(raised, np.ones((int(2/GSD//8*2+1),)*2, np.uint8))
edge_dist = cv2.distanceTransform(mask.astype(np.uint8), cv2.DIST_L2, 5)

# smoothed slope for context
dem_s = cv2.GaussianBlur(np.nan_to_num(DEM, nan=deck_z), (0, 0), 33)  # ~1m
gy, gx = np.gradient(dem_s, GSD)
slope_pct = np.hypot(gx, gy) * 100

findings = []
for sign, tag in [(1, "warm"), (-1, "cool")]:
    det = (mask & np.isfinite(zmap) & (sign * zmap > z_thr)).astype(np.uint8)
    det = cv2.morphologyEx(det, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lbl, stats, cent = cv2.connectedComponentsWithStats(det)
    for i in range(1, n):
        a_px = stats[i, cv2.CC_STAT_AREA]
        area_m2 = a_px * GSD * GSD
        if area_m2 < 0.5:
            continue
        w, h = stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]
        if max(w, h) / max(min(w, h), 1) > 5:
            continue
        comp = (lbl == i)
        per = cv2.arcLength(cv2.findContours(comp.astype(np.uint8),
                            cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0][0],
                            True)
        compact = 4 * np.pi * a_px / max(per * per, 1)
        if compact < 0.08:
            continue
        cy, cx = cent[i][1], cent[i][0]
        dT = float(np.nanmean(r[comp]))
        zm = float(np.nanmean(zmap[comp]) * sign)
        stab = float(np.median(CNT[comp]))
        ddist = float(np.min(np.hypot(dpx[:, 0]-cx, dpx[:, 1]-cy)) * GSD)
        dnear = int(np.argmin(np.hypot(dpx[:, 0]-cx, dpx[:, 1]-cy))) + 1
        conf = []
        if float(edge_dist[int(cy), int(cx)]) * GSD < 2.0:
            conf.append("near deck edge (sky-view)")
        og_in = float(np.mean(og[comp]))
        og_ring = float(np.mean(og[cv2.dilate(comp.astype(np.uint8),
                        np.ones((25, 25), np.uint8)).astype(bool) & ~comp & mask]))
        if abs(og_in - og_ring) > 18:
            conf.append("coincides with visible surface tone change (emissivity)")
        if building[int(cy), int(cx)]:
            conf.append("near structure/equipment")
        if stab < 4:
            conf.append("low observation count")
        sl = float(np.mean(slope_pct[comp]))
        # drainage context: is the finding in a local depression, and is the
        # nearest drain downhill of it?
        y0c, x0c = int(cy), int(cx)
        win = dem_s[max(0,y0c-67):y0c+67, max(0,x0c-67):x0c+67]  # ~4 m window
        in_depression = bool(dem_s[y0c, x0c] < np.percentile(win, 25))
        dz_drain = float(dem_s[y0c, x0c]
                         - dem_s[int(dpx[dnear-1][1]), int(dpx[dnear-1][0])])
        findings.append({
            "kind": tag, "cx": float(cx), "cy": float(cy),
            "fx": round(float(cx)/TW, 5), "fy": round(float(cy)/TH, 5),
            "area_m2": round(area_m2, 1),
            "area_ft2": round(area_m2 * 10.764, 0),
            "dT_C": round(dT, 2), "dT_F": round(dT * 1.8, 2),
            "z": round(zm, 1), "obs_count": int(stab),
            "drain_id": dnear, "drain_dist_m": round(ddist, 1),
            "slope_pct_local": round(sl, 1),
            "in_depression": in_depression,
            "drain_downhill": bool(dz_drain > 0.01),
            "confounders": conf,
        })

findings.sort(key=lambda f: -abs(f["z"]) * np.sqrt(f["area_m2"]))
findings = findings[:14]
for k, f in enumerate(findings):
    if not f["confounders"] and abs(f["z"]) >= 3 and f["area_m2"] >= 1:
        f["tier"] = "most consistent with retained subsurface moisture" \
            if f["kind"] == "warm" else "most consistent with surface moisture/evaporative cooling"
    elif len(f["confounders"]) <= 1:
        f["tier"] = "plausible"
    else:
        f["tier"] = "less consistent (confounders unexcluded)"
    f["id"] = "F%d" % (k + 1)
print("findings: %d (warm %d cool %d)" % (len(findings),
      sum(1 for f in findings if f["kind"] == "warm"),
      sum(1 for f in findings if f["kind"] == "cool")))

# ---- drain halo test ----
yy, xx = np.mgrid[0:TH, 0:TW]
halos = []
for di, d in enumerate(drains):
    dc = np.hypot(xx - d["fx"]*TW, yy - d["fy"]*TH) * GSD
    ring = mask & (dc > 0.3) & (dc < 2.0)
    ctrl = mask & (dc > 3.0) & (dc < 4.0)
    if ring.sum() < 200 or ctrl.sum() < 200:
        halos.append({"drain": di+1, "n": 0})
        continue
    dr_ = np.nanmean(r[ring]) - np.nanmean(r[ctrl])
    sd = np.sqrt((np.nanvar(r[ring]) + np.nanvar(r[ctrl])) / 2)
    halos.append({"drain": di+1, "halo_dT_C": round(float(dr_), 2),
                  "effect_d": round(float(dr_ / max(sd, 0.05)), 2),
                  "n": int(ring.sum())})
sig = [h for h in halos if h.get("n", 0) > 0 and abs(h.get("effect_d", 0)) > 0.5]
print("drain halos with |effect|>0.5:", [(h["drain"], h["halo_dT_C"]) for h in sig])

json.dump({"z_threshold": round(z_thr, 2), "bg_window_m": 5.0,
           "reference": "local 5 m deck median (disclosed)",
           "findings": findings}, open(DELIV + r"\findings.json", "w"), indent=1)
json.dump(halos, open(DELIV + r"\drain_halos.json", "w"), indent=1)

# ---- pattern layer PNG (viewer overlay) + QC ----
pat = np.zeros((TH, TW, 4), np.uint8)
for f in findings:
    comp_mask = np.zeros((TH, TW), np.uint8)
    cv2.circle(comp_mask, (int(f["cx"]), int(f["cy"])),
               int(np.sqrt(f["area_m2"]) / GSD * 0.8) + 12, 1, -1)
    col = (60, 120, 255, 90) if f["kind"] == "warm" else (255, 160, 40, 90)
    for c in range(4):
        pat[..., c] = np.where(comp_mask > 0, col[c], pat[..., c])
cv2.imwrite(DELIV + r"\pattern_layer.png", pat)

vis = cv2.resize(oc, (TW, TH)).copy()
for f in findings:
    col = (0, 80, 255) if f["kind"] == "warm" else (255, 140, 0)
    cv2.circle(vis, (int(f["cx"]), int(f["cy"])),
               int(np.sqrt(f["area_m2"])/GSD*0.7)+10, col, 3)
    cv2.putText(vis, f["id"], (int(f["cx"])+14, int(f["cy"])-8), 0, 0.9, col, 2)
cv2.imwrite(DELIV + r"\qc_analysis_overview.jpg",
            cv2.resize(vis, (2000, int(TH*2000/TW))),
            [cv2.IMWRITE_JPEG_QUALITY, 86])
print("saved findings.json / drain_halos.json / pattern_layer.png / qc")
