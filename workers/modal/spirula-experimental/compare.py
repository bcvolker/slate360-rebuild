"""Golden (direct benchmark) vs hardened-worker Room 213 run: same eval views identified by content, same masks, same
metric code. Stochastic variation is expected; the question is whether quality is reproduced."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

GOLD = "/vol/room213/2026-09-21/spirula_bench_v1"
FIXED_VIEW_NEW = None  # resolved from the golden dataset manifest
CROPS_720 = {"ceiling_grid": (200, 60, 560, 300), "window_frames": (140, 350, 440, 470),
             "chair_backs": (360, 420, 560, 540), "table_edges": (380, 450, 580, 560),
             "door_hardware": (575, 340, 660, 430), "carpet": (60, 520, 250, 640)}


def _psnr_ssim(render, gt, valid):
    import cv2
    import numpy as np
    d = (render.astype(np.float64) - gt.astype(np.float64))[valid]
    mse = float((d ** 2).mean())
    a = render.astype(np.float64); b = gt.astype(np.float64); C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    blur = lambda x: cv2.GaussianBlur(x, (11, 11), 1.5)
    ma, mb = blur(a), blur(b); saa = blur(a * a) - ma * ma; sbb = blur(b * b) - mb * mb; sab = blur(a * b) - ma * mb
    s = (((2 * ma * mb + C1) * (2 * sab + C2)) / ((ma * ma + mb * mb + C1) * (saa + sbb + C2))).mean(axis=2)
    return {"psnr": round(10 * np.log10(255.0 ** 2 / max(mse, 1e-12)), 3), "ssim": round(float(s[valid].mean()), 4)}


def _edge(im, gt, valid, box=None):
    import cv2
    import numpy as np
    g = lambda a: np.hypot(*(cv2.Sobel(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY).astype(np.float32), cv2.CV_32F, dx, dy, 3)
                             for dx, dy in ((1, 0), (0, 1))))
    gr, gg, m = g(im), g(gt), valid
    if box is not None:
        x0, y0, x1, y1 = box; gr, gg, m = gr[y0:y1, x0:x1], gg[y0:y1, x0:x1], m[y0:y1, x0:x1]
    a, b = gr[m], gg[m]
    return {"edge_ratio": round(float(a.mean() / b.mean()), 3), "grad_corr": round(float(np.corrcoef(a, b)[0, 1]), 3)}


def _ply_stats(path: Path) -> dict:
    import numpy as np
    raw = path.read_bytes(); end = raw.find(b"end_header\n") + len(b"end_header\n")
    hdr = raw[:end].decode().splitlines(); n = int([l for l in hdr if l.startswith("element vertex")][0].split()[-1])
    names = [l.split()[-1] for l in hdr if l.startswith("property")]
    a = np.frombuffer(raw[end:], "<f4").reshape(n, len(names))
    xyz = a[:, :3]; op = 1 / (1 + np.exp(-a[:, names.index("opacity")]))
    sc = np.exp(a[:, [names.index(f"scale_{i}") for i in range(3)]]).max(1)
    return {"count": n, "properties": len(names), "sha256": hashlib.sha256(raw).hexdigest(),
            "bboxMin": xyz.min(0).round(3).tolist(), "bboxMax": xyz.max(0).round(3).tolist(),
            "bboxP1": np.percentile(xyz, 1, 0).round(3).tolist(), "bboxP99": np.percentile(xyz, 99, 0).round(3).tolist(),
            "opacityMedian": round(float(np.median(op)), 4), "maxScaleMedian": round(float(np.median(sc)), 5)}


def compare(worker_run: Path, out: Path) -> dict:
    import cv2
    import numpy as np
    out.mkdir(parents=True, exist_ok=True)
    gold_run = Path(f"{GOLD}/runs/room213_spirula_full"); ds = Path(f"{GOLD}/dataset")
    man = json.load(open(f"{GOLD}/dataset_manifest.json"))
    res: dict = {}
    res["ply"] = {"golden": _ply_stats(gold_run / "step-000030000.ckpt/splat.ply"),
                  "worker": _ply_stats(worker_run / "step-000030000.ckpt/splat.ply")}
    res["spirulaMetrics"] = {k: {m: v for m, v in json.load(open(r / "metrics.json")).items() if not isinstance(v, list)}
                             for k, r in (("golden", gold_run), ("worker", worker_run))}

    def evals(run):
        gts = {int(p.stem.split("-")[-1]): p for p in run.glob("eval-gt-*.png")}
        walk, still = [], {}
        for i, p in gts.items():
            a = cv2.imread(str(p), cv2.IMREAD_REDUCED_GRAYSCALE_8)
            if a.shape == (90, 160):
                walk.append(i)
            else:
                still[hashlib.sha256(p.read_bytes()).hexdigest()] = i
        return sorted(walk), still
    gw, gs = evals(gold_run); ww, ws = evals(worker_run)
    res["evalCounts"] = {"golden": {"walk": len(gw), "still": len(gs)}, "worker": {"walk": len(ww), "still": len(ws)}}
    # still eval views: the GT bytes are the identical inputs, so pair by GT hash, name via the golden identification
    ident = json.load(open(f"{GOLD}/eval_full/eval.json"))["identified"]          # new-name -> golden eval index
    name_of_gold = {v["eval_index"]: k for k, v in ident.items()}
    role = {m["new"]: m["role"] for m in man["images"]}
    pairs = {name_of_gold[gi]: (gi, ws[h]) for h, gi in gs.items() if h in ws and gi in name_of_gold}
    res["stillViewsPaired"] = len(pairs)
    hold = []
    for name, (gi, wi) in sorted(pairs.items()):
        if role.get(name) != "holdout_eval":
            continue
        gt = cv2.imread(str(gold_run / f"eval-gt-{gi:05d}.png")); valid = cv2.imread(str(ds / "masks" / name), 0) > 127
        g = cv2.imread(str(gold_run / f"eval-render-{gi:05d}.png")); w = cv2.imread(str(worker_run / f"eval-render-{wi:05d}.png"))
        hold.append({"view": name, "golden": _psnr_ssim(g, gt, valid), "worker": _psnr_ssim(w, gt, valid),
                     "workerVsGolden": _psnr_ssim(w, g, valid)})
    mean = lambda k, s: round(float(np.mean([h[k][s] for h in hold])), 4)
    res["heldout"] = {"n": len(hold), "mean": {k: {s: mean(k, s) for s in ("psnr", "ssim")}
                                                for k in ("golden", "worker", "workerVsGolden")}, "perView": hold}
    # fixed physical camera camera2/frame_00103 (eval-only duplicate) + object crops
    fx = man["fixed_eval"]["camera2/frame_00103.png"]; gi, wi = pairs[fx]
    gt = cv2.imread(str(gold_run / f"eval-gt-{gi:05d}.png")); valid = cv2.imread(str(ds / "masks" / fx), 0) > 127
    g = cv2.imread(str(gold_run / f"eval-render-{gi:05d}.png")); w = cv2.imread(str(worker_run / f"eval-render-{wi:05d}.png"))
    sc = gt.shape[1] / 720.0; table = {}
    for cn, (x0, y0, x1, y1) in CROPS_720.items():
        box = (int(x0 * sc), int(y0 * sc), int(x1 * sc), int(y1 * sc))
        table[cn] = {"golden": _edge(g, gt, valid, box), "worker": _edge(w, gt, valid, box)}
    res["fixedView"] = {"view": fx, "golden": _psnr_ssim(g, gt, valid), "worker": _psnr_ssim(w, gt, valid),
                        "workerVsGolden": _psnr_ssim(w, g, valid), "crops": table}
    rows = []
    for cn, (x0, y0, x1, y1) in CROPS_720.items():
        cx, cy = int((x0 + x1) / 2 * sc), int((y0 + y1) / 2 * sc); half = 200
        tiles = []
        for lab, im in (("source", gt), ("golden", g), ("worker", w)):
            c = cv2.resize(im[cy - half:cy + half, cx - half:cx + half], (400, 400), interpolation=cv2.INTER_AREA)
            c = cv2.copyMakeBorder(c, 24, 0, 0, 4, cv2.BORDER_CONSTANT, value=(0, 0, 0))
            cv2.putText(c, f"{cn} | {lab}", (4, 17), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1); tiles.append(c)
        rows.append(np.hstack(tiles))
    cv2.imwrite(str(out / "fixed_view_crops.jpg"), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
    cv2.imwrite(str(out / "fixed_view_full.jpg"),
                np.hstack([cv2.resize(x, (800, 800), interpolation=cv2.INTER_AREA) for x in (gt, g, w)]),
                [cv2.IMWRITE_JPEG_QUALITY, 88])
    # walkthrough: golden walk_ordered/k is the render of walk pose k; pair worker walk renders by content
    gdir = Path(f"{GOLD}/eval_full/walk_ordered")

    def thumb(p):
        a = cv2.resize(cv2.imread(str(p), 0), (64, 36), interpolation=cv2.INTER_AREA).astype(np.float32)
        a = a - a.mean(); return a.ravel() / (np.linalg.norm(a) + 1e-6)
    G = np.stack([thumb(gdir / f"{k:05d}.png") for k in range(800)])
    W = np.stack([thumb(worker_run / f"eval-render-{i:05d}.png") for i in ww])
    C = W @ G.T; best = C.argmax(1)
    wd = out / "walk_worker_ordered"; wd.mkdir(exist_ok=True)
    order = {int(b): ww[j] for j, b in enumerate(best)}
    per = []
    for k in range(800):
        if k not in order:
            continue
        wi_ = cv2.imread(str(worker_run / f"eval-render-{order[k]:05d}.png")); gi_ = cv2.imread(str(gdir / f"{k:05d}.png"))
        cv2.imwrite(str(wd / f"{len(per):05d}.png"), np.hstack([gi_, wi_]))
        per.append(_psnr_ssim(wi_, gi_, np.ones(gi_.shape[:2], bool))["psnr"])
    res["walkthrough"] = {"workerFrames": len(ww), "uniquePoseMatches": len(order), "medianNcc": round(float(np.median(C.max(1))), 4),
                          "workerVsGoldenPsnrMedian": round(float(np.median(per)), 2),
                          "workerVsGoldenPsnrP10": round(float(np.percentile(per, 10)), 2)}
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "20", "-i", str(wd / "%05d.png"), "-c:v",
                    "libx264", "-crf", "20", "-pix_fmt", "yuv420p", str(out / "walkthrough_golden_left_worker_right.mp4")])
    for k in (100, 400, 700):
        if k < len(per):
            im = cv2.imread(str(wd / f"{k:05d}.png")); cv2.imwrite(str(out / f"walk_{k:05d}_golden_vs_worker.jpg"), im)
    return res
