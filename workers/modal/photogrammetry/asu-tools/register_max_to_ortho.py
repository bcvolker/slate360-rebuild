r"""Step 2a: register every MAX visible frame against the finished ortho v3.

v2 tuning (v1 got 0/251 through the 40-inlier gate): RootSIFT + CLAHE,
MAX at 1536w, nfeatures 8000, ratio 0.8, USAC_MAGSAC. MAX frames span two
height planes (deck + roofs) so a homography only collects the dominant
plane's inliers — the deck plane is the survey subject, so we accept
inliers >= 25 and validate with (a) scale vs running median and (b) implied
map center within 20 m of GPS.

Output: C:\ASU-Survey\deliverables\registration_102.json
  { frame: {H: 3x3 (MAX@1536w px -> ortho GLOBAL px), inliers, scale, ok} }
"""
import json
import math

import cv2
import numpy as np

DELIV = r"C:\ASU-Survey\deliverables"
MEDIA = r"C:\ASU-Survey\102MEDIA"
LAT0, LON0 = 33.4277667, -111.9322333

dem = np.load(DELIV + r"\dem_v3.npz")
X0, Y1 = [float(v) for v in dem["origin"]]
GSD = float(dem["gsd_m"])
ortho = cv2.imread(DELIV + r"\colmap_rgb_orthomosaic_v3.jpg", cv2.IMREAD_GRAYSCALE)
OH, OW = ortho.shape
clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(12, 12))
print("ortho %dx%d gsd %.3f" % (OW, OH, GSD), flush=True)

idx = json.load(open(DELIV + r"\index_102MEDIA.json"))["frames"]
sift = cv2.SIFT_create(nfeatures=8000)
flann = cv2.FlannBasedMatcher({"algorithm": 1, "trees": 5}, {"checks": 64})

WIN = 1400          # +/- px around GPS center (84 m square window)
MAXW = 1536


def rootsift(desc):
    if desc is None:
        return None
    desc = desc / (desc.sum(axis=1, keepdims=True) + 1e-7)
    return np.sqrt(desc)


results = {}
scales = []
ok_n = 0
for n, rec in enumerate(idx):
    name = rec["file"]
    out = {"ok": False, "inliers": 0}
    results[name] = out
    if rec["lat"] is None:
        out["why"] = "no gps"
        continue
    ex = (rec["lon"] - LON0) * 111320 * math.cos(math.radians(LAT0))
    ny = (rec["lat"] - LAT0) * 111320
    cx = int((ex - X0) / GSD)
    cy = int((Y1 - ny) / GSD)
    x_a, y_a = max(0, cx - WIN), max(0, cy - WIN)
    crop = ortho[y_a:cy + WIN, x_a:cx + WIN]
    if crop.shape[0] < 400 or crop.shape[1] < 400:
        out["why"] = "gps outside ortho"
        continue

    vis = cv2.imread(MEDIA + "\\" + name.replace("IRX_", "MAX_"),
                     cv2.IMREAD_GRAYSCALE)
    if vis is None:
        out["why"] = "max frame missing"
        continue
    vis = cv2.resize(vis, (MAXW, int(vis.shape[0] * MAXW / vis.shape[1])))
    vis_e, crop_e = clahe.apply(vis), clahe.apply(crop)

    k1, d1 = sift.detectAndCompute(vis_e, None)
    k2, d2 = sift.detectAndCompute(crop_e, None)
    d1, d2 = rootsift(d1), rootsift(d2)
    if d1 is None or d2 is None or len(k1) < 50 or len(k2) < 50:
        out["why"] = "few features"
        continue
    good = []
    for pair in flann.knnMatch(d1, d2, k=2):
        if len(pair) == 2 and pair[0].distance < 0.8 * pair[1].distance:
            good.append(pair[0])
    if len(good) < 15:
        out["why"] = "few matches (%d)" % len(good)
        continue
    src = np.float32([k1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([k2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    H, mask = cv2.findHomography(src, dst, cv2.USAC_MAGSAC, 3.0)
    if H is None:
        out["why"] = "no homography"
        continue
    inl = int(mask.sum())
    sc = float(np.sqrt(abs(np.linalg.det(H[:2, :2]))))
    # implied position of the frame center on the map vs GPS
    ctr = cv2.perspectiveTransform(
        np.float32([[[MAXW / 2, vis.shape[0] / 2]]]), H)[0, 0]
    off_m = math.hypot((ctr[0] + x_a) - cx, (ctr[1] + y_a) - cy) * GSD
    if inl < 25:
        out.update(inliers=inl, why="low inliers")
        continue
    if off_m > 20:
        out.update(inliers=inl, why="center %.1fm from gps" % off_m)
        continue
    T = np.array([[1, 0, x_a], [0, 1, y_a], [0, 0, 1]], np.float64)
    out.update(ok=True, inliers=inl, scale=round(sc, 4),
               gps_off_m=round(off_m, 2),
               H=[[round(v, 8) for v in row] for row in (T @ H).tolist()])
    scales.append(sc)
    ok_n += 1
    if n % 25 == 0:
        print("[%d/%d] ok=%d last=%s inl=%d sc=%.3f off=%.1fm"
              % (n + 1, len(idx), ok_n, name, inl, sc, off_m), flush=True)

med = float(np.median(scales)) if scales else 0
rej = 0
for name, out in results.items():
    if out.get("ok") and not (0.7 * med <= out["scale"] <= 1.4 * med):
        out["ok"] = False
        out["why"] = "scale outlier %.3f vs med %.3f" % (out["scale"], med)
        rej += 1

json.dump({"gsd": GSD, "origin": [X0, Y1], "max_width": MAXW,
           "median_scale": med, "frames": results},
          open(DELIV + r"\registration_102.json", "w"))
n_ok = sum(1 for o in results.values() if o.get("ok"))
print("DONE: %d/%d registered (rejected %d scale outliers), median scale %.3f"
      % (n_ok, len(idx), rej, med), flush=True)
