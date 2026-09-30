"""Room 213 new capture — Stage 1 source-quality probe (read-only on the volume copies of the originals).
Per video, both lens tracks: centre-crop sharpness / fine-band energy / flat-region noise / clipping, and optical-flow
motion between consecutive native frames. Same-content comparison between videos: anchor frames of each video matched
(SIFT + homography) to the best frame of every other video; detail and noise measured on the identical content."""
import json
import subprocess

import modal

from cap_ingest import DST, image as base_image

app = modal.App("slate360-room213-capture-probe")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = base_image.add_local_file("cap_ingest.py", "/root/cap_ingest.py")


def sh(c):
    return subprocess.run(["bash", "-c", c], capture_output=True, text=True).stdout


def frames(path, track, fps, crop, out_dir):
    from pathlib import Path
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    sh(f"ffmpeg -v error -i '{path}' -map 0:v:{track} -vf 'fps={fps},crop={crop}:{crop}' -q:v 1 '{out_dir}/f_%05d.jpg'")
    return sorted(Path(out_dir).glob("f_*.jpg"))


def band_stats(g, valid=None):
    import cv2
    import numpy as np
    g = g.astype(np.float32)
    if valid is None:
        valid = np.ones(g.shape, bool)
    fine = g - cv2.GaussianBlur(g, (0, 0), 1.5)
    mid = cv2.GaussianBlur(g, (0, 0), 1.5) - cv2.GaussianBlur(g, (0, 0), 4)
    grad = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0, 3), cv2.Sobel(g, cv2.CV_32F, 0, 1, 3))
    flat = valid & (grad < np.percentile(grad[valid], 30))
    return {"fine_std": float(fine[valid].std()), "mid_std": float(mid[valid].std()), "grad_p90": float(np.percentile(grad[valid], 90)),
            "noise_flat_mad": float(1.4826 * np.median(np.abs(fine[flat]))), "clip250": float((g[valid] >= 250).mean()), "mean": float(g[valid].mean())}


@app.function(image=image, cpu=16.0, memory=65536, timeout=4 * 3600, volumes={"/vol": vol})
def source_probe(videos: list, fps: float = 1.0, crop: int = 1536) -> dict:
    import shutil
    from pathlib import Path
    import cv2
    import numpy as np
    vol.reload()
    raw, work, out = Path(f"{DST}/raw"), Path("/tmp/probe"), Path(f"{DST}/stage1")
    out.mkdir(parents=True, exist_ok=True)
    res = {"per_video": {}, "matched": []}
    track0 = {}
    for v in videos:
        per = {}
        for tr in (0, 1):
            fr = frames(raw / v, tr, fps, crop, work / v / f"t{tr}")
            st = [band_stats(cv2.imread(str(f), 0)) for f in fr]
            per[f"track{tr}"] = {"frames": len(st)}
            if st:
                per[f"track{tr}"].update({k: {q: float(np.percentile([s[k] for s in st], p)) for q, p in (("p10", 10), ("p50", 50), ("p90", 90))} for k in st[0]})
            if tr == 0:
                track0[v] = fr
        dur = float(json.loads(sh(f"ffprobe -v error -show_entries format=duration -of json '{raw / v}'") or "{}").get("format", {}).get("duration", 0) or 0)
        mot = []
        for t in np.linspace(1, max(1.5, dur - 1), 12):
            d = work / v / f"m{t:.1f}"
            d.mkdir(parents=True, exist_ok=True)
            sh(f"ffmpeg -v error -ss {t:.2f} -i '{raw / v}' -map 0:v:0 -frames:v 2 -vf 'crop={crop}:{crop},scale={crop // 2}:{crop // 2}' '{d}/m_%d.png'")
            ms = sorted(d.glob("m_*.png"))
            if len(ms) == 2:
                a, b = cv2.imread(str(ms[0]), 0), cv2.imread(str(ms[1]), 0)
                flow = cv2.calcOpticalFlowFarneback(a, b, None, 0.5, 4, 21, 3, 5, 1.1, 0)
                mot.append(float(np.median(np.hypot(flow[..., 0], flow[..., 1]))) * 2)
        per["motion_native_px_per_frame"] = {"p50": float(np.median(mot)) if mot else None, "p90": float(np.percentile(mot, 90)) if mot else None, "n": len(mot)}
        per["duration_s"] = dur
        res["per_video"][v] = per
        fr = track0.get(v, [])
        if fr:
            pick = [fr[int(i)] for i in np.linspace(0, len(fr) - 1, min(6, len(fr)))]
            cv2.imwrite(str(out / f"strip_{v}.jpg"), np.hstack([cv2.resize(cv2.imread(str(f)), (384, 384), interpolation=cv2.INTER_AREA) for f in pick]),
                        [cv2.IMWRITE_JPEG_QUALITY, 90])
    sift = cv2.SIFT_create(4000)
    feats = {}

    def feat(f):
        if f not in feats:
            g = cv2.imread(str(f), 0)
            k, d = sift.detectAndCompute(cv2.resize(g, (crop // 2, crop // 2)), None)
            feats[f] = (g, k, d)
        return feats[f]
    bf = cv2.BFMatcher()
    for va, fa in track0.items():
        for ai in [int(i) for i in np.linspace(0, len(fa) - 1, min(8, len(fa)))]:
            ga, ka, da = feat(fa[ai])
            if da is None:
                continue
            for vb, fb in track0.items():
                if vb == va:
                    continue
                best = None
                for bi, f in enumerate(fb):
                    gb, kb, db = feat(f)
                    if db is None or len(kb) < 50:
                        continue
                    m = [x for x, y in bf.knnMatch(da, db, k=2) if x.distance < 0.75 * y.distance]
                    if len(m) < 60:
                        continue
                    A = np.float32([ka[x.queryIdx].pt for x in m]) * 2
                    B = np.float32([kb[x.trainIdx].pt for x in m]) * 2
                    H, inl = cv2.findHomography(B, A, cv2.RANSAC, 3.0)
                    if H is not None and (best is None or inl.sum() > best[0]):
                        best = (int(inl.sum()), bi, H)
                if not best or best[0] < 150:
                    continue
                gb = feat(fb[best[1]])[0]
                warped = cv2.warpPerspective(gb, best[2], (crop, crop), flags=cv2.INTER_LINEAR)
                valid = cv2.warpPerspective(np.ones_like(gb), best[2], (crop, crop), flags=cv2.INTER_NEAREST) > 0
                valid = cv2.erode(valid.astype(np.uint8), np.ones((31, 31), np.uint8)) > 0
                if valid.mean() < 0.3:
                    continue
                res["matched"].append({"a": va, "a_frame": ai, "b": vb, "b_frame": best[1], "inliers": best[0], "overlap": float(valid.mean()),
                                       "scale_b_to_a": float(np.sqrt(abs(np.linalg.det(best[2][:2, :2])))),
                                       "a_stats": band_stats(ga, valid), "b_stats": band_stats(warped, valid)})
                if len(res["matched"]) <= 60:
                    q = crop // 4
                    cv2.imwrite(str(out / f"pair_{va[4:-5]}_{ai}_vs_{vb[4:-5]}.jpg"), np.hstack([ga[q:3 * q, q:3 * q], warped[q:3 * q, q:3 * q]]),
                                [cv2.IMWRITE_JPEG_QUALITY, 95])
    json.dump(res, open(out / "source_probe.json", "w"), indent=1)
    vol.commit()
    shutil.rmtree(work, ignore_errors=True)
    return res
