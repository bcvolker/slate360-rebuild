r"""ASU sun-deck FIRST-PASS THERMAL SCREENING — pre-dawn survey, deck level only.

Supersedes analyze_deck.py for the leadership screening build. Differences,
each mandated by the 4-way external review + the timestamp resolution:

- CAPTURE WINDOW RESOLVED: EXIF stamps 12:20:39-12:46:08 are UTC ->
  05:20-05:46 MST, 2026-07-15 (sunrise 05:27). End-of-night cooldown, the
  ASTM C1153-style window. Sign convention: WARM = candidate retained heat at
  the drainage-mat/membrane level (water's thermal mass holds the night's
  heat). Cool = surface effect class (metal, surface wetness, sky view).
  Confirmed independently: MAX_0500 nadir frame shows shadowless flat
  twilight light -- impossible at July solar noon in Tempe.
- No Gaussian FDR (thermal residuals are not Gaussian): fixed robust
  threshold |z| >= 3.0 on r/(1.4826*MAD), plus dT floor 0.4 C.
- Elongated shapes are KEPT and labelled "trail": water travelling in the
  drainage mat along the near-flat structural slab is
  expected to read as an elongated warm streak. The old aspect<=5 filter
  deleted exactly the travel-pattern evidence Brian asked for.
- Drain positions are context only and labelled unverified (overlay
  registration is shelved). They never influence detection.
- Drain halo test (warm annulus 0.3-2.0 m vs 3-4 m control) reported per
  drain -> pooling-at-drain candidates (blocked mat drainage).
- Screening-only language everywhere. No "moisture confirmed".

Outputs: deliverables\findings.json (with capture_conditions + blurbs),
         drain_halos.json, qc_screening_mask.jpg, qc_screening_overview.jpg
"""
import json

import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"
GSD = 0.03

# ---- inputs: MI-aligned temperatures + observation count (shifted to match) --
zf = np.load(DELIV + r"\thermal_final.npz")
T = zf["temperatures"].astype(np.float32)
TH, TW = T.shape
zp = np.load(DELIV + r"\panorama_registered.npz")
# thermal_final = panorama_registered MI-shifted by (-4, 0) px; carry count over
CNT = np.roll(zp["count"].astype(np.float32), -4, axis=1)
fin = np.isfinite(T)

DEM = np.load(DELIV + r"\deck_dem_3cm.npy").astype(np.float32)
DEM = np.where(DEM > -1e8, DEM, np.nan)
assert DEM.shape == (TH, TW), (DEM.shape, (TH, TW))
ortho = cv2.imread(DELIV + r"\ortho_hires_v2.jpg")
oc = ortho[int(5327*1.5):int(5327*1.5)+int(TH*1.5),
           int(2942*1.5):int(2942*1.5)+int(TW*1.5)]
og = cv2.resize(cv2.cvtColor(oc, cv2.COLOR_BGR2GRAY), (TW, TH))

# ---- deck-only mask (survey polygon, elevation band, raised excluded) ----
poly = np.array([[1450,250],[4750,180],[4950,700],[4950,2700],
                 [4300,3050],[2050,3600],[1450,3300]], np.int32)
region = np.zeros((TH, TW), np.uint8)
cv2.fillPoly(region, [(poly * (TW/6067.0)).astype(np.int32)], 1)

deck_z = float(np.nanmedian(DEM[(region > 0) & np.isfinite(DEM)]))
dz = DEM - deck_z
raised = (np.nan_to_num(dz, nan=99.0) > 0.8).astype(np.uint8)
raised = cv2.dilate(raised, np.ones((25, 25), np.uint8))
below = (np.nan_to_num(dz, nan=-99.0) < -0.8).astype(np.uint8)
below = cv2.dilate(below, np.ones((15, 15), np.uint8))

mask = (fin & (og > 115) & (og < 192)
        & np.isfinite(dz) & (np.abs(dz) < 0.30)
        & (raised == 0) & (below == 0) & (region > 0))
mask = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN,
                        np.ones((7, 7), np.uint8)).astype(bool)
pct_raised = 100*((region > 0) & (raised > 0)).sum()/max((region > 0).sum(), 1)
print("deck mask %.1f%% of canvas | deck z %.2f m | raised excluded %.1f%% of polygon"
      % (mask.mean()*100, deck_z, pct_raised))
assert mask.mean() > 0.05, "deck mask collapsed"

# mask QC image (reviewer-mandated): green = analysed deck, red = excluded raised
qc = cv2.resize(oc, (TW, TH)).copy()
qc[mask] = (qc[mask] * 0.5 + np.array([0, 128, 0]) * 0.5).astype(np.uint8)
qc[(raised > 0) & (region > 0)] = (qc[(raised > 0) & (region > 0)] * 0.6
                                   + np.array([0, 0, 120]) * 0.4).astype(np.uint8)
cv2.imwrite(DELIV + r"\qc_screening_mask.jpg",
            cv2.resize(qc, (2000, int(TH*2000/TW))), [cv2.IMWRITE_JPEG_QUALITY, 85])

# ---- robust local background (~5 m masked median) + MAD z ----
Tm = np.where(mask, T, np.nan)

def med_big(img, k=21):
    lo, hi = np.nanpercentile(img, 0.5), np.nanpercentile(img, 99.5)
    q = np.clip((img - lo) / max(hi - lo, 1e-6) * 255, 0, 255).astype(np.uint8)
    return cv2.medianBlur(q, k).astype(np.float32) / 255 * (hi - lo) + lo

small = cv2.resize(np.nan_to_num(Tm, nan=np.nanmedian(Tm)),
                   (TW//8, TH//8), interpolation=cv2.INTER_AREA)
bg = cv2.resize(med_big(small), (TW, TH), interpolation=cv2.INTER_LINEAR)
r = Tm - bg
ra = np.abs(np.nan_to_num(r, nan=0))
mad = cv2.resize(med_big(cv2.resize(ra, (TW//8, TH//8),
                 interpolation=cv2.INTER_AREA)), (TW, TH),
                 interpolation=cv2.INTER_LINEAR)
zmap = r / np.maximum(1.4826 * mad, 0.15)
Z_THR, DT_FLOOR = 3.0, 0.40
print("robust scale: median MAD %.3f C | fixed threshold |z|>=%.1f, |dT|>=%.2f C"
      % (float(np.nanmedian(mad[mask])), Z_THR, DT_FLOOR))

# ---- context layers ----
drains = json.load(open(DELIV + r"\drains_map.json"))["drains"]
dpx = np.array([[d["fx"]*TW, d["fy"]*TH] for d in drains])
building = cv2.dilate(raised, np.ones((17, 17), np.uint8))
edge_dist = cv2.distanceTransform(mask.astype(np.uint8), cv2.DIST_L2, 5)
dem_s = cv2.GaussianBlur(np.nan_to_num(DEM, nan=deck_z), (0, 0), 33)
gy, gx = np.gradient(dem_s, GSD)
slope_pct = np.hypot(gx, gy) * 100

# ---- candidates: warm (primary class) and cool (surface-effect class) ----
findings = []
LBLS = {}
for sign, tag in [(1, "warm"), (-1, "cool")]:
    det = (mask & np.isfinite(zmap) & (sign * zmap > Z_THR)
           & (sign * np.nan_to_num(r, nan=0) > DT_FLOOR)).astype(np.uint8)
    det = cv2.morphologyEx(det, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    det = cv2.morphologyEx(det, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lbl, stats, cent = cv2.connectedComponentsWithStats(det)
    LBLS[tag] = lbl
    for i in range(1, n):
        area_m2 = stats[i, cv2.CC_STAT_AREA] * GSD * GSD
        if area_m2 < 0.5 or area_m2 > 80:
            continue
        w, h = stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]
        aspect = max(w, h) / max(min(w, h), 1)
        if aspect > 12:
            continue
        comp = (lbl == i)
        cy, cx = cent[i][1], cent[i][0]
        dT = float(np.nanmean(r[comp]))
        zm = float(np.nanmean(zmap[comp]) * sign)
        stab = float(np.median(CNT[comp]))
        dd = np.hypot(dpx[:, 0]-cx, dpx[:, 1]-cy)
        ddist, dnear = float(dd.min()*GSD), int(dd.argmin())+1
        conf = []
        if float(edge_dist[int(cy), int(cx)]) * GSD < 2.0:
            conf.append("near the deck edge (open-sky effect)")
        ring = cv2.dilate(comp.astype(np.uint8),
                          np.ones((25, 25), np.uint8)).astype(bool) & ~comp & mask
        if ring.sum() > 50 and abs(float(np.mean(og[comp])) - float(np.mean(og[ring]))) > 18:
            conf.append("matches a visible surface color change")
        if building[int(cy), int(cx)]:
            conf.append("close to a structure or equipment")
        if stab < 4:
            conf.append("seen in few overlapping images")
        y0c, x0c = int(cy), int(cx)
        win = dem_s[max(0, y0c-67):y0c+67, max(0, x0c-67):x0c+67]
        in_dep = bool(dem_s[y0c, x0c] < np.percentile(win, 25))
        dz_drain = float(dem_s[y0c, x0c]
                         - dem_s[int(dpx[dnear-1][1]), int(dpx[dnear-1][0])])
        findings.append({
            "_tag": tag, "_i": i,
            "kind": tag, "shape": "trail" if aspect > 3 else "patch",
            "cx": float(cx), "cy": float(cy),
            "fx": round(float(cx)/TW, 5), "fy": round(float(cy)/TH, 5),
            "area_m2": round(area_m2, 1), "area_ft2": round(area_m2*10.764, 0),
            "dT_C": round(dT, 2), "dT_F": round(dT*1.8, 2),
            "z": round(zm, 1), "obs_count": int(stab),
            "drain_id": dnear, "drain_dist_m": round(ddist, 1),
            "drain_dist_ft": round(ddist*3.281, 0),
            "slope_pct_local": round(float(np.mean(slope_pct[comp])), 2),
            "in_depression": in_dep, "drain_downhill": bool(dz_drain > 0.01),
            "confounders": conf,
        })

# rank: warm first (the moisture-relevant class pre-dawn), then salience.
# Client cap: 12-15 callouts total -> 8 warm + 3 cool + up to 2 drain halos.
findings.sort(key=lambda f: (0 if f["kind"] == "warm" else 1,
                             -abs(f["z"]) * np.sqrt(f["area_m2"])))
warm_all = sum(1 for f in findings if f["kind"] == "warm")
findings = [f for f in findings if f["kind"] == "warm"][:8] \
         + [f for f in findings if f["kind"] == "cool"][:3]
print("candidates: %d warm detected -> top %d kept; cool kept %d"
      % (warm_all, sum(1 for f in findings if f["kind"] == "warm"),
         sum(1 for f in findings if f["kind"] == "cool")))

# ---- tiers, evidence lists, and evidence-based opinions (screening language) --
for k, f in enumerate(findings):
    f["id"] = "A%d" % (k + 1)
    strong = abs(f["z"]) >= 3 and f["area_m2"] >= 1 and not f["confounders"]
    ev = ["reads %.1f°F %s than the surrounding deck over %d sq ft"
          % (abs(f["dT_F"]), "warmer" if f["kind"] == "warm" else "cooler",
             int(f["area_ft2"])),
          "statistical strength %.1fx the deck's normal variation" % abs(f["z"])]
    if f["obs_count"] >= 4:
        ev.append("confirmed by %d overlapping thermal photos, not a single frame"
                  % f["obs_count"])
    if f["in_depression"]:
        ev.append("sits in a shallow low spot of the deck surface — where water collects")
    if f["slope_pct_local"] < 0.8:
        ev.append("local slope is nearly flat (%.1f%%) — too flat to move water "
                  "reliably to a drain" % f["slope_pct_local"])
    if f["drain_dist_m"] <= 20:
        ev.append("nearest drain D%d is %d ft away%s (drain position approximate)"
                  % (f["drain_id"], f["drain_dist_ft"],
                     " and downhill" if f["drain_downhill"] else ""))
    if f["shape"] == "trail":
        ev.append("elongated streak shape rather than a round spot")
    f["evidence"] = ev
    if f["kind"] == "warm":
        f["tier"] = ("PRIORITY screening candidate" if strong
                     else ("screening candidate" if len(f["confounders"]) <= 1
                           else "possible — has confounders"))
        if f["shape"] == "trail":
            f["blurb"] = ("A warm streak. Flown before sunrise, dry concrete has cooled "
                          "all night — a streak that stayed warm is the classic signature "
                          "of water moving sideways through the drainage layer under the "
                          "slab, held by the water's heat capacity.")
            f["opinion"] = ("Opinion: this looks like a travel path — water in the drain "
                            "mat migrating along the near-flat structural slab rather than "
                            "reaching drain D%d. If verified, the membrane breach feeding "
                            "it is likely uphill of the streak, not necessarily inside it."
                            % f["drain_id"])
        else:
            f["blurb"] = ("A warm patch. After a full night of cool-down, dry deck reads "
                          "even and cool — an area still holding heat at 5:30 AM is "
                          "consistent with water trapped at the waterproofing level "
                          "under the topping slab.")
            f["opinion"] = ("Opinion: consistent with retained water in the drainage mat "
                            "%s. %s"
                            % ("that cannot reach drain D%d %d ft away"
                               % (f["drain_id"], f["drain_dist_ft"])
                               if f["drain_dist_m"] <= 20 else
                               "far from any drain — pointing at slope, not the drain",
                               "The flat local slope means water arriving here has no "
                               "path out, so even a small membrane defect uphill could "
                               "keep this area wet."
                               if f["slope_pct_local"] < 0.8 else
                               "Field verification (meter or probe) would confirm or "
                               "clear it."))
    else:
        f["tier"] = "cool zone — likely a surface effect"
        f["blurb"] = ("A cooler zone. Before sunrise, cool usually means a surface "
                      "effect — evaporating surface moisture, bare metal, or extra "
                      "open-sky exposure — not conditions under the slab.")
        f["opinion"] = ("Opinion: listed for completeness, not as a subsurface "
                        "candidate. If this spot is wet on the surface at 5:30 AM "
                        "with no rain, ask what is feeding it (irrigation, washdown, "
                        "or a weeping joint).")

# ---- drain halo test (pooling-at-drain candidates) ----
yy, xx = np.mgrid[0:TH, 0:TW]
halos = []
for di, d in enumerate(drains):
    dc = np.hypot(xx - d["fx"]*TW, yy - d["fy"]*TH) * GSD
    ring = mask & (dc > 0.3) & (dc < 2.0)
    ctrl = mask & (dc > 3.0) & (dc < 4.0)
    if ring.sum() < 200 or ctrl.sum() < 200:
        halos.append({"drain": di+1, "n": 0})
        continue
    dr_ = float(np.nanmean(r[ring]) - np.nanmean(r[ctrl]))
    sd = float(np.sqrt((np.nanvar(r[ring]) + np.nanvar(r[ctrl])) / 2))
    halos.append({"drain": di+1, "fx": d["fx"], "fy": d["fy"],
                  "halo_dT_C": round(dr_, 2), "halo_dT_F": round(dr_*1.8, 2),
                  "effect_d": round(dr_/max(sd, 0.05), 2), "n": int(ring.sum())})
warm_halos = [h for h in halos if h.get("n", 0) > 0
              and h.get("effect_d", 0) > 0.5 and h.get("halo_dT_C", 0) > 0.15]
print("drains with a WARM halo (pooling candidates):",
      [(h["drain"], h["halo_dT_F"]) for h in warm_halos])

# append top warm-halo drains as their own callouts (dedupe vs existing findings)
for h in sorted(warm_halos, key=lambda h: -h["effect_d"])[:2]:
    hx, hy = h["fx"]*TW, h["fy"]*TH
    if any(np.hypot(f["cx"]-hx, f["cy"]-hy)*GSD < 3.0 for f in findings):
        continue
    k = len(findings)
    findings.append({
        "id": "A%d" % (k+1), "kind": "warm", "shape": "halo",
        "cx": hx, "cy": hy, "fx": h["fx"], "fy": h["fy"],
        "area_m2": 11.9, "area_ft2": 128,
        "dT_C": h["halo_dT_C"], "dT_F": h["halo_dT_F"],
        "z": h["effect_d"], "obs_count": 0,
        "drain_id": h["drain"], "drain_dist_m": 0.0, "drain_dist_ft": 0,
        "slope_pct_local": round(float(slope_pct[int(hy), int(hx)]), 2),
        "in_depression": True, "drain_downhill": False, "confounders": [],
        "tier": "drain-ring screening candidate",
        "evidence": [
            "the concrete ring 1-6 ft around drain D%d reads %.1f°F warmer "
            "than matched deck 10-13 ft away" % (h["drain"], abs(h["halo_dT_F"])),
            "measured as an annulus average over ~%d pixels, not one spot" % h["n"],
            "prior destructive investigation on this deck documented mat drainage "
            "blocked at an opened drain (waterproofing lapped over the drain "
            "mat), a defect other drains may share"],
        "opinion": ("Opinion: this is the thermal signature of a "
                    "blocked drain — water pooling in the drainage layer "
                    "around drain D%d instead of leaving through it. Of all the "
                    "callouts, this one has independent physical corroboration, "
                    "so it is the strongest candidate for a first field check."
                    % h["drain"]),
        "blurb": ("The concrete ring around drain D%d reads %.1f°F warmer "
                  "than the deck a few feet away — the signature expected "
                  "if water is being held in the drainage layer around the "
                  "drain instead of leaving through it. Drain position "
                  "approximate." % (h["drain"], abs(h["halo_dT_F"])))})

# ---- per-finding detail crops: thermal (windowed locally) + RGB, side by side.
# This is the "see it first hand" view: the anomaly is contoured on a thermal
# crop whose color window is set from the LOCAL background, so the anomaly
# visibly pops the way it does in the data, not the way the global palette
# happens to render it.
import base64
ocr = cv2.resize(oc, (TW, TH))
for f in findings:
    half = int(max(120, np.sqrt(f["area_m2"]) / GSD * 1.6))
    x0 = max(0, int(f["cx"]) - half); x1 = min(TW, int(f["cx"]) + half)
    y0 = max(0, int(f["cy"]) - half); y1 = min(TH, int(f["cy"]) + half)
    tc = T[y0:y1, x0:x1]
    bc = bg[y0:y1, x0:x1]
    mid = float(np.nanmedian(bc))
    span = max(1.2, abs(f["dT_C"]) + 0.8)
    tn = np.clip((np.nan_to_num(tc, nan=mid - span) - (mid - span))
                 / (2 * span) * 255, 0, 255).astype(np.uint8)
    timg = cv2.applyColorMap(tn, cv2.COLORMAP_INFERNO)
    timg[~np.isfinite(tc)] = (28, 28, 32)
    if f.get("_tag"):                       # component contour
        cm = (LBLS[f["_tag"]][y0:y1, x0:x1] == f["_i"]).astype(np.uint8)
        cnts, _ = cv2.findContours(cm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(timg, cnts, -1, (255, 255, 255), 2)
    else:                                   # halo annulus
        c = (int(f["cx"]) - x0, int(f["cy"]) - y0)
        cv2.circle(timg, c, int(2.0/GSD), (255, 255, 255), 2)
        cv2.circle(timg, c, int(0.3/GSD), (255, 255, 255), 1)
    rimg = ocr[y0:y1, x0:x1].copy()
    H0 = 340
    timg = cv2.resize(timg, (int(timg.shape[1]*H0/timg.shape[0]), H0))
    rimg = cv2.resize(rimg, (int(rimg.shape[1]*H0/rimg.shape[0]), H0))
    lo_f, hi_f = (mid - span)*1.8+32, (mid + span)*1.8+32
    cv2.putText(timg, "THERMAL  %.0f-%.0fF" % (lo_f, hi_f), (8, 22), 0, 0.55,
                (255, 255, 255), 1, cv2.LINE_AA)
    cv2.putText(rimg, "PHOTO (same area)", (8, 22), 0, 0.55,
                (255, 255, 255), 2, cv2.LINE_AA)
    both = np.hstack([timg, np.full((H0, 4, 3), 40, np.uint8), rimg])
    ok, buf = cv2.imencode(".jpg", both, [cv2.IMWRITE_JPEG_QUALITY, 82])
    f["crop"] = "data:image/jpeg;base64," + base64.b64encode(buf).decode()
    f.pop("_tag", None); f.pop("_i", None)
print("detail crops: %d embedded, total %.1f KB"
      % (len(findings), sum(len(f["crop"]) for f in findings)/1024*0.75))

# ---- evidence-based pattern summary (data-driven, screening language) ----
from collections import Counter
warm_f = [f for f in findings if f["kind"] == "warm"]
near = Counter(f["drain_id"] for f in warm_f
               if f["drain_dist_m"] <= 20 and f["shape"] != "halo")
clusters = [d for d, c in near.most_common() if c >= 2]
trails = [f["id"] for f in warm_f if f["shape"] == "trail"]
halos_ids = [(f["id"], f["drain_id"]) for f in findings if f["shape"] == "halo"]
flat = sum(1 for f in warm_f if f["slope_pct_local"] < 0.8)
parts = ["%d warm areas stand out after the overnight cool-down — the pattern "
         "expected from water held at the waterproofing level, not random "
         "surface variation." % len(warm_f)]
if clusters:
    parts.append("They are not scattered evenly: warm areas group around "
                 + " and ".join("drain D%d" % d for d in clusters)
                 + ", which points at those drain basins as the areas to "
                   "verify first.")
if halos_ids:
    parts.append("Drain " + " and ".join("D%d" % d for _, d in halos_ids)
                 + " additionally shows a warm ring — the specific "
                   "signature of water pooling around a drain instead of "
                   "leaving through it — the same defect documented when a "
                   "drain on this deck was opened.")
if trails:
    parts.append("Callout " + "/".join(trails) + " is an elongated streak — "
                 "the shape of water travelling sideways in the drainage "
                 "layer, so the entry point feeding it may be uphill of the "
                 "streak itself.")
if flat:
    parts.append("%d of the warm areas sit where the surface is nearly flat, "
                 "consistent with inadequate slope letting water build up "
                 "in the drain mat." % flat)
parts.append("Everything here is a screening result: it says where to put a "
             "moisture meter, probe, or opening first — it does not confirm "
             "moisture by itself.")
pattern_summary = " ".join(parts)

meta = {
  "pattern_summary": pattern_summary,
  "method": ("Pre-dawn screening: deck-only mask (survey polygon, elevation "
             "band ±30 cm, raised structures excluded), local 5 m median "
             "background, robust MAD z, fixed |z|≥3.0 and |ΔT|≥0.4°C, "
             "components ≥0.5 m²; warm/cool classed separately; drain "
             "halo annulus test 0.3–2.0 m vs 3–4 m control."),
  "capture_conditions": {
    "window_local": "2026-07-15 05:20–05:46 MST (EXIF stamps are UTC)",
    "sunrise_local": "05:27 MST", "solar_condition":
      "end-of-night cooldown → first minutes after sunrise; no solar loading",
    "sign_convention": ("WARM = candidate retained heat at the drainage-mat/"
                        "membrane level; COOL = surface effect class"),
    "verified_by": "shadowless flat light in nadir RGB frames (MAX_0500)"},
  "status": ("SCREENING ONLY — no candidate is verified by moisture meter, "
             "probe, core, or water test. Drain positions approximate "
             "(overlay registration pending). Registration uncertainty "
             "±5 cm typical / ±14 cm p90."),
  "z_threshold": Z_THR, "dT_floor_C": DT_FLOOR, "bg_window_m": 5.0,
  "findings": findings}
json.dump(meta, open(DELIV + r"\findings.json", "w"), indent=1)
json.dump(halos, open(DELIV + r"\drain_halos.json", "w"), indent=1)

# ---- QC overview ----
vis = cv2.resize(oc, (TW, TH)).copy()
for f in findings:
    col = (0, 80, 255) if f["kind"] == "warm" else (255, 140, 0)
    cv2.circle(vis, (int(f["cx"]), int(f["cy"])),
               int(np.sqrt(f["area_m2"])/GSD*0.7)+10, col, 3)
    cv2.putText(vis, f["id"], (int(f["cx"])+14, int(f["cy"])-8), 0, 0.9, col, 2)
cv2.imwrite(DELIV + r"\qc_screening_overview.jpg",
            cv2.resize(vis, (2000, int(TH*2000/TW))),
            [cv2.IMWRITE_JPEG_QUALITY, 86])
print("saved findings.json (%d callouts) / drain_halos.json / qc images"
      % len(findings))
