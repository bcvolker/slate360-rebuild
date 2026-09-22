"""Read-only diagnostic of the Room 213 raw-rig COLMAP database (why did registration fail?).
Ephemeral, not part of the pipeline. Usage: modal run workers/modal/recon-experiment/diag_sfm_db.py
"""
import modal

app = modal.App("room213-sfm-diag")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = modal.Image.debian_slim(python_version="3.10").pip_install("numpy")


@app.function(image=image, volumes={"/vol": vol}, timeout=600, cpu=2.0, memory=8 * 1024)
def diag() -> dict:
    import sqlite3, json, re, collections, numpy as np
    db = "/vol/room213/2026-09-21/build/sfm/database.db"
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    imgs = {i: n for i, n in con.execute("select image_id, name from images")}
    def parse(n):
        m = re.match(r"(\d+)_(VID_\d+_\d+_\d+_\d+)_t([\d.]+)_L(\d)_(\w)\.png", n)
        return {"rank": int(m.group(1)), "video": m.group(2), "t": float(m.group(3)), "lens": int(m.group(4)), "face": m.group(5)} if m else None
    meta = {i: parse(n) for i, n in imgs.items()}
    kp = {i: r for i, r in con.execute("select image_id, rows from keypoints")}
    out = {"n_images": len(imgs), "keypoints_p10_p50_p90": [int(x) for x in np.percentile(list(kp.values()), [10, 50, 90])]}
    # matches (raw) and two-view geometries (verified) with inlier counts and config
    def pair_ids(pid):
        return pid // 2147483647, pid % 2147483647
    raw = {pair_ids(pid): rows for pid, rows in con.execute("select pair_id, rows from matches")}
    tvg = {pair_ids(pid): (rows, cfg) for pid, rows, cfg in con.execute("select pair_id, rows, config from two_view_geometries")}
    cats = collections.Counter(); inl = collections.defaultdict(list); cfgs = collections.Counter(); rawcat = collections.Counter()
    for (a, b), (rows, cfg) in tvg.items():
        ma, mb = meta.get(a), meta.get(b)
        if not ma or not mb: continue
        same_exp = ma["video"] == mb["video"] and abs(ma["t"] - mb["t"]) < 1e-6
        cat = ("same_exposure_same_lens" if ma["lens"] == mb["lens"] else "same_exposure_cross_lens") if same_exp else \
              (f"cross_exposure_same_face_gap{min(9, round(abs(ma['t'] - mb['t']) / 1.2))}" if (ma["face"] == mb["face"] and ma["lens"] == mb["lens"]) else "cross_exposure_other")
        if rows > 0:
            cats[cat] += 1; inl[cat].append(rows); cfgs[cfg] += 1
    for (a, b), rows in raw.items():
        ma, mb = meta.get(a), meta.get(b)
        if not ma or not mb: continue
        same_exp = ma["video"] == mb["video"] and abs(ma["t"] - mb["t"]) < 1e-6
        rawcat["same_exposure" if same_exp else "cross_exposure"] += 1 if rows > 0 else 0
    out["raw_matched_pairs_by_category"] = dict(rawcat)
    out["verified_pairs_by_category"] = {k: {"n": v, "inliers_median": float(np.median(inl[k])), "inliers_p90": float(np.percentile(inl[k], 90))} for k, v in cats.items()}
    out["two_view_config_counts"] = {str(k): v for k, v in cfgs.items()}  # 1 degenerate,2 calibrated,3 uncalibrated,4 planar,5 panoramic,6 planar_or_panoramic,7 watermark,8 multiple
    # how many images have >=1 verified cross-exposure pair
    has_cross = set()
    for (a, b), (rows, cfg) in tvg.items():
        ma, mb = meta.get(a), meta.get(b)
        if rows > 0 and ma and mb and not (ma["video"] == mb["video"] and abs(ma["t"] - mb["t"]) < 1e-6):
            has_cross.add(a); has_cross.add(b)
    out["images_with_verified_cross_exposure_pair"] = len(has_cross)
    # per-face-direction verified counts
    per_face = collections.Counter()
    for (a, b), (rows, cfg) in tvg.items():
        if rows > 0 and meta.get(a): per_face[meta[a]["face"] + str(meta[a]["lens"])] += 1
    out["verified_pairs_by_face_lens"] = dict(per_face)
    return out


@app.local_entrypoint()
def main():
    import json
    print(json.dumps(diag.remote(), indent=1))
