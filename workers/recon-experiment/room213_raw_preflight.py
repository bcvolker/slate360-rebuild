"""Room 213 2026-09-21 raw-rig preflight, cloud side (CPU only, no GPU, NO training).

Runs detached on Modal against the persistent volume so the laptop can be off. Reads only
/vol/room213/2026-09-21/raw-capture-test/, writes only /vol/room213/2026-09-21/preflight/.

Stages (each idempotent, each writes its own JSON so a rerun resumes):
  1. verify    -- byte size + SHA256 of every file present on the volume vs the committed manifest
  2. demux     -- both physical lenses at every frozen keeper timestamp -> PNG (unstitched)
  3. charuco   -- DICT_4X4_250 8x11 ChArUco detection on every lens PNG (raw pixel coords,
                  radius/azimuth from the measured circle centre) -> detections.json
  4. splits    -- calibration / calibration-validation (held-out placements) / appearance holdout
                  (every 10th exposure, both lenses, +-1.0 s neighbours excluded)
Stops there. Face generation and any camera-model fit are deliberately NOT here until the
factory Mei/unified calibration for this camera is available on the volume as
/vol/room213/calib/x4_factory_mei.json (see ROOM213_RAW_RIG_PREFLIGHT doc).
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

VOL = Path("/vol")
IN = VOL / "room213" / "2026-09-21" / "raw-capture-test"
OUT = VOL / "room213" / "2026-09-21" / "preflight"
MANIFEST = IN / "room213-test-manifest.json"
FRAMES_MANIFEST = VOL / "room213" / "2026-09-21" / "analysis" / "raw_rig_frames_manifest.json"
CIRCLE = {0: (1899.0, 1889.0), 1: (1921.0, 1876.0)}


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(32 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def stage_verify() -> dict:
    man = json.load(open(MANIFEST))
    res = {"present_ok": [], "present_bad": [], "missing": []}
    for f in man["files"]:
        p = IN / f["filename"]
        if not p.is_file():
            res["missing"].append(f["filename"]); continue
        size_ok = p.stat().st_size == f["size_bytes"]
        digest = sha256(p) if size_ok else None
        ok = size_ok and digest == f["sha256"]
        (res["present_ok"] if ok else res["present_bad"]).append(
            {"filename": f["filename"], "size_ok": size_ok, "sha256_ok": digest == f["sha256"], "remote_size": p.stat().st_size})
    (OUT / "verify.json").write_text(json.dumps(res, indent=1))
    print("VERIFY ok", len(res["present_ok"]), "bad", len(res["present_bad"]), "missing", len(res["missing"]), flush=True)
    return res


def stage_demux(verify: dict) -> list[dict]:
    import av
    import cv2

    fm = json.load(open(FRAMES_MANIFEST))
    okset = {x["filename"] for x in verify["present_ok"]}
    frames_dir = OUT / "frames"; frames_dir.mkdir(parents=True, exist_ok=True)
    done = []
    by_vid: dict[str, list] = {}
    for fr in fm["frames"]:
        by_vid.setdefault(fr["video"], []).append(fr)
    for vid, lst in by_vid.items():
        if vid not in okset:
            print("DEMUX skip (not verified on volume):", vid, flush=True); continue
        lst.sort(key=lambda r: r["t"])
        for si in (0, 1):
            c = av.open(str(IN / vid)); s = c.streams.video[si]; s.thread_type = "AUTO"
            it = iter(lst); tgt = next(it, None)
            for f in c.decode(s):
                if tgt is None: break
                if f.time is None or f.time < tgt["t"] - 0.02: continue
                name = f"{vid[:-5]}_t{tgt['t']:.3f}_L{si}.png"
                p = frames_dir / name
                if not p.is_file():
                    cv2.imwrite(str(p), f.to_ndarray(format="bgr24"))
                done.append({**{k: v for k, v in tgt.items() if k != "stable_window"}, "lens": si, "png": name, "decoded_t": round(f.time, 4)})
                tgt = next(it, None)
            c.close()
        print("DEMUX", vid, "frames", sum(1 for d in done if d["video"] == vid), flush=True)
    (OUT / "demux.json").write_text(json.dumps(done, indent=1))
    return done


def stage_charuco(demux: list[dict]) -> list[dict]:
    import cv2
    import numpy as np

    d = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_250)
    board = cv2.aruco.CharucoBoard((8, 11), 0.023, 0.01725, d)
    p = cv2.aruco.DetectorParameters(); p.adaptiveThreshWinSizeMax = 53; p.minMarkerPerimeterRate = 0.005
    p.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX
    det = cv2.aruco.CharucoDetector(board, detectorParams=p)
    out = []
    for r in demux:
        g = cv2.imread(str(OUT / "frames" / r["png"]), cv2.IMREAD_GRAYSCALE)
        cc, cid, mc, mid = det.detectBoard(g)
        rec = {**r, "n_charuco_corners": 0 if cc is None else int(len(cc)), "n_markers": 0 if mid is None else int(len(mid))}
        if cc is not None and len(cc):
            xy = cc.reshape(-1, 2); cx, cy = CIRCLE[r["lens"]]
            rad = np.hypot(xy[:, 0] - cx, xy[:, 1] - cy); az = np.degrees(np.arctan2(xy[:, 1] - cy, xy[:, 0] - cx))
            rec.update({"ids": cid.ravel().tolist(), "corners_px": xy.round(3).tolist(), "radius_px_mean": float(rad.mean()),
                        "radius_px_min_max": [float(rad.min()), float(rad.max())], "azimuth_deg_mean": float(az.mean())})
        out.append(rec)
    (OUT / "charuco_detections.json").write_text(json.dumps(out, indent=1))
    hits = [o for o in out if o["n_charuco_corners"] >= 6]
    print("CHARUCO frames", len(out), "with>=6 corners", len(hits), flush=True)
    return out


def stage_splits(dets: list[dict]) -> dict:
    # exposures = unique (video, t); a pair = both lenses of one exposure
    exposures = sorted({(d["video"], d["t"]) for d in dets}, key=lambda x: (x[0], x[1]))
    board_exp = sorted({(d["video"], d["t"]) for d in dets if d["n_charuco_corners"] >= 6})
    # calibration vs validation: hold out whole placements/time-clusters (>=5 s apart) alternately
    clusters: list[list] = []
    for e in board_exp:
        if clusters and e[0] == clusters[-1][-1][0] and e[1] - clusters[-1][-1][1] < 5.0:
            clusters[-1].append(e)
        else:
            clusters.append([e])
    calib = [e for i, c in enumerate(clusters) if i % 3 != 2 for e in c]
    calval = [e for i, c in enumerate(clusters) if i % 3 == 2 for e in c]
    # appearance holdout: every 10th exposure; drop +-1.0 s neighbours from training
    hold = [e for i, e in enumerate(exposures) if i % 10 == 5]
    excl = set()
    for v, t in hold:
        for e in exposures:
            if e[0] == v and abs(e[1] - t) <= 1.0 and e != (v, t):
                excl.add(e)
    train = [e for e in exposures if e not in set(hold) and e not in excl]
    res = {"n_exposures": len(exposures), "board_clusters": len(clusters), "calibration": calib, "calibration_validation": calval,
           "appearance_holdout": hold, "excluded_temporal_neighbours": sorted(excl), "appearance_train": train,
           "note": "appearance holdout is appearance-held-out only (poses come from the same SfM); calibration groups are whole time-clusters"}
    (OUT / "splits.json").write_text(json.dumps(res, indent=1))
    print("SPLITS exposures", len(exposures), "train", len(train), "holdout", len(hold), "calib", len(calib), "calval", len(calval), flush=True)
    return res


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    v = stage_verify()
    d = stage_demux(v)
    c = stage_charuco(d)
    stage_splits(c)
    print("PREFLIGHT STAGES 1-4 DONE (no faces, no calibration fit, no training)", flush=True)


if __name__ == "__main__":
    main()
